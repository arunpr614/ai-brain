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
  startNoteIndexWorker,
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

function claimForItem(itemId: string) {
  getDb()
    .prepare(
      `UPDATE note_index_jobs
       SET state = 'pending', attempts = 0, claimed_by = NULL,
           lease_expires_at = NULL, updated_at = 0
       WHERE item_id = ?`,
    )
    .run(itemId);
  const claimed = claimNextNoteIndexJob(Date.now() + 6_000);
  assert.ok(claimed);
  assert.equal(claimed.item_id, itemId);
  return claimed;
}

function jobState(itemId: string) {
  return getDb()
    .prepare("SELECT * FROM note_index_jobs WHERE item_id = ?")
    .get(itemId);
}

const WORKER_AUTHORITY_ENV_KEYS = [
  "BRAIN_BACKGROUND_WORKERS_MODE",
  "BRAIN_DEPLOYMENT_ENV",
  "BRAIN_PRODUCTION_RUNTIME",
  "BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE",
  "BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_UI_ENABLED",
  "BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_WRITE_ENABLED",
  "BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_EXECUTION_ENABLED",
] as const;

async function withWorkerAuthorityEnvironment<T>(
  values: Readonly<Record<string, string | undefined>>,
  run: () => Promise<T> | T,
): Promise<T> {
  const previous = new Map(
    WORKER_AUTHORITY_ENV_KEYS.map((key) => [key, process.env[key]]),
  );
  try {
    for (const key of WORKER_AUTHORITY_ENV_KEYS) delete process.env[key];
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined) process.env[key] = value;
    }
    return await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
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

test("the schema-026 missing-mode bridge preserves ordinary note indexing", async () => {
  const item = createAiEnabledNote("missing-mode");
  let calls = 0;

  await withWorkerAuthorityEnvironment({}, async () => {
    const claimed = claimForItem(item.id);
    await runClaimedNoteIndexJob(claimed, {
      embedFn: async (inputs) => {
        calls += 1;
        return vectorize(inputs);
      },
    });
  });

  assert.equal(calls, 1);
  assert.equal(
    (getDb()
      .prepare(
        `SELECT COUNT(*) AS n FROM chunks
         WHERE item_id = ? AND source_kind = 'manual_note'`,
      )
      .get(item.id) as { n: number }).n,
    1,
  );
});

test("explicit standard mode preserves ordinary schema-026 note indexing", async () => {
  const item = createAiEnabledNote("explicit-standard");
  let calls = 0;

  await withWorkerAuthorityEnvironment(
    {
      BRAIN_BACKGROUND_WORKERS_MODE: "standard",
      BRAIN_DEPLOYMENT_ENV: "production",
      BRAIN_PRODUCTION_RUNTIME: "1",
    },
    async () => {
      const claimed = claimForItem(item.id);
      await runClaimedNoteIndexJob(claimed, {
        embedFn: async (inputs) => {
          calls += 1;
          return vectorize(inputs);
        },
      });
    },
  );

  assert.equal(calls, 1);
  assert.equal(
    (getDb()
      .prepare(
        `SELECT COUNT(*) AS n FROM chunks
         WHERE item_id = ? AND source_kind = 'manual_note'`,
      )
      .get(item.id) as { n: number }).n,
    1,
  );
});

test("title drift across the provider barrier prevents chunks and job completion", async () => {
  const item = createAiEnabledNote("title-race");
  const claimed = claimForItem(item.id);
  const claimedState = jobState(item.id);
  let releaseProvider!: () => void;
  let providerStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    providerStarted = resolve;
  });
  const released = new Promise<void>((resolve) => {
    releaseProvider = resolve;
  });
  let providerInputs: string[] = [];

  const running = runClaimedNoteIndexJob(claimed, {
    embedFn: async (inputs) => {
      providerInputs = inputs;
      providerStarted();
      await released;
      return vectorize(inputs);
    },
  });
  await started;
  getDb()
    .prepare("UPDATE items SET title = ? WHERE id = ?")
    .run("Changed while embedding", item.id);
  releaseProvider();
  await running;

  assert.equal(providerInputs.join("\n").includes("Worker title-race"), true);
  assert.deepEqual(jobState(item.id), claimedState);
  assert.equal(
    (getDb()
      .prepare(
        `SELECT COUNT(*) AS n FROM chunks
         WHERE item_id = ? AND source_kind = 'manual_note'`,
      )
      .get(item.id) as { n: number }).n,
    0,
  );
});

test("note drift across a failing provider barrier cannot error or retry the replacement job", async () => {
  const item = createAiEnabledNote("note-race");
  const claimed = claimForItem(item.id);
  let releaseProvider!: () => void;
  let providerStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    providerStarted = resolve;
  });
  const released = new Promise<void>((resolve) => {
    releaseProvider = resolve;
  });
  let calls = 0;

  const running = runClaimedNoteIndexJob(claimed, {
    embedFn: async () => {
      calls += 1;
      providerStarted();
      await released;
      throw new Error("private_provider_failure");
    },
  });
  await started;
  saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-note-race",
    mutationId: randomUUID(),
    epoch: 1,
    baseGeneration: 2,
    contentMarkdown: "A replacement note saved while embedding was in flight",
    saveKind: "auto",
  });
  const replacementJob = jobState(item.id);
  releaseProvider();
  await running;

  assert.equal(calls, 1);
  assert.deepEqual(jobState(item.id), replacementJob);
  assert.equal(
    (getDb()
      .prepare(
        `SELECT COUNT(*) AS n FROM chunks
         WHERE item_id = ? AND source_kind = 'manual_note'`,
      )
      .get(item.id) as { n: number }).n,
    0,
  );
});

