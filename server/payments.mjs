/**
 * Cashu (eCash) payments for Event Mode — real Bitcoin sats.
 *
 * The server runs a cashu-ts Wallet against CASHU_MINT_URL (defaults to Cubabitcoin,
 * a live mint: Lightning in → sat Cashu tokens). Mock mode (fake sats auto-pay
 * in ~3s) exists ONLY for dev/tests and must be forced via RACER_PAYMENTS_MOCK=1.
 *
 * Wallets (the files ARE the money, all gitignored):
 *   server/cashu-pots/<uuid>.json  — one pot per event (buy-ins until that winner claims)
 *   server/cashu-tips.json         — developer tip wallet (auto-collected at payout)
 *   server/cashu-proofs.json       — legacy shared pot (pre-partition; still audited)
 *
 * Buy-ins arrive as NUT-18 creqA payloads (POST /api/ecash/pay), Lightning
 * mint quotes (bolt11 → tokens minted at Cubabitcoin), or pasted cashuA tokens.
 * The winner is paid a cashuA token. The tip is swapped at the mint
 * straight into the tip wallet so a bearer token never sits around to be
 * double-spent.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

/** Mock is opt-in (tests/dev): RACER_PAYMENTS_MOCK=1. Everyone else gets real sats. */
export const PAYMENTS_MOCK = process.env.RACER_PAYMENTS_MOCK === "1";
/**
 * Canonical mint URL: host lowercased, trailing slash stripped. Wallets compare
 * this byte-for-byte against the `m` field in a NUT-18 request — a mismatch
 * makes cashu.me fall back to its default mint (CoinOS).
 */
function canonicalizeMint(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return raw.replace(/\/+$/, "");
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${u.hostname.toLowerCase()}${u.port ? `:${u.port}` : ""}${path}`;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

function sameMint(a, b) {
  return canonicalizeMint(a) === canonicalizeMint(b);
}

/**
 * Default mint: Cubabitcoin (`https://mint.cubabitcoin.org`) — real sat Cashu
 * tokens minted against Lightning invoices. Override with CASHU_MINT_URL (e.g.
 * Testnut `https://testnut.cashu.space` for free fake sats while iterating).
 */
const CASHU_MINT_URL = canonicalizeMint(
  process.env.CASHU_MINT_URL || "https://mint.cubabitcoin.org",
);

const DIR = dirname(fileURLToPath(import.meta.url));
const PROOFS_PATH = join(DIR, "cashu-proofs.json");
const TIPS_PATH = join(DIR, "cashu-tips.json");
const PAYOUTS_PATH = join(DIR, "payouts.json");
const POTS_DIR = join(DIR, "cashu-pots");

const storeTails = new Map();
function withStoreLock(path, fn) {
  const prev = storeTails.get(path) || Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  storeTails.set(
    path,
    run.then(
      () => {},
      () => {},
    ),
  );
  return run;
}

const receiveTails = new Map();
function withReceiveLock(paymentHash, fn) {
  const key = String(paymentHash || "");
  const prev = receiveTails.get(key) || Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  receiveTails.set(
    key,
    run.then(
      () => {},
      () => {},
    ),
  );
  return run;
}

function isSpentError(err) {
  const msg = String(err?.message || err).toLowerCase();
  return /already spent|token already spent|proof already spent|inputs may already be spent|spent secret/.test(msg);
}

function requirePotId(potId) {
  const id = String(potId || "").trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
    throw new Error("missing event pot id");
  }
  return id;
}

function ensurePotsDir() {
  mkdirSync(POTS_DIR, { recursive: true });
}

function potFile(potId) {
  ensurePotsDir();
  return join(POTS_DIR, `${requirePotId(potId)}.json`);
}

/* ---------------- proof stores (pot + tip wallets) ---------------- */

const MAX_POT_LOGS = 80;

function normalizeLogs(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-MAX_POT_LOGS).map((e) => ({
    at: Number(e?.at) || 0,
    level: e?.level === "warn" || e?.level === "error" ? e.level : "info",
    msg: String(e?.msg || "").slice(0, 240),
  })).filter((e) => e.msg);
}

function emptyStore() {
  return {
    mintUrl: CASHU_MINT_URL,
    proofs: [],
    withdrawnSats: 0,
    pendingWithdraw: null,
    receivedIds: [],
    logs: [],
    roomName: "",
  };
}

