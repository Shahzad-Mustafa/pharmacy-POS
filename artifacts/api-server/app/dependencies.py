import logging
import uuid as _uuid_mod
from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError

from app.database import get_db
from app.config import settings
from app.core.security import decode_token
from app.models.user import User
from app.repositories.user_repo import UserRepository

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

ROLE_PERMISSIONS = {
    "super_admin": {"*"},
    "admin": {
        "sales.create", "sales.read", "sales.refund",
        "inventory.read", "inventory.write",
        "medicines.read", "medicines.write",
        "patients.read", "patients.write",
        "prescriptions.read", "prescriptions.write",
        "users.read", "users.write",
        "branches.read", "branches.write",
        "suppliers.read", "suppliers.write",
        "reports.read", "audit.read",
        "settings.read", "settings.write",
        "insurance.read", "insurance.write",
    },
    "manager": {
        "sales.create", "sales.read", "sales.refund",
        "inventory.read", "inventory.write",
        "medicines.read", "medicines.write",
        "patients.read", "patients.write",
        "prescriptions.read", "prescriptions.write",
        "users.read", "branches.read",
        "suppliers.read", "suppliers.write",
        "reports.read", "insurance.read", "insurance.write",
    },
    "pharmacist": {
        "sales.create", "sales.read",
        "inventory.read", "inventory.write",
        "medicines.read", "medicines.write",
        "patients.read", "patients.write",
        "prescriptions.read", "prescriptions.write",
        "suppliers.read",
    },
    "cashier": {
        "sales.create", "sales.read",
        "medicines.read", "inventory.read",
        "patients.read", "patients.write",
        "prescriptions.read",
    },
    "accountant": {
        "sales.read", "reports.read",
        "suppliers.read", "insurance.read",
    },
    "doctor": {
        "patients.read", "prescriptions.read", "prescriptions.write",
        "medicines.read",
    },
}


async def _resolve_user_from_token(
    credentials: Optional[HTTPAuthorizationCredentials],
    db: AsyncSession,
) -> Optional[User]:
    if not credentials:
        return None
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        jti = payload.get("jti", "")
        if not user_id or token_type != "access":
            return None
    except JWTError:
        return None

    # Check Redis blacklist (gracefully skip if Redis is down)
    if jti:
        try:
            from app.core.redis import get_redis
            redis = await get_redis()
            if redis and await redis.exists(f"token:blacklist:{jti}"):
                return None
        except Exception:
            pass

    repo = UserRepository(db)
    try:
        user = await repo.get(_uuid_mod.UUID(user_id))
    except Exception:
        user = await repo.get_by_email(user_id)
    return user


async def get_current_user(
    request: Request,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Authentication required", "status": 401}},
        )

    user = await _resolve_user_from_token(credentials, db)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "USER_NOT_FOUND", "message": "User not found or inactive", "status": 401}},
        )
    return user


async def get_current_user_optional(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    try:
        user = await _resolve_user_from_token(credentials, db)
        return user if (user and user.is_active) else None
    except Exception:
        return None


def require_roles(*roles: str):
    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles and user.role != "super_admin":
            raise HTTPException(
                status_code=403,
                detail={"error": {"code": "FORBIDDEN", "message": f"Requires role: {', '.join(roles)}", "status": 403}},
            )
        return user
    return _check


def require_permission(permission: str):
    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.role == "super_admin":
            return user
        role_perms = ROLE_PERMISSIONS.get(user.role, set())
        user_perms = set(user.permissions or [])
        all_perms = role_perms | user_perms
        if permission not in all_perms and "*" not in all_perms:
            raise HTTPException(
                status_code=403,
                detail={"error": {"code": "FORBIDDEN", "message": f"Missing permission: {permission}", "status": 403}},
            )
        return user
    return _check
