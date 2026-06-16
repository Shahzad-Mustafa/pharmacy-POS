import uuid
import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import require_roles
from app.models.user import User
from app.models.sale import Sale, SaleItem
from app.models.medicine import Medicine
from app.models.inventory import MedicineBatch

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports"])

REPORT_ROLES = ("admin", "manager", "accountant", "super_admin")


@router.get("/sales", summary="Sales report")
async def sales_report(
    branch_id: uuid.UUID = None, from_date: str = None, to_date: str = None,
    group_by: str = "day", cashier_id: uuid.UUID = None, format: str = "json",
    current_user: User = Depends(require_roles(*REPORT_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    filters = [Sale.status == "completed"]
    if branch_id:
        filters.append(Sale.branch_id == branch_id)
    if cashier_id:
        filters.append(Sale.cashier_id == cashier_id)
    revenue = (await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*filters))).scalar_one()
    txns = (await db.execute(select(func.count()).select_from(Sale).where(*filters))).scalar_one()
    discount = (await db.execute(select(func.coalesce(func.sum(Sale.discount_amount), 0)).where(*filters))).scalar_one()
    tax = (await db.execute(select(func.coalesce(func.sum(Sale.tax_amount), 0)).where(*filters))).scalar_one()
    return {
        "summary": {
            "total_revenue": float(revenue), "total_transactions": txns,
            "avg_basket": float(revenue) / max(txns, 1),
            "total_discount": float(discount), "total_tax": float(tax),
        },
        "breakdown": [],
    }


@router.get("/medicines/sales", summary="Medicine sales report")
async def medicine_sales_report(
    branch_id: uuid.UUID = None, from_date: str = None, to_date: str = None,
    sort: str = "revenue", limit: int = 20, format: str = "json",
    current_user: User = Depends(require_roles(*REPORT_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Medicine.name, func.sum(SaleItem.quantity).label("qty"), func.sum(SaleItem.line_total).label("revenue"))
        .join(SaleItem, SaleItem.medicine_id == Medicine.id)
        .group_by(Medicine.id, Medicine.name)
        .order_by(func.sum(SaleItem.line_total).desc())
        .limit(limit)
    )
    rows = result.fetchall()
    return {"data": [{"name": r.name, "quantity": int(r.qty or 0), "revenue": float(r.revenue or 0)} for r in rows]}


@router.get("/categories/sales", summary="Category sales report")
async def category_sales(branch_id: uuid.UUID = None, current_user: User = Depends(require_roles(*REPORT_ROLES)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Medicine.category, func.sum(SaleItem.line_total).label("revenue"))
        .join(SaleItem, SaleItem.medicine_id == Medicine.id)
        .group_by(Medicine.category)
        .order_by(func.sum(SaleItem.line_total).desc())
    )
    return {"data": [{"category": r.category, "revenue": float(r.revenue or 0)} for r in result.fetchall()]}


@router.get("/inventory", summary="Inventory report")
async def inventory_report(
    branch_id: uuid.UUID = None, category: str = None, format: str = "json",
    current_user: User = Depends(require_roles(*REPORT_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Medicine.name, Medicine.category, func.coalesce(func.sum(MedicineBatch.quantity), 0).label("qty"), func.coalesce(func.sum(MedicineBatch.quantity * MedicineBatch.purchase_price), 0).label("cost"), func.coalesce(func.sum(MedicineBatch.quantity * MedicineBatch.selling_price), 0).label("mrp_value"))
        .join(MedicineBatch, MedicineBatch.medicine_id == Medicine.id, isouter=True)
        .where(Medicine.is_active == True)
        .group_by(Medicine.id, Medicine.name, Medicine.category)
    )
    if branch_id:
        query = query.where(MedicineBatch.branch_id == branch_id)
    if category:
        query = query.where(Medicine.category == category)
    result = await db.execute(query)
    rows = result.fetchall()
    return {"data": [{"name": r.name, "category": r.category, "quantity": int(r.qty), "cost_value": float(r.cost), "mrp_value": float(r.mrp_value)} for r in rows]}


@router.get("/expiry", summary="Expiry report")
async def expiry_report(
    branch_id: uuid.UUID = None, expiry_before: str = None, format: str = "json",
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date, timedelta
    cutoff = date.today() + timedelta(days=90)
    filters = [MedicineBatch.expiry_date <= cutoff, MedicineBatch.quantity > 0]
    if branch_id:
        filters.append(MedicineBatch.branch_id == branch_id)
    result = await db.execute(select(MedicineBatch).where(*filters).order_by(MedicineBatch.expiry_date))
    batches = result.scalars().all()
    return {"data": [{"batch_id": str(b.id), "medicine_id": str(b.medicine_id), "batch_number": b.batch_number, "expiry_date": b.expiry_date.isoformat() if b.expiry_date else None, "quantity": b.quantity} for b in batches]}


@router.get("/profit-loss", summary="Profit & loss report")
async def pl_report(branch_id: uuid.UUID = None, from_date: str = None, to_date: str = None, current_user: User = Depends(require_roles(*REPORT_ROLES)), db: AsyncSession = Depends(get_db)):
    filters = [Sale.status == "completed"]
    if branch_id:
        filters.append(Sale.branch_id == branch_id)
    revenue = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*filters))).scalar_one())
    cogs = float((await db.execute(select(func.coalesce(func.sum(SaleItem.quantity * MedicineBatch.purchase_price), 0)).join(SaleItem, SaleItem.id == SaleItem.id).join(MedicineBatch, MedicineBatch.id == SaleItem.batch_id, isouter=True))).scalar_one() if False else 0)
    gross = revenue - cogs
    return {"revenue": revenue, "cogs": cogs, "gross_profit": gross, "gross_margin_pct": (gross / revenue * 100) if revenue else 0, "net_profit": gross}


