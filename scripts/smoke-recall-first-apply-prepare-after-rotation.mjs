#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import Database from "better-sqlite3";

const REQUIRED_KEY_ROTATION_ACK =
  "I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.";
const scratch = mkdtempSync(join(tmpdir(), "recall-first-apply-prepare-smoke-"));
const privatePrefix = `data/private/recall-live-spikes/smoke-prepare-${process.pid}`;
const envFile = `${privatePrefix}.env`;
const evidenceFile = `${privatePrefix}-evidence.json`;
const checkpoint = "2026-06-24T15:54:17.000Z";

const server = createServer((request, response) => {
  if (request.url?.startsWith("/api/v1/cards") && request.headers.authorization === "Bearer sk_test_prepare_after_rotation") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ results: [], total_count: 0 }));
    return;
  }
  response.writeHead(401, { "content-type": "application/json" });
  response.end(JSON.stringify({ message: "unauthorized" }));
});

try {
  await listen(server);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
  const enumeration = join(scratch, "SPIKE-013.md");
  const fidelity = join(scratch, "SPIKE-014.md");
  const manifest = join(scratch, "controlled-samples.json");
  const fixture = join(scratch, "fixture.json");
  const dryRunReport = join(scratch, "dry-run-report.json");
  const freshBackup = join(scratch, "fresh-backup.sqlite");
  const nearExpiryBackup = join(scratch, "near-expiry-backup.sqlite");
  const dbPath = join(scratch, "data/brain.sqlite");
  mkdirSync(join(scratch, "data"), { recursive: true });

  writePrivateEnv(envFile);
  writeManifest(manifest);
  writeReport(enumeration, "SPIKE-013", "CLEAR", enumerationEvidence());
  writeReport(fidelity, "SPIKE-014", "PROCEED-WITH-CHANGES", fidelityEvidence());
  writeFileSync(dryRunReport, `${JSON.stringify(dryRunEvidence(), null, 2)}\n`, "utf8");
  writeFixture(fixture);
  writeSqliteBackup(freshBackup);
  writeSqliteBackup(nearExpiryBackup);
  chmodSync(freshBackup, 0o600);
  chmodSync(nearExpiryBackup, 0o600);
  const staleDate = new Date("2026-06-24T15:00:00.000Z");
  utimesSync(envFile, staleDate, staleDate);
  const nearExpiryDate = new Date(Date.now() - 116 * 60 * 1000);
  utimesSync(nearExpiryBackup, nearExpiryDate, nearExpiryDate);

  const planOnly = await runPrepare({
    baseUrl,
    enumeration,
    fidelity,
    manifest,
    dryRunReport,
    backupPath: freshBackup,
    ack: "",
    prepareConfirm: "",
    planOnly: true,
  });
  if (planOnly.status !== 0) {
    throw new Error(`plan-only prepare should pass without acknowledgement or confirmation\nSTDOUT:\n${planOnly.stdout}\nSTDERR:\n${planOnly.stderr}`);
  }
  const planOnlyJson = JSON.parse(planOnly.stdout);
  assert(planOnlyJson.ok === true, "plan-only prepare should report ok true");
  assert(planOnlyJson.mode === "first_apply_prepare_after_rotation_plan", "plan-only prepare should report plan mode");
  assert(
    planOnlyJson.currentStatus?.status === "blocked_key_rotation_evidence",
    "plan-only prepare should summarize current blocker",
  );
  assert(
    planOnlyJson.currentGateSummary?.currentBlockingGate === "key_rotation_evidence" &&
      planOnlyJson.currentGateSummary?.owner === "Arun" &&
      planOnlyJson.currentGateSummary?.externalAction === "rotate_recall_api_key_outside_chat" &&
      planOnlyJson.currentGateSummary?.safeNoWritePreviewCommand === "npm run recall:first-apply:prepare-plan" &&
      planOnlyJson.currentGateSummary?.blockedActions?.includes("proof_refresh") &&
      planOnlyJson.currentGateSummary?.blockedActions?.includes("first_capped_apply") &&
      planOnlyJson.currentGateSummary?.applyAllowedNow === false,
    "plan-only prepare should carry through the status gate summary",
  );
  assert(
    planOnlyJson.requiredBeforeRealPrepare?.includes("Exact BRAIN_RECALL_KEY_ROTATION_ACK text set."),
    "plan-only prepare should name exact acknowledgement as a real-prepare prerequisite",
  );
  assert(
    planOnlyJson.safetyNotes?.includes("Plan mode does not call Recall."),
    "plan-only prepare should explicitly say it does not call Recall",
  );
  assert(!existsSync(evidenceFile), "plan-only prepare must not create private evidence");
  assertNoSecret(planOnly.stdout, "plan-only stdout");

  const missingAck = await runPrepare({
    baseUrl,
    enumeration,
    fidelity,
    manifest,
    dryRunReport,
    backupPath: freshBackup,
    ack: "",
    prepareConfirm: "1",
  });
  assert(missingAck.status === 2, "prepare wrapper should refuse without exact acknowledgement");
  assert(!existsSync(evidenceFile), "missing acknowledgement must not create private evidence");
  assertNoSecret(missingAck.stderr, "missing acknowledgement stderr");

  const missingPrepareConfirm = await runPrepare({
    baseUrl,
    enumeration,
    fidelity,
    manifest,
    dryRunReport,
    backupPath: freshBackup,
    ack: REQUIRED_KEY_ROTATION_ACK,
    prepareConfirm: "",
  });
  assert(missingPrepareConfirm.status === 2, "prepare wrapper should refuse without prepare confirmation");
  assert(!existsSync(evidenceFile), "missing prepare confirmation must not create private evidence");
  assert(missingPrepareConfirm.stderr.includes("missing_prepare_confirmation"), "missing prepare confirmation should name the blocker");
  assertNoSecret(missingPrepareConfirm.stderr, "missing prepare confirmation stderr");

  writeTaintedEvidence(evidenceFile);
  const taintedEvidence = await runPrepare({
    baseUrl,
    enumeration,
    fidelity,
    manifest,
    dryRunReport,
    backupPath: freshBackup,
    ack: REQUIRED_KEY_ROTATION_ACK,
    prepareConfirm: "1",
  });
  assert(taintedEvidence.status === 1, "prepare wrapper should refuse tainted private evidence");
  assert(
    taintedEvidence.stderr.includes("non_recordable_key_evidence_failure"),
    "tainted evidence failure should be non-recordable",
  );
  assert(
    taintedEvidence.stderr.includes("key_rotation_evidence_contains_sk_secret"),
    "tainted evidence failure should name the secret-shape rule",
  );
  assertNoSecret(taintedEvidence.stderr, "tainted evidence stderr");
  assert(
    readFileSync(evidenceFile, "utf8").includes("sk_test_prepare_evidence_secret_12345"),
    "prepare wrapper must not overwrite tainted evidence before failing",
  );
  rmSync(evidenceFile, { force: true });

  const recordOnly = await runPrepare({
    baseUrl,
    enumeration,
    fidelity,
    manifest,
    dryRunReport,
    backupPath: freshBackup,
    ack: REQUIRED_KEY_ROTATION_ACK,
    prepareConfirm: "1",
  });
  if (recordOnly.status !== 0) {
    throw new Error(`record-only prepare should reach readiness\nSTDOUT:\n${recordOnly.stdout}\nSTDERR:\n${recordOnly.stderr}`);
  }
  const recordOnlyJson = JSON.parse(recordOnly.stdout);
  assert(recordOnlyJson.ok === true, "record-only prepare should report ok true");
  assert(recordOnlyJson.steps.some((step) => step.id === "record_private_key_rotation_evidence" && step.ok), "prepare should record evidence");
  assert(evidenceFileSafeWithoutSecret(evidenceFile), "recorded private evidence should be owner-only and not contain key material");
  assertNoSecret(recordOnly.stdout, "record-only stdout");

  rmSync(evidenceFile, { force: true });
  utimesSync(envFile, staleDate, staleDate);
  const refreshPath = await runPrepare({
    baseUrl,
    enumeration,
    fidelity,
    manifest,
    dryRunReport,
    backupPath: nearExpiryBackup,
    fixture,
    dbPath,
    ack: REQUIRED_KEY_ROTATION_ACK,
    prepareConfirm: "1",
  });
  if (refreshPath.status !== 0) {
    throw new Error(`prepare should record evidence and refresh stale proof\nSTDOUT:\n${refreshPath.stdout}\nSTDERR:\n${refreshPath.stderr}`);
  }
  const refreshJson = JSON.parse(refreshPath.stdout);
  assert(refreshJson.ok === true, "refresh prepare should report ok true");
  assert(
    refreshJson.steps.some((step) => step.id === "no_write_ready_or_refresh" && step.ok && step.refreshed),
    "prepare should run no-write refresh when proof is stale",
  );
  assert(JSON.parse(readFileSync(dryRunReport, "utf8")).mode === "dry_run", "refresh should rewrite dry-run proof");
  assert((statSync(nearExpiryBackup).mode & 0o777) === 0o600, "refreshed backup should stay owner-only");
  assertNoSecret(refreshPath.stdout, "refresh stdout");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "plan-only mode passes without acknowledgement or confirmation and creates no private evidence",
          "plan-only mode carries through the status gate summary",
          "missing acknowledgement fails before private evidence creation",
          "missing prepare confirmation fails before private evidence creation",
          "tainted private evidence fails as non-recordable without being overwritten",
          "stale env mtime plus exact acknowledgement records private evidence via read-only auth probe",
          "fresh private evidence can make first-apply status ready when proof is fresh",
          "stale proof is refreshed through existing no-write ready-or-refresh wrapper",
          "output does not print key material",
          "temp private files cleaned up",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  server.close();
  rmSync(scratch, { recursive: true, force: true });
  rmSync(envFile, { force: true });
  rmSync(evidenceFile, { force: true });
}

