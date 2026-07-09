import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./sync-runner.test.setup";
import { countItems, getItem, insertCaptured } from "@/db/items";
import {
  getRecallCheckpoint,
  getRecallSyncItem,
  listRecallSyncRuns,
  releaseRecallSyncLock,
  tryAcquireRecallSyncLock,
} from "@/db/recall-sync";
import { importRecallCard } from "./importer";
import { RECALL_SYNC_EXIT_CODES } from "./scheduler";
import { runRecallSync, type RecallSyncClient } from "./sync-runner";
import type { RecallCardDetail } from "./types";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

test("dry-run plans a successful window without writing items or checkpoint", async () => {
  const client = fakeClient([
    {
      id: "runner-dry-run-001",
      title: "Dry run card",
      source_url: "https://example.com/dry-run",
      chunks: [{ content: "Dry run content." }],
    },
  ]);
  const before = countItems();
  const report = await runRecallSync({
    mode: "dry_run",
    client,
    now: Date.parse("2026-06-24T06:00:00.000Z"),
    checkpointIso: null,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
  });

  assert.equal(report.state, "done");
  assert.equal(report.exitCode, RECALL_SYNC_EXIT_CODES.success);
  assert.equal(report.cardsSeen, 1);
  assert.equal(report.totalChunksFetched, 1);
  assert.equal(report.cardsBlocked, 1);
  assert.equal(report.cardsPlannedForImport, 0);
  assert.deepEqual(report.fidelityCounts, { api_chunks_unverified: 1 });
  assert.deepEqual(report.policyBlockCounts, { api_chunks_unverified: 1 });
  assert.equal(report.policyBlockReasons.length, 1);
  assert.deepEqual(report.plannedActionCounts, { blocked_by_fidelity_policy: 1 });
  assert.equal(countItems(), before);
  assert.equal(getRecallCheckpoint(), null);
});

test("dry-run blocks capped enumeration before detail fetch or checkpoint", async () => {
  let detailFetches = 0;
  const client = fakeClient(
    [
      {
        id: "runner-capped-enumeration-001",
        title: "Capped enumeration card",
        source_url: "https://example.com/capped-enumeration",
        chunks: [{ content: "This detail should not be fetched when enumeration is incomplete." }],
      },
    ],
    {
      totalCount: 2,
      onDetailFetch: () => {
        detailFetches += 1;
      },
    },
  );
  const before = countItems();

  const report = await runRecallSync({
    mode: "dry_run",
    client,
    now: Date.parse("2026-06-24T06:01:00.000Z"),
    checkpointIso: null,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
  });

  assert.equal(report.state, "blocked");
  assert.equal(report.exitCode, RECALL_SYNC_EXIT_CODES.cap_exceeded);
  assert.equal(report.errorName, "cap_exceeded");
  assert.equal(report.cardsSeen, 1);
  assert.equal(report.cardsAvailable, 2);
  assert.equal(report.enumerationComplete, false);
  assert.equal(report.cardsBlocked, 1);
  assert.match(report.lastError ?? "", /Recall enumeration incomplete/);
  assert.equal(detailFetches, 0);
  assert.equal(countItems(), before);
  assert.equal(getRecallCheckpoint(), null);
});

test("apply blocks capped enumeration before writes or checkpoint", async () => {
  const before = countItems();

  const report = await runRecallSync({
    mode: "apply",
    client: fakeClient(
      [
        {
          id: "runner-capped-apply-001",
          title: "Capped apply card",
          source_url: "https://example.com/capped-apply",
          chunks: [{ content: "This should not be imported when total_count exceeds returned results." }],
        },
      ],
      { totalCount: 3 },
    ),
    now: Date.parse("2026-06-24T06:01:30.000Z"),
    checkpointIso: null,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
    fidelityPolicy: { allowUnverifiedImport: true },
  });

  assert.equal(report.state, "blocked");
  assert.equal(report.exitCode, RECALL_SYNC_EXIT_CODES.cap_exceeded);
  assert.equal(report.cardsSeen, 1);
  assert.equal(report.cardsAvailable, 3);
  assert.equal(report.enumerationComplete, false);
  assert.equal(report.cardsImported, 0);
  assert.equal(report.checkpointAdvanced, false);
  assert.equal(countItems(), before);
  assert.equal(getRecallCheckpoint(), null);
});

