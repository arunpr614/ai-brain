import assert from "node:assert/strict";
import test from "node:test";
import { mergeQueuedNoteSave } from "./save-queue";

test("queued note saves retain manual intent and use the newest operation", () => {
  const manual = mergeQueuedNoteSave(null, { manual: true, operation: "save" });
  assert.deepEqual(
    mergeQueuedNoteSave(manual, { manual: false, operation: "clear" }),
    { manual: true, operation: "clear" },
  );
  assert.deepEqual(
    mergeQueuedNoteSave(
      { manual: true, operation: "clear" },
      { manual: false, operation: "save" },
    ),
    { manual: true, operation: "save" },
  );
});
