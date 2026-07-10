#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import Database from "better-sqlite3";

const scratch = mkdtempSync(join(tmpdir(), "recall-first-apply-readiness-smoke-"));
const staleEnv = "data/private/recall-live-spikes/smoke-first-apply-readiness-stale.env";

try {
  const enumeration = join(scratch, "SPIKE-013.md");
  const fidelity = join(scratch, "SPIKE-014.md");
  const manifest = join(scratch, "controlled-samples.json");
  const dryRunReport = join(scratch, "dry-run-report.json");
  const backup = join(scratch, "backup.sqlite");
  const nearExpiryBackup = join(scratch, "near-expiry-backup.sqlite");
  const staleBackup = join(scratch, "stale-backup.sqlite");

  writeManifest(manifest);
  writeReport(enumeration, "SPIKE-013", "CLEAR", enumerationEvidence());
  writeReport(fidelity, "SPIKE-014", "PROCEED-WITH-CHANGES", fidelityEvidence());
  writeFileSync(dryRunReport, `${JSON.stringify(dryRunEvidence(), null, 2)}\n`, "utf8");
  writeSqliteBackup(backup);
  writeSqliteBackup(nearExpiryBackup);
  writeSqliteBackup(staleBackup);
  const nearExpiryDate = new Date(Date.now() - 116 * 60 * 1000);
  const staleDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const staleEnvDate = new Date("2026-06-24T15:00:00.000Z");
  utimesSync(nearExpiryBackup, nearExpiryDate, nearExpiryDate);
  utimesSync(staleBackup, staleDate, staleDate);
  chmodSync(backup, 0o600);
  chmodSync(nearExpiryBackup, 0o600);
  chmodSync(staleBackup, 0o600);
  writePrivateEnv(staleEnv);
  utimesSync(staleEnv, staleEnvDate, staleEnvDate);

  const pass = runGate([
    "--skip-live-gate-status",
    "--skip-private-ignore",
    "--skip-key-rotation-evidence",
    "--skip-approval-packet",
    "--skip-public-docs-privacy",
    "--allow-unsafe-manifest-for-smoke",
    "--allow-non-private-dry-run-report",
    "--allow-non-private-backup",
    "--enumeration",
    enumeration,
    "--fidelity",
    fidelity,
    "--manifest",
    manifest,
    "--dry-run-report",
    dryRunReport,
    "--backup-path",
    backup,
  ]);
  assert(pass.status === 0, `readiness smoke should pass: ${pass.stderr || pass.stdout}`);
  assert(
    JSON.parse(pass.stdout).verdict === "PASS_FIRST_CAPPED_APPLY_READINESS_GATE",
    "passing readiness verdict should be explicit",
  );
  const passJson = JSON.parse(pass.stdout);
  const dryRunCheck = passJson.checked.find((check) => check.id === "dry_run_report_proof");
  const backupCheck = passJson.checked.find((check) => check.id === "backup_proof");
  assert(
    Number.isFinite(dryRunCheck?.details?.proofFreshness?.freshnessRemainingMinutes),
    "dry-run proof freshness countdown should be reported",
  );
  assert(
    Number.isFinite(backupCheck?.freshnessRemainingMinutes),
    "backup proof freshness countdown should be reported",
  );

  const staleKeyEvidence = runGate([
    "--skip-live-gate-status",
    "--skip-private-ignore",
    "--skip-approval-packet",
    "--skip-public-docs-privacy",
    "--allow-unsafe-manifest-for-smoke",
    "--allow-non-private-dry-run-report",
    "--allow-non-private-backup",
    "--env-file",
    staleEnv,
    "--key-rotated-after",
    "2026-06-24T15:54:17.000Z",
    "--enumeration",
    enumeration,
    "--fidelity",
    fidelity,
    "--manifest",
    manifest,
    "--dry-run-report",
    dryRunReport,
    "--backup-path",
    backup,
  ]);
  assert(staleKeyEvidence.status === 1, "stale key rotation evidence should fail readiness");
  assert(staleKeyEvidence.stderr.includes("key_rotation_evidence"), "stale key failure should identify key evidence gate");
  assert(
    staleKeyEvidence.stderr.includes("env_file_not_rotated_after_checkpoint"),
    "stale key failure should identify rotation checkpoint rule",
  );
  assert(!staleKeyEvidence.stderr.includes("RECALL_API_KEY="), "key evidence failure must not print env file content");

  const nearExpiry = runGate([
    "--skip-live-gate-status",
    "--skip-private-ignore",
    "--skip-key-rotation-evidence",
    "--skip-approval-packet",
    "--skip-public-docs-privacy",
    "--allow-unsafe-manifest-for-smoke",
    "--allow-non-private-dry-run-report",
    "--allow-non-private-backup",
    "--enumeration",
    enumeration,
    "--fidelity",
    fidelity,
    "--manifest",
    manifest,
    "--dry-run-report",
    dryRunReport,
    "--backup-path",
    nearExpiryBackup,
    "--backup-max-age-minutes",
    "120",
    "--min-freshness-remaining-minutes",
    "5",
  ]);
  assert(nearExpiry.status === 1, "near-expiry backup proof should fail readiness");
  assert(nearExpiry.stderr.includes("proof_expiring_soon"), "near-expiry failure should identify freshness floor");

  const stale = runGate([
    "--skip-live-gate-status",
    "--skip-private-ignore",
    "--skip-key-rotation-evidence",
    "--skip-approval-packet",
    "--skip-public-docs-privacy",
    "--allow-unsafe-manifest-for-smoke",
    "--allow-non-private-dry-run-report",
    "--allow-non-private-backup",
    "--enumeration",
    enumeration,
    "--fidelity",
    fidelity,
    "--manifest",
    manifest,
    "--dry-run-report",
    dryRunReport,
    "--backup-path",
    staleBackup,
    "--backup-max-age-minutes",
    "120",
  ]);
  assert(stale.status === 1, "stale backup proof should fail readiness");
  assert(stale.stderr.includes("stale_backup"), "stale backup failure should identify the backup rule");

  const unaccepted = runGate([
    "--skip-live-gate-status",
    "--skip-private-ignore",
    "--skip-key-rotation-evidence",
    "--skip-approval-packet",
    "--skip-public-docs-privacy",
    "--allow-unsafe-manifest-for-smoke",
    "--allow-non-private-dry-run-report",
    "--allow-non-private-backup",
    "--no-allow-fidelity-changes",
    "--enumeration",
    enumeration,
    "--fidelity",
    fidelity,
    "--manifest",
    manifest,
    "--dry-run-report",
    dryRunReport,
    "--backup-path",
    backup,
  ]);
  assert(unaccepted.status === 1, "unaccepted fidelity changes should fail readiness");
  assert(unaccepted.stderr.includes("live_spike_report_proof"), "failure should identify live report proof gate");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "synthetic first-apply readiness passes",
          "proof freshness countdowns are reported without private content",
          "stale key rotation evidence fails readiness without printing env contents",
          "near-expiry backup proof fails the minimum freshness floor",
          "stale backup proof fails",
          "unaccepted fidelity changes fail",
          "temp artifacts cleaned up",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
  rmSync(staleEnv, { force: true });
}

