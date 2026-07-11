import assert from "node:assert/strict";
import { test } from "node:test";
import { formatRecallCounts, formatRecallIst } from "./manual-sync-contract";

test("Recall absolute times use the fixed IST calendar independent of process timezone", () => {
  const now = Date.parse("2026-07-10T20:30:00.000Z"); // 11 Jul, 2:00 AM IST
  assert.equal(formatRecallIst("2026-07-10T20:08:00.000Z", now), "Today, 1:38 AM IST");
  assert.equal(formatRecallIst("2026-07-10T18:12:00.000Z", now), "Yesterday, 11:42 PM IST");
  assert.equal(formatRecallIst("2026-07-08T20:08:00.000Z", now), "9 Jul 2026, 1:38 AM IST");
  assert.equal(formatRecallIst(null, now), "Not yet synced");
});

test("Recall aggregate copy pluralizes and omits zero clauses", () => {
  assert.equal(formatRecallCounts({ imported: 1, upgraded: 0, alreadyCurrent: 2 }), "1 item imported · 2 items already current");
  assert.equal(formatRecallCounts({ imported: 0, upgraded: 0, alreadyCurrent: 0 }), "");
});
