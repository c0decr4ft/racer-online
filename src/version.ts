/**
 * In-game display version — full semver, e.g. `1.0.0`.
 * Badge shows `v${GAME_VERSION}` → `v1.0.0`.
 *
 * Keep package.json "version" identical.
 * Also list this id in public/versions.json (path `/racer-online/` for latest).
 *
 * Bump on each release commit — increment the PATCH (third) number by 1:
 *   1.0.0 → 1.0.1 → 1.0.2 → …
 * Use minor/major only for intentional larger releases (1.1.0, 2.0.0, …).
 */
export const GAME_VERSION = "1.0.3";
