#!/usr/bin/env node
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const bundle = resolve(root, "scripts/dist/sync-recall-prod.mjs");
const migrations = resolve(root, "scripts/dist/db/migrations");
const APPROVAL =
  "I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.";

if (!existsSync(bundle) || !existsSync(migrations)) {
  console.error("[smoke:recall-scheduled-wrapper] bundle or packaged migrations missing; run npm run build:recall-cli first.");
  process.exit(1);
}

const tmp = join(tmpdir(), `brain-recall-scheduled-wrapper-${process.pid}-${Date.now()}`);
const scriptsDir = join(tmp, "scripts");
mkdirSync(scriptsDir, { recursive: true });
mkdirSync(join(scriptsDir, "lib"), { recursive: true });
mkdirSync(join(tmp, "run", "brain-recall"), { recursive: true });
mkdirSync(join(tmp, "bin"), { recursive: true });
writeFileSync(join(tmp, "bin", "flock"), "#!/usr/bin/env bash\nexit 0\n", "utf8");
chmodSync(join(tmp, "bin", "flock"), 0o755);
process.env.BRAIN_RECALL_OUTER_LOCK_PATH = join(tmp, "run", "brain-recall", "recall-sync.lock");
process.env.PATH = `${join(tmp, "bin")}:${process.env.PATH ?? ""}`;

