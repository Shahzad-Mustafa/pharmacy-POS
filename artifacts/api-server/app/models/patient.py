import uuid
from datetime import date
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, JSON, Text, Date, Numeric
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Patient(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "patients"

    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    dob: Mapped[Optional[date]] = mapped_column(Date)
    gender: Mapped[Optional[str]] = mapped_column(String(20))
    phone: Mapped[Optional[str]] = mapped_column(String(50), index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255))
    address: Mapped[Optional[str]] = mapped_column(Text)
    cnic: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True, index=True)
    mrn: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    ward: Mapped[Optional[str]] = mapped_column(String(100))
    blood_group: Mapped[Optional[str]] = mapped_column(String(10))
    allergies: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    chronic_conditions: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    chronic_medications: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    emergency_contact: Mapped[Optional[dict]] = mapped_column(JSON)
    customer_type: Mapped[str] = mapped_column(String(20), default="retail")
    insurance_provider_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("insurance_providers.id"), nullable=True)
    insurance_member_id: Mapped[Optional[str]] = mapped_column(String(100))
    loyalty_points: Mapped[int] = mapped_column(nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    branch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)

    insurance_provider: Mapped[Optional["InsuranceProvider"]] = relationship("InsuranceProvider")
    prescriptions: Mapped[List["Prescription"]] = relationship("Prescription", back_populates="patient", lazy="raise")
    sales: Mapped[List["Sale"]] = relationship("Sale", back_populates="patient", lazy="raise")
