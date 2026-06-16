import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, JSON, Text, DateTime, Numeric, Integer
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Sale(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "sales"

    invoice_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    patient_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=True)
    prescription_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("prescriptions.id"), nullable=True)
    cashier_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    sale_type: Mapped[str] = mapped_column(String(20), default="retail")
    status: Mapped[str] = mapped_column(String(50), default="completed")
    ward: Mapped[Optional[str]] = mapped_column(String(100))
    encounter_id: Mapped[Optional[str]] = mapped_column(String(100))
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    discount_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 4), default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    payment_method: Mapped[str] = mapped_column(String(50), default="cash")
    amount_tendered: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    change_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    insurance_claim_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("insurance_claims.id"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    is_refund: Mapped[bool] = mapped_column(Boolean, default=False)
    refund_of_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=True)
    warnings: Mapped[Optional[List]] = mapped_column(JSON, default=list)

    patient: Mapped[Optional["Patient"]] = relationship("Patient", back_populates="sales")
    items: Mapped[List["SaleItem"]] = relationship("SaleItem", back_populates="sale", lazy="raise", cascade="all, delete-orphan")
    payments: Mapped[List["SalePayment"]] = relationship("SalePayment", back_populates="sale", lazy="raise")
    cashier: Mapped[Optional["User"]] = relationship("User", foreign_keys=[cashier_id])
    branch: Mapped["Branch"] = relationship("Branch", foreign_keys=[branch_id])


class SaleItem(Base, UUIDMixin):
    __tablename__ = "sale_items"

    sale_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False)
    medicine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id"), nullable=False)
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("medicine_batches.id"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    discount_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    discount_flat: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    sale: Mapped["Sale"] = relationship("Sale", back_populates="items")
    medicine: Mapped["Medicine"] = relationship("Medicine")
    batch: Mapped[Optional["MedicineBatch"]] = relationship("MedicineBatch")


class SalePayment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "sale_payments"

    sale_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    sale: Mapped["Sale"] = relationship("Sale", back_populates="payments")
