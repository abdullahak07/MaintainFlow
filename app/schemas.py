from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class IncomingEmail(BaseModel):
    sender_email: EmailStr
    subject: str = Field(default="", max_length=500)
    body: str = Field(min_length=3, max_length=50_000)


class ExtractedMaintenance(BaseModel):
    tenant_name: str | None = None
    property_address: str | None = None
    issue_summary: str
    category: Literal["plumbing", "electrical", "appliance", "structural", "security", "hvac", "general"]
    urgency: Literal["emergency", "high", "medium", "low"]
    confidence: float = Field(ge=0.0, le=1.0)
    draft_reply: str


class ReviewInput(BaseModel):
    note: str | None = Field(default=None, max_length=2_000)


class RequestOut(BaseModel):
    id: int
    sender_email: str
    subject: str
    tenant_name: str | None
    property_address: str | None
    issue_summary: str
    category: str
    urgency: str
    confidence: float
    draft_reply: str
    status: str
    extraction_provider: str
    created_at: datetime
    approved_at: datetime | None
    response_sent_at: datetime | None

    model_config = {"from_attributes": True}
