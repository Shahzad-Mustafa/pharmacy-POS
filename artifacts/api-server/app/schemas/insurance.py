import uuid
from datetime import date
from typing import List, Optional
from pydantic import BaseModel


class InsuranceProviderCreate(BaseModel):
    name: str
    type: str
    adapter: str = "manual_panel"
    claim_api_endpoint: Optional[str] = None
    api_credentials: Optional[dict] = None
    coverage_rules: Optional[dict] = {}
    is_cashless: bool = False
    is_active: bool = True
    contact: Optional[dict] = None


class InsuranceProviderUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    coverage_rules: Optional[dict] = None
    is_cashless: Optional[bool] = None
    is_active: Optional[bool] = None
    contact: Optional[dict] = None


class InsuranceProviderResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    adapter: str
    coverage_rules: Optional[dict]
    is_cashless: bool
    is_active: bool
    contact: Optional[dict]

    model_config = {"from_attributes": True}


class EligibilityCheckRequest(BaseModel):
    patient_id: uuid.UUID
    provider_id: uuid.UUID
    service_date: date
    service_type: str = "pharmacy"


class ClaimItemCreate(BaseModel):
    medicine_id: uuid.UUID
    quantity: int
    unit_price: float
    claimed_amount: float


class InsuranceClaimCreate(BaseModel):
    sale_id: Optional[uuid.UUID] = None
    patient_id: uuid.UUID
    provider_id: uuid.UUID
    claim_amount: float
    patient_copay: float = 0
    items: List[ClaimItemCreate]
    diagnosis_codes: Optional[List[str]] = []
    prescription_id: Optional[uuid.UUID] = None
    branch_id: Optional[uuid.UUID] = None


class ClaimStatusUpdate(BaseModel):
    status: str
    approved_amount: Optional[float] = None
    notes: Optional[str] = None


class PreAuthRequest(BaseModel):
    requested_amount: float
    clinical_justification: Optional[str] = None
    documents: Optional[List[str]] = []
    urgency: str = "routine"


class ClaimDisputeRequest(BaseModel):
    reason: str
    supporting_document_ids: Optional[List[uuid.UUID]] = []
