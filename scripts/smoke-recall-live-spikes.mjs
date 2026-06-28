#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const workspace = process.cwd();
const scratch = mkdtempSync(join(tmpdir(), "recall-live-spikes-smoke-"));
const tempLiveEnvPath = `data/private/recall-live-spikes/recall-live-spikes-smoke-${process.pid}-${Date.now()}.env`;

try {
  const samples = controlledSamples();
  const manifestPath = join(scratch, "controlled-samples.json");
  const enumerationFixturePath = join(scratch, "recall-list-fixture.json");
  const fidelityFixturePath = join(scratch, "recall-detail-fixture.json");
  const reportDir = join(scratch, "reports");

  writeControlledManifest(manifestPath, samples);
  writeEnumerationFixture(enumerationFixturePath, samples);
  writeFidelityFixture(fidelityFixturePath, samples);

  const unconfirmedLive = runNodeStatus(
    [
      "scripts/run-recall-live-spikes.mjs",
      "--manifest",
      manifestPath,
    ],
    { RECALL_API_KEY: "redacted-local-smoke" },
  );
  assert(unconfirmedLive.status === 2, "runner should reject live mode without explicit confirmation");
  assert(
    unconfirmedLive.stderr.includes("requires explicit confirmation"),
    "unconfirmed live rejection should explain the confirmation requirement",
  );
  assert(
    !`${unconfirmedLive.stdout}\n${unconfirmedLive.stderr}`.includes("redacted-local-smoke"),
    "unconfirmed live rejection must not leak API key value",
  );

  const mixedFixture = runNodeStatus(
    [
      "scripts/run-recall-live-spikes.mjs",
      "--manifest",
      manifestPath,
      "--enumeration-fixture",
      enumerationFixturePath,
    ],
    { RECALL_API_KEY: "redacted-local-smoke", BRAIN_RECALL_CONFIRM_LIVE_API: "1" },
  );
  assert(mixedFixture.status === 2, "runner should reject mixed fixture/live mode");
  assert(
    mixedFixture.stderr.includes("Mixed fixture/live mode is not allowed"),
    "mixed fixture rejection should explain why it failed",
  );

  const invalidLiveReportDir = join(scratch, "private-live-reports");
  const invalidLiveReportDirResult = runNodeStatus(
    [
      "scripts/run-recall-live-spikes.mjs",
      "--manifest",
      manifestPath,
      "--report-dir",
      invalidLiveReportDir,
      "--confirm-live-api",
    ],
    { RECALL_API_KEY: "redacted-local-smoke" },
  );
  assert(
    invalidLiveReportDirResult.status === 2,
    "runner should reject live report directories outside public SPIKE reports",
  );
  assert(
    invalidLiveReportDirResult.stderr.includes("Live Recall report directory must be docs/plans/spikes"),
    "invalid report directory rejection should explain the public report directory requirement",
  );
  assert(!existsSync(invalidLiveReportDir), "invalid live report directory should not be created");
  assert(
    !`${invalidLiveReportDirResult.stdout}\n${invalidLiveReportDirResult.stderr}`.includes("redacted-local-smoke"),
    "invalid live report directory rejection must not leak API key value",
  );

  writeFileSync(
    tempLiveEnvPath,
    'export RECALL_API_KEY="redacted-local-smoke-env-file"\nexport BRAIN_RECALL_CONFIRM_LIVE_API=1\n',
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );
  const envFileLoadedBeforeManifestSafety = runNodeStatus(
    [
      "scripts/run-recall-live-spikes.mjs",
      "--manifest",
      manifestPath,
      "--env-file",
      tempLiveEnvPath,
    ],
    {},
  );
  assert(
    envFileLoadedBeforeManifestSafety.status === 2,
    "runner should reject unsafe manifest after loading the safe env file",
  );
  assert(
    envFileLoadedBeforeManifestSafety.stderr.includes("private controlled sample manifest"),
    "env-file live path should reach the manifest safety gate after loading credentials",
  );
  assert(
    !`${envFileLoadedBeforeManifestSafety.stdout}\n${envFileLoadedBeforeManifestSafety.stderr}`.includes(
      "redacted-local-smoke-env-file",
    ),
    "env-file live path must not leak API key value",
  );

  const unsafeLiveManifestResult = runNodeStatus(
    [
      "scripts/run-recall-live-spikes.mjs",
      "--manifest",
      manifestPath,
      "--confirm-live-api",
    ],
    { RECALL_API_KEY: "redacted-local-smoke" },
  );
  assert(
    unsafeLiveManifestResult.status === 2,
    "runner should reject unsafe manifest files before live Recall API calls",
  );
  assert(
    unsafeLiveManifestResult.stderr.includes("private controlled sample manifest"),
    "unsafe live manifest rejection should explain the private manifest safety requirement",
  );
  assert(
    !`${unsafeLiveManifestResult.stdout}\n${unsafeLiveManifestResult.stderr}`.includes("redacted-local-smoke"),
    "unsafe live manifest rejection must not leak API key value",
  );

  const output = runSpikeRunner({
    manifestPath,
    enumerationFixturePath,
    fidelityFixturePath,
    reportDir,
  });

  assert(output.ok === true, "runner should report ok");
  assert(output.mode === "offline_fixture_rehearsal", "runner should stay in fixture mode");
  assert(output.manifest?.sampleCount === samples.length, "runner should load all manifest samples");
  assert(
    output.manifest?.requiredLabels?.includes("sample-no-url"),
    "runner manifest summary should include no-url sample",
  );
  assert(output.reports?.enumeration?.verdict === "CLEAR", "SPIKE-013 report should be CLEAR");
  assert(
    output.reports?.fidelity?.verdict === "PROCEED-WITH-CHANGES",
    "SPIKE-014 report should be PROCEED-WITH-CHANGES",
  );
  assert(output.privacyScan?.ok === true, "runner should scan generated reports for privacy leaks");
  assert(
    output.manifestPrivacyScan?.ok === true,
    "runner should scan generated reports against private manifest values",
  );
  assert(
    output.reports?.enumeration?.path ===
      resolve(reportDir, "SPIKE-013-recall-rest-enumeration-2026-06-24_00-00-00_IST.md"),
    "runner should use deterministic SPIKE-013 report path",
  );
  assert(
    output.reports?.fidelity?.path ===
      resolve(reportDir, "SPIKE-014-recall-content-fidelity-2026-06-24_00-00-00_IST.md"),
    "runner should use deterministic SPIKE-014 report path",
  );

  const enumerationReport = readFileSync(output.reports.enumeration.path, "utf8");
  const fidelityReport = readFileSync(output.reports.fidelity.path, "utf8");
  assert(enumerationReport.includes("| **Verdict** | CLEAR |"), "SPIKE-013 Markdown should be CLEAR");
  assert(
    fidelityReport.includes("| **Verdict** | PROCEED-WITH-CHANGES |"),
    "SPIKE-014 Markdown should be PROCEED-WITH-CHANGES",
  );
  assertNoPrivateContent(
    `${JSON.stringify(output)}\n${enumerationReport}\n${fidelityReport}`,
    "runner public outputs",
  );

  const leakyReportPath = join(scratch, "leaky-public-report.md");
  writeFileSync(leakyReportPath, `# Leaky report\n\n${samples[0].expectedTitle}\n`, "utf8");
  const manifestPrivacyLeak = runNodeStatus(
    [
      "scripts/check-recall-public-manifest-privacy.mjs",
      "--allow-unsafe-manifest-for-smoke",
      "--manifest",
      manifestPath,
      leakyReportPath,
    ],
    {},
  );
  assert(manifestPrivacyLeak.status === 1, "manifest privacy checker should reject private title leaks");
  assert(
    manifestPrivacyLeak.stderr.includes("expected_title"),
    "manifest privacy checker should identify the leaked value kind",
  );
  assert(
    !`${manifestPrivacyLeak.stdout}\n${manifestPrivacyLeak.stderr}`.includes(samples[0].expectedTitle),
    "manifest privacy checker must not print the private title value",
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "manifest-driven SPIKE-013/SPIKE-014 runner",
          "SPIKE-013 fixture-backed Markdown report",
          "SPIKE-014 fixture-backed Markdown report",
          "public-output privacy redaction",
          "no live Recall API key required",
          "unconfirmed live API run rejected",
          "mixed fixture/live mode rejected",
          "live report directory outside public SPIKE reports rejected before output creation",
          "safe env file loaded before live manifest safety gate",
          "unsafe live manifest file rejected before Recall API call",
          "manifest-private public report leak rejected without printing private value",
        ],
        reports: {
          enumeration: {
            verdict: output.reports.enumeration.verdict,
          },
          fidelity: {
            verdict: output.reports.fidelity.verdict,
          },
        },
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
  if (existsSync(resolve(tempLiveEnvPath))) rmSync(resolve(tempLiveEnvPath), { force: true });
}

