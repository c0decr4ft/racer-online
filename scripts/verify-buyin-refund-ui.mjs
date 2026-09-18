/**
 * Buy-in refund UI must not claim clipboard success when write failed.
 * Keep shared/buyInRefundUi.mjs in sync with src/net/buyInRefundUi.ts.
 * Run: node scripts/verify-buyin-refund-ui.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buyInRefundCopyToast,
  buyInRefundStatusText,
} from "../shared/buyInRefundUi.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(
  buyInRefundStatusText(21, true).includes("scan the QR"),
  "token path keeps redeem instructions on screen",
);
assert(
  buyInRefundStatusText(21, true).includes("21"),
  "token path includes sats",
);
assert(
  buyInRefundStatusText(7, false) === "Refunded 7 sats",
  "no-token path reports sats without copy claim",
);
assert(
  buyInRefundCopyToast(true) === "Refund token copied",
  "clipboard ok toast",
);
assert(
  buyInRefundCopyToast(false).includes("Clipboard unavailable"),
  "clipboard fail toast does not claim copied",
);
assert(
  !buyInRefundStatusText(99, true).toLowerCase().includes("token copied"),
  "status text never pretends the token was copied",
);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ts = readFileSync(join(root, "src/net/buyInRefundUi.ts"), "utf8");
const mjs = readFileSync(join(root, "shared/buyInRefundUi.mjs"), "utf8");
for (const needle of [
  "scan the QR or copy the token into cashu.me",
  "Clipboard unavailable — copy the token from the refund panel",
  "Refund token copied",
]) {
  assert(ts.includes(needle), `src/net/buyInRefundUi.ts missing: ${needle}`);
  assert(mjs.includes(needle), `shared/buyInRefundUi.mjs missing: ${needle}`);
}

console.log("verify-buyin-refund-ui: ok");
