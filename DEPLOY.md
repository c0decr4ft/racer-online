# Always-on online play (PC can be off)

GitHub Pages only hosts the **static game**. Multiplayer + live presence need a **cloud game server** (WebSocket + `/api`).

## Fastest path — Render (free)

1. Open [Render Blueprint](https://dashboard.render.com/select-repo?type=blueprint) and connect `c0decr4ft/racer-online` (uses `render.yaml`), **or** fix an existing Web Service:
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start` (runs `node server/index.mjs` — must NOT be the old Vite `dev:online`)
2. **Manual Deploy → Deploy latest commit** and wait until Live.
3. Play: `https://racer-online.onrender.com/`  
   (On Render the game is served at the root. `/healthz` should return `{"ok":true,"uptime":…}` — if you still see `"rooms":[]` you are on an old deploy.)
4. **Optional — keep GitHub Pages as the public site**
   - Repo → **Settings → Secrets and variables → Actions**
   - Add:
     - `VITE_API_BASE` = `https://racer-online.onrender.com/api`
     - `VITE_WS_URL` = `wss://racer-online.onrender.com`
   - Push to `main` (or re-run **Deploy GitHub Pages** workflow)

Free Render webs **sleep after ~15 minutes idle**. The first join after sleep can take ~30s while it wakes.

`.github/workflows/keep-alive.yml` pings `/healthz` every 10 minutes via GitHub Actions so the server stays warm — it runs automatically once it's on `main`. (GitHub can delay scheduled runs under heavy load, so a rare cold start may still happen. For guaranteed no-sleep, upgrade the plan or use Fly.io.)

### Local play (your PC)
```bash
npm run start:local
# http://127.0.0.1:5173/racer-online/
```

## Fly.io (always-on)

```bash
fly auth login
fly launch --no-deploy   # accept app name racer-online if free
fly deploy
```

Then set the same GitHub Actions secrets to your `https://APP.fly.dev` / `wss://APP.fly.dev` URLs.

## Event Mode payments (Cashu eCash)

Event Mode buy-ins/payouts run through a Cashu mint — players pay with cashu.me or any
NUT-18 Cashu wallet; winners claim the pot as a `cashuA` token.

- **Default mint: Testnut** (`https://testnut.cashu.space`) — a test mint whose Lightning
  invoices auto-pay, so you can mint **free test sats** and exercise the whole money flow
  (buy-in → pot → payout) with zero real funds. In cashu.me: add the Testnut mint in
  settings, then mint any amount (quotes are instantly paid).
- **Real sats later:** set `CASHU_MINT_URL` to a real mint (e.g. `https://mint.minibits.cash`).
- **Mock mode is opt-in for dev/tests only** — start the server with `RACER_PAYMENTS_MOCK=1`
  for fake sats that auto-pay in ~3s (the e2e suite runs against this).
- `PUBLIC_BASE_URL` — public URL of this server (needed for the payment-request callback;
  auto-detected on Render via `RENDER_EXTERNAL_URL`)
- `GET /api/status` reports `payments: "live" | "mock"` and the active `mint`.
- The pot wallet lives in `server/cashu-proofs.json` (gitignored) — it's the money while a
  pot is unclaimed; back it up for real-money events.

## Local (your PC must stay on)

```bash
npm start
# http://127.0.0.1:5173/racer-online/
```
