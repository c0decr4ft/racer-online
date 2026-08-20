/**
 * Cashu (eCash) payments for Event Mode — real Bitcoin sats.
 *
 * The server runs a cashu-ts Wallet against CASHU_MINT_URL (defaults to Minibits,
 * a live mint: Lightning in → sat Cashu tokens). Mock mode (fake sats auto-pay
 * in ~3s) exists ONLY for dev/tests and must be forced via RACER_PAYMENTS_MOCK=1.
 *
 * Two wallets, two files (both gitignored — the files ARE the money):
 *   server/cashu-proofs.json  — event pot (buy-ins until the winner claims)
 *   server/cashu-tips.json    — developer tip wallet (auto-collected at payout)
 *
 * Buy-ins arrive as NUT-18 payloads (POST /api/ecash/pay) or pasted cashuA
 * tokens. The winner is paid a cashuA token. The tip is swapped at the mint
 * straight into the tip wallet so a bearer token never sits around to be
 * double-spent.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

/** Mock is opt-in (tests/dev): RACER_PAYMENTS_MOCK=1. Everyone else gets real sats. */
export const PAYMENTS_MOCK = process.env.RACER_PAYMENTS_MOCK === "1";
/**
 * Default mint: Minibits (`https://mint.minibits.cash/Bitcoin`) — real sat Cashu
 * tokens minted against Lightning invoices. Override with CASHU_MINT_URL (e.g.
 * Testnut `https://testnut.cashu.space` for free fake sats while iterating).
 */
const CASHU_MINT_URL = (process.env.CASHU_MINT_URL || "https://mint.minibits.cash/Bitcoin").trim().replace(/\/+$/, "");

const DIR = dirname(fileURLToPath(import.meta.url));
const PROOFS_PATH = join(DIR, "cashu-proofs.json");
const TIPS_PATH = join(DIR, "cashu-tips.json");
const PAYOUTS_PATH = join(DIR, "payouts.json");

/* ---------------- proof stores (pot + tip wallets) ---------------- */

function emptyStore() {
  return { mintUrl: CASHU_MINT_URL, proofs: [], withdrawnSats: 0, pendingWithdraw: null };
}

function jsonReplacer(_key, v) {
  return typeof v === "bigint" ? v.toString() : v;
}

function proofsSum(proofs) {
  return (proofs || []).reduce((a, p) => a + Number(p.amount), 0);
}