test("dry-run reports fidelity and policy-block breakdowns by class", async () => {
  const client = fakeClient([
    {
      id: "runner-breakdown-unverified-001",
      title: "Breakdown unverified card",
      source_url: "https://example.com/breakdown-unverified",
      chunks: [{ content: "Unverified Recall content." }],
    },
    {
      id: "runner-breakdown-metadata-001",
      title: "Breakdown metadata-only card",
      chunks: [],
    },
    {
      id: "runner-breakdown-truncated-001",
      title: "Breakdown possibly truncated card",
      source_url: "https://example.com/breakdown-truncated",
      chunks: Array.from({ length: 50 }, (_, index) => ({
        content: `Potentially truncated Recall chunk ${index + 1}.`,
      })),
    },
  ]);

  const report = await runRecallSync({
    mode: "dry_run",
    client,
    now: Date.parse("2026-06-24T06:02:00.000Z"),
    checkpointIso: null,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
  });

  assert.equal(report.state, "done");
  assert.equal(report.cardsSeen, 3);
  assert.equal(report.cardsBlocked, 3);
  assert.equal(report.cardsPlannedForImport, 0);
  assert.deepEqual(report.fidelityCounts, {
    api_chunks_unverified: 1,
    metadata_only: 1,
    possibly_truncated: 1,
  });
  assert.deepEqual(report.policyBlockCounts, {
    api_chunks_unverified: 1,
    metadata_only: 1,
    possibly_truncated: 1,
  });
  assert.deepEqual(report.plannedActionCounts, { blocked_by_fidelity_policy: 3 });
  assert.equal(report.policyBlockReasons.length, 3);
  assert.equal(getRecallCheckpoint(), null);
});

test("dry-run predicts already-synced skips before fidelity policy blocks", async () => {
  const detail: RecallCardDetail = {
    id: "runner-dry-run-existing-before-policy-001",
    title: "Existing before policy card",
    source_url: "https://example.com/existing-before-policy",
    chunks: [{ content: "Previously imported unverified Recall content." }],
  };
  const first = importRecallCard(detail, {
    importedAt: 1_000,
    fidelityPolicy: { allowUnverifiedImport: true },
  });
  assert.equal(first.status, "imported");

  const before = countItems();
  const report = await runRecallSync({
    mode: "dry_run",
    client: fakeClient([detail]),
    now: Date.parse("2026-06-24T06:03:00.000Z"),
    checkpointIso: null,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
  });

  assert.equal(report.state, "done");
  assert.equal(report.cardsBlocked, 0);
  assert.equal(report.cardsPlannedForImport, 0);
  assert.deepEqual(report.fidelityCounts, { api_chunks_unverified: 1 });
  assert.deepEqual(report.policyBlockCounts, {});
  assert.deepEqual(report.plannedActionCounts, { skipped_existing: 1 });
  assert.equal(countItems(), before);
});

test("maxImports cap counts planned import writes, not already-synced skips", async () => {
  const alreadySynced: RecallCardDetail = {
    id: "runner-cap-skip-existing-001",
    title: "Cap skip existing card",
    source_url: "https://example.com/cap-skip-existing",
    chunks: [{ content: "Existing Recall content for cap test." }],
  };
  importRecallCard(alreadySynced, {
    importedAt: 1_050,
    fidelityPolicy: { allowUnverifiedImport: true },
  });
  const before = countItems();

  const report = await runRecallSync({
    mode: "dry_run",
    client: fakeClient([
      alreadySynced,
      {
        id: "runner-cap-new-import-001",
        title: "Cap new import card",
        source_url: "https://example.com/cap-new-import",
        chunks: [{ content: "Only this card should count against maxImports." }],
      },
    ]),
    now: Date.parse("2026-06-24T06:03:30.000Z"),
    checkpointIso: null,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
    limits: {
      maxCards: 5,
      maxImports: 1,
      maxTotalChars: 10_000,
      maxTotalChunks: 10,
    },
    fidelityPolicy: { allowUnverifiedImport: true },
  });

  assert.equal(report.state, "done");
  assert.equal(report.exitCode, RECALL_SYNC_EXIT_CODES.success);
  assert.equal(report.cardsPlannedForImport, 1);
  assert.deepEqual(report.plannedActionCounts, {
    skipped_existing: 1,
    imported: 1,
  });
  assert.equal(countItems(), before);
});

