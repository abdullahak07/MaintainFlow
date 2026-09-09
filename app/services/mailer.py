from __future__ import annotations

import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage

from sqlalchemy.orm import Session

from ..config import settings
from ..models import OutboxMessage


def deliver(db: Session, outbox: OutboxMessage) -> OutboxMessage:
    if settings.mail_mode == "console":
        print("\n=== MAINTAINFLOW OUTBOX (DRY RUN) ===")
        print(f"To: {outbox.to_email}")
        print(f"Subject: {outbox.subject}")
        print(outbox.body)
        print("=== END OUTBOX ===\n")
        outbox.delivery_status = "sent"
        outbox.sent_at = datetime.now(timezone.utc)
        db.add(outbox)
        db.commit()
        db.refresh(outbox)
        return outbox

    if settings.mail_mode != "smtp":
        outbox.delivery_status = "failed"
        outbox.error = f"Unsupported MAIL_MODE={settings.mail_mode}"
        db.add(outbox)
        db.commit()
        return outbox

    if not settings.smtp_host:
        raise RuntimeError("SMTP_HOST is required when MAIL_MODE=smtp")

    message = EmailMessage()
    message["From"] = settings.mail_from
    message["To"] = outbox.to_email
    message["Subject"] = outbox.subject
    message.set_content(outbox.body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password or "")
            smtp.send_message(message)
        outbox.delivery_status = "sent"
        outbox.sent_at = datetime.now(timezone.utc)
    except Exception as exc:
        outbox.delivery_status = "failed"
        outbox.error = str(exc)
        db.add(outbox)
        db.commit()
        raise

    db.add(outbox)
    db.commit()
    db.refresh(outbox)
    return outbox
