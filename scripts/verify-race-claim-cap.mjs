/**
 * Regression: Event Mode race claimPot must not drain wallet surplus left by
 * async/failed lobby buy-in refunds. Mirrors server/index.mjs raceClaimWinnerSats.
 *
 * Run: node scripts/verify-race-claim-cap.mjs
 */

const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
};

/** Must stay in sync with server/index.mjs `raceClaimWinnerSats`. */
function raceClaimWinnerSats(potSats, tipSats, remaining, perSendFee) {
  const accounted = Math.max(0, Math.round(Number(potSats) || 0));
  const tip = Math.max(0, Math.round(Number(tipSats) || 0));
  const bal = Math.max(0, Math.round(Number(remaining) || 0));
  const fee = Math.max(0, Math.round(Number(perSendFee) || 0));
  const maxFromAccount = Math.max(0, accounted - tip);
  return Math.max(0, Math.min(maxFromAccount, Math.max(0, bal - fee)));
}

/** Pre-fix bug: winner took the entire wallet balance minus fee. */
function buggyWinnerSats(remaining, perSendFee) {
  return Math.max(0, remaining - perSendFee);
}

// Scenario: A and B each paid 100. A left lobby; refund still in flight / failed.
// Host started with only B → room.potSats = 100. Wallet still holds 200.
{
  const potSats = 100;
  const tipSats = 0;
  const remaining = 200;
  const fee = 0;
  const fixed = raceClaimWinnerSats(potSats, tipSats, remaining, fee);
  const buggy = buggyWinnerSats(remaining, fee);
  check("surplus buy-in not paid to winner", fixed === 100, `got ${fixed}`);
  check("pre-fix drained leaver sats", buggy === 200, `buggy=${buggy}`);
  check("surplus stays in pot for refund/rescue", remaining - fixed === 100);
}

// Tip already collected (10% of accounted 100) — winner capped to 90, not 190.
{
  const fixed = raceClaimWinnerSats(100, 10, 200, 0);
  check("tip then surplus still caps winner", fixed === 90, `got ${fixed}`);
}

// Wallet short vs accounted pot — pay what remains after fee.
{
  const fixed = raceClaimWinnerSats(100, 0, 40, 2);
  check("short wallet respects balance-fee", fixed === 38, `got ${fixed}`);
}

// Send fee reserved from balance; accounted pot still caps.
{
  const fixed = raceClaimWinnerSats(100, 0, 200, 2);
  check("fee does not unlock surplus", fixed === 100, `got ${fixed}`);
}

// Normal happy path: balance matches accounted pot.
{
  const fixed = raceClaimWinnerSats(100, 5, 100, 1);
  check("normal claim after tip+fee", fixed === 95, `got ${fixed}`);
}

// Zero / garbage inputs stay non-negative.
{
  check("NaN pot → 0", raceClaimWinnerSats(NaN, 0, 50, 0) === 0);
  check("negative remaining → 0", raceClaimWinnerSats(100, 0, -5, 0) === 0);
}

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nAll race claim cap checks passed.");
