import "./item-notes.test.setup";

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rmSync } from "node:fs";
import { deleteItem, insertCaptured } from "./items";
import { appendMessage, createThread } from "./chat";
import { getDb } from "./client";
import { insertChunkWithRowid } from "./chunks";
import { EMBED_DIM } from "@/lib/embed/client";
import { setNoteAiDefaultPreference } from "@/lib/notes/default-ai-policy";
import {
  deleteItemNote,
  getItemNote,
  ItemNoteError,
  listItemNoteRevisions,
  restoreItemNoteRevision,
  saveItemNote,
  searchItemNotes,
  setItemNoteAiPolicy,
} from "./item-notes";
import { TEST_DB_DIR } from "./item-notes.test.setup";

after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

function fixture(label: string) {
  return insertCaptured({
    source_type: "url",
    title: `Item ${label}`,
    body: "Captured source stays separate.",
    source_url: `https://example.com/${label}`,
  });
}

test("opening an item does not create a blank note", () => {
  const item = fixture("blank-open");
  assert.deepEqual(getItemNote(item.id), { state: null, note: null });
  assert.deepEqual(searchItemNotes("Captured"), []);
});

test("a canonical save creates one attached note and immediate FTS", () => {
  const item = fixture("create");
  const saved = saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-a",
    mutationId: "mutation-create-1",
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "## Cafe\u0301\r\n\r\nMy **private insight**.",
    saveKind: "manual",
  });

  assert.equal(saved.state?.epoch, 1);
  assert.equal(saved.state?.generation, 1);
  assert.equal(saved.note?.content_md, "## Café\n\nMy **private insight**.");
  assert.equal(saved.note?.content_text, "Café\n\nMy private insight.");
  assert.equal(saved.note?.include_in_ai, 0);
  assert.equal(saved.replayed, false);
  assert.equal(searchItemNotes("private insight")[0]?.item_id, item.id);
});

test("a newly created note inherits the global AI inclusion default", () => {
  setNoteAiDefaultPreference(true);
  const item = fixture("create-default-ai");

  const saved = saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-default-ai",
    mutationId: "mutation-create-default-ai",
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "This new note may improve Ask and connections.",
    saveKind: "manual",
  });

  assert.equal(saved.note?.include_in_ai, 1);
  setNoteAiDefaultPreference(false);
});

test("changing the global default does not change an existing note", () => {
  const item = fixture("existing-note-default-ai");
  const created = saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-existing-default-ai",
    mutationId: "mutation-existing-default-ai-create",
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "Existing choice remains stable.",
    saveKind: "manual",
  });
  assert.equal(created.note?.include_in_ai, 0);
  setNoteAiDefaultPreference(true);

  const updated = saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-existing-default-ai",
    mutationId: "mutation-existing-default-ai-update",
    epoch: 1,
    baseGeneration: 1,
    contentMarkdown: "Existing choice remains stable after an edit.",
    saveKind: "manual",
  });

  assert.equal(updated.note?.include_in_ai, 0);
  setNoteAiDefaultPreference(false);
});

test("save mutations are idempotent and reject payload reuse", () => {
  const item = fixture("idempotency");
  const input = {
    itemId: item.id,
    editorInstanceId: "editor-a",
    mutationId: "mutation-idempotent-1",
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "First accepted payload",
    saveKind: "auto" as const,
  };
  assert.equal(saveItemNote(input).replayed, false);
  assert.equal(saveItemNote(input).replayed, true);
  assert.equal(getItemNote(item.id).state?.generation, 1);

  assert.throws(
    () => saveItemNote({ ...input, contentMarkdown: "Changed payload" }),
    (error) =>
      error instanceof ItemNoteError && error.code === "NOTE_MUTATION_MISMATCH",
  );
});

test("a delayed replay conflicts after a newer generation instead of falsely acknowledging", () => {
  const item = fixture("delayed-replay");
  const first = {
    itemId: item.id,
    editorInstanceId: "editor-delayed-a",
    mutationId: "mutation-delayed-replay-a",
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "First tab payload",
    saveKind: "auto" as const,
  };
  saveItemNote(first);
  saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-delayed-b",
    mutationId: "mutation-delayed-replay-b",
    epoch: 1,
    baseGeneration: 1,
    contentMarkdown: "Newer second tab payload",
    saveKind: "auto",
  });

  assert.throws(
    () => saveItemNote(first),
    (error) => {
      assert.ok(error instanceof ItemNoteError);
      assert.equal(error.code, "NOTE_CONFLICT");
      assert.equal(error.snapshot?.note?.content_md, "Newer second tab payload");
      return true;
    },
  );
});

