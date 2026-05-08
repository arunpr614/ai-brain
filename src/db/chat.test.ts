import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./chat.test.setup";
import {
  appendMessage,
  createThread,
  deleteThread,
  getThread,
  listMessages,
  listThreads,
  renameThread,
} from "./chat";
import { insertCaptured } from "./items";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

test("createThread defaults to scope=library, returns row with created_at", () => {
  const t = createThread();
  assert.equal(t.scope, "library");
  assert.equal(t.item_id, null);
  assert.equal(t.title, null);
  assert.ok(t.created_at > 0);
  assert.ok(getThread(t.id));
});

test("createThread scope=item requires item_id and stores it", () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Chat target",
    body: "body",
  });
  const t = createThread({ scope: "item", item_id: item.id, title: "About item" });
  assert.equal(t.scope, "item");
  assert.equal(t.item_id, item.id);
  assert.equal(t.title, "About item");
});

test("appendMessage updates thread.updated_at and stores citations JSON", async () => {
  const t = createThread();
  const pre = getThread(t.id)!;
  await new Promise((r) => setTimeout(r, 5));
  const m = appendMessage({
    thread_id: t.id,
    role: "assistant",
    content: "hello",
    citations: [
      { chunk_id: "c1", item_id: "i1", item_title: "T", similarity: 0.8 },
    ],
  });
  const post = getThread(t.id)!;
  assert.ok(post.updated_at > pre.updated_at, "updated_at bumps");
  assert.equal(m.role, "assistant");
  assert.match(m.citations ?? "", /"c1"/);
});

test("listMessages returns in ascending created_at", () => {
  const t = createThread();
  appendMessage({ thread_id: t.id, role: "user", content: "one" });
  appendMessage({ thread_id: t.id, role: "assistant", content: "two" });
  appendMessage({ thread_id: t.id, role: "user", content: "three" });
  const msgs = listMessages(t.id);
  assert.deepEqual(
    msgs.map((m) => m.content),
    ["one", "two", "three"],
  );
});

test("listThreads filters by scope and item_id", () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Filter target",
    body: "body",
  });
  const lib = createThread({ title: "lib-a" });
  createThread({ scope: "item", item_id: item.id, title: "per-item" });

  const libs = listThreads({ scope: "library" });
  assert.ok(libs.some((t) => t.id === lib.id));
  assert.ok(libs.every((t) => t.scope === "library"));

  const perItem = listThreads({ item_id: item.id });
  assert.equal(perItem.length, 1);
  assert.equal(perItem[0].item_id, item.id);
});

test("renameThread updates title", () => {
  const t = createThread();
  renameThread(t.id, "Renamed");
  assert.equal(getThread(t.id)!.title, "Renamed");
});

test("deleteThread cascades to messages", () => {
  const t = createThread();
  appendMessage({ thread_id: t.id, role: "user", content: "x" });
  deleteThread(t.id);
  assert.equal(getThread(t.id), null);
  assert.deepEqual(listMessages(t.id), []);
});
