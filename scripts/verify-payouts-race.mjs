/**
 * Regression: concurrent payouts.json writers must not wipe sibling tipToken records.
 *
 * Old bug: tip sweep / DEV retry did loadPayouts → await mint → savePayouts(stale).
 * A claimPot recordPayout in the await gap was overwritten — uncollected tip bearer
 * secrets vanished from disk.
 *
 * Usage: node scripts/verify-payouts-race.mjs
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.RACER_PAYMENTS_MOCK = "1";

const DIR = dirname(fileURLToPath(import.meta.url));
const PAYOUTS_PATH = join(DIR, "../server/payouts.json");

let backup = null;
if (existsSync(PAYOUTS_PATH)) backup = readFileSync(PAYOUTS_PATH, "utf8");
function restore() {
  try {
    if (backup == null) unlinkSync(PAYOUTS_PATH);
    else writeFileSync(PAYOUTS_PATH, backup);
  } catch {
    /* ignore */
  }
}

const { recordPayout, loadPayouts, updatePayouts } = await import("../server/payments.mjs");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

try {
  writeFileSync(
    PAYOUTS_PATH,
    JSON.stringify(
      [
        {
          at: 1000,
          room: "sweep-me",
          tipSats: 5,
          tipToken: "cashuA-pending-sweep",
          collected: false,
          mock: false,
        },
      ],
      null,
      2,
    ),
  );

  // --- Demonstrate the OLD unlocked pattern still loses the concurrent claim ---
  {
    const stale = JSON.parse(readFileSync(PAYOUTS_PATH, "utf8"));
    const claim = recordPayout({
      room: "claim-during-sweep",
      tipSats: 3,
      tipToken: "cashuA-new-claim-tip",
      collected: false,
      mock: false,
    });
    // Mid-flight stale mutate (simulates post-await sweep save)
    const mid = sleep(20).then(() => {
      stale[0].collected = true;
      delete stale[0].tipToken;
      writeFileSync(PAYOUTS_PATH, JSON.stringify(stale, null, 2));
    });
    await claim;
    await mid;
    const afterBug = loadPayouts();
    const lost = !afterBug.some((r) => r?.tipToken === "cashuA-new-claim-tip");
    assert(lost, "expected unlocked stale save to wipe concurrent claim (sanity)");
    console.log("PASS  unlocked stale save wipes concurrent claim (baseline)");
  }

  // Reset seed
  writeFileSync(
    PAYOUTS_PATH,
    JSON.stringify(
      [
        {
          at: 1000,
          room: "sweep-me",
          tipSats: 5,
          tipToken: "cashuA-pending-sweep",
          collected: false,
          mock: false,
        },
      ],
      null,
      2,
    ),
  );

  // --- Fixed path: await gap uses updatePayouts (re-read under lock) ---
  {
    const sweep = (async () => {
      const pending = loadPayouts().filter((r) => r && r.tipToken && !r.collected);
      for (const r of pending) {
        const at = Number(r.at);
        await sleep(40); // mint I/O outside the lock
        await updatePayouts((list) => {
          const cur = list.find((x) => x && Number(x.at) === at);
          if (!cur || cur.collected) return;
          cur.collected = true;
          cur.collectedAt = Date.now();
          delete cur.tipToken;
        });
      }
    })();

    await sleep(10);
    await recordPayout({
      room: "claim-during-sweep",
      tipSats: 3,
      tipToken: "cashuA-new-claim-tip",
      collected: false,
      mock: false,
    });
    await sweep;

    const after = loadPayouts();
    const claimKept = after.some((r) => r?.tipToken === "cashuA-new-claim-tip");
    const swept = after.some((r) => Number(r?.at) === 1000 && r.collected === true && !r.tipToken);
    assert(claimKept, "locked update must keep concurrent claim tipToken");
    assert(swept, "sweep must still mark its own tip collected");
    console.log("PASS  updatePayouts keeps concurrent claim tipToken");
  }

  // Two concurrent recordPayouts both land
  {
    writeFileSync(PAYOUTS_PATH, "[]");
    await Promise.all([
      recordPayout({ room: "a", tipSats: 1, tipToken: "tok-a", collected: false, mock: false }),
      recordPayout({ room: "b", tipSats: 2, tipToken: "tok-b", collected: false, mock: false }),
    ]);
    const both = loadPayouts();
    assert(
      both.some((r) => r?.tipToken === "tok-a") && both.some((r) => r?.tipToken === "tok-b"),
      "concurrent recordPayout must keep both rows",
    );
    console.log("PASS  concurrent recordPayout keeps both rows");
  }

  console.log("OK verify-payouts-race");
} catch (err) {
  console.error("FAIL", err?.message || err);
  restore();
  process.exit(1);
}
restore();
