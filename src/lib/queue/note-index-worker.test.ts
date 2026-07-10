import "./note-index-worker.test.setup";

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { saveItemNote, setItemNoteAiPolicy } from "@/db/item-notes";
import { EMBED_DIM } from "@/lib/embed/client";
import { manualCitationsRemainEligible, retrieve } from "@/lib/retrieve";
import {
  claimNextNoteIndexJob,
  runClaimedNoteIndexJob,
  runOneNoteIndexJob,
} from "./note-index-worker";
import { TEST_DB_DIR } from "./note-index-worker.test.setup";

after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

function vectorize(inputs: string[]): Promise<Float32Array[]> {
  return Promise.resolve(
    inputs.map(() => {
      const vector = new Float32Array(EMBED_DIM);
      vector[0] = 1;
      return vector;
    }),
  );
}

function createAiEnabledNote(label: string) {
  const item = insertCaptured({
    source_type: "url",
    title: `Worker ${label}`,
    body: "Captured source",
  });
  saveItemNote({
    itemId: item.id,
    editorInstanceId: `editor-${label}`,
    mutationId: randomUUID(),
    epoch: null,
    baseGeneration: null,
    contentMarkdown: `Private worker wording ${label}`,
    saveKind: "manual",
  });
  setItemNoteAiPolicy({
    itemId: item.id,
    editorInstanceId: `editor-${label}`,
    mutationId: randomUUID(),
    epoch: 1,
    baseGeneration: 1,
    includeInAi: true,
  });
  return item;
}

test("worker indexes only the current opted-in note generation", async () => {
  const item = createAiEnabledNote("index");
  const ran = await runOneNoteIndexJob(Date.now() + 6_000, { embedFn: vectorize });
  assert.equal(ran, true);

  const chunk = getDb()
    .prepare(
      `SELECT source_kind, source_epoch, source_version
       FROM chunks WHERE item_id = ? AND source_kind = 'manual_note'`,
    )
    .get(item.id) as {
    source_kind: string;
    source_epoch: number;
    source_version: number;
  };
  assert.deepEqual(chunk, {
    source_kind: "manual_note",
    source_epoch: 1,
    source_version: 2,
  });
  const note = getDb()
    .prepare("SELECT indexed_generation FROM item_notes WHERE item_id = ?")
    .get(item.id) as { indexed_generation: number };
  assert.equal(note.indexed_generation, 2);
  const event = getDb()
    .prepare(
      "SELECT action FROM item_semantic_events WHERE item_id = ? AND source_kind = 'manual_note'",
    )
    .get(item.id) as { action: string };
  assert.equal(event.action, "indexed");
});

test("AI opt-out blocks retrieval synchronously before asynchronous purge", async () => {
  const item = createAiEnabledNote("opt-out");
  await runOneNoteIndexJob(Date.now() + 6_000, { embedFn: vectorize });
  assert.equal(
    (getDb()
      .prepare("SELECT COUNT(*) AS n FROM chunks WHERE item_id = ? AND source_kind = 'manual_note'")
      .get(item.id) as { n: number }).n,
    1,
  );
  const citedBeforeOptOut = await retrieve("Private worker wording", {
    embedFn: vectorize,
    itemId: item.id,
  });
  assert.equal(citedBeforeOptOut[0]?.source_kind, "manual_note");

  setItemNoteAiPolicy({
    itemId: item.id,
    editorInstanceId: "editor-opt-out",
    mutationId: randomUUID(),
    epoch: 1,
    baseGeneration: 2,
    includeInAi: false,
  });
  assert.deepEqual(
    await retrieve("Private worker wording", { embedFn: vectorize, itemId: item.id }),
    [],
  );
  assert.equal(manualCitationsRemainEligible(citedBeforeOptOut), false);
  assert.equal(
    (getDb()
      .prepare("SELECT COUNT(*) AS n FROM chunks WHERE item_id = ? AND source_kind = 'manual_note'")
      .get(item.id) as { n: number }).n,
    1,
    "old vector may still exist physically before purge",
  );

  await runOneNoteIndexJob(Date.now() + 6_000, { embedFn: vectorize });
  assert.equal(
    (getDb()
      .prepare("SELECT COUNT(*) AS n FROM chunks WHERE item_id = ? AND source_kind = 'manual_note'")
      .get(item.id) as { n: number }).n,
    0,
  );
  getDb().prepare("DELETE FROM items WHERE id = ?").run(item.id);
});

