# MaintainFlow backend environment variables

Add these in Vercel → Project → Settings → Environment Variables.

## Supabase

- `SUPABASE_URL` — project URL, e.g. `https://xxxxx.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — server-side service role key. Never expose this in browser code.

Run `supabase/schema.sql` once in the Supabase SQL editor before enabling the backend.

## Email (Resend)

- `RESEND_API_KEY`
- `MAIL_FROM` — e.g. `MaintainFlow <onboarding@resend.dev>` for initial testing, or a verified sender on your own domain.
- `DEMO_RECIPIENT` — strongly recommended while testing. When set, every tenant/contractor email is redirected to this address, while the subject shows the intended recipient.

Example safe test setup:

```text
MAIL_FROM=MaintainFlow <onboarding@resend.dev>
DEMO_RECIPIENT=your-own-email@example.com
```

Remove `DEMO_RECIPIENT` only when you intentionally want to send to the actual tenant/contractor addresses stored in the database.

## Safety controls

- `ALLOW_LIVE_DISPATCH` — leave unset/false during demos. Without `DEMO_RECIPIENT`, the backend refuses to send unless this is explicitly `true`.
- `MAX_DEMO_DISPATCHES_PER_HOUR` — optional global cap; defaults to `20`.