function peekStore(path) {
  try {
    if (!existsSync(path)) return null;
    const data = JSON.parse(readFileSync(path, "utf8"));
    if (!data || !Array.isArray(data.proofs)) return null;
    return {
      mintUrl: String(data.mintUrl || ""),
      proofs: data.proofs.map((p) => ({ ...p, amount: BigInt(p.amount ?? 0) })),
      withdrawnSats: Math.max(0, Math.round(Number(data.withdrawnSats) || 0)),
      pendingWithdraw:
        data.pendingWithdraw && typeof data.pendingWithdraw.token === "string"
          ? {
              token: data.pendingWithdraw.token,
              amountSats: Math.max(0, Math.round(Number(data.pendingWithdraw.amountSats) || 0)),
              at: Number(data.pendingWithdraw.at) || Date.now(),
            }
          : null,
      receivedIds: Array.isArray(data.receivedIds)
        ? data.receivedIds.map((id) => String(id)).filter(Boolean).slice(-500)
        : [],
      logs: normalizeLogs(data.logs),
      roomName: String(data.roomName || "").slice(0, 80),
    };
  } catch {
    return null;
  }
}

function loadStore(path) {
  const peeked = peekStore(path);
  if (!peeked) return emptyStore();
  if (!sameMint(peeked.mintUrl, CASHU_MINT_URL)) {
    console.error(
      `[cashu] refusing to load ${path} — file mint ${peeked.mintUrl} ≠ ${CASHU_MINT_URL} (proofs not destroyed, just ignored)`,
    );
    return emptyStore();
  }
  return {
    mintUrl: CASHU_MINT_URL,
    proofs: peeked.proofs,
    withdrawnSats: peeked.withdrawnSats,
    pendingWithdraw: peeked.pendingWithdraw,
    receivedIds: peeked.receivedIds,
    logs: peeked.logs,
    roomName: peeked.roomName,
  };
}

function saveStore(path, store) {
  try {
    // v4 proofs use bigint amounts — JSON can't serialize them without a replacer
    writeFileSync(
      path,
      JSON.stringify(store, (key, v) => (typeof v === "bigint" ? v.toString() : v), 2),
    );
    return true;
  } catch (err) {
    console.error("[cashu] failed to persist proofs — money at risk!", err?.message || err);
    return false;
  }
}

function proofsSum(proofs) {
  return (proofs || []).reduce((a, p) => a + Number(p.amount), 0);
}

/** Persist buy-in proofs into THAT event's pot immediately — before the HTTP response. */
async function persistPotProofs(freshProofs, paymentHash, potId) {
  if (PAYMENTS_MOCK || !Array.isArray(freshProofs) || !freshProofs.length) return;
  const path = potFile(potId);
  await withStoreLock(path, async () => {
    const store = loadStore(path);
    const id = String(paymentHash || "");
    if (id && (store.receivedIds || []).includes(id)) return;
    store.proofs.push(...freshProofs);
    if (id) store.receivedIds = [...(store.receivedIds || []), id].slice(-500);
    if (!saveStore(path, store)) {
      throw new Error("could not persist buy-in proofs to disk");
    }
  });
}

function alreadyReceived(paymentHash, potId) {
  const id = String(paymentHash || "");
  if (!id || !potId) return false;
  try {
    return (loadStore(potFile(potId)).receivedIds || []).includes(id);
  } catch {
    return false;
  }
}

function loadPotStore() {
  return loadStore(PROOFS_PATH);
}
function savePotStore(store) {
  return saveStore(PROOFS_PATH, store);
}
function loadTipStore() {
  return loadStore(TIPS_PATH);
}
function saveTipStore(store) {
  return saveStore(TIPS_PATH, store);
}

function emptyAudit(label) {
  return {
    label,
    potId: label,
    roomName: "",
    file: false,
    mintUrl: "",
    localSats: 0,
    proofs: 0,
    unspentSats: 0,
    spentSats: 0,
    pendingSats: 0,
    orphaned: false,
    receivedIds: 0,
    events: 0,
    error: null,
    rescueToken: null,
    logs: [],
  };
}

/**
 * Ask a mint whether proofs we have on disk are still spendable (NUT-07).
 * Also peeks files whose mint URL no longer matches (e.g. leftover CoinOS
 * proofs after a mint switch) so they can be rescued if still unspent.
 */