test("optimistic concurrency preserves the losing draft as a conflict", () => {
  const item = fixture("conflict");
  saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-a",
    mutationId: "mutation-conflict-create",
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "Shared base",
    saveKind: "auto",
  });
  saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-a",
    mutationId: "mutation-conflict-a",
    epoch: 1,
    baseGeneration: 1,
    contentMarkdown: "Tab A wins",
    saveKind: "auto",
  });

  assert.throws(
    () =>
      saveItemNote({
        itemId: item.id,
        editorInstanceId: "editor-b",
        mutationId: "mutation-conflict-b",
        epoch: 1,
        baseGeneration: 1,
        contentMarkdown: "Tab B remains recoverable",
        saveKind: "auto",
      }),
    (error) => {
      assert.ok(error instanceof ItemNoteError);
      assert.equal(error.code, "NOTE_CONFLICT");
      assert.equal(error.snapshot?.note?.content_md, "Tab A wins");
      return true;
    },
  );
});

test("delete leaves a tombstone and only explicit recreate advances the epoch", () => {
  const item = fixture("delete-recreate");
  saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-a",
    mutationId: "mutation-delete-create",
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "Sensitive old note",
    saveKind: "manual",
  });
  const thread = createThread({ scope: "item", item_id: item.id });
  const derived = appendMessage({
    thread_id: thread.id,
    role: "assistant",
    content: "Paraphrase of the sensitive note",
    citations: [
      {
        chunk_id: "manual-chunk",
        item_id: item.id,
        item_title: item.title,
        similarity: 0.9,
        source_kind: "manual_note",
        source_epoch: 1,
        source_version: 1,
      },
    ],
  });
  const deleted = deleteItemNote({
    itemId: item.id,
    editorInstanceId: "editor-a",
    mutationId: "mutation-delete",
    epoch: 1,
    baseGeneration: 1,
  });
  assert.equal(deleted.state?.epoch, 1);
  assert.equal(deleted.state?.generation, 2);
  assert.equal(deleted.state?.is_deleted, 1);
  assert.equal(deleted.note, null);
  assert.deepEqual(searchItemNotes("Sensitive old note"), []);
  assert.equal(
    getDb().prepare("SELECT 1 AS ok FROM chat_messages WHERE id = ?").get(derived.id),
    undefined,
  );

  assert.throws(
    () =>
      saveItemNote({
        itemId: item.id,
        editorInstanceId: "offline-editor",
        mutationId: "mutation-delayed-old",
        epoch: 1,
        baseGeneration: 1,
        contentMarkdown: "Delayed old note",
        saveKind: "auto",
      }),
    (error) => error instanceof ItemNoteError && error.code === "NOTE_CONFLICT",
  );

  const recreated = saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-a",
    mutationId: "mutation-recreate",
    epoch: 1,
    baseGeneration: 2,
    operation: "recreate",
    contentMarkdown: "Deliberately new note",
    saveKind: "manual",
  });
  assert.equal(recreated.state?.epoch, 2);
  assert.equal(recreated.state?.generation, 1);
  assert.equal(recreated.note?.last_saved_kind, "recreate");
  assert.equal(
    saveItemNote({
      itemId: item.id,
      editorInstanceId: "editor-a",
      mutationId: "mutation-recreate",
      epoch: 1,
      baseGeneration: 2,
      operation: "recreate",
      contentMarkdown: "Deliberately new note",
      saveKind: "manual",
    }).replayed,
    true,
  );
});

test("an explicitly recreated note uses the current global AI inclusion default", () => {
  const item = fixture("recreate-default-ai");
  saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-recreate-default",
    mutationId: "mutation-recreate-default-create",
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "Original excluded note",
    saveKind: "manual",
  });
  deleteItemNote({
    itemId: item.id,
    editorInstanceId: "editor-recreate-default",
    mutationId: "mutation-recreate-default-delete",
    epoch: 1,
    baseGeneration: 1,
  });
  setNoteAiDefaultPreference(true);

  const recreated = saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-recreate-default",
    mutationId: "mutation-recreate-default-save",
    epoch: 1,
    baseGeneration: 2,
    operation: "recreate",
    contentMarkdown: "Fresh note under the current default",
    saveKind: "manual",
  });

  assert.equal(recreated.note?.include_in_ai, 1);
  setNoteAiDefaultPreference(false);
});

