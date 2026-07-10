#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

const scratch = mkdtempSync(join(tmpdir(), "recall-first-apply-ready-refresh-smoke-"));

try {
  const fixture = join(scratch, "fixture.json");
  const manifest = join(scratch, "controlled-samples.json");
  const enumeration = join(scratch, "SPIKE-013.md");
  const fidelity = join(scratch, "SPIKE-014.md");
  const badFidelity = join(scratch, "SPIKE-014-bad.md");
  const dryRunReport = join(scratch, "dry-run-report.json");
  const nearExpiryDryRunReport = join(scratch, "near-expiry-dry-run-report.json");
  const mixedNearExpiryDryRunReport = join(scratch, "mixed-near-expiry-dry-run-report.json");
  const backup = join(scratch, "backup.sqlite");
  const nearExpiryBackup = join(scratch, "near-expiry-backup.sqlite");
  const dbPath = join(scratch, "data/brain.sqlite");
  const staleEnv = "data/private/recall-live-spikes/smoke-ready-refresh-stale.env";
  mkdirSync(join(scratch, "data"), { recursive: true });

  writePrivateEnv(staleEnv);
  writeFixture(fixture);
  writeManifest(manifest);
  writeReport(enumeration, "SPIKE-013", "CLEAR", enumerationEvidence());
  writeReport(fidelity, "SPIKE-014", "PROCEED-WITH-CHANGES", fidelityEvidence());
  writeReport(badFidelity, "SPIKE-014", "BLOCKED", fidelityEvidence());
  writeFileSync(dryRunReport, `${JSON.stringify(dryRunEvidence(), null, 2)}\n`, "utf8");
  writeFileSync(nearExpiryDryRunReport, `${JSON.stringify(dryRunEvidence(), null, 2)}\n`, "utf8");
  writeFileSync(mixedNearExpiryDryRunReport, `${JSON.stringify(dryRunEvidence(), null, 2)}\n`, "utf8");
  writeSqliteBackup(backup);
  writeSqliteBackup(nearExpiryBackup);
  chmodSync(backup, 0o600);
  chmodSync(nearExpiryBackup, 0o600);
  const nearExpiryDate = new Date(Date.now() - 116 * 60 * 1000);
  utimesSync(nearExpiryBackup, nearExpiryDate, nearExpiryDate);
  utimesSync(nearExpiryDryRunReport, nearExpiryDate, nearExpiryDate);
  utimesSync(mixedNearExpiryDryRunReport, nearExpiryDate, nearExpiryDate);
  const staleEnvDate = new Date("2026-06-24T15:00:00.000Z");
  utimesSync(staleEnv, staleEnvDate, staleEnvDate);

  const staleKeyEvidence = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS: "0",
    BRAIN_RECALL_FIRST_APPLY_ENV_FILE: staleEnv,
    BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH: dryRunReport,
    BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH: backup,
  });
  assert(staleKeyEvidence.status === 1, "stale key rotation evidence should stop ready-or-refresh");
  assert(
    staleKeyEvidence.stderr.includes("env_file_not_rotated_after_checkpoint"),
    "stale key rotation evidence failure should name the mtime rule",
  );
  assert(
    staleKeyEvidence.stderr.includes("key rotation evidence failed; not refreshing proof"),
    "stale key rotation evidence should not refresh proof",
  );
  assert(
    !staleKeyEvidence.stdout.includes("PASS_FIRST_CAPPED_APPLY_READINESS_GATE"),
    "stale key rotation evidence should stop before readiness",
  );
  assert(
    !staleKeyEvidence.stdout.includes("[recall-first-apply-proof-refresh] done"),
    "stale key rotation evidence must not run refresh wrapper",
  );

  const ready = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM: "0",
    BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH: dryRunReport,
    BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH: backup,
  });
  assert(ready.status === 0, `ready-or-refresh should pass without refresh:\n${ready.stdout}\n${ready.stderr}`);
  assert(ready.stdout.includes("ready_without_refresh"), "ready pass should identify no-refresh path");
  assert(!ready.stdout.includes("[recall-first-apply-proof-refresh] done"), "ready pass must not run refresh wrapper");

  const needsConfirm = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM: "0",
    BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH: dryRunReport,
    BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH: nearExpiryBackup,
  });
  assert(needsConfirm.status === 2, "refreshable proof failure should require explicit refresh confirmation");
  assert(needsConfirm.stderr.includes("refreshable proof failure found"), "confirmation failure should explain refresh need");

  const dryRunOnlyNeedsConfirm = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM: "0",
    BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH: nearExpiryDryRunReport,
    BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH: backup,
  });
  assert(dryRunOnlyNeedsConfirm.status === 2, "near-expiry dry-run proof should require explicit refresh confirmation");
  assert(
    dryRunOnlyNeedsConfirm.stderr.includes("refreshable proof failure found"),
    "dry-run-only confirmation failure should explain refresh need",
  );

  const dryRunOnlyRefreshed = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_READY_REFRESH_CONFIRM: "1",
    BRAIN_DB_PATH: dbPath,
    BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH: fixture,
    BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH: nearExpiryDryRunReport,
    BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH: backup,
  });
  if (dryRunOnlyRefreshed.status !== 0) {
    throw new Error(`ready-or-refresh should refresh near-expiry dry-run proof successfully\nSTDOUT:\n${dryRunOnlyRefreshed.stdout}\nSTDERR:\n${dryRunOnlyRefreshed.stderr}`);
  }
  assert(
    dryRunOnlyRefreshed.stdout.includes("[recall-first-apply-proof-refresh] done"),
    "dry-run-only refresh path should run proof-refresh wrapper",
  );
  assert(dryRunOnlyRefreshed.stdout.includes("PASS_FIRST_CAPPED_APPLY_READINESS_GATE"), "dry-run-only refresh path should rerun readiness");

  const refreshed = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_READY_REFRESH_CONFIRM: "1",
    BRAIN_DB_PATH: dbPath,
    BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH: fixture,
    BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH: dryRunReport,
    BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH: nearExpiryBackup,
  });
  if (refreshed.status !== 0) {
    throw new Error(`ready-or-refresh should refresh proof successfully\nSTDOUT:\n${refreshed.stdout}\nSTDERR:\n${refreshed.stderr}`);
  }
  assert(refreshed.stdout.includes("[recall-first-apply-proof-refresh] done"), "refresh path should run proof-refresh wrapper");
  assert(refreshed.stdout.includes("PASS_FIRST_CAPPED_APPLY_READINESS_GATE"), "refresh path should rerun readiness");
  assert(refreshed.stdout.includes("[recall-first-apply-ready-or-refresh] refreshed"), "refresh path should print completion line");
  assert(JSON.parse(readFileSync(dryRunReport, "utf8")).mode === "dry_run", "refresh should write dry-run proof");
  assert((statSync(nearExpiryBackup).mode & 0o777) === 0o600, "refreshed backup should be mode 0600");

  const blocked = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_READY_REFRESH_CONFIRM: "1",
    BRAIN_RECALL_FIRST_APPLY_FIDELITY_REPORT_PATH: badFidelity,
    BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH: mixedNearExpiryDryRunReport,
    BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH: backup,
  });
  assert(blocked.status !== 0, "mixed refreshable and non-refreshable readiness failure should fail");
  assert(blocked.stderr.includes("non-refreshable gate"), "mixed failure should not refresh");
  assert(!blocked.stdout.includes("[recall-first-apply-proof-refresh] done"), "mixed failure must not run refresh");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "ready proof passes without refresh",
          "stale key rotation evidence stops before readiness or refresh",
          "near-expiry proof requires refresh confirmation",
          "near-expiry dry-run proof requires refresh confirmation",
          "near-expiry dry-run proof refreshes through dry-run and backup preflight",
          "near-expiry proof refreshes through dry-run and backup preflight",
          "mixed refreshable and non-refreshable readiness failure does not refresh",
          "temp artifacts cleaned up",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
  rmSync("data/private/recall-live-spikes/smoke-ready-refresh-stale.env", { force: true });
}

