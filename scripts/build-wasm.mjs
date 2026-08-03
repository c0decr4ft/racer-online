import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const cache = resolve(root, ".cache/emscripten");
const output = resolve(root, "public/wasm/vehicle_core.wasm");
mkdirSync(cache, { recursive: true });
mkdirSync(resolve(root, "public/wasm"), { recursive: true });

const args = [
  resolve(root, "cpp/vehicle_core.cpp"),
  "-O3",
  "-std=c++20",
  "-s",
  "STANDALONE_WASM=1",
  "--no-entry",
  "-s",
  'EXPORTED_FUNCTIONS=["_vehicle_step","_vehicle_result_ptr"]',
  "-o",
  output,
];
const run = spawnSync(process.env.EMXX || "em++", args, {
  cwd: root,
  env: { ...process.env, EM_CACHE: cache },
  stdio: "inherit",
});

if (run.error) {
  console.error(`Unable to run Emscripten: ${run.error.message}`);
  process.exit(1);
}
process.exit(run.status ?? 1);
