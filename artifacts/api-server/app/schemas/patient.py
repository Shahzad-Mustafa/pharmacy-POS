import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, field_validator
import re


class EmergencyContact(BaseModel):
    name: str
    phone: str
    relation: str


class PatientCreate(BaseModel):
    name: str
    dob: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    cnic: Optional[str] = None
    mrn: Optional[str] = None
    ward: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[List[str]] = []
    chronic_conditions: Optional[List[str]] = []
    chronic_medications: Optional[List[str]] = []
    emergency_contact: Optional[EmergencyContact] = None
    customer_type: str = "retail"
    insurance_provider_id: Optional[uuid.UUID] = None
    insurance_member_id: Optional[str] = None
    branch_id: Optional[uuid.UUID] = None

    @field_validator("cnic")
    @classmethod
    def valid_cnic(cls, v):
        if v and not re.match(r"^\d{5}-\d{7}-\d$", v):
            raise ValueError("CNIC must be in format XXXXX-XXXXXXX-X")
        return v


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    ward: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = None
    insurance_provider_id: Optional[uuid.UUID] = None
    insurance_member_id: Optional[str] = None


class PatientResponse(BaseModel):
    id: uuid.UUID
    name: str
    dob: Optional[date]
    gender: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    cnic: Optional[str]
    mrn: Optional[str]
    ward: Optional[str]
    blood_group: Optional[str]
    allergies: Optional[List[str]]
    chronic_conditions: Optional[List[str]]
    chronic_medications: Optional[List[str]]
    emergency_contact: Optional[dict]
    customer_type: str
    insurance_member_id: Optional[str]
    loyalty_points: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ChronicMedicationsUpdate(BaseModel):
    medications: List[str]
    updated_by_doctor: Optional[uuid.UUID] = None


class AllergiesUpdate(BaseModel):
    allergies: List[str]


class PatientMergeRequest(BaseModel):
    keep_id: uuid.UUID
    merge_id: uuid.UUID
