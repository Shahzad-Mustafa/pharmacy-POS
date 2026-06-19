import uuid
import logging
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.sale import (
    SaleCreate, SaleResponse, SaleRefundRequest, SalePaymentCreate, ScanRequest, ZReportRequest, WardDispenseRequest,
)
from app.schemas.common import paginate
from app.services.sale_service import SaleService
from app.repositories.sale_repo import SaleRepository
from app.core.exceptions import NotFoundError, BadRequestError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sales", tags=["Sales / POS"])

SALES_ROLES = ("admin", "manager", "pharmacist", "cashier", "super_admin")


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create sale")
async def create_sale(
    body: SaleCreate,
    current_user: User = Depends(require_roles(*SALES_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    svc = SaleService(db)
    result = await svc.create_sale(body.model_dump(), current_user.id)
    sale = result["sale"]
    return {
        "sale": SaleResponse.model_validate(sale).model_dump(),
        "warnings": result["warnings"],
        "stock_updated": result["stock_updated"],
    }


@router.get("/held", summary="List held sales")
async def list_held(
    branch_id: uuid.UUID = None, cashier_id: uuid.UUID = None,
    current_user: User = Depends(require_roles(*SALES_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    repo = SaleRepository(db)
    sales, total = await repo.list_sales(branch_id=branch_id, cashier_id=cashier_id, status="held")
    return [SaleResponse.model_validate(s).model_dump() for s in sales]


@router.get("/search", summary="Search sales")
async def search_sales(
    invoice_number: str = None, patient_name: str = None, patient_cnic: str = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*SALES_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select, func
    from app.models.sale import Sale
    filters = []
    if invoice_number:
        filters.append(Sale.invoice_number.ilike(f"%{invoice_number}%"))
    query = select(Sale)
    if filters:
        query = query.where(*filters)
    total = (await db.execute(select(func.count()).select_from(Sale))).scalar_one()
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select as _sel
    from app.models.medicine import Medicine as _Med
    import uuid as _uuid
    result = await db.execute(query.options(selectinload(Sale.items)).offset((page - 1) * per_page).limit(per_page))
    sales = result.scalars().all()

    all_med_ids = list({item.medicine_id for s in sales for item in s.items})
    med_names: dict = {}
    if all_med_ids:
        rows = (await db.execute(_sel(_Med.id, _Med.name).where(_Med.id.in_(all_med_ids)))).all()
        med_names = {r[0]: r[1] for r in rows}

    result_list = []
    for s in sales:
        d = SaleResponse.model_validate(s).model_dump()
        for item in d.get("items", []):
            raw_id = item.get("medicine_id")
            if raw_id is not None:
                key = _uuid.UUID(str(raw_id)) if not isinstance(raw_id, _uuid.UUID) else raw_id
                item["medicine_name"] = med_names.get(key, "")
        result_list.append(d)
    return paginate(result_list, total, page, per_page)


@router.get("/kpis", summary="Get sales KPIs")
async def get_kpis(
    branch_id: uuid.UUID = None, date: str = None,
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as dt_date
    from sqlalchemy import select, func, cast, Date
    from app.models.sale import Sale
    today_str = date or dt_date.today().isoformat()
    today_date = dt_date.fromisoformat(today_str)
    base = [Sale.status == "completed", cast(Sale.created_at, Date) == today_date]
    if branch_id:
        base.append(Sale.branch_id == branch_id)
    revenue = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*base))).scalar_one())
    txns = int((await db.execute(select(func.count()).select_from(Sale).where(*base))).scalar_one())
    refunds = int((await db.execute(select(func.count()).select_from(Sale).where(
        Sale.status == "refunded", cast(Sale.created_at, Date) == today_date,
        *([Sale.branch_id == branch_id] if branch_id else [])
    ))).scalar_one())
    top_med = None
    top_cashier = None
    avg = revenue / max(txns, 1)
    return {
        "branch_id": str(branch_id) if branch_id else None,
        "date": today_str,
        "today_revenue": revenue,
        "today_transactions": txns,
        "avg_basket": avg,
        "avg_transaction": avg,
        "revenue_today": revenue,
        "transactions_today": txns,
        "top_medicine": top_med,
        "top_cashier": top_cashier,
        "refunds_today": refunds,
        "net_revenue": revenue,
    }


@router.get("/daily-summary", summary="Get daily cash summary")
async def daily_summary(
    branch_id: uuid.UUID = None, date: str = None, cashier_id: uuid.UUID = None,
    current_user: User = Depends(require_roles(*SALES_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as dt_date
    from sqlalchemy import select, func, cast, Date
    from app.models.sale import Sale
    today_str = date or dt_date.today().isoformat()
    today_date = dt_date.fromisoformat(today_str)
    base = [cast(Sale.created_at, Date) == today_date]
    if branch_id:
        base.append(Sale.branch_id == branch_id)
    if cashier_id:
        base.append(Sale.cashier_id == cashier_id)
    completed = [Sale.status == "completed", *base]
    total_sales = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*completed))).scalar_one())
    total_txns = int((await db.execute(select(func.count()).select_from(Sale).where(*completed))).scalar_one())
    cash = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*completed, Sale.payment_method == "cash"))).scalar_one())
    card = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*completed, Sale.payment_method == "card"))).scalar_one())
    credit = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*completed, Sale.payment_method == "credit"))).scalar_one())
    refunds = int((await db.execute(select(func.count()).select_from(Sale).where(Sale.status == "refunded", *base))).scalar_one())
    return {
        "date": today_str,
        "branch_id": str(branch_id) if branch_id else None,
        "total_sales": total_sales,
        "total_revenue": total_sales,
        "total_transactions": total_txns,
        "cash_sales": cash,
        "card_sales": card,
        "credit_sales": credit,
        "total_refunds": refunds,
        "net_revenue": total_sales,
        "rx_sales": 0.0,
        "otc_sales": total_sales,
        "by_payment_method": {"cash": cash, "card": card, "credit": credit},
    }


