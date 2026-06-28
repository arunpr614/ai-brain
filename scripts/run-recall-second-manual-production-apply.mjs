#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { basename, dirname, join, resolve } from "node:path";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";

const DEFAULT_HOST = process.env.BRAIN_SSH_HOST || "brain";
const DEFAULT_REMOTE_DIR = process.env.BRAIN_REMOTE_DIR || "/opt/brain";
const DEFAULT_LOCAL_REPORT_DIR = "data/private/recall-live-spikes";
const PRIVATE_RECALL_EVIDENCE_ROOT = resolve(DEFAULT_LOCAL_REPORT_DIR);
const APPROVAL =
  "I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.";
const FIRST_APPLY_APPROVAL =
  "I approve the first capped Recall -> AI Brain apply for the 2026-06-16 window, capped at 5 planned imports, using the accepted live-spike proof, reviewed dry-run proof, backup proof, and explicit fidelity flags for unverified and metadata-only Recall content.";
const DEFAULT_ACCEPTED_FIDELITY_RISK =
  "Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used.";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const findings = [];
validateLocalReportDir(args, findings);

const commandBuilder = findings.length > 0
  ? skippedCommandBuilder("blocked_before_command_builder")
  : args.remoteBuildCommandEnv
  ? skippedCommandBuilder("remote_build_command_env")
  : runLocalNode(commandBuilderArgs(args));
const commandBuilderJson = parseMaybeJson(commandBuilder.stdout || commandBuilder.stderr);

if (
  findings.length === 0 &&
  !args.remoteBuildCommandEnv &&
  (commandBuilder.status !== 0 || commandBuilderJson?.ok !== true || !commandBuilderJson.command)
) {
  findings.push({
    id: "command_builder",
    message: "Second-manual command builder did not produce a ready guarded command.",
    exitCode: commandBuilder.status,
  });
}

let remotePreflight = null;
let remotePreflightJson = null;
if (findings.length === 0) {
  remotePreflight = runLocalNode(remotePreflightArgs(args));
  remotePreflightJson = parseMaybeJson(remotePreflight.stdout || remotePreflight.stderr);
  if (remotePreflight.status !== 0 || remotePreflightJson?.ok !== true) {
    findings.push({
      id: "remote_runtime_preflight",
      message: "Remote second-manual runtime preflight failed; live apply was not attempted.",
      exitCode: remotePreflight.status,
      remoteStatus: remotePreflightJson?.status ?? null,
    });
  }
}

const approvalStatus = summarizeApprovalStatus();
const approvalPresent = approvalStatus.manualVerificationApprovalExact;
if (!approvalPresent) {
  const staleFirstApplyApproval = approvalStatus.firstApplyApprovalPresent;
  const wrongEnvSecondManualApproval = approvalStatus.secondManualApprovalTextPresent && !approvalStatus.manualVerificationApprovalExact;
  findings.push({
    id: staleFirstApplyApproval
      ? "stale_first_apply_approval"
      : wrongEnvSecondManualApproval
        ? "second_manual_approval_wrong_env"
        : "approval_required",
    message: staleFirstApplyApproval
      ? "First capped apply approval was supplied, but first apply is already complete; it does not authorize the distinct second manual verification live write."
      : wrongEnvSecondManualApproval
        ? "Second manual approval text was supplied outside BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL; this runner requires the exact text in that environment variable."
        : "Exact BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL is required before this runner will execute the production apply.",
    requiredEnv: "BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL",
    currentGate: "second_manual_verification_run",
  });
}

