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

## Event Mode payments (Cashu eCash — real Bitcoin sats)

Event Mode buy-ins/payouts run through a Cashu mint — players pay with cashu.me
(or any NUT-18 Cashu wallet) using **real sat** tokens minted against Lightning.
Winners claim the pot as a `cashuA` token. Developer tips are **automatically
swapped into a separate tip wallet** on the server so a bearer token never sits
around to be double-spent.

### Where the money goes (schedule)

Example: **4 racers**, **100 sat** buy-in, winner tips **2%**, mint fee **~1 sat**
per swap.

| Step | Who | Amount | Where it lands |
| --- | --- | --- | --- |
| 1. Buy-in | Each racer | 100 + 1 = **101 sats** | Paid from their Cashu wallet (Coinos mint) |
| 2. Mint receive | Mint | **~1 sat** each | Mint fee for swapping the buy-in in |
| 3. Pot | Event wallet | 4 × 100 = **400 sats** | `server/cashu-proofs.json` until claimed |
| 4. Tip (2%) | Dev tip wallet | floor(400 × 2%) = **8 sats** | Auto-swapped into `server/cashu-tips.json` (mint burns the old secrets) |
| 5. Winner | Winner | 400 − 8 − ~2 fees ≈ **390 sats** | `cashuA` token they paste into cashu.me |
| 6. Mint send | Mint | **~2 sats** | Payout swap fees, taken from the pot (never from the tip) |

Formula for any race:

- Each racer pays `buyIn + mintFee` (usually +1 sat)
- Pot = `buyIn × racers` (fees covered so the pot lands whole)
- Tip = `floor(pot × tipPercent / 100)` → **tip wallet**, automatically
- Winner = `pot − tip − payout mint fees` → Cashu token
- You look at the tip wallet in the in-game **DEV** dashboard; **WITHDRAW TO CASHU.ME** when you want the sats on your phone

### Mint + custody

- **Default mint: Coinos** (`https://mint.coinos.io`) — real Lightning-backed
  sats. In cashu.me: add that mint, mint sats by paying a Lightning invoice, then
  scan the event buy-in QR.
- **Test/fake sats:** only for local tests. `RACER_PAYMENTS_MOCK=1` (auto-pay fake
  sats) or `CASHU_MINT_URL=https://testnut.cashu.space` (Testnut). Do not use
  Testnut in production — those invoices auto-pay and are not real Bitcoin.
- **Mock mode is opt-in for dev/tests only** — the e2e suite runs against mock.
- `PUBLIC_BASE_URL` — public URL of this server (needed for the payment-request callback;
  auto-detected on Render via `RENDER_EXTERNAL_URL`)
- **Leaderboard survives redeploys.** Scores are signed Nostr events (kind 30078) that
  clients also publish to public relays (`nos.lol`, `relay.primal.net`). The server
  rebuilds its board from those relays on boot and re-merges every 15 min, so
  `server/leaderboard.json` (ephemeral on Render) is only a cache — updates never wipe
  the board anymore.
- **Mint fees are automatic.** Buy-in requests add ~1 sat on top (payer covers it, pot
  lands whole). At payout, the **dev tip is paid whole** at the winner's chosen percent
  and swapped into the tip wallet; the mint's send fees come **out of the pot** (the
  winner's share).
- `GET /api/status` reports `payments: "live" | "mock"` and the active `mint`.
- **Two wallets, both gitignored:** pot `server/cashu-proofs.json`, tips
  `server/cashu-tips.json`. They **live on Render's ephemeral disk**: a
  redeploy/restart wipes unclaimed pots and the tip wallet. Withdraw tips promptly;
  for anything beyond pocket change, attach a persistent disk (paid plan) or move
  to a VPS (Oracle free tier / Hetzner).

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

## Dev dashboard (tip wallet)

The dashboard is locked to the **DEV_c0decr4ft** Nostr account (pubkey baked into
`server/index.mjs` + `render.yaml`; override with the `DEV_PUBKEY` env var). When signed
in with that account in-game, a **DEV** button appears on the home screen: it shows the
**tip wallet** balance (sats already collected for you), each tip's amount, and
**WITHDRAW TO CASHU.ME** when you want to move the balance to your phone. Tips are
swapped into `server/cashu-tips.json` the moment a winner claims — you do not copy
tokens per tip (that was the double-spend hole). Auth is a signed Nostr event verified
server-side — only that pubkey gets in. Withdraw tokens are created only when you ask;
redeem each one once in cashu.me.

## Local (your PC must stay on)

```bash
npm start
# http://127.0.0.1:5173/racer-online/
```
