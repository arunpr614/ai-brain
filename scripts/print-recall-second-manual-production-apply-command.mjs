#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const DEFAULT_HOST = process.env.BRAIN_SSH_HOST || "brain";
const DEFAULT_REMOTE_DIR = process.env.BRAIN_REMOTE_DIR || "/opt/brain";
const DEFAULT_LOCAL_REPORT_DIR = "data/private/recall-live-spikes";
const PRIVATE_RECALL_EVIDENCE_ROOT = resolve(DEFAULT_LOCAL_REPORT_DIR);
const APPROVAL =
  "I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.";
const FIRST_APPLY_APPROVAL =
  "I approve the first capped Recall -> AI Brain apply for the 2026-06-16 window, capped at 5 planned imports, using the accepted live-spike proof, reviewed dry-run proof, backup proof, and explicit fidelity flags for unverified and metadata-only Recall content.";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const localReportDir = summarizeLocalReportDir(args.localReportDir);
const localReportDirFindings = localReportDir.underPrivateRecallEvidencePath
  ? []
  : [
      {
        id: "local_apply_report_dir_not_private",
        message: "The requested production runner command would use a local apply-report directory outside private Recall evidence.",
        localReportDir: args.localReportDir,
        requiredPrivateRoot: DEFAULT_LOCAL_REPORT_DIR,
      },
    ];
const localInputBlocked = localReportDirFindings.length > 0;

const completionStatus = localInputBlocked
  ? skippedResult("blocked_local_report_dir_not_private")
  : args.skipStatusForSmoke
  ? skippedResult("status_check_skipped_for_smoke")
  : runJsonCommand(["scripts/check-recall-daily-sync-completion-status.mjs"]);
const remotePreflight = localInputBlocked
  ? skippedResult("blocked_local_report_dir_not_private")
  : args.skipRemotePreflightForSmoke
  ? skippedResult("remote_preflight_skipped_for_smoke")
  : runJsonCommand([
      "scripts/check-recall-second-manual-remote-runtime-preflight.mjs",
      "--host",
      args.host,
      "--remote-dir",
      args.remoteDir,
      "--ssh-command",
      args.sshCommand,
      "--skip-readiness",
      "--skip-live-spike-gate",
      ...(args.skipRemoteSystemChecks ? ["--skip-remote-system-checks"] : []),
    ]);

const currentGate = completionStatus.parsed?.currentBlockingGate ?? null;
const completionGateOk =
  completionStatus.skipped === true ||
  (completionStatus.exitCode === 0 && completionStatus.parsed?.currentBlockingGate === "second_manual_verification_run");
const remotePreflightOk = remotePreflight.skipped === true || (remotePreflight.exitCode === 0 && remotePreflight.parsed?.ok === true);
const approvalStatus = summarizeApprovalStatus();
const findings = [
  ...(completionGateOk
    ? []
    : [
        {
          id: "unexpected_completion_gate",
          message: "Completion status is not currently waiting at the second manual verification gate.",
          currentGate,
        },
      ]),
  ...(remotePreflightOk
    ? []
    : [
        {
          id: "remote_preflight_not_ready",
          message: "Remote runtime preflight is not ready; do not run the production apply command.",
          status: remotePreflight.parsed?.status ?? null,
        },
      ]),
  ...localReportDirFindings,
];

const command = localReportDir.underPrivateRecallEvidencePath ? buildProductionCommand() : null;
const ok = findings.length === 0;
const result = {
  ok,
  mode: "second_manual_production_apply_command_handoff",
  noLiveNoWrite: true,
  approvalRequired: true,
  approvalTextPrinted: true,
  approvalStatus,
  host: args.host,
  remoteDir: args.remoteDir,
  localReportDir,
  completionStatus: summarizeCompletionStatus(completionStatus),
  remotePreflight: summarizeRemotePreflight(remotePreflight),
  handoffProgress: summarizeHandoffProgress({
    localInputBlocked,
    completionGateOk,
    remotePreflightOk,
    completionStatus,
    remotePreflight,
    approvalStatus,
    findings,
  }),
  command,
  commandNotes: commandNotes(approvalStatus),
  findings,
  safetyNote:
    "This handoff command is no-live and no-write. It does not call Recall, import data, deploy, enable a scheduler, or advance checkpoints.",
};

const output = args.json ? `${JSON.stringify(result, null, 2)}\n` : toMarkdown(result);
if (!ok) {
  console.error(output);
  process.exit(1);
}

process.stdout.write(output);

