import uuid
from datetime import date, datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, JSON, Text, Date, DateTime, Numeric, Integer
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Prescription(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "prescriptions"

    patient_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=True)
    doctor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    prescriber_name: Mapped[Optional[str]] = mapped_column(String(200))
    prescriber_license: Mapped[Optional[str]] = mapped_column(String(100))
    prescription_date: Mapped[Optional[date]] = mapped_column(Date)
    prescription_number: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    hospital_ward: Mapped[Optional[str]] = mapped_column(String(100))
    source: Mapped[str] = mapped_column(String(50), default="manual")
    status: Mapped[str] = mapped_column(String(50), default="received")
    branch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    allergy_warnings: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    verified_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    dispensed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    dispensed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    refills_allowed: Mapped[int] = mapped_column(Integer, default=0)
    refills_used: Mapped[int] = mapped_column(Integer, default=0)
    image_url: Mapped[Optional[str]] = mapped_column(String(500))
    ocr_confidence: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))

    patient: Mapped[Optional["Patient"]] = relationship("Patient", back_populates="prescriptions")
    items: Mapped[List["PrescriptionItem"]] = relationship("PrescriptionItem", back_populates="prescription", lazy="raise", cascade="all, delete-orphan")


class PrescriptionItem(Base, UUIDMixin):
    __tablename__ = "prescription_items"

    prescription_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prescriptions.id"), nullable=False)
    medicine_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id"), nullable=True)
    drug_text: Mapped[Optional[str]] = mapped_column(String(300))
    dosage: Mapped[Optional[str]] = mapped_column(String(100))
    frequency: Mapped[Optional[str]] = mapped_column(String(100))
    duration: Mapped[Optional[str]] = mapped_column(String(100))
    quantity: Mapped[Optional[int]] = mapped_column(Integer)
    instructions: Mapped[Optional[str]] = mapped_column(Text)
    match_confidence: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))

    prescription: Mapped["Prescription"] = relationship("Prescription", back_populates="items")
    medicine: Mapped[Optional["Medicine"]] = relationship("Medicine")
