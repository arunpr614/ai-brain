#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";

const APPROVAL =
  "I approve the first capped Recall -> AI Brain apply for the 2026-06-16 window, capped at 5 planned imports, using the accepted live-spike proof, reviewed dry-run proof, backup proof, and explicit fidelity flags for unverified and metadata-only Recall content.";
const KEY_ROTATION_ACK =
  "I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.";
const scratch = mkdtempSync(join(tmpdir(), "recall-first-capped-apply-smoke-"));
const staleEnvFile = "data/private/recall-live-spikes/smoke-first-capped-apply-stale.env";

try {
  const wrapperSource = readFileSync("scripts/recall-first-capped-apply.sh", "utf8");
  assert(
    wrapperSource.includes("--require-key-rotation-evidence") &&
      wrapperSource.includes('--key-rotation-env-file "$env_file"') &&
      wrapperSource.includes('${key_rotation_apply_args[@]+"${key_rotation_apply_args[@]}"}'),
    "wrapper should pass key rotation evidence flags into the core apply CLI on the real path",
  );

  const fixture = join(scratch, "fixture.json");
  const manifest = join(scratch, "controlled-samples.json");
  const enumeration = join(scratch, "SPIKE-013.md");
  const fidelity = join(scratch, "SPIKE-014.md");
  const dryRunReport = join(scratch, "dry-run-report.json");
  const backup = join(scratch, "backup.sqlite");
  const applyReport = join(scratch, "first-apply-report.json");
  const dbPath = join(scratch, "data/brain.sqlite");
  mkdirSync(join(scratch, "data"), { recursive: true });

  writeFixture(fixture);
  writeManifest(manifest);
  writeReport(enumeration, "SPIKE-013", "CLEAR", enumerationEvidence());
  writeReport(fidelity, "SPIKE-014", "PROCEED-WITH-CHANGES", fidelityEvidence());
  writeFileSync(dryRunReport, `${JSON.stringify(dryRunEvidence(), null, 2)}\n`, "utf8");
  writeSqliteBackup(backup);
  chmodSync(backup, 0o600);
  writeEnvFile(staleEnvFile);
  const staleEnvDate = new Date("2026-06-24T15:00:00.000Z");
  utimesSync(staleEnvFile, staleEnvDate, staleEnvDate);

  const noApproval = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_APPROVAL: "",
    BRAIN_RECALL_SYNC_ENABLED: "1",
    BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH: fixture,
    BRAIN_RECALL_FIRST_APPLY_REPORT_PATH: applyReport,
  });
  assert(noApproval.status === 2, "wrapper should refuse without exact approval text");
  assert(noApproval.stderr.includes("exact BRAIN_RECALL_FIRST_APPLY_APPROVAL"), "refusal should name approval env");
  assert(!existsSync(applyReport), "wrapper must not create apply report without approval");

  const noKeyRotationAck = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_APPROVAL: APPROVAL,
    BRAIN_RECALL_SYNC_ENABLED: "1",
    BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH: fixture,
    BRAIN_RECALL_FIRST_APPLY_REPORT_PATH: applyReport,
    BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS: "1",
  });
  assert(noKeyRotationAck.status === 2, "wrapper should refuse without key rotation acknowledgement");
  assert(
    noKeyRotationAck.stderr.includes("exact BRAIN_RECALL_KEY_ROTATION_ACK"),
    "refusal should name key rotation acknowledgement env",
  );
  assert(!existsSync(applyReport), "wrapper must not create apply report without key rotation acknowledgement");

  const staleKeyRotationEvidence = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_APPROVAL: APPROVAL,
    BRAIN_RECALL_KEY_ROTATION_ACK: KEY_ROTATION_ACK,
    BRAIN_RECALL_SYNC_ENABLED: "1",
    BRAIN_RECALL_FIRST_APPLY_ENV_FILE: staleEnvFile,
    BRAIN_RECALL_FIRST_APPLY_REPORT_PATH: applyReport,
  });
  assert(staleKeyRotationEvidence.status === 1, "wrapper should refuse stale local key rotation evidence");
  assert(
    staleKeyRotationEvidence.stderr.includes("env_file_not_rotated_after_checkpoint"),
    "stale key rotation evidence should name the mtime rule",
  );
  assert(!staleKeyRotationEvidence.stderr.includes("RECALL_API_KEY="), "stale evidence output must not print env file content");
  assert(!existsSync(applyReport), "wrapper must not create apply report with stale key rotation evidence");

  const result = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_APPROVAL: APPROVAL,
    BRAIN_RECALL_KEY_ROTATION_ACK: KEY_ROTATION_ACK,
    BRAIN_RECALL_SYNC_ENABLED: "1",
    BRAIN_DB_PATH: dbPath,
    BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH: fixture,
    BRAIN_RECALL_FIRST_APPLY_ENUMERATION_REPORT_PATH: enumeration,
    BRAIN_RECALL_FIRST_APPLY_FIDELITY_REPORT_PATH: fidelity,
    BRAIN_RECALL_FIRST_APPLY_MANIFEST_PATH: manifest,
    BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH: dryRunReport,
    BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH: backup,
    BRAIN_RECALL_FIRST_APPLY_REPORT_PATH: applyReport,
    BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS: "1",
    BRAIN_RECALL_FIRST_APPLY_MAX_IMPORTS: "5",
  });

  if (result.status !== 0) {
    throw new Error(`wrapper smoke failed with ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  assert(result.stdout.includes("PASS_FIRST_CAPPED_APPLY_READINESS_GATE"), "wrapper should run readiness gate");
  assert(result.stdout.includes("PASS_POST_APPLY_REVIEW_GATE"), "wrapper should run post-apply report gate");
  assert(result.stdout.includes("[recall-first-capped-apply] done"), "wrapper should print completion line");

  const report = JSON.parse(readFileSync(applyReport, "utf8"));
  assert(report.mode === "apply", "apply report should be apply mode");
  assert(report.state === "done", "apply report should be done");
  assert(report.cardsImported === 1, "fixture apply should import one card");
  assert(report.checkpointAdvanced === true, "fixture apply should advance checkpoint");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "wrapper refuses without exact approval text",
          "wrapper refuses without exact key rotation acknowledgement",
          "wrapper refuses stale local key rotation evidence before readiness or apply",
          "wrapper passes key rotation evidence flags into the core apply CLI on the real path",
          "wrapper runs first-apply readiness gate before apply",
          "wrapper runs fixture-backed capped apply",
          "wrapper runs post-apply report gate",
          "temp artifacts cleaned up",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
  rmSync(staleEnvFile, { force: true });
}

function writeEnvFile(path) {
  mkdirSync("data/private/recall-live-spikes", { recursive: true });
  writeFileSync(path, "RECALL_API_KEY=<redacted-test-value>\nBRAIN_RECALL_CONFIRM_LIVE_API=0\n", "utf8");
  chmodSync(path, 0o600);
}

function runWrapper(env) {
  return spawnSync("bash", ["scripts/recall-first-capped-apply.sh"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BRAIN_RECALL_FIRST_APPLY_ENV_FILE: "data/private/recall-live-spikes/recall.env",
      ...env,
    },
    encoding: "utf8",
  });
}

function writeFixture(path) {
  writeFileSync(
    path,
    JSON.stringify(
      {
        cards: [
          {
            id: "first-capped-apply-smoke-card-001",
            title: "First capped apply smoke card",
            created_at: "2026-06-16T12:00:00.000Z",
            source_url: "https://example.com/first-capped-apply-smoke",
            chunks: [{ chunk_id: "chunk-001", content: "First capped apply smoke content." }],
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
}

function writeSqliteBackup(path) {
  const db = new Database(path);
  try {
    db.exec("CREATE TABLE proof (id INTEGER PRIMARY KEY, label TEXT); INSERT INTO proof (label) VALUES ('ok');");
  } finally {
    db.close();
  }
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
          cardId: `card-first-capped-apply-${index + 1}`,
          expectedTitle: `First capped apply ${label}`,
          createdAt: "2026-06-16T12:00:00.000Z",
          sourceUrl: label === "sample-no-url" ? null : `https://example.com/first-capped-apply/${label}`,
          allowTitleInPublicReport: false,
          allowSourceUrlInPublicReport: false,
        })),
        negativeControl: {
          label: "outside-window",
          cardId: "card-first-capped-apply-outside-window",
          createdAt: "2026-06-15T12:00:00.000Z",
          expectedTitle: "First capped apply outside window",
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
    `# ${spikeId} - First capped apply smoke report

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
    totalCharsPlanned: 33,
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
  return ["sample-note", "sample-article", "sample-youtube", "sample-pdf", "sample-no-url", "sample-long"];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