function runPrepare({ baseUrl, enumeration, fidelity, manifest, dryRunReport, backupPath, fixture = null, dbPath = null, ack, prepareConfirm, planOnly = false }) {
  return new Promise((resolvePrepare, reject) => {
    const child = spawn(process.execPath, [
      "--",
      resolve("scripts/prepare-recall-first-apply-after-rotation.mjs"),
      "--allow-smoke-paths",
      ...(planOnly ? ["--plan-only"] : []),
      "--live-auth-probe-base-url",
      baseUrl,
      "--env-file",
      envFile,
      "--key-rotation-evidence-file",
      evidenceFile,
      "--key-rotated-after",
      checkpoint,
      "--enumeration",
      enumeration,
      "--fidelity",
      fidelity,
      "--manifest",
      manifest,
      "--dry-run-report",
      dryRunReport,
      "--backup-path",
      backupPath,
      ...(fixture ? ["--fixture", fixture] : []),
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BRAIN_RECALL_KEY_ROTATION_ACK: ack,
        BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM: prepareConfirm,
        ...(dbPath ? { BRAIN_DB_PATH: dbPath } : {}),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => resolvePrepare({ status, stdout, stderr }));
  });
}

function listen(httpServer) {
  return new Promise((resolveListen) => httpServer.listen(0, "127.0.0.1", resolveListen));
}

function writePrivateEnv(path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "RECALL_API_KEY=sk_test_prepare_after_rotation\nBRAIN_RECALL_CONFIRM_LIVE_API=0\n", "utf8");
  chmodSync(path, 0o600);
}

