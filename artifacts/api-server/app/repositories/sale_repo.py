import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.sale import Sale, SaleItem, SalePayment
from app.repositories.base import BaseRepository


class SaleRepository(BaseRepository[Sale]):
    def __init__(self, db: AsyncSession):
        super().__init__(Sale, db)

    async def get_with_items(self, sale_id: uuid.UUID) -> Optional[Sale]:
        result = await self.db.execute(
            select(Sale)
            .options(selectinload(Sale.items), selectinload(Sale.payments))
            .where(Sale.id == sale_id)
        )
        return result.scalar_one_or_none()

    async def get_next_invoice_number(self, branch_id: uuid.UUID) -> str:
        from datetime import date
        today = date.today()
        prefix = f"INV-{today.strftime('%Y%m%d')}"
        result = await self.db.execute(
            select(func.count()).select_from(Sale)
            .where(Sale.invoice_number.like(f"{prefix}%"))
        )
        count = result.scalar_one() + 1
        return f"{prefix}{count:04d}"

    async def list_sales(self, branch_id: uuid.UUID = None, cashier_id: uuid.UUID = None,
                          patient_id: uuid.UUID = None, sale_type: str = None,
                          payment_method: str = None, status: str = None,
                          date_from: str = None, date_to: str = None,
                          page: int = 1, per_page: int = 20) -> Tuple[List[Sale], int]:
        filters = []
        if branch_id:
            filters.append(Sale.branch_id == branch_id)
        if cashier_id:
            filters.append(Sale.cashier_id == cashier_id)
        if patient_id:
            filters.append(Sale.patient_id == patient_id)
        if sale_type:
            filters.append(Sale.sale_type == sale_type)
        if payment_method:
            filters.append(Sale.payment_method == payment_method)
        if status:
            filters.append(Sale.status == status)
        if date_from:
            from sqlalchemy import cast, Date as DateType
            filters.append(cast(Sale.created_at, DateType) >= date_from)
        if date_to:
            from sqlalchemy import cast, Date as DateType
            filters.append(cast(Sale.created_at, DateType) <= date_to)
        query = select(Sale)
        count_q = select(func.count()).select_from(Sale)
        if filters:
            query = query.where(*filters)
            count_q = count_q.where(*filters)
        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(
            query.options(selectinload(Sale.items))
            .order_by(Sale.created_at.desc())
            .offset((page - 1) * per_page).limit(per_page)
        )
        return list(result.scalars().all()), total

    async def get_daily_summary(self, branch_id: uuid.UUID, date_str: str, cashier_id: uuid.UUID = None) -> dict:
        from sqlalchemy import cast, Date, text
        filters = [
            Sale.branch_id == branch_id,
            Sale.status == "completed",
            func.date(Sale.created_at) == date_str,
        ]
        if cashier_id:
            filters.append(Sale.cashier_id == cashier_id)
        result = await self.db.execute(
            select(
                func.count(Sale.id).label("transactions"),
                func.coalesce(func.sum(Sale.total), 0).label("revenue"),
                func.coalesce(func.sum(Sale.tax_amount), 0).label("tax"),
                func.coalesce(func.sum(Sale.discount_amount), 0).label("discounts"),
            ).where(*filters)
        )
        row = result.fetchone()
        return {
            "transactions": row.transactions,
            "revenue": float(row.revenue or 0),
            "tax": float(row.tax or 0),
            "discounts": float(row.discounts or 0),
        }