test("a stale claimed generation cannot call the provider or commit", async () => {
  const item = createAiEnabledNote("stale");
  const claimed = claimNextNoteIndexJob(Date.now() + 6_000);
  assert.ok(claimed);

  saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-stale",
    mutationId: randomUUID(),
    epoch: 1,
    baseGeneration: 2,
    contentMarkdown: "A newer generation supersedes the claim",
    saveKind: "auto",
  });
  let calls = 0;
  await runClaimedNoteIndexJob(claimed, {
    embedFn: async (inputs) => {
      calls += 1;
      return vectorize(inputs);
    },
  });
  assert.equal(calls, 0);
  assert.equal(
    (getDb()
      .prepare("SELECT COUNT(*) AS n FROM chunks WHERE item_id = ? AND source_kind = 'manual_note'")
      .get(item.id) as { n: number }).n,
    0,
  );
  getDb().prepare("DELETE FROM items WHERE id = ?").run(item.id);
});

test("a stale purge claim cannot delete a newer completed index", async () => {
  const item = createAiEnabledNote("stale-purge");
  await runOneNoteIndexJob(Date.now() + 6_000, { embedFn: vectorize });
  setItemNoteAiPolicy({
    itemId: item.id,
    editorInstanceId: "editor-stale-purge",
    mutationId: randomUUID(),
    epoch: 1,
    baseGeneration: 2,
    includeInAi: false,
  });
  const stalePurge = claimNextNoteIndexJob(Date.now() + 6_000);
  assert.ok(stalePurge);
  assert.equal(stalePurge.desired_action, "purge");

  setItemNoteAiPolicy({
    itemId: item.id,
    editorInstanceId: "editor-stale-purge",
    mutationId: randomUUID(),
    epoch: 1,
    baseGeneration: 3,
    includeInAi: true,
  });
  await runOneNoteIndexJob(Date.now() + 12_000, { embedFn: vectorize });
  const currentChunk = getDb()
    .prepare(
      `SELECT source_version FROM chunks
       WHERE item_id = ? AND source_kind = 'manual_note'`,
    )
    .get(item.id) as { source_version: number };
  assert.equal(currentChunk.source_version, 4);

  await runClaimedNoteIndexJob(stalePurge, { embedFn: vectorize });
  assert.equal(
    (getDb()
      .prepare("SELECT COUNT(*) AS n FROM chunks WHERE item_id = ? AND source_kind = 'manual_note'")
      .get(item.id) as { n: number }).n,
    1,
  );
});

test("worker requires UI, write, and worker rollout gates before provider calls", async () => {
  const item = createAiEnabledNote("all-flags");
  const claimed = claimNextNoteIndexJob(Date.now() + 6_000);
  assert.ok(claimed);
  let calls = 0;
  process.env.MANUAL_NOTES_UI_ENABLED = "0";
  try {
    await runClaimedNoteIndexJob(claimed, {
      embedFn: async (inputs) => {
        calls += 1;
        return vectorize(inputs);
      },
    });
  } finally {
    process.env.MANUAL_NOTES_UI_ENABLED = "1";
  }
  assert.equal(calls, 0);
  assert.equal(claimNextNoteIndexJob(Date.now() + 12_000)?.item_id, item.id);
});

test("remote provider configuration never receives note text before consent", async () => {
  const item = createAiEnabledNote("remote-consent");
  const previous = process.env.EMBED_PROVIDER;
  process.env.EMBED_PROVIDER = "gemini";
  let calls = 0;
  try {
    await runOneNoteIndexJob(Date.now() + 6_000, {
      embedFn: async (inputs) => {
        calls += 1;
        return vectorize(inputs);
      },
    });
  } finally {
    process.env.EMBED_PROVIDER = previous;
  }
  assert.equal(calls, 0);
  const job = getDb()
    .prepare("SELECT state, last_error_code FROM note_index_jobs WHERE item_id = ?")
    .get(item.id) as { state: string; last_error_code: string };
  assert.deepEqual(job, {
    state: "error",
    last_error_code: "NOTE_AI_CONSENT_REQUIRED",
  });
});