function runSpikeRunner({ manifestPath, enumerationFixturePath, fidelityFixturePath, reportDir }) {
  const stdout = runNode([
    "scripts/run-recall-live-spikes.mjs",
    "--manifest",
    manifestPath,
    "--enumeration-fixture",
    enumerationFixturePath,
    "--fidelity-fixture",
    fidelityFixturePath,
    "--report-dir",
    reportDir,
    "--timestamp",
    "2026-06-24_00-00-00",
  ]);
  return parseJson(stdout, "runner stdout");
}

function runNode(args) {
  const env = { ...process.env };
  delete env.RECALL_API_KEY;
  const result = spawnSync(process.execPath, ["--", ...args], {
    cwd: workspace,
    env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `Command failed (${result.status}): ${process.execPath} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
}

function runNodeStatus(args, envOverrides = {}) {
  const env = { ...process.env };
  delete env.RECALL_API_KEY;
  delete env.BRAIN_RECALL_CONFIRM_LIVE_API;
  const result = spawnSync(process.execPath, ["--", ...args], {
    cwd: workspace,
    env: { ...env, ...envOverrides },
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function writeEnumerationFixture(filePath, samples) {
  const filtered = {
    total_count: samples.length,
    results: samples.map((sample) => ({
      id: sample.cardId,
      title: sample.expectedTitle,
      created_at: sample.createdAt,
      source_url: sample.sourceUrl,
    })),
  };
  writeJson(filePath, {
    unfiltered: filtered,
    filteredFirst: filtered,
    filteredSecond: filtered,
  });
}

function writeFidelityFixture(filePath, samples) {
  writeJson(filePath, {
    cards: samples.map((sample) => ({
      id: sample.cardId,
      title: sample.expectedTitle,
      created_at: sample.createdAt,
      source_url: sample.sourceUrl,
      image: null,
      chunks:
        sample.label === "sample-long"
          ? Array.from({ length: 50 }, (_, index) => ({ index, text: `Chunk ${index}` }))
          : [{ index: 0, text: "Synthetic fixture chunk for offline report validation." }],
    })),
  });
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function controlledSamples() {
  return [
    ["sample-note", "note", null],
    ["sample-article", "article", "https://example.com/private/article?token=secret123"],
    ["sample-youtube", "youtube", "https://youtube.com/watch?v=private-id&signature=secret456"],
    ["sample-pdf", "pdf", "https://example.com/private/file.pdf?token=secret123"],
    ["sample-no-url", "no_url", null],
    ["sample-long", "long", "https://example.com/private/long?signature=secret456"],
  ].map(([label, contentType, sourceUrl], index) => ({
    label,
    contentType,
    cardId: `card_manifest_${label}_${index}_1234567890`,
    expectedTitle: `Private Recall Sample ${label}`,
    createdAt: `2026-06-24T00:${String(index).padStart(2, "0")}:00Z`,
    sourceUrl,
    allowTitleInPublicReport: false,
    allowSourceUrlInPublicReport: false,
    notes: "synthetic private manifest fixture",
  }));
}

function writeControlledManifest(filePath, samples) {
  writeJson(filePath, {
    dateWindow: {
      dateFrom: "2026-06-24T00:00:00Z",
      dateTo: "2026-06-24T23:59:59Z",
    },
    samples,
    negativeControl: {
      label: "outside-window",
      cardId: "card_absent_control_1234567890",
      createdAt: "2026-06-23T12:00:00Z",
      expectedTitle: "Private Recall Sample outside-window",
    },
  });
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoPrivateContent(value, label) {
  const leakPattern = /Private Recall Sample|secret123|secret456|private\/|private-id/i;
  assert(!leakPattern.test(value), `${label} leaked private fixture content`);
}
