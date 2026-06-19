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
    has_stock: bool = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=1000),
    current_user: User = Depends(require_roles(*INVENTORY_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    repo = BatchRepository(db)
    batches, total = await repo.list_batches(medicine_id=medicine_id, branch_id=branch_id, supplier_id=supplier_id, has_stock=has_stock, page=page, per_page=per_page)
    from sqlalchemy import select as _sel
    from app.models.medicine import Medicine as _Med
    med_ids = [b.medicine_id for b in batches]
    med_names: dict = {}
    if med_ids:
        rows = (await db.execute(_sel(_Med.id, _Med.name).where(_Med.id.in_(med_ids)))).all()
        med_names = {r[0]: r[1] for r in rows}
    dicts = []
    for b in batches:
        d = BatchResponse.model_validate(b).model_dump()
        d["medicine_name"] = med_names.get(b.medicine_id)
        dicts.append(d)
    return paginate(dicts, total, page, per_page)


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
    from datetime import date, timedelta
    from sqlalchemy import select, func, or_, and_
    from app.models.medicine import Medicine
    from app.models.inventory import MedicineBatch

    today = date.today()
    expiry_threshold = today + timedelta(days=90)

    # ── 1. Low stock: total qty ≤ reorder_point ──────────────────────────────
    low_stock_q = (
        select(Medicine, func.coalesce(func.sum(MedicineBatch.quantity), 0).label("qty"))
        .join(MedicineBatch, MedicineBatch.medicine_id == Medicine.id, isouter=True)
        .where(Medicine.is_active == True)
        .group_by(Medicine.id)
        .having(func.coalesce(func.sum(MedicineBatch.quantity), 0) <= Medicine.reorder_point)
    )
    if branch_id:
        low_stock_q = low_stock_q.where(MedicineBatch.branch_id == branch_id)

    low_stock_rows = (await db.execute(low_stock_q)).fetchall()
    low_stock_ids = {r[0].id for r in low_stock_rows}

    # ── 2. Expiring / Expired batches with stock remaining ───────────────────
    expiry_q = (
        select(MedicineBatch, Medicine)
        .join(Medicine, Medicine.id == MedicineBatch.medicine_id)
        .where(
            Medicine.is_active == True,
            MedicineBatch.quantity > 0,
            MedicineBatch.expiry_date.isnot(None),
            MedicineBatch.expiry_date <= expiry_threshold,
        )
    )
    if branch_id:
        expiry_q = expiry_q.where(MedicineBatch.branch_id == branch_id)

    expiry_rows = (await db.execute(expiry_q)).fetchall()

    # Group expiry batches by medicine_id → pick earliest expiry + sum qty
    expiry_map: dict = {}  # medicine_id → {medicine, earliest_expiry, expiry_qty}
    for batch, med in expiry_rows:
        mid = med.id
        if mid not in expiry_map:
            expiry_map[mid] = {"medicine": med, "earliest_expiry": batch.expiry_date, "expiry_qty": 0}
        if batch.expiry_date < expiry_map[mid]["earliest_expiry"]:
            expiry_map[mid]["earliest_expiry"] = batch.expiry_date
        expiry_map[mid]["expiry_qty"] += batch.quantity

    # ── 3. Merge both sets, deduplicate by medicine_id ───────────────────────
    results = []
    seen_ids: set = set()

    # Low-stock entries first
    for med, qty in low_stock_rows:
        seen_ids.add(med.id)
        exp_info = expiry_map.get(med.id)
        earliest = exp_info["earliest_expiry"] if exp_info else None
        days_left = (earliest - today).days if earliest else None
        urgency = (
            "critical" if int(qty) == 0 or (days_left is not None and days_left <= 30)
            else "warning"
        )
        results.append({
            "medicine_id": str(med.id),
            "medicine_name": med.name,
            "category": med.category or "—",
            "current_stock": int(qty),
            "quantity": int(qty),
            "reorder_point": med.reorder_point,
            "min_stock_level": med.min_stock_level,
            "suggested_order_qty": max(med.reorder_point * 2 - int(qty), med.min_stock_level or 50),
            "reason": "low_stock",
            "urgency": urgency,
            "nearest_expiry": earliest.isoformat() if earliest else None,
            "days_until_expiry": days_left,
            "expiry_qty": exp_info["expiry_qty"] if exp_info else None,
        })

    # Expiry-only entries (not already in low-stock list)
    for mid, info in expiry_map.items():
        if mid in seen_ids:
            # Already added above — patch in expiry info (already done)
            continue
        med = info["medicine"]
        earliest = info["earliest_expiry"]
        days_left = (earliest - today).days
        urgency = "critical" if days_left <= 30 else "warning"
        # Get total stock for this medicine
        stock_r = await db.execute(
            select(func.coalesce(func.sum(MedicineBatch.quantity), 0))
            .where(MedicineBatch.medicine_id == mid, MedicineBatch.quantity > 0)
        )
        total_stock = int(stock_r.scalar_one())
        results.append({
            "medicine_id": str(med.id),
            "medicine_name": med.name,
            "category": med.category or "—",
            "current_stock": total_stock,
            "quantity": total_stock,
            "reorder_point": med.reorder_point,
            "min_stock_level": med.min_stock_level,
            "suggested_order_qty": med.min_stock_level or 50,
            "reason": "expiry",
            "urgency": urgency,
            "nearest_expiry": earliest.isoformat(),
            "days_until_expiry": days_left,
            "expiry_qty": info["expiry_qty"],
        })

    # Sort: critical first, then warning; within same urgency by days_until_expiry asc
    def sort_key(r):
        urgency_order = 0 if r["urgency"] == "critical" else 1
        expiry_order = r["days_until_expiry"] if r["days_until_expiry"] is not None else 9999
        return (urgency_order, expiry_order)

    results.sort(key=sort_key)
    return results


@router.post("/fefo-preview", summary="FEFO allocation preview")
async def fefo_preview(body: FEFOPreviewRequest, current_user: User = Depends(require_roles(*INVENTORY_ROLES)), db: AsyncSession = Depends(get_db)):
    repo = BatchRepository(db)
    batches = await repo.get_fefo_batches(body.medicine_id, body.branch_id, body.quantity)
    return {"batches": [{"batch_id": str(b.id), "batch_number": b.batch_number, "expiry_date": b.expiry_date.isoformat() if b.expiry_date else None, "available_qty": b.quantity} for b in batches]}