test("maxImports cap counts weak upgrades as import writes", async () => {
  const weakUrl = "https://example.com/cap-weak-upgrade";
  insertCaptured({
    source_type: "url",
    title: "Cap weak item",
    body: "Weak metadata shell.",
    source_url: weakUrl,
    source_platform: "generic_article",
    capture_quality: "metadata_only",
    capture_source: "telegram",
  });
  const before = countItems();

  const report = await runRecallSync({
    mode: "dry_run",
    client: fakeClient([
      {
        id: "runner-cap-upgrade-001",
        title: "Cap upgrade card",
        source_url: weakUrl,
        chunks: [{ content: "This weak-item upgrade should count against maxImports." }],
      },
      {
        id: "runner-cap-import-002",
        title: "Cap import card",
        source_url: "https://example.com/cap-import-two",
        chunks: [{ content: "This new import also counts against maxImports." }],
      },
    ]),
    now: Date.parse("2026-06-24T06:03:45.000Z"),
    checkpointIso: null,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
    limits: {
      maxCards: 5,
      maxImports: 1,
      maxTotalChars: 10_000,
      maxTotalChunks: 10,
    },
    upgradeWeakExistingByUrl: true,
    fidelityPolicy: { allowUnverifiedImport: true },
  });

  assert.equal(report.state, "blocked");
  assert.equal(report.exitCode, RECALL_SYNC_EXIT_CODES.cap_exceeded);
  assert.equal(report.cardsPlannedForImport, 2);
  assert.match(report.lastError ?? "", /cards_planned_for_import 2 exceeds max_imports 1/);
  assert.deepEqual(report.plannedActionCounts, {
    upgraded_existing_weak: 1,
    imported: 1,
  });
  assert.equal(countItems(), before);
});

test("dry-run predicts import, skip, changed remote, weak upgrade, and strong source-url skip", async () => {
  const alreadySynced: RecallCardDetail = {
    id: "runner-plan-already-synced-001",
    title: "Already synced plan card",
    source_url: "https://example.com/plan-already-synced",
    chunks: [{ content: "Already synced Recall content." }],
  };
  const changedInitial: RecallCardDetail = {
    id: "runner-plan-changed-001",
    title: "Changed plan card",
    source_url: "https://example.com/plan-changed",
    chunks: [{ content: "Original Recall content." }],
  };
  importRecallCard(alreadySynced, {
    importedAt: 1_100,
    fidelityPolicy: { allowUnverifiedImport: true },
  });
  importRecallCard(changedInitial, {
    importedAt: 1_200,
    fidelityPolicy: { allowUnverifiedImport: true },
  });

  const weakUrl = "https://example.com/plan-weak-source-url";
  insertCaptured({
    source_type: "url",
    title: "Weak source URL item",
    body: "Metadata shell before dry-run planning.",
    source_url: weakUrl,
    source_platform: "generic_article",
    capture_quality: "metadata_only",
    capture_source: "telegram",
  });
  const strongUrl = "https://example.com/plan-strong-source-url";
  insertCaptured({
    source_type: "url",
    title: "Strong source URL item",
    body: "Existing full-text article should not be overwritten.",
    source_url: strongUrl,
    source_platform: "generic_article",
    capture_quality: "full_text",
    capture_source: "web",
  });

  const before = countItems();
  const report = await runRecallSync({
    mode: "dry_run",
    client: fakeClient([
      alreadySynced,
      {
        ...changedInitial,
        chunks: [{ content: "Remote Recall content changed." }],
      },
      {
        id: "runner-plan-weak-upgrade-001",
        title: "Weak upgrade planned card",
        source_url: weakUrl,
        chunks: [{ content: "Recall body can upgrade the weak source URL item." }],
      },
      {
        id: "runner-plan-strong-skip-001",
        title: "Strong skip planned card",
        source_url: strongUrl,
        chunks: [{ content: "Recall body should not overwrite a strong source URL item." }],
      },
      {
        id: "runner-plan-new-import-001",
        title: "New import planned card",
        source_url: "https://example.com/plan-new-import",
        chunks: [{ content: "New Recall import content." }],
      },
    ]),
    now: Date.parse("2026-06-24T06:04:00.000Z"),
    checkpointIso: null,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
    upgradeWeakExistingByUrl: true,
    fidelityPolicy: { allowUnverifiedImport: true },
  });

  assert.equal(report.state, "done");
  assert.equal(report.cardsBlocked, 0);
  assert.equal(report.cardsPlannedForImport, 2);
  assert.deepEqual(report.plannedActionCounts, {
    skipped_existing: 1,
    changed_remote: 1,
    upgraded_existing_weak: 1,
    skipped_existing_source_url: 1,
    imported: 1,
  });
  assert.deepEqual(report.policyBlockCounts, {});
  assert.equal(countItems(), before);
});

