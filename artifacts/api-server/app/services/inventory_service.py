import logging
import uuid
from datetime import date
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.exceptions import NotFoundError, BadRequestError
from app.models.inventory import MedicineBatch, StockAdjustment, StockTransfer, StockTransferItem, StockCount, StockCountItem
from app.repositories.inventory_repo import BatchRepository, StockAdjustmentRepository

logger = logging.getLogger(__name__)


class InventoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.batch_repo = BatchRepository(db)
        self.adj_repo = StockAdjustmentRepository(db)

    async def create_batch(self, data: dict) -> MedicineBatch:
        batch = MedicineBatch(**data)
        return await self.batch_repo.create(batch)

    async def create_adjustment(self, data: dict, user_id: uuid.UUID) -> StockAdjustment:
        batch = await self.batch_repo.get(data["batch_id"])
        if not batch:
            raise NotFoundError("Batch", str(data["batch_id"]))
        new_qty = batch.quantity + data["quantity_change"]
        if new_qty < 0:
            raise BadRequestError("WOULD_MAKE_NEGATIVE", f"Adjustment would make quantity negative ({new_qty})")
        batch.quantity = new_qty
        adj = StockAdjustment(
            batch_id=data["batch_id"],
            branch_id=data["branch_id"],
            adjustment_type=data["adjustment_type"],
            quantity_change=data["quantity_change"],
            reason=data.get("reason"),
            reference=data.get("reference"),
            witnessed_by_id=data.get("witnessed_by"),
            created_by_id=user_id,
        )
        await self.db.flush()
        self.db.add(adj)
        await self.db.flush()
        await self.db.refresh(adj)
        return adj

    async def create_transfer(self, data: dict, user_id: uuid.UUID) -> StockTransfer:
        if data["from_branch_id"] == data["to_branch_id"]:
            raise BadRequestError("SAME_BRANCH", "Source and destination branches must differ")
        transfer = StockTransfer(
            from_branch_id=data["from_branch_id"],
            to_branch_id=data["to_branch_id"],
            notes=data.get("notes"),
            transfer_date=data.get("transfer_date", date.today()),
            created_by_id=user_id,
        )
        self.db.add(transfer)
        await self.db.flush()
        for item in data["items"]:
            src_batch = await self.batch_repo.get(item["batch_id"])
            if not src_batch:
                raise NotFoundError("Batch", str(item["batch_id"]))
            if src_batch.quantity < item["quantity"]:
                raise BadRequestError("INSUFFICIENT_STOCK_AT_SOURCE", f"Only {src_batch.quantity} units available")
            src_batch.quantity -= item["quantity"]
            dest_batch = MedicineBatch(
                medicine_id=src_batch.medicine_id,
                branch_id=data["to_branch_id"],
                batch_number=src_batch.batch_number,
                expiry_date=src_batch.expiry_date,
                manufacturing_date=src_batch.manufacturing_date,
                quantity=item["quantity"],
                purchase_price=src_batch.purchase_price,
                selling_price=src_batch.selling_price,
                supplier_id=src_batch.supplier_id,
            )
            self.db.add(dest_batch)
            t_item = StockTransferItem(transfer_id=transfer.id, batch_id=src_batch.id, quantity=item["quantity"])
            self.db.add(t_item)
        await self.db.flush()
        await self.db.refresh(transfer)
        return transfer

    async def create_stock_count(self, data: dict, user_id: uuid.UUID) -> StockCount:
        count = StockCount(
            branch_id=data["branch_id"],
            count_date=data["count_date"],
            notes=data.get("notes"),
            created_by_id=user_id,
        )
        self.db.add(count)
        await self.db.flush()
        variances = []
        for item in data["items"]:
            batch = await self.batch_repo.get(item["batch_id"])
            if not batch:
                continue
            variance = item["physical_qty"] - batch.quantity
            sci = StockCountItem(
                stock_count_id=count.id,
                batch_id=item["batch_id"],
                system_qty=batch.quantity,
                physical_qty=item["physical_qty"],
                variance=variance,
            )
            self.db.add(sci)
            variances.append({"batch_id": str(item["batch_id"]), "system_qty": batch.quantity, "physical_qty": item["physical_qty"], "variance": variance})
        await self.db.flush()
        await self.db.refresh(count)
        return count, variances

    async def get_stock_valuation(self, branch_id: uuid.UUID = None) -> dict:
        query = (
            select(
                func.coalesce(func.sum(MedicineBatch.quantity * MedicineBatch.purchase_price), 0).label("total_cost"),
                func.coalesce(func.sum(MedicineBatch.quantity * MedicineBatch.selling_price), 0).label("total_mrp"),
                func.coalesce(func.sum(MedicineBatch.quantity), 0).label("total_units"),
            )
            .where(MedicineBatch.is_active == True, MedicineBatch.quantity > 0)
        )
        if branch_id:
            query = query.where(MedicineBatch.branch_id == branch_id)
        result = await self.db.execute(query)
        row = result.fetchone()
        cost = float(row.total_cost or 0)
        mrp = float(row.total_mrp or 0)
        units = int(row.total_units or 0)
        return {
            "total_cost_value": cost,
            "total_retail_value": mrp,
            "total_mrp_value": mrp,
            "total_units": units,
            "potential_profit": mrp - cost,
        }