test("item deletion removes vec0 rows and library-thread answers derived from its note", () => {
  const item = fixture("item-delete-cleanup");
  saveItemNote({
    itemId: item.id,
    editorInstanceId: "item-delete-editor",
    mutationId: "mutation-item-delete-create",
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "Private item deletion content",
    saveKind: "manual",
  });
  const chunk = getDb().transaction(() => {
    const inserted = insertChunkWithRowid({
      item_id: item.id,
      source_kind: "manual_note",
      source_epoch: 1,
      source_version: 1,
      idx: 0,
      body: "Private item deletion content",
      token_count: 4,
    });
    const vector = new Float32Array(EMBED_DIM);
    vector[0] = 1;
    getDb()
      .prepare("INSERT INTO chunks_vec(rowid, embedding) VALUES (?, ?)")
      .run(inserted.rowid, Buffer.from(vector.buffer));
    return inserted;
  })();
  const thread = createThread({ scope: "library" });
  const derived = appendMessage({
    thread_id: thread.id,
    role: "assistant",
    content: "Private paraphrase",
    citations: [
      {
        chunk_id: chunk.chunk_id,
        item_id: item.id,
        item_title: item.title,
        similarity: 0.9,
        source_kind: "manual_note",
        source_epoch: 1,
        source_version: 1,
      },
    ],
  });

  deleteItem(item.id);

  assert.equal(
    (getDb().prepare("SELECT COUNT(*) AS n FROM chunks_vec WHERE rowid = ?").get(chunk.rowid) as { n: number }).n,
    0,
  );
  assert.equal(
    getDb().prepare("SELECT 1 AS ok FROM chat_messages WHERE id = ?").get(derived.id),
    undefined,
  );
  assert.equal(getDb().prepare("SELECT 1 AS ok FROM items WHERE id = ?").get(item.id), undefined);
});

test("AI opt-in is separately versioned and stale content writes conflict", () => {
  const item = fixture("ai-policy");
  saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-a",
    mutationId: "mutation-policy-create",
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "Policy-protected note",
    saveKind: "auto",
  });
  const policy = setItemNoteAiPolicy({
    itemId: item.id,
    editorInstanceId: "editor-a",
    mutationId: "mutation-policy-on",
    epoch: 1,
    baseGeneration: 1,
    includeInAi: true,
  });
  assert.equal(policy.state?.generation, 2);
  assert.equal(policy.note?.include_in_ai, 1);

  assert.throws(
    () =>
      saveItemNote({
        itemId: item.id,
        editorInstanceId: "editor-b",
        mutationId: "mutation-policy-stale",
        epoch: 1,
        baseGeneration: 1,
        contentMarkdown: "Must not bypass policy generation",
        saveKind: "auto",
      }),
    (error) => error instanceof ItemNoteError && error.code === "NOTE_CONFLICT",
  );
});

test("manual saves preserve bounded acknowledged revisions", () => {
  const item = fixture("revisions");
  saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-a",
    mutationId: "mutation-revision-create",
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "Version one",
    saveKind: "manual",
  });
  saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-a",
    mutationId: "mutation-revision-two",
    epoch: 1,
    baseGeneration: 1,
    contentMarkdown: "Version two",
    saveKind: "manual",
  });
  const revisions = listItemNoteRevisions(item.id);
  assert.equal(revisions.length, 1);
  assert.equal(revisions[0]?.content_md, "Version one");
  assert.equal(revisions[0]?.source_generation, 1);

  const restored = restoreItemNoteRevision({
    itemId: item.id,
    revisionId: revisions[0]!.id,
    editorInstanceId: "editor-a",
    mutationId: "mutation-revision-restore",
    epoch: 1,
    baseGeneration: 2,
  });
  assert.equal(restored.state?.generation, 3);
  assert.equal(restored.note?.content_md, "Version one");
  assert.equal(restored.note?.last_saved_kind, "restore");
});
