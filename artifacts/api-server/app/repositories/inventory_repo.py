import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.inventory import MedicineBatch, StockAdjustment, StockTransfer, StockTransferItem, StockCount, StockCountItem
from app.repositories.base import BaseRepository
from datetime import date


class BatchRepository(BaseRepository[MedicineBatch]):
    def __init__(self, db: AsyncSession):
        super().__init__(MedicineBatch, db)

    async def get_by_medicine_branch(self, medicine_id: uuid.UUID, branch_id: uuid.UUID) -> List[MedicineBatch]:
        result = await self.db.execute(
            select(MedicineBatch)
            .where(
                MedicineBatch.medicine_id == medicine_id,
                MedicineBatch.branch_id == branch_id,
                MedicineBatch.quantity > 0,
                MedicineBatch.is_active == True,
            )
            .order_by(MedicineBatch.expiry_date.asc().nulls_last())
        )
        return list(result.scalars().all())

    async def get_total_qty(self, medicine_id: uuid.UUID, branch_id: uuid.UUID = None) -> int:
        query = select(func.coalesce(func.sum(MedicineBatch.quantity), 0)).where(
            MedicineBatch.medicine_id == medicine_id,
            MedicineBatch.is_active == True,
        )
        if branch_id:
            query = query.where(MedicineBatch.branch_id == branch_id)
        result = await self.db.execute(query)
        return result.scalar_one()

    async def list_batches(self, medicine_id: uuid.UUID = None, branch_id: uuid.UUID = None,
                           supplier_id: uuid.UUID = None, has_stock: bool = None,
                           page: int = 1, per_page: int = 20) -> Tuple[List[MedicineBatch], int]:
        filters = [MedicineBatch.is_active == True]
        if medicine_id:
            filters.append(MedicineBatch.medicine_id == medicine_id)
        if branch_id:
            filters.append(MedicineBatch.branch_id == branch_id)
        if supplier_id:
            filters.append(MedicineBatch.supplier_id == supplier_id)
        if has_stock is True:
            filters.append(MedicineBatch.quantity > 0)
        query = select(MedicineBatch).where(*filters)
        count_q = select(func.count()).select_from(MedicineBatch).where(*filters)
        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset((page - 1) * per_page).limit(per_page))
        return list(result.scalars().all()), total

    async def get_fefo_batches(self, medicine_id: uuid.UUID, branch_id: uuid.UUID, quantity_needed: int) -> List[MedicineBatch]:
        result = await self.db.execute(
            select(MedicineBatch)
            .where(
                MedicineBatch.medicine_id == medicine_id,
                MedicineBatch.branch_id == branch_id,
                MedicineBatch.quantity > 0,
                MedicineBatch.is_active == True,
            )
            .order_by(MedicineBatch.expiry_date.asc().nulls_last())
        )
        batches = list(result.scalars().all())
        selected, remaining = [], quantity_needed
        for b in batches:
            if remaining <= 0:
                break
            selected.append(b)
            remaining -= b.quantity
        return selected


class StockAdjustmentRepository(BaseRepository[StockAdjustment]):
    def __init__(self, db: AsyncSession):
        super().__init__(StockAdjustment, db)

    async def list_adjustments(self, branch_id: uuid.UUID = None, batch_id: uuid.UUID = None,
                                adj_type: str = None, page: int = 1, per_page: int = 20):
        filters = []
        if branch_id:
            filters.append(StockAdjustment.branch_id == branch_id)
        if batch_id:
            filters.append(StockAdjustment.batch_id == batch_id)
        if adj_type:
            filters.append(StockAdjustment.adjustment_type == adj_type)
        query = select(StockAdjustment)
        count_q = select(func.count()).select_from(StockAdjustment)
        if filters:
            query = query.where(*filters)
            count_q = count_q.where(*filters)
        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset((page - 1) * per_page).limit(per_page))
        return list(result.scalars().all()), total