test("AI-off note jobs remain purge-only and never disclose note text", async () => {
  const item = insertCaptured({
    source_type: "url",
    title: "Recovery note exclusion",
    body: "Captured source",
  });
  saveItemNote({
    itemId: item.id,
    editorInstanceId: "editor-ai-off",
    mutationId: randomUUID(),
    epoch: null,
    baseGeneration: null,
    contentMarkdown: "Recovery wording that must never reach an embedding provider",
    saveKind: "manual",
  });
  const claimed = claimForItem(item.id);
  assert.equal(claimed.desired_action, "purge");
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
      .prepare(
        `SELECT COUNT(*) AS n FROM chunks
         WHERE item_id = ? AND source_kind = 'manual_note'`,
      )
      .get(item.id) as { n: number }).n,
    0,
  );
});

test("denied content-worker plans claim nothing and direct boundaries call no provider", async (t) => {
  const item = createAiEnabledNote("mode-matrix");
  const claimed = claimForItem(item.id);
  const claimedState = jobState(item.id);
  const logs: string[] = [];
  t.mock.method(console, "log", (...values: unknown[]) => {
    logs.push(values.map(String).join(" "));
  });

  const cases: Array<{
    label: string;
    environment: Record<string, string | undefined>;
  }> = [
    {
      label: "disabled",
      environment: { BRAIN_BACKGROUND_WORKERS_MODE: "disabled" },
    },
    {
      label: "manual-transcript-lab",
      environment: {
        BRAIN_BACKGROUND_WORKERS_MODE: "manual-transcript-lab",
        BRAIN_DEPLOYMENT_ENV: "lab",
        BRAIN_PRODUCTION_RUNTIME: "0",
      },
    },
    {
      label: "invalid mode",
      environment: { BRAIN_BACKGROUND_WORKERS_MODE: "unexpected" },
    },
    {
      label: "invalid deployment",
      environment: {
        BRAIN_BACKGROUND_WORKERS_MODE: "standard",
        BRAIN_DEPLOYMENT_ENV: "invalid",
        BRAIN_PRODUCTION_RUNTIME: "0",
      },
    },
    {
      label: "conflicting deployment",
      environment: {
        BRAIN_BACKGROUND_WORKERS_MODE: "standard",
        BRAIN_DEPLOYMENT_ENV: "lab",
        BRAIN_PRODUCTION_RUNTIME: "1",
      },
    },
    {
      label: "restricted missing mode",
      environment: {
        BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_UI_ENABLED: "1",
      },
    },
  ];

  for (const entry of cases) {
    await withWorkerAuthorityEnvironment(entry.environment, async () => {
      let providerCalls = 0;
      const deps = {
        embedFn: async (inputs: string[]) => {
          providerCalls += 1;
          return vectorize(inputs);
        },
      };
      globalThis.__brainNoteIndexWorker = undefined;
      startNoteIndexWorker();
      assert.equal(globalThis.__brainNoteIndexWorker, undefined, entry.label);
      assert.equal(claimNextNoteIndexJob(Date.now() + 12_000), null, entry.label);
      assert.equal(
        await runOneNoteIndexJob(Date.now() + 12_000, deps),
        false,
        entry.label,
      );
      await runClaimedNoteIndexJob(claimed, deps);
      assert.equal(providerCalls, 0, entry.label);
      assert.deepEqual(jobState(item.id), claimedState, entry.label);
    });
  }

  assert.equal(logs.every((line) => !line.includes(item.id)), true);
  assert.equal(logs.every((line) => !line.includes("manual-notes-v1")), true);
});

test("an incompatible schema blocks startup, claim, and direct provider execution", async (t) => {
  const item = createAiEnabledNote("schema-incompatible");
  const claimed = claimForItem(item.id);
  const claimedState = jobState(item.id);
  getDb().exec(`
    CREATE TABLE content_processing_holds (
      item_id TEXT NOT NULL,
      state TEXT NOT NULL
    )
  `);
  t.mock.method(console, "log", () => undefined);
  let providerCalls = 0;
  const deps = {
    embedFn: async (inputs: string[]) => {
      providerCalls += 1;
      return vectorize(inputs);
    },
  };

  globalThis.__brainNoteIndexWorker = undefined;
  startNoteIndexWorker();
  assert.equal(globalThis.__brainNoteIndexWorker, undefined);
  assert.equal(claimNextNoteIndexJob(Date.now() + 12_000), null);
  assert.equal(await runOneNoteIndexJob(Date.now() + 12_000, deps), false);
  await runClaimedNoteIndexJob(claimed, deps);

  assert.equal(providerCalls, 0);
  assert.deepEqual(jobState(item.id), claimedState);
});