function runWrapper(env) {
  return spawnSync("bash", ["scripts/recall-first-apply-ready-or-refresh.sh"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS: "1",
      BRAIN_RECALL_FIRST_APPLY_ENV_FILE: "data/private/recall-live-spikes/recall.env",
      BRAIN_RECALL_FIRST_APPLY_ENUMERATION_REPORT_PATH: env.BRAIN_RECALL_FIRST_APPLY_ENUMERATION_REPORT_PATH ?? join(scratch, "SPIKE-013.md"),
      BRAIN_RECALL_FIRST_APPLY_FIDELITY_REPORT_PATH: env.BRAIN_RECALL_FIRST_APPLY_FIDELITY_REPORT_PATH ?? join(scratch, "SPIKE-014.md"),
      BRAIN_RECALL_FIRST_APPLY_MANIFEST_PATH: env.BRAIN_RECALL_FIRST_APPLY_MANIFEST_PATH ?? join(scratch, "controlled-samples.json"),
      ...env,
    },
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
  mkdirSync("data/private/recall-live-spikes", { recursive: true });
  writeFileSync(path, "RECALL_API_KEY=<redacted-test-value>\nBRAIN_RECALL_CONFIRM_LIVE_API=0\n", "utf8");
  chmodSync(path, 0o600);
}

function writeFixture(path) {
  writeFileSync(
    path,
    JSON.stringify(
      {
        cards: [
          {
            id: "first-apply-ready-refresh-smoke-card-001",
            title: "First apply ready refresh smoke card",
            created_at: "2026-06-16T12:00:00.000Z",
            source_url: "https://example.com/first-apply-ready-refresh-smoke",
            chunks: [{ chunk_id: "chunk-001", content: "First apply ready refresh smoke content." }],
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
}

function writeManifest(path) {
  writeFileSync(
    path,
    JSON.stringify(
      {
        dateWindow: { dateFrom: "2026-06-16T00:00:00.000Z", dateTo: "2026-06-16T23:59:59.999Z" },
        samples: requiredLabels().map((label, index) => ({
          label,
          contentType: label === "sample-no-url" ? "no_url" : label.replace("sample-", ""),
          cardId: `card-first-apply-ready-refresh-${index + 1}`,
          expectedTitle: `First apply ready refresh ${label}`,
          createdAt: "2026-06-16T12:00:00.000Z",
          sourceUrl: label === "sample-no-url" ? null : `https://example.com/first-apply-ready-refresh/${label}`,
          allowTitleInPublicReport: false,
          allowSourceUrlInPublicReport: false,
        })),
        negativeControl: {
          label: "outside-window",
          cardId: "card-first-apply-ready-refresh-outside-window",
          createdAt: "2026-06-15T12:00:00.000Z",
          expectedTitle: "First apply ready refresh outside window",
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
    `# ${spikeId} - First apply ready refresh smoke report

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
    dateFrom: "2026-06-16T00:00:00.000Z",
    dateTo: "2026-06-16T23:59:59.999Z",
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
    publicPrivacy: { titleAllowedCount: 0, sourceUrlAllowedCount: 0 },
  };
}

function requiredLabels() {
  return ["sample-note", "sample-article", "sample-youtube", "sample-pdf", "sample-no-url", "sample-long"];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