async function auditOne(label, path) {
  const peeked = peekStore(path);
  if (!peeked) return emptyAudit(label);
  const fileMint = canonicalizeMint(peeked.mintUrl) || peeked.mintUrl;
  const orphaned = Boolean(fileMint && !sameMint(fileMint, CASHU_MINT_URL));
  const out = {
    ...emptyAudit(label),
    file: true,
    mintUrl: fileMint || CASHU_MINT_URL,
    localSats: proofsSum(peeked.proofs),
    proofs: peeked.proofs.length,
    orphaned,
    receivedIds: (peeked.receivedIds || []).length,
    roomName: peeked.roomName || "",
    logs: (peeked.logs || []).slice(-24),
  };
  if (!peeked.proofs.length) return out;
  try {
    const mint = out.mintUrl || CASHU_MINT_URL;
    let wallet;
    if (orphaned) {
      const { Wallet } = await import("@cashu/cashu-ts");
      wallet = new Wallet(mint, { unit: "sat" });
      await wallet.loadMint();
    } else {
      wallet = await getWallet();
    }
    const grouped = await wallet.groupProofsByState(peeked.proofs);
    out.unspentSats = proofsSum(grouped.unspent);
    out.spentSats = proofsSum(grouped.spent);
    out.pendingSats = proofsSum(grouped.pending);
    if (orphaned && grouped.unspent.length) {
      const { getEncodedToken } = await import("@cashu/cashu-ts");
      out.rescueToken = getEncodedToken({ mint, proofs: grouped.unspent });
    }
  } catch (err) {
    out.error = String(err?.message || err).slice(0, 160);
  }
  return out;
}

function listEventPotFiles() {
  try {
    if (!existsSync(POTS_DIR)) return [];
    return readdirSync(POTS_DIR)
      .filter((name) => name.endsWith(".json"))
      .map((name) => ({
        id: name.slice(0, -5),
        path: join(POTS_DIR, name),
      }));
  } catch {
    return [];
  }
}

function mergePotAudits(parts) {
  const merged = emptyAudit("pot");
  merged.file = parts.some((p) => p.file);
  merged.mintUrl = CASHU_MINT_URL;
  merged.localSats = parts.reduce((a, p) => a + p.localSats, 0);
  merged.proofs = parts.reduce((a, p) => a + p.proofs, 0);
  merged.unspentSats = parts.reduce((a, p) => a + p.unspentSats, 0);
  merged.spentSats = parts.reduce((a, p) => a + p.spentSats, 0);
  merged.pendingSats = parts.reduce((a, p) => a + p.pendingSats, 0);
  merged.receivedIds = parts.reduce((a, p) => a + p.receivedIds, 0);
  merged.orphaned = parts.some((p) => p.orphaned);
  merged.events = parts.filter((p) => p.label !== "legacy").length;
  merged.error = parts.map((p) => p.error).find(Boolean) || null;
  merged.rescueToken = parts.find((p) => p.rescueToken)?.rescueToken || null;
  return merged;
}

async function cashuAuditCustody() {
  if (PAYMENTS_MOCK) {
    return { mock: true, mintUrl: CASHU_MINT_URL, pot: emptyAudit("pot"), tip: emptyAudit("tip"), pots: [] };
  }
  const files = listEventPotFiles();
  const [tip, legacy, ...pots] = await Promise.all([
    auditOne("tip", TIPS_PATH),
    auditOne("legacy", PROOFS_PATH),
    ...files.map((f) => auditOne(f.id, f.path)),
  ]);
  const parts = [...pots];
  if (legacy.file && (legacy.localSats > 0 || legacy.proofs > 0 || (legacy.logs || []).length)) {
    parts.push(legacy);
  }
  return { mock: false, mintUrl: CASHU_MINT_URL, pot: mergePotAudits(parts), tip, pots: parts };
}

/**
 * Append a short debug line onto an event pot file (and create the file if needed).
 * Safe to call in mock mode — no-ops. Never throws to callers.
 */
async function appendPotLog(potId, entry, meta = {}) {
  if (PAYMENTS_MOCK) return;
  let id;
  try {
    id = requirePotId(potId);
  } catch {
    return;
  }
  const path = potFile(id);
  await withStoreLock(path, async () => {
    const peeked = peekStore(path);
    const store = peeked
      ? {
          mintUrl: peeked.mintUrl || CASHU_MINT_URL,
          proofs: peeked.proofs,
          withdrawnSats: peeked.withdrawnSats,
          pendingWithdraw: peeked.pendingWithdraw,
          receivedIds: peeked.receivedIds,
          logs: peeked.logs || [],
          roomName: peeked.roomName || "",
        }
      : emptyStore();
    const name = String(meta.roomName || "").trim().slice(0, 80);
    if (name) store.roomName = name;
    store.logs = [
      ...(store.logs || []),
      {
        at: Date.now(),
        level: entry?.level === "warn" || entry?.level === "error" ? entry.level : "info",
        msg: String(entry?.msg || "").slice(0, 240),
      },
    ]
      .filter((e) => e.msg)
      .slice(-MAX_POT_LOGS);
    saveStore(path, store);
  });
}

