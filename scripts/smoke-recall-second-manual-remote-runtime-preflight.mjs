#!/usr/bin/env node
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { templateManifest } from "./lib/recall-controlled-samples.mjs";

const scratch = mkdtempSync(join(tmpdir(), "recall-second-manual-remote-runtime-preflight-"));
const spikeDir = join(scratch, "spikes");
const remoteRoot = join(scratch, "remote-root");
const remoteSpikeDir = join(remoteRoot, "docs/plans/spikes");
const fakeSshPath = join(scratch, "fake-ssh.sh");
const manifestPath = join(scratch, "controlled-samples.json");
const timestamp = "2026-06-27_03-02-00_IST";
const enumerationPath = join(spikeDir, `SPIKE-013-recall-rest-enumeration-${timestamp}.md`);
const fidelityPath = join(spikeDir, `SPIKE-014-recall-content-fidelity-${timestamp}.md`);
const remoteEnumerationPath = join(remoteSpikeDir, `SPIKE-013-recall-rest-enumeration-${timestamp}.md`);
const remoteFidelityPath = join(remoteSpikeDir, `SPIKE-014-recall-content-fidelity-${timestamp}.md`);
const checkpoint = "2026-06-24T15:54:17.000Z";
const freshKeyEnvPath = join(remoteRoot, "etc/brain/fresh.env");
const staleKeyEnvPath = join(remoteRoot, "etc/brain/stale.env");

const remoteRuntimeFiles = [
  "scripts/recall-scheduled-apply.sh",
  "scripts/sync-recall-prod.mjs",
  "scripts/check-recall-key-rotation-evidence.mjs",
  "scripts/check-recall-dry-run-report.mjs",
  "scripts/check-recall-apply-report.mjs",
  "scripts/check-recall-live-spike-reports.mjs",
  "scripts/check-recall-public-privacy.mjs",
  "scripts/check-recall-public-manifest-privacy.mjs",
  "scripts/lib/recall-controlled-samples.mjs",
  "scripts/recall-first-apply-preflight.mjs",
];