function commandNotes(status) {
  const notes = [
    "Printing this command is not approval and does not run it.",
    "Run it only after Arun explicitly approves the second manual verification live write.",
    "First capped apply approval is already spent and does not authorize this second manual verification run.",
    "The production runner will still rerun remote preflight and will refuse to apply unless the exact approval env is present.",
    "The command does not enable the scheduler; scheduler approval/evidence remains separate.",
  ];
  if (status.firstApplyApprovalPresent) {
    notes.splice(
      2,
      0,
      "A first capped apply approval is present in the environment, but the current gate is second manual verification; keep using the printed second-manual approval env.",
    );
  }
  if (status.secondManualApprovalTextPresent && !status.manualVerificationApprovalExact) {
    notes.splice(
      2,
      0,
      "Second manual approval text is present outside BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL; the live runner will still refuse until it is in the required env var.",
    );
  }
  return notes;
}

function buildProductionCommand() {
  const command = [
    `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL=${shellQuote(APPROVAL)} \\`,
    "npm run recall:second-manual:production-apply",
  ].join("\n");
  if (args.localReportDir === DEFAULT_LOCAL_REPORT_DIR) return command;
  return `${command} -- --local-report-dir ${shellQuote(args.localReportDir)}`;
}

function summarizeCompletionStatus(result) {
  if (result.skipped) return { ok: true, skipped: true, status: result.status };
  return {
    ok: result.exitCode === 0,
    exitCode: result.exitCode,
    completionAchieved: result.parsed?.completionAchieved ?? null,
    status: result.parsed?.status ?? null,
    currentBlockingGate: result.parsed?.currentBlockingGate ?? null,
    owner: result.parsed?.owner ?? null,
    externalAction: result.parsed?.externalAction ?? null,
    noLiveNoWrite: result.parsed?.noLiveNoWrite ?? null,
  };
}

function summarizeRemotePreflight(result) {
  if (result.skipped) return { ok: true, skipped: true, status: result.status };
  return {
    ok: result.exitCode === 0 && result.parsed?.ok === true,
    exitCode: result.exitCode,
    status: result.parsed?.status ?? null,
    remoteStatus: result.parsed?.remote?.status ?? null,
    timer: result.parsed?.remote?.timer ?? null,
    envFlags: result.parsed?.remote?.envFlags?.parsed?.status ?? result.parsed?.remote?.envFlags?.status ?? null,
    runtimePreflightStatus: result.parsed?.remote?.runtimePreflight?.status ?? null,
    liveApplyDelegationAllowed: result.parsed?.remote?.runtimePreflight?.liveApplyDelegationAllowed ?? null,
    proofReports: result.parsed?.remote?.proofReports ?? null,
    deployedLatestReports: result.parsed?.remote?.deployedLatestReports ?? null,
    commandEnvSource: result.parsed?.commandEnvSource ?? null,
    remoteBuildCommandEnv: result.parsed?.remote?.remoteBuildCommandEnv ?? null,
  };
}

function summarizeLocalReportDir(localReportDir) {
  return {
    path: localReportDir,
    privateRoot: DEFAULT_LOCAL_REPORT_DIR,
    underPrivateRecallEvidencePath: isUnderPrivateRecallEvidenceRoot(localReportDir),
    runnerDefault: localReportDir === DEFAULT_LOCAL_REPORT_DIR,
  };
}

function summarizeHandoffProgress({
  localInputBlocked,
  completionGateOk,
  remotePreflightOk,
  completionStatus,
  remotePreflight,
  approvalStatus,
  findings,
}) {
  const remotePreflightAttempted = remotePreflight.skipped !== true;
  const remotePreflightPassed = remotePreflightAttempted && remotePreflight.exitCode === 0 && remotePreflight.parsed?.ok === true;
  const commandEnvSource = remotePreflight.parsed?.commandEnvSource ?? null;
  const localPrivateGatesSkippedForProductionPath =
    localInputBlocked === false &&
    (remotePreflight.skipped === true || commandEnvSource === "remote_deployed_latest_spike_pair");
  const readyForExactApproval = findings.length === 0 && completionGateOk && remotePreflightOk;
  const stoppedAt = readyForExactApproval
    ? "ready_for_exact_approval"
    : localInputBlocked
      ? "local_report_dir_private_gate"
      : !completionGateOk
        ? "completion_gate"
        : !remotePreflightOk
          ? "remote_runtime_preflight_gate"
          : "handoff_safety_check_failed";
  return {
    stoppedAt,
    readyForExactApproval,
    blockingFindingIds: findings.map((finding) => finding.id),
    currentCompletionGate: completionStatus.parsed?.currentBlockingGate ?? completionStatus.status ?? null,
    commandEnvSource,
    localPrivateGatesSkippedForProductionPath,
    localGateStatus: localPrivateGatesSkippedForProductionPath
      ? "not_blocking_production_path"
      : localInputBlocked
        ? "local_report_dir_private_gate"
        : null,
    remotePreflightAttempted,
    remotePreflightPassed,
    remotePreflightStatus: remotePreflight.parsed?.status ?? remotePreflight.status ?? null,
    approvalRequiredEnv: approvalStatus.requiredEnv,
    exactApprovalAlreadyPresent: approvalStatus.manualVerificationApprovalExact,
    liveWriteAttempted: false,
    liveCallNotAttemptedBecause: readyForExactApproval
      ? "this handoff is no-live/no-write; exact second-manual approval is the next required action after production remote preflight passed"
      : explainHandoffStop(stoppedAt),
  };
}

