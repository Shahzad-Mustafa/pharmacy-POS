import uuid
import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date

from app.database import get_db
from app.dependencies import require_roles
from app.models.user import User
from app.models.sale import Sale, SaleItem
from app.models.medicine import Medicine
from app.models.inventory import MedicineBatch
from app.models.patient import Patient
from app.models.prescription import Prescription

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

DASH_ROLES = ("admin", "manager", "pharmacist", "super_admin")


@router.get("/overview", summary="Get dashboard overview")
async def dashboard_overview(
    branch_id: uuid.UUID = None,
    period: str = Query("month", description="day|week|month|year"),
    current_user: User = Depends(require_roles(*DASH_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date, timedelta
    today = date.today()
    if period == "day":
        start = today
    elif period == "week":
        start = today - timedelta(days=7)
    elif period == "year":
        start = today.replace(month=1, day=1)
    else:
        start = today.replace(day=1)

    filters = [Sale.status == "completed", cast(Sale.created_at, Date) >= start, cast(Sale.created_at, Date) <= today]
    if branch_id:
        filters.append(Sale.branch_id == branch_id)

    revenue = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*filters))).scalar_one())
    txns = int((await db.execute(select(func.count()).select_from(Sale).where(*filters))).scalar_one())
    days = max((today - start).days, 1)
    patients_count = int((await db.execute(select(func.count()).select_from(Patient).where(Patient.is_active == True))).scalar_one())
    prescriptions_count = int((await db.execute(select(func.count()).select_from(Prescription))).scalar_one())

    cash = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*filters, Sale.payment_method == "cash"))).scalar_one())
    card = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*filters, Sale.payment_method == "card"))).scalar_one())
    credit = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*filters, Sale.payment_method == "credit"))).scalar_one())

    rx_sales = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*filters, Sale.sale_type == "retail"))).scalar_one())
    hosp_sales = float((await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(*filters, Sale.sale_type == "hospital"))).scalar_one())

    return {
        "period_revenue": revenue,
        "period_transactions": txns,
        "period_patients": patients_count,
        "period_prescriptions": prescriptions_count,
        "avg_daily_revenue": revenue / days,
        "revenue_growth_pct": None,
        "rx_vs_otc_ratio": {"rx": rx_sales, "otc": max(revenue - rx_sales, 0)},
        "retail_vs_hospital": {"retail": rx_sales, "hospital": hosp_sales},
        "payment_breakdown": {"cash": cash, "card": card, "credit": credit, "insurance": 0.0},
    }


@router.get("/alerts", summary="Get dashboard alerts")
async def dashboard_alerts(
    branch_id: uuid.UUID = None,
    current_user: User = Depends(require_roles(*DASH_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date, timedelta
    today = date.today()
    cutoff_7 = today + timedelta(days=7)
    cutoff_30 = today + timedelta(days=30)

    low_stock = int((await db.execute(
        select(func.count()).select_from(MedicineBatch)
        .join(Medicine, Medicine.id == MedicineBatch.medicine_id)
        .where(MedicineBatch.quantity <= Medicine.reorder_point, Medicine.is_active == True)
    )).scalar_one())

    from sqlalchemy import text
    oos_result = await db.execute(
        select(func.count()).select_from(
            select(Medicine.id)
            .join(MedicineBatch, MedicineBatch.medicine_id == Medicine.id, isouter=True)
            .where(Medicine.is_active == True)
            .group_by(Medicine.id)
            .having(func.coalesce(func.sum(MedicineBatch.quantity), 0) == 0)
            .subquery()
        )
    )
    out_of_stock = int(oos_result.scalar_one())

    exp_7 = int((await db.execute(
        select(func.count()).select_from(MedicineBatch)
        .where(MedicineBatch.expiry_date <= cutoff_7, MedicineBatch.quantity > 0)
    )).scalar_one())

    exp_30 = int((await db.execute(
        select(func.count()).select_from(MedicineBatch)
        .where(MedicineBatch.expiry_date <= cutoff_30, MedicineBatch.quantity > 0)
    )).scalar_one())

    pending_rx = int((await db.execute(
        select(func.count()).select_from(Prescription).where(Prescription.status == "pending")
    )).scalar_one())

    return {
        "low_stock_count": low_stock,
        "expiring_soon_count": exp_30,
        "out_of_stock_count": out_of_stock,
        "pending_prescriptions": pending_rx,
        "overdue_payables": 0,
        "expiring_in_7_days": exp_7,
        "expiring_in_30_days": exp_30,
    }


@router.get("/top-medicines", summary="Get top-selling medicines")
async def top_medicines(
    branch_id: uuid.UUID = None,
    limit: int = Query(10, ge=1, le=50),
    period: str = Query("month"),
    current_user: User = Depends(require_roles(*DASH_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date, timedelta
    today = date.today()
    if period == "week":
        start = today - timedelta(days=7)
    elif period == "year":
        start = today.replace(month=1, day=1)
    else:
        start = today.replace(day=1)

    filters = [Sale.status == "completed", cast(Sale.created_at, Date) >= start]
    if branch_id:
        filters.append(Sale.branch_id == branch_id)

    result = await db.execute(
        select(
            Medicine.id.label("medicine_id"),
            Medicine.name.label("medicine_name"),
            Medicine.category,
            func.sum(SaleItem.quantity).label("units_sold"),
            func.sum(SaleItem.line_total).label("revenue"),
        )
        .join(SaleItem, SaleItem.medicine_id == Medicine.id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(*filters)
        .group_by(Medicine.id, Medicine.name, Medicine.category)
        .order_by(func.sum(SaleItem.line_total).desc())
        .limit(limit)
    )
    rows = result.fetchall()
    return [
        {
            "medicine_id": str(r.medicine_id),
            "medicine_name": r.medicine_name,
            "category": r.category,
            "units_sold": int(r.units_sold or 0),
            "quantity_sold": int(r.units_sold or 0),
            "revenue": float(r.revenue or 0),
            "rank": idx + 1,
        }
        for idx, r in enumerate(rows)
    ]


@router.get("/revenue-trend", summary="Get revenue trend")
async def revenue_trend(
    branch_id: uuid.UUID = None,
    days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(require_roles(*DASH_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date, timedelta
    today = date.today()
    start = today - timedelta(days=days)

    result = await db.execute(
        select(
            cast(Sale.created_at, Date).label("sale_date"),
            func.sum(Sale.total).label("revenue"),
            func.count(Sale.id).label("transactions"),
        )
        .where(Sale.status == "completed", cast(Sale.created_at, Date) >= start)
        .group_by(cast(Sale.created_at, Date))
        .order_by(cast(Sale.created_at, Date))
    )
    rows = result.fetchall()
    date_map = {str(r.sale_date): r for r in rows}

    trend = []
    for i in range(days + 1):
        d = start + timedelta(days=i)
        ds = str(d)
        row = date_map.get(ds)
        trend.append({
            "date": ds,
            "revenue": float(row.revenue) if row else 0.0,
            "transactions": int(row.transactions) if row else 0,
            "refunds": 0,
        })
    return trend