function writeTaintedEvidence(path) {
  const createdAtIso = "2026-06-24T16:00:00.000Z";
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        createdAtIso,
        envFile,
        minRotatedAfterIso: checkpoint,
        ackPhraseAccepted: true,
        liveAuthProbe: {
          ok: true,
          httpStatus: 200,
          authenticated: true,
          reachable: true,
        },
        diagnosticLeak: "sk_test_prepare_evidence_secret_12345",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  chmodSync(path, 0o600);
  const mtime = new Date(createdAtIso);
  utimesSync(path, mtime, mtime);
}

function writeSqliteBackup(path) {
  const db = new Database(path);
  try {
    db.exec("CREATE TABLE proof (id INTEGER PRIMARY KEY, label TEXT); INSERT INTO proof (label) VALUES ('ok');");
  } finally {
    db.close();
  }
}

function writeFixture(path) {
  writeFileSync(
    path,
    JSON.stringify(
      {
        cards: [
          {
            id: "first-apply-prepare-smoke-card-001",
            title: "First apply prepare smoke card",
            created_at: "2026-06-16T12:00:00.000Z",
            source_url: "https://example.com/first-apply-prepare-smoke",
            chunks: [{ chunk_id: "chunk-001", content: "First apply prepare smoke content." }],
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
          cardId: `card-first-apply-prepare-${index + 1}`,
          expectedTitle: `First apply prepare ${label}`,
          createdAt: "2026-06-16T12:00:00.000Z",
          sourceUrl: label === "sample-no-url" ? null : `https://example.com/first-apply-prepare/${label}`,
          allowTitleInPublicReport: false,
          allowSourceUrlInPublicReport: false,
        })),
        negativeControl: {
          label: "outside-window",
          cardId: "card-first-apply-prepare-outside-window",
          createdAt: "2026-06-15T12:00:00.000Z",
          expectedTitle: "First apply prepare outside window",
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
    `# ${spikeId} - First apply prepare smoke report

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
    checkpointBefore: "2026-06-15T00:00:00.000Z",
    checkpointAfter: "2026-06-15T00:00:00.000Z",
    checkpointAdvanced: false,
    runId: "recall_first_apply_prepare_smoke",
  };
}

function requiredLabels() {
  return ["sample-note", "sample-article", "sample-youtube", "sample-pdf", "sample-no-url", "sample-long"];
}

function manifestSummary() {
  return {
    ok: true,
    sampleCount: 6,
    requiredLabels: requiredLabels(),
    publicPrivacy: { titleAllowedCount: 0, sourceUrlAllowedCount: 0 },
  };
}

function evidenceFileSafeWithoutSecret(path) {
  if (!existsSync(path)) return false;
  const mode = statSync(path).mode & 0o777;
  const text = readFileSync(path, "utf8");
  return mode === 0o600 && !text.includes("sk_test_prepare_after_rotation");
}

function assertNoSecret(value, label) {
  assert(!String(value).includes("sk_test_prepare_after_rotation"), `${label} printed test key`);
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(String(value)), `${label} printed secret-shaped value`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