let remoteApply = null;
let secondManualApplyReport = null;
if (findings.length === 0) {
  const guardedCommand = args.remoteBuildCommandEnv
    ? buildRemoteApplyCommandFromPreflight(args, remotePreflightJson, findings)
    : commandBuilderJson.command;
  if (!guardedCommand) {
    findings.push({
      id: "remote_command_env",
      message: "Remote preflight did not return a deployed proof pair usable for the production apply command.",
    });
  } else {
    const remoteCommand = `cd ${shellQuote(args.remoteDir)} && BRAIN_DIR=${shellQuote(args.remoteDir)} ${guardedCommand}`;
    remoteApply = spawnSync(args.sshCommand, [args.host, remoteCommand], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    if (remoteApply.status !== 0) {
      findings.push({
        id: "remote_apply",
        message: "Approved remote production apply command exited nonzero.",
        exitCode: remoteApply.status,
      });
    } else {
      secondManualApplyReport = captureAndValidateRemoteApplyReport(args, remoteApply, findings);
    }
  }
}

const ok = findings.length === 0;
const liveWriteAttempted = remoteApply !== null;
const output = {
  ok,
  status: ok ? "second_manual_production_apply_completed" : "blocked_second_manual_production_apply",
  noLiveNoWrite: !liveWriteAttempted,
  liveWriteAttempted,
  approvalRequired: true,
  approvalPresent,
  approvalStatus,
  host: args.host,
  remoteDir: args.remoteDir,
  localReportDir: {
    path: args.localReportDir,
    privateRoot: DEFAULT_LOCAL_REPORT_DIR,
    underPrivateRecallEvidencePath: isUnderPrivateRecallEvidenceRoot(args.localReportDir),
  },
  selectedReports: args.remoteBuildCommandEnv
    ? selectedReportsFromRemotePreflight(remotePreflightJson)
    : commandBuilderJson?.selectedReports ?? null,
  runtimeManifestPath: commandBuilderJson?.runtimeManifestPath ?? null,
  localGates: {
    skippedByDefault: !args.requireLocalGates,
    requireLocalGates: args.requireLocalGates,
    commandEnvSource: args.remoteBuildCommandEnv ? "remote_deployed_latest_spike_pair" : "local_command_builder",
    readinessStatus: commandBuilderJson?.readiness?.status ?? (commandBuilderJson?.readiness?.skipped ? "skipped" : null),
    liveSpikeGateVerdict: commandBuilderJson?.liveSpikeGate?.verdict ?? null,
  },
  commandBuilder: summarizeCommandBuilder(commandBuilder, commandBuilderJson),
  remotePreflight: summarizeRemotePreflight(remotePreflight, remotePreflightJson),
  preApplyProgress: summarizePreApplyProgress({
    args,
    commandBuilder,
    commandBuilderJson,
    remotePreflight,
    remotePreflightJson,
    approvalPresent,
    liveWriteAttempted,
    ok,
    findings,
  }),
  remoteApply: summarizeApply(remoteApply),
  secondManualApplyReport: summarizeSecondManualApplyReport(secondManualApplyReport),
  findings,
  safetyNote: liveWriteAttempted
    ? "This runner attempted the approved production apply after exact approval and passing no-live preflight gates."
    : "This runner did not call Recall or write AI Brain data. It stopped before production apply because approval or preflight requirements were not satisfied.",
};

const text = `${JSON.stringify(output, null, 2)}\n`;
if (!ok) {
  console.error("[run-recall-second-manual-production-apply] blocked");
  console.error(text);
  process.exit(1);
}

process.stdout.write(text);

function commandBuilderArgs(options) {
  return [
    "scripts/print-recall-second-manual-verification-command.mjs",
    "--json",
    ...builderPassthroughArgs(options),
  ];
}

function remotePreflightArgs(options) {
  return [
    "scripts/check-recall-second-manual-remote-runtime-preflight.mjs",
    "--host",
    options.host,
    "--remote-dir",
    options.remoteDir,
    "--ssh-command",
    options.sshCommand,
    ...builderPassthroughArgs(options),
    ...(options.skipRemoteSystemChecks ? ["--skip-remote-system-checks"] : []),
  ];
}

function builderPassthroughArgs(options) {
  return [
    ...(options.spikeDir ? ["--spike-dir", options.spikeDir] : []),
    ...(options.manifestPath ? ["--manifest", options.manifestPath] : []),
    ...(options.enumerationPath ? ["--enumeration", options.enumerationPath] : []),
    ...(options.fidelityPath ? ["--fidelity", options.fidelityPath] : []),
    ...(options.acceptedFidelityRisk ? ["--accepted-fidelity-risk", options.acceptedFidelityRisk] : []),
    ...(options.maxImports ? ["--max-imports", String(options.maxImports)] : []),
    ...(options.allowUnsafeManifestForSmoke ? ["--allow-unsafe-manifest-for-smoke"] : []),
    ...(options.includeRuntimeManifest ? ["--include-runtime-manifest"] : []),
    ...(!options.requireLocalGates || options.skipReadiness ? ["--skip-readiness"] : []),
    ...(!options.requireLocalGates || options.skipLiveSpikeGate ? ["--skip-live-spike-gate"] : []),
  ];
}

function runLocalNode(commandArgs) {
  return spawnSync(process.execPath, ["--", ...commandArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

function skippedCommandBuilder(status) {
  return {
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      skipped: true,
      status,
      noLiveNoWrite: true,
      readiness: { skipped: true },
      liveSpikeGate: { verdict: "skipped" },
    }),
    stderr: "",
  };
}

function summarizeCommandBuilder(result, parsed) {
  return {
    ok: result.status === 0 && parsed?.ok === true,
    skipped: parsed?.skipped === true,
    status: parsed?.status ?? null,
    exitCode: result.status,
    readinessStatus: parsed?.readiness?.status ?? (parsed?.readiness?.skipped ? "skipped" : null),
    liveSpikeVerdict: parsed?.liveSpikeGate?.verdict ?? null,
    noLiveNoWrite: parsed?.noLiveNoWrite ?? null,
  };
}

function buildRemoteApplyCommandFromPreflight(options, preflightJson, findingsList) {
  const latest = preflightJson?.remote?.deployedLatestReports ?? null;
  if (latest?.ok !== true || !latest.enumerationPath || !latest.fidelityPath) {
    findingsList.push({
      id: "remote_deployed_proof_pair",
      message: "Remote preflight did not surface a usable deployed SPIKE proof pair.",
      status: latest?.status ?? null,
    });
    return null;
  }
  const env = {
    BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL,
    BRAIN_RECALL_SYNC_ENABLED: "1",
    BRAIN_RECALL_CONFIRM_LIVE_API: "1",
    BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF: "1",
    BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH: latest.enumerationPath,
    BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH: latest.fidelityPath,
    BRAIN_RECALL_LIVE_SPIKE_ALLOW_FIDELITY_CHANGES: "1",
    BRAIN_RECALL_LIVE_SPIKE_ACCEPTED_FIDELITY_RISK: options.acceptedFidelityRisk ?? DEFAULT_ACCEPTED_FIDELITY_RISK,
    BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT: "1",
    BRAIN_RECALL_ALLOW_METADATA_ONLY_IMPORT: "1",
    BRAIN_RECALL_WARNING_UI_AVAILABLE: "1",
    BRAIN_RECALL_MAX_IMPORTS: String(options.maxImports ?? 5),
  };
  const lines = Object.entries(env).map(([key, value]) => `${key}=${shellQuote(value)} \\`);
  return `${lines.join("\n")}\nbash scripts/recall-second-manual-verification-apply.sh`;
}

function selectedReportsFromRemotePreflight(preflightJson) {
  const latest = preflightJson?.remote?.deployedLatestReports ?? null;
  if (latest?.ok !== true || !latest.enumerationPath || !latest.fidelityPath) return null;
  return {
    enumerationPath: latest.enumerationPath,
    fidelityPath: latest.fidelityPath,
    timestamp: latest.timestamp ?? null,
    selectedBy: latest.selectedBy ?? "remote_latest_deployed_pair",
  };
}

function summarizeRemotePreflight(result, parsed) {
  if (!result) return null;
  return {
    ok: result.status === 0 && parsed?.ok === true,
    exitCode: result.status,
    status: parsed?.status ?? null,
    remoteStatus: parsed?.remote?.status ?? null,
    timer: parsed?.remote?.timer ?? null,
    envFlags: parsed?.remote?.envFlags?.parsed?.status ?? parsed?.remote?.envFlags?.status ?? null,
    runtimePreflightStatus: parsed?.remote?.runtimePreflight?.status ?? null,
    liveApplyDelegationAllowed: parsed?.remote?.runtimePreflight?.liveApplyDelegationAllowed ?? null,
    proofReports: parsed?.remote?.proofReports ?? null,
    deployedLatestReports: parsed?.remote?.deployedLatestReports ?? null,
    remoteBuildCommandEnv: parsed?.remote?.remoteBuildCommandEnv ?? null,
  };
}

function summarizePreApplyProgress({
  args: options,
  commandBuilder: builderResult,
  commandBuilderJson: builderJson,
  remotePreflight: preflightResult,
  remotePreflightJson: preflightJson,
  approvalPresent: approvalWasPresent,
  liveWriteAttempted: applyWasAttempted,
  ok: runnerOk,
  findings: findingList,
}) {
  const blockingFindingIds = findingList.map((finding) => finding.id);
  const stoppedAt = runnerOk ? "completed" : classifyStopPoint(blockingFindingIds);
  const remotePreflightAttempted = preflightResult !== null;
  const remotePreflightPassed = preflightResult?.status === 0 && preflightJson?.ok === true;
  const localPrivateGatesSkippedForProductionPath =
    options.remoteBuildCommandEnv === true && options.requireLocalGates === false && builderJson?.skipped === true;
  return {
    stoppedAt,
    blockingFindingIds,
    commandEnvSource: options.remoteBuildCommandEnv ? "remote_deployed_latest_spike_pair" : "local_command_builder",
    localPrivateGatesSkippedForProductionPath,
    localGateMode: options.requireLocalGates ? "explicit_local_gates_required" : "production_remote_runtime_default",
    localGateStatus:
      localPrivateGatesSkippedForProductionPath
        ? "not_blocking_production_path"
        : builderJson?.readiness?.status ?? (builderJson?.readiness?.skipped ? "skipped" : null),
    commandBuilderSkipped: builderJson?.skipped === true,
    commandBuilderStatus: builderJson?.status ?? null,
    remotePreflightAttempted,
    remotePreflightPassed,
    remotePreflightStatus: preflightJson?.status ?? null,
    approvalCheckedAfterRemotePreflight: remotePreflightAttempted,
    approvalPresent: approvalWasPresent,
    liveWriteAttempted: applyWasAttempted,
    liveCallNotAttemptedBecause: applyWasAttempted ? null : explainNoLiveAttempt(stoppedAt, remotePreflightPassed),
  };
}

function classifyStopPoint(blockingFindingIds) {
  if (blockingFindingIds.includes("local_apply_report_dir_not_private")) return "local_report_dir_private_gate";
  if (blockingFindingIds.includes("command_builder")) return "local_command_builder_gate";
  if (blockingFindingIds.includes("remote_runtime_preflight")) return "remote_runtime_preflight_gate";
  if (
    blockingFindingIds.includes("approval_required") ||
    blockingFindingIds.includes("stale_first_apply_approval") ||
    blockingFindingIds.includes("second_manual_approval_wrong_env")
  ) {
    return "approval_gate";
  }
  if (blockingFindingIds.includes("remote_command_env")) return "remote_command_env_gate";
  if (blockingFindingIds.includes("remote_apply")) return "remote_apply_failed";
  if (
    blockingFindingIds.includes("remote_apply_report_path_missing") ||
    blockingFindingIds.includes("remote_apply_report_path_unexpected") ||
    blockingFindingIds.includes("remote_apply_report_fetch_failed") ||
    blockingFindingIds.includes("local_second_manual_apply_report_review_failed")
  ) {
    return "post_apply_report_review_gate";
  }
  return "unknown_gate";
}

function explainNoLiveAttempt(stoppedAt, remotePreflightPassed) {
  if (stoppedAt === "approval_gate" && remotePreflightPassed) {
    return "exact second-manual approval is missing after production remote preflight passed";
  }
  if (stoppedAt === "local_report_dir_private_gate") {
    return "local apply-report copy directory is outside private Recall evidence";
  }
  if (stoppedAt === "local_command_builder_gate") {
    return "local command builder failed because local gates were explicitly requested";
  }
  if (stoppedAt === "remote_runtime_preflight_gate") {
    return "production remote runtime preflight failed before approved apply";
  }
  if (stoppedAt === "remote_command_env_gate") {
    return "production preflight did not expose a usable deployed proof pair";
  }
  if (stoppedAt === "completed") return null;
  return "runner stopped before the production apply command";
}

function summarizeApply(result) {
  if (!result) return null;
  return {
    ok: result.status === 0,
    exitCode: result.status,
    stdoutPreview: preview(result.stdout),
    stderrPreview: preview(result.stderr),
  };
}

function captureAndValidateRemoteApplyReport(options, applyResult, findingsList) {
  const remoteApplyReportPath = extractRemoteApplyReportPath(applyResult.stdout);
  if (!remoteApplyReportPath) {
    findingsList.push({
      id: "remote_apply_report_path_missing",
      message: "Approved remote apply completed but did not print an apply_report path.",
    });
    return null;
  }
  if (!/^data\/private\/recall-live-spikes\/scheduled-apply-\d{8}T\d{6}Z\.json$/.test(remoteApplyReportPath)) {
    findingsList.push({
      id: "remote_apply_report_path_unexpected",
      message: "Approved remote apply printed an unexpected apply_report path shape.",
      remoteApplyReportPath,
    });
    return { remoteApplyReportPath };
  }

  const localApplyReportPath = join(options.localReportDir, basename(remoteApplyReportPath));
  const fetchCommand = `cd ${shellQuote(options.remoteDir)} && cat ${shellQuote(remoteApplyReportPath)}`;
  const fetchResult = spawnSync(options.sshCommand, [options.host, fetchCommand], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (fetchResult.status !== 0) {
    findingsList.push({
      id: "remote_apply_report_fetch_failed",
      message: "Approved remote apply report could not be copied into local private evidence.",
      remoteApplyReportPath,
      exitCode: fetchResult.status,
      stderrPreview: preview(fetchResult.stderr),
    });
    return { remoteApplyReportPath };
  }

  const resolvedLocalPath = resolve(localApplyReportPath);
  mkdirSync(dirname(resolvedLocalPath), { recursive: true });
  writeFileSync(resolvedLocalPath, fetchResult.stdout, { encoding: "utf8", mode: 0o600 });
  chmodSync(resolvedLocalPath, 0o600);

  const localReview = runLocalApplyReportReview(localApplyReportPath, options);
  if (localReview.status !== 0 || localReview.parsed?.ok !== true) {
    findingsList.push({
      id: "local_second_manual_apply_report_review_failed",
      message: "Copied second-manual apply report did not pass the local post-apply review gate.",
      remoteApplyReportPath,
      localApplyReportPath,
      exitCode: localReview.status,
      review: localReview.parsed ?? null,
    });
  }

  return {
    remoteApplyReportPath,
    localApplyReportPath,
    localReview,
  };
}

function extractRemoteApplyReportPath(stdout) {
  const match = String(stdout ?? "").match(/\bapply_report=([^\s]+)/);
  return match?.[1] ?? null;
}

function runLocalApplyReportReview(localApplyReportPath, options) {
  const result = runLocalNode([
    "scripts/check-recall-apply-report.mjs",
    "--report",
    localApplyReportPath,
    "--max-applied-imports",
    String(options.maxImports ?? 5),
    "--require-private-path",
    "--allow-unverified-fidelity",
    "--allow-metadata-only-fidelity",
  ]);
  return {
    status: result.status,
    parsed: parseMaybeJson(result.status === 0 ? result.stdout : result.stderr || result.stdout),
  };
}

function validateLocalReportDir(options, findingsList) {
  if (!isUnderPrivateRecallEvidenceRoot(options.localReportDir)) {
    findingsList.push({
      id: "local_apply_report_dir_not_private",
      message:
        "The second-manual apply report copy must stay under the ignored private Recall evidence directory before any approved remote apply can run.",
      localReportDir: options.localReportDir,
      requiredPrivateRoot: DEFAULT_LOCAL_REPORT_DIR,
    });
  }
}

function isUnderPrivateRecallEvidenceRoot(filePath) {
  const resolvedPath = resolve(filePath);
  return resolvedPath === PRIVATE_RECALL_EVIDENCE_ROOT || resolvedPath.startsWith(`${PRIVATE_RECALL_EVIDENCE_ROOT}/`);
}

function summarizeSecondManualApplyReport(report) {
  if (!report) return null;
  return {
    remoteApplyReportPath: report.remoteApplyReportPath ?? null,
    localApplyReportPath: report.localApplyReportPath ?? null,
    localReview: report.localReview
      ? {
          ok: report.localReview.status === 0 && report.localReview.parsed?.ok === true,
          exitCode: report.localReview.status,
          verdict: report.localReview.parsed?.verdict ?? null,
          summary: report.localReview.parsed?.summary ?? null,
        }
      : null,
    nextUse:
      "The local private apply report copy is what completion status can count as the second clean manual run before scheduler approval.",
  };
}

function summarizeApprovalStatus() {
  const approvals = [
    approvalEnvSummary("BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL", process.env.BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL),
    approvalEnvSummary("BRAIN_RECALL_FIRST_APPLY_APPROVAL", process.env.BRAIN_RECALL_FIRST_APPLY_APPROVAL),
    approvalEnvSummary("BRAIN_RECALL_APPROVAL_TEXT", process.env.BRAIN_RECALL_APPROVAL_TEXT),
  ];
  const supplied = approvals.filter((entry) => entry.present);
  return {
    requiredEnv: "BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL",
    requiredApprovalKind: "second_manual_verification",
    currentGate: "second_manual_verification_run",
    manualVerificationApprovalExact: approvals[0].classification === "second_manual_verification",
    firstApplyApprovalPresent: supplied.some((entry) => entry.classification === "first_capped_apply"),
    secondManualApprovalTextPresent: supplied.some((entry) => entry.classification === "second_manual_verification"),
    supplied,
  };
}

function approvalEnvSummary(envName, value) {
  const text = String(value ?? "");
  return {
    envName,
    present: text.length > 0,
    classification: classifyApprovalText(text),
  };
}

function classifyApprovalText(value) {
  if (!value) return "missing";
  if (value === APPROVAL) return "second_manual_verification";
  if (value === FIRST_APPLY_APPROVAL) return "first_capped_apply";
  return "unrecognized";
}

function preview(value) {
  const text = redact(String(value ?? "").trim());
  return text.length > 4000 ? `${text.slice(0, 4000)}...<truncated>` : text;
}

function redact(value) {
  return value
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/gi, "Bearer <redacted:token>");
}

function parseMaybeJson(text) {
  const trimmed = String(text ?? "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function parseArgs(argv) {
  const parsed = {
    host: DEFAULT_HOST,
    remoteDir: DEFAULT_REMOTE_DIR,
    sshCommand: process.env.BRAIN_RECALL_PRODUCTION_APPLY_SSH_COMMAND || "ssh",
    spikeDir: null,
    manifestPath: null,
    enumerationPath: null,
    fidelityPath: null,
    acceptedFidelityRisk: null,
    maxImports: null,
    localReportDir: DEFAULT_LOCAL_REPORT_DIR,
    allowUnsafeManifestForSmoke: false,
    includeRuntimeManifest: false,
    skipReadiness: false,
    skipLiveSpikeGate: false,
    requireLocalGates: false,
    skipRemoteSystemChecks: false,
    remoteBuildCommandEnv: true,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--host" && next) {
      parsed.host = next;
      i += 1;
    } else if (arg === "--remote-dir" && next) {
      parsed.remoteDir = next;
      i += 1;
    } else if (arg === "--ssh-command" && next) {
      parsed.sshCommand = next;
      i += 1;
    } else if (arg === "--spike-dir" && next) {
      parsed.spikeDir = next;
      i += 1;
    } else if (arg === "--manifest" && next) {
      parsed.manifestPath = next;
      i += 1;
    } else if (arg === "--enumeration" && next) {
      parsed.enumerationPath = next;
      i += 1;
    } else if (arg === "--fidelity" && next) {
      parsed.fidelityPath = next;
      i += 1;
    } else if (arg === "--accepted-fidelity-risk" && next) {
      parsed.acceptedFidelityRisk = next;
      i += 1;
    } else if (arg === "--max-imports" && next) {
      parsed.maxImports = Number(next);
      i += 1;
    } else if (arg === "--local-report-dir" && next) {
      parsed.localReportDir = next;
      i += 1;
    } else if (arg === "--allow-unsafe-manifest-for-smoke") {
      parsed.allowUnsafeManifestForSmoke = true;
    } else if (arg === "--include-runtime-manifest") {
      parsed.includeRuntimeManifest = true;
    } else if (arg === "--skip-readiness") {
      parsed.skipReadiness = true;
    } else if (arg === "--skip-live-spike-gate") {
      parsed.skipLiveSpikeGate = true;
    } else if (arg === "--require-local-gates") {
      parsed.requireLocalGates = true;
    } else if (arg === "--skip-remote-system-checks") {
      parsed.skipRemoteSystemChecks = true;
    } else if (arg === "--remote-build-command-env") {
      parsed.remoteBuildCommandEnv = true;
    } else if (arg === "--local-build-command-env") {
      parsed.remoteBuildCommandEnv = false;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (Boolean(parsed.enumerationPath) !== Boolean(parsed.fidelityPath)) {
    throw new Error("Pass both --enumeration and --fidelity, or neither.");
  }
  if (parsed.maxImports !== null && (!Number.isInteger(parsed.maxImports) || parsed.maxImports < 1)) {
    throw new Error("--max-imports must be a positive integer.");
  }
  return parsed;
}

function printHelp() {
  console.log(`Recall second manual production apply runner

Usage:
  BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL="<exact approval text>" npm run recall:second-manual:production-apply

This runner builds the guarded second-manual command env from the deployed
remote SPIKE proof pair by default, runs the remote runtime preflight, and
refuses to run the production apply unless the exact manual verification
approval environment variable is present. Without approval, it is
no-live/no-write and exits before apply. After an approved remote apply
succeeds, it copies the remote scheduled apply report into the local private
Recall evidence directory and reruns the local post-apply report checker so
completion status can count the second clean manual run. Pass
--local-build-command-env only when you explicitly want local proof selection.
Pass --require-local-gates only when you explicitly want the broader local
planning gates before the production runtime path.

First capped apply approval is intentionally treated as stale for this runner:
the current gate is the distinct second manual verification approval.
`);
}
