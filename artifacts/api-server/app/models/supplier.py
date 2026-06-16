import uuid
from datetime import date, datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, JSON, Text, Date, DateTime, Numeric, Integer
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Supplier(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "suppliers"

    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(200))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    address: Mapped[Optional[str]] = mapped_column(Text)
    license_number: Mapped[Optional[str]] = mapped_column(String(100))
    ntn: Mapped[Optional[str]] = mapped_column(String(50))
    credit_days: Mapped[int] = mapped_column(Integer, default=0)
    payment_terms: Mapped[Optional[str]] = mapped_column(String(100))
    bank_details: Mapped[Optional[dict]] = mapped_column(JSON)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="supplier", lazy="raise")
    grns: Mapped[List["GRN"]] = relationship("GRN", back_populates="supplier", lazy="raise")


class PurchaseOrder(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "purchase_orders"

    po_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)
    branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    order_date: Mapped[Optional[date]] = mapped_column(Date)
    expected_date: Mapped[Optional[date]] = mapped_column(Date)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    tax: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="purchase_orders")
    items: Mapped[List["POItem"]] = relationship("POItem", back_populates="purchase_order", lazy="raise", cascade="all, delete-orphan")
    grns: Mapped[List["GRN"]] = relationship("GRN", back_populates="purchase_order", lazy="raise")


class POItem(Base, UUIDMixin):
    __tablename__ = "po_items"

    po_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=False)
    medicine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_received: Mapped[int] = mapped_column(Integer, default=0)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder", back_populates="items")
    medicine: Mapped["Medicine"] = relationship("Medicine")


class GRN(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "grns"

    grn_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    po_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)
    branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    received_date: Mapped[Optional[date]] = mapped_column(Date)
    supplier_invoice_number: Mapped[Optional[str]] = mapped_column(String(100))
    received_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="grns")
    purchase_order: Mapped[Optional["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="grns")
    items: Mapped[List["GRNItem"]] = relationship("GRNItem", back_populates="grn", lazy="raise", cascade="all, delete-orphan")


class GRNItem(Base, UUIDMixin):
    __tablename__ = "grn_items"

    grn_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("grns.id"), nullable=False)
    medicine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id"), nullable=False)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date)
    manufacturing_date: Mapped[Optional[date]] = mapped_column(Date)
    quantity_ordered: Mapped[int] = mapped_column(Integer, default=0)
    quantity_received: Mapped[int] = mapped_column(Integer, nullable=False)
    free_qty: Mapped[int] = mapped_column(Integer, default=0)
    purchase_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    selling_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("medicine_batches.id"), nullable=True)

    grn: Mapped["GRN"] = relationship("GRN", back_populates="items")
    medicine: Mapped["Medicine"] = relationship("Medicine")


class SupplierPayment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "supplier_payments"

    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[Optional[date]] = mapped_column(Date)
    method: Mapped[str] = mapped_column(String(50))
    reference: Mapped[Optional[str]] = mapped_column(String(100))
    grn_ids: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)


class SupplierReturn(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "supplier_returns"

    return_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)
    branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    return_date: Mapped[Optional[date]] = mapped_column(Date)
    credit_note_expected: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    items: Mapped[List["SupplierReturnItem"]] = relationship("SupplierReturnItem", back_populates="supplier_return", lazy="raise", cascade="all, delete-orphan")


class SupplierReturnItem(Base, UUIDMixin):
    __tablename__ = "supplier_return_items"

    return_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("supplier_returns.id"), nullable=False)
    batch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicine_batches.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(100))

    supplier_return: Mapped["SupplierReturn"] = relationship("SupplierReturn", back_populates="items")
