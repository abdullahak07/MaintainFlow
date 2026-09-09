# MaintainFlow

**Human-in-the-loop maintenance request automation for residential property managers.**

MaintainFlow turns an inbound tenant maintenance email into a structured request, classifies the issue and urgency, prepares a tenant acknowledgement, and pauses for property-manager approval before a response is sent.

This repository is designed as a commercially credible MVP/demo: it runs without paid services, exposes an API/webhook surface for integrations, records an audit trail, supports optional OpenAI extraction, and can send via SMTP when explicitly enabled.

## Demo workflow

```text
Tenant email / webhook
        ↓
Extract tenant + address + issue
        ↓
Classify category + urgency
        ↓
Create structured maintenance record
        ↓
Draft acknowledgement
        ↓
Property manager reviews
        ↓
Approve → outbox → dry-run or SMTP
        ↓
Auditable status trail
```

## Features

- FastAPI application with server-rendered responsive dashboard
- Paste-email demo plus JSON REST API and webhook-friendly endpoint
- Rule-based extractor that works offline and costs nothing
- Optional OpenAI Responses API extractor via `LLM_PROVIDER=openai`
- Categories: plumbing, electrical, appliance, structural, security, HVAC, general
- Urgency: emergency, high, medium, low
- Human approval/rejection workflow
- Safe `MAIL_MODE=console` by default
- Optional SMTP delivery
- SQLite persistence
- Request audit trail and delivery outbox
- CSV export
- Sample email data and seed script
- Docker + Docker Compose
- Pytest end-to-end tests
- GitHub Actions CI

## Important product boundary

This MVP **does not automatically dispatch contractors, determine legal obligations, approve expenditure, or make tenancy decisions**. Emergency classification is a triage aid, not a substitute for the property manager's emergency procedures or professional judgement. A human approval step remains before outbound communication.

For a real client deployment, add the client's property-management platform integration, authentication/RBAC, encryption/secret management, retention policy, monitoring, backups, and a reviewed Australian privacy/data-processing configuration.

## Quick start

Requires Python 3.11+.

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
python -m scripts.seed
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000`.

Useful URLs:

- Dashboard: `/`
- New maintenance email: `/requests/new`
- API docs: `/docs`
- Health: `/health`
- CSV export: `/export.csv`

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Then open `http://localhost:8000`.

## Try the API

Create a request:

```bash
curl -X POST http://localhost:8000/api/requests \
  -H 'Content-Type: application/json' \
  -d '{
    "sender_email":"john.smith@example.com",
    "subject":"Urgent: leaking kitchen tap at 12 Smith Street",
    "body":"The kitchen tap is leaking badly and water is pooling under the sink. Thanks, John Smith"
  }'
```

Approve it (replace `1` with the request ID):

```bash
curl -X POST http://localhost:8000/api/requests/1/approve \
  -H 'Content-Type: application/json' \
  -d '{"note":"Address and urgency checked"}'
```

In the default console mail mode, the response is printed to the application logs and recorded as sent in the demo outbox. No real tenant is contacted.

## Webhook integration

`POST /api/webhooks/email` accepts the same JSON shape as `/api/requests`:

```json
{
  "sender_email": "tenant@example.com",
  "subject": "Broken oven at 10 Example Road",
  "body": "The oven will not turn on..."
}
```

This makes the demo easy to connect to n8n, Make, Zapier, an email parser, or a custom mailbox integration.

## Optional OpenAI extraction

The default `rules` provider is deterministic and requires no API key. To use the optional OpenAI extractor:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6-luna
```

The implementation calls the OpenAI Responses API and validates the returned JSON against a strict Pydantic schema. Do not commit `.env` or API keys.

For client deployments, evaluate model accuracy on the client's real maintenance vocabulary and retain a manual-review path for low-confidence or safety-sensitive requests.

## Optional real email delivery

Default:

```env
MAIL_MODE=console
```

To use SMTP:

```env
MAIL_MODE=smtp
MAIL_FROM=maintenance@yourdomain.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_USE_TLS=true
```

Only enable real delivery after testing with non-production addresses.

## Tests

```bash
pytest
```

The suite tests extraction, emergency/high/low triage, API request creation, rejection, approval, outbox processing, and the default dry-run send path.

## Suggested 60-second sales demo

1. Open **New request**.
2. Paste the sample leaking-tap email.
3. Click **Extract & triage**.
4. Point out the detected property, tenant, category, urgency and confidence.
5. Show the generated acknowledgement.
6. Click **Approve & send**.
7. Show the `response sent` status and audit trail.
8. Return to the dashboard and show that the request is now structured and searchable/exportable.

Pitch the outcome, not the AI: **less inbox triage, less copying, faster acknowledgement, and a clear audit trail while the property manager stays in control.**

## Production roadmap

A paid pilot for one agency would typically add only the integrations they use:

- Microsoft 365 / Gmail inbound mailbox
- PropertyMe, Property Tree, Console Cloud, Re-Leased, MRI, or other PMS integration where APIs permit
- Contractor/work-order creation after explicit manager approval
- Organisation authentication and role-based access
- Property/address matching against the agency rent roll
- Attachments and photos
- SLA timers and escalation rules
- Duplicate-request detection
- Metrics: time-to-triage, manual touches avoided, approval latency, category volumes
- Australian privacy/security controls and documented retention/deletion rules

## Licence

MIT. See `LICENSE`.
