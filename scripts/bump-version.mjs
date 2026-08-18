#!/usr/bin/env node
/**
 * Bump the game version by one step (X.Y → X.(Y+1), or (X+1).0 when Y=9).
 *
 * Updates all three version sources in lockstep:
 *   - src/version.ts        GAME_VERSION "X.Y"   (in-game badge)
 *   - package.json          "version": "X.Y.0"   (semver patch-zero)
 *   - public/versions.json  playable-versions manifest (new id at "/racer-online/")
 *
 * The previous latest keeps a manifest entry only when a playable snapshot
 * exists at dist-versions/v{id} (then it points at /racer-online/v{id}/).
 *
 * Usage: node scripts/bump-version.mjs [--dry-run]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

const versionTsPath = join(root, "src/version.ts");
const versionTs = readFileSync(versionTsPath, "utf8");
const current = versionTs.match(/GAME_VERSION\s*=\s*"([^"]+)"/)?.[1];
if (!/^\d+\.\d+$/.test(current || "")) {
  console.error(`Could not read a two-part GAME_VERSION from src/version.ts (got "${current}")`);
  process.exit(1);
}

const [maj, min] = current.split(".").map(Number);
const next = min >= 9 ? `${maj + 1}.0` : `${maj}.${min + 1}`;

const nextVersionTs = versionTs.replace(
  /GAME_VERSION\s*=\s*"[^"]+"/,
  `GAME_VERSION = "${next}"`,
);

const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.version = `${next}.0`;
const nextPkg = `${JSON.stringify(pkg, null, 2)}\n`;

const manifestPath = join(root, "public/versions.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const list = Array.isArray(manifest.versions) ? manifest.versions : [];
const prevLatest = list.find((v) => v && v.path === "/racer-online/");
const entries = [{ id: next, path: "/racer-online/" }];
if (prevLatest && prevLatest.id !== next && existsSync(join(root, "dist-versions", `v${prevLatest.id}`))) {
  entries.push({ id: prevLatest.id, path: `/racer-online/v${prevLatest.id}/` });
}
for (const v of list) {
  if (!v || v === prevLatest || v.id === next) continue;
  entries.push(v);
}
const nextManifest = `${JSON.stringify({ versions: entries }, null, 2)}\n`;

console.log(`Version: ${current} → ${next}`);
if (dryRun) {
  console.log("(dry run — no files written)");
  console.log(nextManifest);
  process.exit(0);
}
writeFileSync(versionTsPath, nextVersionTs);
writeFileSync(pkgPath, nextPkg);
writeFileSync(manifestPath, nextManifest);
console.log("Updated src/version.ts, package.json, public/versions.json");