function explainHandoffStop(stoppedAt) {
  if (stoppedAt === "local_report_dir_private_gate") {
    return "local apply-report copy directory is outside private Recall evidence";
  }
  if (stoppedAt === "completion_gate") {
    return "completion status is not waiting at the second manual verification gate";
  }
  if (stoppedAt === "remote_runtime_preflight_gate") {
    return "production remote runtime preflight is not ready";
  }
  return "handoff safety checks failed before printing an approved runner command";
}

function isUnderPrivateRecallEvidenceRoot(filePath) {
  const resolvedPath = resolve(filePath);
  return resolvedPath === PRIVATE_RECALL_EVIDENCE_ROOT || resolvedPath.startsWith(`${PRIVATE_RECALL_EVIDENCE_ROOT}/`);
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

function runJsonCommand(commandArgs) {
  const result = spawnSync(process.execPath, ["--", ...commandArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    parsed: parseMaybeJson(result.status === 0 ? result.stdout : result.stderr || result.stdout),
  };
}

function skippedResult(status) {
  return {
    ok: true,
    skipped: true,
    exitCode: 0,
    status,
    parsed: null,
  };
}

function toMarkdown(result) {
  const latestReports = result.remotePreflight?.deployedLatestReports ?? null;
  const lines = [
    "# Recall Second Manual Production Apply Command",
    "",
    `- No live/no write: \`${result.noLiveNoWrite}\``,
    `- Current gate: \`${result.completionStatus.currentBlockingGate ?? result.completionStatus.status ?? "skipped"}\``,
    `- Remote preflight: \`${result.remotePreflight.status ?? (result.remotePreflight.skipped ? "skipped" : "unknown")}\``,
    `- Handoff progress: \`${result.handoffProgress.stoppedAt}\``,
    `- Local private gates blocking: \`${!result.handoffProgress.localPrivateGatesSkippedForProductionPath}\``,
    `- Local apply-report directory: \`${result.localReportDir.path}\``,
    `- Local apply-report directory private: \`${result.localReportDir.underPrivateRecallEvidencePath}\``,
    `- Latest deployed proof timestamp: \`${latestReports?.timestamp ?? "unknown"}\``,
    `- Selected matches deployed latest: \`${latestReports?.selectedMatchesRemoteLatest ?? "unknown"}\``,
    "",
    "## Approved Production Runner Command",
    "",
    "```bash",
    result.command ?? "# Command withheld because the requested handoff failed safety checks.",
    "```",
    "",
    "## Notes",
    "",
    ...result.commandNotes.map((note) => `- ${note}`),
    "",
    result.safetyNote,
  ];
  return `${lines.join("\n")}\n`;
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
    sshCommand:
      process.env.BRAIN_RECALL_PRODUCTION_COMMAND_SSH_COMMAND ||
      process.env.BRAIN_RECALL_REMOTE_PREFLIGHT_SSH_COMMAND ||
      "ssh",
    skipRemoteSystemChecks: false,
    localReportDir: DEFAULT_LOCAL_REPORT_DIR,
    skipStatusForSmoke: false,
    skipRemotePreflightForSmoke: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--host" && next) {
      parsed.host = next;
      i += 1;
    } else if (arg === "--remote-dir" && next) {
      parsed.remoteDir = next;
      i += 1;
    } else if (arg === "--ssh-command" && next) {
      parsed.sshCommand = next;
      i += 1;
    } else if (arg === "--local-report-dir" && next) {
      parsed.localReportDir = next;
      i += 1;
    } else if (arg === "--skip-remote-system-checks") {
      parsed.skipRemoteSystemChecks = true;
    } else if (arg === "--skip-status-for-smoke") {
      parsed.skipStatusForSmoke = true;
    } else if (arg === "--skip-remote-preflight-for-smoke") {
      parsed.skipRemotePreflightForSmoke = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`Recall second manual production apply command handoff

Usage:
  npm run recall:second-manual:production-command
  npm run recall:second-manual:production-command -- --json

This command is no-live and no-write. It checks the current completion gate,
runs the no-live remote runtime preflight with broad local gates skipped, and
prints the preferred production runner command for the approved second manual
verification run.

By default the future approved runner copies the remote apply report into
data/private/recall-live-spikes. Passing --local-report-dir is allowed only
for paths under that private Recall evidence root.

Printing the command is not approval. Do not run the printed command unless
Arun has explicitly approved the second manual verification live write. First
capped apply approval is stale for this gate and does not authorize a run.
`);
}
