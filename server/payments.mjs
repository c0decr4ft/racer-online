/**
 * Lightning payments for Event Mode.
 *
 * Production: LNbits backend (env LNBITS_URL + LNBITS_ADMIN_KEY; optional
 * LNBITS_INVOICE_KEY for read/create). Local dev & tests: mock adapter —
 * invoices auto-"pay" themselves after ~3s and payouts are just logged.
 *
 * Dev tip destination: DEV_TIP_LN_ADDRESS (lightning address). When unset,
 * tip payouts are skipped (logged) and the amount stays in the pot wallet.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const LNBITS_URL = (process.env.LNBITS_URL || "").replace(/\/+$/, "");
const LNBITS_ADMIN_KEY = process.env.LNBITS_ADMIN_KEY || "";
const LNBITS_INVOICE_KEY = process.env.LNBITS_INVOICE_KEY || LNBITS_ADMIN_KEY;

/** Mock mode = no LNbits configured. UI shows "dev mode — fake sats". */
export const PAYMENTS_MOCK = !(LNBITS_URL && LNBITS_ADMIN_KEY);

export const DEV_TIP_LN_ADDRESS = (process.env.DEV_TIP_LN_ADDRESS || "").trim();

const PAYOUTS_PATH = join(dirname(fileURLToPath(import.meta.url)), "payouts.json");

/* ---------------- mock adapter ---------------- */

/** @type {Map<string, { amountSats: number, memo: string, createdAt: number, paidAt: number }>} */
const mockInvoices = new Map();

async function mockCreateInvoice({ amountSats, memo }) {
  const paymentHash = randomUUID().replaceAll("-", "");
  mockInvoices.set(paymentHash, { amountSats, memo, createdAt: Date.now(), paidAt: 0 });
  return { paymentHash, paymentRequest: `lnbc${amountSats}n1mock${paymentHash.slice(0, 26)}` };
}

async function mockIsPaid(paymentHash) {
  const inv = mockInvoices.get(paymentHash);
  if (!inv) return false;
  if (!inv.paidAt && Date.now() - inv.createdAt > 3_000) inv.paidAt = Date.now();
  return inv.paidAt > 0;
}

function mockPay({ amountSats, target }) {
  return { paymentHash: randomUUID().replaceAll("-", ""), preimage: `mock-preimage-${randomUUID()}`, amountSats, target };
}

/* ---------------- LNbits adapter ---------------- */

async function lnRequest(path, { method = "GET", key = LNBITS_INVOICE_KEY, body } = {}) {
  const res = await fetch(`${LNBITS_URL}${path}`, {
    method,
    headers: { "X-Api-Key": key, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { detail: text };
  }
  if (!res.ok) throw new Error(`lnbits ${res.status}: ${data?.detail || text}`.slice(0, 200));
  return data;
}

async function lnCreateInvoice({ amountSats, memo }) {
  const data = await lnRequest("/api/v1/payments", {
    method: "POST",
    body: { out: false, amount: amountSats, memo, unit: "sat", expiry: 3600 },
  });
  return { paymentHash: data.payment_hash, paymentRequest: data.payment_request };
}

async function lnIsPaid(paymentHash) {
  try {
    const data = await lnRequest(`/api/v1/payments/${paymentHash}`);
    return !!data.paid;
  } catch {
    return false;
  }
}

/** Pay a BOLT11 invoice from the pot wallet. */
async function lnPayInvoice(bolt11) {
  const data = await lnRequest("/api/v1/payments", {
    method: "POST",
    key: LNBITS_ADMIN_KEY,
    body: { out: true, bolt11 },
  });
  return { paymentHash: data.payment_hash, preimage: data.payment_proof || data.preimage || "" };
}

/** Pay a lightning address (user@domain) — LNURL-pay flow, then pay the invoice. */
async function lnPayAddress(address, amountSats, comment) {
  const [name, domain] = String(address).trim().split("@");
  if (!name || !domain) throw new Error("bad lightning address");
  const metaRes = await fetch(`https://${domain}/.well-known/lnurlp/${encodeURIComponent(name)}`);
  if (!metaRes.ok) throw new Error("lightning address lookup failed");
  const meta = await metaRes.json();
  if (meta?.tag !== "payRequest" || !meta.callback) throw new Error("address is not payable");
  const msats = amountSats * 1000;
  if (msats < Number(meta.minSendable) || msats > Number(meta.maxSendable)) {
    throw new Error(`amount out of range (${meta.minSendable}-${meta.maxSendable} msat)`);
  }
  const cb = new URL(meta.callback);
  cb.searchParams.set("amount", String(msats));
  if (comment && meta.commentAllowed && comment.length <= Number(meta.commentAllowed)) {
    cb.searchParams.set("comment", comment);
  }
  const invRes = await fetch(cb);
  if (!invRes.ok) throw new Error("invoice callback failed");
  const inv = await invRes.json();
  if (!inv?.pr) throw new Error("no invoice from callback");
  return lnPayInvoice(inv.pr);
}

/* ---------------- unified surface ---------------- */

export const payments = {
  mock: PAYMENTS_MOCK,
  createInvoice: PAYMENTS_MOCK ? mockCreateInvoice : lnCreateInvoice,
  isPaid: PAYMENTS_MOCK ? mockIsPaid : lnIsPaid,
  payInvoice: PAYMENTS_MOCK ? (bolt11) => mockPay({ amountSats: 0, target: bolt11 }) : lnPayInvoice,
  payAddress: PAYMENTS_MOCK
    ? (address, amountSats) => mockPay({ amountSats, target: address })
    : lnPayAddress,
};

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