/* ---------------- wallet init (real mode) ---------------- */

let walletPromise = null;
async function getWallet() {
  if (PAYMENTS_MOCK) throw new Error("mock mode has no real wallet");
  if (!walletPromise) {
    walletPromise = (async () => {
      const { Wallet } = await import("@cashu/cashu-ts");
      const wallet = new Wallet(CASHU_MINT_URL, { unit: "sat" });
      await wallet.loadMint();
      return wallet;
    })();
  }
  return walletPromise;
}

/* ---------------- mint fee schedule (input_fee_ppk) ---------------- */

let feePpkPromise = null;
/**
 * Max `input_fee_ppk` across the mint's active sat keysets. The mint charges
 * fee = ceil(proofs × ppk / 1000) per swap — both when we receive a buy-in and
 * when we send a payout. Buy-in invoices stay at the advertised amount; receive
 * fees come out of the pot after the swap.
 */
function getMintFeePpk() {
  if (!feePpkPromise) {
    feePpkPromise = (async () => {
      try {
        const res = await fetch(`${CASHU_MINT_URL}/v1/keysets`, {
          signal: AbortSignal.timeout(8_000),
        });
        const data = await res.json();
        const keysets = Array.isArray(data?.keysets) ? data.keysets : [];
        return keysets
          .filter((k) => k && k.active && String(k.unit) === "sat")
          .reduce((max, k) => Math.max(max, Number(k.input_fee_ppk) || 0), 0);
      } catch (err) {
        // Don't cache failure — retry next time; assume fee-less so play can go on.
        feePpkPromise = null;
        console.warn("[cashu] fee schedule fetch failed — assuming 0 fees:", err?.message || err);
        return 0;
      }
    })();
  }
  return feePpkPromise;
}

/**
 * Sats the mint takes when receiving a buy-in (not added to the invoice).
 */
async function cashuReceiveFeeSats(amountSats) {
  const ppk = await getMintFeePpk();
  if (ppk <= 0) return 0;
  const proofsFor = (a) => Math.max(1, Math.floor(Math.log2(Math.max(1, a))) + 1);
  let fee = 0;
  for (let i = 0; i < 8; i++) {
    const next = Math.ceil((ppk * proofsFor(amountSats + fee)) / 1000);
    if (next === fee) break;
    fee = next;
  }
  return fee;
}

/**
 * Upper-bound input fee for one swap spending the pot wallet's current proofs —
 * the reserve the pot payout must keep back so winner + tip sends never fail.
 */
async function cashuSendFeeSats(potId) {
  const wallet = await getWallet();
  const store = loadStore(potFile(potId));
  if (!store.proofs.length) return 0;
  return wallet.getFeesForProofs(store.proofs).toNumber();
}

async function cashuPotBalanceSats(potId) {
  return proofsSum(loadStore(potFile(potId)).proofs);
}

async function cashuTipBalanceSats() {
  return proofsSum(loadTipStore().proofs);
}

/* ---------------- mock adapter ---------------- */

const mockInvoices = new Map(); // id → { amountSats, createdAt, paidAt }
let mockTipBalance = 0;
let mockWithdrawnSats = 0;
let mockPendingWithdraw = null;

async function mockCreatePaymentRequest({ amountSats, memo }) {
  const paymentHash = randomUUID().replaceAll("-", "");
  mockInvoices.set(paymentHash, { amountSats, memo, createdAt: Date.now(), paidAt: 0 });
  return { paymentHash, paymentRequest: `creq-mock-${paymentHash}`, bolt11: "" };
}

/** Mock auto-pay after ~3s — no proofs (depositProofs is a no-op in mock). */
async function mockSettleIfPaid(paymentHash) {
  if (!(await mockIsPaid(paymentHash))) return null;
  // Omit netSats so the room records the buy-in (not the request total with fee).
  return {};
}

async function mockIsPaid(paymentHash) {
  const inv = mockInvoices.get(paymentHash);
  if (!inv) return false;
  if (!inv.paidAt && Date.now() - inv.createdAt > 3_000) inv.paidAt = Date.now();
  return inv.paidAt > 0;
}

async function mockSendToken(amountSats) {
  return { token: `cashu-mock-${amountSats}sats-${randomUUID().replaceAll("-", "")}` };
}

