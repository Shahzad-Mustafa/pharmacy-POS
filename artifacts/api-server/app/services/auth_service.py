import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import AuthError, BadRequestError, ValidationError
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, decode_token, validate_password_strength,
)
from app.repositories.user_repo import UserRepository, AuditLogRepository
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

_LOCKOUT_PREFIX = "login_fail:"
_BLACKLIST_PREFIX = "token:blacklist:"


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)
        self.audit = AuditLogRepository(db)

    async def _check_rate_limit(self, email: str) -> None:
        redis = await get_redis()
        if redis is None:
            return
        key = f"{_LOCKOUT_PREFIX}{email.lower()}"
        count = await redis.get(key)
        if count and int(count) >= settings.LOGIN_MAX_ATTEMPTS:
            raise AuthError("TOO_MANY_ATTEMPTS", f"Account locked after {settings.LOGIN_MAX_ATTEMPTS} failed attempts. Try again in {settings.LOGIN_LOCKOUT_MINUTES} minutes.")

    async def _record_fail(self, email: str) -> None:
        redis = await get_redis()
        if redis is None:
            return
        key = f"{_LOCKOUT_PREFIX}{email.lower()}"
        ttl = settings.LOGIN_LOCKOUT_MINUTES * 60
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, ttl)

    async def _clear_fail(self, email: str) -> None:
        redis = await get_redis()
        if redis is None:
            return
        await redis.delete(f"{_LOCKOUT_PREFIX}{email.lower()}")

    async def blacklist_token(self, jti: str, ttl_seconds: int) -> None:
        redis = await get_redis()
        if redis is None:
            return
        await redis.set(f"{_BLACKLIST_PREFIX}{jti}", "1", ex=ttl_seconds)

    async def is_token_blacklisted(self, jti: str) -> bool:
        redis = await get_redis()
        if redis is None:
            return False
        return bool(await redis.exists(f"{_BLACKLIST_PREFIX}{jti}"))

    async def login(self, email: str, password: str, ip: str = None, ua: str = None) -> dict:
        await self._check_rate_limit(email)

        user = await self.repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            await self._record_fail(email)
            raise AuthError("INVALID_CREDENTIALS", "Invalid email or password")
        if not user.is_active:
            raise AuthError("ACCOUNT_DISABLED", "Account is disabled")

        await self._clear_fail(email)

        user.last_login = datetime.now(timezone.utc)
        await self.db.flush()

        token_data = {"sub": str(user.id)}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        await self.audit.log(
            user_id=user.id, action="LOGIN", entity_type="user",
            entity_id=str(user.id), ip=ip, ua=ua,
        )

        branch_name = None
        try:
            if user.branch_id and user.branch:
                branch_name = user.branch.name
        except Exception:
            pass

        from app.dependencies import ROLE_PERMISSIONS
        role_perms = list(ROLE_PERMISSIONS.get(user.role, set()))

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": str(user.id),
                "name": user.name,
                "role": user.role,
                "email": user.email,
                "branch_id": str(user.branch_id) if user.branch_id else None,
                "branch_name": branch_name,
                "permissions": user.permissions or role_perms,
            },
        }

    async def logout(self, access_jti: str, refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token)
            refresh_jti = payload.get("jti", "")
            exp = payload.get("exp", 0)
            ttl = max(0, int(exp - datetime.now(timezone.utc).timestamp()))
            if refresh_jti:
                await self.blacklist_token(refresh_jti, ttl)
        except Exception:
            pass
        if access_jti:
            await self.blacklist_token(access_jti, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    async def refresh(self, refresh_token_str: str) -> dict:
        try:
            payload = decode_token(refresh_token_str)
            if payload.get("type") != "refresh":
                raise AuthError("TOKEN_INVALID", "Invalid token type")
            jti = payload.get("jti", "")
            user_id = payload.get("sub")
        except AuthError:
            raise
        except Exception:
            raise AuthError("TOKEN_INVALID", "Invalid or expired refresh token")

        if jti and await self.is_token_blacklisted(jti):
            raise AuthError("TOKEN_REVOKED", "Token has been revoked")

        user = await self.repo.get(uuid.UUID(user_id))
        if not user or not user.is_active:
            raise AuthError("USER_NOT_FOUND", "User not found")

        access_token = create_access_token({"sub": str(user.id)})
        return {
            "access_token": access_token,
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "token_type": "bearer",
        }

    async def change_password(self, user_id: uuid.UUID, current_password: str, new_password: str) -> None:
        user = await self.repo.get(user_id)
        if not verify_password(current_password, user.hashed_password):
            raise BadRequestError("WRONG_PASSWORD", "Current password is incorrect")
        if current_password == new_password:
            raise BadRequestError("SAME_AS_CURRENT", "New password must differ from current")
        if not validate_password_strength(new_password):
            raise ValidationError("WEAK_PASSWORD", "Password must be 8+ chars with upper, lower, digit and special char")
        user.hashed_password = get_password_hash(new_password)
        user.force_password_change = False
        await self.db.flush()
