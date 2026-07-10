#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APPROVAL_PACKET_PATH =
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md";
const REQUIRED_CURRENT_GATE = "second_manual_verification_run";
const REQUIRED_COMPLETION_STATUS = "blocked_second_manual_verification_run";
const REQUIRED_ACTIVE_BLOCKED_REQUIREMENT = "second_manual_verification";
const REQUIRED_EXTERNAL_ACTION = "approve_second_manual_verification_run_before_scheduler_enablement";
const SECOND_MANUAL_PRODUCTION_COMMAND = "npm run recall:second-manual:production-command";
const SECOND_MANUAL_PRODUCTION_APPLY_COMMAND = "npm run recall:second-manual:production-apply";
const REQUIRED_DONE_REQUIREMENTS = [
  "live_spike_proof",
  "private_live_diagnostic_proof",
  "approval_packet_and_public_privacy",
  "first_apply_key_and_proof_readiness",
  "first_capped_apply",
  "post_apply_review",
  "scheduler_artifacts",
  "production_deploy",
];
const REQUIRED_BLOCKED_ACTIONS = ["second_manual_verification", "scheduler", "checkpoint"];

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const checked = [];
const findings = [];

const completionStatus = readResultOrRun(args.completionStatusResultPath, () =>
  runJsonCommand([script("check-recall-daily-sync-completion-status.mjs")]),
);
checked.push(
  summarizeResult("completion_status", completionStatus, [
    "ok",
    "completionAchieved",
    "status",
    "currentBlockingGate",
    "activeBlockedRequirement",
  ]),
);

const approvalPacket = readResultOrRun(args.approvalPacketResultPath, () =>
  runJsonCommand([script("check-recall-approval-packet.mjs")]),
);
checked.push(summarizeResult("approval_packet", approvalPacket, ["ok"]));

const publicDocsPrivacy = readResultOrRun(args.publicDocsPrivacyResultPath, () =>
  runJsonCommand([script("check-recall-public-docs-privacy.mjs")]),
);
checked.push(summarizeResult("public_docs_privacy", publicDocsPrivacy, ["ok", "scannedFiles"]));

const schedulerArtifacts = readResultOrRun(args.schedulerArtifactsResultPath, () => {
  const result = spawnSync(process.execPath, ["--", script("check-recall-scheduler-artifacts.mjs")], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    parsed: {
      ok: result.status === 0,
      verdict: result.status === 0
        ? "PASS_RECALL_SCHEDULER_ARTIFACTS_STATIC_CHECK"
        : "FAIL_RECALL_SCHEDULER_ARTIFACTS_STATIC_CHECK",
      stdout: redact(result.stdout),
      stderr: redact(result.stderr),
    },
  };
});
checked.push(summarizeResult("scheduler_artifacts", schedulerArtifacts, ["ok", "verdict"]));

const manualWrapperSmoke = readResultOrRun(args.manualWrapperSmokeResultPath, () =>
  runJsonCommand([script("smoke-recall-manual-verification-apply.mjs")]),
);
checked.push(summarizeResult("manual_verification_wrapper_smoke", manualWrapperSmoke, ["ok"]));

validateCompletionStatus(completionStatus.parsed ?? {}, findings);
requireOk("approval_packet", approvalPacket, findings);
requireOk("public_docs_privacy", publicDocsPrivacy, findings);
requireOk("scheduler_artifacts", schedulerArtifacts, findings);
requireOk("manual_verification_wrapper_smoke", manualWrapperSmoke, findings);