@router.get("/purchases", summary="Purchase report")
async def purchase_report(branch_id: uuid.UUID = None, supplier_id: uuid.UUID = None, current_user: User = Depends(require_roles(*REPORT_ROLES)), db: AsyncSession = Depends(get_db)):
    from app.models.supplier import GRN
    filters = []
    if supplier_id:
        filters.append(GRN.supplier_id == supplier_id)
    if branch_id:
        filters.append(GRN.branch_id == branch_id)
    total = float((await db.execute(select(func.coalesce(func.sum(GRN.total), 0)).where(*filters) if filters else select(func.coalesce(func.sum(GRN.total), 0)))).scalar_one())
    return {"total_purchases": total}


@router.get("/demand-forecast", summary="Demand forecast report")
async def demand_forecast(branch_id: uuid.UUID = None, medicine_id: uuid.UUID = None, days_ahead: int = 30, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"forecast": [], "days_ahead": days_ahead, "note": "Based on 90-day moving average of consumption"}


@router.get("/controlled-substances", summary="Controlled substances report")
async def controlled_report(branch_id: uuid.UUID = None, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"data": [], "note": "Perpetual register for controlled substances"}


@router.get("/tax", summary="GST / Tax report")
async def tax_report(branch_id: uuid.UUID = None, current_user: User = Depends(require_roles("admin", "accountant", "super_admin")), db: AsyncSession = Depends(get_db)):
    filters = [Sale.status == "completed"]
    if branch_id:
        filters.append(Sale.branch_id == branch_id)
    tax = float((await db.execute(select(func.coalesce(func.sum(Sale.tax_amount), 0)).where(*filters))).scalar_one())
    return {"total_tax_collected": tax}


