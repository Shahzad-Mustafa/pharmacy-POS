import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.supplier import Supplier, PurchaseOrder, GRN, SupplierPayment, SupplierReturn
from app.repositories.base import BaseRepository


class SupplierRepository(BaseRepository[Supplier]):
    def __init__(self, db: AsyncSession):
        super().__init__(Supplier, db)

    async def list_suppliers(self, is_active: bool = None, page: int = 1, per_page: int = 20):
        filters = []
        if is_active is not None:
            filters.append(Supplier.is_active == is_active)
        query = select(Supplier)
        count_q = select(func.count()).select_from(Supplier)
        if filters:
            query = query.where(*filters)
            count_q = count_q.where(*filters)
        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset((page - 1) * per_page).limit(per_page))
        return list(result.scalars().all()), total

    async def get_next_po_number(self) -> str:
        from datetime import date
        today = date.today()
        prefix = f"PO-{today.strftime('%Y%m%d')}"
        result = await self.db.execute(
            select(func.count()).select_from(PurchaseOrder)
            .where(PurchaseOrder.po_number.like(f"{prefix}%"))
        )
        return f"{prefix}{result.scalar_one() + 1:04d}"

    async def get_next_grn_number(self) -> str:
        from datetime import date
        today = date.today()
        prefix = f"GRN-{today.strftime('%Y%m%d')}"
        result = await self.db.execute(
            select(func.count()).select_from(GRN)
            .where(GRN.grn_number.like(f"{prefix}%"))
        )
        return f"{prefix}{result.scalar_one() + 1:04d}"

    async def list_pos(self, supplier_id: uuid.UUID = None, branch_id: uuid.UUID = None,
                        status: str = None, page: int = 1, per_page: int = 20):
        filters = []
        if supplier_id:
            filters.append(PurchaseOrder.supplier_id == supplier_id)
        if branch_id:
            filters.append(PurchaseOrder.branch_id == branch_id)
        if status:
            filters.append(PurchaseOrder.status == status)
        query = select(PurchaseOrder)
        count_q = select(func.count()).select_from(PurchaseOrder)
        if filters:
            query = query.where(*filters)
            count_q = count_q.where(*filters)
        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(
            query.options(selectinload(PurchaseOrder.items))
            .offset((page - 1) * per_page).limit(per_page)
        )
        return list(result.scalars().all()), total

    async def list_grns(self, supplier_id: uuid.UUID = None, branch_id: uuid.UUID = None,
                         po_id: uuid.UUID = None, page: int = 1, per_page: int = 20):
        filters = []
        if supplier_id:
            filters.append(GRN.supplier_id == supplier_id)
        if branch_id:
            filters.append(GRN.branch_id == branch_id)
        if po_id:
            filters.append(GRN.po_id == po_id)
        query = select(GRN)
        count_q = select(func.count()).select_from(GRN)
        if filters:
            query = query.where(*filters)
            count_q = count_q.where(*filters)
        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(
            query.options(selectinload(GRN.items))
            .offset((page - 1) * per_page).limit(per_page)
        )
        return list(result.scalars().all()), total