const ok = findings.length === 0;
const output = {
  ok,
  status: ok ? "ready_for_second_manual_verification_approval" : "blocked_second_manual_verification_readiness",
  noLiveNoWrite: true,
  approvalRequired: true,
  approvalPacketPath: APPROVAL_PACKET_PATH,
  currentBlockingGate: ok ? REQUIRED_CURRENT_GATE : completionStatus.parsed?.currentBlockingGate ?? null,
  activeBlockedRequirement: ok
    ? REQUIRED_ACTIVE_BLOCKED_REQUIREMENT
    : completionStatus.parsed?.activeBlockedRequirement ?? null,
  externalAction: ok ? REQUIRED_EXTERNAL_ACTION : completionStatus.parsed?.externalAction ?? null,
  liveWriteAllowedNow: false,
  schedulerAllowedNow: false,
  checkpointAllowedNow: false,
  checked,
  manualCleanRunReadiness: extractManualCleanRunReadiness(completionStatus.parsed ?? {}),
  blockedRequirements: ok ? ["scheduler_enablement"] : completionStatus.parsed?.blockedRequirements ?? [],
  blockedActions: ok ? REQUIRED_BLOCKED_ACTIONS : completionStatus.parsed?.blockedActions ?? [],
  findings,
  safeNextCommands: [
    `Review ${APPROVAL_PACKET_PATH}`,
    "npm run recall:second-manual:readiness",
    `No-live production handoff before approval: ${SECOND_MANUAL_PRODUCTION_COMMAND}`,
    `Only after exact approval: ${SECOND_MANUAL_PRODUCTION_APPLY_COMMAND}`,
  ],
  nextAction: ok
    ? `Machine readiness for the second manual verification run is satisfied. Run ${SECOND_MANUAL_PRODUCTION_COMMAND} for the no-live production handoff, then wait for exact Arun approval before ${SECOND_MANUAL_PRODUCTION_APPLY_COMMAND}.`
    : "Do not run the second manual verification apply. Resolve readiness findings, then rerun this no-live gate.",
  safetyNote:
    "This readiness command is no-live and no-write. It does not call Recall, apply imports, deploy, enable a scheduler, or advance checkpoints.",
};

const text = `${JSON.stringify(output, null, 2)}\n`;

if (!ok) {
  console.error("[check:recall-second-manual-verification-readiness] failed");
  console.error(text);
  process.exit(1);
}

console.log(text);

function validateCompletionStatus(status, findings) {
  if (!status || typeof status !== "object") {
    findings.push({ id: "completion_status", rule: "missing_completion_status", message: "Completion status JSON is missing." });
    return;
  }
  if (status.noLiveNoWrite !== true) {
    findings.push({
      id: "completion_status",
      rule: "completion_status_not_no_live_no_write",
      message: "Completion status must identify itself as no-live/no-write.",
    });
  }
  if (status.completionAchieved !== false) {
    findings.push({
      id: "completion_status",
      rule: "unexpected_completion_state",
      message: "Second manual readiness applies only while whole-goal completion is still false.",
    });
  }
  if (status.status !== REQUIRED_COMPLETION_STATUS) {
    findings.push({
      id: "completion_status",
      rule: "wrong_completion_status",
      message: `Completion status must be ${REQUIRED_COMPLETION_STATUS}, got ${String(status.status)}.`,
    });
  }
  if (status.currentBlockingGate !== REQUIRED_CURRENT_GATE) {
    findings.push({
      id: "completion_status",
      rule: "wrong_current_gate",
      message: `Current gate must be ${REQUIRED_CURRENT_GATE}, got ${String(status.currentBlockingGate)}.`,
    });
  }
  if (status.activeBlockedRequirement !== REQUIRED_ACTIVE_BLOCKED_REQUIREMENT) {
    findings.push({
      id: "completion_status",
      rule: "wrong_active_blocked_requirement",
      message: `Active blocked requirement must be ${REQUIRED_ACTIVE_BLOCKED_REQUIREMENT}.`,
    });
  }
  if (!Array.isArray(status.blockedRequirements) || !status.blockedRequirements.includes("scheduler_enablement")) {
    findings.push({
      id: "completion_status",
      rule: "missing_scheduler_completion_requirement",
      message: "Completion status must preserve scheduler_enablement as the broader remaining completion requirement.",
    });
  }
  if (status.externalAction !== REQUIRED_EXTERNAL_ACTION) {
    findings.push({
      id: "completion_status",
      rule: "wrong_external_action",
      message: `External action must be ${REQUIRED_EXTERNAL_ACTION}.`,
    });
  }
  for (const action of REQUIRED_BLOCKED_ACTIONS) {
    if (!Array.isArray(status.blockedActions) || !status.blockedActions.includes(action)) {
      findings.push({
        id: "completion_status",
        rule: "missing_blocked_action",
        message: `Completion status must block ${action}.`,
      });
    }
  }

  const requirements = Array.isArray(status.requirements) ? status.requirements : [];
  for (const id of REQUIRED_DONE_REQUIREMENTS) {
    const requirement = requirements.find((entry) => entry?.id === id);
    if (requirement?.ok !== true) {
      findings.push({
        id: "completion_status",
        rule: "required_completion_requirement_not_done",
        message: `Completion requirement ${id} must be done before second manual verification readiness.`,
      });
    }
  }

  const schedulerRequirement = requirements.find((entry) => entry?.id === "scheduler_enablement");
  if (schedulerRequirement?.ok !== false) {
    findings.push({
      id: "completion_status",
      rule: "scheduler_requirement_not_pending",
      message: "Scheduler enablement must still be pending before the second manual verification run.",
    });
  }

  const readiness = extractManualCleanRunReadiness(status);
  if (!readiness || typeof readiness !== "object") {
    findings.push({
      id: "completion_status",
      rule: "manual_clean_run_readiness_missing",
      message: "Scheduler requirement must include manualCleanRunReadiness.",
    });
    return;
  }
  if (readiness.requiredManualCleanRunsBeforeSchedulerEnable !== 2) {
    findings.push({
      id: "completion_status",
      rule: "manual_clean_run_requirement_unexpected",
      message: "Manual clean-run requirement must be exactly 2 before scheduler enablement.",
    });
  }
  if (!Number.isFinite(readiness.cleanRunCount) || readiness.cleanRunCount < 1) {
    findings.push({
      id: "completion_status",
      rule: "no_prior_clean_manual_run",
      message: "At least the first capped apply must count as a clean manual run before the second verification run.",
    });
  }
  if (readiness.needsSecondManualVerificationRun !== true) {
    findings.push({
      id: "completion_status",
      rule: "second_manual_run_not_needed",
      message: "Completion status must still require the second manual verification run.",
    });
  }
  if (readiness.schedulerEnablementApprovalAllowedByManualRunEvidence !== false) {
    findings.push({
      id: "completion_status",
      rule: "scheduler_approval_allowed_too_early",
      message: "Scheduler approval must not be allowed by manual-run evidence before the second clean run.",
    });
  }
}

