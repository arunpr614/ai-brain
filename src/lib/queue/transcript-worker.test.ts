import "../../db/transcript-jobs.test.setup";

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, beforeEach, describe, it } from "node:test";
import { TEST_DB_DIR } from "../../db/transcript-jobs.test.setup";
import { getDb } from "../../db/client";
import { getItem, insertCaptured } from "../../db/items";
import { upgradeItemCaptureContent } from "../../db/item-upgrades";
import { withYouTubeBrowserSchemaContractForTests } from "../../db/schema-capabilities";
import {
  YOUTUBE_BROWSER_FIXTURE_CONTRACT,
  YOUTUBE_BROWSER_FIXTURE_MIGRATION_NAME,
  YOUTUBE_BROWSER_FIXTURE_MIGRATION_SHA,
} from "../../db/test-fixtures/youtube-browser-schema";
import type { ContainmentDiagnostic } from "../runtime/containment-diagnostics";
import {
  claimNextTranscriptJob,
  enqueueTranscriptJobForItem,
  getTranscriptJobForItem,
  ignoreTranscriptJob,
  listTranscriptAttemptsForItem,
  TranscriptRecoverySourceConflictError,
  type TranscriptJobRow,
} from "../../db/transcript-jobs";
import {
  claimNextTranscriptJobForTests,
  nextTranscriptRetryAt,
  nextTranscriptRetryAtForResult,
  resolveTranscriptWorkerAuthority,
  runClaimedTranscriptJobForTests,
  runTranscriptJobSafelyForTests,
  startTranscriptRecoveryWorkerForTests,
} from "./transcript-worker";
import {
  clearYoutubeTimedTextProviderHealthForTests,
  recordYoutubeTimedTextProviderOutcome,
  setYoutubeTimedTextProviderHealthForTests,
} from "../capture/youtube-transcript/provider-health";

const FUTURE_MIGRATION_NAME = "028_youtube_browser_transcript.sql";
const ENV_KEYS = [
  "BRAIN_BACKGROUND_WORKERS_MODE",
  "BRAIN_DEPLOYMENT_ENV",
  "BRAIN_PRODUCTION_RUNTIME",
  "BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE",
  "BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_UI_ENABLED",
  "BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_WRITE_ENABLED",
  "BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_EXECUTION_ENABLED",
  "YOUTUBE_TRANSCRIPT_RECOVERY_ENABLED",
  "YOUTUBE_TRANSCRIPT_WORKER_ENABLED",
] as const;
const ORIGINAL_ENV = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

function installReadyTranscriptSourceFixture(): void {
  const db = getDb();
  db.exec(`
    ALTER TABLE items ADD COLUMN content_revision INTEGER NOT NULL DEFAULT 1
      CHECK (content_revision > 0);
    CREATE TABLE content_processing_holds (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      expected_content_revision INTEGER NOT NULL
        CHECK (expected_content_revision > 0),
      state TEXT NOT NULL DEFAULT 'held'
        CHECK (state IN ('held', 'released'))
    );
    CREATE TRIGGER items_advance_content_revision
      AFTER UPDATE OF body ON items
      WHEN new.body IS NOT old.body
      BEGIN
        UPDATE items
        SET content_revision = old.content_revision + 1
        WHERE id = old.id;
      END;
    CREATE UNIQUE INDEX idx_content_processing_holds_active_item
      ON content_processing_holds(item_id)
      WHERE state = 'held';
  `);
  db.prepare("INSERT INTO _migrations(name,sha256) VALUES(?,?)").run(
    YOUTUBE_BROWSER_FIXTURE_MIGRATION_NAME,
    YOUTUBE_BROWSER_FIXTURE_MIGRATION_SHA,
  );
}

