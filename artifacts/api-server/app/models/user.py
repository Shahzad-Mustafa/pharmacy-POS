import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    force_password_change: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    permissions: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    branch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)

    branch: Mapped[Optional["Branch"]] = relationship("Branch", back_populates="users", lazy="raise", foreign_keys="[User.branch_id]")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="user", lazy="raise")


class AuditLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "audit_logs"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(255))
    before_data: Mapped[Optional[dict]] = mapped_column(JSON)
    after_data: Mapped[Optional[dict]] = mapped_column(JSON)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")
