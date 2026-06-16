import logging
import uuid
from datetime import date, datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.exceptions import BadRequestError, NotFoundError
from app.models.sale import Sale, SaleItem, SalePayment
from app.models.inventory import MedicineBatch
from app.repositories.sale_repo import SaleRepository
from app.repositories.inventory_repo import BatchRepository
from app.repositories.medicine_repo import MedicineRepository
from app.repositories.patient_repo import PatientRepository

logger = logging.getLogger(__name__)


class SaleService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.sale_repo = SaleRepository(db)
        self.batch_repo = BatchRepository(db)
        self.med_repo = MedicineRepository(db)
        self.patient_repo = PatientRepository(db)

    async def create_sale(self, data: dict, current_user_id: uuid.UUID) -> dict:
        branch_id = data["branch_id"]
        items_data = data["items"]
        tax_rate = data.get("tax_rate", 0.17)
        discount_invoice = data.get("discount_on_invoice", 0)
        discount_pct_invoice = data.get("discount_pct_on_invoice", 0)
        warnings = []

        patient = None
        if data.get("patient_id"):
            patient = await self.patient_repo.get(data["patient_id"])

        resolved_items = []
        subtotal = 0.0

        for item in items_data:
            med = await self.med_repo.get(item["medicine_id"])
            if not med or not med.is_active:
                raise NotFoundError("Medicine", str(item["medicine_id"]))

            if med.requires_prescription and not data.get("prescription_id") and not data.get("force"):
                raise BadRequestError("PRESCRIPTION_REQUIRED", f"{med.name} requires a prescription")

            batch = None
            if item.get("batch_id"):
                batch = await self.batch_repo.get(item["batch_id"])
            else:
                batches = await self.batch_repo.get_fefo_batches(med.id, branch_id, item["quantity"])
                if batches:
                    batch = batches[0]

            if not batch:
                raise BadRequestError("INSUFFICIENT_STOCK", f"No stock available for {med.name}")
            if batch.quantity < item["quantity"]:
                raise BadRequestError("INSUFFICIENT_STOCK", f"Only {batch.quantity} units available for {med.name}")

            unit_price = item["unit_price"]
            if med.mrp and unit_price > float(med.mrp):
                raise BadRequestError("PRICE_EXCEEDS_MRP", f"Unit price exceeds MRP ({med.mrp}) for {med.name}")

            discount_pct = item.get("discount_pct", 0)
            discount_flat = item.get("discount_flat", 0)
            line_total = (unit_price * item["quantity"]) - discount_flat - (unit_price * item["quantity"] * discount_pct / 100)
            subtotal += line_total

            resolved_items.append({
                "medicine_id": med.id,
                "medicine": med,
                "batch": batch,
                "quantity": item["quantity"],
                "unit_price": unit_price,
                "discount_pct": discount_pct,
                "discount_flat": discount_flat,
                "line_total": line_total,
            })

        invoice_discount = discount_invoice + (subtotal * discount_pct_invoice / 100)
        taxable = subtotal - invoice_discount
        tax_amount = taxable * tax_rate
        total = taxable + tax_amount

        change = None
        if data.get("amount_tendered") and data.get("payment_method") == "cash":
            change = float(data["amount_tendered"]) - total
            if change < 0:
                raise BadRequestError("INSUFFICIENT_PAYMENT", f"Amount tendered ({data['amount_tendered']}) less than total ({total:.2f})")

        invoice_number = await self.sale_repo.get_next_invoice_number(branch_id)

        sale = Sale(
            invoice_number=invoice_number,
            branch_id=branch_id,
            patient_id=data.get("patient_id"),
            prescription_id=data.get("prescription_id"),
            cashier_id=data.get("cashier_id") or current_user_id,
            sale_type=data.get("sale_type", "retail"),
            status="completed",
            ward=data.get("ward"),
            encounter_id=data.get("encounter_id"),
            subtotal=subtotal,
            discount_amount=invoice_discount,
            discount_pct=discount_pct_invoice,
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            total=total,
            payment_method=data.get("payment_method", "cash"),
            amount_tendered=data.get("amount_tendered"),
            change_amount=change,
            notes=data.get("notes"),
            warnings=warnings,
        )
        self.db.add(sale)
        await self.db.flush()

        stock_updates = []
        for item in resolved_items:
            si = SaleItem(
                sale_id=sale.id,
                medicine_id=item["medicine_id"],
                batch_id=item["batch"].id,
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                discount_pct=item["discount_pct"],
                discount_flat=item["discount_flat"],
                line_total=item["line_total"],
            )
            self.db.add(si)
            item["batch"].quantity -= item["quantity"]
            stock_updates.append({"medicine_id": str(item["medicine_id"]), "new_qty": item["batch"].quantity})

        await self.db.flush()
        await self.db.refresh(sale)

        result = await self.sale_repo.get_with_items(sale.id)
        return {
            "sale": result,
            "warnings": warnings,
            "stock_updated": stock_updates,
        }

    async def process_refund(self, sale_id: uuid.UUID, data: dict, user_id: uuid.UUID) -> Sale:
        sale = await self.sale_repo.get_with_items(sale_id)
        if not sale:
            raise NotFoundError("Sale", str(sale_id))
        if sale.status not in ("completed",):
            raise BadRequestError("INVALID_STATUS", "Only completed sales can be refunded")

        refund_invoice = f"REF-{sale.invoice_number}"
        refund_sale = Sale(
            invoice_number=refund_invoice,
            branch_id=sale.branch_id,
            patient_id=sale.patient_id,
            cashier_id=user_id,
            sale_type=sale.sale_type,
            status="refunded",
            is_refund=True,
            refund_of_id=sale.id,
            payment_method=data.get("refund_method", "cash"),
            notes=data.get("notes"),
            total=0,
            subtotal=0,
            tax_rate=sale.tax_rate,
            tax_amount=0,
            discount_amount=0,
        )
        self.db.add(refund_sale)
        await self.db.flush()

        refund_total = 0.0
        for refund_item in data["items"]:
            orig_item = next((i for i in sale.items if str(i.id) == str(refund_item["sale_item_id"])), None)
            if not orig_item:
                raise BadRequestError("ITEM_NOT_FOUND", f"Sale item {refund_item['sale_item_id']} not found")
            if refund_item["quantity"] > orig_item.quantity:
                raise BadRequestError("REFUND_EXCEEDS_SOLD", "Refund quantity exceeds sold quantity")
            unit_refund = (orig_item.line_total / orig_item.quantity) * refund_item["quantity"]
            refund_total += unit_refund
            ri = SaleItem(
                sale_id=refund_sale.id,
                medicine_id=orig_item.medicine_id,
                batch_id=orig_item.batch_id,
                quantity=refund_item["quantity"],
                unit_price=orig_item.unit_price,
                discount_pct=0,
                discount_flat=0,
                line_total=-unit_refund,
            )
            self.db.add(ri)
            if data.get("restock") and orig_item.batch_id:
                batch = await self.batch_repo.get(orig_item.batch_id)
                if batch and batch.expiry_date and batch.expiry_date >= date.today():
                    batch.quantity += refund_item["quantity"]

        refund_sale.subtotal = -refund_total
        refund_sale.total = -refund_total
        sale.status = "partially_refunded"
        await self.db.flush()
        await self.db.refresh(refund_sale)
        return refund_sale
