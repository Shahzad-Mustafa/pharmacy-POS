from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    branch_id: Optional[str] = None

    model_config = {"json_schema_extra": {"example": {"email": "admin@rxpos.pk", "password": "Admin123!"}}}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    expires_in: int
    token_type: str = "bearer"


class LogoutRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class VerifyTokenResponse(BaseModel):
    valid: bool
    expires_at: str
