from __future__ import annotations

import json
import re
from dataclasses import dataclass

import httpx

from ..config import settings
from ..schemas import ExtractedMaintenance, IncomingEmail


CATEGORY_KEYWORDS = {
    "plumbing": ("leak", "tap", "toilet", "pipe", "water", "drain", "shower", "plumb", "gas"),
    "electrical": ("power", "electric", "socket", "switch", "sparking", "light", "outage"),
    "appliance": ("oven", "dishwasher", "washing machine", "dryer", "fridge", "stove", "cooktop"),
    "structural": ("roof", "ceiling", "wall", "window", "door frame", "crack", "floor"),
    "security": ("lock", "key", "break in", "broken door", "garage door", "security"),
    "hvac": ("aircon", "air con", "air conditioner", "heating", "heater", "cooling", "hvac"),
}

EMERGENCY_TERMS = (
    "fire", "gas leak", "smell gas", "smell of gas", "burst pipe", "flooding", "flooded", "electrical fire",
    "sparking", "live wire", "cannot secure", "break-in", "break in"
)
HIGH_TERMS = (
    "urgent", "no power", "no water", "overflowing", "major leak", "leaking badly", "locked out",
    "hot water", "ceiling leak", "toilet blocked"
)
LOW_TERMS = ("cosmetic", "minor", "when convenient", "not urgent", "small mark", "paint")

ADDRESS_PATTERN = re.compile(
    r"\b\d{1,5}[A-Za-z]?\s+[A-Za-z0-9'\- ]{2,50}?\s(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Lane|Ln|Way|Place|Pl|Terrace|Tce|Boulevard|Blvd)\b",
    re.IGNORECASE,
)


def _clean_name(sender_email: str, body: str) -> str | None:
    signature = re.search(r"(?:regards|thanks|thank you|cheers)[,\s\n]+([A-Z][A-Za-z'\- ]{1,40})", body, re.IGNORECASE)
    if signature:
        return signature.group(1).strip().splitlines()[0]
    local = sender_email.split("@", 1)[0]
    local = re.sub(r"[._\-]+", " ", local).strip()
    return local.title() if local and not any(ch.isdigit() for ch in local) else None


def _category(text: str) -> str:
    lowered = text.lower()
    scores = {cat: sum(1 for kw in kws if kw in lowered) for cat, kws in CATEGORY_KEYWORDS.items()}
    winner = max(scores, key=scores.get)
    return winner if scores[winner] > 0 else "general"


def _urgency(text: str) -> str:
    lowered = text.lower()
    # Strip common explicit negations before safety-keyword matching.
    safety_text = lowered
    for phrase in (
        "no smoke or sparking", "no smoke", "no fire", "no sparking", "not sparking", "no gas smell",
        "no smell of gas", "not flooding", "no flooding", "no live wire",
    ):
        safety_text = safety_text.replace(phrase, "")
    if any(term in safety_text for term in EMERGENCY_TERMS):
        return "emergency"
    # Explicit low-priority wording must win over the substring "urgent" in "not urgent".
    if any(term in lowered for term in LOW_TERMS):
        return "low"
    if any(term in lowered for term in HIGH_TERMS):
        return "high"
    return "medium"


def _summary(subject: str, body: str) -> str:
    source = subject.strip() or body.strip()
    source = re.sub(r"\s+", " ", source)
    if len(source) > 180:
        return source[:177].rstrip() + "..."
    return source


def _draft_reply(name: str | None, issue: str, urgency: str) -> str:
    greeting = f"Hi {name}," if name else "Hi," 
    if urgency == "emergency":
        action = "We have marked this as an emergency maintenance request and it requires immediate review by the property manager."
    elif urgency == "high":
        action = "We have marked this as high priority and a property manager will review it promptly."
    else:
        action = "We have logged the maintenance request for review by the property manager."
    return f"{greeting}\n\nThanks for letting us know about: {issue}\n\n{action}\n\nRegards,\nProperty Management Team"


@dataclass
class ExtractionResult:
    data: ExtractedMaintenance
    provider: str


class RuleBasedExtractor:
    provider = "rules"

    def extract(self, email: IncomingEmail) -> ExtractionResult:
        text = f"{email.subject}\n{email.body}"
        address_match = ADDRESS_PATTERN.search(text)
        tenant_name = _clean_name(str(email.sender_email), email.body)
        issue = _summary(email.subject, email.body)
        category = _category(text)
        urgency = _urgency(text)
        address = address_match.group(0).strip() if address_match else None
        evidence = sum([bool(address), category != "general", urgency != "medium", bool(tenant_name)])
        confidence = min(0.97, 0.62 + 0.08 * evidence)
        data = ExtractedMaintenance(
            tenant_name=tenant_name,
            property_address=address,
            issue_summary=issue,
            category=category,
            urgency=urgency,
            confidence=round(confidence, 2),
            draft_reply=_draft_reply(tenant_name, issue, urgency),
        )
        return ExtractionResult(data=data, provider=self.provider)


class OpenAIExtractor:
    provider = "openai"

    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required when LLM_PROVIDER=openai")

    def extract(self, email: IncomingEmail) -> ExtractionResult:
        prompt = f"""You are processing a residential property maintenance email in Australia.
Return ONLY valid JSON with exactly these keys:
tenant_name (string or null), property_address (string or null), issue_summary (string),
category (one of plumbing,electrical,appliance,structural,security,hvac,general),
urgency (one of emergency,high,medium,low), confidence (0 to 1), draft_reply (string).

Urgency guidance: emergency only for immediate safety/property-security risks such as fire, gas,
active severe flooding, live electrical danger, or a property that cannot be secured. High means
important loss of essential service or significant active damage. Do not exaggerate urgency.
The draft reply must acknowledge receipt and state that a property manager will review it; do not
promise a contractor, cost, time, legal outcome, or reimbursement.

From: {email.sender_email}
Subject: {email.subject}
Body:\n{email.body}
"""
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                "https://api.openai.com/v1/responses",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": settings.openai_model, "input": prompt},
            )
            response.raise_for_status()
            payload = response.json()

        text = _response_text(payload)
        parsed = _parse_json_object(text)
        data = ExtractedMaintenance.model_validate(parsed)
        return ExtractionResult(data=data, provider=f"openai:{settings.openai_model}")


def _response_text(payload: dict) -> str:
    for item in payload.get("output", []):
        if item.get("type") == "message":
            for content in item.get("content", []):
                if content.get("type") == "output_text" and content.get("text"):
                    return content["text"]
    raise ValueError("OpenAI response did not contain output_text")


def _parse_json_object(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end < start:
        raise ValueError("Extractor response did not contain a JSON object")
    return json.loads(cleaned[start : end + 1])


def get_extractor():
    if settings.llm_provider == "openai":
        return OpenAIExtractor()
    return RuleBasedExtractor()
