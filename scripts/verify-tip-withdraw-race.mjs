/**
 * Regression: tip withdraw must attach pendingWithdraw in the same locked save
 * as the send. An unlocked follow-up RMW can load a stale snapshot and wipe tip
 * proofs that landed from a concurrent collectTip / receiveTipToken.
 *
 * Run: node scripts/verify-tip-withdraw-race.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const paymentsSrc = readFileSync(join(DIR, "..", "server", "payments.mjs"), "utf8");
const indexSrc = readFileSync(join(DIR, "..", "server", "index.mjs"), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Mirror of the store-tail lock used in payments.mjs. */
function makeLock() {
  let tail = Promise.resolve();
  return (fn) => {
    const run = tail.catch(() => {}).then(fn);
    tail = run.then(
      () => {},
      () => {},
    );
    return run;
  };
}

/**
 * Broken pre-fix shape: send under lock, then unlocked load/mutate/save for
 * pendingWithdraw — concurrent tip deposit can be clobbered.
 */
async function brokenWithdrawRace() {
  const withLock = makeLock();
  let disk = { proofs: [{ id: "old", amount: 100 }], pendingWithdraw: null };
  let releaseCollect;
  const collectGate = new Promise((resolve) => {
    releaseCollect = resolve;
  });

  const withdraw = withLock(async () => {
    disk = { ...disk, proofs: [] };
    return "cashu-withdraw-100";
  }).then(async (token) => {
    // Stale snapshot taken after send, before concurrent tip collect finishes.
    const next = { ...disk };
    releaseCollect();
    await new Promise((r) => setTimeout(r, 0));
    next.pendingWithdraw = { token, amountSats: 100, at: Date.now() };
    disk = next; // writes back empty proofs → wipes tip
    return disk.pendingWithdraw;
  });

  await collectGate;
  await withLock(async () => {
    disk = {
      ...disk,
      proofs: [...disk.proofs, { id: "tip", amount: 10 }],
    };
  });
  await withdraw;
  return disk;
}

/** Fixed shape: pendingWithdraw written inside the same locked critical section. */
async function fixedWithdrawRace() {
  const withLock = makeLock();
  let disk = { proofs: [{ id: "old", amount: 100 }], pendingWithdraw: null };
  let releaseCollect;
  const collectGate = new Promise((resolve) => {
    releaseCollect = resolve;
  });

  const withdraw = withLock(async () => {
    const token = "cashu-withdraw-100";
    disk = {
      proofs: [],
      pendingWithdraw: { token, amountSats: 100, at: Date.now() },
    };
    releaseCollect();
    await new Promise((r) => setTimeout(r, 0));
    return disk.pendingWithdraw;
  });

  await collectGate;
  await withLock(async () => {
    disk = {
      ...disk,
      proofs: [...disk.proofs, { id: "tip", amount: 10 }],
    };
  });
  await withdraw;
  return disk;
}

try {
  assert(
    /asPendingWithdraw\s*[=:]/.test(paymentsSrc),
    "sendTokenFromStore must support asPendingWithdraw",
  );
  assert(
    /asPendingWithdraw:\s*true/.test(paymentsSrc),
    "cashuWithdrawTip must pass asPendingWithdraw: true",
  );
  assert(
    !/const next = loadTipStore\(\);\s*next\.pendingWithdraw/.test(paymentsSrc),
    "cashuWithdrawTip must not unlocked-RMW pendingWithdraw after send",
  );
  assert(
    /async function cashuMarkWithdrawCopied/.test(paymentsSrc) &&
      /withStoreLock\(\s*TIPS_PATH/.test(paymentsSrc),
    "cashuMarkWithdrawCopied must run under TIPS_PATH store lock",
  );
  assert(
    /await payments\.markWithdrawCopied\(\)/.test(indexSrc),
    "index.mjs must await markWithdrawCopied",
  );

  const broken = await brokenWithdrawRace();
  assert(
    !broken.proofs.some((p) => p.id === "tip"),
    "sanity: broken interleaving must wipe the concurrent tip proof",
  );

  const fixed = await fixedWithdrawRace();
  assert(fixed.pendingWithdraw?.token === "cashu-withdraw-100", "fixed keeps pending withdraw");
  assert(
    fixed.proofs.some((p) => p.id === "tip" && p.amount === 10),
    "fixed must preserve tip proofs that land alongside withdraw",
  );

  console.log("verify-tip-withdraw-race: PASS");
} catch (err) {
  console.error("verify-tip-withdraw-race: FAIL", err?.message || err);
  process.exitCode = 1;
}
