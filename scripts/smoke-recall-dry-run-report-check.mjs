#!/usr/bin/env node
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const scratch = mkdtempSync(join(tmpdir(), "recall-dry-run-report-check-"));

try {
  const goodReport = baseReport({
    cardsSeen: 2,
    cardsPlannedForImport: 2,
    totalCharsPlanned: 1200,
    totalChunksFetched: 2,
    fidelityCounts: { complete_enough_for_daily_import: 2 },
    plannedActionCounts: { imported: 2 },
  });
  const goodPath = writeReport("good.json", goodReport);
  expectPass([goodPath, "--max-planned-imports", "5"]);

  const blockedPath = writeReport(
    "blocked.json",
    baseReport({
      cardsSeen: 1,
      cardsBlocked: 1,
      fidelityCounts: { api_chunks_unverified: 1 },
      policyBlockCounts: { api_chunks_unverified: 1 },
      policyBlockReasons: ["Recall chunks are unverified; live sample review is required before import."],
      plannedActionCounts: { blocked_by_fidelity_policy: 1 },
    }),
  );
  expectFail([blockedPath]);

  const checkpointPath = writeReport(
    "checkpoint.json",
    baseReport({
      cardsSeen: 1,
      cardsPlannedForImport: 1,
      fidelityCounts: { complete_enough_for_daily_import: 1 },
      plannedActionCounts: { imported: 1 },
      checkpointAdvanced: true,
    }),
  );
  expectFail([checkpointPath]);

  const stalePath = writeReport(
    "stale.json",
    baseReport({
      cardsSeen: 1,
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
      cardsPlannedForImport: 1,
      fidelityCounts: { complete_enough_for_daily_import: 1 },
      plannedActionCounts: { imported: 1 },
    }),
  );
  const futureDate = new Date(Date.now() + 10 * 60 * 1000);
  utimesSync(futurePath, futureDate, futureDate);
  expectFail([futurePath, "--max-age-minutes", "120"]);

  const missingEnumerationPath = writeReport(
    "missing-enumeration.json",
    omitKeys(
      baseReport({
        cardsSeen: 1,
        cardsPlannedForImport: 1,
        fidelityCounts: { complete_enough_for_daily_import: 1 },
        plannedActionCounts: { imported: 1 },
      }),
      ["cardsAvailable", "enumerationComplete"],
    ),
  );
  expectFail([missingEnumerationPath]);

  const incompleteEnumerationPath = writeReport(
    "incomplete-enumeration.json",
    baseReport({
      cardsSeen: 1,
      cardsAvailable: 2,
      enumerationComplete: false,
      cardsPlannedForImport: 1,
      fidelityCounts: { complete_enough_for_daily_import: 1 },
      plannedActionCounts: { imported: 1 },
    }),
  );
  expectFail([incompleteEnumerationPath]);

  const capPath = writeReport(
    "cap.json",
    baseReport({
      cardsSeen: 6,
      cardsPlannedForImport: 6,
      fidelityCounts: { complete_enough_for_daily_import: 6 },
      plannedActionCounts: { imported: 6 },
    }),
  );
  expectFail([capPath, "--max-planned-imports", "5"]);

  const riskyAllowedPath = writeReport(
    "risky-allowed.json",
    baseReport({
      cardsSeen: 1,
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
      cardsPlannedForImport: 1,
      fidelityCounts: { complete_enough_for_daily_import: 1 },
      plannedActionCounts: { imported: 1 },
      lastError: "Bearer sk_secretshouldnotleak12345",
    }),
  );
  expectFail([secretPath]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "clean dry-run report passes",
          "blocked fidelity report fails",
          "checkpoint advancement fails",
          "stale report fails",
          "future-dated report fails",
          "missing enumeration proof fails",
          "incomplete enumeration proof fails",
          "planned import cap fails",
          "risky fidelity requires explicit validator allow flag",
          "obvious secret leak fails",
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
    mode: "dry_run",
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
    checkpointAdvanced: false,
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

function omitKeys(value, keys) {
  const copy = { ...value };
  for (const key of keys) delete copy[key];
  return copy;
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
}

function expectFail(args) {
  const result = run(args);
  if (result.status === 0) {
    throw new Error(`Expected failure, got pass: ${result.stdout}`);
  }
}

function run(args) {
  return spawnSync(process.execPath, ["scripts/check-recall-dry-run-report.mjs", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}
