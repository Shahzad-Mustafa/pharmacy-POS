import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, field_validator


class BatchCreate(BaseModel):
    medicine_id: uuid.UUID
    branch_id: uuid.UUID
    batch_number: str
    serial_number: Optional[str] = None
    expiry_date: Optional[date] = None
    manufacturing_date: Optional[date] = None
    quantity: int
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    supplier_id: Optional[uuid.UUID] = None
    grn_id: Optional[uuid.UUID] = None

    @field_validator("expiry_date")
    @classmethod
    def expiry_future(cls, v):
        if v and v < date.today():
            raise ValueError("Expiry date must be in the future")
        return v


class BatchUpdate(BaseModel):
    selling_price: Optional[float] = None
    notes: Optional[str] = None


class BatchResponse(BaseModel):
    id: uuid.UUID
    medicine_id: uuid.UUID
    branch_id: uuid.UUID
    batch_number: str
    expiry_date: Optional[date]
    manufacturing_date: Optional[date]
    quantity: int
    purchase_price: Optional[float]
    selling_price: Optional[float]
    supplier_id: Optional[uuid.UUID]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class StockAdjustmentCreate(BaseModel):
    batch_id: uuid.UUID
    branch_id: uuid.UUID
    adjustment_type: str
    quantity_change: int
    reason: Optional[str] = None
    reference: Optional[str] = None
    witnessed_by: Optional[uuid.UUID] = None

    @field_validator("adjustment_type")
    @classmethod
    def valid_type(cls, v):
        allowed = {"damage", "theft", "expiry", "correction", "opening_stock"}
        if v not in allowed:
            raise ValueError(f"adjustment_type must be one of {allowed}")
        return v


class StockAdjustmentResponse(BaseModel):
    id: uuid.UUID
    batch_id: uuid.UUID
    branch_id: uuid.UUID
    adjustment_type: str
    quantity_change: int
    reason: Optional[str]
    reference: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class TransferItemInput(BaseModel):
    batch_id: uuid.UUID
    quantity: int


class StockTransferCreate(BaseModel):
    from_branch_id: uuid.UUID
    to_branch_id: uuid.UUID
    items: List[TransferItemInput]
    notes: Optional[str] = None
    transfer_date: Optional[date] = None


class StockCountItemInput(BaseModel):
    batch_id: uuid.UUID
    physical_qty: int


class StockCountCreate(BaseModel):
    branch_id: uuid.UUID
    count_date: date
    items: List[StockCountItemInput]
    notes: Optional[str] = None


class FEFOPreviewRequest(BaseModel):
    medicine_id: uuid.UUID
    branch_id: uuid.UUID
    quantity: int
