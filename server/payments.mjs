/**
 * Cashu (eCash) payments for Event Mode — replaces the LNbits backend.
 *
 * The server runs a cashu-ts Wallet against CASHU_MINT_URL (default
 * unset → mock mode for dev/tests). Buy-ins arrive as NUT-18 payment-request
 * payloads (POST /api/ecash/pay) or pasted cashuA tokens; the pot pays out as
 * a cashuA token string the winner claims in cashu.me.
 *
 * Money custody note: buy-in value lives as proofs in server/cashu-proofs.json
 * until claimed — that file IS the money. It's gitignored; back it up for
 * real-money events, and use amounts you don't mind losing (Cashu is young).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const CASHU_MINT_URL = (process.env.CASHU_MINT_URL || "").trim().replace(/\/+$/, "");

/** Mock mode = no mint configured. UI shows "dev mode — fake sats". */
export const PAYMENTS_MOCK = !CASHU_MINT_URL;

const DIR = dirname(fileURLToPath(import.meta.url));
const PROOFS_PATH = join(DIR, "cashu-proofs.json");
const PAYOUTS_PATH = join(DIR, "payouts.json");

/* ---------------- proof store (the pot wallet's money) ---------------- */

function loadProofStore() {
  try {
    if (!existsSync(PROOFS_PATH)) return { mintUrl: CASHU_MINT_URL, proofs: [] };
    const data = JSON.parse(readFileSync(PROOFS_PATH, "utf8"));
    if (data?.mintUrl !== CASHU_MINT_URL || !Array.isArray(data?.proofs)) {
      return { mintUrl: CASHU_MINT_URL, proofs: [] };
    }
    // JSON round-trip stringifies amounts — v4 wallets need real bigints
    return {
      mintUrl: CASHU_MINT_URL,
      proofs: data.proofs.map((p) => ({ ...p, amount: BigInt(p.amount ?? 0) })),
    };
  } catch {
    return { mintUrl: CASHU_MINT_URL, proofs: [] };
  }
}

function saveProofStore(store) {
  try {
    // v4 proofs use bigint amounts — JSON can't serialize them without a replacer
    writeFileSync(
      PROOFS_PATH,
      JSON.stringify(store, (key, v) => (typeof v === "bigint" ? v.toString() : v), 2),
    );
  } catch (err) {
    console.error("[cashu] failed to persist proofs — money at risk!", err?.message || err);
  }
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

/* ---------------- mock adapter ---------------- */

const mockInvoices = new Map(); // id → { amountSats, createdAt, paidAt }

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

/** Sum proofs minus the mint's input fees → net spendable sats (v4: amounts are bigint). */
async function netOfFees(wallet, proofs) {
  const gross = proofs.reduce((a, p) => a + BigInt(p.amount), 0n);
  let fees = 0n;
  try {
    fees = BigInt(await wallet.getFeesForProofs(proofs));
  } catch {
    fees = 0n; // mints without fee reporting → assume zero
  }
  return gross - fees;
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
  const wallet = await getWallet();
  if (String(payload.id || "") !== paymentHash) throw new Error("payment id mismatch");
  const mint = String(payload.mint || "").replace(/\/+$/, "");
  if (mint !== CASHU_MINT_URL) throw new Error("wrong mint");
  if (String(payload.unit || "sat").toLowerCase() !== "sat") throw new Error("wrong unit");
  const proofs = Array.isArray(payload.proofs) ? payload.proofs : [];
  const net = await netOfFees(wallet, proofs);
  if (net < BigInt(amountSats)) throw new Error(`underpaid (net ${net} < ${amountSats} sats)`);
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
  const net = await netOfFees(wallet, decoded.proofs);
  if (net < BigInt(amountSats)) throw new Error(`token too small (net ${net} < ${amountSats} sats)`);
  return receiveProofsFromMint(mint, decoded.proofs);
}

/** Pay out sats as a fresh cashuA token string from the pot wallet. */
async function cashuSendToken(amountSats) {
  const wallet = await getWallet();
  const store = loadProofStore();
  const total = store.proofs.reduce((a, p) => a + Number(p.amount), 0);
  if (total < amountSats) throw new Error(`pot wallet short (${total} < ${amountSats} sats)`);
  const { keep, send } = await wallet.send(amountSats, store.proofs);
  saveProofStore({ mintUrl: CASHU_MINT_URL, proofs: keep });
  const { getEncodedToken } = await import("@cashu/cashu-ts");
  return { token: getEncodedToken({ mint: CASHU_MINT_URL, proofs: send }) };
}

/* ---------------- unified surface ---------------- */

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
};

/** Record fresh buy-in proofs into the pot wallet store (real mode). */
export function depositProofs(freshProofs) {
  if (PAYMENTS_MOCK || !Array.isArray(freshProofs) || !freshProofs.length) return;
  const store = loadProofStore();
  store.proofs.push(...freshProofs);
  saveProofStore(store);
}

/** Append a payout attempt to the audit log (gitignored; may contain bearer tokens). */
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
