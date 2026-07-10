#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const scratch = mkdtempSync(join(tmpdir(), "recall-apply-report-check-"));

try {
  const goodReport = baseReport({
    cardsSeen: 2,
    cardsImported: 2,
    cardsPlannedForImport: 2,
    totalCharsPlanned: 1200,
    totalChunksFetched: 2,
    fidelityCounts: { complete_enough_for_daily_import: 2 },
    plannedActionCounts: { imported: 2 },
  });
  const goodPath = writeReport("good.json", goodReport);
  expectPass([goodPath, "--max-applied-imports", "5", "--require-applied-imports"]);

  const dryRunModePath = writeReport(
    "dry-run-mode.json",
    baseReport({
      mode: "dry_run",
      cardsSeen: 1,
      cardsImported: 0,
      cardsPlannedForImport: 1,
      fidelityCounts: { complete_enough_for_daily_import: 1 },
      plannedActionCounts: { imported: 1 },
      checkpointAdvanced: false,
    }),
  );
  expectFail([dryRunModePath]);

  const checkpointPath = writeReport(
    "checkpoint.json",
    baseReport({
      cardsSeen: 1,
      cardsImported: 1,
      cardsPlannedForImport: 1,
      fidelityCounts: { complete_enough_for_daily_import: 1 },
      plannedActionCounts: { imported: 1 },
      checkpointAdvanced: false,
    }),
  );
  expectFail([checkpointPath]);

  const blockedPath = writeReport(
    "blocked.json",
    baseReport({
      state: "blocked",
      exitCode: 70,
      errorName: "policy_blocked",
      lastError: "blocked by fidelity policy",
      cardsSeen: 1,
      cardsBlocked: 1,
      fidelityCounts: { api_chunks_unverified: 1 },
      policyBlockCounts: { api_chunks_unverified: 1 },
      plannedActionCounts: { blocked_by_fidelity_policy: 1 },
      checkpointAdvanced: false,
    }),
  );
  expectFail([blockedPath]);

  const changedRemotePath = writeReport(
    "changed-remote.json",
    baseReport({
      cardsSeen: 1,
      cardsChangedRemote: 1,
      cardsPlannedForImport: 0,
      fidelityCounts: { complete_enough_for_daily_import: 1 },
      plannedActionCounts: { changed_remote: 1 },
    }),
  );
  expectFail([changedRemotePath]);

  const capPath = writeReport(
    "cap.json",
    baseReport({
      cardsSeen: 6,
      cardsImported: 6,
      cardsPlannedForImport: 6,
      fidelityCounts: { complete_enough_for_daily_import: 6 },
      plannedActionCounts: { imported: 6 },
    }),
  );
  expectFail([capPath, "--max-applied-imports", "5"]);

  const riskyAllowedPath = writeReport(
    "risky-allowed.json",
    baseReport({
      cardsSeen: 1,
      cardsImported: 1,
      cardsPlannedForImport: 1,
      fidelityCounts: { api_chunks_unverified: 1 },
      plannedActionCounts: { imported: 1 },
    }),
  );
  expectFail([riskyAllowedPath]);
  expectPass([riskyAllowedPath, "--allow-unverified-fidelity"]);

  const secretPath = writeReport(
    "secret.json",
    baseReport({
      cardsSeen: 1,
      cardsImported: 1,
      cardsPlannedForImport: 1,
      fidelityCounts: { complete_enough_for_daily_import: 1 },
      plannedActionCounts: { imported: 1 },
      lastError: "Bearer sk_secretshouldnotleak12345",
    }),
  );
  const secretFailure = expectFail([secretPath]);
  assert(!secretFailure.stderr.includes("sk_secretshouldnotleak12345"), "secret-shaped failure output must be redacted");

  const rawPayloadPath = writeReport(
    "raw-payload.json",
    baseReport({
      cardsSeen: 1,
      cardsImported: 1,
      cardsPlannedForImport: 1,
      fidelityCounts: { complete_enough_for_daily_import: 1 },
      plannedActionCounts: { imported: 1 },
      sample: { title: "private title should not be in report" },
    }),
  );
  expectFail([rawPayloadPath]);

  const stalePath = writeReport(
    "stale.json",
    baseReport({
      cardsSeen: 1,
      cardsImported: 1,
      cardsPlannedForImport: 1,
      fidelityCounts: { complete_enough_for_daily_import: 1 },
      plannedActionCounts: { imported: 1 },
    }),
  );
  const staleDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
  utimesSync(stalePath, staleDate, staleDate);
  expectFail([stalePath, "--max-age-minutes", "120"]);

  const futurePath = writeReport(
    "future.json",
    baseReport({
      cardsSeen: 1,
      cardsImported: 1,
      cardsPlannedForImport: 1,
      fidelityCounts: { complete_enough_for_daily_import: 1 },
      plannedActionCounts: { imported: 1 },
    }),
  );
  const futureDate = new Date(Date.now() + 10 * 60 * 1000);
  utimesSync(futurePath, futureDate, futureDate);
  expectFail([futurePath, "--max-age-minutes", "120"]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "clean apply report passes",
          "dry-run report mode fails",
          "missing checkpoint advancement fails",
          "blocked report fails",
          "changed remote report fails",
          "applied import cap fails",
          "risky fidelity requires explicit validator allow flag",
          "obvious secret leak fails with redacted output",
          "raw payload fields fail",
          "stale report fails",
          "future-dated report fails",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function baseReport(overrides = {}) {
  const report = {
    mode: "apply",
    state: "done",
    exitCode: 0,
    errorName: null,
    lastError: null,
    dateFrom: "2026-06-24T00:00:00.000Z",
    dateTo: "2026-06-24T23:59:59.000Z",
    cardsSeen: 0,
    cardsAvailable: 0,
    enumerationComplete: true,
    cardsImported: 0,
    cardsUpgraded: 0,
    cardsSkipped: 0,
    cardsChangedRemote: 0,
    cardsBlocked: 0,
    cardsPlannedForImport: 0,
    totalCharsPlanned: 0,
    totalChunksFetched: 0,
    fidelityCounts: {},
    policyBlockCounts: {},
    policyBlockReasons: [],
    plannedActionCounts: {},
    checkpointAdvanced: true,
    lockAcquired: true,
    staleLockRecovered: false,
    ...overrides,
  };
  if (!Object.prototype.hasOwnProperty.call(overrides, "cardsAvailable")) {
    report.cardsAvailable = report.cardsSeen;
  }
  if (!Object.prototype.hasOwnProperty.call(overrides, "enumerationComplete")) {
    report.enumerationComplete = report.cardsAvailable === report.cardsSeen;
  }
  return report;
}

function writeReport(name, report) {
  const path = join(scratch, name);
  writeFileSync(path, JSON.stringify(report, null, 2), "utf8");
  return path;
}

function expectPass(args) {
  const result = run(args);
  if (result.status !== 0) {
    throw new Error(`Expected pass, got ${result.status}: ${result.stderr || result.stdout}`);
  }
  return result;
}

function expectFail(args) {
  const result = run(args);
  if (result.status === 0) {
    throw new Error(`Expected failure, got pass: ${result.stdout}`);
  }
  return result;
}

function run(args) {
  return spawnSync(process.execPath, ["scripts/check-recall-apply-report.mjs", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
