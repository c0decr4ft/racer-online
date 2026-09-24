/**
 * Verify prunePayoutsList never drops uncollected tipToken custody rows
 * when capping payouts.json history.
 */
import { prunePayoutsList, hasPendingTipCustody } from "../server/payments.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const custody = {
  at: 1,
  room: "old-room",
  tipSats: 7,
  collected: false,
  tipToken: "cashuAsecret-custody-token",
  mock: false,
};

const filler = (n) =>
  Array.from({ length: n }, (_, i) => ({
    at: 100 + i,
    room: `r${i}`,
    tipSats: 1,
    collected: true,
    tipToken: null,
    mock: false,
  }));

// 1) Custody older than the 200-window must survive.
{
  const list = [custody, ...filler(200)];
  const pruned = prunePayoutsList(list, 200);
  assert(pruned.length === 201, `expected 201 rows, got ${pruned.length}`);
  assert(
    pruned.some((r) => r.tipToken === custody.tipToken),
    "custody tipToken dropped by prune",
  );
  assert(hasPendingTipCustody(custody), "custody detector false negative");
}

// 2) Collected / mock / empty-token rows outside the window may drop.
{
  const droppable = [
    { at: 1, tipSats: 5, collected: true, tipToken: "cashuAgone", mock: false },
    { at: 2, tipSats: 5, collected: false, tipToken: "cashuAmock", mock: true },
    { at: 3, tipSats: 5, collected: false, tipToken: "", mock: false },
    { at: 4, tipSats: 0, collected: false, tipToken: "cashuAzero", mock: false },
  ];
  const list = [...droppable, ...filler(200)];
  const pruned = prunePayoutsList(list, 200);
  assert(pruned.length === 200, `expected exactly 200, got ${pruned.length}`);
  for (const row of droppable) {
    assert(!pruned.includes(row), "droppable row retained");
  }
}

// 3) Duplicate tipToken already in the newest window — do not double-keep.
{
  const list = [custody, ...filler(199), { ...custody, at: 999 }];
  const pruned = prunePayoutsList(list, 200);
  const hits = pruned.filter((r) => r.tipToken === custody.tipToken);
  assert(hits.length === 1, `expected one custody copy, got ${hits.length}`);
  assert(hits[0].at === 999, "should keep the newer custody copy in-window");
}

console.log("verify-payouts-prune: ok");
