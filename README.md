# MaintainFlow

MaintainFlow is a Vercel-hosted maintenance workflow demo for residential property managers.

The current flow is:

**Tenant email → property/tenant match → urgency + trade routing → contractor selection → owner-limit check → work order → manager approval → tenant + contractor email → audit events.**

The front end stays deliberately small. The backend is implemented as Vercel serverless functions and can run in two modes:

- **Configured backend:** Supabase/Postgres persists work orders and Resend sends the approved messages.
- **Fallback demo:** if the backend environment variables are not configured, the browser keeps using the safe simulated workflow so the public demo still works.

## Backend endpoints

- `POST /api/process` — parse a tenant maintenance email, match records and create a pending work order.
- `POST /api/dispatch` — send the approved tenant + contractor messages, mark the work order dispatched and write audit events.
- `POST /api/reject` — persist a rejected work order.
- `GET /api/health` — show whether database/email configuration is available.

## Configure Supabase

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/schema.sql` once. This creates the tables and seeds the four demo properties, tenants and contractors.
4. In Vercel add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

The service-role key is used only by Vercel server functions. Do not expose it in browser JavaScript.

## Configure safe test email

MaintainFlow uses Resend for outbound email.

Add in Vercel:

- `RESEND_API_KEY`
- `MAIL_FROM`
- `DEMO_RECIPIENT`

During testing, set `DEMO_RECIPIENT` to your own email address. Both the tenant and contractor messages will be redirected there and the subject will show the intended recipient.

The backend refuses live delivery when `DEMO_RECIPIENT` is absent unless you explicitly set:

`ALLOW_LIVE_DISPATCH=true`

Do **not** enable live dispatch on a public unauthenticated demo. Add authentication first.

See `ENVIRONMENT.md` for the complete environment-variable list.

## Safety controls

- Dispatch is idempotent per work order.
- Work orders with unmatched property/tenant/contractor records cannot dispatch.
- Work orders above the owner's approval limit cannot dispatch automatically.
- Demo email dispatch is globally rate-limited (default 20/hour).
- `DEMO_RECIPIENT` safely reroutes outbound email while testing.

## Deploy

The repository is already structured for Vercel. Import the repo and use the **Other** preset. The static front end and `/api/*` serverless functions deploy together.

## Production pilot

Before processing real tenant data, add authentication/RBAC, stronger rate limiting, privacy/retention controls, attachments, real inbound Gmail/Microsoft 365 ingestion, backups/monitoring, and the target agency's property-management-system integration.

## License

MIT — see `LICENSE`.
