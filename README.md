# MaintainFlow

MaintainFlow is a zero-install web demo for residential property managers.

It demonstrates one clear workflow:

**Tenant maintenance email → structured request → urgency/category triage → human review → approved acknowledgement.**

## Why this version is intentionally simple

The site is designed for a first client conversation, not as a full property-management dashboard. A prospective client should understand the value in seconds without navigating multiple screens.

- No installation
- No API key
- No database required
- No login
- No email is actually sent
- Demo requests are stored only in the visitor's browser (`localStorage`)

## Deploy to Vercel

Import this GitHub repository into Vercel and choose **Other** as the Application Preset. No build command, output directory, or environment variables are required.

## Production pilot

A real client pilot should add authentication, a shared database, role-based access, email ingestion, audit logging, secrets management, backups, privacy controls, and integrations with the agency's property-management system.

## License

MIT — see `LICENSE`.
