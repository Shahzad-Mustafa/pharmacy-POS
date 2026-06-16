import uuid
from datetime import date, datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, JSON, Text, Numeric, Integer, Date, DateTime
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class MedicineBatch(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medicine_batches"

    medicine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id"), nullable=False)
    branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    serial_number: Mapped[Optional[str]] = mapped_column(String(100))
    expiry_date: Mapped[Optional[date]] = mapped_column(Date)
    manufacturing_date: Mapped[Optional[date]] = mapped_column(Date)
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    purchase_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    selling_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    supplier_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=True)
    grn_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("grns.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    medicine: Mapped["Medicine"] = relationship("Medicine", back_populates="batches")
    branch: Mapped["Branch"] = relationship("Branch")
    supplier: Mapped[Optional["Supplier"]] = relationship("Supplier")


class StockAdjustment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stock_adjustments"

    batch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicine_batches.id"), nullable=False)
    branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    adjustment_type: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity_change: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text)
    reference: Mapped[Optional[str]] = mapped_column(String(100))
    witnessed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    batch: Mapped["MedicineBatch"] = relationship("MedicineBatch")


class StockTransfer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stock_transfers"

    from_branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    to_branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="completed")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    transfer_date: Mapped[Optional[date]] = mapped_column(Date)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    items: Mapped[List["StockTransferItem"]] = relationship("StockTransferItem", back_populates="transfer")


class StockTransferItem(Base, UUIDMixin):
    __tablename__ = "stock_transfer_items"

    transfer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stock_transfers.id"), nullable=False)
    batch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicine_batches.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    transfer: Mapped["StockTransfer"] = relationship("StockTransfer", back_populates="items")


class StockCount(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stock_counts"

    branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    count_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    confirmed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    items: Mapped[List["StockCountItem"]] = relationship("StockCountItem", back_populates="stock_count")


class StockCountItem(Base, UUIDMixin):
    __tablename__ = "stock_count_items"

    stock_count_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stock_counts.id"), nullable=False)
    batch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicine_batches.id"), nullable=False)
    system_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    physical_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    variance: Mapped[int] = mapped_column(Integer, default=0)

    stock_count: Mapped["StockCount"] = relationship("StockCount", back_populates="items")
