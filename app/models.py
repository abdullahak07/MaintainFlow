from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sender_email: Mapped[str] = mapped_column(String(320), index=True)
    subject: Mapped[str] = mapped_column(String(500), default="")
    raw_body: Mapped[str] = mapped_column(Text)

    tenant_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    property_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, index=True)
    issue_summary: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50), index=True)
    urgency: Mapped[str] = mapped_column(String(30), index=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    draft_reply: Mapped[str] = mapped_column(Text)

    status: Mapped[str] = mapped_column(String(40), default="pending_approval", index=True)
    review_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extraction_provider: Mapped[str] = mapped_column(String(50), default="rules")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    response_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    audit_events: Mapped[list[AuditEvent]] = relationship(
        back_populates="request", cascade="all, delete-orphan", order_by="AuditEvent.created_at"
    )
    outbox_messages: Mapped[list[OutboxMessage]] = relationship(
        back_populates="request", cascade="all, delete-orphan", order_by="OutboxMessage.created_at"
    )


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("maintenance_requests.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(80), index=True)
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    request: Mapped[MaintenanceRequest] = relationship(back_populates="audit_events")


class OutboxMessage(Base):
    __tablename__ = "outbox_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("maintenance_requests.id", ondelete="CASCADE"), index=True)
    to_email: Mapped[str] = mapped_column(String(320))
    subject: Mapped[str] = mapped_column(String(500))
    body: Mapped[str] = mapped_column(Text)
    delivery_mode: Mapped[str] = mapped_column(String(30), default="console")
    delivery_status: Mapped[str] = mapped_column(String(30), default="queued")
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    request: Mapped[MaintenanceRequest] = relationship(back_populates="outbox_messages")
