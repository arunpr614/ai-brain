import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./scheduler.test.setup";
import {
  advanceRecallCheckpoint,
  getRecallCheckpoint,
  releaseRecallSyncLock,
  tryAcquireRecallSyncLock,
} from "@/db/recall-sync";
import {
  RECALL_SYNC_EXIT_CODES,
  classifyRecallSyncError,
  computeRecallSyncWindow,
  evaluateRecallSyncCaps,
  sanitizeRecallSyncReport,
  shouldAdvanceRecallCheckpoint,
} from "./scheduler";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

test("computes first-run and checkpoint windows with overlap", () => {
  const now = Date.parse("2026-06-24T06:00:00.000Z");
  assert.deepEqual(
    computeRecallSyncWindow({
      now,
      checkpointIso: null,
      firstRunLookbackMs: 24 * 60 * 60 * 1000,
      overlapMs: 5 * 60 * 1000,
    }),
    {
      dateFrom: "2026-06-23T05:55:00.000Z",
      dateTo: "2026-06-24T06:00:00.000Z",
    },
  );

  assert.deepEqual(
    computeRecallSyncWindow({
      now,
      checkpointIso: "2026-06-24T05:30:00.000Z",
      firstRunLookbackMs: 24 * 60 * 60 * 1000,
      overlapMs: 10 * 60 * 1000,
    }),
    {
      dateFrom: "2026-06-24T05:20:00.000Z",
      dateTo: "2026-06-24T06:00:00.000Z",
    },
  );
});

test("caps reject oversized dry-run plans before writes", () => {
  const ok = evaluateRecallSyncCaps(
    {
      cardsSeen: 2,
      cardsPlannedForImport: 2,
      totalCharsPlanned: 900,
      totalChunksFetched: 4,
    },
    { maxCards: 5, maxImports: 5, maxTotalChars: 1_000, maxTotalChunks: 10 },
  );
  assert.equal(ok.ok, true);

  const blocked = evaluateRecallSyncCaps(
    {
      cardsSeen: 6,
      cardsPlannedForImport: 3,
      totalCharsPlanned: 1_200,
      totalChunksFetched: 11,
    },
    { maxCards: 5, maxImports: 5, maxTotalChars: 1_000, maxTotalChunks: 10 },
  );
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.equal(blocked.exitCode, RECALL_SYNC_EXIT_CODES.cap_exceeded);
    assert.equal(blocked.violations.length, 3);
  }
});

test("checkpoint advances only after a successful apply run", () => {
  assert.equal(
    shouldAdvanceRecallCheckpoint({
      mode: "dry_run",
      completed: true,
      failures: 0,
      capExceeded: false,
      suspiciousEnumeration: false,
    }),
    false,
  );
  assert.equal(
    shouldAdvanceRecallCheckpoint({
      mode: "apply",
      completed: true,
      failures: 1,
      capExceeded: false,
      suspiciousEnumeration: false,
    }),
    false,
  );
  assert.equal(
    shouldAdvanceRecallCheckpoint({
      mode: "apply",
      completed: true,
      failures: 0,
      capExceeded: false,
      suspiciousEnumeration: false,
    }),
    true,
  );

  advanceRecallCheckpoint("2026-06-24T06:00:00.000Z", 10);
  assert.equal(getRecallCheckpoint(), "2026-06-24T06:00:00.000Z");
});

test("run lock prevents overlap and allows intentional stale recovery", () => {
  const first = tryAcquireRecallSyncLock({
    owner: "run-a",
    now: 1_000,
    staleAfterMs: 10_000,
  });
  assert.equal(first.acquired, true);
  assert.equal(first.recoveredStale, false);

  const second = tryAcquireRecallSyncLock({
    owner: "run-b",
    now: 2_000,
    staleAfterMs: 10_000,
  });
  assert.equal(second.acquired, false);
  assert.equal(second.existingOwner, "run-a");

  const staleWithoutApproval = tryAcquireRecallSyncLock({
    owner: "run-c",
    now: 20_001,
    staleAfterMs: 10_000,
  });
  assert.equal(staleWithoutApproval.acquired, false);

  const recovered = tryAcquireRecallSyncLock({
    owner: "run-d",
    now: 20_002,
    staleAfterMs: 10_000,
    allowStaleRecovery: true,
  });
  assert.equal(recovered.acquired, true);
  assert.equal(recovered.recoveredStale, true);
  assert.equal(releaseRecallSyncLock("run-a"), false);
  assert.equal(releaseRecallSyncLock("run-d"), true);
});

test("exit code mapping is cron-friendly", () => {
  assert.equal(RECALL_SYNC_EXIT_CODES.policy_blocked, 79);
  assert.equal(RECALL_SYNC_EXIT_CODES.remote_changed, 80);
  assert.deepEqual(classifyRecallSyncError(new Error("Recall API 401 unauthorized")), {
    name: "auth_failure",
    exitCode: RECALL_SYNC_EXIT_CODES.auth_failure,
  });
  assert.deepEqual(classifyRecallSyncError(new Error("Recall API 429 rate limit")), {
    name: "rate_limited",
    exitCode: RECALL_SYNC_EXIT_CODES.rate_limited,
  });
  assert.deepEqual(classifyRecallSyncError(new Error("card cap exceeded")), {
    name: "cap_exceeded",
    exitCode: RECALL_SYNC_EXIT_CODES.cap_exceeded,
  });
});

test("dry-run report sanitization removes secrets, private titles, and chunks", () => {
  const report = sanitizeRecallSyncReport({
    title: "Private Recall title",
    source_url: "https://example.com/doc.pdf?token=abc&signature=def",
    authorization: "Authorization: Bearer sk_secretsecretsecret",
    chunks: ["This is a full private chunk body."],
  }) as {
    title: string;
    source_url: string;
    authorization: string;
    chunks: string[];
  };

  assert.equal(report.title, "<redacted:title>");
  assert.equal(report.source_url.includes("abc"), false);
  assert.equal(report.source_url.includes("def"), false);
  assert.equal(report.authorization.includes("sk_secret"), false);
  assert.match(report.chunks[0] ?? "", /^<redacted:content length=/);
});
