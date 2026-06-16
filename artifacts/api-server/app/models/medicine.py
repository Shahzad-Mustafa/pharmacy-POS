import uuid
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, JSON, Text, Numeric, Integer
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Medicine(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medicines"

    name: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    generic_name: Mapped[Optional[str]] = mapped_column(String(300), index=True)
    brand: Mapped[Optional[str]] = mapped_column(String(200))
    composition: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    atc_code: Mapped[Optional[str]] = mapped_column(String(20))
    ndc_code: Mapped[Optional[str]] = mapped_column(String(50))
    drap_registration_no: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    rxcui: Mapped[Optional[str]] = mapped_column(String(50))
    barcode: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True, index=True)
    gtin: Mapped[Optional[str]] = mapped_column(String(50))
    unit: Mapped[Optional[str]] = mapped_column(String(50))
    form: Mapped[Optional[str]] = mapped_column(String(100))
    strength: Mapped[Optional[str]] = mapped_column(String(100))
    pack_size: Mapped[Optional[int]] = mapped_column(Integer)
    manufacturer: Mapped[Optional[str]] = mapped_column(String(200))
    requires_prescription: Mapped[bool] = mapped_column(Boolean, default=False)
    controlled_substance_schedule: Mapped[Optional[str]] = mapped_column(String(20))
    is_essential_medicine: Mapped[bool] = mapped_column(Boolean, default=False)
    min_stock_level: Mapped[int] = mapped_column(Integer, default=0)
    reorder_point: Mapped[int] = mapped_column(Integer, default=0)
    mrp: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    storage_conditions: Mapped[Optional[str]] = mapped_column(Text)
    contraindications: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    side_effects: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    enrichment_data: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    last_enriched_at: Mapped[Optional[str]] = mapped_column(String(50))

    batches: Mapped[List["MedicineBatch"]] = relationship("MedicineBatch", back_populates="medicine", lazy="raise")
    price_history: Mapped[List["MedicinePriceHistory"]] = relationship("MedicinePriceHistory", back_populates="medicine", lazy="raise")


class MedicinePriceHistory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medicine_price_history"

    medicine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id"), nullable=False)
    old_mrp: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    new_mrp: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    effective_date: Mapped[Optional[str]] = mapped_column(String(20))
    reason: Mapped[Optional[str]] = mapped_column(Text)
    changed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    medicine: Mapped["Medicine"] = relationship("Medicine", back_populates="price_history")
