/**
 * Regression: online wildlife must stay on the shared clock.
 *
 * After PR #137, WildlifeHerd.syncShared steps from a race clock via
 * sharedSteps. Three paths broke that guarantee:
 *
 * 1. Countdown fell through to unsynced update() (local dt/FPS), burning the
 *    seeded RNG before GO so clients diverged from frame one.
 * 2. Elapsed used pause-adjusted raceNow() — Esc freeze left this client's
 *    herd behind peers permanently.
 * 3. Field reset / rematch rewound elapsed while sharedSteps stayed high →
 *    target ≪ sharedSteps → animals froze mid-road (also PR #140).
 *
 * Usage: node scripts/verify-wildlife-online-sync.mjs
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

const updateWildlife = game.match(
  /private updateWildlife\s*\(\s*dt:\s*number\s*\)\s*\{([\s\S]*?)\n  \}/,
);
check(!!updateWildlife, "updateWildlife exists");
check(
  !!updateWildlife && /if\s*\(\s*this\.online\s*\)\s*\{/.test(updateWildlife[1]),
  "online path is gated explicitly (no countdown fallthrough to update)",
);
const onlineBranch = updateWildlife?.[1].match(
  /if\s*\(\s*this\.online\s*\)\s*\{([\s\S]*?)\n    \}/,
);
check(
  !!onlineBranch &&
    /this\.wildlife\.syncShared\s*\(/.test(onlineBranch[1]) &&
    !/this\.wildlife\.update\s*\(/.test(onlineBranch[1]),
  "online branch calls syncShared only",
);
check(
  !!updateWildlife && /wildlifeRaceEpoch/.test(updateWildlife[1]),
  "online elapsed uses wildlifeRaceEpoch (not pause-adjusted raceNow)",
);
check(
  !/raceNow\(\)\s*-\s*this\.raceStart/.test(updateWildlife?.[1] ?? ""),
  "updateWildlife no longer uses raceNow()-raceStart for shared wildlife",
);

check(
  /wildlifeRaceEpoch\s*=\s*this\.online\s*\?\s*performance\.now\(\)/.test(game),
  "releaseGrid stamps wildlifeRaceEpoch at GO from performance.now",
);

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
check(
  !!fieldReset && /wildlifeRaceEpoch\s*=\s*0/.test(fieldReset[1]),
  "applyOnlineFieldReset clears wildlifeRaceEpoch until next GO",
);

/** Pure clock helper — mirrors syncShared's rewind condition. */
function wouldFreeze(sharedSteps, elapsedSec) {
  const target = Math.floor(Math.max(0, elapsedSec) / 0.05);
  return target < sharedSteps;
}

check(wouldFreeze(2_000, 0.1) === true, "stale sharedSteps vs rewound clock would freeze");
check(wouldFreeze(0, 1.0) === false, "fresh herd after reset would not freeze");

/** Pause must not freeze the shared wildlife clock relative to peers. */
function pausedElapsed(epoch, now, pauseBegan, pauseTotal, paused) {
  // Broken (old): raceNow subtracts pause
  const raceNow = now - pauseTotal - (paused ? now - pauseBegan : 0);
  const broken = (raceNow - epoch) / 1000;
  // Fixed: wall clock from GO
  const fixed = (now - epoch) / 1000;
  return { broken, fixed };
}
const pauseCase = pausedElapsed(1000, 6000, 4000, 0, true);
check(pauseCase.broken === 3, "old pause-adjusted clock freezes at pause start (3s)");
check(pauseCase.fixed === 5, "wall-clock wildlife epoch keeps advancing through pause (5s)");

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nAll wildlife online-sync checks passed.");
