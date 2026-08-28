/**
 * Guard: tip-wallet disk failures must not report collected:true / drop secrets.
 * Mirrors the save-check control flow in server/payments.mjs.
 *
 * Run: node scripts/verify-tip-persist-check.mjs
 */
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync as readSrc } from "node:fs";

const tipDir = mkdtempSync(join(tmpdir(), "racer-tip-persist-"));
const tipsPath = join(tipDir, "cashu-tips.json");

function emptyFile() {
  writeFileSync(
    tipsPath,
    JSON.stringify({
      mintUrl: "https://mint.cubabitcoin.org",
      proofs: [],
      withdrawnSats: 0,
      pendingWithdraw: null,
      receivedIds: [],
      logs: [],
      roomName: "",
    }),
  );
}

function saveStore(path, store, { fail = false } = {}) {
  if (fail) return false;
  try {
    writeFileSync(path, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

/** Same branch shape as cashuCollectTip after mint receive. */
function collectAfterReceive(fresh, { failSave }) {
  const store = { proofs: [] };
  store.proofs.push(...fresh);
  if (!saveStore(tipsPath, store, { fail: failSave })) {
    const err = new Error("could not persist tip proofs to disk");
    err.fresh = fresh;
    throw err;
  }
  return { sats: fresh.reduce((a, p) => a + Number(p.amount), 0), collected: true };
}

function handleCollectFailure(err, originalToken, amountSats) {
  let retryToken = originalToken;
  let sats = amountSats;
  if (err?.fresh) {
    sats = err.fresh.reduce((a, p) => a + Number(p.amount), 0);
    retryToken = `cashu-emergency-${sats}`;
  }
  return { sats, collected: false, token: retryToken };
}

function receiveAfterSwap(fresh, { failSave }) {
  const store = { proofs: [] };
  store.proofs.push(...fresh);
  if (!saveStore(tipsPath, store, { fail: failSave })) {
    const err = new Error("could not persist tip proofs to disk");
    err.emergencyToken = `cashu-emergency-${fresh.reduce((a, p) => a + Number(p.amount), 0)}`;
    throw err;
  }
  return fresh.reduce((a, p) => a + Number(p.amount), 0);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

try {
  const src = readSrc(new URL("../server/payments.mjs", import.meta.url), "utf8");
  assert(
    /if\s*\(\s*!saveTipStore\s*\(\s*store\s*\)\s*\)/.test(src),
    "payments.mjs must check saveTipStore return in tip paths",
  );
  assert(src.includes("err.fresh"), "cashuCollectTip must retain fresh proofs on persist failure");
  assert(src.includes("emergencyToken"), "cashuReceiveTipToken must expose emergencyToken on persist failure");

  const idx = readSrc(new URL("../server/index.mjs", import.meta.url), "utf8");
  assert(idx.includes("emergencyToken"), "index.mjs must handle receiveTipToken emergencyToken");

  const fresh = [{ amount: 7, secret: "s1" }];

  emptyFile();
  const ok = collectAfterReceive(fresh, { failSave: false });
  assert(ok.collected === true && ok.sats === 7, "successful save reports collected");
  assert(JSON.parse(readFileSync(tipsPath, "utf8")).proofs.length === 1, "proofs landed on disk");

  emptyFile();
  let failed;
  try {
    collectAfterReceive(fresh, { failSave: true });
  } catch (err) {
    failed = err;
  }
  assert(failed?.fresh?.length === 1, "persist failure keeps fresh");
  const retry = handleCollectFailure(failed, "cashu-spent-original", 7);
  assert(retry.collected === false, "must not report collected:true when save fails");
  assert(retry.token === "cashu-emergency-7", "must hand back re-encoded retry bearer");
  assert(JSON.parse(readFileSync(tipsPath, "utf8")).proofs.length === 0, "failed save leaves disk empty");

  emptyFile();
  let recvErr;
  try {
    receiveAfterSwap(fresh, { failSave: true });
  } catch (err) {
    recvErr = err;
  }
  assert(recvErr?.emergencyToken === "cashu-emergency-7", "receiveTipToken exposes emergencyToken");
  assert(JSON.parse(readFileSync(tipsPath, "utf8")).proofs.length === 0, "receive persist fail leaves disk empty");

  console.log("verify-tip-persist-check: PASS");
} catch (err) {
  console.error("verify-tip-persist-check: FAIL", err?.message || err);
  process.exitCode = 1;
} finally {
  try {
    rmSync(tipDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
