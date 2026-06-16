import uuid
from datetime import date
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, JSON, Text, Date, Numeric, Integer
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class InsuranceProvider(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "insurance_providers"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(50))
    adapter: Mapped[str] = mapped_column(String(50), default="manual_panel")
    claim_api_endpoint: Mapped[Optional[str]] = mapped_column(String(500))
    api_credentials: Mapped[Optional[dict]] = mapped_column(JSON)
    coverage_rules: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    is_cashless: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    contact: Mapped[Optional[dict]] = mapped_column(JSON)

    claims: Mapped[List["InsuranceClaim"]] = relationship("InsuranceClaim", back_populates="provider", lazy="raise")


class InsuranceClaim(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "insurance_claims"

    sale_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=True)
    patient_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=True)
    provider_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("insurance_providers.id"), nullable=False)
    prescription_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("prescriptions.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    claim_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    patient_copay: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    approved_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    items: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    diagnosis_codes: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    documents: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    submission_notes: Mapped[Optional[str]] = mapped_column(Text)
    submitted_at: Mapped[Optional[str]] = mapped_column(String(50))
    adjudicated_at: Mapped[Optional[str]] = mapped_column(String(50))
    branch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)

    provider: Mapped["InsuranceProvider"] = relationship("InsuranceProvider", back_populates="claims")
