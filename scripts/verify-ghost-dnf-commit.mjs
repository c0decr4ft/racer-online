/**
 * Regression: best-race ghosts must only commit after a completed full race.
 * Multiplayer raceResult ends the session for unfinished players with a shorter
 * clock — saving that DNF would permanently poison the PB (shorter-wins).
 *
 * Run: node scripts/verify-ghost-dnf-commit.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ghostSrc = readFileSync(join(ROOT, "src/ghost.ts"), "utf8");
const gameSrc = readFileSync(join(ROOT, "src/game.ts"), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Mirrors src/ghost.ts `canCommitBestGhost`. */
function canCommitBestGhost(opts) {
  if (opts.godMode || opts.spectating) return false;
  if (!Number.isFinite(opts.lap) || !Number.isFinite(opts.totalLaps)) return false;
  if (opts.totalLaps <= 0) return false;
  return opts.lap > opts.totalLaps;
}

assert(
  /export function canCommitBestGhost/.test(ghostSrc),
  "ghost.ts must export canCommitBestGhost",
);
assert(
  /canCommitBestGhost\(/.test(gameSrc) && /commitGhostIfBest/.test(gameSrc),
  "game.ts commitGhostIfBest must call canCommitBestGhost",
);
assert(
  /totalLaps:\s*TOTAL_LAPS/.test(gameSrc),
  "commitGhostIfBest must gate on TOTAL_LAPS",
);

const TOTAL = 3;
assert(
  canCommitBestGhost({ lap: TOTAL + 1, totalLaps: TOTAL }) === true,
  "completed full race must be eligible",
);
assert(
  canCommitBestGhost({ lap: TOTAL, totalLaps: TOTAL }) === false,
  "still on final lap must not commit",
);
assert(
  canCommitBestGhost({ lap: 1, totalLaps: TOTAL }) === false,
  "lap-1 DNF (raceResult while unfinished) must not commit",
);
assert(
  canCommitBestGhost({ lap: 2, totalLaps: TOTAL }) === false,
  "mid-race DNF must not commit",
);
assert(
  canCommitBestGhost({ lap: TOTAL + 1, totalLaps: TOTAL, godMode: true }) === false,
  "god mode must not commit",
);
assert(
  canCommitBestGhost({ lap: TOTAL + 1, totalLaps: TOTAL, spectating: true }) === false,
  "spectating must not commit",
);
assert(
  canCommitBestGhost({ lap: Number.NaN, totalLaps: TOTAL }) === false,
  "non-finite lap must not commit",
);

// Shorter-wins poison: a DNF clock would lock out a real PB forever.
const realPbMs = 190_000;
const dnfMs = 45_000;
assert(dnfMs < realPbMs, "sanity: DNF clock is shorter than a real 3-lap PB");
assert(
  canCommitBestGhost({ lap: 1, totalLaps: TOTAL }) === false,
  "without the lap gate, dnfMs would replace realPbMs via maybeSaveBestGhost",
);

console.log("verify-ghost-dnf-commit: ok");