try {
  const wrapperSource = readFileSync(resolve(root, "scripts/recall-scheduled-apply.sh"), "utf8");
  assertIncludes(
    wrapperSource,
    "BRAIN_RECALL_KEY_ROTATION_ENV_FILE",
    "scheduled wrapper should prefer the clearer key rotation env-file variable on the real path",
  );
  assertIncludes(
    wrapperSource,
    "BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE",
    "scheduled wrapper should keep the legacy key rotation env-file fallback",
  );
  assertIncludes(
    wrapperSource,
    "--require-key-rotation-evidence",
    "scheduled wrapper should pass key rotation evidence flags into the core apply CLI on the real path",
  );
  assertIncludes(
    wrapperSource,
    "--key-rotation-env-file",
    "scheduled wrapper should pass the configured production key evidence env file into the core apply CLI",
  );
  assertIncludes(
    wrapperSource,
    '${key_rotation_apply_args[@]+"${key_rotation_apply_args[@]}"}',
    "scheduled wrapper should safely expand optional key rotation apply args under set -u",
  );
  assertIncludes(
    wrapperSource,
    "BRAIN_RECALL_REQUIRE_KEY_ROTATION_EVIDENCE=1",
    "scheduled wrapper should set the core key evidence requirement for proof-backed apply",
  );

  cpSync(bundle, join(scriptsDir, "sync-recall-prod.mjs"));
  cpSync(resolve(root, "scripts/dist/recall-sync-lifecycle-prod.mjs"), join(scriptsDir, "recall-sync-lifecycle-prod.mjs"));
  cpSync(resolve(root, "scripts/dist/db"), join(scriptsDir, "db"), { recursive: true });
  cpSync(resolve(root, "scripts/recall-first-apply-preflight.mjs"), join(scriptsDir, "recall-first-apply-preflight.mjs"));
  cpSync(
    resolve(root, "scripts/check-recall-key-rotation-evidence.mjs"),
    join(scriptsDir, "check-recall-key-rotation-evidence.mjs"),
  );
  cpSync(resolve(root, "scripts/check-recall-dry-run-report.mjs"), join(scriptsDir, "check-recall-dry-run-report.mjs"));
  cpSync(resolve(root, "scripts/check-recall-apply-report.mjs"), join(scriptsDir, "check-recall-apply-report.mjs"));
  cpSync(
    resolve(root, "scripts/check-recall-live-spike-reports.mjs"),
    join(scriptsDir, "check-recall-live-spike-reports.mjs"),
  );
  cpSync(
    resolve(root, "scripts/check-recall-public-privacy.mjs"),
    join(scriptsDir, "check-recall-public-privacy.mjs"),
  );
  cpSync(
    resolve(root, "scripts/check-recall-public-manifest-privacy.mjs"),
    join(scriptsDir, "check-recall-public-manifest-privacy.mjs"),
  );
  cpSync(
    resolve(root, "scripts/lib/recall-controlled-samples.mjs"),
    join(scriptsDir, "lib/recall-controlled-samples.mjs"),
  );
  cpSync(resolve(root, "scripts/recall-scheduled-apply.sh"), join(scriptsDir, "recall-scheduled-apply.sh"));
  symlinkSync(resolve(root, "node_modules"), join(tmp, "node_modules"), "dir");

  const fixturePath = join(tmp, "recall-fixture.json");
  const controlledManifestPath = join(tmp, "controlled-samples.json");
  const staleSystemEnvPath = join(tmp, "brain-stale.env");
  const disabledManualOverrideEnvPath = join(tmp, "brain-disabled-manual-overrides.env");
  const enumerationReportPath = join(tmp, "SPIKE-013-recall-rest-enumeration-2026-06-24_00-00-00_IST.md");
  const fidelityReportPath = join(tmp, "SPIKE-014-recall-content-fidelity-2026-06-24_00-00-00_IST.md");
  writeFileSync(
    fixturePath,
    JSON.stringify(
      {
        cards: [
          {
            id: "scheduled-smoke-card-001",
            title: "Recall scheduled smoke card",
            created_at: "2026-06-24T10:00:00Z",
            source_url: "https://example.com/recall-scheduled-smoke",
            chunks: [{ chunk_id: "chunk-001", content: "Scheduled wrapper smoke content from Recall." }],
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
  writeFileSync(controlledManifestPath, JSON.stringify(controlledManifest(), null, 2), "utf8");
  writeFileSync(staleSystemEnvPath, "RECALL_API_KEY=redacted-local-scheduled-smoke\n", "utf8");
  chmodSync(staleSystemEnvPath, 0o600);
  const staleSystemEnvDate = new Date("2026-06-24T15:00:00.000Z");
  utimesSync(staleSystemEnvPath, staleSystemEnvDate, staleSystemEnvDate);
  writeFileSync(
    disabledManualOverrideEnvPath,
    [
      "RECALL_API_KEY=redacted-local-scheduled-smoke",
      "BRAIN_RECALL_MANUAL_VERIFICATION_MODE=0",
      "BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL=stale-disabled-env-approval",
      "BRAIN_RECALL_SYNC_ENABLED=0",
      "BRAIN_RECALL_CONFIRM_LIVE_API=0",
      "BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF=0",
      "BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT=0",
      "BRAIN_RECALL_MAX_IMPORTS=99",
      "",
    ].join("\n"),
    "utf8",
  );
  chmodSync(disabledManualOverrideEnvPath, 0o600);
  writeLiveSpikeReport(enumerationReportPath, "SPIKE-013", "CLEAR", enumerationEvidence());
  writeLiveSpikeReport(fidelityReportPath, "SPIKE-014", "CLEAR", fidelityEvidence());

  const unconfirmedLiveResult = spawnSync("bash", [join(scriptsDir, "recall-scheduled-apply.sh")], {
    cwd: tmp,
    env: {
      ...process.env,
      BRAIN_DIR: tmp,
      BRAIN_RECALL_SYNC_ENABLED: "1",
      BRAIN_RECALL_SCHEDULER_ENABLED: "1",
      BRAIN_RECALL_CONFIRM_LIVE_API: "0",
      BRAIN_RECALL_FIXTURE_PATH: "",
      BRAIN_MIGRATIONS_DIR: "",
      RECALL_API_KEY: "redacted-local-scheduled-smoke",
    },
    encoding: "utf8",
  });

  assertEqual(unconfirmedLiveResult.status, 2, "unconfirmedLive.exitCode");
  if (!unconfirmedLiveResult.stderr.includes("BRAIN_RECALL_CONFIRM_LIVE_API is not 1")) {
    throw new Error("Expected scheduled wrapper to reject unconfirmed live API mode.");
  }
  if (`${unconfirmedLiveResult.stdout}\n${unconfirmedLiveResult.stderr}`.includes("redacted-local-scheduled-smoke")) {
    throw new Error("Scheduled wrapper unconfirmed live failure leaked API key value.");
  }
  if (existsSync(join(tmp, "data/private/recall-live-spikes"))) {
    throw new Error("Scheduled wrapper created report directory before rejecting unconfirmed live API mode.");
  }

  const staleKeyEvidenceResult = spawnSync("bash", [join(scriptsDir, "recall-scheduled-apply.sh")], {
    cwd: tmp,
    env: {
      ...process.env,
      BRAIN_DIR: tmp,
      BRAIN_RECALL_SYNC_ENABLED: "1",
      BRAIN_RECALL_SCHEDULER_ENABLED: "1",
      BRAIN_RECALL_CONFIRM_LIVE_API: "1",
      BRAIN_RECALL_FIXTURE_PATH: "",
      BRAIN_RECALL_KEY_ROTATION_ENV_FILE: staleSystemEnvPath,
      BRAIN_MIGRATIONS_DIR: "",
      RECALL_API_KEY: "redacted-local-scheduled-smoke",
    },
    encoding: "utf8",
  });

  assertEqual(staleKeyEvidenceResult.status, 1, "staleKeyEvidence.exitCode");
  if (!staleKeyEvidenceResult.stderr.includes("env_file_not_rotated_after_checkpoint")) {
    throw new Error("Expected scheduled wrapper to reject stale key rotation evidence.");
  }
  if (`${staleKeyEvidenceResult.stdout}\n${staleKeyEvidenceResult.stderr}`.includes("redacted-local-scheduled-smoke")) {
    throw new Error("Scheduled wrapper stale key evidence failure leaked API key value.");
  }
  if (existsSync(join(tmp, "data/private/recall-live-spikes"))) {
    throw new Error("Scheduled wrapper created report directory before rejecting stale key rotation evidence.");
  }

  const missingLiveSpikeProofResult = spawnSync("bash", [join(scriptsDir, "recall-scheduled-apply.sh")], {
    cwd: tmp,
    env: {
      ...process.env,
      BRAIN_DIR: tmp,
      BRAIN_RECALL_SYNC_ENABLED: "1",
      BRAIN_RECALL_SCHEDULER_ENABLED: "1",
      BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF: "1",
      BRAIN_RECALL_FIXTURE_PATH: fixturePath,
      BRAIN_MIGRATIONS_DIR: "",
      RECALL_API_KEY: "",
    },
    encoding: "utf8",
  });

  assertEqual(missingLiveSpikeProofResult.status, 2, "missingLiveSpikeProof.exitCode");
  if (!missingLiveSpikeProofResult.stderr.includes("live spike report proof paths are required")) {
    throw new Error("Expected scheduled wrapper to reject missing live spike proof paths.");
  }
  if (existsSync(join(tmp, "data/private/recall-live-spikes"))) {
    throw new Error("Scheduled wrapper created report directory before rejecting missing live spike proof paths.");
  }

  const blockedFidelityResult = spawnSync("bash", [join(scriptsDir, "recall-scheduled-apply.sh")], {
    cwd: tmp,
    env: {
      ...process.env,
      BRAIN_DIR: tmp,
      BRAIN_RECALL_SYNC_ENABLED: "1",
      BRAIN_RECALL_SCHEDULER_ENABLED: "1",
      BRAIN_RECALL_FIXTURE_PATH: fixturePath,
      BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF: "1",
      BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH: enumerationReportPath,
      BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH: fidelityReportPath,
      BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH: controlledManifestPath,
      BRAIN_RECALL_MAX_CARDS: "5",
      BRAIN_RECALL_MAX_IMPORTS: "5",
      BRAIN_RECALL_MAX_TOTAL_CHARS: "10000",
      BRAIN_RECALL_MAX_TOTAL_CHUNKS: "20",
      BRAIN_RECALL_MAX_CHUNKS_PER_CARD: "50",
      BRAIN_RECALL_BACKUP_MAX_AGE_MINUTES: "120",
      BRAIN_DB_PATH: join(tmp, "data/brain.sqlite"),
      BRAIN_MIGRATIONS_DIR: "",
      RECALL_API_KEY: "",
    },
    encoding: "utf8",
  });

  if (blockedFidelityResult.status === 0) {
    throw new Error("Expected scheduled wrapper to stop before apply when unverified Recall chunks are not accepted.");
  }
  const blockedReportDir = join(tmp, "data/private/recall-live-spikes");
  if (!existsSync(blockedReportDir)) {
    throw new Error(
      `Expected blocked fidelity run to create a dry-run report directory.\nSTDOUT:\n${blockedFidelityResult.stdout}\nSTDERR:\n${blockedFidelityResult.stderr}`,
    );
  }
  const blockedDryRunReport = readOnlyReport(
    blockedReportDir,
    "scheduled-dry-run-",
    blockedFidelityResult.stdout,
    blockedFidelityResult.stderr,
  );
  assertEqual(
    blockedDryRunReport.plannedActionCounts?.blocked_by_fidelity_policy,
    1,
    "blockedDryRun.plannedActionCounts.blocked_by_fidelity_policy",
  );
  assertEqual(blockedDryRunReport.cardsPlannedForImport, 0, "blockedDryRun.cardsPlannedForImport");
  assertNoReport(blockedReportDir, "scheduled-preflight-");
  assertNoReport(blockedReportDir, "scheduled-apply-");
  rmSync(join(tmp, "data"), { recursive: true, force: true });

  const manualEnvOverrideResult = spawnSync("bash", [join(scriptsDir, "recall-scheduled-apply.sh")], {
    cwd: tmp,
    env: {
      ...process.env,
      BRAIN_DIR: tmp,
      BRAIN_RECALL_SYSTEM_ENV_FILE: disabledManualOverrideEnvPath,
      BRAIN_RECALL_MANUAL_VERIFICATION_MODE: "1",
      BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL,
      BRAIN_RECALL_SYNC_ENABLED: "1",
      BRAIN_RECALL_CONFIRM_LIVE_API: "1",
      BRAIN_RECALL_FIXTURE_PATH: fixturePath,
      BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF: "1",
      BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH: enumerationReportPath,
      BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH: fidelityReportPath,
      BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH: controlledManifestPath,
      BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT: "1",
      BRAIN_RECALL_MAX_CARDS: "5",
      BRAIN_RECALL_MAX_IMPORTS: "5",
      BRAIN_RECALL_MAX_TOTAL_CHARS: "10000",
      BRAIN_RECALL_MAX_TOTAL_CHUNKS: "20",
      BRAIN_RECALL_MAX_CHUNKS_PER_CARD: "50",
      BRAIN_RECALL_BACKUP_MAX_AGE_MINUTES: "120",
      BRAIN_DB_PATH: join(tmp, "data/brain.sqlite"),
      BRAIN_MIGRATIONS_DIR: "",
      RECALL_API_KEY: "",
    },
    encoding: "utf8",
  });

  if (manualEnvOverrideResult.status !== 0) {
    console.error(manualEnvOverrideResult.stdout);
    console.error(manualEnvOverrideResult.stderr);
    throw new Error(`Scheduled wrapper failed to preserve approved manual verification env with exit ${manualEnvOverrideResult.status}`);
  }
  if (!manualEnvOverrideResult.stdout.includes("[recall-scheduled-apply] done")) {
    throw new Error("Scheduled wrapper manual env override smoke did not print completion line.");
  }
  const manualEnvOverrideReportDir = join(tmp, "data/private/recall-live-spikes");
  const manualEnvOverrideDryRunReport = readOnlyReport(
    manualEnvOverrideReportDir,
    "scheduled-dry-run-",
    manualEnvOverrideResult.stdout,
    manualEnvOverrideResult.stderr,
  );
  assertEqual(manualEnvOverrideDryRunReport.cardsPlannedForImport, 1, "manualEnvOverrideDryRun.cardsPlannedForImport");
  rmSync(join(tmp, "data"), { recursive: true, force: true });

  const result = spawnSync("bash", [join(scriptsDir, "recall-scheduled-apply.sh")], {
    cwd: tmp,
    env: {
      ...process.env,
      BRAIN_DIR: tmp,
      BRAIN_RECALL_SYNC_ENABLED: "1",
      BRAIN_RECALL_SCHEDULER_ENABLED: "1",
      BRAIN_RECALL_FIXTURE_PATH: fixturePath,
      BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF: "1",
      BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH: enumerationReportPath,
      BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH: fidelityReportPath,
      BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH: controlledManifestPath,
      BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT: "1",
      BRAIN_RECALL_MAX_CARDS: "5",
      BRAIN_RECALL_MAX_IMPORTS: "5",
      BRAIN_RECALL_MAX_TOTAL_CHARS: "10000",
      BRAIN_RECALL_MAX_TOTAL_CHUNKS: "20",
      BRAIN_RECALL_MAX_CHUNKS_PER_CARD: "50",
      BRAIN_RECALL_BACKUP_MAX_AGE_MINUTES: "120",
      BRAIN_DB_PATH: join(tmp, "data/brain.sqlite"),
      BRAIN_MIGRATIONS_DIR: "",
      RECALL_API_KEY: "",
    },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`Scheduled wrapper smoke failed with exit ${result.status}`);
  }
  if (!result.stdout.includes("[recall-scheduled-apply] done")) {
    throw new Error("Scheduled wrapper smoke did not print completion line.");
  }

  const reportDir = join(tmp, "data/private/recall-live-spikes");
  const dryRunReport = readOnlyReport(reportDir, "scheduled-dry-run-");
  const applyReport = readOnlyReport(reportDir, "scheduled-apply-");
  const preflightReport = readOnlyReport(reportDir, "scheduled-preflight-");

  assertEqual(dryRunReport.state, "done", "dryRun.state");
  assertEqual(dryRunReport.cardsPlannedForImport, 1, "dryRun.cardsPlannedForImport");
  assertEqual(dryRunReport.checkpointAdvanced, false, "dryRun.checkpointAdvanced");
  assertEqual(applyReport.state, "done", "apply.state");
  assertEqual(applyReport.cardsImported, 1, "apply.cardsImported");
  assertEqual(applyReport.cardsPlannedForImport, 1, "apply.cardsPlannedForImport");
  assertEqual(applyReport.checkpointAdvanced, true, "apply.checkpointAdvanced");
  assertEqual(preflightReport.ok, true, "preflight.ok");

  if (existsSync(join(tmp, "src"))) {
    throw new Error("scheduled wrapper temp directory unexpectedly contains src/");
  }

  console.log("[smoke:recall-scheduled-wrapper] ok: scheduled wrapper rejects unconfirmed live mode, stale key rotation evidence through BRAIN_RECALL_KEY_ROTATION_ENV_FILE, missing live-spike proof, and unaccepted unverified Recall chunks, preserves approved manual verification env over disabled system env values, passes core key-evidence flags on the real apply path, then runs live-spike-proofed dry-run, backup proof, proof-backed apply, and post-apply report review with packaged CLI");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

function readOnlyReport(dir, prefix, stdout = "", stderr = "") {
  const matches = readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
    .sort();
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one ${prefix} report, found ${matches.length}; entries=${JSON.stringify(readdirSync(dir).sort())}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
    );
  }
  return JSON.parse(readFileSync(join(dir, matches[0]), "utf8"));
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`Expected ${label}=${expected}, got ${actual}`);
  }
}

function assertIncludes(value, needle, message) {
  if (!value.includes(needle)) throw new Error(message);
}

function assertNoReport(dir, prefix) {
  const matches = readdirSync(dir).filter((name) => name.startsWith(prefix) && name.endsWith(".json"));
  if (matches.length !== 0) {
    throw new Error(`Expected no ${prefix} report, found ${matches.length}`);
  }
}

function writeLiveSpikeReport(path, spikeId, verdict, evidence) {
  writeFileSync(
    path,
    `# ${spikeId} - Recall scheduled wrapper smoke report

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
    filteredFirst: {
      resultCount: 6,
      totalCount: 6,
    },
    filteredSecond: {
      resultCount: 6,
      totalCount: 6,
    },
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
    cards: requiredLabels().map((label) => ({
      id: `<redacted:${label}>`,
      sampleLabel: label,
      contentFidelity: "complete_enough_for_daily_import",
      maxChunksHit: false,
      policy: {
        shouldImport: true,
        shouldIndexForRetrieval: true,
      },
    })),
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

function controlledManifest() {
  return {
    dateWindow: {
      dateFrom: "2026-06-24T00:00:00Z",
      dateTo: "2026-06-24T23:59:59Z",
    },
    samples: requiredLabels().map((label, index) => ({
      label,
      contentType: contentTypeForLabel(label),
      cardId: `card-scheduled-smoke-${index + 1}`,
      expectedTitle: `Scheduled wrapper smoke ${label}`,
      createdAt: "2026-06-24T12:00:00Z",
      sourceUrl: label === "sample-no-url" ? null : `https://example.com/scheduled-smoke/${label}`,
      allowTitleInPublicReport: false,
      allowSourceUrlInPublicReport: false,
    })),
    negativeControl: {
      label: "outside-window",
      cardId: "card-scheduled-smoke-outside-window",
      createdAt: "2026-06-23T12:00:00Z",
      expectedTitle: "Scheduled wrapper smoke outside window",
    },
  };
}

function contentTypeForLabel(label) {
  return {
    "sample-note": "note",
    "sample-article": "article",
    "sample-youtube": "youtube",
    "sample-pdf": "pdf",
    "sample-no-url": "no_url",
    "sample-long": "long",
  }[label];
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
