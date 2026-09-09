# Deploy MaintainFlow to Vercel

MaintainFlow is now a static web application, so deployment requires no Python environment and no server installation.

## Fastest route

1. Sign in to Vercel.
2. Click **Add New** → **Project**.
3. Find and import `abdullahak07/MaintainFlow`.
4. If asked for a framework, choose **Other**.
5. Do not add environment variables.
6. Click **Deploy**.

Vercel will serve `index.html` from the repository root.

## After deployment

Open the generated `*.vercel.app` URL and verify:

- Overview dashboard loads.
- `New request` opens the intake form.
- A sample email can be loaded and analysed.
- The new request appears in the queue.
- Approve / reject changes persist after refresh in that same browser.
- CSV export downloads correctly.

## Custom domain later

When you are ready, attach a branded domain in **Vercel → Project → Settings → Domains**.

For client-facing demos, a domain such as `maintainflow.app` or a subdomain of your consulting website looks more credible than a raw Vercel URL.
