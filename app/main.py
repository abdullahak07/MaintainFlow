from __future__ import annotations

import csv
import io
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .config import settings
from .database import get_db, init_db
from .models import MaintenanceRequest
from .schemas import IncomingEmail, RequestOut, ReviewInput
from .services.workflow import approve_request, ingest_email, reject_request


BASE_DIR = Path(__file__).resolve().parent


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="MaintainFlow",
    version="1.0.0",
    description="Human-in-the-loop property maintenance request automation demo.",
    lifespan=lifespan,
)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")


def _get_item(db: Session, request_id: int) -> MaintenanceRequest:
    stmt = (
        select(MaintenanceRequest)
        .options(selectinload(MaintenanceRequest.audit_events), selectinload(MaintenanceRequest.outbox_messages))
        .where(MaintenanceRequest.id == request_id)
    )
    item = db.scalar(stmt)
    if not item:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    return item


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "app": settings.app_name, "llm_provider": settings.llm_provider, "mail_mode": settings.mail_mode}


@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request, db: Session = Depends(get_db)):
    items = list(db.scalars(select(MaintenanceRequest).order_by(MaintenanceRequest.created_at.desc())).all())
    counts = {
        "total": db.scalar(select(func.count()).select_from(MaintenanceRequest)) or 0,
        "pending": db.scalar(select(func.count()).select_from(MaintenanceRequest).where(MaintenanceRequest.status == "pending_approval")) or 0,
        "emergency": db.scalar(select(func.count()).select_from(MaintenanceRequest).where(MaintenanceRequest.urgency == "emergency")) or 0,
        "sent": db.scalar(select(func.count()).select_from(MaintenanceRequest).where(MaintenanceRequest.status == "response_sent")) or 0,
    }
    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={"items": items, "counts": counts, "settings": settings},
    )


@app.get("/requests/new", response_class=HTMLResponse)
def new_request_form(request: Request):
    return templates.TemplateResponse(request=request, name="new_request.html", context={})


@app.post("/requests/new")
def new_request_submit(
    sender_email: str = Form(...),
    subject: str = Form(""),
    body: str = Form(...),
    db: Session = Depends(get_db),
):
    item = ingest_email(db, IncomingEmail(sender_email=sender_email, subject=subject, body=body))
    return RedirectResponse(url=f"/requests/{item.id}", status_code=303)


@app.get("/requests/{request_id}", response_class=HTMLResponse)
def request_detail(request: Request, request_id: int, db: Session = Depends(get_db)):
    item = _get_item(db, request_id)
    return templates.TemplateResponse(request=request, name="detail.html", context={"item": item, "settings": settings})


@app.post("/requests/{request_id}/approve")
def approve_web(request_id: int, note: str = Form(""), db: Session = Depends(get_db)):
    item = _get_item(db, request_id)
    try:
        approve_request(db, item, note or None)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return RedirectResponse(url=f"/requests/{request_id}", status_code=303)


@app.post("/requests/{request_id}/reject")
def reject_web(request_id: int, note: str = Form(""), db: Session = Depends(get_db)):
    item = _get_item(db, request_id)
    try:
        reject_request(db, item, note or None)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return RedirectResponse(url=f"/requests/{request_id}", status_code=303)


@app.get("/api/requests", response_model=list[RequestOut])
def api_list(db: Session = Depends(get_db)):
    return list(db.scalars(select(MaintenanceRequest).order_by(MaintenanceRequest.created_at.desc())).all())


@app.post("/api/requests", response_model=RequestOut, status_code=201)
def api_create(payload: IncomingEmail, db: Session = Depends(get_db)):
    return ingest_email(db, payload)


@app.post("/api/webhooks/email", response_model=RequestOut, status_code=201)
def api_email_webhook(payload: IncomingEmail, db: Session = Depends(get_db)):
    """Webhook-friendly alias for Make, n8n, Zapier, email parsers, or custom integrations."""
    return ingest_email(db, payload)


@app.get("/api/requests/{request_id}", response_model=RequestOut)
def api_get(request_id: int, db: Session = Depends(get_db)):
    return _get_item(db, request_id)


@app.post("/api/requests/{request_id}/approve", response_model=RequestOut)
def api_approve(request_id: int, payload: ReviewInput, db: Session = Depends(get_db)):
    item = _get_item(db, request_id)
    try:
        return approve_request(db, item, payload.note)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/api/requests/{request_id}/reject", response_model=RequestOut)
def api_reject(request_id: int, payload: ReviewInput, db: Session = Depends(get_db)):
    item = _get_item(db, request_id)
    try:
        return reject_request(db, item, payload.note)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.get("/export.csv")
def export_csv(db: Session = Depends(get_db)):
    items = list(db.scalars(select(MaintenanceRequest).order_by(MaintenanceRequest.created_at.desc())).all())
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["id", "created_at", "sender_email", "tenant_name", "property_address", "category", "urgency", "status", "issue_summary"])
    for item in items:
        writer.writerow([
            item.id, item.created_at.isoformat(), item.sender_email, item.tenant_name or "", item.property_address or "",
            item.category, item.urgency, item.status, item.issue_summary,
        ])
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=maintenance_requests.csv"},
    )
