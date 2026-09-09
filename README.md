# MaintainFlow

**Zero-install maintenance request triage demo for residential property managers.**

MaintainFlow is a browser-based sales/demo application that turns an inbound tenant maintenance email into a structured request, detects the likely maintenance category and priority, prepares a draft acknowledgement, and places the request into a human review queue.

This version is intentionally designed for **frictionless Vercel hosting**: no Python runtime, package installation, API key, database or email account is required to demonstrate the workflow.

## What the demo shows

- Professional property-management operations dashboard
- Seeded realistic maintenance portfolio
- Paste-email maintenance intake
- Automatic extraction of tenant, property and issue
- Rules-based category detection
- Safety-aware priority triage
- Human approve / reject / resolve workflow
- Request-level audit trail
- Search and filtering
- CSV export
- Responsive mobile/desktop UI
- Browser persistence using `localStorage`
- Resettable demo workspace

## Architecture

```text
Tenant maintenance email
        ↓
Browser intake form
        ↓
Local extraction + triage engine
        ↓
Structured request
        ↓
Human review queue
        ↓
Approve / reject / resolve
        ↓
Browser-local audit trail
```

The deployed demo is static HTML/CSS/JavaScript. All interactive demo data stays in the visitor's browser.

## Deploy to Vercel

1. In Vercel, choose **Add New → Project**.
2. Import `abdullahak07/MaintainFlow` from GitHub.
3. Leave **Framework Preset** as `Other` if Vercel does not detect it automatically.
4. Leave Build Command empty/default.
5. Leave Output Directory empty/default.
6. Click **Deploy**.

There are no environment variables required for this demo.

## Run locally (optional)

You do not need to install dependencies. Any static web server works, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

Opening `index.html` directly also works in most browsers, though serving it through HTTP is preferable.

## Demo walkthrough

A useful 60–90 second sales flow is:

1. Open **Overview** and show the priority queue.
2. Open an emergency/high-priority request to show structured fields and audit history.
3. Choose **New request**.
4. Click a sample such as **Water leak** or **Gas smell**.
5. Click **Analyse & create request**.
6. Show the detected property, category, urgency and draft acknowledgement.
7. Click **Approve request**.
8. Return to the queue to show the updated workflow state.

## Important limitation

This is a **sales/pilot demo**, not a production tenancy-management system. It deliberately has no authentication, shared database, live email inbox, contractor dispatch, property-management platform integration or real outbound email.

Before processing real tenant data for a client, add at minimum:

- Authentication and role-based access
- Server-side shared database
- Proper secrets management
- Tenant/privacy data retention policy
- Backup and recovery
- Production monitoring and audit controls
- Approved email and property-management platform integrations
- Client-reviewed emergency triage and escalation rules

A natural production path is Vercel + a managed database such as Supabase/Neon/Postgres plus approved email/property-management integrations.

## License

MIT — see `LICENSE`.
