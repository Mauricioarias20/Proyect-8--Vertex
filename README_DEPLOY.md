Netlify + Railway deployment notes

1) Option A (recommended): set Netlify environment variable
- In Netlify site → Site settings → Build & deploy → Environment, add:
  - Key: VITE_API_BASE
  - Value: https://<your-railway-app>.up.railway.app
- Redeploy the site.

2) Option B (proxy via Netlify redirects)
- Replace the placeholder in `netlify.toml`:
  - open `netlify.toml` and replace `<RAILWAY_URL>` with your Railway public host (no trailing slash), e.g. `your-app.up.railway.app`.
- Commit & push, then redeploy on Netlify.

Notes:
- The proxy rule forwards `/api/*` requests from the frontend to your Railway backend without rebuilding.
- If you use `VITE_API_BASE`, it's used at build-time by the frontend; the proxy is runtime.
- After deployment, verify in browser DevTools that API calls go to the Railway URL (or are proxied via Netlify).