function insertActiveTranscriptSource(itemId: string, suffix: string): void {
  const db = getDb();
  const policyId = `policy-${suffix}`;
  db.prepare(
    `INSERT INTO capture_policy_decisions(
       id,item_id,source_url,platform,environment,rights_basis,method,
       retention_class,production_allowed
     ) VALUES(?,?,?,'youtube','test','owned_youtube_channel',
       'youtube_official_caption','full_text_allowed',0)`,
  ).run(policyId, itemId, `https://www.youtube.com/watch?v=${suffix}`);
  db.prepare(
    `INSERT INTO transcript_sources(
       id,item_id,policy_decision_id,source_kind,language_code,
       caption_source_class,timestamp_mode,provenance_json,retention_class,
       text_sha256,segment_count,status
     ) VALUES(?,?,?,'youtube_official_caption','en','standard',
       'paragraph_only','{}','full_text_allowed',?,0,'active')`,
  ).run(`source-${suffix}`, itemId, policyId, "a".repeat(64));
}

async function withReadyTranscriptSourceSchema<T>(
  callback: () => Promise<T>,
): Promise<T> {
  const previousNodeEnv = process.env.NODE_ENV;
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  mutableEnvironment.NODE_ENV = "test";
  try {
    return await withYouTubeBrowserSchemaContractForTests(
      YOUTUBE_BROWSER_FIXTURE_CONTRACT,
      callback,
    );
  } finally {
    if (previousNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = previousNodeEnv;
  }
}

function configureEnvironment(
  values: Partial<Record<(typeof ENV_KEYS)[number], string>>,
): void {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
}

function restoreEnvironment(): void {
  for (const key of ENV_KEYS) {
    const value = ORIGINAL_ENV[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function clearFixtures(): void {
  configureEnvironment({});
  const db = getDb();
  db.prepare("DELETE FROM transcript_attempts").run();
  db.prepare("DELETE FROM transcript_jobs").run();
  db.prepare("DELETE FROM items").run();
  db.prepare("DELETE FROM _migrations WHERE name = ?").run(
    FUTURE_MIGRATION_NAME,
  );
  clearYoutubeTimedTextProviderHealthForTests();
}

function makeSchemaIncompatible(): void {
  getDb()
    .prepare("INSERT INTO _migrations(name,sha256) VALUES(?,?)")
    .run(FUTURE_MIGRATION_NAME, "a".repeat(64));
}

function insertWeakYoutubeItem(title: string) {
  const item = insertCaptured({
    source_type: "youtube",
    capture_source: "web",
    source_url: `https://www.youtube.com/watch?v=${crypto.randomUUID().slice(0, 11)}`,
    title,
    body: "metadata only",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_method: "youtube_innertube_timedtext",
    extraction_warning: "youtube_transcript_fetch_metadata_only",
  });
  enqueueTranscriptJobForItem(item, { reset: true, priority: 30 });
  return item;
}

function claimWeakYoutubeJob(title: string): TranscriptJobRow {
  const item = insertWeakYoutubeItem(title);
  const claimed = claimNextTranscriptJob(Date.now());
  assert.equal(claimed?.item_id, item.id);
  assert.equal(claimed?.state, "running");
  return claimed;
}

function dummyTranscriptJob(): TranscriptJobRow {
  return {
    id: 999_999,
    item_id: "worker-plan-test-item",
    source_platform: "youtube",
    video_id: "abcdefghijk",
    state: "running",
    priority: 1,
    attempts: 1,
    max_attempts: 5,
    next_run_at: null,
    claimed_at: 1,
    completed_at: null,
    last_attempt_id: null,
    last_provider: null,
    last_error_code: null,
    last_error_message: null,
    created_at: 1,
    updated_at: 1,
  };
}

describe("transcript recovery worker", () => {
  beforeEach(clearFixtures);

  after(() => {
    restoreEnvironment();
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("preserves only the schema-026 bridge and explicit standard worker modes", async () => {
    for (const mode of [undefined, "standard"] as const) {
      clearFixtures();
      configureEnvironment(
        mode === undefined ? {} : { BRAIN_BACKGROUND_WORKERS_MODE: mode },
      );
      const expectedCode =
        mode === undefined ? "legacy_default_standard" : "standard";
      assert.deepEqual(resolveTranscriptWorkerAuthority(), {
        allowed: true,
        code: expectedCode,
        mode: expectedCode,
      });

      let backfills = 0;
      let loops = 0;
      const start = startTranscriptRecoveryWorkerForTests({
        backfill: () => {
          backfills += 1;
          return { kind: "applied", value: 0 };
        },
        beginLoop: () => {
          loops += 1;
        },
      });
      assert.equal(start, "started");
      assert.equal(backfills, 1);
      assert.equal(loops, 1);

      let cooldownChecks = 0;
      let claims = 0;
      const claim = claimNextTranscriptJobForTests(Date.now(), {
        getYoutubeTimedTextCooldown: () => {
          cooldownChecks += 1;
          return {
            providerKey: "youtube_timedtext",
            active: false,
            cooldownUntil: null,
            remainingMs: 0,
            lastFailureCode: null,
            lastStatusCode: null,
            failureCount: 0,
          };
        },
        claimNextTranscriptJob: () => {
          claims += 1;
          return {
            kind: "unchanged",
            reason: "no_eligible_job",
            value: null,
          };
        },
      });
      assert.equal(claim.status, "idle");
      assert.equal(cooldownChecks, 1);
      assert.equal(claims, 1);

      const claimed = claimWeakYoutubeJob(`Schema 026 ${expectedCode}`);
      let dispatches = 0;
      const direct = await runTranscriptJobSafelyForTests(claimed, {
        runOne: async () => {
          dispatches += 1;
          return "processed";
        },
      });
      assert.equal(direct, "processed");
      assert.equal(dispatches, 1);
    }
  });

  it("fails closed across the authoritative worker mode matrix", async () => {
    const cases: Array<{
      name: string;
      environment: Partial<Record<(typeof ENV_KEYS)[number], string>>;
      expectedCode: ReturnType<typeof resolveTranscriptWorkerAuthority>["code"];
      prepare?: () => void;
    }> = [
      {
        name: "disabled",
        environment: { BRAIN_BACKGROUND_WORKERS_MODE: "disabled" },
        expectedCode: "explicit_disabled",
      },
      {
        name: "manual",
        environment: {
          BRAIN_BACKGROUND_WORKERS_MODE: "manual-transcript-lab",
        },
        expectedCode: "manual_lab_environment_denied",
      },
      {
        name: "invalid mode",
        environment: { BRAIN_BACKGROUND_WORKERS_MODE: "unexpected" },
        expectedCode: "worker_mode_invalid",
      },
      {
        name: "invalid deployment",
        environment: {
          BRAIN_BACKGROUND_WORKERS_MODE: "standard",
          BRAIN_DEPLOYMENT_ENV: "invalid",
          BRAIN_PRODUCTION_RUNTIME: "0",
        },
        expectedCode: "deployment_invalid",
      },
      {
        name: "conflicting deployment",
        environment: {
          BRAIN_BACKGROUND_WORKERS_MODE: "standard",
          BRAIN_DEPLOYMENT_ENV: "production",
          BRAIN_PRODUCTION_RUNTIME: "0",
        },
        expectedCode: "deployment_conflict",
      },
      {
        name: "restricted request without mode",
        environment: {
          BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE: "lab",
        },
        expectedCode: "worker_mode_missing_with_restricted_request",
      },
      {
        name: "incompatible schema",
        environment: { BRAIN_BACKGROUND_WORKERS_MODE: "standard" },
        expectedCode: "schema_incompatible",
        prepare: makeSchemaIncompatible,
      },
      {
        name: "legacy transcript toggle",
        environment: {
          BRAIN_BACKGROUND_WORKERS_MODE: "standard",
          YOUTUBE_TRANSCRIPT_WORKER_ENABLED: "false",
        },
        expectedCode: "legacy_transcript_disabled",
      },
    ];

    for (const testCase of cases) {
      clearFixtures();
      configureEnvironment(testCase.environment);
      testCase.prepare?.();
      assert.equal(
        resolveTranscriptWorkerAuthority().code,
        testCase.expectedCode,
        testCase.name,
      );

      let backfills = 0;
      let loops = 0;
      assert.equal(
        startTranscriptRecoveryWorkerForTests({
          backfill: () => {
            backfills += 1;
            return { kind: "applied", value: 0 };
          },
          beginLoop: () => {
            loops += 1;
          },
        }),
        "blocked",
        testCase.name,
      );

      let cooldownChecks = 0;
      let claims = 0;
      const claim = claimNextTranscriptJobForTests(Date.now(), {
        getYoutubeTimedTextCooldown: () => {
          cooldownChecks += 1;
          throw new Error("cooldown must not be read");
        },
        claimNextTranscriptJob: () => {
          claims += 1;
          throw new Error("claim must not run");
        },
      });
      assert.equal(claim.status, "blocked", testCase.name);

      let dispatches = 0;
      let attempts = 0;
      let retries = 0;
      const direct = await runTranscriptJobSafelyForTests(
        dummyTranscriptJob(),
        {
          runOne: async () => {
            dispatches += 1;
            return "processed";
          },
          finalizeAttempt: () => {
            attempts += 1;
            retries += 1;
            return 1;
          },
        },
      );
      assert.equal(direct, "blocked", testCase.name);
      assert.deepEqual(
        {
          backfills,
          loops,
          cooldownChecks,
          claims,
          dispatches,
          attempts,
          retries,
        },
        {
          backfills: 0,
          loops: 0,
          cooldownChecks: 0,
          claims: 0,
          dispatches: 0,
          attempts: 0,
          retries: 0,
        },
        testCase.name,
      );
    }
  });

  it("does not claim jobs or emit exact cooldown details while cooldown is active", (t) => {
    const item = insertWeakYoutubeItem("Cooldown YouTube");
    const now = Date.now();
    const diagnostics: ContainmentDiagnostic[] = [];
    const consoleWrites: string[] = [];
    t.mock.method(console, "log", (...args: unknown[]) => {
      consoleWrites.push(args.map(String).join(" "));
    });
    setYoutubeTimedTextProviderHealthForTests({
      cooldownUntil: now + 60_000,
      failureCount: 1,
      lastFailureCode: "timedtext_http_429",
      lastStatusCode: 429,
    });

    const result = claimNextTranscriptJobForTests(now, {
      logCooldown: true,
      logContainmentDiagnostic: (entry) => {
        diagnostics.push(entry);
      },
    });

    assert.equal(result.job, null);
    assert.equal(result.cooldownActive, true);
    const job = getTranscriptJobForItem(item.id);
    assert.equal(job?.state, "pending");
    assert.equal(job?.attempts, 0);
    assert.equal(diagnostics.length, 1);
    assert.deepEqual(diagnostics[0], {
      event: "claimant_guarded",
      outcome: "skipped",
      claimant: "transcript_recovery",
      phase: "claim",
      aggregateCount: 0,
      guardrailTriggered: true,
      workStarted: false,
      providerContacted: false,
      elapsedBucket: "not_measured",
      payloadSizeBucket: "not_measured",
      timestamp: new Date(now).toISOString(),
    });
    assert.deepEqual(consoleWrites, ["[transcript] provider cooldown active"]);
    const output = JSON.stringify({ diagnostics, consoleWrites });
    assert.equal(output.includes("timedtext_http_429"), false);
    ignoreTranscriptJob(item.id);
    clearYoutubeTimedTextProviderHealthForTests();
  });

  it("uses provider cooldown as the retry floor for throttled results", () => {
    const now = Date.now();
    const cooldownUntil = now + 50 * 60_000;

    const throttledRetryAt = nextTranscriptRetryAtForResult(
      { errorCode: "timedtext_http_429", statusCode: 429 },
      1,
      now,
      cooldownUntil,
    );
    const genericRetryAt = nextTranscriptRetryAt(1, now);

    assert.equal(throttledRetryAt, cooldownUntil);
    assert.ok(throttledRetryAt > genericRetryAt);
  });

  it("rechecks after item lookup and never dispatches after a post-claim schema flip", async () => {
    const claimed = claimWeakYoutubeJob("Pre-dispatch gate flip");
    const itemBefore = getItem(claimed.item_id);
    const jobBefore = getTranscriptJobForItem(claimed.item_id);
    let providerCalls = 0;

    const outcome = await runClaimedTranscriptJobForTests(claimed, {
      getItem: (itemId) => {
        const item = getItem(itemId);
        makeSchemaIncompatible();
        return item;
      },
      recover: async () => {
        providerCalls += 1;
        throw new Error("provider must not be called");
      },
    });

    assert.equal(outcome, "blocked");
    assert.equal(providerCalls, 0);
    assert.deepEqual(getItem(claimed.item_id), itemBefore);
    assert.deepEqual(getTranscriptJobForItem(claimed.item_id), jobBefore);
    assert.deepEqual(listTranscriptAttemptsForItem(claimed.item_id), []);
  });

  it("discards a provider result when authority flips before response handling", async () => {
    const claimed = claimWeakYoutubeJob("Post-provider gate flip");
    const itemBefore = getItem(claimed.item_id)!;
    const jobBefore = getTranscriptJobForItem(claimed.item_id);
    let providerCalls = 0;
    let providerOutcomeWrites = 0;
    let upgrades = 0;
    let attempts = 0;
    let terminalMutations = 0;
    let diagnosticWrites = 0;

    const outcome = await runClaimedTranscriptJobForTests(claimed, {
      recover: async () => {
        providerCalls += 1;
        makeSchemaIncompatible();
        return {
          provider: "youtube_innertube_timedtext",
          state: "success",
          retryable: false,
          content: {
            title: itemBefore.title,
            body: "provider transcript must remain inert",
            author: null,
            source_url: itemBefore.source_url!,
            extraction_warning: null,
            source_platform: "youtube",
            capture_quality: "transcript",
            extraction_method: "youtube_innertube_timedtext",
          },
        };
      },
      recordProviderOutcome: () => {
        providerOutcomeWrites += 1;
        throw new Error("provider outcome must remain inert");
      },
      upgrade: async () => {
        upgrades += 1;
        throw new Error("upgrade must not run");
      },
      finalizeAttempt: () => {
        attempts += 1;
        terminalMutations += 1;
        throw new Error("attempt must not be recorded");
      },
      logContainmentDiagnostic: () => {
        diagnosticWrites += 1;
      },
    });

    assert.equal(outcome, "blocked");
    assert.deepEqual(
      {
        providerCalls,
        providerOutcomeWrites,
        upgrades,
        attempts,
        terminalMutations,
        diagnosticWrites,
      },
      {
        providerCalls: 1,
        providerOutcomeWrites: 0,
        upgrades: 0,
        attempts: 0,
        terminalMutations: 0,
        diagnosticWrites: 0,
      },
    );
    assert.deepEqual(getItem(claimed.item_id), itemBefore);
    assert.deepEqual(getTranscriptJobForItem(claimed.item_id), jobBefore);
    assert.deepEqual(listTranscriptAttemptsForItem(claimed.item_id), []);
  });

  it("treats an apply-time block as a no-effect rather than a retry", async () => {
    const claimed = claimWeakYoutubeJob("Apply-time gate flip");
    const itemBefore = getItem(claimed.item_id)!;
    const jobBefore = getTranscriptJobForItem(claimed.item_id);
    let attempts = 0;
    let terminalMutations = 0;
    let diagnosticWrites = 0;

    const outcome = await runClaimedTranscriptJobForTests(claimed, {
      recover: async () => ({
        provider: "youtube_innertube_timedtext",
        state: "success",
        retryable: false,
        content: {
          title: itemBefore.title,
          body: "apply-time blocked transcript",
          author: null,
          source_url: itemBefore.source_url!,
          extraction_warning: null,
          source_platform: "youtube",
          capture_quality: "transcript",
          extraction_method: "youtube_innertube_timedtext",
        },
      }),
      recordProviderOutcome: recordYoutubeTimedTextProviderOutcome,
      upgrade: async (input) => {
        makeSchemaIncompatible();
        return upgradeItemCaptureContent(input);
      },
      finalizeAttempt: () => {
        attempts += 1;
        terminalMutations += 1;
        throw new Error("attempt must not be recorded");
      },
      logContainmentDiagnostic: () => {
        diagnosticWrites += 1;
      },
    });

    assert.equal(outcome, "blocked");
    assert.deepEqual(
      { attempts, terminalMutations, diagnosticWrites },
      { attempts: 0, terminalMutations: 0, diagnosticWrites: 0 },
    );
    assert.deepEqual(getItem(claimed.item_id), itemBefore);
    assert.deepEqual(getTranscriptJobForItem(claimed.item_id), jobBefore);
    assert.deepEqual(listTranscriptAttemptsForItem(claimed.item_id), []);
  });

  it("treats an apply-time active-source conflict as blocked without a failed attempt", async () => {
    const claimed = claimWeakYoutubeJob("Apply-time active source conflict");
    const itemBefore = getItem(claimed.item_id)!;
    const jobBefore = getTranscriptJobForItem(claimed.item_id);
    let finalizations = 0;

    const outcome = await runClaimedTranscriptJobForTests(claimed, {
      recover: async () => ({
        provider: "youtube_innertube_timedtext",
        state: "success",
        retryable: false,
        content: {
          title: itemBefore.title,
          body: "ACTIVE_SOURCE_CONFLICT_BODY_SENTINEL",
          author: null,
          source_url: itemBefore.source_url!,
          extraction_warning: null,
          source_platform: "youtube",
          capture_quality: "transcript",
          extraction_method: "youtube_innertube_timedtext",
        },
      }),
      upgrade: async () => {
        throw new TranscriptRecoverySourceConflictError();
      },
      finalizeAttempt: () => {
        finalizations += 1;
        throw new Error("conflict must not be persisted as a failed attempt");
      },
    });

    assert.equal(outcome, "blocked");
    assert.equal(finalizations, 0);
    assert.deepEqual(getItem(claimed.item_id), itemBefore);
    assert.deepEqual(getTranscriptJobForItem(claimed.item_id), jobBefore);
    assert.deepEqual(listTranscriptAttemptsForItem(claimed.item_id), []);
  });

  it("rechecks worker mode immediately before apply and terminal finalization", async () => {
    for (const resultKind of ["success", "retryable"] as const) {
      clearFixtures();
      configureEnvironment({ BRAIN_BACKGROUND_WORKERS_MODE: "standard" });
      const claimed = claimWeakYoutubeJob(`Mode race ${resultKind}`);
      const itemBefore = getItem(claimed.item_id)!;
      const jobBefore = getTranscriptJobForItem(claimed.item_id);
      let upgrades = 0;
      let finalizations = 0;

      const outcome = await runClaimedTranscriptJobForTests(claimed, {
        recover: async () =>
          resultKind === "success"
            ? {
                provider: "youtube_innertube_timedtext",
                state: "success",
                retryable: false,
                content: {
                  title: itemBefore.title,
                  body: "MODE_RACE_TRANSCRIPT_SENTINEL",
                  author: null,
                  source_url: itemBefore.source_url!,
                  extraction_warning: null,
                  source_platform: "youtube",
                  capture_quality: "transcript",
                  extraction_method: "youtube_innertube_timedtext",
                },
              }
            : {
                provider: "youtube_innertube_timedtext",
                state: "retryable_error",
                retryable: true,
                errorCode: "provider_exception",
                errorMessage: "MODE_RACE_ERROR_SENTINEL",
              },
        recordProviderOutcome: (input) => {
          const recorded = recordYoutubeTimedTextProviderOutcome(input);
          configureEnvironment({
            BRAIN_BACKGROUND_WORKERS_MODE: "disabled",
          });
          return recorded;
        },
        upgrade: async () => {
          upgrades += 1;
          throw new Error("upgrade must not run after mode drift");
        },
        finalizeAttempt: () => {
          finalizations += 1;
          throw new Error("finalization must not run after mode drift");
        },
      });

      assert.equal(outcome, "blocked");
      assert.equal(upgrades, 0);
      assert.equal(finalizations, 0);
      assert.deepEqual(getItem(claimed.item_id), itemBefore);
      assert.deepEqual(getTranscriptJobForItem(claimed.item_id), jobBefore);
      assert.deepEqual(listTranscriptAttemptsForItem(claimed.item_id), []);
    }
  });

  it("discards a provider result after item deletion without terminal mutation", async () => {
    const claimed = claimWeakYoutubeJob("Deletion race");
    let providerOutcomeWrites = 0;
    let upgrades = 0;
    let finalizations = 0;

    const outcome = await runClaimedTranscriptJobForTests(claimed, {
      recover: async () => {
        getDb().prepare("DELETE FROM items WHERE id = ?").run(claimed.item_id);
        return {
          provider: "youtube_innertube_timedtext",
          state: "retryable_error",
          retryable: true,
          errorCode: "provider_exception",
          errorMessage: "DELETED_ITEM_ERROR_SENTINEL",
        };
      },
      recordProviderOutcome: () => {
        providerOutcomeWrites += 1;
        throw new Error("provider outcome must remain inert");
      },
      upgrade: async () => {
        upgrades += 1;
        throw new Error("upgrade must not run");
      },
      finalizeAttempt: () => {
        finalizations += 1;
        throw new Error("finalization must not run");
      },
    });

    assert.equal(outcome, "blocked");
    assert.deepEqual(
      { providerOutcomeWrites, upgrades, finalizations },
      { providerOutcomeWrites: 0, upgrades: 0, finalizations: 0 },
    );
    assert.equal(getItem(claimed.item_id), null);
    assert.equal(getTranscriptJobForItem(claimed.item_id), null);
    assert.deepEqual(listTranscriptAttemptsForItem(claimed.item_id), []);
  });

  it("emits aggregate diagnostics without identifiers or raw provider bodies", async (t) => {
    const claimed = claimWeakYoutubeJob("Content-free diagnostics");
    const rawProviderBody = "RAW_PROVIDER_BODY_SENTINEL";
    const diagnostics: ContainmentDiagnostic[] = [];
    const consoleWrites: string[] = [];
    t.mock.method(console, "warn", (...args: unknown[]) => {
      consoleWrites.push(args.map(String).join(" "));
    });

    const outcome = await runClaimedTranscriptJobForTests(claimed, {
      recover: async () => ({
        provider: "youtube_innertube_timedtext",
        state: "retryable_error",
        retryable: true,
        errorCode: "provider_exception",
        errorMessage: rawProviderBody,
      }),
      logContainmentDiagnostic: (entry) => {
        diagnostics.push(entry);
      },
    });

    assert.equal(outcome, "processed");
    assert.equal(diagnostics.length, 1);
    for (const forbidden of [
      "item_id",
      "job_id",
      "video_id",
      "error_message",
      "provider",
      "provider_key",
      "attempt_number",
      "transcript_chars",
      "duration_ms",
      "status_code",
      "cooldown_until",
      "error_code",
      "started_at",
      "finished_at",
      "retryable",
      "state",
    ]) {
      assert.equal(forbidden in diagnostics[0]!, false);
    }
    const diagnosticText = JSON.stringify(diagnostics);
    const consoleText = consoleWrites.join("\n");
    assert.equal(diagnosticText.includes(rawProviderBody), false);
    assert.equal(diagnosticText.includes(claimed.item_id), false);
    assert.equal(diagnosticText.includes(claimed.video_id!), false);
    assert.equal(consoleText.includes(rawProviderBody), false);
    assert.equal(consoleText.includes(claimed.item_id), false);
    assert.equal(consoleText.includes(claimed.video_id!), false);
    assert.deepEqual(Object.keys(diagnostics[0]!).sort(), [
      "aggregateCount",
      "claimant",
      "elapsedBucket",
      "event",
      "guardrailTriggered",
      "outcome",
      "payloadSizeBucket",
      "phase",
      "providerContacted",
      "timestamp",
      "workStarted",
    ]);
    assert.equal(
      listTranscriptAttemptsForItem(claimed.item_id)[0]?.error_message,
      "The transcript provider failed unexpectedly.",
    );
  });

  it("marks a thrown job retryable and records a worker_exception attempt", async () => {
    const claimed = claimWeakYoutubeJob("Worker exception YouTube");

    await runTranscriptJobSafelyForTests(claimed, {
      runOne: async () => {
        throw new Error("provider blew up");
      },
      nextTranscriptRetryAt: () => Date.now() + 60_000,
    });

    const job = getTranscriptJobForItem(claimed.item_id);
    assert.equal(job?.state, "retryable_error");
    assert.equal(job?.claimed_at, null);
    assert.equal(job?.last_provider, "transcript_worker");
    assert.equal(job?.last_error_code, "worker_exception");
    assert.equal(
      job?.last_error_message,
      "The transcript worker failed unexpectedly.",
    );
    assert.ok((job?.last_attempt_id ?? 0) > 0);

    const attempts = listTranscriptAttemptsForItem(claimed.item_id);
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0]?.attempt_number, claimed.attempts);
    assert.equal(attempts[0]?.provider, "transcript_worker");
    assert.equal(attempts[0]?.state, "retryable_error");
    assert.equal(attempts[0]?.retryable, 1);
    assert.equal(attempts[0]?.error_code, "worker_exception");
    assert.equal(
      attempts[0]?.error_message,
      "The transcript worker failed unexpectedly.",
    );
  });

  it("does not transition a running claim when atomic finalization fails", async () => {
    const claimed = claimWeakYoutubeJob("Attempt recording failure YouTube");

    await runTranscriptJobSafelyForTests(claimed, {
      runOne: async () => {
        throw new Error("db helper threw");
      },
      finalizeAttempt: () => {
        throw new Error("attempt insert failed");
      },
      nextTranscriptRetryAt: () => Date.now() + 60_000,
    });

    const job = getTranscriptJobForItem(claimed.item_id);
    assert.equal(job?.state, "running");
    assert.notEqual(job?.claimed_at, null);
    assert.equal(job?.last_attempt_id, null);
    assert.equal(job?.last_provider, null);
    assert.equal(job?.last_error_code, null);
    assert.equal(job?.last_error_message, null);
    assert.deepEqual(listTranscriptAttemptsForItem(claimed.item_id), []);
  });

  it("suppresses active-source and hold races after provider return", async () => {
    installReadyTranscriptSourceFixture();
    configureEnvironment({ BRAIN_BACKGROUND_WORKERS_MODE: "standard" });

    await withReadyTranscriptSourceSchema(async () => {
      for (const race of ["active_source", "hold"] as const) {
        const claimed = claimWeakYoutubeJob(`Ready-schema ${race}`);
        const itemBefore = getItem(claimed.item_id)!;
        const jobBefore = getTranscriptJobForItem(claimed.item_id);
        let providerOutcomeWrites = 0;
        let upgrades = 0;
        let finalizations = 0;
        let diagnosticWrites = 0;

        const outcome = await runClaimedTranscriptJobForTests(claimed, {
          recover: async () => {
            if (race === "active_source") {
              insertActiveTranscriptSource(claimed.item_id, race);
            } else {
              getDb()
                .prepare(
                  `INSERT INTO content_processing_holds(
                     id,item_id,expected_content_revision,state
                   ) VALUES(?,?,1,'held')`,
                )
                .run(`hold-${race}`, claimed.item_id);
            }
            return {
              provider: "youtube_innertube_timedtext",
              state: "success",
              retryable: false,
              content: {
                title: itemBefore.title,
                body: `READY_SCHEMA_${race}_BODY_SENTINEL`,
                author: null,
                source_url: itemBefore.source_url!,
                extraction_warning: null,
                source_platform: "youtube",
                capture_quality: "transcript",
                extraction_method: "youtube_innertube_timedtext",
              },
            };
          },
          recordProviderOutcome: () => {
            providerOutcomeWrites += 1;
            throw new Error("provider outcome must remain inert");
          },
          upgrade: async () => {
            upgrades += 1;
            throw new Error("upgrade must not run");
          },
          finalizeAttempt: () => {
            finalizations += 1;
            throw new Error("finalization must not run");
          },
          logContainmentDiagnostic: () => {
            diagnosticWrites += 1;
          },
        });

        assert.equal(outcome, "blocked");
        assert.deepEqual(
          {
            providerOutcomeWrites,
            upgrades,
            finalizations,
            diagnosticWrites,
          },
          {
            providerOutcomeWrites: 0,
            upgrades: 0,
            finalizations: 0,
            diagnosticWrites: 0,
          },
        );
        assert.deepEqual(getItem(claimed.item_id), itemBefore);
        assert.deepEqual(getTranscriptJobForItem(claimed.item_id), jobBefore);
        assert.deepEqual(listTranscriptAttemptsForItem(claimed.item_id), []);

        getDb().prepare("DELETE FROM items WHERE id = ?").run(claimed.item_id);
        getDb().prepare("DELETE FROM content_processing_holds").run();
      }
    });
  });
});
