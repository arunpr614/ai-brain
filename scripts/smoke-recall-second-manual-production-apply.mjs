#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { templateManifest } from "./lib/recall-controlled-samples.mjs";

const APPROVAL =
  "I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.";
const FIRST_APPLY_APPROVAL =
  "I approve the first capped Recall -> AI Brain apply for the 2026-06-16 window, capped at 5 planned imports, using the accepted live-spike proof, reviewed dry-run proof, backup proof, and explicit fidelity flags for unverified and metadata-only Recall content.";
const privateRoot = resolve("data/private/recall-live-spikes");
mkdirSync(privateRoot, { recursive: true });
const scratch = mkdtempSync(join(privateRoot, "recall-second-manual-production-apply-"));
const spikeDir = join(scratch, "spikes");
const remoteRoot = join(scratch, "remote-root");
const remoteSpikeDir = join(remoteRoot, "docs/plans/spikes");
const localReportDir = join(scratch, "local-report-cache");
const fakeSshPath = join(scratch, "fake-ssh.sh");
const manifestPath = join(scratch, "controlled-samples.json");
const markerPath = join(scratch, "remote-apply-marker.json");
const remoteApplyReportPath = "data/private/recall-live-spikes/scheduled-apply-20260627T031400Z.json";
const localApplyReportPath = join(localReportDir, "scheduled-apply-20260627T031400Z.json");
const timestamp = "2026-06-27_03-14-00_IST";
const enumerationPath = join(spikeDir, `SPIKE-013-recall-rest-enumeration-${timestamp}.md`);
const fidelityPath = join(spikeDir, `SPIKE-014-recall-content-fidelity-${timestamp}.md`);
const remoteEnumerationPath = join(remoteSpikeDir, `SPIKE-013-recall-rest-enumeration-${timestamp}.md`);
const remoteFidelityPath = join(remoteSpikeDir, `SPIKE-014-recall-content-fidelity-${timestamp}.md`);
const checkpoint = "2026-06-24T15:54:17.000Z";
const freshKeyEnvPath = join(remoteRoot, "etc/brain/fresh.env");
const staleKeyEnvPath = join(remoteRoot, "etc/brain/stale.env");

