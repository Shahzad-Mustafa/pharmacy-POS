import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    license_number: Optional[str] = None
    ntn: Optional[str] = None
    credit_days: int = 0
    payment_terms: Optional[str] = None
    bank_details: Optional[dict] = None
    notes: Optional[str] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    license_number: Optional[str] = None
    ntn: Optional[str] = None
    credit_days: Optional[int] = None
    payment_terms: Optional[str] = None
    bank_details: Optional[dict] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierResponse(BaseModel):
    id: uuid.UUID
    name: str
    contact_person: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    license_number: Optional[str]
    ntn: Optional[str]
    credit_days: int
    payment_terms: Optional[str]
    bank_details: Optional[dict]
    notes: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SupplierPaymentCreate(BaseModel):
    amount: float
    payment_date: Optional[date] = None
    method: str
    reference: Optional[str] = None
    grn_ids: Optional[List[uuid.UUID]] = []
    notes: Optional[str] = None


class POItemCreate(BaseModel):
    medicine_id: uuid.UUID
    quantity: int
    unit_price: float


class PurchaseOrderCreate(BaseModel):
    po_number: Optional[str] = None
    supplier_id: uuid.UUID
    branch_id: uuid.UUID
    order_date: Optional[date] = None
    expected_date: Optional[date] = None
    items: List[POItemCreate]
    discount: float = 0
    tax: float = 0
    notes: Optional[str] = None
    send_to_supplier: bool = False


class PurchaseOrderUpdate(BaseModel):
    expected_date: Optional[date] = None
    notes: Optional[str] = None
    items: Optional[List[POItemCreate]] = None


class POResponse(BaseModel):
    id: uuid.UUID
    po_number: str
    supplier_id: uuid.UUID
    branch_id: uuid.UUID
    status: str
    order_date: Optional[date]
    expected_date: Optional[date]
    total: float
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class GRNItemCreate(BaseModel):
    medicine_id: uuid.UUID
    batch_number: str
    expiry_date: Optional[date] = None
    manufacturing_date: Optional[date] = None
    quantity_ordered: int = 0
    quantity_received: int
    purchase_price: float
    selling_price: float
    free_qty: int = 0


class GRNCreate(BaseModel):
    grn_number: Optional[str] = None
    po_id: Optional[uuid.UUID] = None
    supplier_id: uuid.UUID
    branch_id: uuid.UUID
    received_date: Optional[date] = None
    supplier_invoice_number: Optional[str] = None
    received_by: Optional[uuid.UUID] = None
    items: List[GRNItemCreate]
    notes: Optional[str] = None


class GRNResponse(BaseModel):
    id: uuid.UUID
    grn_number: str
    po_id: Optional[uuid.UUID]
    supplier_id: uuid.UUID
    branch_id: uuid.UUID
    received_date: Optional[date]
    supplier_invoice_number: Optional[str]
    total: float
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class SupplierReturnItemCreate(BaseModel):
    batch_id: uuid.UUID
    quantity: int
    reason: Optional[str] = None


class SupplierReturnCreate(BaseModel):
    return_number: Optional[str] = None
    supplier_id: uuid.UUID
    branch_id: uuid.UUID
    return_date: Optional[date] = None
    items: List[SupplierReturnItemCreate]
    credit_note_expected: bool = False
    notes: Optional[str] = None
