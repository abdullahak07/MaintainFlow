from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from ..config import settings
from ..models import AuditEvent, MaintenanceRequest, OutboxMessage
from ..schemas import IncomingEmail
from .extractor import get_extractor
from .mailer import deliver


def log_event(db: Session, request_id: int, event_type: str, detail: str = "") -> None:
    db.add(AuditEvent(request_id=request_id, event_type=event_type, detail=detail))
    db.commit()


def ingest_email(db: Session, email: IncomingEmail) -> MaintenanceRequest:
    extractor = get_extractor()
    result = extractor.extract(email)
    data = result.data

    item = MaintenanceRequest(
        sender_email=str(email.sender_email),
        subject=email.subject,
        raw_body=email.body,
        tenant_name=data.tenant_name,
        property_address=data.property_address,
        issue_summary=data.issue_summary,
        category=data.category,
        urgency=data.urgency,
        confidence=data.confidence,
        draft_reply=data.draft_reply,
        status="pending_approval",
        extraction_provider=result.provider,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    log_event(db, item.id, "received", f"Email received from {item.sender_email}")
    log_event(
        db,
        item.id,
        "extracted",
        f"provider={item.extraction_provider}; category={item.category}; urgency={item.urgency}; confidence={item.confidence:.2f}",
    )
    db.refresh(item)
    return item


def approve_request(db: Session, item: MaintenanceRequest, note: str | None = None) -> MaintenanceRequest:
    if item.status not in {"pending_approval", "rejected"}:
        raise ValueError(f"Request cannot be approved from status={item.status}")

    now = datetime.now(timezone.utc)
    item.status = "approved"
    item.review_note = note
    item.approved_at = now
    db.add(item)
    db.commit()
    log_event(db, item.id, "approved", note or "Approved by property manager")

    outbox = OutboxMessage(
        request_id=item.id,
        to_email=item.sender_email,
        subject=f"Re: {item.subject or 'Maintenance request'}",
        body=item.draft_reply,
        delivery_mode=settings.mail_mode,
        delivery_status="queued",
    )
    db.add(outbox)
    db.commit()
    db.refresh(outbox)

    try:
        deliver(db, outbox)
        if outbox.delivery_status == "sent":
            item.status = "response_sent"
            item.response_sent_at = outbox.sent_at
            db.add(item)
            db.commit()
            log_event(db, item.id, "response_sent", f"mode={outbox.delivery_mode}; to={outbox.to_email}")
    except Exception as exc:
        item.status = "delivery_failed"
        db.add(item)
        db.commit()
        log_event(db, item.id, "delivery_failed", str(exc))

    db.refresh(item)
    return item


def reject_request(db: Session, item: MaintenanceRequest, note: str | None = None) -> MaintenanceRequest:
    if item.status not in {"pending_approval", "approved"}:
        raise ValueError(f"Request cannot be rejected from status={item.status}")
    item.status = "rejected"
    item.review_note = note
    db.add(item)
    db.commit()
    log_event(db, item.id, "rejected", note or "Rejected by property manager")
    db.refresh(item)
    return item
