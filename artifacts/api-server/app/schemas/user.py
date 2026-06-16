import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    phone: Optional[str] = None
    branch_id: Optional[uuid.UUID] = None
    permissions: Optional[List[str]] = []


class UserCreate(UserBase):
    password: str

    @field_validator("role")
    @classmethod
    def valid_role(cls, v):
        allowed = {"admin", "pharmacist", "cashier", "manager", "super_admin", "accountant", "doctor"}
        if v not in allowed:
            raise ValueError(f"Role must be one of {allowed}")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    branch_id: Optional[uuid.UUID] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    phone: Optional[str]
    is_active: bool
    branch_id: Optional[uuid.UUID]
    permissions: Optional[List[str]]
    last_login: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class UserStatusUpdate(BaseModel):
    is_active: bool
    reason: Optional[str] = None


class UserPasswordReset(BaseModel):
    new_password: str
    force_change: bool = True


class PermissionsUpdate(BaseModel):
    permissions: List[str]
