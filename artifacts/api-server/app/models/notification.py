import uuid
from typing import Optional
from sqlalchemy import String, Boolean, ForeignKey, JSON, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Notification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    channel: Mapped[str] = mapped_column(String(50), default="inapp")
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[Optional[dict]] = mapped_column(JSON)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(50), default="sent")


class NotificationTemplate(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notification_templates"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    template_id: Mapped[Optional[str]] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(20), default="en")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class NotificationLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notification_logs"

    notification_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("notifications.id"), nullable=True)
    recipient_type: Mapped[str] = mapped_column(String(50))
    recipient_id: Mapped[Optional[str]] = mapped_column(String(255))
    channel: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    sent_at: Mapped[Optional[str]] = mapped_column(String(50))
    payload: Mapped[Optional[dict]] = mapped_column(JSON)


class NotificationPreference(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notification_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    preferences: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