async function mockCollectTip(amountSats) {
  mockTipBalance += amountSats;
  return { sats: amountSats, collected: true };
}

async function mockReceiveTipToken(_token, amountSats) {
  mockTipBalance += Math.max(0, Math.round(Number(amountSats) || 0));
  return Math.max(0, Math.round(Number(amountSats) || 0));
}

async function mockWithdrawTip(amountSats) {
  if (mockPendingWithdraw) return mockPendingWithdraw;
  const amt = Math.max(0, Math.round(Number(amountSats) || 0));
  if (amt <= 0) throw new Error("nothing to withdraw");
  if (mockTipBalance < amt) throw new Error(`tip wallet short (${mockTipBalance} < ${amt} sats)`);
  mockTipBalance -= amt;
  mockPendingWithdraw = {
    token: `cashu-mock-${amt}sats-${randomUUID().replaceAll("-", "")}`,
    amountSats: amt,
    at: Date.now(),
  };
  return mockPendingWithdraw;
}

function mockMarkWithdrawCopied() {
  if (!mockPendingWithdraw) return 0;
  mockWithdrawnSats += mockPendingWithdraw.amountSats;
  const n = mockPendingWithdraw.amountSats;
  mockPendingWithdraw = null;
  return n;
}

/* ---------------- real adapter (cashu-ts) ---------------- */

/** Live Lightning mint quotes: paymentHash → { quoteId, amountSats, minting }. */
const mintQuotes = new Map();

async function cashuCreatePaymentRequest({ amountSats, memo, baseUrl, potId }) {
  requirePotId(potId);
  const { PaymentRequest, PaymentRequestTransportType } = await import("@cashu/cashu-ts");
  const paymentHash = randomUUID().replaceAll("-", "").slice(0, 24);
  const payUrl = `${String(baseUrl || "").replace(/\/+$/, "")}/api/ecash/pay`;
  // NUT-18 creqA (CBOR+base64) — Cubabitcoin and cashu.me both support this.
  // creqB (NUT-26 / experimental) is not assumed; wallets that fail to parse
  // it fall back to cashu.me's default mint (CoinOS).
  const request = new PaymentRequest(
    [{ type: PaymentRequestTransportType.POST, target: payUrl }],
    paymentHash,
    amountSats,
    "sat",
    [CASHU_MINT_URL],
    memo,
    true, // singleUse
  );
  const paymentRequest = request.toEncodedRequest();
  try {
    const decoded = PaymentRequest.fromEncodedRequest(paymentRequest);
    const mints = decoded.mints || [];
    if (!mints.some((m) => sameMint(m, CASHU_MINT_URL))) {
      console.error("[cashu] encoded creq is missing our mint", { mints, want: CASHU_MINT_URL });
    }
  } catch (err) {
    console.error("[cashu] could not round-trip payment request:", err?.message || err);
  }

  // Parallel Lightning invoice: paying it mints tokens straight into the pot
  // at Cubabitcoin (NUT-04). Any LN wallet can pay this — no Cashu app required.
  let bolt11 = "";
  try {
    const wallet = await getWallet();
    let quote;
    try {
      quote = await wallet.createMintQuoteBolt11(amountSats, memo || undefined);
    } catch (err) {
      console.warn("[cashu] mint quote with memo failed — retrying without:", err?.message || err);
      quote = await wallet.createMintQuoteBolt11(amountSats);
    }
    bolt11 = String(quote.request || "").trim();
    const quoteId = String(quote.quote || "").trim();
    if (bolt11 && quoteId) {
      mintQuotes.set(paymentHash, { quoteId, amountSats, minting: false, potId: requirePotId(potId) });
    }
  } catch (err) {
    console.warn("[cashu] Lightning mint quote failed — Cashu request still valid:", err?.message || err);
  }

  return { paymentHash, paymentRequest, bolt11 };
}

function quoteState(status) {
  return String(status?.state || (status?.paid ? "PAID" : "UNPAID")).toUpperCase();
}

/**
 * If the Lightning mint quote for this request is PAID, mint the tokens into
 * the pot wallet and return the net sats. Returns null while unpaid / in-flight.
 */
