# Always-on online play (PC can be off)

GitHub Pages only hosts the **static game**. Multiplayer + live presence need a **cloud game server** (WebSocket + `/api`).

## Fastest path — Render (free)

1. Open [Render Blueprint](https://dashboard.render.com/select-repo?type=blueprint) and connect `c0decr4ft/racer-online` (uses `render.yaml`), **or** fix an existing Web Service:
   - **Branch:** `main`
   - **Build Command:** `npm ci --include=dev && npm run build` (`--include=dev` matters: with `NODE_ENV=production` set, plain `npm ci` skips devDependencies and the build dies on `tsc`/`vite` not being installed)
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

## Event Mode payments (Cashu eCash — TEST sats)

Event Mode buy-ins/payouts run through a Cashu mint — players pay with cashu.me or any
NUT-18 Cashu wallet; winners claim the pot as a `cashuA` token.

- **Default mint: Testnut** (`https://testnut.cashu.space`) — a test mint whose
  Lightning invoices auto-pay, so everyone can mint **free test sats** and play the
  whole money flow (buy-in → pot → payout) with zero real funds. In cashu.me: add the
  Testnut mint in settings, then mint any amount (quotes are instantly paid).
- **Real sats later:** set `CASHU_MINT_URL` to a real mint (e.g. Coinos,
  `https://mint.coinos.io` — Minibits' mint is dead). Then it's **real money**: keep
  buy-ins small enough that losing them is a shrug, and note the pot wallet
  (`server/cashu-proofs.json`, gitignored) **lives on Render's ephemeral disk**: a
  redeploy/restart wipes unclaimed pots and tip tokens (`server/payouts.json`). Claim
  pots/tips promptly; for anything beyond pocket change, attach a persistent disk
  (paid plan) or move to a VPS (Oracle free tier / Hetzner).
- **Mock mode is opt-in for dev/tests only** — start the server with `RACER_PAYMENTS_MOCK=1`
  for fake sats that auto-pay in ~3s (the e2e suite runs against this).
- `PUBLIC_BASE_URL` — public URL of this server (needed for the payment-request callback;
  auto-detected on Render via `RENDER_EXTERNAL_URL`)
- **Leaderboard survives redeploys.** Scores are signed Nostr events (kind 30078) that
  clients also publish to public relays (`nos.lol`, `relay.primal.net`). The server
  rebuilds its board from those relays on boot and re-merges every 15 min, so
  `server/leaderboard.json` (ephemeral on Render) is only a cache — updates never wipe
  the board anymore.
- **Mint fees are automatic.** Cashu mints charge an input fee per swap (usually ~1 sat).
  Buy-in requests add that fee on top of the buy-in (payer covers it, pot lands whole).
  At payout the winner always gets the full share — the token carries its own receive
  fee (`includeFees`), paid by the dev tip / house float, never shaved off the prize.
- `GET /api/status` reports `payments: "live" | "mock"` and the active `mint`.
- The pot wallet lives in `server/cashu-proofs.json` (gitignored) — it's the money while a
  pot is unclaimed; back it up for real-money events.

## Player feedback → your email

In-game feedback posts to `/api/feedback` (stored in `server/feedback.json`, gitignored)
and is forwarded to your inbox. **Use Resend** — reliable, server-side, free tier
(100 emails/day):

1. Sign up at [resend.com](https://resend.com) (GitHub login works) → **API Keys** →
   **Create API Key** → copy it.
2. Render dashboard → your service → **Environment** → add `RESEND_API_KEY` = that key →
   save (redeploys).
3. Done — feedback lands in your inbox within seconds. Sending to your own account email
   from `onboarding@resend.dev` needs **no domain verification**. The server retries the
   relay once on failure, and the API response reports `emailed: true/false` honestly.

Fallback without the key: FormSubmit (`FEEDBACK_EMAIL`) — requires clicking the
"Activate Form" link it emails you once, or nothing is ever delivered.

## Dev dashboard (tips wallet)

The dashboard is locked to the **DEV_c0decr4ft** Nostr account (pubkey baked into
`server/index.mjs` + `render.yaml`; override with the `DEV_PUBKEY` env var). When signed
in with that account in-game, a **DEV** button appears on the home screen: it shows how
many tips you've received, each tip's amount, a wallet card with your pending/earned/
claimed sats, and COPY buttons for the pending tip tokens (redeem them in cashu.me, then
mark them claimed). Auth is a signed Nostr event verified server-side — only that pubkey
gets in. Tip records live in `server/payouts.json` (gitignored; contains bearer tokens —
keep it private and back it up).

## Local (your PC must stay on)

```bash
npm start
# http://127.0.0.1:5173/racer-online/
```
