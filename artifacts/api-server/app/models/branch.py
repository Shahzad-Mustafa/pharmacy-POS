import uuid
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, JSON, Text, Numeric
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Branch(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "branches"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    license_number: Mapped[Optional[str]] = mapped_column(String(100))
    manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    settings: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    users: Mapped[List["User"]] = relationship("User", back_populates="branch", lazy="raise", foreign_keys="User.branch_id")
