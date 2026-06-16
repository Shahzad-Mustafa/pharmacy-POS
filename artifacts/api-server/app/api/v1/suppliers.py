import uuid
import logging
from fastapi import APIRouter, Depends, Query, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_roles
from app.models.user import User
from app.schemas.supplier import (
    SupplierCreate, SupplierUpdate, SupplierResponse, SupplierPaymentCreate,
    PurchaseOrderCreate, PurchaseOrderUpdate, POResponse, GRNCreate, GRNResponse,
    SupplierReturnCreate,
)
from app.schemas.common import paginate
from app.services.supplier_service import SupplierService
from app.repositories.supplier_repo import SupplierRepository
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

SUP_ROLES = ("admin", "manager", "pharmacist", "super_admin")
ADM_ROLES = ("admin", "manager", "super_admin")


@router.get("", summary="List suppliers")
async def list_suppliers(
    is_active: bool = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*SUP_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    repo = SupplierRepository(db)
    suppliers, total = await repo.list_suppliers(is_active=is_active, page=page, per_page=per_page)
    return paginate([SupplierResponse.model_validate(s).model_dump() for s in suppliers], total, page, per_page)


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED, summary="Create supplier")
async def create_supplier(
    body: SupplierCreate,
    current_user: User = Depends(require_roles(*ADM_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    svc = SupplierService(db)
    supplier = await svc.create_supplier(body.model_dump())
    return SupplierResponse.model_validate(supplier)


@router.get("/payables-aging", summary="Get payables aging report")
async def payables_aging(
    branch_id: uuid.UUID = None, as_of_date: str = None,
    current_user: User = Depends(require_roles("admin", "manager", "accountant", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    return []


@router.get("/purchase-orders", summary="List purchase orders")
async def list_pos(
    supplier_id: uuid.UUID = None, branch_id: uuid.UUID = None, status: str = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*SUP_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    repo = SupplierRepository(db)
    pos, total = await repo.list_pos(supplier_id=supplier_id, branch_id=branch_id, status=status, page=page, per_page=per_page)
    return paginate([POResponse.model_validate(p).model_dump() for p in pos], total, page, per_page)


@router.post("/purchase-orders", response_model=POResponse, status_code=status.HTTP_201_CREATED, summary="Create purchase order")
async def create_po(
    body: PurchaseOrderCreate,
    current_user: User = Depends(require_roles(*SUP_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    svc = SupplierService(db)
    po = await svc.create_po(body.model_dump(), current_user.id)
    return POResponse.model_validate(po)


@router.get("/purchase-orders/{po_id}", response_model=POResponse, summary="Get purchase order")
async def get_po(po_id: uuid.UUID, current_user: User = Depends(require_roles(*SUP_ROLES)), db: AsyncSession = Depends(get_db)):
    from app.models.supplier import PurchaseOrder
    po = await db.get(PurchaseOrder, po_id)
    if not po:
        raise NotFoundError("PurchaseOrder", str(po_id))
    return POResponse.model_validate(po)


@router.put("/purchase-orders/{po_id}", response_model=POResponse, summary="Update purchase order")
async def update_po(po_id: uuid.UUID, body: PurchaseOrderUpdate, current_user: User = Depends(require_roles(*ADM_ROLES)), db: AsyncSession = Depends(get_db)):
    from app.models.supplier import PurchaseOrder
    po = await db.get(PurchaseOrder, po_id)
    if not po:
        raise NotFoundError("PurchaseOrder", str(po_id))
    for k, v in body.model_dump(exclude_none=True, exclude={"items"}).items():
        setattr(po, k, v)
    await db.flush()
    return POResponse.model_validate(po)


@router.post("/purchase-orders/{po_id}/send", summary="Send PO to supplier")
async def send_po(po_id: uuid.UUID, current_user: User = Depends(require_roles(*ADM_ROLES)), db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timezone
    from app.models.supplier import PurchaseOrder
    po = await db.get(PurchaseOrder, po_id)
    if not po:
        raise NotFoundError("PurchaseOrder", str(po_id))
    po.status = "sent"
    po.sent_at = datetime.now(timezone.utc)
    await db.flush()
    return {"message": "Purchase order sent", "po_number": po.po_number}


@router.post("/purchase-orders/{po_id}/cancel", summary="Cancel purchase order")
async def cancel_po(po_id: uuid.UUID, body: dict, current_user: User = Depends(require_roles(*ADM_ROLES)), db: AsyncSession = Depends(get_db)):
    from app.models.supplier import PurchaseOrder
    po = await db.get(PurchaseOrder, po_id)
    if not po:
        raise NotFoundError("PurchaseOrder", str(po_id))
    po.status = "cancelled"
    po.notes = (po.notes or "") + f"\nCancelled: {body.get('reason', '')}"
    await db.flush()
    return {"message": "Purchase order cancelled"}


@router.get("/purchase-orders/{po_id}/pdf", summary="Get PO PDF")
async def get_po_pdf(po_id: uuid.UUID, current_user: User = Depends(require_roles(*ADM_ROLES)), db: AsyncSession = Depends(get_db)):
    return {"message": "PO PDF generation endpoint ready", "po_id": str(po_id)}


@router.get("/grn", summary="List GRNs")
async def list_grns(
    supplier_id: uuid.UUID = None, branch_id: uuid.UUID = None, po_id: uuid.UUID = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*SUP_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    repo = SupplierRepository(db)
    grns, total = await repo.list_grns(supplier_id=supplier_id, branch_id=branch_id, po_id=po_id, page=page, per_page=per_page)
    return [GRNResponse.model_validate(g).model_dump() for g in grns]


@router.post("/grn", response_model=GRNResponse, status_code=status.HTTP_201_CREATED, summary="Create GRN")
async def create_grn(
    body: GRNCreate,
    current_user: User = Depends(require_roles(*SUP_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    svc = SupplierService(db)
    grn = await svc.create_grn(body.model_dump(), current_user.id)
    return GRNResponse.model_validate(grn)


@router.get("/grn/{grn_id}", response_model=GRNResponse, summary="Get GRN")
async def get_grn(grn_id: uuid.UUID, current_user: User = Depends(require_roles(*SUP_ROLES)), db: AsyncSession = Depends(get_db)):
    from app.models.supplier import GRN
    grn = await db.get(GRN, grn_id)
    if not grn:
        raise NotFoundError("GRN", str(grn_id))
    return GRNResponse.model_validate(grn)


@router.get("/grn/{grn_id}/pdf", summary="Get GRN PDF")
async def get_grn_pdf(grn_id: uuid.UUID, current_user: User = Depends(require_roles(*ADM_ROLES)), db: AsyncSession = Depends(get_db)):
    return {"message": "GRN PDF generation endpoint ready", "grn_id": str(grn_id)}


@router.post("/returns", status_code=status.HTTP_201_CREATED, summary="Create supplier return")
async def create_return(
    body: SupplierReturnCreate,
    current_user: User = Depends(require_roles(*ADM_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    from app.models.supplier import SupplierReturn, SupplierReturnItem
    from datetime import date
    ret = SupplierReturn(
        return_number=body.return_number or f"SR-{date.today().strftime('%Y%m%d')}-001",
        supplier_id=body.supplier_id, branch_id=body.branch_id,
        return_date=body.return_date, credit_note_expected=body.credit_note_expected, notes=body.notes,
        created_by_id=current_user.id,
    )
    db.add(ret)
    await db.flush()
    for item in body.items:
        ri = SupplierReturnItem(return_id=ret.id, batch_id=item.batch_id, quantity=item.quantity, reason=item.reason)
        db.add(ri)
        from app.models.inventory import MedicineBatch
        batch = await db.get(MedicineBatch, item.batch_id)
        if batch:
            batch.quantity -= item.quantity
    await db.flush()
    return {"id": str(ret.id), "return_number": ret.return_number, "created_at": ret.created_at.isoformat()}


@router.get("/returns", summary="List supplier returns")
async def list_returns(
    supplier_id: uuid.UUID = None, branch_id: uuid.UUID = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*ADM_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select, func
    from app.models.supplier import SupplierReturn
    filters = []
    if supplier_id:
        filters.append(SupplierReturn.supplier_id == supplier_id)
    if branch_id:
        filters.append(SupplierReturn.branch_id == branch_id)
    query = select(SupplierReturn)
    if filters:
        query = query.where(*filters)
    total = (await db.execute(select(func.count()).select_from(SupplierReturn))).scalar_one()
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    returns = result.scalars().all()
    return paginate([{"id": str(r.id), "return_number": r.return_number, "supplier_id": str(r.supplier_id)} for r in returns], total, page, per_page)


@router.get("/{supplier_id}", response_model=SupplierResponse, summary="Get supplier")
async def get_supplier(supplier_id: uuid.UUID, current_user: User = Depends(require_roles(*ADM_ROLES)), db: AsyncSession = Depends(get_db)):
    repo = SupplierRepository(db)
    supplier = await repo.get(supplier_id)
    if not supplier:
        raise NotFoundError("Supplier", str(supplier_id))
    return SupplierResponse.model_validate(supplier)


@router.put("/{supplier_id}", response_model=SupplierResponse, summary="Update supplier")
async def update_supplier(supplier_id: uuid.UUID, body: SupplierUpdate, current_user: User = Depends(require_roles(*ADM_ROLES)), db: AsyncSession = Depends(get_db)):
    repo = SupplierRepository(db)
    supplier = await repo.get(supplier_id)
    if not supplier:
        raise NotFoundError("Supplier", str(supplier_id))
    updated = await repo.update(supplier, body.model_dump(exclude_none=True))
    return SupplierResponse.model_validate(updated)


@router.delete("/{supplier_id}", summary="Deactivate supplier")
async def deactivate_supplier(supplier_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    svc = SupplierService(db)
    await svc.deactivate(supplier_id)
    return {"message": "Supplier deactivated"}


@router.get("/{supplier_id}/history", summary="Get supplier purchase history")
async def supplier_history(supplier_id: uuid.UUID, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), current_user: User = Depends(require_roles(*ADM_ROLES)), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select, func
    from app.models.supplier import GRN
    total = (await db.execute(select(func.count()).select_from(GRN).where(GRN.supplier_id == supplier_id))).scalar_one()
    result = await db.execute(select(GRN).where(GRN.supplier_id == supplier_id).offset((page - 1) * per_page).limit(per_page))
    grns = result.scalars().all()
    return paginate([GRNResponse.model_validate(g).model_dump() for g in grns], total, page, per_page)


@router.get("/{supplier_id}/ledger", summary="Get supplier ledger / payables")
async def supplier_ledger(supplier_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "accountant", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"supplier_id": str(supplier_id), "debits": [], "credits": [], "outstanding": 0}


@router.post("/{supplier_id}/payments", status_code=status.HTTP_201_CREATED, summary="Record supplier payment")
async def record_payment(supplier_id: uuid.UUID, body: SupplierPaymentCreate, current_user: User = Depends(require_roles("admin", "accountant", "super_admin")), db: AsyncSession = Depends(get_db)):
    from app.models.supplier import SupplierPayment
    payment = SupplierPayment(supplier_id=supplier_id, **body.model_dump(exclude={"grn_ids"}), grn_ids=[str(g) for g in (body.grn_ids or [])], created_by_id=current_user.id)
    db.add(payment)
    await db.flush()
    return {"id": str(payment.id), "amount": float(payment.amount), "message": "Payment recorded"}


@router.post("/{supplier_id}/price-list", summary="Import supplier price list")
async def import_price_list(supplier_id: uuid.UUID, file: UploadFile = File(...), current_user: User = Depends(require_roles(*ADM_ROLES)), db: AsyncSession = Depends(get_db)):
    return {"message": "Price list import endpoint ready", "supplier_id": str(supplier_id)}