function mintSlug(url) {
  return String(url || "unknown")
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/**
 * Serialize load→await→save mutations per wallet file. Without this, a buy-in
 * deposit can interleave with an in-flight payout `wallet.send` and the later
 * save clobbers the deposit (real sats vanish from the pot file).
 */
const storeChains = new Map();
function withStoreLock(path, fn) {
  const prev = storeChains.get(path) || Promise.resolve();
  const run = prev.then(() => fn(), () => fn());
  storeChains.set(
    path,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

/**
 * If the on-disk wallet was written for a different mint and still holds
 * proofs, back it up before returning an empty store for the configured mint.
 *
 * Previously we returned emptyStore() and the next deposit/payout save
 * silently overwrote the file — destroying unclaimed pot/tip sats whenever
 * CASHU_MINT_URL changed (e.g. Coinos → Minibits).
 */
function backupMismatchedStore(path, raw, data) {
  const sats = proofsSum(data.proofs);
  const backupPath = `${path}.bak-${mintSlug(data.mintUrl)}-${Date.now()}`;
  writeFileSync(backupPath, raw);
  const fresh = emptyStore();
  writeFileSync(path, JSON.stringify(fresh, jsonReplacer, 2));
  console.error(
    `[cashu] mint URL changed (${data.mintUrl} → ${CASHU_MINT_URL}). ` +
      `Backed up ${data.proofs.length} proofs (~${sats} sats) to ${backupPath}. ` +
      `Those tokens are only spendable on the old mint — restore CASHU_MINT_URL or redeem the backup manually.`,
  );
  return fresh;
}

function normalizeStore(data) {
  return {
    mintUrl: CASHU_MINT_URL,
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
  };
}

function loadStore(path) {
  try {
    if (!existsSync(path)) return emptyStore();
    const raw = readFileSync(path, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data?.proofs)) return emptyStore();
    if (data.mintUrl !== CASHU_MINT_URL) {
      if (data.proofs.length > 0) return backupMismatchedStore(path, raw, data);
      return emptyStore();
    }
    return normalizeStore(data);
  } catch (err) {
    // Mint-mismatch backup/write failures must not fall through to emptyStore —
    // that would let the next save destroy the only copy of the proofs.
    if (existsSync(path)) {
      try {
        const data = JSON.parse(readFileSync(path, "utf8"));
        if (Array.isArray(data?.proofs) && data.proofs.length > 0 && data.mintUrl !== CASHU_MINT_URL) {
          console.error(
            `[cashu] CRITICAL: cannot migrate ${path} after mint change — leaving file untouched:`,
            err?.message || err,
          );
          throw err;
        }
      } catch (inner) {
        if (inner === err) throw err;
        /* parse failed — fall through to empty */
      }
    }
    return emptyStore();
  }
}

function saveStore(path, store) {
  // Refuse to clobber a different-mint wallet that still holds proofs.
  if (existsSync(path)) {
    try {
      const existing = JSON.parse(readFileSync(path, "utf8"));
      if (
        existing?.mintUrl &&
        existing.mintUrl !== store.mintUrl &&
        Array.isArray(existing.proofs) &&
        existing.proofs.length > 0
      ) {
        const msg =
          `refusing to overwrite ${path} (mint ${existing.mintUrl} → ${store.mintUrl}, ` +
          `${existing.proofs.length} proofs still on disk)`;
        console.error(`[cashu] CRITICAL: ${msg}`);
        throw new Error(msg);
      }
    } catch (err) {
      if (String(err?.message || err).includes("refusing to overwrite")) throw err;
      /* unreadable existing file — proceed with write */
    }
  }
  try {
    // v4 proofs use bigint amounts — JSON can't serialize them without a replacer
    writeFileSync(path, JSON.stringify(store, jsonReplacer, 2));
  } catch (err) {
    console.error("[cashu] failed to persist proofs — money at risk!", err?.message || err);
    throw err;
  }
}

function loadPotStore() {
  return loadStore(PROOFS_PATH);
}
function savePotStore(store) {
  saveStore(PROOFS_PATH, store);
}
function loadTipStore() {
  return loadStore(TIPS_PATH);
}
function saveTipStore(store) {
  saveStore(TIPS_PATH, store);
}

/* ---------------- wallet init (real mode) ---------------- */

let walletPromise = null;
async function getWallet() {
  if (PAYMENTS_MOCK) throw new Error("mock mode has no real wallet");
  if (!walletPromise) {
    walletPromise = (async () => {
      const { Wallet } = await import("@cashu/cashu-ts");
      const wallet = new Wallet(CASHU_MINT_URL);
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
 * when we send a payout, so invoices/pots must account for it explicitly.
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
 * Sats to add ON TOP of a buy-in so the pot keeps the full amount after the
 * mint's receive-side input fee. A wallet paying A sats uses at most
 * log2(A)+1 proofs (powers of two), so the fee is ceil(proofs × ppk / 1000) —
 * usually 1 sat. Iterate to a fixpoint: the fee itself can bump the proof count.
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
async function cashuSendFeeSats() {
  const wallet = await getWallet();
  const store = loadPotStore();
  if (!store.proofs.length) return 0;
  return wallet.getFeesForProofs(store.proofs).toNumber();
}

async function cashuPotBalanceSats() {
  return proofsSum(loadPotStore().proofs);
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
  return { paymentHash, paymentRequest: `creq-mock-${paymentHash}` };
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

async function cashuCreatePaymentRequest({ amountSats, memo, baseUrl }) {
  const { PaymentRequest, PaymentRequestTransportType } = await import("@cashu/cashu-ts");
  const paymentHash = randomUUID().replaceAll("-", "").slice(0, 24);
  // cashu-ts v4: PaymentRequest takes positional args (transport, id, amount, unit, mints, description)
  const request = new PaymentRequest(
    [{ type: PaymentRequestTransportType.POST, target: `${baseUrl}/api/ecash/pay` }],
    paymentHash,
    amountSats,
    "sat",
    [CASHU_MINT_URL],
    memo,
  );
  return { paymentHash, paymentRequest: request.toEncodedCreqB() };
}

/** Normalize incoming proofs (v4: amounts must be bigint) and receive via encoded token. */
async function receiveProofsFromMint(mintUrl, rawProofs) {
  const { getEncodedToken } = await import("@cashu/cashu-ts");
  const wallet = await getWallet();
  const proofs = rawProofs.map((p) => ({ ...p, amount: BigInt(p.amount) }));
  const token = getEncodedToken({ mint: mintUrl, proofs });
  return wallet.receive(token);
}

/**
 * Validate + receive a NUT-18 payment payload {id, mint, unit, proofs}.
 * Returns fresh proofs (swapped to our secrets). Throws on any
 * mismatch/shortfall — callers must treat that as unpaid.
 */
async function cashuReceivePayload({ paymentHash, amountSats, payload }) {
  if (String(payload.id || "") !== paymentHash) throw new Error("payment id mismatch");
  const mint = String(payload.mint || "").replace(/\/+$/, "");
  if (mint !== CASHU_MINT_URL) throw new Error("wrong mint");
  if (String(payload.unit || "sat").toLowerCase() !== "sat") throw new Error("wrong unit");
  const proofs = Array.isArray(payload.proofs) ? payload.proofs : [];
  // Validate on GROSS, not net-of-fees: wallets send the exact requested amount
  // and the mint's input fee is our cost of doing business — rejecting here
  // burns the player's whole payment while we keep nothing.
  const gross = proofs.reduce((a, p) => a + BigInt(p.amount), 0n);
  if (gross < BigInt(amountSats)) throw new Error(`underpaid (${gross} < ${amountSats} sats)`);
  return receiveProofsFromMint(mint, proofs);
}

/** Receive a pasted cashuA token (manual fallback path). */
async function cashuReceiveToken({ amountSats, token }) {
  const wallet = await getWallet();
  // v4: short keyset IDs need the mint's keysets to decode — use wallet-aware decode
  const decoded = await wallet.decodeToken(String(token).trim());
  const mint = String(decoded.mint).replace(/\/+$/, "");
  if (mint !== CASHU_MINT_URL) {
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
async function sendTokenFromStore(path, amountSats, { includeFees = false, alreadyLocked = false } = {}) {
  const wallet = await getWallet();
  const run = async () => {
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
    saveStore(path, store);
    const { getEncodedToken } = await import("@cashu/cashu-ts");
    return { token: getEncodedToken({ mint: CASHU_MINT_URL, proofs: send }) };
  };
  return alreadyLocked ? run() : withStoreLock(path, run);
}

async function cashuSendToken(amountSats, { includeFees = false } = {}) {
  return sendTokenFromStore(PROOFS_PATH, amountSats, { includeFees });
}

/**
 * Move `amountSats` from the pot wallet into the tip wallet.
 * The mint swap burns the old secrets — the intermediate token is never stored
 * unless the receive fails, in which case it is returned so the caller can
 * retry the collect without sending a second time (double-spend).
 */
async function cashuCollectTip(amountSats) {
  const { token } = await sendTokenFromStore(PROOFS_PATH, amountSats, { includeFees: true });
  try {
    const fresh = await cashuReceiveToken({ amountSats: 1, token });
    await withStoreLock(TIPS_PATH, () => {
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
  await withStoreLock(TIPS_PATH, () => {
    const store = loadTipStore();
    store.proofs.push(...fresh);
    saveTipStore(store);
  });
  return proofsSum(fresh);
}

/** Export sats from the tip wallet as a cashuA token (for cashu.me). Reuses a pending withdraw. */
async function cashuWithdrawTip(amountSats) {
  const amt = Math.max(0, Math.round(Number(amountSats) || 0));
  if (amt <= 0) throw new Error("nothing to withdraw");
  return withStoreLock(TIPS_PATH, async () => {
    const store = loadTipStore();
    if (store.pendingWithdraw?.token) return store.pendingWithdraw;
    const { token } = await sendTokenFromStore(TIPS_PATH, amt, {
      includeFees: true,
      alreadyLocked: true,
    });
    const next = loadTipStore();
    next.pendingWithdraw = { token, amountSats: amt, at: Date.now() };
    saveTipStore(next);
    return next.pendingWithdraw;
  });
}

async function cashuMarkWithdrawCopied() {
  return withStoreLock(TIPS_PATH, () => {
    const store = loadTipStore();
    if (!store.pendingWithdraw) return 0;
    const n = store.pendingWithdraw.amountSats;
    store.withdrawnSats += n;
    store.pendingWithdraw = null;
    saveTipStore(store);
    return n;
  });
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
  isPaid: PAYMENTS_MOCK ? mockIsPaid : null, // real mode: paid via POST /api/ecash/pay (push)
  receivePayload: PAYMENTS_MOCK ? null : cashuReceivePayload,
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
  /** Mint fee added on top of each buy-in so the pot lands whole (0 in mock). */
  receiveFeeSats: PAYMENTS_MOCK ? async () => 0 : cashuReceiveFeeSats,
  /** Reserve deducted from the pot before the winner/tip split (0 in mock). */
  sendFeeSats: PAYMENTS_MOCK ? async () => 0 : cashuSendFeeSats,
  /** Current pot wallet balance (mock: unlimited — mock sends never fail). */
  potBalanceSats: PAYMENTS_MOCK ? async () => Number.MAX_SAFE_INTEGER : cashuPotBalanceSats,
  /** Current tip wallet balance (mock: in-memory). */
  tipBalanceSats: PAYMENTS_MOCK ? async () => mockTipBalance : cashuTipBalanceSats,
};

/** Record fresh buy-in proofs into the pot wallet store (real mode). */
export async function depositProofs(freshProofs) {
  if (PAYMENTS_MOCK || !Array.isArray(freshProofs) || !freshProofs.length) return;
  await withStoreLock(PROOFS_PATH, () => {
    const store = loadPotStore();
    store.proofs.push(...freshProofs);
    savePotStore(store);
  });
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
