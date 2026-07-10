#!/usr/bin/env node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { templateManifest } from "./lib/recall-controlled-samples.mjs";

const scratch = mkdtempSync(join(tmpdir(), "recall-second-manual-command-smoke-"));
const spikeDir = join(scratch, "spikes");
const manifestPath = join(scratch, "controlled-samples.json");
const timestamp = "2026-06-27_02-31-00_IST";
const enumerationPath = join(spikeDir, `SPIKE-013-recall-rest-enumeration-${timestamp}.md`);
const fidelityPath = join(spikeDir, `SPIKE-014-recall-content-fidelity-${timestamp}.md`);

try {
  mkdirSync(spikeDir, { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(controlledManifest(), null, 2)}\n`, "utf8");
  writeFileSync(enumerationPath, spikeReport("SPIKE-013", "CLEAR", enumerationEvidence()), "utf8");
  writeFileSync(fidelityPath, spikeReport("SPIKE-014", "PROCEED-WITH-CHANGES", fidelityEvidence()), "utf8");

  const json = runCommand([
    "--json",
    "--spike-dir",
    spikeDir,
    "--manifest",
    manifestPath,
    "--allow-unsafe-manifest-for-smoke",
    "--skip-readiness",
  ]);
  assert(json.status === 0, `command builder should pass with synthetic reports\n${json.stderr}`);
  const parsed = JSON.parse(json.stdout);
  assert(parsed.ok === true, "command builder JSON should be ok");
  assert(parsed.noLiveNoWrite === true, "command builder should be no-live/no-write");
  assert(parsed.selectedReports.timestamp === timestamp, "command builder should select the latest matching timestamp");
  assert(parsed.liveSpikeGate.verdict === "PASS_WITH_ACCEPTED_FIDELITY_CHANGES", "command should validate selected proof pair");
  assert(parsed.readiness.skipped === true, "smoke should explicitly skip real readiness");
  assert(parsed.command.includes(`BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH='${enumerationPath}'`), "command should include concrete SPIKE-013 path");
  assert(parsed.command.includes(`BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH='${fidelityPath}'`), "command should include concrete SPIKE-014 path");
  assert(!parsed.command.includes("BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH"), "command should omit private manifest path by default");
  assert(parsed.runtimeManifestPath === null, "JSON should report omitted runtime manifest by default");
  assert(parsed.command.includes("bash scripts/recall-second-manual-verification-apply.sh"), "command should call the guarded wrapper");
  assert(!parsed.command.includes("<SPIKE-013-report-path>"), "command should not contain SPIKE-013 placeholder");
  assert(!parsed.command.includes("<SPIKE-014-report-path>"), "command should not contain SPIKE-014 placeholder");
  assertNoSecret(json.stdout, "command builder JSON");

  const markdown = runCommand([
    "--spike-dir",
    spikeDir,
    "--manifest",
    manifestPath,
    "--allow-unsafe-manifest-for-smoke",
    "--skip-readiness",
  ]);
  assert(markdown.status === 0, "markdown command builder should pass");
  assert(markdown.stdout.includes("# Recall Second Manual Verification Command"), "markdown should include title");
  assert(markdown.stdout.includes("## Guarded Command"), "markdown should include command section");
  assert(markdown.stdout.includes("Runtime manifest path: `omitted`"), "markdown should disclose omitted runtime manifest");
  assert(!markdown.stdout.includes("<SPIKE-013-report-path>"), "markdown should not contain SPIKE-013 placeholder");
  assertNoSecret(markdown.stdout, "command builder markdown");

  const withRuntimeManifest = runCommand([
    "--json",
    "--spike-dir",
    spikeDir,
    "--manifest",
    manifestPath,
    "--allow-unsafe-manifest-for-smoke",
    "--skip-readiness",
    "--include-runtime-manifest",
  ]);
  assert(withRuntimeManifest.status === 0, "runtime-manifest command builder should pass");
  const parsedWithRuntimeManifest = JSON.parse(withRuntimeManifest.stdout);
  assert(
    parsedWithRuntimeManifest.command.includes(`BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH='${manifestPath}'`),
    "command should include private manifest path only when explicitly requested",
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "builder selects latest matching SPIKE-013/SPIKE-014 timestamp",
          "builder validates the selected proof pair",
          "builder prints concrete report paths without placeholders",
          "builder omits private runtime manifest path unless explicitly requested",
          "builder output is no-live/no-write",
          "builder output does not print secret-shaped values",
        ],
        noLiveNoWrite: true,
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function runCommand(args) {
  return spawnSync(process.execPath, ["--", "scripts/print-recall-second-manual-verification-command.mjs", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function controlledManifest() {
  const manifest = templateManifest();
  manifest.samples = manifest.samples.map((sample, index) => ({
    ...sample,
    cardId: `card-second-manual-command-smoke-${index + 1}`,
    expectedTitle: `Second manual command smoke private title ${index + 1}`,
    createdAt: "2026-06-24T12:00:00Z",
    sourceUrl: sample.contentType === "no_url" ? null : `https://example.com/second-manual-command-smoke/${index + 1}`,
    allowTitleInPublicReport: false,
    allowSourceUrlInPublicReport: false,
  }));
  manifest.negativeControl = {
    label: "outside-window",
    cardId: "card-second-manual-command-smoke-outside-window",
    createdAt: "2026-06-23T12:00:00Z",
    expectedTitle: "Second manual command smoke outside-window private title",
  };
  return manifest;
}

function spikeReport(spikeId, verdict, evidence) {
  return `# ${spikeId} smoke report

| Field | Value |
|---|---|
| **Spike ID** | ${spikeId} |
| **Verdict** | ${verdict} |

## Evidence

\`\`\`json
${JSON.stringify(evidence, null, 2)}
\`\`\`
`;
}

function enumerationEvidence() {
  return {
    mode: "recall_rest_enumeration_probe",
    filteredFirst: {
      totalCount: 6,
      resultCount: 6,
    },
    repeatedFilteredStable: true,
    expectedControls: {
      manifest: manifestSummary(),
      positiveIds: requiredLabels().map((label) => ({ label, present: true })),
      negativeIds: [{ label: "outside-window", absent: true }],
    },
  };
}

function fidelityEvidence() {
  return {
    mode: "recall_content_fidelity_probe",
    expectedControls: {
      sampleLabels: requiredLabels(),
      ...manifestSummary(),
    },
    cards: requiredLabels().map((sampleLabel, index) => ({
      id: `redacted-second-manual-command-smoke-${index + 1}`,
      sampleLabel,
      contentFidelity: "api_chunks_unverified",
      maxChunksHit: false,
      policy: {
        shouldImport: false,
      },
    })),
  };
}

function manifestSummary() {
  return {
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

function assertNoSecret(text, label) {
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(text), `${label} should not print secret-shaped API keys`);
  assert(!/\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/i.test(text), `${label} should not print bearer tokens`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