function runGate(args) {
  return spawnSync(process.execPath, ["--", resolve("scripts/check-recall-first-apply-readiness.mjs"), ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function writeSqliteBackup(path) {
  const db = new Database(path);
  try {
    db.exec("CREATE TABLE proof (id INTEGER PRIMARY KEY, label TEXT); INSERT INTO proof (label) VALUES ('ok');");
  } finally {
    db.close();
  }
}

function writePrivateEnv(path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "RECALL_API_KEY=<redacted-test-value>\nBRAIN_RECALL_CONFIRM_LIVE_API=0\n", "utf8");
  chmodSync(path, 0o600);
}

function writeManifest(path) {
  const labels = requiredLabels();
  writeFileSync(
    path,
    JSON.stringify(
      {
        dateWindow: { dateFrom: "2026-06-24T00:00:00Z", dateTo: "2026-06-24T23:59:59Z" },
        samples: labels.map((label, index) => ({
          label,
          contentType: label === "sample-no-url" ? "no_url" : label.replace("sample-", ""),
          cardId: `card-first-apply-readiness-${index + 1}`,
          expectedTitle: `First apply readiness ${label}`,
          createdAt: "2026-06-24T12:00:00Z",
          sourceUrl: label === "sample-no-url" ? null : `https://example.com/first-apply-readiness/${label}`,
          allowTitleInPublicReport: false,
          allowSourceUrlInPublicReport: false,
        })),
        negativeControl: {
          label: "outside-window",
          cardId: "card-first-apply-readiness-outside-window",
          createdAt: "2026-06-23T12:00:00Z",
          expectedTitle: "First apply readiness outside window",
        },
      },
      null,
      2,
    ),
    "utf8",
  );
}

function writeReport(path, spikeId, verdict, evidence) {
  writeFileSync(
    path,
    `# ${spikeId} - Smoke report

| Field | Value |
|---|---|
| **Spike ID** | ${spikeId} |
| **Date** | 2026-06-24 00:00 IST |
| **Author** | AI agent (Codex) |
| **Time box** | Smoke |
| **Triggered by** | Smoke |
| **Blocks** | Smoke |
| **Verdict** | ${verdict} |

## Evidence

\`\`\`json
${JSON.stringify(evidence, null, 2)}
\`\`\`
`,
    "utf8",
  );
}

function enumerationEvidence() {
  return {
    mode: "recall_rest_enumeration_probe",
    filteredFirst: { resultCount: 6, totalCount: 6 },
    filteredSecond: { resultCount: 6, totalCount: 6 },
    repeatedFilteredStable: true,
    expectedControls: {
      manifest: manifestSummary(),
      positiveIds: requiredLabels().map((label) => ({ id: `<redacted:${label}>`, present: true })),
      negativeIds: [{ id: "<redacted:outside-window>", absent: true }],
      positiveTitles: [],
    },
  };
}

function fidelityEvidence() {
  return {
    mode: "recall_content_fidelity_probe",
    cardCount: 6,
    expectedControls: manifestSummary(),
    cards: requiredLabels().map((label, index) => ({
      id: `<redacted:${label}>`,
      sampleLabel: label,
      contentFidelity: index === 5 ? "api_chunks_unverified" : "complete_enough_for_daily_import",
      maxChunksHit: false,
      policy: {
        shouldImport: index !== 5,
        shouldIndexForRetrieval: index !== 5,
      },
    })),
  };
}

function dryRunEvidence() {
  return {
    mode: "dry_run",
    state: "done",
    exitCode: 0,
    errorName: null,
    lastError: null,
    dateFrom: "2026-06-24T00:00:00.000Z",
    dateTo: "2026-06-24T23:59:59.000Z",
    cardsSeen: 1,
    cardsAvailable: 1,
    enumerationComplete: true,
    cardsImported: 0,
    cardsUpgraded: 0,
    cardsSkipped: 0,
    cardsChangedRemote: 0,
    cardsBlocked: 0,
    cardsPlannedForImport: 1,
    totalCharsPlanned: 1200,
    totalChunksFetched: 1,
    fidelityCounts: { api_chunks_unverified: 1 },
    policyBlockCounts: {},
    policyBlockReasons: [],
    plannedActionCounts: { imported: 1 },
    checkpointAdvanced: false,
    lockAcquired: true,
    staleLockRecovered: false,
  };
}

function manifestSummary() {
  return {
    ok: true,
    sampleCount: 6,
    requiredLabels: requiredLabels(),
    publicPrivacy: {
      titleAllowedCount: 0,
      sourceUrlAllowedCount: 0,
    },
  };
}

function requiredLabels() {
  return [
    "sample-note",
    "sample-article",
    "sample-youtube",
    "sample-pdf",
    "sample-no-url",
    "sample-long",
  ];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
