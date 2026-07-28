/**
 * In-game display version (two-part only), e.g. `1.1`.
 * Badge shows `v${GAME_VERSION}` → `v1.1`.
 *
 * Keep package.json "version" as semver patch-zero: `1.1` → `1.1.0`.
 * Also list this id in public/versions.json (path `/racer-online/` for latest).
 *
 * Bump on each release commit — increment the SECOND number by 1:
 *   1.1 → 1.2 → … → 1.9 → 2.0 → 2.1 → …
 * When the minor hits 9 and bumps: `X.9` → `(X+1).0`.
 */
export const GAME_VERSION = "1.9";
