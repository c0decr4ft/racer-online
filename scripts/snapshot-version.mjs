#!/usr/bin/env node
/**
 * Build a playable version snapshot from the *current* tree for GitHub Pages.
 *
 * Usage:
 *   node scripts/snapshot-version.mjs
 *   node scripts/snapshot-version.mjs 1.5
 *
 * Output: dist-versions/v{id}/  (deploy under /racer-online/v{id}/)
 *
 * After snapshotting, add an entry to public/versions.json, e.g.:
 *   { "id": "1.4", "path": "/racer-online/v1.4/" }
 * and point the newest release at "/racer-online/".
 *
 * Historical builds (freeze an older commit): worktree that commit, graft the
 * version-switcher files from HEAD (versions.ts, main.ts init, index.html UI,
 * style.css switcher rules, public/versions.json), keep that commit's
 * GAME_VERSION, then `npx vite build --base /racer-online/v{id}/ --outDir …`.
 *
 * CI copies dist-versions/v* into the Pages dist and also preserves existing
 * gh-pages v*/ folders so snapshots stay live across orphan deploys.
 */
import { readFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const versionTs = readFileSync(join(root, "src/version.ts"), "utf8");
const fromSource = versionTs.match(/GAME_VERSION\s*=\s*"([^"]+)"/)?.[1];
const id = String(process.argv[2] || fromSource || "").trim();

if (!/^\d+\.\d+$/.test(id)) {
  console.error(`Invalid version id "${id}". Expected two-part like 1.4`);
  process.exit(1);
}

const base = `/racer-online/v${id}/`;
const outDir = join(root, "dist-versions", `v${id}`);

console.log(`Building snapshot v${id} → ${outDir}`);
console.log(`Vite base: ${base}`);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const build = spawnSync("npx", ["vite", "build", "--base", base, "--outDir", outDir], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

// Ensure versions.json is present in the snapshot (copied from public via vite).
const manifest = join(outDir, "versions.json");
if (!existsSync(manifest)) {
  cpSync(join(root, "public/versions.json"), manifest);
}

console.log(`
Done. To publish on Pages:
  1. Copy dist-versions/v${id}/ into the gh-pages tree as v${id}/
     (or merge into dist/ before deploy — CI also preserves existing v*/ folders)
  2. Update public/versions.json so older builds list this path, e.g.
       { "id": "${id}", "path": "/racer-online/v${id}/" }
  3. Keep the newest release path as "/racer-online/"
`);