test("apply blocks unverified Recall chunks before writes or checkpoint by default", async () => {
  const client = fakeClient([
    {
      id: "runner-policy-block-001",
      title: "Policy block card",
      source_url: "https://example.com/policy-block",
      chunks: [{ content: "Unverified Recall content should not import by default." }],
    },
  ]);
  const before = countItems();
  const checkpointBefore = getRecallCheckpoint();
  const now = Date.parse("2026-06-24T06:05:00.000Z");

  const report = await runRecallSync({
    mode: "apply",
    client,
    now,
    checkpointIso: checkpointBefore,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
  });

  assert.equal(report.state, "blocked");
  assert.equal(report.exitCode, RECALL_SYNC_EXIT_CODES.policy_blocked);
  assert.equal(report.errorName, "policy_blocked");
  assert.equal(report.cardsBlocked, 1);
  assert.equal(report.cardsImported, 0);
  assert.equal(report.cardsPlannedForImport, 0);
  assert.equal(report.checkpointAdvanced, false);
  assert.match(report.lastError ?? "", /api_chunks_unverified=1/);
  assert.deepEqual(report.fidelityCounts, { api_chunks_unverified: 1 });
  assert.deepEqual(report.policyBlockCounts, { api_chunks_unverified: 1 });
  assert.deepEqual(report.plannedActionCounts, { blocked_by_fidelity_policy: 1 });
  assert.equal(countItems(), before);
  assert.equal(getRecallCheckpoint(), checkpointBefore);
  const persisted = listRecallSyncRuns(10).find((run) => run.started_at === now);
  assert.equal(persisted?.state, "blocked");
  const stored = JSON.parse(persisted?.report_json ?? "{}") as {
    fidelityCounts?: Record<string, number>;
    policyBlockCounts?: Record<string, number>;
    plannedActionCounts?: Record<string, number>;
    cardsPlannedForImport?: number;
  };
  assert.deepEqual(stored.fidelityCounts, { api_chunks_unverified: 1 });
  assert.deepEqual(stored.policyBlockCounts, { api_chunks_unverified: 1 });
  assert.deepEqual(stored.plannedActionCounts, { blocked_by_fidelity_policy: 1 });
  assert.equal(stored.cardsPlannedForImport, 0);
});

test("apply imports planned cards and advances checkpoint only after success", async () => {
  const client = fakeClient([
    {
      id: "runner-apply-001",
      title: "Apply card",
      source_url: "https://example.com/apply",
      chunks: [{ content: "Apply content." }],
    },
  ]);
  const before = countItems();
  const now = Date.parse("2026-06-24T06:10:00.000Z");
  const report = await runRecallSync({
    mode: "apply",
    client,
    now,
    checkpointIso: null,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
    fidelityPolicy: { allowUnverifiedImport: true },
  });

  assert.equal(report.state, "done");
  assert.equal(report.cardsImported, 1);
  assert.equal(report.cardsPlannedForImport, 1);
  assert.deepEqual(report.fidelityCounts, { api_chunks_unverified: 1 });
  assert.deepEqual(report.policyBlockCounts, {});
  assert.deepEqual(report.plannedActionCounts, { imported: 1 });
  assert.equal(report.checkpointAdvanced, true);
  assert.equal(countItems(), before + 1);
  assert.equal(getRecallCheckpoint(), "2026-06-24T06:10:00.000Z");
});