const remoteRuntimeFiles = [
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
const scheduledWrapperSmoke = `#!/usr/bin/env bash
set -euo pipefail
# Smoke-only wrapper preserves the deployed guard contract checked by runtime preflight:
# manual_env_override_keys
# BRAIN_RECALL_SYSTEM_ENV_FILE
# manual_verification_mode_before_env
report_path="${remoteApplyReportPath}"
mkdir -p "$(dirname "$report_path")"
node -e 'const fs=require("fs"); fs.writeFileSync(process.argv[1], JSON.stringify({mode:"apply",state:"done",exitCode:0,errorName:null,lastError:null,cardsSeen:1,cardsAvailable:1,enumerationComplete:true,cardsImported:1,cardsUpgraded:0,cardsSkipped:0,cardsChangedRemote:0,cardsBlocked:0,cardsPlannedForImport:1,totalCharsPlanned:123,totalChunksFetched:1,fidelityCounts:{api_chunks_unverified:1},policyBlockCounts:{},plannedActionCounts:{imported:1},checkpointAdvanced:true}, null, 2) + "\\n");' "$report_path"
node -e 'const fs=require("fs"); fs.writeFileSync(process.argv[1], JSON.stringify({manualMode: process.env.BRAIN_RECALL_MANUAL_VERIFICATION_MODE, approval: process.env.BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL, syncEnabled: process.env.BRAIN_RECALL_SYNC_ENABLED, confirmLiveApi: process.env.BRAIN_RECALL_CONFIRM_LIVE_API, maxImports: process.env.BRAIN_RECALL_MAX_IMPORTS, schedulerEnabled: process.env.BRAIN_RECALL_SCHEDULER_ENABLED || null}, null, 2));' "${markerPath}"
echo "[recall-scheduled-apply] smoke apply completed dry_run_report=data/private/recall-live-spikes/scheduled-dry-run-20260627T031400Z.json apply_report=$report_path backup=data/backups/smoke.sqlite"
`;

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
  writeFileSync(
    join(remoteRoot, "scripts/recall-second-manual-verification-apply.sh"),
    readFileSync("scripts/recall-second-manual-verification-apply.sh", "utf8"),
    "utf8",
  );
  writeFileSync(
    join(remoteRoot, "scripts/recall-scheduled-apply.sh"),
    scheduledWrapperSmoke,
    "utf8",
  );
  chmodSync(join(remoteRoot, "scripts/recall-second-manual-verification-apply.sh"), 0o755);
  chmodSync(join(remoteRoot, "scripts/recall-scheduled-apply.sh"), 0o755);
  for (const filePath of remoteRuntimeFiles) {
    const target = join(remoteRoot, filePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(
      target,
      filePath === "scripts/check-recall-key-rotation-evidence.mjs"
        ? readFileSync("scripts/check-recall-key-rotation-evidence.mjs", "utf8")
        : "# remote production apply smoke dependency\n",
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

  const missingApproval = runProductionApply({ BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: "" });
  assert(missingApproval.status === 1, "production apply runner should refuse without exact approval");
  const missingApprovalJson = parseMaybeJson(missingApproval.stderr);
  assert(missingApprovalJson.status === "blocked_second_manual_production_apply", "missing approval status should be blocked");
  assert(missingApprovalJson.liveWriteAttempted === false, "missing approval must not attempt remote apply");
  assert(missingApprovalJson.approvalStatus.requiredEnv === "BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL", "missing approval should name required env");
  assert(missingApprovalJson.approvalStatus.currentGate === "second_manual_verification_run", "missing approval should name current gate");
  assert(missingApprovalJson.localGates.skippedByDefault === true, "runner should skip broad local gates by default");
  assert(
    missingApprovalJson.localGates.commandEnvSource === "remote_deployed_latest_spike_pair",
    "runner should build command env from deployed remote proof by default",
  );
  assert(missingApprovalJson.localGates.readinessStatus === "skipped", "runner should skip local readiness by default");
  assert(missingApprovalJson.localGates.liveSpikeGateVerdict === "skipped", "runner should skip local live-spike gate by default");
  assert(missingApprovalJson.commandBuilder.skipped === true, "runner should skip local command builder by default");
  assert(
    missingApprovalJson.preApplyProgress.stoppedAt === "approval_gate",
    "missing approval should stop at the approval gate",
  );
  assert(
    missingApprovalJson.preApplyProgress.localPrivateGatesSkippedForProductionPath === true,
    "missing approval should prove broad local private gates were skipped for the production path",
  );
  assert(
    missingApprovalJson.preApplyProgress.localGateStatus === "not_blocking_production_path",
    "missing approval should report local gates are not blocking the production path",
  );
  assert(
    missingApprovalJson.preApplyProgress.remotePreflightAttempted === true &&
      missingApprovalJson.preApplyProgress.remotePreflightPassed === true,
    "missing approval should prove production remote preflight was reached and passed",
  );
  assert(
    missingApprovalJson.preApplyProgress.liveCallNotAttemptedBecause ===
      "exact second-manual approval is missing after production remote preflight passed",
    "missing approval should explain that approval, not local private gates, blocked the live apply",
  );
  assert(
    missingApprovalJson.remotePreflight.remoteBuildCommandEnv.status === "remote_command_env_built_from_deployed_latest_spike_pair",
    "runner should report remote command-env construction",
  );
  assert(missingApprovalJson.remotePreflight.proofReports.enumeration.ok === true, "runner should expose remote SPIKE-013 proof readiness");
  assert(missingApprovalJson.remotePreflight.proofReports.fidelity.ok === true, "runner should expose remote SPIKE-014 proof readiness");
  assert(
    missingApprovalJson.remotePreflight.deployedLatestReports.selectedMatchesRemoteLatest === true,
    "runner should show selected proof pair matches latest deployed proof pair before approval",
  );
  assert(!existsSync(markerPath), "missing approval must not create the remote apply marker");

  const staleFirstApplyApproval = runProductionApply({ BRAIN_RECALL_FIRST_APPLY_APPROVAL: FIRST_APPLY_APPROVAL });
  assert(staleFirstApplyApproval.status === 1, "production apply runner should refuse stale first-apply approval");
  const staleFirstApplyApprovalJson = parseMaybeJson(staleFirstApplyApproval.stderr);
  assert(staleFirstApplyApprovalJson.liveWriteAttempted === false, "stale first-apply approval must not attempt remote apply");
  assert(
    staleFirstApplyApprovalJson.findings.some((finding) => finding.id === "stale_first_apply_approval"),
    "stale first-apply approval should produce a specific finding",
  );
  assert(
    staleFirstApplyApprovalJson.preApplyProgress.stoppedAt === "approval_gate",
    "stale first-apply approval should still stop at the approval gate",
  );
  assert(
    staleFirstApplyApprovalJson.approvalStatus.firstApplyApprovalPresent === true,
    "stale first-apply approval should be classified in approval status",
  );
  assert(!existsSync(markerPath), "stale first-apply approval must not create the remote apply marker");

  const wrongEnvSecondManualApproval = runProductionApply({ BRAIN_RECALL_APPROVAL_TEXT: APPROVAL });
  assert(wrongEnvSecondManualApproval.status === 1, "production apply runner should refuse second-manual approval in a generic env var");
  const wrongEnvSecondManualApprovalJson = parseMaybeJson(wrongEnvSecondManualApproval.stderr);
  assert(wrongEnvSecondManualApprovalJson.liveWriteAttempted === false, "wrong-env second-manual approval must not attempt remote apply");
  assert(
    wrongEnvSecondManualApprovalJson.findings.some((finding) => finding.id === "second_manual_approval_wrong_env"),
    "wrong-env second-manual approval should produce a specific finding",
  );
  assert(
    wrongEnvSecondManualApprovalJson.approvalStatus.secondManualApprovalTextPresent === true,
    "wrong-env second-manual approval should be classified in approval status",
  );
  assert(!existsSync(markerPath), "wrong-env second-manual approval must not create the remote apply marker");

  writeFileSync(
    join(remoteRoot, "scripts/recall-scheduled-apply.sh"),
    "# stale scheduled wrapper without manual env override guard\n",
    "utf8",
  );
  const missingScheduledWrapperGuard = runProductionApply({ BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL });
  assert(
    missingScheduledWrapperGuard.status === 1,
    "production apply runner should refuse when remote scheduled wrapper guard is missing",
  );
  const missingScheduledWrapperGuardJson = parseMaybeJson(missingScheduledWrapperGuard.stderr);
  assert(
    missingScheduledWrapperGuardJson.liveWriteAttempted === false,
    "missing scheduled wrapper guard must not attempt remote apply",
  );
  assert(
    missingScheduledWrapperGuardJson.remotePreflight.runtimePreflightStatus === "blocked_second_manual_runtime_preflight",
    "missing scheduled wrapper guard should block in remote runtime preflight",
  );
  assert(
    missingScheduledWrapperGuardJson.preApplyProgress.stoppedAt === "remote_runtime_preflight_gate",
    "missing scheduled wrapper guard should classify the stop as remote runtime preflight",
  );
  assert(!existsSync(markerPath), "missing scheduled wrapper guard must not create the remote apply marker");
  writeFileSync(join(remoteRoot, "scripts/recall-scheduled-apply.sh"), scheduledWrapperSmoke, "utf8");

  const staleKeyEvidence = runProductionApply({
    BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL,
    BRAIN_RECALL_KEY_ROTATION_ENV_FILE: staleKeyEnvPath,
  });
  assert(staleKeyEvidence.status === 1, "production apply runner should refuse when remote key evidence is stale");
  const staleKeyEvidenceJson = parseMaybeJson(staleKeyEvidence.stderr);
  assert(staleKeyEvidenceJson.liveWriteAttempted === false, "stale key evidence must not attempt remote apply");
  assert(
    staleKeyEvidenceJson.remotePreflight.runtimePreflightStatus === "blocked_second_manual_runtime_preflight",
    "stale key evidence should block in remote runtime preflight",
  );
  assert(!existsSync(markerPath), "stale key evidence must not create the remote apply marker");

  rmSync(join(remoteRoot, "scripts/check-recall-apply-report.mjs"));
  const missingRemoteHelper = runProductionApply({ BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL });
  assert(missingRemoteHelper.status === 1, "production apply runner should refuse when remote preflight fails");
  const missingRemoteHelperJson = parseMaybeJson(missingRemoteHelper.stderr);
  assert(missingRemoteHelperJson.liveWriteAttempted === false, "remote preflight failure must not attempt remote apply");
  assert(!existsSync(markerPath), "remote preflight failure must not create the remote apply marker");
  writeFileSync(join(remoteRoot, "scripts/check-recall-apply-report.mjs"), "# restored smoke dependency\n", "utf8");

  const unsafeLocalReportDir = runProductionApply(
    { BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL },
    { localReportDir: resolve("docs/plans/recall-sync/unsafe-second-manual-report-cache") },
  );
  assert(unsafeLocalReportDir.status === 1, "production apply runner should refuse unsafe local report directories");
  const unsafeLocalReportDirJson = parseMaybeJson(unsafeLocalReportDir.stderr);
  assert(
    unsafeLocalReportDirJson.findings.some((finding) => finding.id === "local_apply_report_dir_not_private"),
    "unsafe local report directory should produce an explicit private-path finding",
  );
  assert(
    unsafeLocalReportDirJson.preApplyProgress.stoppedAt === "local_report_dir_private_gate",
    "unsafe local report directory should classify the stop as local report-dir privacy",
  );
  assert(
    unsafeLocalReportDirJson.preApplyProgress.remotePreflightAttempted === false,
    "unsafe local report directory should block before remote preflight",
  );
  assert(unsafeLocalReportDirJson.liveWriteAttempted === false, "unsafe local report directory must block before remote apply");
  assert(!existsSync(markerPath), "unsafe local report directory must not create the remote apply marker");

  const approved = runProductionApply({ BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL });
  assert(approved.status === 0, `production apply runner should execute approved remote wrapper through fake SSH\n${approved.stderr}`);
  const approvedJson = JSON.parse(approved.stdout);
  assert(approvedJson.ok === true, "approved production runner JSON should be ok");
  assert(approvedJson.liveWriteAttempted === true, "approved production runner should mark the apply attempt");
  assert(approvedJson.preApplyProgress.stoppedAt === "completed", "approved runner should report completed progress");
  assert(
    approvedJson.preApplyProgress.localPrivateGatesSkippedForProductionPath === true,
    "approved runner should prove local private gates were skipped for the production path",
  );
  assert(
    approvedJson.preApplyProgress.remotePreflightAttempted === true &&
      approvedJson.preApplyProgress.remotePreflightPassed === true,
    "approved runner should prove remote preflight passed before the live apply",
  );
  assert(approvedJson.preApplyProgress.liveWriteAttempted === true, "approved progress should mark live write attempted");
  assert(
    approvedJson.localGates.commandEnvSource === "remote_deployed_latest_spike_pair",
    "approved runner should build command env from deployed remote proof by default",
  );
  assert(approvedJson.localGates.readinessStatus === "skipped", "approved runner should still skip local readiness by default");
  assert(approvedJson.localGates.liveSpikeGateVerdict === "skipped", "approved runner should still skip local live-spike gate by default");
  assert(approvedJson.remotePreflight.runtimePreflightStatus === "ready_for_second_manual_runtime_preflight", "remote preflight should pass before apply");
  assert(approvedJson.remotePreflight.proofReports.enumeration.ok === true, "approved runner should expose remote SPIKE-013 proof readiness");
  assert(approvedJson.remotePreflight.proofReports.fidelity.ok === true, "approved runner should expose remote SPIKE-014 proof readiness");
  assert(
    approvedJson.remotePreflight.deployedLatestReports.selectedMatchesRemoteLatest === true,
    "approved runner should show selected proof pair matches latest deployed proof pair before apply",
  );
  assert(approvedJson.remoteApply.ok === true, "remote apply should pass in smoke");
  assert(
    approvedJson.secondManualApplyReport.remoteApplyReportPath === remoteApplyReportPath,
    "approved runner should capture the remote apply report path",
  );
  assert(
    approvedJson.secondManualApplyReport.localApplyReportPath === localApplyReportPath,
    "approved runner should copy the remote apply report into the configured local private evidence dir",
  );
  assert(
    approvedJson.secondManualApplyReport.localReview.ok === true &&
      approvedJson.secondManualApplyReport.localReview.verdict === "PASS_POST_APPLY_REVIEW_GATE",
    "approved runner should validate the copied second-manual apply report locally",
  );
  assert(existsSync(localApplyReportPath), "approved runner should leave a local private copy of the apply report");

  const marker = JSON.parse(readFileSync(markerPath, "utf8"));
  assert(marker.manualMode === "1", "remote wrapper should enter manual verification mode");
  assert(marker.approval === APPROVAL, "remote wrapper should receive exact approval");
  assert(marker.syncEnabled === "1", "remote wrapper should receive sync enabled flag");
  assert(marker.confirmLiveApi === "1", "remote wrapper should receive live confirmation flag");
  assert(marker.maxImports === "5", "remote wrapper should receive capped import count");
  assert(marker.schedulerEnabled === null, "remote wrapper should not set scheduler enabled flag");

  const combinedOutput = [
    missingApproval.stdout,
    missingApproval.stderr,
    staleFirstApplyApproval.stdout,
    staleFirstApplyApproval.stderr,
    wrongEnvSecondManualApproval.stdout,
    wrongEnvSecondManualApproval.stderr,
    missingScheduledWrapperGuard.stdout,
    missingScheduledWrapperGuard.stderr,
    staleKeyEvidence.stdout,
    staleKeyEvidence.stderr,
    missingRemoteHelper.stdout,
    missingRemoteHelper.stderr,
    unsafeLocalReportDir.stdout,
    unsafeLocalReportDir.stderr,
    approved.stdout,
    approved.stderr,
  ].join("\n");
  assertNoSecret(combinedOutput);

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "production apply runner refuses without exact approval",
          "production apply runner classifies stale first-apply approval without attempting remote apply",
          "production apply runner classifies second-manual approval in the wrong env without attempting remote apply",
          "production apply runner builds command env from deployed remote proof by default",
          "production apply runner skips broad local readiness/proof gates by default",
          "production apply runner reports that local private gates are not blocking the production path",
          "production apply runner reports approval gate after remote preflight when exact approval is missing",
          "production apply runner exposes deployed SPIKE proof file checks",
          "production apply runner exposes latest deployed SPIKE proof pair and local selection match",
          "production apply runner runs remote runtime preflight before apply",
          "production apply runner stops before remote apply when deployed scheduled wrapper guard is missing",
          "production apply runner stops before remote apply when remote key evidence is stale",
          "production apply runner stops before remote apply when remote preflight fails",
          "production apply runner blocks unsafe local report directories before remote apply",
          "production apply runner executes the remote manual wrapper through SSH only after exact approval",
          "approved remote wrapper receives manual mode, live confirmation, and capped import env",
          "approved production runner copies and locally validates the remote second-manual apply report",
          "production apply runner output does not print secret-shaped values",
        ],
        smokeOnly: true,
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function runProductionApply(env, options = {}) {
  return spawnSync(
    process.execPath,
    [
      "--",
      "scripts/run-recall-second-manual-production-apply.mjs",
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
      "--skip-remote-system-checks",
      "--local-report-dir",
      options.localReportDir ?? localReportDir,
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: "",
        BRAIN_RECALL_KEY_ROTATION_ENV_FILE: freshKeyEnvPath,
        BRAIN_RECALL_KEY_ROTATED_AFTER_ISO: checkpoint,
        ...env,
      },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );
}

function writeKeyEnv(path, mtimeIso) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "RECALL_API_KEY=<redacted-production-apply-smoke>\nBRAIN_RECALL_CONFIRM_LIVE_API=0\n", "utf8");
  chmodSync(path, 0o640);
  const mtime = new Date(mtimeIso);
  utimesSync(path, mtime, mtime);
}

function controlledManifest() {
  const manifest = templateManifest();
  manifest.samples = manifest.samples.map((sample, index) => ({
    ...sample,
    cardId: `card-second-manual-production-apply-smoke-${index + 1}`,
    expectedTitle: `Second manual production apply smoke private title ${index + 1}`,
    createdAt: "2026-06-24T12:00:00Z",
    sourceUrl: sample.contentType === "no_url" ? null : `https://example.com/second-manual-production-apply-smoke/${index + 1}`,
    allowTitleInPublicReport: false,
    allowSourceUrlInPublicReport: false,
  }));
  manifest.negativeControl = {
    label: "outside-window",
    cardId: "card-second-manual-production-apply-smoke-outside-window",
    createdAt: "2026-06-23T12:00:00Z",
    expectedTitle: "Second manual production apply smoke outside-window private title",
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
      id: `redacted-second-manual-production-apply-smoke-${index + 1}`,
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

function parseMaybeJson(text) {
  const trimmed = String(text ?? "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  return JSON.parse(trimmed.slice(start, end + 1));
}

function assertNoSecret(text) {
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(text), "output should not print secret-shaped API keys");
  assert(!/\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/i.test(text), "output should not print bearer tokens");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
