#!/usr/bin/env node
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

const root = process.cwd();
const bundle = resolve(root, "scripts/dist/sync-recall-prod.mjs");
const migrations = resolve(root, "scripts/dist/db/migrations");
const keyRotationCheckpoint = "2026-06-24T15:54:17.000Z";

if (!existsSync(bundle) || !existsSync(migrations)) {
  console.error("[smoke:recall-cli] bundle or packaged migrations missing; run npm run build:recall-cli first.");
  process.exit(1);
}

const tmp = join(tmpdir(), `brain-recall-cli-smoke-${process.pid}-${Date.now()}`);
mkdirSync(tmp, { recursive: true });
const packagedCli = join(tmp, "scripts/sync-recall-prod.mjs");

try {
  initTempGitRepo(tmp);
  mkdirSync(join(tmp, "scripts"), { recursive: true });
  mkdirSync(join(tmp, "scripts/lib"), { recursive: true });
  cpSync(bundle, packagedCli);
  cpSync(resolve(root, "scripts/dist/db"), join(tmp, "scripts/db"), { recursive: true });
  cpSync(
    resolve(root, "scripts/check-recall-key-rotation-evidence.mjs"),
    join(tmp, "scripts/check-recall-key-rotation-evidence.mjs"),
  );
  cpSync(
    resolve(root, "scripts/check-recall-live-spike-reports.mjs"),
    join(tmp, "scripts/check-recall-live-spike-reports.mjs"),
  );
  cpSync(
    resolve(root, "scripts/check-recall-public-privacy.mjs"),
    join(tmp, "scripts/check-recall-public-privacy.mjs"),
  );
  cpSync(
    resolve(root, "scripts/check-recall-public-manifest-privacy.mjs"),
    join(tmp, "scripts/check-recall-public-manifest-privacy.mjs"),
  );
  cpSync(
    resolve(root, "scripts/lib/recall-controlled-samples.mjs"),
    join(tmp, "scripts/lib/recall-controlled-samples.mjs"),
  );
  symlinkSync(resolve(root, "node_modules"), join(tmp, "node_modules"), "dir");

  const fixturePath = join(tmp, "recall-fixture.json");
  const controlledManifestPath = join(tmp, "controlled-samples.json");
  const dryRunDbPath = join(tmp, "brain-dry-run.sqlite");
  const applyDbPath = join(tmp, "brain-apply.sqlite");
  const backupProofPath = join(tmp, "backup-proof.sqlite");
  const dryRunProofPath = join(tmp, "dry-run-proof.json");
  const keyRotationEnvFile = "data/private/recall-live-spikes/recall.env";
  const enumerationReportPath = join(tmp, "SPIKE-013-recall-rest-enumeration-2026-06-24_00-00-00_IST.md");
  const fidelityReportPath = join(tmp, "SPIKE-014-recall-content-fidelity-2026-06-24_00-00-00_IST.md");
  writeFileSync(
    fixturePath,
    JSON.stringify(
      {
        cards: [
          {
            id: "smoke-card-001",
            title: "Recall CLI smoke card",
            created_at: "2026-06-24T10:00:00Z",
            source_url: "https://example.com/recall-cli-smoke",
            chunks: [{ chunk_id: "chunk-001", content: "Smoke fixture content from Recall." }],
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
  writeFileSync(controlledManifestPath, JSON.stringify(controlledManifest(), null, 2), "utf8");
  writeLiveSpikeReport(enumerationReportPath, "SPIKE-013", "CLEAR", enumerationEvidence());
  writeLiveSpikeReport(fidelityReportPath, "SPIKE-014", "CLEAR", fidelityEvidence());

  const packagedReportGate = run(
    [
      join(tmp, "scripts/check-recall-live-spike-reports.mjs"),
      "--enumeration",
      enumerationReportPath,
      "--fidelity",
      fidelityReportPath,
      "--allow-unsafe-manifest-for-smoke",
      "--manifest",
      controlledManifestPath,
    ],
    { cwd: tmp },
  );
  assertEqual(JSON.parse(packagedReportGate.stdout).manifestPrivacyScan.required, true, "packagedReportGate.manifestPrivacyScan.required");

  run([packagedCli, "--help"], { cwd: tmp });
  const unconfirmedLiveResult = run(
    [
      packagedCli,
      "--dry-run",
      "--db-path",
      dryRunDbPath,
      "--max-cards",
      "1",
    ],
    {
      cwd: tmp,
      env: {
        ...process.env,
        RECALL_API_KEY: "redacted-local-smoke",
        BRAIN_MIGRATIONS_DIR: "",
      },
      allowFailure: true,
    },
  );
  assertEqual(unconfirmedLiveResult.status, 2, "unconfirmedLive.exitCode");
  if (!unconfirmedLiveResult.stderr.includes("requires --confirm-live-api")) {
    throw new Error("Expected unconfirmed live API failure message.");
  }
  if (`${unconfirmedLiveResult.stdout}\n${unconfirmedLiveResult.stderr}`.includes("redacted-local-smoke")) {
    throw new Error("Unconfirmed live API failure leaked API key value.");
  }

  const missingLiveSpikeProofResult = run(
    [
      packagedCli,
      "--dry-run",
      "--require-live-spike-report-proof",
      "--fixture",
      fixturePath,
      "--db-path",
      dryRunDbPath,
    ],
    {
      cwd: tmp,
      env: {
        ...process.env,
        RECALL_API_KEY: "",
        BRAIN_MIGRATIONS_DIR: "",
      },
      allowFailure: true,
    },
  );
  assertEqual(missingLiveSpikeProofResult.status, 2, "missingLiveSpikeProof.exitCode");
  if (!missingLiveSpikeProofResult.stderr.includes("requires --live-spike-enumeration-report-path")) {
    throw new Error("Expected missing live spike proof failure message.");
  }

  const result = run(
    [
      packagedCli,
      "--dry-run",
      "--require-live-spike-report-proof",
      "--live-spike-enumeration-report-path",
      enumerationReportPath,
      "--live-spike-fidelity-report-path",
      fidelityReportPath,
      "--live-spike-manifest-path",
      controlledManifestPath,
      "--fixture",
      fixturePath,
      "--db-path",
      dryRunDbPath,
      "--max-cards",
      "5",
      "--max-imports",
      "5",
    ],
    {
      cwd: tmp,
      env: {
        ...process.env,
        RECALL_API_KEY: "",
        BRAIN_MIGRATIONS_DIR: "",
      },
    },
  );
  const report = JSON.parse(result.stdout);
  assertEqual(report.state, "done", "state");
  assertEqual(report.exitCode, 0, "exitCode");
  assertEqual(report.cardsSeen, 1, "cardsSeen");
  assertEqual(report.cardsAvailable, 1, "cardsAvailable");
  assertEqual(report.enumerationComplete, true, "enumerationComplete");
  assertEqual(report.cardsImported, 0, "cardsImported");
  assertEqual(report.cardsBlocked, 1, "cardsBlocked");
  assertEqual(report.cardsPlannedForImport, 0, "cardsPlannedForImport");
  assertEqual(report.fidelityCounts.api_chunks_unverified, 1, "fidelityCounts.api_chunks_unverified");
  assertEqual(report.policyBlockCounts.api_chunks_unverified, 1, "policyBlockCounts.api_chunks_unverified");
  assertEqual(report.plannedActionCounts.blocked_by_fidelity_policy, 1, "plannedActionCounts.blocked_by_fidelity_policy");
  assertEqual(report.checkpointAdvanced, false, "checkpointAdvanced");

  const backupDb = new Database(backupProofPath);
  backupDb.exec("CREATE TABLE proof(id TEXT PRIMARY KEY); INSERT INTO proof VALUES ('ok');");
  backupDb.close();

  const missingKeyRotationEvidenceResult = run(
    [
      packagedCli,
      "--apply",
      "--confirm-apply",
      "--require-key-rotation-evidence",
      "--key-rotation-env-file",
      keyRotationEnvFile,
      "--key-rotated-after",
      keyRotationCheckpoint,
      "--no-key-rotation-evidence-file",
      "--fixture",
      fixturePath,
      "--db-path",
      applyDbPath,
      "--allow-unverified-import",
    ],
    {
      cwd: tmp,
      env: {
        ...process.env,
        BRAIN_RECALL_SYNC_ENABLED: "1",
        BRAIN_MIGRATIONS_DIR: "",
        RECALL_API_KEY: "",
      },
      allowFailure: true,
    },
  );
  assertEqual(missingKeyRotationEvidenceResult.status, 2, "missingKeyRotationEvidence.exitCode");
  if (!missingKeyRotationEvidenceResult.stderr.includes("Key rotation evidence failed")) {
    throw new Error("Expected missing key rotation evidence failure message.");
  }
  if (!missingKeyRotationEvidenceResult.stderr.includes("missing_env_file")) {
    throw new Error("Expected missing key rotation env-file failure rule.");
  }
  if (`${missingKeyRotationEvidenceResult.stdout}\n${missingKeyRotationEvidenceResult.stderr}`.includes("RECALL_API_KEY=")) {
    throw new Error("Missing key rotation evidence failure leaked env file contents.");
  }
  writeKeyRotationEnv(tmp, keyRotationEnvFile);

  const missingProofResult = run(
    [
      packagedCli,
      "--apply",
      "--confirm-apply",
      "--require-dry-run-proof",
      "--require-backup-proof",
      "--backup-path",
      backupProofPath,
      "--fixture",
      fixturePath,
      "--db-path",
      applyDbPath,
      "--allow-unverified-import",
    ],
    {
      cwd: tmp,
      env: {
        ...process.env,
        BRAIN_RECALL_SYNC_ENABLED: "1",
        BRAIN_MIGRATIONS_DIR: "",
        RECALL_API_KEY: "",
      },
      allowFailure: true,
    },
  );
  assertEqual(missingProofResult.status, 2, "missingProof.exitCode");
  if (!missingProofResult.stderr.includes("requires --dry-run-report-path")) {
    throw new Error("Expected missing dry-run proof failure message.");
  }

  const futureDate = new Date(Date.now() + 10 * 60 * 1000);
  utimesSync(enumerationReportPath, futureDate, futureDate);
  const futureLiveSpikeProofResult = run(
    [
      packagedCli,
      "--dry-run",
      "--fixture",
      fixturePath,
      "--db-path",
      applyDbPath,
      "--max-cards",
      "5",
      "--max-imports",
      "5",
      "--allow-unverified-import",
      "--require-live-spike-report-proof",
      "--live-spike-enumeration-report-path",
      enumerationReportPath,
      "--live-spike-fidelity-report-path",
      fidelityReportPath,
      "--live-spike-manifest-path",
      controlledManifestPath,
      "--output",
      join(tmp, "future-live-spike-proof.json"),
    ],
    {
      cwd: tmp,
      env: {
        ...process.env,
        RECALL_API_KEY: "",
        BRAIN_MIGRATIONS_DIR: "",
      },
      allowFailure: true,
    },
  );
  assertEqual(futureLiveSpikeProofResult.status, 2, "futureLiveSpikeProof.exitCode");
  if (!futureLiveSpikeProofResult.stderr.includes("mtime is more than 1 minute in the future")) {
    throw new Error("Expected future-dated live spike proof failure message.");
  }
  const currentDate = new Date();
  utimesSync(enumerationReportPath, currentDate, currentDate);

  run(
    [
      packagedCli,
      "--dry-run",
      "--fixture",
      fixturePath,
      "--db-path",
      applyDbPath,
      "--max-cards",
      "5",
      "--max-imports",
      "5",
      "--allow-unverified-import",
      "--require-live-spike-report-proof",
      "--live-spike-enumeration-report-path",
      enumerationReportPath,
      "--live-spike-fidelity-report-path",
      fidelityReportPath,
      "--live-spike-manifest-path",
      controlledManifestPath,
      "--output",
      dryRunProofPath,
    ],
    {
      cwd: tmp,
      env: {
        ...process.env,
        RECALL_API_KEY: "",
        BRAIN_MIGRATIONS_DIR: "",
      },
    },
  );
  const dryRunProof = JSON.parse(readFileSync(dryRunProofPath, "utf8"));
  assertEqual(dryRunProof.state, "done", "dryRunProof.state");
  assertEqual(dryRunProof.cardsAvailable, 1, "dryRunProof.cardsAvailable");
  assertEqual(dryRunProof.enumerationComplete, true, "dryRunProof.enumerationComplete");
  assertEqual(dryRunProof.cardsPlannedForImport, 1, "dryRunProof.cardsPlannedForImport");
  assertEqual(dryRunProof.checkpointAdvanced, false, "dryRunProof.checkpointAdvanced");

  const applyArgs = [
    packagedCli,
    "--apply",
    "--confirm-apply",
    "--require-dry-run-proof",
    "--dry-run-report-path",
    dryRunProofPath,
    "--dry-run-report-require-cards-seen",
    "--require-backup-proof",
    "--backup-path",
    backupProofPath,
    "--fixture",
    fixturePath,
    "--db-path",
    applyDbPath,
    "--max-cards",
    "5",
    "--max-imports",
    "5",
    "--allow-unverified-import",
    "--require-key-rotation-evidence",
    "--key-rotation-env-file",
    keyRotationEnvFile,
    "--key-rotated-after",
    keyRotationCheckpoint,
    "--require-live-spike-report-proof",
    "--live-spike-enumeration-report-path",
    enumerationReportPath,
    "--live-spike-fidelity-report-path",
    fidelityReportPath,
    "--live-spike-manifest-path",
    controlledManifestPath,
  ];

  utimesSync(dryRunProofPath, futureDate, futureDate);
  const futureDryRunProofResult = run(applyArgs, {
    cwd: tmp,
    env: {
      ...process.env,
      BRAIN_RECALL_SYNC_ENABLED: "1",
      BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF: "1",
      BRAIN_RECALL_REQUIRE_BACKUP_PROOF: "1",
      RECALL_API_KEY: "",
      BRAIN_MIGRATIONS_DIR: "",
    },
    allowFailure: true,
  });
  assertEqual(futureDryRunProofResult.status, 2, "futureDryRunProof.exitCode");
  if (!futureDryRunProofResult.stderr.includes("Dry-run proof report mtime is more than 1 minute in the future")) {
    throw new Error("Expected future-dated dry-run proof failure message.");
  }
  utimesSync(dryRunProofPath, new Date(), new Date());

  utimesSync(backupProofPath, futureDate, futureDate);
  const futureBackupProofResult = run(applyArgs, {
    cwd: tmp,
    env: {
      ...process.env,
      BRAIN_RECALL_SYNC_ENABLED: "1",
      BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF: "1",
      BRAIN_RECALL_REQUIRE_BACKUP_PROOF: "1",
      RECALL_API_KEY: "",
      BRAIN_MIGRATIONS_DIR: "",
    },
    allowFailure: true,
  });
  assertEqual(futureBackupProofResult.status, 2, "futureBackupProof.exitCode");
  if (!futureBackupProofResult.stderr.includes("Backup proof mtime is more than 1 minute in the future")) {
    throw new Error("Expected future-dated backup proof failure message.");
  }
  utimesSync(backupProofPath, new Date(), new Date());

  const applyResult = run(
    applyArgs,
    {
      cwd: tmp,
      env: {
        ...process.env,
        BRAIN_RECALL_SYNC_ENABLED: "1",
        BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF: "1",
        BRAIN_RECALL_REQUIRE_BACKUP_PROOF: "1",
        RECALL_API_KEY: "",
        BRAIN_MIGRATIONS_DIR: "",
      },
    },
  );
  const applyReport = JSON.parse(applyResult.stdout);
  assertEqual(applyReport.state, "done", "apply.state");
  assertEqual(applyReport.exitCode, 0, "apply.exitCode");
  assertEqual(applyReport.cardsImported, 1, "apply.cardsImported");
  assertEqual(applyReport.cardsPlannedForImport, 1, "apply.cardsPlannedForImport");
  assertEqual(applyReport.plannedActionCounts.imported, 1, "apply.plannedActionCounts.imported");
  assertEqual(applyReport.checkpointAdvanced, true, "apply.checkpointAdvanced");

  if (existsSync(join(tmp, "src"))) {
    throw new Error("smoke temp directory unexpectedly contains src/");
  }
  console.log("[smoke:recall-cli] ok: bundled CLI runs manifest-aware report proof, live-spike-proof/dry-run, key-rotation-evidence gate, and dry-run-proof/backup-guarded apply with packaged migrations and no src/");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

function initTempGitRepo(path) {
  writeFileSync(join(path, ".gitignore"), "data/private/\n", "utf8");
  const result = spawnSync("git", ["init"], {
    cwd: path,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Failed to initialize temp git repo for key-evidence smoke.\n${result.stderr || result.stdout}`);
  }
}

function writeKeyRotationEnv(baseDir, envFile) {
  const fullPath = join(baseDir, envFile);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, "RECALL_API_KEY=<redacted-test-value>\nBRAIN_RECALL_CONFIRM_LIVE_API=0\n", "utf8");
  chmodSync(fullPath, 0o600);
  const freshDate = new Date("2026-06-24T16:00:00.000Z");
  utimesSync(fullPath, freshDate, freshDate);
}

function run(args, options = {}) {
  const { allowFailure = false, ...spawnOptions } = options;
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    ...spawnOptions,
  });
  if (!allowFailure && result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`Command failed with exit ${result.status}: ${process.execPath} ${args.join(" ")}`);
  }
  return result;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`Expected ${label}=${expected}, got ${actual}`);
  }
}

function writeLiveSpikeReport(path, spikeId, verdict, evidence) {
  writeFileSync(
    path,
    `# ${spikeId} - Recall CLI smoke report

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
      cardId: `card-cli-bundle-smoke-${index + 1}`,
      expectedTitle: `CLI bundle smoke ${label}`,
      createdAt: "2026-06-24T12:00:00Z",
      sourceUrl: label === "sample-no-url" ? null : `https://example.com/cli-bundle-smoke/${label}`,
      allowTitleInPublicReport: false,
      allowSourceUrlInPublicReport: false,
    })),
    negativeControl: {
      label: "outside-window",
      cardId: "card-cli-bundle-smoke-outside-window",
      createdAt: "2026-06-23T12:00:00Z",
      expectedTitle: "CLI bundle smoke outside window",
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
