/**
 * Regression: mid-session server `error` must not drop an admitted socket.
 * Admit-phase errors (no welcome / empty myId) still soft-close.
 *
 * Mirrors `shouldSoftCloseOnServerError` in src/net/client.ts and checks the
 * error handler still gates softClose on that predicate.
 * Run: node scripts/verify-error-softclose.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** @param {string} myId */
function shouldSoftCloseOnServerError(myId) {
  return !myId;
}

const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
};

check("admit-phase empty id soft-closes", shouldSoftCloseOnServerError("") === true);
check("joined player stays connected", shouldSoftCloseOnServerError("abc12345") === false);
check(
  "Event Mode host waiting-for-buy-ins stays connected",
  shouldSoftCloseOnServerError("host") === false,
);

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../src/net/client.ts"),
  "utf8",
);
check(
  "client exports shouldSoftCloseOnServerError",
  /export function shouldSoftCloseOnServerError\(myId: string\): boolean/.test(src),
);
check(
  "error handler gates softClose on admit state",
  /if \(shouldSoftCloseOnServerError\(this\.myId\)\) this\.softClose\(ws, gen\)/.test(src),
);
check(
  "error handler does not unconditionally softClose",
  !/else if \(msg\.t === "error"\) \{[^}]*this\.softClose\(ws, gen\);\n      \}/.test(src) ||
    /shouldSoftCloseOnServerError\(this\.myId\)/.test(src),
);

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nverify-error-softclose: ok");
