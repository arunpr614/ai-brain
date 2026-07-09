#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { templateManifest } from "./lib/recall-controlled-samples.mjs";

const scratch = mkdtempSync(join(tmpdir(), "recall-live-spike-reports-smoke-"));
const manifestPrivateTitle = "Manifest private title must stay hidden";

try {
  const nonRootCwd = join(scratch, "non-root-cwd");
  mkdirSync(nonRootCwd);
  const manifest = join(scratch, "controlled-samples.json");
  const enumeration = join(scratch, "SPIKE-013-recall-rest-enumeration-2026-06-24_00-00-00_IST.md");
  const fidelityClear = join(scratch, "SPIKE-014-recall-content-fidelity-2026-06-24_00-00-00_IST.md");
  const fidelityChanges = join(scratch, "SPIKE-014-recall-content-fidelity-2026-06-24_00-01-00_IST.md");
  const enumerationBlocker = join(scratch, "SPIKE-013-recall-rest-enumeration-2026-06-24_00-02-00_IST.md");
  const privacyLeak = join(scratch, "SPIKE-014-recall-content-fidelity-2026-06-24_00-03-00_IST.md");
  const manifestPrivacyLeak = join(scratch, "SPIKE-014-recall-content-fidelity-2026-06-24_00-04-00_IST.md");
  const invalidFidelity = join(scratch, "SPIKE-014-recall-content-fidelity-2026-06-24_00-05-00_IST.md");

  writeFileSync(manifest, `${JSON.stringify(controlledManifest(), null, 2)}\n`, "utf8");
  writeReport(enumeration, "SPIKE-013", "CLEAR", enumerationEvidence());
  writeReport(fidelityClear, "SPIKE-014", "CLEAR", fidelityEvidence({ policyBlocked: false }));
  writeReport(fidelityChanges, "SPIKE-014", "PROCEED-WITH-CHANGES", fidelityEvidence({ policyBlocked: true }));
  writeReport(enumerationBlocker, "SPIKE-013", "BLOCKER", {
    ...enumerationEvidence(),
    repeatedFilteredStable: false,
  });
  writeReport(privacyLeak, "SPIKE-014", "CLEAR", {
    ...fidelityEvidence({ policyBlocked: false }),
    diagnostic: "RECALL_API_KEY=sk_live_smoke_should_fail",
  });
  writeReport(manifestPrivacyLeak, "SPIKE-014", "CLEAR", {
    ...fidelityEvidence({ policyBlocked: false }),
    diagnostic: manifestPrivateTitle,
  });
  writeReport(invalidFidelity, "SPIKE-014", "CLEAR", fidelityEvidence({ policyBlocked: false, invalidFidelity: true }));

  const clear = runGate([
    "--enumeration",
    enumeration,
    "--fidelity",
    fidelityClear,
    "--allow-unsafe-manifest-for-smoke",
    "--manifest",
    manifest,
  ]);
  assert(clear.status === 0, "clear reports should pass");
  assert(JSON.parse(clear.stdout).verdict === "PASS_LIVE_SPIKE_REPORT_GATE", "clear verdict should pass gate");
  assert(
    JSON.parse(clear.stdout).manifestPrivacyScan.required === true,
    "clear verdict should record manifest-aware privacy scan",
  );
  const clearFromNonRoot = runGate(
    ["--enumeration", enumeration, "--fidelity", fidelityClear, "--allow-unsafe-manifest-for-smoke", "--manifest", manifest],
    { cwd: nonRootCwd },
  );
  assert(clearFromNonRoot.status === 0, "clear reports should pass from a non-root cwd");

  const changesUnaccepted = runGate(["--enumeration", enumeration, "--fidelity", fidelityChanges]);
  assert(changesUnaccepted.status === 1, "unaccepted fidelity changes should fail");
  assert(changesUnaccepted.stderr.includes("PROCEED-WITH-CHANGES requires"), "failure should explain acceptance gate");

  const changesAccepted = runGate([
    "--enumeration",
    enumeration,
    "--fidelity",
    fidelityChanges,
    "--allow-fidelity-changes",
    "--accepted-fidelity-risk",
    "Reviewed policy-blocked fidelity classes before no-write dry-run.",
  ]);
  assert(changesAccepted.status === 0, "accepted fidelity changes should pass");
  assert(
    JSON.parse(changesAccepted.stdout).verdict === "PASS_WITH_ACCEPTED_FIDELITY_CHANGES",
    "accepted changes verdict should be explicit",
  );

  const blocker = runGate(["--enumeration", enumerationBlocker, "--fidelity", fidelityClear]);
  assert(blocker.status === 1, "blocker enumeration should fail");
  assert(blocker.stderr.includes("SPIKE-013 must be CLEAR"), "blocker failure should mention SPIKE-013 clear gate");

  const invalid = runGate(["--enumeration", enumeration, "--fidelity", invalidFidelity]);
  assert(invalid.status === 1, "unknown fidelity value should fail");
  assert(invalid.stderr.includes("Unknown content fidelity value"), "unknown fidelity failure should explain enum drift");

  const leak = runGate(["--enumeration", enumeration, "--fidelity", privacyLeak]);
  assert(leak.status === 1, "privacy leak should fail");
  assert(leak.stderr.includes("Public privacy scan failed"), "privacy failure should mention scanner");

  const manifestLeak = runGate([
    "--enumeration",
    enumeration,
    "--fidelity",
    manifestPrivacyLeak,
    "--allow-unsafe-manifest-for-smoke",
    "--manifest",
    manifest,
  ]);
  assert(manifestLeak.status === 1, "manifest private-value leak should fail");
  assert(
    manifestLeak.stderr.includes("Manifest-aware public privacy scan failed"),
    "manifest privacy failure should mention manifest-aware scanner",
  );
  assert(
    !`${manifestLeak.stdout}\n${manifestLeak.stderr}`.includes(manifestPrivateTitle),
    "manifest privacy failure must not echo the private title",
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "CLEAR SPIKE-013/SPIKE-014 reports pass",
          "optional manifest-aware public privacy scan passes clean reports",
          "helper scripts resolve from checker location when cwd is not repo root",
          "SPIKE-014 PROCEED-WITH-CHANGES requires explicit acceptance",
          "accepted SPIKE-014 changes pass with distinct verdict",
          "SPIKE-013 blocker report fails",
          "unknown SPIKE-014 content fidelity value fails",
          "public report privacy leak fails",
          "manifest private-value report leak fails without printing private value",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function runGate(args, options = {}) {
  return spawnSync(process.execPath, [resolve("scripts/check-recall-live-spike-reports.mjs"), ...args], {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
  });
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

function fidelityEvidence({ policyBlocked, invalidFidelity = false }) {
  return {
    mode: "recall_content_fidelity_probe",
    cardCount: 6,
    expectedControls: manifestSummary(),
    cards: requiredLabels().map((label, index) => ({
      id: `<redacted:${label}>`,
      sampleLabel: label,
      contentFidelity:
        invalidFidelity && index === 0
          ? "api_chunks_verified"
          : policyBlocked && index === 5
            ? "possibly_truncated"
            : "complete_enough_for_daily_import",
      maxChunksHit: policyBlocked && index === 5,
      policy: {
        shouldImport: !(policyBlocked && index === 5),
        shouldIndexForRetrieval: !(policyBlocked && index === 5),
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
  const manifest = templateManifest();
  manifest.samples = manifest.samples.map((sample, index) => ({
    ...sample,
    cardId: `card-live-report-smoke-${index + 1}`,
    expectedTitle: index === 0 ? manifestPrivateTitle : `Live report smoke ${sample.label}`,
    createdAt: "2026-06-24T12:00:00Z",
    sourceUrl: sample.contentType === "no_url" ? null : `https://example.com/live-report-smoke/${sample.label}`,
    allowTitleInPublicReport: false,
    allowSourceUrlInPublicReport: false,
  }));
  manifest.negativeControl = {
    label: "outside-window",
    cardId: "card-live-report-smoke-outside-window",
    createdAt: "2026-06-23T12:00:00Z",
    expectedTitle: "Live report smoke outside window",
  };
  return manifest;
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
