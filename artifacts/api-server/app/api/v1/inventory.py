import uuid
import logging
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.inventory import (
    BatchCreate, BatchUpdate, BatchResponse, StockAdjustmentCreate,
    StockAdjustmentResponse, StockTransferCreate, StockCountCreate, FEFOPreviewRequest,
)
from app.schemas.common import paginate
from app.services.inventory_service import InventoryService
from app.repositories.inventory_repo import BatchRepository, StockAdjustmentRepository
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/inventory", tags=["Inventory"])

INVENTORY_ROLES = ("admin", "manager", "pharmacist", "super_admin")


@router.get("", summary="Get inventory overview")
async def get_inventory(
    branch_id: uuid.UUID = None, category: str = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*INVENTORY_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select, func
    from app.models.medicine import Medicine
    from app.models.inventory import MedicineBatch
    query = (
        select(
            Medicine.id.label("medicine_id"),
            Medicine.name.label("medicine_name"),
            Medicine.category,
            func.coalesce(func.sum(MedicineBatch.quantity), 0).label("total_qty"),
            func.coalesce(func.sum(MedicineBatch.quantity * MedicineBatch.purchase_price), 0).label("total_value"),
            func.count(MedicineBatch.id).label("batch_count"),
        )
        .join(MedicineBatch, MedicineBatch.medicine_id == Medicine.id, isouter=True)
        .where(Medicine.is_active == True)
        .group_by(Medicine.id)
    )
    if branch_id:
        query = query.where(MedicineBatch.branch_id == branch_id)
    if category:
        query = query.where(Medicine.category == category)
    result = await db.execute(query)
    rows = result.fetchall()
    return [
        {
            "medicine_id": str(r.medicine_id),
            "medicine_name": r.medicine_name,
            "category": r.category,
            "total_qty": int(r.total_qty),
            "total_value": float(r.total_value),
            "batch_count": int(r.batch_count),
            "branch_id": str(branch_id) if branch_id else None,
        }
        for r in rows
    ]


@router.get("/batches", summary="List batches")
async def list_batches(
    medicine_id: uuid.UUID = None, branch_id: uuid.UUID = None, supplier_id: uuid.UUID = None,
    has_stock: bool = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*INVENTORY_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    repo = BatchRepository(db)
    batches, total = await repo.list_batches(medicine_id=medicine_id, branch_id=branch_id, supplier_id=supplier_id, has_stock=has_stock, page=page, per_page=per_page)
    return paginate([BatchResponse.model_validate(b).model_dump() for b in batches], total, page, per_page)


@router.post("/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED, summary="Create batch")
async def create_batch(
    body: BatchCreate,
    current_user: User = Depends(require_roles(*INVENTORY_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    svc = InventoryService(db)
    batch = await svc.create_batch(body.model_dump())
    return BatchResponse.model_validate(batch)


@router.get("/batches/{batch_id}", response_model=BatchResponse, summary="Get batch")
async def get_batch(batch_id: uuid.UUID, current_user: User = Depends(require_roles(*INVENTORY_ROLES)), db: AsyncSession = Depends(get_db)):
    repo = BatchRepository(db)
    batch = await repo.get(batch_id)
    if not batch:
        raise NotFoundError("Batch", str(batch_id))
    return BatchResponse.model_validate(batch)


@router.put("/batches/{batch_id}", response_model=BatchResponse, summary="Update batch")
async def update_batch(
    batch_id: uuid.UUID, body: BatchUpdate,
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = BatchRepository(db)
    batch = await repo.get(batch_id)
    if not batch:
        raise NotFoundError("Batch", str(batch_id))
    updated = await repo.update(batch, body.model_dump(exclude_none=True))
    return BatchResponse.model_validate(updated)


@router.get("/batches/{batch_id}/transactions", summary="Get batch transaction history")
async def batch_transactions(batch_id: uuid.UUID, current_user: User = Depends(require_roles(*INVENTORY_ROLES)), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models.inventory import StockAdjustment
    result = await db.execute(select(StockAdjustment).where(StockAdjustment.batch_id == batch_id))
    adjs = result.scalars().all()
    return {"transactions": [{"id": str(a.id), "type": a.adjustment_type, "qty_change": a.quantity_change, "reason": a.reason, "created_at": a.created_at.isoformat()} for a in adjs]}


@router.post("/adjustments", response_model=StockAdjustmentResponse, status_code=status.HTTP_201_CREATED, summary="Create stock adjustment")
async def create_adjustment(
    body: StockAdjustmentCreate,
    current_user: User = Depends(require_roles(*INVENTORY_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    svc = InventoryService(db)
    adj = await svc.create_adjustment(body.model_dump(), current_user.id)
    return StockAdjustmentResponse.model_validate(adj)


@router.get("/adjustments", summary="List stock adjustments")
async def list_adjustments(
    branch_id: uuid.UUID = None, batch_id: uuid.UUID = None, type: str = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = StockAdjustmentRepository(db)
    adjs, total = await repo.list_adjustments(branch_id=branch_id, batch_id=batch_id, adj_type=type, page=page, per_page=per_page)
    return [StockAdjustmentResponse.model_validate(a).model_dump() for a in adjs]


@router.post("/transfers", status_code=status.HTTP_201_CREATED, summary="Transfer stock between branches")
async def create_transfer(
    body: StockTransferCreate,
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    svc = InventoryService(db)
    transfer = await svc.create_transfer(body.model_dump(), current_user.id)
    return {"id": str(transfer.id), "from_branch_id": str(transfer.from_branch_id), "to_branch_id": str(transfer.to_branch_id), "status": transfer.status, "created_at": transfer.created_at.isoformat()}


@router.get("/transfers", summary="List stock transfers")
async def list_transfers(
    from_branch: uuid.UUID = None, to_branch: uuid.UUID = None, status: str = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select, func
    from app.models.inventory import StockTransfer
    filters = []
    if from_branch:
        filters.append(StockTransfer.from_branch_id == from_branch)
    if to_branch:
        filters.append(StockTransfer.to_branch_id == to_branch)
    if status:
        filters.append(StockTransfer.status == status)
    query = select(StockTransfer)
    if filters:
        query = query.where(*filters)
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    transfers = result.scalars().all()
    total = (await db.execute(select(func.count()).select_from(StockTransfer))).scalar_one()
    return paginate([{"id": str(t.id), "from_branch_id": str(t.from_branch_id), "to_branch_id": str(t.to_branch_id), "status": t.status} for t in transfers], total, page, per_page)


@router.get("/valuation", summary="Get stock valuation")
async def get_valuation(
    branch_id: uuid.UUID = None, method: str = "fefo",
    current_user: User = Depends(require_roles("admin", "manager", "accountant", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    svc = InventoryService(db)
    return await svc.get_stock_valuation(branch_id)


@router.post("/stock-count", status_code=status.HTTP_201_CREATED, summary="Create stock count")
async def create_stock_count(
    body: StockCountCreate,
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    svc = InventoryService(db)
    count, variances = await svc.create_stock_count(body.model_dump(), current_user.id)
    return {"id": str(count.id), "status": count.status, "variances": variances, "created_at": count.created_at.isoformat()}


@router.post("/stock-count/{count_id}/confirm", summary="Confirm stock count and apply variances")
async def confirm_stock_count(
    count_id: uuid.UUID,
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.inventory import StockCount, StockCountItem, StockAdjustment
    count = await db.get(StockCount, count_id)
    if not count:
        raise NotFoundError("StockCount", str(count_id))
    count.status = "confirmed"
    count.confirmed_by_id = current_user.id
    result = await db.execute(select(StockCountItem).where(StockCountItem.stock_count_id == count_id))
    for item in result.scalars().all():
        if item.variance != 0:
            adj = StockAdjustment(batch_id=item.batch_id, branch_id=count.branch_id, adjustment_type="correction", quantity_change=item.variance, reason=f"Stock count confirmation #{count_id}", created_by_id=current_user.id)
            db.add(adj)
            batch = await db.get(__import__("app.models.inventory", fromlist=["MedicineBatch"]).MedicineBatch, item.batch_id)
            if batch:
                batch.quantity = item.physical_qty
    await db.flush()
    return {"message": "Stock count confirmed and variances applied", "count_id": str(count_id)}


@router.get("/reorder-suggestions", summary="Get reorder suggestions")
async def reorder_suggestions(
    branch_id: uuid.UUID = None, days_cover: int = 30,
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select, func
    from app.models.medicine import Medicine
    from app.models.inventory import MedicineBatch
    query = (
        select(Medicine, func.coalesce(func.sum(MedicineBatch.quantity), 0).label("qty"))
        .join(MedicineBatch, MedicineBatch.medicine_id == Medicine.id, isouter=True)
        .where(Medicine.is_active == True)
        .group_by(Medicine.id)
        .having(func.coalesce(func.sum(MedicineBatch.quantity), 0) <= Medicine.reorder_point)
    )
    if branch_id:
        query = query.where(MedicineBatch.branch_id == branch_id)
    result = await db.execute(query)
    return [
        {
            "medicine_id": str(r[0].id),
            "medicine_name": r[0].name,
            "current_stock": int(r[1]),
            "avg_daily_consumption": 0.0,
            "days_cover": int(r[1]) // max(1, r[0].reorder_point),
            "suggested_qty": max(r[0].reorder_point * 2 - int(r[1]), r[0].min_stock_level),
            "preferred_supplier": None,
            "last_purchase_price": None,
        }
        for r in result.fetchall()
    ]


@router.post("/fefo-preview", summary="FEFO allocation preview")
async def fefo_preview(body: FEFOPreviewRequest, current_user: User = Depends(require_roles(*INVENTORY_ROLES)), db: AsyncSession = Depends(get_db)):
    repo = BatchRepository(db)
    batches = await repo.get_fefo_batches(body.medicine_id, body.branch_id, body.quantity)
    return {"batches": [{"batch_id": str(b.id), "batch_number": b.batch_number, "expiry_date": b.expiry_date.isoformat() if b.expiry_date else None, "available_qty": b.quantity} for b in batches]}