test("apply blocks repair-rejected weak upgrades without advancing checkpoint", async () => {
  const sourceUrl = "https://example.com/runner-weak-upgrade-invalid-title";
  insertCaptured({
    source_type: "url",
    title: "Weak item with short Recall text",
    body: "Metadata shell.",
    source_url: sourceUrl,
    source_platform: "generic_article",
    capture_quality: "metadata_only",
    capture_source: "telegram",
  });
  const checkpointBefore = getRecallCheckpoint();
  const before = countItems();

  const report = await runRecallSync({
    mode: "apply",
    client: fakeClient([
      {
        id: "runner-weak-upgrade-invalid-title-001",
        title: "R".repeat(501),
        source_url: sourceUrl,
        chunks: [{ content: "Useful Recall text for a weak upgrade. ".repeat(12) }],
      },
    ]),
    now: Date.parse("2026-06-24T06:39:00.000Z"),
    checkpointIso: checkpointBefore,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
    upgradeWeakExistingByUrl: true,
    fidelityPolicy: { allowUnverifiedImport: true },
  });

  assert.equal(report.state, "blocked");
  assert.equal(report.exitCode, RECALL_SYNC_EXIT_CODES.policy_blocked);
  assert.equal(report.errorName, "policy_blocked");
  assert.equal(report.cardsImported, 0);
  assert.equal(report.cardsUpgraded, 0);
  assert.equal(report.cardsBlocked, 1);
  assert.equal(report.cardsPlannedForImport, 1);
  assert.equal(report.checkpointAdvanced, false);
  assert.deepEqual(report.plannedActionCounts, { upgraded_existing_weak: 1 });
  assert.match(report.lastError ?? "", /blocked_weak_existing=1/);
  assert.equal(countItems(), before);
  assert.equal(getRecallCheckpoint(), checkpointBefore);
  assert.equal(
    getRecallSyncItem("runner-weak-upgrade-invalid-title-001")?.sync_status,
    "blocked",
  );
});

test("apply blocks changed-remote cards before sync mutation or checkpoint", async () => {
  const initial: RecallCardDetail = {
    id: "runner-apply-changed-remote-001",
    title: "Changed remote apply card",
    source_url: "https://example.com/apply-changed-remote",
    chunks: [{ content: "Original Recall content for changed remote." }],
  };
  const first = importRecallCard(initial, {
    importedAt: 1_500,
    fidelityPolicy: { allowUnverifiedImport: true },
  });
  assert.equal(first.status, "imported");
  const syncBefore = getRecallSyncItem(initial.id);
  assert.equal(syncBefore?.sync_status, "imported");
  const before = countItems();
  const checkpointBefore = getRecallCheckpoint();

  const report = await runRecallSync({
    mode: "apply",
    client: fakeClient([
      {
        ...initial,
        chunks: [{ content: "Changed Recall content requires review before checkpoint." }],
      },
    ]),
    now: Date.parse("2026-06-24T06:15:00.000Z"),
    checkpointIso: checkpointBefore,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
    fidelityPolicy: { allowUnverifiedImport: true },
  });

  assert.equal(report.state, "blocked");
  assert.equal(report.exitCode, RECALL_SYNC_EXIT_CODES.remote_changed);
  assert.equal(report.errorName, "remote_changed");
  assert.equal(report.cardsChangedRemote, 1);
  assert.equal(report.cardsBlocked, 1);
  assert.equal(report.cardsPlannedForImport, 0);
  assert.equal(report.checkpointAdvanced, false);
  assert.deepEqual(report.plannedActionCounts, { changed_remote: 1 });
  assert.match(report.lastError ?? "", /review is required/);
  assert.equal(countItems(), before);
  assert.equal(getRecallCheckpoint(), checkpointBefore);
  const syncAfter = getRecallSyncItem(initial.id);
  assert.equal(syncAfter?.sync_status, "imported");
  assert.equal(syncAfter?.content_hash, syncBefore?.content_hash);
});