async function cashuSettleIfPaid(paymentHash) {
  const q = mintQuotes.get(paymentHash);
  if (!q) return null;
  if (q.settled) return q.settled;
  if (q.minting) return null;
  q.minting = true;
  try {
    const wallet = await getWallet();
    const status = await wallet.checkMintQuoteBolt11(q.quoteId);
    const state = quoteState(status);
    if (state !== "PAID") {
      q.minting = false;
      return null;
    }
    const proofs = await wallet.mintProofsBolt11(q.amountSats, status);
    await persistPotProofs(proofs, paymentHash, q.potId);
    const netSats = proofsSum(proofs);
    q.settled = { netSats };
    q.minting = false;
    console.log(`[cashu] Lightning buy-in minted — ${netSats} sats into pot`);
    return q.settled;
  } catch (err) {
    q.minting = false;
    console.warn("[cashu] mint-quote redeem failed:", err?.message || err);
    return null;
  }
}

/** Swap incoming proofs at the mint. Pass the proof array (not an encoded token)
 *  so incomplete DLEQ from phone-wallet POSTs cannot fail token encoding after
 *  the payer has already given up the sats. */
async function receiveProofsFromMint(_mintUrl, rawProofs) {
  const wallet = await getWallet();
  await wallet.loadMint();
  const proofs = rawProofs.map((p) => {
    const next = { ...p, amount: BigInt(p.amount ?? 0) };
    // DLEQ without `r` cannot be verified and trips cashu-ts before the swap.
    if (!next.dleq || next.dleq.r == null) delete next.dleq;
    return next;
  });
  if (!proofs.length) throw new Error("no proofs in payment");
  return wallet.receive(proofs, { requireDleq: false });
}

function payloadMint(payload) {
  if (payload?.mint) return payload.mint;
  if (payload?.token && typeof payload.token === "object") return payload.token.mint;
  return "";
}

function payloadProofs(payload) {
  if (Array.isArray(payload?.proofs)) return payload.proofs;
  if (Array.isArray(payload?.token?.proofs)) return payload.token.proofs;
  return [];
}

/**
 * Validate + receive a NUT-18 payment payload {id, mint, unit, proofs}.
 * Also accepts a wrapped `{payload:…}` or a `{token: cashuA…}` body.
 * Returns fresh proofs (swapped to our secrets). Throws on any
 * mismatch/shortfall — callers must treat that as unpaid.
 */
async function cashuReceivePayload({ paymentHash, amountSats, payload: raw, potId }) {
  return withReceiveLock(paymentHash, () => cashuReceivePayloadLocked({ paymentHash, amountSats, payload: raw, potId }));
}

async function cashuReceivePayloadLocked({ paymentHash, amountSats, payload: raw, potId }) {
  const payload = raw?.payload && typeof raw.payload === "object" ? raw.payload : raw;
  const payId = String(payload.id || payload.paymentId || raw.id || "");
  if (payId && payId !== paymentHash) {
    throw new Error("payment id mismatch");
  }
  if (alreadyReceived(paymentHash, potId)) {
    console.log(`[cashu] buy-in ${paymentHash} already in pot — idempotent replay`);
    return [];
  }
  const tokenStr = typeof payload.token === "string" ? payload.token.trim() : "";
  let fresh;
  try {
    fresh = tokenStr
      ? await cashuReceiveToken({ amountSats, token: tokenStr })
      : await (async () => {
          const mint = canonicalizeMint(payloadMint(payload)) || CASHU_MINT_URL;
          if (!sameMint(mint, CASHU_MINT_URL)) {
            throw new Error(`wrong mint (${mint || "none"} — this event uses ${CASHU_MINT_URL})`);
          }
          if (String(payload.unit || "sat").toLowerCase() !== "sat") throw new Error("wrong unit");
          const proofs = payloadProofs(payload);
          const gross = proofs.reduce((a, p) => a + BigInt(p.amount ?? 0), 0n);
          if (gross < BigInt(amountSats)) throw new Error(`underpaid (${gross} < ${amountSats} sats)`);
          return receiveProofsFromMint(mint, proofs);
        })();
  } catch (err) {
    if (alreadyReceived(paymentHash, potId)) {
      console.log(`[cashu] buy-in ${paymentHash} landed while receive errored — treating as paid`);
      return [];
    }
    if (isSpentError(err)) {
      throw new Error("proofs already spent at the mint — if the lobby did not mark you paid, rejoin and paste a new token");
    }
    throw err;
  }
  try {
    await persistPotProofs(fresh, paymentHash, potId);
  } catch (err) {
    const { getEncodedToken } = await import("@cashu/cashu-ts");
    console.error(
      "[cashu] EMERGENCY buy-in token — disk persist failed, redeem this once:",
      getEncodedToken({ mint: CASHU_MINT_URL, proofs: fresh }),
    );
    // Still return proofs so the lobby marks paid; money is in `fresh` even if disk failed.
    console.error("[cashu] marking buy-in paid despite persist failure:", err?.message || err);
  }
  console.log(`[cashu] buy-in received — ${proofsSum(fresh)} sats into pot (${paymentHash})`);
  return fresh;
}

