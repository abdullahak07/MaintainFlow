# Deploy MaintainFlow to Vercel

MaintainFlow uses a static browser front end plus Vercel serverless functions under `/api`.

## Deploy the UI first

1. In Vercel import `abdullahak07/MaintainFlow`.
2. Use **Other** as the application/framework preset.
3. Root directory: `./`.
4. Leave build and output settings at their defaults.
5. Deploy.

Without backend environment variables the public demo still works in safe browser-fallback mode.

## Enable the real backend

### 1. Supabase

Create a Supabase project, open the SQL Editor and run `supabase/schema.sql`.

Add these Vercel environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. Safe test email via Resend

Add:

- `RESEND_API_KEY`
- `MAIL_FROM`
- `DEMO_RECIPIENT` — set this to your own email while testing.

With `DEMO_RECIPIENT` set, tenant and contractor messages are redirected to your inbox. The email subject shows the intended recipient.

Do not set `ALLOW_LIVE_DISPATCH=true` on the public unauthenticated demo.

### 3. Redeploy

After adding environment variables, redeploy the latest `main` deployment from Vercel.

Check:

- `/api/health` returns `database: true` and `email: true`.
- Processing a sample creates a real row in Supabase `work_orders`.
- Approve & dispatch sends two safe redirected emails to `DEMO_RECIPIENT`.
- Supabase `events` records processing, tenant notification, contractor notification and timer start.

See `ENVIRONMENT.md` for all backend variables and safety controls.
