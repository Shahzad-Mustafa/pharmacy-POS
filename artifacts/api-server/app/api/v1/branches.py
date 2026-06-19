import uuid
import logging
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.user import User
from app.models.branch import Branch
from app.models.inventory import MedicineBatch
from app.schemas.branch import BranchCreate, BranchUpdate, BranchResponse, BranchSettingsUpdate
from app.schemas.common import MessageResponse
from app.repositories.base import BaseRepository
from app.core.exceptions import NotFoundError, ConflictError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/branches", tags=["Branches"])


def get_branch_repo(db: AsyncSession) -> BaseRepository[Branch]:
    return BaseRepository(Branch, db)


@router.get("", summary="List branches")
async def list_branches(
    is_active: bool = None,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — login page uses this to populate the branch selector."""
    from sqlalchemy import select as sa_select
    query = sa_select(Branch)
    if is_active is not None:
        query = query.where(Branch.is_active == is_active)
    result = await db.execute(query)
    branches = list(result.scalars().all())
    return [BranchResponse.model_validate(b).model_dump() for b in branches]


@router.post("", response_model=BranchResponse, status_code=status.HTTP_201_CREATED, summary="Create branch")
async def create_branch(
    body: BranchCreate,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Branch).where(Branch.code == body.code))
    if result.scalar_one_or_none():
        raise ConflictError("BRANCH_CODE_EXISTS", f"Branch code '{body.code}' already exists", "code")
    branch = Branch(**body.model_dump())
    db.add(branch)
    await db.flush()
    await db.refresh(branch)
    return BranchResponse.model_validate(branch)


@router.get("/{branch_id}", response_model=BranchResponse, summary="Get branch")
async def get_branch(branch_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    repo = get_branch_repo(db)
    branch = await repo.get(branch_id)
    if not branch:
        raise NotFoundError("Branch", str(branch_id))
    return BranchResponse.model_validate(branch)


@router.put("/{branch_id}", response_model=BranchResponse, summary="Update branch")
async def update_branch(
    branch_id: uuid.UUID, body: BranchUpdate,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = get_branch_repo(db)
    branch = await repo.get(branch_id)
    if not branch:
        raise NotFoundError("Branch", str(branch_id))
    updated = await repo.update(branch, body.model_dump(exclude_none=True))
    return BranchResponse.model_validate(updated)


@router.get("/{branch_id}/settings", summary="Get branch settings")
async def get_branch_settings(branch_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    repo = get_branch_repo(db)
    branch = await repo.get(branch_id)
    if not branch:
        raise NotFoundError("Branch", str(branch_id))
    return {"settings": branch.settings or {}}


@router.put("/{branch_id}/settings", summary="Update branch settings")
async def update_branch_settings(
    branch_id: uuid.UUID, body: BranchSettingsUpdate,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = get_branch_repo(db)
    branch = await repo.get(branch_id)
    if not branch:
        raise NotFoundError("Branch", str(branch_id))
    settings = branch.settings or {}
    settings.update(body.model_dump(exclude_none=True))
    branch.settings = settings
    await db.flush()
    return {"settings": settings}


@router.get("/{branch_id}/stock-summary", summary="Get branch stock summary")
async def get_stock_summary(
    branch_id: uuid.UUID,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.medicine import Medicine
    from datetime import date, timedelta
    total_batches = (await db.execute(select(func.count()).select_from(MedicineBatch).where(MedicineBatch.branch_id == branch_id, MedicineBatch.is_active == True))).scalar_one()
    total_value = (await db.execute(select(func.coalesce(func.sum(MedicineBatch.quantity * MedicineBatch.selling_price), 0)).where(MedicineBatch.branch_id == branch_id, MedicineBatch.is_active == True))).scalar_one()
    low_stock = (await db.execute(select(func.count()).select_from(MedicineBatch).join(Medicine, Medicine.id == MedicineBatch.medicine_id).where(MedicineBatch.branch_id == branch_id, MedicineBatch.quantity <= Medicine.reorder_point))).scalar_one()
    expiring = (await db.execute(select(func.count()).select_from(MedicineBatch).where(MedicineBatch.branch_id == branch_id, MedicineBatch.expiry_date <= date.today() + timedelta(days=90), MedicineBatch.quantity > 0))).scalar_one()
    return {
        "total_batches": total_batches,
        "total_value": float(total_value or 0),
        "low_stock_count": low_stock,
        "expiring_soon_count": expiring,
    }


@router.get("/{branch_id}/dashboard", summary="Get branch dashboard KPIs")
async def get_branch_dashboard(
    branch_id: uuid.UUID, date: str = None,
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as dt_date
    from sqlalchemy import cast, Date, literal
    from app.models.sale import Sale
    today = date or dt_date.today().isoformat()
    today_cast = cast(literal(today), Date)
    revenue = (await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(Sale.branch_id == branch_id, Sale.status == "completed", cast(Sale.created_at, Date) == today_cast))).scalar_one()
    txns = (await db.execute(select(func.count()).select_from(Sale).where(Sale.branch_id == branch_id, Sale.status == "completed", cast(Sale.created_at, Date) == today_cast))).scalar_one()
    return {"date": today, "revenue": float(revenue or 0), "transactions": txns, "avg_basket": float(revenue or 0) / max(txns, 1)}