test("detail fetch failure does not advance checkpoint", async () => {
  const client = fakeClient(
    [
      {
        id: "runner-fail-001",
        title: "Failure card",
        chunks: [{ content: "Will not be returned." }],
      },
    ],
    { failDetailId: "runner-fail-001" },
  );
  const checkpointBefore = getRecallCheckpoint();
  const report = await runRecallSync({
    mode: "apply",
    client,
    now: Date.parse("2026-06-24T06:20:00.000Z"),
    checkpointIso: checkpointBefore,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
  });

  assert.equal(report.state, "error");
  assert.equal(report.exitCode, RECALL_SYNC_EXIT_CODES.partial_failure);
  assert.equal(report.checkpointAdvanced, false);
  assert.equal(getRecallCheckpoint(), checkpointBefore);
});

test("detail caps stop oversized apply runs before writes", async () => {
  const client = fakeClient([
    {
      id: "runner-cap-001",
      title: "Cap card",
      source_url: "https://example.com/cap",
      chunks: [{ content: "This body intentionally exceeds the small cap." }],
    },
  ]);
  const before = countItems();
  const checkpointBefore = getRecallCheckpoint();
  const report = await runRecallSync({
    mode: "apply",
    client,
    now: Date.parse("2026-06-24T06:30:00.000Z"),
    checkpointIso: checkpointBefore,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
    limits: {
      maxCards: 5,
      maxImports: 5,
      maxTotalChars: 10,
      maxTotalChunks: 10,
    },
  });

  assert.equal(report.state, "blocked");
  assert.equal(report.exitCode, RECALL_SYNC_EXIT_CODES.cap_exceeded);
  assert.equal(countItems(), before);
  assert.equal(getRecallCheckpoint(), checkpointBefore);
  const persisted = listRecallSyncRuns(10).find((run) => run.started_at === Date.parse("2026-06-24T06:30:00.000Z"));
  assert.equal(persisted?.state, "blocked");
  assert.equal(persisted?.cards_blocked, 1);
  assert.equal(persisted?.cards_imported, 0);
});

test("persisted run reports redact secrets before storage", async () => {
  const now = Date.parse("2026-06-24T07:00:00.000Z");
  const report = await runRecallSync({
    mode: "dry_run",
    client: {
      async listCards() {
        throw new Error(
          "Recall API 401 Authorization: Bearer sk_live_recall_secret_1234567890",
        );
      },
      async getCardDetail() {
        throw new Error("should not fetch details");
      },
    },
    now,
    checkpointIso: null,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
  });

  assert.equal(report.state, "error");
  assert.equal(report.exitCode, RECALL_SYNC_EXIT_CODES.auth_failure);
  const persisted = listRecallSyncRuns(10).find((run) => run.started_at === now);
  assert.equal(persisted?.state, "error");
  assert.equal(persisted?.last_error, "Recall API 401 Authorization: Bearer <redacted:token>");
  assert.ok(persisted?.report_json);
  assert.doesNotMatch(persisted.report_json ?? "", /sk_live_recall_secret/);
  assert.doesNotMatch(persisted.report_json ?? "", /Bearer sk_/);
  const stored = JSON.parse(persisted.report_json ?? "{}") as { lastError?: string };
  assert.equal(stored.lastError, "Recall API 401 Authorization: Bearer <redacted:token>");
});

test("active lock blocks overlapping runner invocation", async () => {
  const lock = tryAcquireRecallSyncLock({
    owner: "external-run",
    now: 1_000,
    staleAfterMs: 100_000,
  });
  assert.equal(lock.acquired, true);

  const report = await runRecallSync({
    mode: "dry_run",
    client: fakeClient([]),
    now: 2_000,
    checkpointIso: null,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
    lockOwner: "blocked-run",
    staleLockMs: 100_000,
  });

  assert.equal(report.state, "blocked");
  assert.equal(report.exitCode, RECALL_SYNC_EXIT_CODES.locked);
  assert.equal(report.lockAcquired, false);
  assert.equal(releaseRecallSyncLock("external-run"), true);
});

