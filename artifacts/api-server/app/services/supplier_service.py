import logging
import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.exceptions import NotFoundError, BadRequestError, ConflictError
from app.models.supplier import Supplier, PurchaseOrder, POItem, GRN, GRNItem
from app.models.inventory import MedicineBatch
from app.repositories.supplier_repo import SupplierRepository

logger = logging.getLogger(__name__)


class SupplierService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SupplierRepository(db)

    async def create_supplier(self, data: dict) -> Supplier:
        supplier = Supplier(**data)
        return await self.repo.create(supplier)

    async def deactivate(self, supplier_id: uuid.UUID) -> None:
        supplier = await self.repo.get(supplier_id)
        if not supplier:
            raise NotFoundError("Supplier", str(supplier_id))
        result = await self.db.execute(
            select(PurchaseOrder).where(
                PurchaseOrder.supplier_id == supplier_id,
                PurchaseOrder.status.in_(["draft", "sent", "partial"]),
            )
        )
        if result.scalar_one_or_none():
            raise BadRequestError("OPEN_POS_EXIST", "Cannot deactivate supplier with open purchase orders")
        supplier.is_active = False
        await self.db.flush()

    async def create_po(self, data: dict, user_id: uuid.UUID) -> PurchaseOrder:
        po_number = data.get("po_number") or await self.repo.get_next_po_number()
        total = sum(item["quantity"] * item["unit_price"] for item in data["items"])
        po = PurchaseOrder(
            po_number=po_number,
            supplier_id=data["supplier_id"],
            branch_id=data["branch_id"],
            status="draft",
            order_date=data.get("order_date", date.today()),
            expected_date=data.get("expected_date"),
            discount=data.get("discount", 0),
            tax=data.get("tax", 0),
            total=total,
            notes=data.get("notes"),
            created_by_id=user_id,
        )
        self.db.add(po)
        await self.db.flush()
        for item in data["items"]:
            poi = POItem(po_id=po.id, medicine_id=item["medicine_id"], quantity=item["quantity"], unit_price=item["unit_price"])
            self.db.add(poi)
        await self.db.flush()
        await self.db.refresh(po)
        return po

    async def create_grn(self, data: dict, user_id: uuid.UUID) -> GRN:
        grn_number = data.get("grn_number") or await self.repo.get_next_grn_number()
        total = sum(item["quantity_received"] * item["purchase_price"] for item in data["items"])
        grn = GRN(
            grn_number=grn_number,
            po_id=data.get("po_id"),
            supplier_id=data["supplier_id"],
            branch_id=data["branch_id"],
            received_date=data.get("received_date", date.today()),
            supplier_invoice_number=data.get("supplier_invoice_number"),
            received_by_id=data.get("received_by") or user_id,
            total=total,
            notes=data.get("notes"),
        )
        self.db.add(grn)
        await self.db.flush()
        for item in data["items"]:
            gi = GRNItem(
                grn_id=grn.id,
                medicine_id=item["medicine_id"],
                batch_number=item["batch_number"],
                expiry_date=item.get("expiry_date"),
                manufacturing_date=item.get("manufacturing_date"),
                quantity_ordered=item.get("quantity_ordered", 0),
                quantity_received=item["quantity_received"],
                free_qty=item.get("free_qty", 0),
                purchase_price=item["purchase_price"],
                selling_price=item["selling_price"],
            )
            self.db.add(gi)
            total_qty = item["quantity_received"] + item.get("free_qty", 0)
            batch = MedicineBatch(
                medicine_id=item["medicine_id"],
                branch_id=data["branch_id"],
                batch_number=item["batch_number"],
                expiry_date=item.get("expiry_date"),
                manufacturing_date=item.get("manufacturing_date"),
                quantity=total_qty,
                purchase_price=item["purchase_price"],
                selling_price=item["selling_price"],
                supplier_id=data["supplier_id"],
                grn_id=grn.id,
            )
            self.db.add(batch)
            gi.batch_id = batch.id
        if data.get("po_id"):
            po = await self.db.get(PurchaseOrder, data["po_id"])
            if po:
                po.status = "received"
        await self.db.flush()
        await self.db.refresh(grn)
        return grn
