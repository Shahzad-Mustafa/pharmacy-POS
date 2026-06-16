import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


class PrescriptionItemCreate(BaseModel):
    medicine_id: Optional[uuid.UUID] = None
    drug_text: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    quantity: Optional[int] = None
    instructions: Optional[str] = None


class PrescriptionCreate(BaseModel):
    patient_id: Optional[uuid.UUID] = None
    doctor_id: Optional[uuid.UUID] = None
    prescriber_name: Optional[str] = None
    prescriber_license: Optional[str] = None
    prescription_date: Optional[date] = None
    prescription_number: Optional[str] = None
    hospital_ward: Optional[str] = None
    source: str = "manual"
    items: List[PrescriptionItemCreate]
    notes: Optional[str] = None
    branch_id: Optional[uuid.UUID] = None


class PrescriptionUpdate(BaseModel):
    prescriber_name: Optional[str] = None
    prescriber_license: Optional[str] = None
    prescription_date: Optional[date] = None
    notes: Optional[str] = None
    items: Optional[List[PrescriptionItemCreate]] = None


class PrescriptionItemResponse(BaseModel):
    id: uuid.UUID
    medicine_id: Optional[uuid.UUID]
    drug_text: Optional[str]
    dosage: Optional[str]
    frequency: Optional[str]
    duration: Optional[str]
    quantity: Optional[int]
    instructions: Optional[str]

    model_config = {"from_attributes": True}


class PrescriptionResponse(BaseModel):
    id: uuid.UUID
    patient_id: Optional[uuid.UUID]
    doctor_id: Optional[uuid.UUID]
    prescriber_name: Optional[str]
    prescriber_license: Optional[str]
    prescription_date: Optional[date]
    prescription_number: Optional[str]
    hospital_ward: Optional[str]
    source: str
    status: str
    notes: Optional[str]
    allergy_warnings: Optional[List]
    refills_allowed: int
    refills_used: int
    items: List[PrescriptionItemResponse]
    created_at: datetime

    model_config = {"from_attributes": True}


class PrescriptionVerifyRequest(BaseModel):
    notes: Optional[str] = None
    interaction_check_passed: bool = True
    override_reason: Optional[str] = None


class PrescriptionDispenseRequest(BaseModel):
    dispensed_to: str = "patient"
    collection_notes: Optional[str] = None


class PrescriptionCancelRequest(BaseModel):
    reason: str


class PrescriptionRefillRequest(BaseModel):
    notes: Optional[str] = None
