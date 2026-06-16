import uuid
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, JSON, Text
from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class SystemSettings(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    value: Mapped[Optional[dict]] = mapped_column(JSON)
    description: Mapped[Optional[str]] = mapped_column(Text)


class PrinterConfig(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "printer_configs"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    branch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)
    type: Mapped[str] = mapped_column(String(50))
    ip: Mapped[Optional[str]] = mapped_column(String(100))
    port: Mapped[Optional[int]] = mapped_column(nullable=True)
    usb_vendor_id: Mapped[Optional[str]] = mapped_column(String(50))
    usb_product_id: Mapped[Optional[str]] = mapped_column(String(50))
    serial_port: Mapped[Optional[str]] = mapped_column(String(100))
    baud_rate: Mapped[Optional[int]] = mapped_column(nullable=True)
    paper_width: Mapped[int] = mapped_column(default=80)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