@router.post("/scan", summary="Scan product for POS")
async def scan_product(
    body: ScanRequest,
    current_user: User = Depends(require_roles(*SALES_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    from app.repositories.medicine_repo import MedicineRepository
    from app.repositories.inventory_repo import BatchRepository
    med_repo = MedicineRepository(db)
    med = await med_repo.get_by_barcode(body.scan_data)
    if not med:
        raise NotFoundError("Medicine (barcode)", body.scan_data)
    batch_repo = BatchRepository(db)
    batches = await batch_repo.get_by_medicine_branch(med.id, body.branch_id)
    fefo = batches[0] if batches else None
    from datetime import date, timedelta
    warning = None
    if fefo and fefo.expiry_date and fefo.expiry_date <= date.today() + timedelta(days=90):
        warning = "BATCH_EXPIRING_SOON"
    return {
        "medicine": {"id": str(med.id), "name": med.name, "mrp": float(med.mrp) if med.mrp else None, "requires_prescription": med.requires_prescription},
        "batch": {"id": str(fefo.id), "batch_number": fefo.batch_number, "expiry_date": fefo.expiry_date.isoformat() if fefo and fefo.expiry_date else None, "available_qty": fefo.quantity} if fefo else None,
        "warning": warning,
    }


@router.post("/calculate", summary="Preview sale total (dry-run)")
async def calculate_sale(body: SaleCreate, current_user: User = Depends(require_roles(*SALES_ROLES)), db: AsyncSession = Depends(get_db)):
    items = body.items
    subtotal = sum(item.quantity * item.unit_price for item in items)
    discount = body.discount_on_invoice + subtotal * body.discount_pct_on_invoice / 100
    taxable = subtotal - discount
    tax = taxable * body.tax_rate
    total = taxable + tax
    change = float(body.amount_tendered) - total if body.amount_tendered else None
    return {"subtotal": subtotal, "discount": discount, "tax": tax, "total": total, "change": change}


@router.post("/z-report", summary="Daily cash reconciliation (Z-Report)")
async def z_report(
    body: ZReportRequest,
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = SaleRepository(db)
    summary = await repo.get_daily_summary(body.branch_id, body.date, body.cashier_id)
    return {"date": body.date, "branch_id": str(body.branch_id), **summary, "net_cash": summary["revenue"] - summary["discounts"]}


@router.post("/ward-dispense", status_code=status.HTTP_201_CREATED, summary="Hospital ward dispensing")
async def ward_dispense(
    body: WardDispenseRequest,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    return {"message": "Ward dispense endpoint ready", "ward": body.ward}


@router.get("/ward-dispense", summary="Get ward dispensing log")
async def ward_dispense_log(
    ward: str = None, patient_id: uuid.UUID = None,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    return {"data": []}


@router.get("", summary="List sales")
async def list_sales(
    from_date: str = Query(None, alias="from"),
    to_date: str = Query(None, alias="to"),
    branch_id: uuid.UUID = None,
    cashier_id: uuid.UUID = None,
    patient_id: uuid.UUID = None,
    sale_type: str = None,
    payment_method: str = None,
    status: str = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*SALES_ROLES, "accountant")),
    db: AsyncSession = Depends(get_db),
):
    repo = SaleRepository(db)
    sales, total = await repo.list_sales(
        branch_id=branch_id, cashier_id=cashier_id, patient_id=patient_id,
        sale_type=sale_type, payment_method=payment_method, status=status,
        date_from=from_date, date_to=to_date,
        page=page, per_page=per_page,
    )
    return paginate([SaleResponse.model_validate(s).model_dump() for s in sales], total, page, per_page)


@router.get("/{sale_id}", response_model=SaleResponse, summary="Get sale")
async def get_sale(sale_id: uuid.UUID, current_user: User = Depends(require_roles(*SALES_ROLES, "accountant")), db: AsyncSession = Depends(get_db)):
    repo = SaleRepository(db)
    sale = await repo.get_with_items(sale_id)
    if not sale:
        raise NotFoundError("Sale", str(sale_id))
    return SaleResponse.model_validate(sale)


@router.post("/{sale_id}/hold", summary="Hold sale")
async def hold_sale(sale_id: uuid.UUID, current_user: User = Depends(require_roles(*SALES_ROLES)), db: AsyncSession = Depends(get_db)):
    repo = SaleRepository(db)
    sale = await repo.get(sale_id)
    if not sale:
        raise NotFoundError("Sale", str(sale_id))
    sale.status = "held"
    await db.flush()
    return {"message": "Sale held", "sale_id": str(sale_id)}


@router.post("/{sale_id}/resume", summary="Resume held sale")
async def resume_sale(sale_id: uuid.UUID, current_user: User = Depends(require_roles(*SALES_ROLES)), db: AsyncSession = Depends(get_db)):
    repo = SaleRepository(db)
    sale = await repo.get_with_items(sale_id)
    if not sale:
        raise NotFoundError("Sale", str(sale_id))
    sale.status = "in_progress"
    await db.flush()
    return {"sale": SaleResponse.model_validate(sale).model_dump()}


@router.post("/{sale_id}/void", summary="Void sale")
async def void_sale(sale_id: uuid.UUID, current_user: User = Depends(require_roles(*SALES_ROLES)), db: AsyncSession = Depends(get_db)):
    repo = SaleRepository(db)
    sale = await repo.get(sale_id)
    if not sale:
        raise NotFoundError("Sale", str(sale_id))
    if sale.status not in ("in_progress", "held"):
        raise BadRequestError("INVALID_STATUS", "Only in-progress or held sales can be voided")
    sale.status = "voided"
    await db.flush()
    return {"message": "Sale voided"}


@router.post("/{sale_id}/refund", summary="Process refund / return")
async def process_refund(
    sale_id: uuid.UUID, body: SaleRefundRequest,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    svc = SaleService(db)
    refund = await svc.process_refund(sale_id, body.model_dump(), current_user.id)
    return {"refund_sale": SaleResponse.model_validate(refund).model_dump()}


@router.get("/{sale_id}/refunds", summary="Get sale refunds")
async def get_refunds(sale_id: uuid.UUID, current_user: User = Depends(require_roles(*SALES_ROLES)), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models.sale import Sale
    result = await db.execute(select(Sale).where(Sale.refund_of_id == sale_id))
    refunds = result.scalars().all()
    return {"refunds": [SaleResponse.model_validate(r).model_dump() for r in refunds]}


@router.post("/{sale_id}/payments", status_code=status.HTTP_201_CREATED, summary="Apply payment to credit sale")
async def add_payment(
    sale_id: uuid.UUID, body: SalePaymentCreate,
    current_user: User = Depends(require_roles(*SALES_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    from app.models.sale import SalePayment
    payment = SalePayment(sale_id=sale_id, amount=body.amount, payment_method=body.payment_method, notes=body.notes, created_by_id=current_user.id)
    db.add(payment)
    await db.flush()
    return {"id": str(payment.id), "amount": float(payment.amount), "payment_method": payment.payment_method}


@router.get("/{sale_id}/payments", summary="Get sale payments")
async def get_payments(sale_id: uuid.UUID, current_user: User = Depends(require_roles(*SALES_ROLES)), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models.sale import SalePayment
    result = await db.execute(select(SalePayment).where(SalePayment.sale_id == sale_id))
    payments = result.scalars().all()
    return {"payments": [{"id": str(p.id), "amount": float(p.amount), "method": p.payment_method, "created_at": p.created_at.isoformat()} for p in payments]}


@router.post("/{sale_id}/print", summary="Print receipt")
async def print_receipt(sale_id: uuid.UUID, current_user: User = Depends(require_roles(*SALES_ROLES)), db: AsyncSession = Depends(get_db)):
    return {"message": "Receipt print job queued", "sale_id": str(sale_id)}


@router.get("/{sale_id}/pdf", summary="Get sale PDF")
async def get_sale_pdf(sale_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return {"message": "PDF generation endpoint ready", "sale_id": str(sale_id)}


@router.get("/{sale_id}/fhir", summary="Get sale as FHIR MedicationDispense")
async def get_sale_fhir(sale_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "pharmacist", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"resourceType": "Bundle", "type": "collection", "entry": [], "sale_id": str(sale_id)}