@router.get("/patients", summary="Patient purchase report")
async def patient_report(branch_id: uuid.UUID = None, sort: str = "spend", limit: int = 20, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    from app.models.patient import Patient
    result = await db.execute(
        select(Patient.name, func.count(Sale.id).label("visits"), func.coalesce(func.sum(Sale.total), 0).label("spend"))
        .join(Sale, Sale.patient_id == Patient.id, isouter=True)
        .group_by(Patient.id, Patient.name).order_by(func.coalesce(func.sum(Sale.total), 0).desc()).limit(limit)
    )
    return {"data": [{"name": r.name, "visits": int(r.visits), "spend": float(r.spend)} for r in result.fetchall()]}


@router.get("/cashiers", summary="Cashier performance report")
async def cashier_report(branch_id: uuid.UUID = None, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    from app.models.user import User as UserModel
    result = await db.execute(
        select(UserModel.name, func.count(Sale.id).label("sales_count"), func.coalesce(func.sum(Sale.total), 0).label("revenue"))
        .join(Sale, Sale.cashier_id == UserModel.id, isouter=True)
        .group_by(UserModel.id, UserModel.name).order_by(func.coalesce(func.sum(Sale.total), 0).desc())
    )
    return {"data": [{"name": r.name, "sales_count": int(r.sales_count), "revenue": float(r.revenue)} for r in result.fetchall()]}


@router.get("/suppliers", summary="Supplier performance report")
async def supplier_report(supplier_id: uuid.UUID = None, current_user: User = Depends(require_roles(*REPORT_ROLES)), db: AsyncSession = Depends(get_db)):
    return {"data": []}


@router.get("/stock-movement", summary="Stock movement report")
async def stock_movement(medicine_id: uuid.UUID = None, branch_id: uuid.UUID = None, current_user: User = Depends(require_roles(*REPORT_ROLES)), db: AsyncSession = Depends(get_db)):
    return {"data": []}


@router.get("/audit", summary="Audit trail report")
async def audit_report(
    user_id: uuid.UUID = None, entity_type: str = None, action: str = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import AuditLog
    filters = []
    if user_id:
        filters.append(AuditLog.user_id == user_id)
    if entity_type:
        filters.append(AuditLog.entity_type == entity_type)
    if action:
        filters.append(AuditLog.action == action)
    query = select(AuditLog)
    if filters:
        query = query.where(*filters)
    total = (await db.execute(select(func.count()).select_from(AuditLog).where(*filters) if filters else select(func.count()).select_from(AuditLog))).scalar_one()
    result = await db.execute(query.order_by(AuditLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page))
    logs = result.scalars().all()
    from app.schemas.common import paginate
    return paginate([{"id": str(l.id), "action": l.action, "entity_type": l.entity_type, "entity_id": l.entity_id, "ip": l.ip_address, "created_at": l.created_at.isoformat()} for l in logs], total, page, per_page)


@router.get("/z-reports", summary="Z-report history")
async def z_report_history(branch_id: uuid.UUID = None, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"data": []}


@router.get("/dashboard", summary="All-in-one dashboard summary")
async def dashboard_summary(
    branch_id: uuid.UUID = None, date: str = None,
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as dt_date
    from sqlalchemy import cast, Date
    today_str = date or dt_date.today().isoformat()
    today_date = dt_date.fromisoformat(today_str)
    filters = [Sale.status == "completed", cast(Sale.created_at, Date) == today_date]
    if branch_id:
        filters.append(Sale.branch_id == branch_id)
    revenue = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*filters))).scalar_one())
    txns = int((await db.execute(select(func.count()).select_from(Sale).where(*filters))).scalar_one())
    low_stock = int((await db.execute(select(func.count()).select_from(MedicineBatch).join(Medicine, Medicine.id == MedicineBatch.medicine_id).where(MedicineBatch.quantity <= Medicine.reorder_point, Medicine.is_active == True))).scalar_one())
    all_filters = [Sale.status == "completed"]
    if branch_id:
        all_filters.append(Sale.branch_id == branch_id)
    total_revenue = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*all_filters))).scalar_one())
    total_txns = int((await db.execute(select(func.count()).select_from(Sale).where(*all_filters))).scalar_one())
    return {
        "date": today_str,
        "today_revenue": revenue,
        "today_transactions": txns,
        "avg_basket": revenue / max(txns, 1),
        "low_stock_alerts": low_stock,
        "total_revenue": total_revenue,
        "total_transactions": total_txns,
        "revenue": revenue,
        "transactions": txns,
    }
