import uuid
import logging
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserStatusUpdate, UserPasswordReset, PermissionsUpdate
from app.schemas.common import paginate, MessageResponse
from app.repositories.user_repo import UserRepository
from app.core.exceptions import NotFoundError, ConflictError
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", summary="List users")
async def list_users(
    role: str = None, branch_id: uuid.UUID = None, is_active: bool = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    users, total = await repo.list_users(page, per_page, role, branch_id, is_active)
    return paginate([UserResponse.model_validate(u).model_dump() for u in users], total, page, per_page)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create user")
async def create_user(
    body: UserCreate,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    existing = await repo.get_by_email(body.email)
    if existing:
        raise ConflictError("EMAIL_ALREADY_EXISTS", f"Email {body.email} is already registered", "email")
    user = User(
        name=body.name,
        email=body.email,
        hashed_password=get_password_hash(body.password),
        role=body.role,
        phone=body.phone,
        branch_id=body.branch_id,
        permissions=body.permissions or [],
    )
    result = await repo.create(user)
    return UserResponse.model_validate(result)


@router.get("/roles/permissions-matrix", summary="List roles and permissions matrix")
async def get_permissions_matrix(current_user: User = Depends(require_roles("admin", "super_admin"))):
    from app.dependencies import ROLE_PERMISSIONS
    return {"roles": {k: list(v) for k, v in ROLE_PERMISSIONS.items()}}


@router.get("/{user_id}", response_model=UserResponse, summary="Get user by ID")
async def get_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.id != user_id and current_user.role not in ("admin", "manager", "super_admin"):
        from app.core.exceptions import ForbiddenError
        raise ForbiddenError()
    repo = UserRepository(db)
    user = await repo.get(user_id)
    if not user:
        raise NotFoundError("User", str(user_id))
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse, summary="Update user")
async def update_user(
    user_id: uuid.UUID, body: UserUpdate,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get(user_id)
    if not user:
        raise NotFoundError("User", str(user_id))
    data = body.model_dump(exclude_none=True)
    updated = await repo.update(user, data)
    return UserResponse.model_validate(updated)


@router.patch("/{user_id}/status", response_model=MessageResponse, summary="Activate/deactivate user")
async def update_user_status(
    user_id: uuid.UUID, body: UserStatusUpdate,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get(user_id)
    if not user:
        raise NotFoundError("User", str(user_id))
    user.is_active = body.is_active
    await db.flush()
    return {"message": f"User {'activated' if body.is_active else 'deactivated'} successfully"}


@router.post("/{user_id}/reset-password", response_model=MessageResponse, summary="Admin reset user password")
async def reset_user_password(
    user_id: uuid.UUID, body: UserPasswordReset,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get(user_id)
    if not user:
        raise NotFoundError("User", str(user_id))
    user.hashed_password = get_password_hash(body.new_password)
    user.force_password_change = body.force_change
    await db.flush()
    return {"message": "Password reset successfully"}


@router.get("/{user_id}/activity", summary="Get user activity log")
async def get_user_activity(
    user_id: uuid.UUID, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import AuditLog
    from sqlalchemy import select, func
    filters = [AuditLog.user_id == user_id]
    count = (await db.execute(select(func.count()).select_from(AuditLog).where(*filters))).scalar_one()
    result = await db.execute(select(AuditLog).where(*filters).offset((page - 1) * per_page).limit(per_page))
    logs = result.scalars().all()
    return paginate([{"id": str(l.id), "action": l.action, "entity_type": l.entity_type, "created_at": l.created_at.isoformat()} for l in logs], count, page, per_page)


@router.get("/{user_id}/permissions", summary="Get user permissions")
async def get_user_permissions(user_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    repo = UserRepository(db)
    user = await repo.get(user_id)
    if not user:
        raise NotFoundError("User", str(user_id))
    return {"permissions": user.permissions or []}


@router.put("/{user_id}/permissions", summary="Update user permissions")
async def update_permissions(user_id: uuid.UUID, body: PermissionsUpdate, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    repo = UserRepository(db)
    user = await repo.get(user_id)
    if not user:
        raise NotFoundError("User", str(user_id))
    user.permissions = body.permissions
    await db.flush()
    return {"permissions": user.permissions}
