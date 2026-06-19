import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.medicine import (
    MedicineCreate, MedicineUpdate, MedicineResponse,
    MedicineMRPUpdate, MedicineEnrichRequest, BarcodeLookupRequest, AllergyCheckRequest,
)
from app.schemas.common import paginate
from app.services.medicine_service import MedicineService
from app.repositories.medicine_repo import MedicineRepository
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/medicines", tags=["Medicines"])


@router.get("", summary="List medicines")
async def list_medicines(
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    q: str = None, category: str = None, manufacturer: str = None,
    requires_prescription: bool = None, is_active: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = MedicineRepository(db)
    medicines, total = await repo.search(
        q=q, category=category, is_active=is_active,
        requires_prescription=requires_prescription, page=page, per_page=per_page,
    )
    from sqlalchemy import select as _sel, func as _func
    from app.models.inventory import MedicineBatch as _Batch
    med_ids = [m.id for m in medicines]
    stock_map: dict = {}
    expiry_map: dict = {}
    if med_ids:
        stock_rows = (await db.execute(
            _sel(_Batch.medicine_id, _func.coalesce(_func.sum(_Batch.quantity), 0).label("qty"))
            .where(_Batch.medicine_id.in_(med_ids), _Batch.quantity > 0)
            .group_by(_Batch.medicine_id)
        )).all()
        stock_map = {r[0]: int(r[1]) for r in stock_rows}
        # Nearest expiry date per medicine (including expired batches with stock)
        expiry_rows = (await db.execute(
            _sel(_Batch.medicine_id, _func.min(_Batch.expiry_date).label("nearest_expiry"))
            .where(_Batch.medicine_id.in_(med_ids), _Batch.quantity > 0, _Batch.expiry_date.isnot(None))
            .group_by(_Batch.medicine_id)
        )).all()
        expiry_map = {r[0]: r[1].isoformat() if r[1] else None for r in expiry_rows}
    dicts = []
    for m in medicines:
        d = MedicineResponse.model_validate(m).model_dump()
        d["current_stock"] = stock_map.get(m.id, 0)
        d["nearest_expiry"] = expiry_map.get(m.id)
        dicts.append(d)
    return paginate(dicts, total, page, per_page)


@router.get("/categories", summary="Get medicine categories")
async def get_categories(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    repo = MedicineRepository(db)
    cats = await repo.get_categories()
    return [{"name": c["name"], "count": c["count"]} for c in cats]


@router.get("/low-stock", summary="Get low-stock medicines")
async def low_stock(
    branch_id: uuid.UUID = None, threshold: int = None,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = MedicineRepository(db)
    items = await repo.get_low_stock(branch_id)
    return [
        {
            "id": str(r[0].id),
            "name": r[0].name,
            "category": r[0].category,
            "current_stock": int(r[1]),
            "min_stock_level": r[0].min_stock_level,
            "reorder_point": r[0].reorder_point,
        }
        for r in items
    ]


@router.get("/expiring-soon", summary="Get expiring medicines")
async def expiring_soon(
    days: int = Query(90, ge=1), branch_id: uuid.UUID = None,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date, timedelta
    from sqlalchemy import select
    from app.models.inventory import MedicineBatch
    from app.models.medicine import Medicine
    from app.models.branch import Branch as BranchModel
    cutoff = date.today() + timedelta(days=days)
    query = (
        select(MedicineBatch, Medicine, BranchModel)
        .join(Medicine, Medicine.id == MedicineBatch.medicine_id)
        .join(BranchModel, BranchModel.id == MedicineBatch.branch_id)
        .where(MedicineBatch.expiry_date <= cutoff, MedicineBatch.quantity > 0)
    )
    if branch_id:
        query = query.where(MedicineBatch.branch_id == branch_id)
    result = await db.execute(query.order_by(MedicineBatch.expiry_date))
    rows = result.fetchall()
    today = date.today()
    return [
        {
            "batch_id": str(r[0].id),
            "batch_number": r[0].batch_number,
            "medicine_id": str(r[0].medicine_id),
            "medicine_name": r[1].name,
            "expiry_date": r[0].expiry_date.isoformat() if r[0].expiry_date else None,
            "days_until_expiry": (r[0].expiry_date - today).days if r[0].expiry_date else None,
            "quantity": r[0].quantity,
            "branch_name": r[2].name,
            "urgency": "critical" if r[0].expiry_date and (r[0].expiry_date - today).days <= 30 else "warning",
        }
        for r in rows
    ]


@router.get("/out-of-stock", summary="Get out-of-stock medicines")
async def out_of_stock(
    branch_id: uuid.UUID = None,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")),
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
        .having(func.coalesce(func.sum(MedicineBatch.quantity), 0) == 0)
    )
    result = await db.execute(query)
    return {"data": [{"id": str(r[0].id), "name": r[0].name} for r in result.fetchall()]}


@router.get("/search", summary="Search medicines")
async def search_medicines(
    q: str = None, barcode: str = None, generic: str = None,
    ndc: str = None, rxcui: str = None, drap_no: str = None,
    branch_id: uuid.UUID = None, in_stock_only: bool = False,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select, func
    from app.models.inventory import MedicineBatch

    repo = MedicineRepository(db)
    medicines, total = await repo.search(q=q, barcode=barcode, generic=generic, page=page, per_page=per_page)

    if not medicines:
        return []

    med_ids = [m.id for m in medicines]
    stock_q = (
        select(MedicineBatch.medicine_id, func.coalesce(func.sum(MedicineBatch.quantity), 0).label("qty"))
        .where(MedicineBatch.medicine_id.in_(med_ids), MedicineBatch.quantity > 0)
    )
    if branch_id:
        stock_q = stock_q.where(MedicineBatch.branch_id == branch_id)
    stock_q = stock_q.group_by(MedicineBatch.medicine_id)
    stock_rows = (await db.execute(stock_q)).all()
    stock_map = {row.medicine_id: int(row.qty) for row in stock_rows}

    result = []
    for m in medicines:
        item = MedicineResponse.model_validate(m).model_dump()
        item["current_stock"] = stock_map.get(m.id, 0)
        result.append(item)
    return result


@router.post("/barcode-lookup", summary="Lookup medicine by barcode/GS1")
async def barcode_lookup(body: BarcodeLookupRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    repo = MedicineRepository(db)
    med = await repo.get_by_barcode(body.raw_scan)
    if not med:
        med = await repo.get_by_barcode(body.raw_scan[:14])
    if not med:
        raise NotFoundError("Medicine (barcode)", body.raw_scan)
    return {"medicine": MedicineResponse.model_validate(med).model_dump(), "batch": None}


@router.post("/allergy-check", summary="Check allergy cross-match")
async def allergy_check(body: AllergyCheckRequest, current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "doctor", "super_admin")), db: AsyncSession = Depends(get_db)):
    svc = MedicineService(db)
    return await svc.check_allergies(body.medicine_ids, body.patient_id)


@router.post("/import", summary="Bulk import medicines from CSV/Excel")
async def import_medicines(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    return {"imported": 0, "skipped": 0, "errors": [], "message": "Import endpoint ready — connect CSV parser for production"}


@router.get("/export", summary="Export medicines")
async def export_medicines(
    format: str = "csv", category: str = None, branch_id: uuid.UUID = None,
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    return {"message": "Export endpoint ready", "format": format}


@router.get("/controlled-substances", summary="List controlled substances")
async def controlled_substances(
    schedule: str = None, branch_id: uuid.UUID = None,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.medicine import Medicine
    query = select(Medicine).where(Medicine.controlled_substance_schedule.isnot(None), Medicine.is_active == True)
    if schedule:
        query = query.where(Medicine.controlled_substance_schedule == schedule)
    result = await db.execute(query)
    medicines = result.scalars().all()
    return {"data": [MedicineResponse.model_validate(m).model_dump() for m in medicines]}


@router.post("", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED, summary="Create medicine")
async def create_medicine(
    body: MedicineCreate,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    svc = MedicineService(db)
    med = await svc.create(body.model_dump(), current_user.id)
    return MedicineResponse.model_validate(med)


@router.get("/{medicine_id}", response_model=MedicineResponse, summary="Get medicine detail")
async def get_medicine(medicine_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    repo = MedicineRepository(db)
    med = await repo.get(medicine_id)
    if not med:
        raise NotFoundError("Medicine", str(medicine_id))
    return MedicineResponse.model_validate(med)


@router.put("/{medicine_id}", response_model=MedicineResponse, summary="Update medicine")
async def update_medicine(
    medicine_id: uuid.UUID, body: MedicineUpdate,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    svc = MedicineService(db)
    med = await svc.update(medicine_id, body.model_dump(exclude_none=True), current_user.id)
    return MedicineResponse.model_validate(med)


@router.delete("/{medicine_id}", summary="Deactivate medicine")
async def deactivate_medicine(
    medicine_id: uuid.UUID,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    svc = MedicineService(db)
    await svc.deactivate(medicine_id)
    return {"message": "Medicine deactivated"}


@router.patch("/{medicine_id}/mrp", summary="Update medicine MRP")
async def update_mrp(
    medicine_id: uuid.UUID, body: MedicineMRPUpdate,
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    svc = MedicineService(db)
    med = await svc.update_mrp(medicine_id, body.new_mrp, body.effective_date, body.reason, current_user.id)
    return MedicineResponse.model_validate(med)


@router.post("/{medicine_id}/enrich", summary="Enrich medicine from external APIs")
async def enrich_medicine(
    medicine_id: uuid.UUID, body: MedicineEnrichRequest,
    current_user: User = Depends(require_roles("admin", "pharmacist", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    svc = MedicineService(db)
    return await svc.enrich_from_openfda(medicine_id, body.sources)


@router.get("/{medicine_id}/interactions", summary="Get drug interactions")
async def get_interactions(
    medicine_id: uuid.UUID,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "doctor", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    return {"interactions": [], "medicine_id": str(medicine_id), "note": "Configure DrugBank API key for live interaction data"}


@router.get("/{medicine_id}/alternatives", summary="Get therapeutic alternatives")
async def get_alternatives(
    medicine_id: uuid.UUID, generic_only: bool = True,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "doctor", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.medicine import Medicine
    med = await db.get(Medicine, medicine_id)
    if not med or not med.generic_name:
        return {"alternatives": []}
    result = await db.execute(select(Medicine).where(Medicine.generic_name == med.generic_name, Medicine.id != medicine_id, Medicine.is_active == True))
    alts = result.scalars().all()
    return {"alternatives": [MedicineResponse.model_validate(a).model_dump() for a in alts]}


@router.get("/{medicine_id}/price-history", summary="Get medicine price history")
async def get_price_history(
    medicine_id: uuid.UUID,
    current_user: User = Depends(require_roles("admin", "manager", "accountant", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.medicine import MedicinePriceHistory
    result = await db.execute(select(MedicinePriceHistory).where(MedicinePriceHistory.medicine_id == medicine_id).order_by(MedicinePriceHistory.created_at.desc()))
    history = result.scalars().all()
    return {"data": [{"id": str(h.id), "old_mrp": float(h.old_mrp), "new_mrp": float(h.new_mrp), "reason": h.reason, "created_at": h.created_at.isoformat()} for h in history]}


@router.get("/{medicine_id}/audit", summary="Get medicine audit trail")
async def get_medicine_audit(
    medicine_id: uuid.UUID,
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.user import AuditLog
    result = await db.execute(select(AuditLog).where(AuditLog.entity_type == "medicine", AuditLog.entity_id == str(medicine_id)).order_by(AuditLog.created_at.desc()))
    logs = result.scalars().all()
    return {"data": [{"id": str(l.id), "action": l.action, "before": l.before_data, "after": l.after_data, "created_at": l.created_at.isoformat()} for l in logs]}
