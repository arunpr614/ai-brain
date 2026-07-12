import assert from "node:assert/strict";
import { test } from "node:test";
import { backupFilename } from "./backup";

test("consecutive startup backups in the same millisecond receive distinct safe names", () => {
  const now = new Date("2026-07-12T09:30:15.123Z");
  const first = backupFilename(now, "000000000001");
  const second = backupFilename(now, "000000000002");
  assert.notEqual(first, second);
  assert.match(first, /^2026-07-12_\d{6}_123_[a-f0-9]{12}\.sqlite$/);
  assert.match(second, /^2026-07-12_\d{6}_123_[a-f0-9]{12}\.sqlite$/);
});
