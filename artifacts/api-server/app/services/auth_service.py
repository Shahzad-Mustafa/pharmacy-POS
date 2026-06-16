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

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)
        self.audit = AuditLogRepository(db)

    async def login(self, email: str, password: str, ip: str = None, ua: str = None) -> dict:
        user = await self.repo.get_by_email(email)
        if not user:
            raise AuthError("INVALID_CREDENTIALS", "Invalid email or password")
        if not user.is_active:
            raise AuthError("ACCOUNT_DISABLED", "Account is disabled")
        if not verify_password(password, user.hashed_password):
            raise AuthError("INVALID_CREDENTIALS", "Invalid email or password")

        user.last_login = datetime.now(timezone.utc)
        await self.db.flush()

        token_data = {"sub": str(user.id)}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        await self.audit.log(
            user_id=user.id, action="LOGIN", entity_type="user",
            entity_id=str(user.id), ip=ip, ua=ua,
        )

        branch_info = None
        if user.branch_id and user.branch:
            branch_info = {"id": str(user.branch.id), "name": user.branch.name}

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
                "branch_name": branch_info["name"] if branch_info else None,
                "permissions": user.permissions or role_perms,
            },
        }

    async def refresh(self, refresh_token: str) -> dict:
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise AuthError("TOKEN_INVALID", "Invalid token type")
            user_id = payload.get("sub")
        except Exception:
            raise AuthError("TOKEN_INVALID", "Invalid or expired refresh token")

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
