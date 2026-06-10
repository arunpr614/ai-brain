import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./telegram-updates.test.setup";
import { insertCaptured } from "./items";
import {
  claimTelegramUpdate,
  findTelegramDocumentByUniqueId,
  getTelegramUpdate,
  markTelegramUpdateCaptured,
  markTelegramUpdateFailed,
  markTelegramUpdateIgnored,
} from "./telegram-updates";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

test("claimTelegramUpdate inserts once and treats repeats as duplicates", () => {
  assert.equal(
    claimTelegramUpdate({
      update_id: 101,
      message_id: 5,
      chat_id: 1,
      from_id: 2,
      file_unique_id: "file-1",
    }),
    "claimed",
  );
  assert.equal(claimTelegramUpdate({ update_id: 101 }), "duplicate");
  const row = getTelegramUpdate(101);
  assert.equal(row?.status, "received");
  assert.equal(row?.file_unique_id, "file-1");
});

test("mark helpers update telegram update status", () => {
  claimTelegramUpdate({ update_id: 201 });
  markTelegramUpdateIgnored(201, "command:/help");
  assert.equal(getTelegramUpdate(201)?.status, "ignored");
  assert.equal(getTelegramUpdate(201)?.error, "command:/help");

  claimTelegramUpdate({ update_id: 202 });
  markTelegramUpdateFailed(202, "timeout");
  assert.equal(getTelegramUpdate(202)?.status, "failed");
  assert.equal(getTelegramUpdate(202)?.error, "timeout");
});

test("findTelegramDocumentByUniqueId returns previously captured item", () => {
  const item = insertCaptured({
    source_type: "pdf",
    capture_source: "telegram",
    title: "Telegram PDF",
    body: "pdf body",
  });
  claimTelegramUpdate({ update_id: 301, file_unique_id: "same-file" });
  markTelegramUpdateCaptured(301, item.id);
  const existing = findTelegramDocumentByUniqueId("same-file");
  assert.equal(existing?.id, item.id);
  assert.equal(existing?.capture_source, "telegram");
});
