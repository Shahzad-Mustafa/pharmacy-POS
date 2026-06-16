import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, field_validator


class SaleItemCreate(BaseModel):
    medicine_id: uuid.UUID
    batch_id: Optional[uuid.UUID] = None
    quantity: int
    unit_price: float
    discount_pct: float = 0
    discount_flat: float = 0

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v):
        if v <= 0:
            raise ValueError("Quantity must be positive")
        return v


class SaleCreate(BaseModel):
    branch_id: uuid.UUID
    patient_id: Optional[uuid.UUID] = None
    prescription_id: Optional[uuid.UUID] = None
    sale_type: str = "retail"
    ward: Optional[str] = None
    encounter_id: Optional[str] = None
    cashier_id: Optional[uuid.UUID] = None
    items: List[SaleItemCreate]
    discount_on_invoice: float = 0
    discount_pct_on_invoice: float = 0
    tax_rate: float = 0.17
    payment_method: str = "cash"
    amount_tendered: Optional[float] = None
    insurance_claim_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    force: bool = False


class SaleItemResponse(BaseModel):
    id: uuid.UUID
    medicine_id: uuid.UUID
    batch_id: Optional[uuid.UUID]
    quantity: int
    unit_price: float
    discount_pct: float
    discount_flat: float
    line_total: float

    model_config = {"from_attributes": True}


class SaleResponse(BaseModel):
    id: uuid.UUID
    invoice_number: str
    branch_id: uuid.UUID
    patient_id: Optional[uuid.UUID]
    prescription_id: Optional[uuid.UUID]
    cashier_id: Optional[uuid.UUID]
    sale_type: str
    status: str
    subtotal: float
    discount_amount: float
    tax_rate: float
    tax_amount: float
    total: float
    payment_method: str
    amount_tendered: Optional[float]
    change_amount: Optional[float]
    notes: Optional[str]
    warnings: Optional[List]
    items: List[SaleItemResponse]
    created_at: datetime

    model_config = {"from_attributes": True}


class RefundItemInput(BaseModel):
    sale_item_id: uuid.UUID
    quantity: int
    reason: Optional[str] = None


class SaleRefundRequest(BaseModel):
    items: List[RefundItemInput]
    refund_method: str = "cash"
    restock: bool = True
    notes: Optional[str] = None


class SalePaymentCreate(BaseModel):
    amount: float
    payment_method: str
    notes: Optional[str] = None


class ScanRequest(BaseModel):
    scan_data: str
    branch_id: uuid.UUID
    quantity: int = 1


class WardDispenseRequest(BaseModel):
    ward: str
    patient_id: uuid.UUID
    encounter_id: Optional[uuid.UUID] = None
    attending_doctor_id: Optional[uuid.UUID] = None
    items: List[SaleItemCreate]
    charge_to: str = "patient"


class ZReportRequest(BaseModel):
    branch_id: uuid.UUID
    cashier_id: Optional[uuid.UUID] = None
    date: str