try {
  mkdirSync(spikeDir, { recursive: true });
  mkdirSync(join(remoteRoot, "scripts"), { recursive: true });
  mkdirSync(remoteSpikeDir, { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(controlledManifest(), null, 2)}\n`, "utf8");
  writeFileSync(enumerationPath, spikeReport("SPIKE-013", "CLEAR", enumerationEvidence()), "utf8");
  writeFileSync(fidelityPath, spikeReport("SPIKE-014", "PROCEED-WITH-CHANGES", fidelityEvidence()), "utf8");
  writeFileSync(remoteEnumerationPath, spikeReport("SPIKE-013", "CLEAR", enumerationEvidence()), "utf8");
  writeFileSync(remoteFidelityPath, spikeReport("SPIKE-014", "PROCEED-WITH-CHANGES", fidelityEvidence()), "utf8");
  writeFileSync(
    join(remoteRoot, "scripts/check-recall-second-manual-runtime-preflight.mjs"),
    readFileSync("scripts/check-recall-second-manual-runtime-preflight.mjs", "utf8"),
    "utf8",
  );
  for (const filePath of remoteRuntimeFiles) {
    const target = join(remoteRoot, filePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(
      target,
      filePath === "scripts/recall-scheduled-apply.sh"
        ? readFileSync("scripts/recall-scheduled-apply.sh", "utf8")
        : filePath === "scripts/check-recall-key-rotation-evidence.mjs"
          ? readFileSync("scripts/check-recall-key-rotation-evidence.mjs", "utf8")
        : "# remote runtime smoke dependency\n",
      "utf8",
    );
  }
  writeKeyEnv(freshKeyEnvPath, "2026-06-24T16:00:00.000Z");
  writeKeyEnv(staleKeyEnvPath, "2026-06-24T15:00:00.000Z");
  writeFileSync(
    fakeSshPath,
    `#!/usr/bin/env bash
set -euo pipefail
host="$1"
shift
exec bash -lc "$*"
`,
    "utf8",
  );
  chmodSync(fakeSshPath, 0o755);

  const passed = runRemotePreflight();
  assert(passed.status === 0, `remote runtime preflight smoke should pass\n${passed.stderr}`);
  const parsed = JSON.parse(passed.stdout);
  assert(parsed.ok === true, "remote runtime preflight JSON should be ok");
  assert(parsed.noLiveNoWrite === true, "remote runtime preflight should be no-live/no-write");
  assert(parsed.commandEnvSource === "remote_deployed_latest_spike_pair", "remote runtime preflight should build command env from deployed proof by default");
  assert(parsed.commandBuilder.skipped === true, "remote runtime preflight should skip local command builder by default");
  assert(parsed.remote.runtimePreflight.status === "ready_for_second_manual_runtime_preflight", "remote runtime preflight should pass");
  assert(
    parsed.remote.remoteBuildCommandEnv.status === "remote_command_env_built_from_deployed_latest_spike_pair",
    "remote runtime preflight should report remote command-env construction",
  );
  assert(parsed.remote.proofReports.enumeration.ok === true, "remote runtime preflight should expose deployed SPIKE-013 proof");
  assert(parsed.remote.proofReports.fidelity.ok === true, "remote runtime preflight should expose deployed SPIKE-014 proof");
  assert(parsed.remote.deployedLatestReports.ok === true, "remote runtime preflight should expose latest deployed SPIKE proof pair");
  assert(parsed.remote.deployedLatestReports.timestamp === timestamp, "remote runtime preflight should report latest deployed proof timestamp");
  assert(
    parsed.remote.deployedLatestReports.selectedMatchesRemoteLatest === true,
    "remote runtime preflight should report local selected proof pair matches latest deployed pair",
  );
  assert(parsed.commandBuilder.readinessStatus === "skipped", "smoke should skip real readiness");

  writeFileSync(
    join(remoteRoot, "scripts/recall-scheduled-apply.sh"),
    "# stale remote scheduled wrapper without manual guard\n",
    "utf8",
  );
  const missingRemoteScheduledWrapperGuard = runRemotePreflight();
  assert(
    missingRemoteScheduledWrapperGuard.status === 1,
    "remote runtime preflight should fail when the remote scheduled wrapper guard is missing",
  );
  assert(
    missingRemoteScheduledWrapperGuard.stderr.includes("scheduled_wrapper_manual_env_override_guard"),
    "missing remote scheduled wrapper guard failure should be explicit",
  );
  writeFileSync(
    join(remoteRoot, "scripts/recall-scheduled-apply.sh"),
    readFileSync("scripts/recall-scheduled-apply.sh", "utf8"),
    "utf8",
  );

  const staleKeyEvidence = runRemotePreflight({ BRAIN_RECALL_KEY_ROTATION_ENV_FILE: staleKeyEnvPath });
  assert(staleKeyEvidence.status === 1, "remote runtime preflight should fail when remote key evidence is stale");
  assert(
    staleKeyEvidence.stderr.includes("key_rotation_evidence"),
    "stale remote key evidence failure should be explicit",
  );

  rmSync(join(remoteRoot, "scripts/check-recall-apply-report.mjs"));
  const missingRemoteFile = runRemotePreflight();
  assert(missingRemoteFile.status === 1, "remote runtime preflight should fail when a remote runtime helper is missing");
  assert(missingRemoteFile.stderr.includes("blocked_second_manual_remote_runtime_preflight"), "missing helper failure should be explicit");
  assertNoSecret(
    `${passed.stdout}\n${passed.stderr}\n${missingRemoteScheduledWrapperGuard.stdout}\n${missingRemoteScheduledWrapperGuard.stderr}\n${staleKeyEvidence.stdout}\n${staleKeyEvidence.stderr}\n${missingRemoteFile.stdout}\n${missingRemoteFile.stderr}`,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "remote verifier builds second-manual command env without live calls",
          "remote verifier builds command env from the deployed proof pair by default",
          "remote verifier executes runtime preflight through SSH command shim",
          "remote verifier passes with production-shaped runtime files",
          "remote verifier exposes deployed SPIKE proof file checks",
          "remote verifier surfaces latest deployed SPIKE proof pair and local selection match",
          "remote verifier fails when remote key rotation evidence is stale",
          "remote verifier fails when the deployed scheduled wrapper lacks the manual env override guard",
          "remote verifier fails when a remote runtime helper is missing",
          "remote verifier output does not print secret-shaped values",
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

function writeKeyEnv(path, mtimeIso) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "RECALL_API_KEY=<redacted-remote-runtime-preflight-smoke>\nBRAIN_RECALL_CONFIRM_LIVE_API=0\n", "utf8");
  chmodSync(path, 0o640);
  const mtime = new Date(mtimeIso);
  utimesSync(path, mtime, mtime);
}

function runRemotePreflight(envOverrides = {}) {
  return spawnSync(
    process.execPath,
    [
      "--",
      "scripts/check-recall-second-manual-remote-runtime-preflight.mjs",
      "--ssh-command",
      fakeSshPath,
      "--host",
      "smoke-host",
      "--remote-dir",
      remoteRoot,
      "--spike-dir",
      spikeDir,
      "--manifest",
      manifestPath,
      "--allow-unsafe-manifest-for-smoke",
      "--skip-readiness",
      "--skip-remote-system-checks",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BRAIN_RECALL_KEY_ROTATION_ENV_FILE: freshKeyEnvPath,
        BRAIN_RECALL_KEY_ROTATED_AFTER_ISO: checkpoint,
        ...envOverrides,
      },
      encoding: "utf8",
    },
  );
}

function controlledManifest() {
  const manifest = templateManifest();
  manifest.samples = manifest.samples.map((sample, index) => ({
    ...sample,
    cardId: `card-second-manual-remote-preflight-smoke-${index + 1}`,
    expectedTitle: `Second manual remote preflight smoke private title ${index + 1}`,
    createdAt: "2026-06-24T12:00:00Z",
    sourceUrl: sample.contentType === "no_url" ? null : `https://example.com/second-manual-remote-preflight-smoke/${index + 1}`,
    allowTitleInPublicReport: false,
    allowSourceUrlInPublicReport: false,
  }));
  manifest.negativeControl = {
    label: "outside-window",
    cardId: "card-second-manual-remote-preflight-smoke-outside-window",
    createdAt: "2026-06-23T12:00:00Z",
    expectedTitle: "Second manual remote preflight smoke outside-window private title",
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
    filteredFirst: { totalCount: 6, resultCount: 6 },
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
      id: `redacted-second-manual-remote-preflight-smoke-${index + 1}`,
      sampleLabel,
      contentFidelity: "api_chunks_unverified",
      maxChunksHit: false,
      policy: { shouldImport: false },
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

function assertNoSecret(text) {
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(text), "output should not print secret-shaped API keys");
  assert(!/\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/i.test(text), "output should not print bearer tokens");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
