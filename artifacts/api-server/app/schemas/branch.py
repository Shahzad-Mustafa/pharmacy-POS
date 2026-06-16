import uuid
from typing import Optional
from pydantic import BaseModel


class BranchCreate(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    manager_id: Optional[uuid.UUID] = None
    settings: Optional[dict] = {}


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    manager_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None


class BranchResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    address: Optional[str]
    phone: Optional[str]
    license_number: Optional[str]
    manager_id: Optional[uuid.UUID]
    is_active: bool
    settings: Optional[dict]

    model_config = {"from_attributes": True}


class BranchSettingsUpdate(BaseModel):
    tax_rate: Optional[float] = None
    mrp_enforcement: Optional[bool] = None
    low_stock_alert_threshold_days: Optional[int] = None
    expiry_alert_days: Optional[list] = None
    receipt_footer: Optional[str] = None
    printer_config: Optional[dict] = None