test("retry after import-before-checkpoint crash skips existing card and advances", async () => {
  const detail: RecallCardDetail = {
    id: "runner-crash-window-001",
    title: "Crash window card",
    source_url: "https://example.com/crash-window",
    chunks: [{ content: "Already imported before checkpoint." }],
  };
  const first = importRecallCard(detail, {
    importedAt: 500,
    fidelityPolicy: { allowUnverifiedImport: true },
  });
  assert.equal(first.status, "imported");
  const before = countItems();

  const report = await runRecallSync({
    mode: "apply",
    client: fakeClient([detail]),
    now: Date.parse("2026-06-24T06:40:00.000Z"),
    checkpointIso: null,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
    fidelityPolicy: { allowUnverifiedImport: true },
  });

  assert.equal(report.state, "done");
  assert.equal(report.cardsImported, 0);
  assert.equal(report.cardsSkipped, 1);
  assert.equal(report.checkpointAdvanced, true);
  assert.equal(countItems(), before);
  assert.equal(getRecallCheckpoint(), "2026-06-24T06:40:00.000Z");
});

test("apply can report weak source-URL upgrades when explicitly enabled", async () => {
  const sourceUrl = "https://example.com/runner-weak-upgrade";
  const weak = insertCaptured({
    source_type: "url",
    title: "Runner weak item",
    body: "Metadata shell before Recall upgrade.",
    source_url: sourceUrl,
    source_platform: "generic_article",
    capture_quality: "metadata_only",
    capture_source: "telegram",
  });
  const before = countItems();

  const report = await runRecallSync({
    mode: "apply",
    client: fakeClient([
      {
        id: "runner-weak-upgrade-001",
        title: "Runner Recall upgraded item",
        source_url: sourceUrl,
        chunks: [
          {
            content:
              "Recall daily sync provides enough source detail for this weak item to become useful, searchable, and ready for enrichment with runnerupgradealpha proof text.",
          },
          {
            content:
              "The upgraded body is deliberately long enough to pass repair safety checks while preserving the original AI Brain item identity.",
          },
        ],
      },
    ]),
    now: Date.parse("2026-06-24T06:50:00.000Z"),
    checkpointIso: null,
    firstRunLookbackMs: 60_000,
    overlapMs: 0,
    upgradeWeakExistingByUrl: true,
    fidelityPolicy: { allowUnverifiedImport: true },
  });

  assert.equal(report.state, "done");
  assert.equal(report.cardsImported, 0);
  assert.equal(report.cardsUpgraded, 1);
  assert.equal(report.cardsPlannedForImport, 1);
  assert.equal(report.cardsSkipped, 0);
  assert.equal(report.cardsBlocked, 0);
  assert.equal(countItems(), before);
  assert.match(getItem(weak.id)?.body ?? "", /runnerupgradealpha/);
  assert.equal(getItem(weak.id)?.capture_source, "telegram");
  assert.equal(getItem(weak.id)?.extraction_method, "recall_api_weak_item_upgrade");
  assert.equal(getRecallCheckpoint(), "2026-06-24T06:50:00.000Z");
});

function fakeClient(
  details: RecallCardDetail[],
  options: { failDetailId?: string; totalCount?: number; onDetailFetch?: () => void } = {},
): RecallSyncClient {
  const byId = new Map(details.map((detail) => [detail.id, detail]));
  return {
    async listCards() {
      const cards = details.map((detail) => ({ id: detail.id }));
      return options.totalCount === undefined ? cards : { cards, totalCount: options.totalCount };
    },
    async getCardDetail(cardId) {
      options.onDetailFetch?.();
      if (cardId === options.failDetailId) {
        throw new Error(`Recall API 404 for ${cardId}`);
      }
      const detail = byId.get(cardId);
      if (!detail) throw new Error(`Recall API 404 for ${cardId}`);
      return detail;
    },
  };
}
