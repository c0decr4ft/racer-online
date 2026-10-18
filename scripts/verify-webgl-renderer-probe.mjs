/**
 * Regression for 7e0a3b9 createGameRenderer: throwaway probe treated a WebGL1
 * success as proof that attrs would boot THREE (webgl2-only). On GPUs where
 * webgl2+antialias fails but webgl1+antialias works, the probe picked the first
 * attempt, THREE locked the game canvas via its bare getContext diagnostic, and
 * later fallbacks never ran → GRAPHICS ERROR / unwired menus.
 *
 * Run: npm run test:webgl-renderer-probe
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "src/perfQuality.ts"), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(/export function createGameRenderer/.test(src), "createGameRenderer must exist");
assert(
  /getContext\("webgl2"/.test(src) && /context:\s*gl/.test(src),
  "createGameRenderer must bind webgl2 and pass context into THREE",
);
assert(
  !/getContext\("webgl2"[^)]*\)\s*\|\|\s*[\s\S]*?getContext\("webgl"/.test(
    src.slice(src.indexOf("export function createGameRenderer")),
  ),
  "createGameRenderer must not fall back to webgl1 when probing attrs",
);
assert(
  !/function glContextWorks/.test(src),
  "throwaway glContextWorks probe must be gone (webgl1 false-positive path)",
);

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-gpu", "--no-sandbox"],
});
const page = await browser.newPage();

const result = await page.evaluate(async () => {
  /** Old 7e0a3b9 probe: webgl2 || webgl on throwaway. */
  function oldProbeWorks(attrs) {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2", attrs) || c.getContext("webgl", attrs);
    if (!gl || gl.isContextLost()) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  }

  /** Fixed: webgl2 only, bind on the real canvas, null = retry next attrs. */
  function newPickAndBind(canvas, attempts) {
    for (const attrs of attempts) {
      const gl = canvas.getContext("webgl2", attrs);
      if (!gl || gl.isContextLost()) continue;
      return { ok: true, attrs, gl };
    }
    return { ok: false, attrs: null, gl: null };
  }

  /** THREE r185 diagnostic trap when it owns getContext. */
  function threeLikeOwnGetContext(canvas, attrs) {
    const contextAttributes = {
      alpha: true,
      depth: attrs.depth ?? true,
      stencil: attrs.stencil ?? false,
      antialias: !!attrs.antialias,
      powerPreference: attrs.powerPreference || "default",
      failIfMajorPerformanceCaveat: !!attrs.failIfMajorPerformanceCaveat,
    };
    let gl = canvas.getContext("webgl2", contextAttributes);
    if (gl === null) {
      if (canvas.getContext("webgl2")) {
        return { ok: false, locked: true, reason: "attrs-rejected-bare-bound" };
      }
      return { ok: false, locked: false, reason: "no-webgl2" };
    }
    return { ok: true, locked: false, reason: "webgl2" };
  }

  const attempts = [
    {
      antialias: true,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
      alpha: false,
      stencil: false,
      depth: true,
    },
    {
      antialias: false,
      powerPreference: "default",
      failIfMajorPerformanceCaveat: false,
      alpha: false,
      stencil: false,
      depth: true,
    },
    {
      antialias: false,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: false,
      alpha: false,
      stencil: false,
      depth: true,
    },
  ];

  // Force: webgl2 + antialias:true always fails; webgl1 + same attrs works;
  // webgl2 without antialias works. Mirrors weak iGPU / partial MSAA drivers.
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    if (type === "webgl2" && attrs && attrs.antialias === true) return null;
    return orig.call(this, type, attrs);
  };

  let chosenOld = attempts[attempts.length - 1];
  for (const a of attempts) {
    if (oldProbeWorks(a)) {
      chosenOld = a;
      break;
    }
  }
  const oldCanvas = document.createElement("canvas");
  const oldCreate = threeLikeOwnGetContext(oldCanvas, chosenOld);

  const newCanvas = document.createElement("canvas");
  const picked = newPickAndBind(newCanvas, attempts);

  HTMLCanvasElement.prototype.getContext = orig;

  return {
    chosenOldAntialias: !!chosenOld.antialias,
    oldCreate,
    newOk: picked.ok,
    newAntialias: picked.attrs ? !!picked.attrs.antialias : null,
  };
});

await browser.close();

assert(
  result.chosenOldAntialias === true,
  "repro: old probe must false-accept first attempt via webgl1",
);
assert(
  result.oldCreate.ok === false && result.oldCreate.locked === true,
  `repro: old path must lock canvas via THREE diagnostic (got ${JSON.stringify(result.oldCreate)})`,
);
assert(result.newOk === true, "fixed path must bind webgl2 on a later attempt");
assert(
  result.newAntialias === false,
  "fixed path must land on antialias:false fallback, not the webgl1 false positive",
);

console.log("PASS  webgl-renderer-probe — webgl1 false positive no longer blocks webgl2 fallbacks");