function extractManualCleanRunReadiness(status) {
  const requirements = Array.isArray(status.requirements) ? status.requirements : [];
  return requirements.find((entry) => entry?.id === "scheduler_enablement")?.evidence?.manualCleanRunReadiness ?? null;
}

function requireOk(id, result, findings) {
  if (result.ok !== true || result.parsed?.ok === false) {
    findings.push({
      id,
      rule: "gate_failed",
      message: `${id} failed or returned ok:false.`,
      exitCode: result.exitCode ?? null,
    });
  }
}

function summarizeResult(id, result, fields) {
  const parsed = result.parsed ?? {};
  const summary = {
    id,
    ok: result.ok === true && parsed.ok !== false,
    exitCode: result.exitCode ?? null,
  };
  for (const field of fields) summary[field] = parsed[field] ?? null;
  return summary;
}

function readResultOrRun(filePath, run) {
  if (!filePath) return run();
  const parsed = parseMaybeJson(readFileSync(resolve(filePath), "utf8"));
  return {
    ok: parsed?.ok === true,
    exitCode: parsed?.ok === true ? 0 : 1,
    parsed,
  };
}

function runJsonCommand(commandArgs) {
  const result = spawnSync(process.execPath, ["--", ...commandArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const text = result.status === 0 ? result.stdout : result.stderr || result.stdout;
  return {
    ok: result.status === 0,
    exitCode: result.status,
    parsed: parseMaybeJson(text),
  };
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

function parseArgs(argv) {
  const parsed = {
    completionStatusResultPath: null,
    approvalPacketResultPath: null,
    publicDocsPrivacyResultPath: null,
    schedulerArtifactsResultPath: null,
    manualWrapperSmokeResultPath: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--completion-status-result" && next) {
      parsed.completionStatusResultPath = next;
      i += 1;
    } else if (arg === "--approval-packet-result" && next) {
      parsed.approvalPacketResultPath = next;
      i += 1;
    } else if (arg === "--public-docs-privacy-result" && next) {
      parsed.publicDocsPrivacyResultPath = next;
      i += 1;
    } else if (arg === "--scheduler-artifacts-result" && next) {
      parsed.schedulerArtifactsResultPath = next;
      i += 1;
    } else if (arg === "--manual-wrapper-smoke-result" && next) {
      parsed.manualWrapperSmokeResultPath = next;
      i += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
}

function script(name) {
  return resolve("scripts", name);
}

function redact(value) {
  return String(value)
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer <redacted:token>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>")
    .replace(/\bRECALL_API_KEY\s*=\s*[^\s"'<>]+/gi, "RECALL_API_KEY=<redacted>");
}

function printHelp() {
  console.log(`Recall second manual verification readiness

Usage:
  npm run recall:second-manual:readiness

This command is no-live and no-write. It verifies that the project is ready for
the owner to approve the second manual Recall -> AI Brain verification run. It
does not grant write permission and does not enable the scheduler.
`);
}