/** Receive a pasted cashuA token (manual fallback path). */
async function cashuReceiveToken({ amountSats, token }) {
  const wallet = await getWallet();
  // v4: short keyset IDs need the mint's keysets to decode — use wallet-aware decode
  const decoded = await wallet.decodeToken(String(token).trim());
  const mint = canonicalizeMint(decoded.mint);
  if (!sameMint(mint, CASHU_MINT_URL)) {
    throw new Error(`token is from another mint (we use ${CASHU_MINT_URL})`);
  }
  const gross = decoded.proofs.reduce((a, p) => a + BigInt(p.amount), 0n);
  if (gross < BigInt(amountSats)) throw new Error(`token too small (${gross} < ${amountSats} sats)`);
  return receiveProofsFromMint(mint, decoded.proofs);
}

/**
 * Pay out sats as a fresh cashuA token string from a proof store.
 * With `includeFees`, the token carries the mint's input fee on top, so the
 * receiver redeems the EXACT amount (fee paid by the sending wallet).
 */
async function sendTokenFromStore(path, amountSats, { includeFees = false } = {}) {
  const wallet = await getWallet();
  return withStoreLock(path, async () => {
    const store = loadStore(path);
    const total = proofsSum(store.proofs);
    if (total < amountSats) throw new Error(`wallet short (${total} < ${amountSats} sats)`);
    let keep, send;
    try {
      ({ keep, send } = await wallet.send(amountSats, store.proofs, { includeFees }));
    } catch (err) {
      if (!includeFees) throw err;
      console.warn("[cashu] fee-inclusive send failed — sending plain token:", err?.message || err);
      ({ keep, send } = await wallet.send(amountSats, store.proofs));
    }
    store.proofs = keep;
    if (!saveStore(path, store)) throw new Error("could not persist remaining proofs");
    const { getEncodedToken } = await import("@cashu/cashu-ts");
    return { token: getEncodedToken({ mint: CASHU_MINT_URL, proofs: send }) };
  });
}

async function cashuSendToken(amountSats, { includeFees = false, potId } = {}) {
  return sendTokenFromStore(potId ? potFile(potId) : PROOFS_PATH, amountSats, { includeFees });
}

/**
 * Move `amountSats` from one event pot into the tip wallet.
 */
async function cashuCollectTip(amountSats, potId) {
  const path = potId ? potFile(potId) : PROOFS_PATH;
  const { token } = await sendTokenFromStore(path, amountSats, { includeFees: true });
  try {
    const fresh = await cashuReceiveToken({ amountSats: 1, token });
    await withStoreLock(TIPS_PATH, async () => {
      const store = loadTipStore();
      store.proofs.push(...fresh);
      saveTipStore(store);
    });
    const sats = proofsSum(fresh);
    console.log(`[cashu] tip collected — ${sats} sats into tip wallet`);
    return { sats, collected: true };
  } catch (err) {
    console.warn("[cashu] tip collect receive failed — holding token for retry:", err?.message || err);
    return { sats: amountSats, collected: false, token };
  }
}

/** Redeem a leftover tip bearer token into the tip wallet (burns it at the mint). */
async function cashuReceiveTipToken(token) {
  const fresh = await cashuReceiveToken({ amountSats: 1, token: String(token || "").trim() });
  await withStoreLock(TIPS_PATH, async () => {
    const store = loadTipStore();
    store.proofs.push(...fresh);
    saveTipStore(store);
  });
  return proofsSum(fresh);
}

/** Export sats from the tip wallet as a cashuA token (for cashu.me). Reuses a pending withdraw. */
async function cashuWithdrawTip(amountSats) {
  const store = loadTipStore();
  if (store.pendingWithdraw?.token) return store.pendingWithdraw;
  const amt = Math.max(0, Math.round(Number(amountSats) || 0));
  if (amt <= 0) throw new Error("nothing to withdraw");
  const { token } = await sendTokenFromStore(TIPS_PATH, amt, { includeFees: true });
  const next = loadTipStore();
  next.pendingWithdraw = { token, amountSats: amt, at: Date.now() };
  saveTipStore(next);
  return next.pendingWithdraw;
}

function cashuMarkWithdrawCopied() {
  const store = loadTipStore();
  if (!store.pendingWithdraw) return 0;
  const n = store.pendingWithdraw.amountSats;
  store.withdrawnSats += n;
  store.pendingWithdraw = null;
  saveTipStore(store);
  return n;
}

