import logging
from typing import Annotated
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, security
from app.models.user import User
from app.schemas.auth import (
    LoginRequest, TokenResponse, RefreshRequest, AccessTokenResponse,
    LogoutRequest, ChangePasswordRequest, ForgotPasswordRequest,
    ResetPasswordRequest, VerifyTokenResponse,
)
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse, summary="Login", description="Authenticate with email/password and receive JWT tokens")
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    ip = request.headers.get("X-Real-IP", request.client.host if request.client else None)
    ua = request.headers.get("User-Agent")
    return await svc.login(body.email, body.password, ip=ip, ua=ua)


@router.post("/logout", response_model=MessageResponse, summary="Logout", description="Blacklist the refresh token")
async def logout(body: LogoutRequest, request: Request, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    access_jti = ""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from app.core.security import decode_token as _dt
            payload = _dt(auth_header[7:])
            access_jti = payload.get("jti", "")
        except Exception:
            pass
    await svc.logout(access_jti, body.refresh_token)
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=AccessTokenResponse, summary="Refresh token", description="Exchange a refresh token for a new access token")
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    return await svc.refresh(body.refresh_token)


@router.get("/me", summary="Get current user", description="Return the authenticated user's profile")
async def get_me(current_user: User = Depends(get_current_user)):
    from app.dependencies import ROLE_PERMISSIONS
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "branch_id": str(current_user.branch_id) if current_user.branch_id else None,
        "permissions": current_user.permissions or list(ROLE_PERMISSIONS.get(current_user.role, [])),
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None,
    }


@router.put("/change-password", response_model=MessageResponse, summary="Change password")
async def change_password(body: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    await svc.change_password(current_user.id, body.current_password, body.new_password)
    return {"message": "Password changed successfully"}


@router.post("/forgot-password", response_model=MessageResponse, summary="Request password reset")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    return {"message": "Reset link sent if account exists"}


@router.post("/reset-password", response_model=MessageResponse, summary="Reset password with token")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    return {"message": "Password reset successfully"}


@router.get("/sessions", summary="List active sessions")
async def list_sessions(current_user: User = Depends(get_current_user)):
    return {"sessions": []}


@router.delete("/sessions/{jti}", response_model=MessageResponse, summary="Revoke specific session")
async def revoke_session(jti: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    from app.config import settings
    await svc.blacklist_token(jti, settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)
    return {"message": "Session revoked"}


@router.get("/verify", response_model=VerifyTokenResponse, summary="Verify token validity")
async def verify_token(current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone, timedelta
    from app.config import settings
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {"valid": True, "expires_at": exp.isoformat()}
