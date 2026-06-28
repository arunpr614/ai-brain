#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const scratch = mkdtempSync(join(tmpdir(), "recall-first-apply-proof-refresh-smoke-"));
const staleEnv = "data/private/recall-live-spikes/smoke-first-apply-proof-refresh-stale.env";
const freshEnv = "data/private/recall-live-spikes/smoke-first-apply-proof-refresh-fresh.env";

try {
  const fixture = join(scratch, "fixture.json");
  const manifest = join(scratch, "controlled-samples.json");
  const enumeration = join(scratch, "SPIKE-013.md");
  const fidelity = join(scratch, "SPIKE-014.md");
  const dryRunReport = join(scratch, "dry-run-report.json");
  const backup = join(scratch, "backup.sqlite");
  const dbPath = join(scratch, "data/brain.sqlite");
  mkdirSync(join(scratch, "data"), { recursive: true });

  writeFixture(fixture);
  writeManifest(manifest);
  writeReport(enumeration, "SPIKE-013", "CLEAR", enumerationEvidence());
  writeReport(fidelity, "SPIKE-014", "PROCEED-WITH-CHANGES", fidelityEvidence());
  writePrivateEnv(staleEnv);
  writePrivateEnv(freshEnv);
  const staleEnvDate = new Date("2026-06-24T15:00:00.000Z");
  utimesSync(staleEnv, staleEnvDate, staleEnvDate);
  const freshEnvDate = new Date("2026-06-24T16:00:00.000Z");
  utimesSync(freshEnv, freshEnvDate, freshEnvDate);

  const refused = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM: "0",
    BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH: fixture,
    BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH: dryRunReport,
    BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH: backup,
  });
  assert(refused.status === 2, "refresh wrapper should require explicit refresh confirmation");
  assert(!existsSync(dryRunReport), "refresh wrapper must not create dry-run report without confirmation");
  assert(!existsSync(backup), "refresh wrapper must not create backup without confirmation");

  const staleKeyEvidence = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM: "1",
    BRAIN_RECALL_FIRST_APPLY_ENV_FILE: staleEnv,
    BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH: dryRunReport,
    BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH: backup,
  });
  assert(staleKeyEvidence.status === 1, "direct proof refresh should stop on stale key evidence");
  assert(
    staleKeyEvidence.stderr.includes("env_file_not_rotated_after_checkpoint"),
    "direct proof refresh stale-key failure should identify rotation checkpoint rule",
  );
  assert(!staleKeyEvidence.stderr.includes("RECALL_API_KEY="), "direct proof refresh must not print env contents");
  assert(!existsSync(dryRunReport), "direct proof refresh must not create dry-run report after stale key evidence");
  assert(!existsSync(backup), "direct proof refresh must not create backup after stale key evidence");

  const missingAck = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM: "1",
    BRAIN_RECALL_FIRST_APPLY_ENV_FILE: freshEnv,
    BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH: dryRunReport,
    BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH: backup,
  });
  assert(missingAck.status === 2, "direct proof refresh should require key rotation acknowledgement");
  assert(
    missingAck.stderr.includes("BRAIN_RECALL_KEY_ROTATION_ACK"),
    "missing acknowledgement failure should name BRAIN_RECALL_KEY_ROTATION_ACK",
  );
  assert(!existsSync(dryRunReport), "direct proof refresh must not create dry-run report without key acknowledgement");
  assert(!existsSync(backup), "direct proof refresh must not create backup without key acknowledgement");

  const result = runWrapper({
    BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM: "1",
    BRAIN_DB_PATH: dbPath,
    BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH: fixture,
    BRAIN_RECALL_FIRST_APPLY_ENUMERATION_REPORT_PATH: enumeration,
    BRAIN_RECALL_FIRST_APPLY_FIDELITY_REPORT_PATH: fidelity,
    BRAIN_RECALL_FIRST_APPLY_MANIFEST_PATH: manifest,
    BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH: dryRunReport,
    BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH: backup,
    BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS: "1",
  });

  if (result.status !== 0) {
    throw new Error(`proof refresh smoke failed with ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  assert(result.stdout.includes("PASS_APPLY_REVIEW_GATE"), "refresh should validate dry-run report");
  assert(result.stdout.includes("PASS_FIRST_CAPPED_APPLY_READINESS_GATE"), "refresh should validate final readiness");
  assert(result.stdout.includes("[recall-first-apply-proof-refresh] done"), "refresh should print completion line");
  assert(JSON.parse(readFileSync(dryRunReport, "utf8")).mode === "dry_run", "refresh should write dry-run report");
  assert(existsSync(backup), "refresh should create backup proof");
  assert((statSync(backup).mode & 0o777) === 0o600, "backup proof should be mode 0600");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "refresh wrapper refuses without confirmation",
          "direct live proof refresh stops on stale key rotation evidence before artifacts",
          "direct live proof refresh requires exact key rotation acknowledgement after key evidence passes",
          "refresh wrapper writes fixture dry-run proof",
          "refresh wrapper creates private-mode backup proof",
          "refresh wrapper runs dry-run and first-apply readiness gates",
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
  rmSync(freshEnv, { force: true });
}

function runWrapper(env) {
  return spawnSync("bash", ["scripts/recall-first-apply-proof-refresh.sh"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BRAIN_RECALL_FIRST_APPLY_ENV_FILE: "data/private/recall-live-spikes/recall.env",
      ...env,
    },
    encoding: "utf8",
  });
}

function writePrivateEnv(path) {
  mkdirSync(dirname(path), { recursive: true });
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
            id: "first-apply-proof-refresh-smoke-card-001",
            title: "First apply proof refresh smoke card",
            created_at: "2026-06-16T12:00:00.000Z",
            source_url: "https://example.com/first-apply-proof-refresh-smoke",
            chunks: [{ chunk_id: "chunk-001", content: "First apply proof refresh smoke content." }],
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
          cardId: `card-first-apply-proof-refresh-${index + 1}`,
          expectedTitle: `First apply proof refresh ${label}`,
          createdAt: "2026-06-16T12:00:00.000Z",
          sourceUrl: label === "sample-no-url" ? null : `https://example.com/first-apply-proof-refresh/${label}`,
          allowTitleInPublicReport: false,
          allowSourceUrlInPublicReport: false,
        })),
        negativeControl: {
          label: "outside-window",
          cardId: "card-first-apply-proof-refresh-outside-window",
          createdAt: "2026-06-15T12:00:00.000Z",
          expectedTitle: "First apply proof refresh outside window",
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
    `# ${spikeId} - First apply proof refresh smoke report

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