function cashuPendingWithdraw() {
  return loadTipStore().pendingWithdraw;
}

function cashuWithdrawnSats() {
  return loadTipStore().withdrawnSats;
}

/* ---------------- unified surface ---------------- */

if (!PAYMENTS_MOCK) {
  console.log(`[cashu] live mint ${CASHU_MINT_URL} (real sats) · pot + tip wallets`);
} else {
  console.log("[cashu] mock mode — fake sats, RACER_PAYMENTS_MOCK=1");
}

export const payments = {
  mock: PAYMENTS_MOCK,
  mintUrl: CASHU_MINT_URL,
  createPaymentRequest: PAYMENTS_MOCK
    ? mockCreatePaymentRequest
    : cashuCreatePaymentRequest,
  /** Poll Lightning mint quotes (real) or the mock auto-pay timer. Returns {netSats} or null. */
  settleIfPaid: PAYMENTS_MOCK ? mockSettleIfPaid : cashuSettleIfPaid,
  receivePayload: PAYMENTS_MOCK ? null : cashuReceivePayload,
  alreadyReceived,
  receiveToken: PAYMENTS_MOCK ? async () => [] : cashuReceiveToken,
  sendToken: PAYMENTS_MOCK ? mockSendToken : cashuSendToken,
  /** Split from the pot and immediately swap into the tip wallet. */
  collectTip: PAYMENTS_MOCK ? mockCollectTip : cashuCollectTip,
  /** Redeem a leftover bearer tip token into the tip wallet. */
  receiveTipToken: PAYMENTS_MOCK ? mockReceiveTipToken : cashuReceiveTipToken,
  /** Export from the tip wallet as a cashuA token (cashu.me). */
  withdrawTip: PAYMENTS_MOCK ? mockWithdrawTip : cashuWithdrawTip,
  markWithdrawCopied: PAYMENTS_MOCK ? mockMarkWithdrawCopied : cashuMarkWithdrawCopied,
  pendingWithdraw: PAYMENTS_MOCK ? () => mockPendingWithdraw : cashuPendingWithdraw,
  withdrawnSats: PAYMENTS_MOCK ? () => mockWithdrawnSats : cashuWithdrawnSats,
  /** Mint receive-side fee estimate (not added to invoices). */
  receiveFeeSats: PAYMENTS_MOCK ? async () => 0 : cashuReceiveFeeSats,
  /** Reserve deducted from the pot before the winner/tip split (0 in mock). */
  sendFeeSats: PAYMENTS_MOCK ? async () => 0 : cashuSendFeeSats,
  /** Current pot wallet balance (mock: unlimited — mock sends never fail). */
  potBalanceSats: PAYMENTS_MOCK ? async () => Number.MAX_SAFE_INTEGER : cashuPotBalanceSats,
  /** Current tip wallet balance (mock: in-memory). */
  tipBalanceSats: PAYMENTS_MOCK ? async () => mockTipBalance : cashuTipBalanceSats,
  /** NUT-07 audit of pot + tip files against their mint(s). */
  auditCustody: cashuAuditCustody,
  /** Persist a debug line on one event pot (no-op in mock). */
  appendPotLog,
};

/** Record fresh buy-in proofs into the pot wallet store (real mode). */
export async function depositProofs(freshProofs, potId) {
  await persistPotProofs(freshProofs, "", potId);
}

/** Append a payout attempt to the audit log (gitignored). */
export function recordPayout(record) {
  let list = [];
  try {
    if (existsSync(PAYOUTS_PATH)) list = JSON.parse(readFileSync(PAYOUTS_PATH, "utf8"));
  } catch {
    list = [];
  }
  if (!Array.isArray(list)) list = [];
  list.push({ at: Date.now(), ...record });
  try {
    writeFileSync(PAYOUTS_PATH, JSON.stringify(list.slice(-200), null, 2));
  } catch {
    /* ignore */
  }
}

/** Read the payout audit log (tips live here). */
export function loadPayouts() {
  try {
    if (!existsSync(PAYOUTS_PATH)) return [];
    const list = JSON.parse(readFileSync(PAYOUTS_PATH, "utf8"));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Persist the payout audit log (e.g. after marking tips collected). */
export function savePayouts(list) {
  try {
    writeFileSync(PAYOUTS_PATH, JSON.stringify((Array.isArray(list) ? list : []).slice(-200), null, 2));
  } catch {
    /* ignore */
  }
}
