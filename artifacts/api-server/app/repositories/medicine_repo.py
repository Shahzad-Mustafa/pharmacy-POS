import uuid
from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.medicine import Medicine, MedicinePriceHistory
from app.models.inventory import MedicineBatch
from app.repositories.base import BaseRepository
from datetime import date, timedelta


class MedicineRepository(BaseRepository[Medicine]):
    def __init__(self, db: AsyncSession):
        super().__init__(Medicine, db)

    async def search(self, q: str = None, barcode: str = None, generic: str = None,
                     category: str = None, is_active: bool = True, page: int = 1,
                     per_page: int = 20, in_stock_only: bool = False,
                     requires_prescription: bool = None) -> Tuple[List[Medicine], int]:
        query = select(Medicine)
        count_q = select(func.count()).select_from(Medicine)
        filters = []
        if is_active is not None:
            filters.append(Medicine.is_active == is_active)
        if q:
            like = f"%{q}%"
            filters.append(or_(
                Medicine.name.ilike(like),
                Medicine.generic_name.ilike(like),
                Medicine.brand.ilike(like),
                Medicine.composition.ilike(like),
            ))
        if barcode:
            filters.append(Medicine.barcode == barcode)
        if generic:
            filters.append(Medicine.generic_name.ilike(f"%{generic}%"))
        if category:
            filters.append(Medicine.category == category)
        if requires_prescription is not None:
            filters.append(Medicine.requires_prescription == requires_prescription)
        if filters:
            query = query.where(*filters)
            count_q = count_q.where(*filters)
        total = (await self.db.execute(count_q)).scalar_one()
        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def get_by_barcode(self, barcode: str) -> Optional[Medicine]:
        result = await self.db.execute(select(Medicine).where(Medicine.barcode == barcode))
        return result.scalar_one_or_none()

    async def get_categories(self) -> List[dict]:
        from sqlalchemy import func
        result = await self.db.execute(
            select(Medicine.category, func.count(Medicine.id).label("count"))
            .where(Medicine.category.isnot(None), Medicine.is_active == True)
            .group_by(Medicine.category)
            .order_by(Medicine.category)
        )
        return [{"name": r[0], "count": r[1]} for r in result.fetchall()]

    async def get_low_stock(self, branch_id: uuid.UUID = None) -> List[dict]:
        query = (
            select(Medicine, func.coalesce(func.sum(MedicineBatch.quantity), 0).label("total_qty"))
            .join(MedicineBatch, MedicineBatch.medicine_id == Medicine.id, isouter=True)
            .where(Medicine.is_active == True)
            .group_by(Medicine.id)
            .having(func.coalesce(func.sum(MedicineBatch.quantity), 0) <= Medicine.reorder_point)
        )
        if branch_id:
            query = query.where(MedicineBatch.branch_id == branch_id)
        result = await self.db.execute(query)
        return result.fetchall()

    async def get_expiring_soon(self, days: int = 90, branch_id: uuid.UUID = None) -> List[MedicineBatch]:
        cutoff = date.today() + timedelta(days=days)
        query = (
            select(MedicineBatch)
            .where(
                MedicineBatch.expiry_date <= cutoff,
                MedicineBatch.expiry_date >= date.today(),
                MedicineBatch.quantity > 0,
            )
        )
        if branch_id:
            query = query.where(MedicineBatch.branch_id == branch_id)
        query = query.order_by(MedicineBatch.expiry_date)
        result = await self.db.execute(query)
        return list(result.scalars().all())
