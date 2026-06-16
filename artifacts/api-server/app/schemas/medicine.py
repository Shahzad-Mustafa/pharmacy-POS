import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, field_validator


class MedicineCreate(BaseModel):
    name: str
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    composition: Optional[str] = None
    category: Optional[str] = None
    atc_code: Optional[str] = None
    ndc_code: Optional[str] = None
    drap_registration_no: Optional[str] = None
    rxcui: Optional[str] = None
    barcode: Optional[str] = None
    gtin: Optional[str] = None
    unit: Optional[str] = None
    form: Optional[str] = None
    strength: Optional[str] = None
    pack_size: Optional[int] = None
    manufacturer: Optional[str] = None
    requires_prescription: bool = False
    controlled_substance_schedule: Optional[str] = None
    is_essential_medicine: bool = False
    min_stock_level: int = 0
    reorder_point: int = 0
    mrp: Optional[float] = None
    storage_conditions: Optional[str] = None
    contraindications: Optional[List[str]] = []
    side_effects: Optional[List[str]] = []


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    composition: Optional[str] = None
    category: Optional[str] = None
    atc_code: Optional[str] = None
    ndc_code: Optional[str] = None
    drap_registration_no: Optional[str] = None
    rxcui: Optional[str] = None
    barcode: Optional[str] = None
    gtin: Optional[str] = None
    unit: Optional[str] = None
    form: Optional[str] = None
    strength: Optional[str] = None
    pack_size: Optional[int] = None
    manufacturer: Optional[str] = None
    requires_prescription: Optional[bool] = None
    controlled_substance_schedule: Optional[str] = None
    is_essential_medicine: Optional[bool] = None
    min_stock_level: Optional[int] = None
    reorder_point: Optional[int] = None
    mrp: Optional[float] = None
    storage_conditions: Optional[str] = None
    contraindications: Optional[List[str]] = None
    side_effects: Optional[List[str]] = None
    is_active: Optional[bool] = None


class MedicineResponse(BaseModel):
    id: uuid.UUID
    name: str
    generic_name: Optional[str]
    brand: Optional[str]
    composition: Optional[str]
    category: Optional[str]
    atc_code: Optional[str]
    ndc_code: Optional[str]
    drap_registration_no: Optional[str]
    rxcui: Optional[str]
    barcode: Optional[str]
    gtin: Optional[str]
    unit: Optional[str]
    form: Optional[str]
    strength: Optional[str]
    pack_size: Optional[int]
    manufacturer: Optional[str]
    requires_prescription: bool
    controlled_substance_schedule: Optional[str]
    is_essential_medicine: bool
    min_stock_level: int
    reorder_point: int
    mrp: Optional[float]
    storage_conditions: Optional[str]
    contraindications: Optional[List[str]]
    side_effects: Optional[List[str]]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MedicineMRPUpdate(BaseModel):
    new_mrp: float
    effective_date: Optional[str] = None
    reason: Optional[str] = None


class MedicineEnrichRequest(BaseModel):
    sources: List[str] = ["openfda", "rxnorm"]


class BarcodeLookupRequest(BaseModel):
    raw_scan: str
    branch_id: Optional[uuid.UUID] = None


class AllergyCheckRequest(BaseModel):
    medicine_ids: List[uuid.UUID]
    patient_id: uuid.UUID
