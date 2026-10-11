/**
 * Regression: online field reset must rewind the shared wildlife clock.
 *
 * After PR #137, WildlifeHerd.syncShared steps from the race clock via
 * sharedSteps. An all-wreck fieldReset sets raceStart back to 0 while the
 * herd keeps the previous race's sharedSteps. Once GO fires, target ≪
 * sharedSteps so the herd never steps again — animals freeze mid-road and
 * keep applying hit slowdowns.
 *
 * Usage: node scripts/verify-wildlife-field-reset.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const game = readFileSync(join(root, "src/game.ts"), "utf8");
const wildlife = readFileSync(join(root, "src/wildlife.ts"), "utf8");

const failures = [];
function check(ok, what) {
  console.log(`${ok ? "PASS" : "FAIL"} · ${what}`);
  if (!ok) failures.push(what);
}

const resetFn = wildlife.match(
  /resetSharedRace\s*\(\s*\)\s*\{([\s\S]*?)\n  [a-zA-Z]/,
);
check(!!resetFn, "WildlifeHerd.resetSharedRace exists");
check(
  !!resetFn && /this\.sharedSteps\s*=\s*0/.test(resetFn[1]),
  "resetSharedRace zeros sharedSteps",
);
check(
  !!resetFn && /respawnAnimal/.test(resetFn[1]),
  "resetSharedRace respawns animals back to habitat",
);

check(
  /if\s*\(\s*target\s*<\s*this\.sharedSteps\s*\)\s*this\.resetSharedRace\s*\(/.test(wildlife),
  "syncShared rewinds when the race clock goes backwards",
);

const fieldReset = game.match(
  /private applyOnlineFieldReset\s*\(\s*\)\s*\{([\s\S]*?)\n  \}/,
);
check(!!fieldReset, "applyOnlineFieldReset exists");
check(
  !!fieldReset && /this\.wildlife\?\.resetSharedRace\s*\(/.test(fieldReset[1]),
  "applyOnlineFieldReset calls wildlife.resetSharedRace before countdown",
);

/** Pure clock helper — mirrors syncShared's rewind condition. */
function wouldFreeze(sharedSteps, elapsedSec) {
  const target = Math.floor(Math.max(0, elapsedSec) / 0.05);
  return target < sharedSteps;
}

check(wouldFreeze(2_000, 0.1) === true, "stale sharedSteps vs rewound clock would freeze");
check(wouldFreeze(0, 1.0) === false, "fresh herd after reset would not freeze");
check(wouldFreeze(20, 1.0) === false, "caught-up herd stays live");

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nAll wildlife field-reset checks passed.");
