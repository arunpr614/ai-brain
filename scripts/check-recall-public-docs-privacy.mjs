#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const CURRENT_DOC_PATHS = [
  "docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_CHECKLIST_2026-06-24_14-00-43_IST.md",
  "docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_HANDOFF_2026-06-24_18-21-35_IST.md",
  "docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md",
  "docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md",
  "docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md",
  "docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md",
  "docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_IMPLEMENTATION_OPTIONS_V3_2026-06-24_18-17-27_IST.md",
  "docs/plans/recall-sync/RECALL_DAILY_SYNC_COMPLETION_STATUS_HELPER_EXECUTION_REPORT_2026-06-25_06-56-49_IST.md",
  "docs/plans/recall-sync/RECALL_DAILY_SYNC_RELEASE_VISIBILITY_GATE_EXECUTION_REPORT_2026-06-25_07-06-36_IST.md",
  "docs/plans/recall-sync/RECALL_COMPLETION_EVIDENCE_VALIDATORS_EXECUTION_REPORT_2026-06-25_07-14-55_IST.md",
  "docs/plans/recall-sync/RECALL_KEY_ROTATION_HANDOFF_COMMAND_EXECUTION_REPORT_2026-06-25_07-34-55_IST.md",
  "docs/plans/recall-sync/RECALL_KEY_ROTATION_HANDOFF_RELEASE_VISIBILITY_GATE_EXECUTION_REPORT_2026-06-25_07-42-57_IST.md",
  "docs/plans/recall-sync/RECALL_KEY_ROTATION_HANDOFF_READ_ONLY_DIAGNOSTIC_PROOF_FIX_2026-06-25_08-13-44_IST.md",
  "docs/plans/recall-sync/RECALL_ROTATED_PRIVATE_ENV_WRITER_EXECUTION_REPORT_2026-06-25_08-26-47_IST.md",
  "docs/plans/recall-sync/RECALL_POST_ROTATION_PREPARE_RELEASE_GATE_EXECUTION_REPORT_2026-06-25_07-53-55_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_REFRESHABILITY_BUGFIX_EXECUTION_REPORT_2026-06-25_08-02-46_IST.md",
  "docs/plans/recall-sync/RECALL_PUBLIC_MANIFEST_PRIVACY_FILE_SAFETY_GUARD_EXECUTION_REPORT_2026-06-24_18-11-22_IST.md",
  "docs/plans/recall-sync/RECALL_PUBLIC_DOCS_PRIVACY_SCAN_EXECUTION_REPORT_2026-06-24_18-28-55_IST.md",
  "docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_RECEIVED_READINESS_CHECK_2026-06-24_18-48-28_IST.md",
  "docs/plans/recall-sync/RECALL_LIVE_SPIKE_EXECUTION_REPORT_2026-06-24_19-06-25_IST.md",
  "docs/plans/recall-sync/RECALL_PRODUCTION_DRY_RUN_EXECUTION_REPORT_2026-06-24_19-14-08_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_BACKUP_PROOF_2026-06-24_19-19-52_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_APPROVAL_PACKET_2026-06-24_19-28-07_IST.md",
  "docs/plans/recall-sync/RECALL_APPLY_REPORT_REVIEW_GATE_EXECUTION_REPORT_2026-06-24_19-47-09_IST.md",
  "docs/plans/recall-sync/RECALL_LIVE_SPIKE_ENV_FILE_GATE_FIX_EXECUTION_REPORT_2026-06-24_20-05-02_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_READINESS_GATE_EXECUTION_REPORT_2026-06-24_20-16-20_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_WRAPPER_EXECUTION_REPORT_2026-06-24_20-26-51_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_READINESS_FRESHNESS_COUNTDOWN_EXECUTION_REPORT_2026-06-24_20-34-12_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_PROOF_REFRESH_WRAPPER_EXECUTION_REPORT_2026-06-24_20-47-10_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_READY_OR_REFRESH_WRAPPER_EXECUTION_REPORT_2026-06-24_21-02-06_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_PROOF_REFRESH_ACTUAL_EXECUTION_REPORT_2026-06-24_21-11-03_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_KEY_ROTATION_ACK_GATE_EXECUTION_REPORT_2026-06-24_21-24-17_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_KEY_ROTATION_EVIDENCE_GATE_EXECUTION_REPORT_2026-06-24_21-33-19_IST.md",
  "docs/plans/recall-sync/RECALL_SCHEDULED_WRAPPER_KEY_ROTATION_EVIDENCE_GATE_EXECUTION_REPORT_2026-06-24_23-03-38_IST.md",
  "docs/plans/recall-sync/RECALL_DEPLOY_OVERRIDE_KEY_ROTATION_EVIDENCE_GATE_EXECUTION_REPORT_2026-06-24_23-12-24_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_READINESS_KEY_EVIDENCE_CONSOLIDATION_EXECUTION_REPORT_2026-06-24_23-23-20_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_STATUS_HELPER_EXECUTION_REPORT_2026-06-24_23-37-44_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_STATUS_GATE_SUMMARY_EXECUTION_REPORT_2026-06-25_06-04-42_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_STATUS_READ_ONLY_DIAGNOSTIC_PRIORITY_EXECUTION_REPORT_2026-06-25_06-22-16_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_REFRESH_IF_NEEDED_ALIAS_EXECUTION_REPORT_2026-06-24_23-50-50_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_PROOF_REFRESH_KEY_ACK_GATE_EXECUTION_REPORT_2026-06-25_00-00-33_IST.md",
  "docs/plans/recall-sync/RECALL_LIVE_AUTH_PROBE_LOCAL_GATE_FIX_EXECUTION_REPORT_2026-06-25_00-11-33_IST.md",
  "docs/plans/recall-sync/RECALL_LIVE_AUTH_PROBE_KEY_ROTATION_CONTEXT_EXECUTION_REPORT_2026-06-25_02-03-04_IST.md",
  "docs/plans/recall-sync/RECALL_KEY_ROTATION_PRIVATE_EVIDENCE_RECORD_WORKFLOW_EXECUTION_REPORT_2026-06-25_00-27-10_IST.md",
  "docs/plans/recall-sync/RECALL_KEY_ROTATION_EVIDENCE_RECORDER_PROBE_CONTEXT_EXECUTION_REPORT_2026-06-25_02-09-45_IST.md",
  "docs/plans/recall-sync/RECALL_KEY_ROTATION_EVIDENCE_FILE_SECRET_GUARD_EXECUTION_REPORT_2026-06-25_02-15-09_IST.md",
  "docs/plans/recall-sync/RECALL_POST_ROTATION_PREPARE_TAINTED_EVIDENCE_GUARD_EXECUTION_REPORT_2026-06-25_02-20-28_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_LIVE_DIAGNOSTIC_WRAPPER_EXECUTION_REPORT_2026-06-25_02-27-19_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_LIVE_DIAGNOSTIC_ACTUAL_ENV_FILE_RUN_2026-06-25_04-58-40_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_ENV_FILE_LIVE_DIAGNOSTIC_PRIVATE_OUTPUT_EXECUTION_REPORT_2026-06-25_05-09-35_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_ENV_FILE_LIVE_DIAGNOSTIC_PRIVATE_OUTPUT_ACTUAL_RUN_2026-06-25_05-21-39_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_ENV_FILE_PRIMARY_LIVE_DIAGNOSTIC_ACTUAL_RUN_2026-06-25_06-32-32_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_STATUS_PRIVATE_DIAGNOSTIC_PROOF_SUMMARY_EXECUTION_REPORT_2026-06-25_06-40-46_IST.md",
  "docs/plans/recall-sync/RECALL_LIVE_DIAGNOSTIC_REPORT_CHECKER_EXECUTION_REPORT_2026-06-25_05-32-13_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_POST_ROTATION_PREPARE_PLAN_EXECUTION_REPORT_2026-06-25_05-46-24_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_POST_ROTATION_PREPARE_WRAPPER_EXECUTION_REPORT_2026-06-25_00-50-28_IST.md",
  "docs/plans/recall-sync/RECALL_CORE_APPLY_KEY_ROTATION_EVIDENCE_GATE_EXECUTION_REPORT_2026-06-25_01-18-04_IST.md",
  "docs/plans/recall-sync/RECALL_SCHEDULED_APPLY_CORE_KEY_EVIDENCE_PASS_THROUGH_EXECUTION_REPORT_2026-06-25_01-32-17_IST.md",
  "docs/plans/recall-sync/RECALL_KEY_ROTATION_ENV_FILE_ALIAS_EXECUTION_REPORT_2026-06-25_01-44-29_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_STATUS_LIVE_DIAGNOSTIC_SPLIT_EXECUTION_REPORT_2026-06-25_01-53-37_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_AND_PRODUCTION_DEPLOY_EXECUTION_REPORT_2026-06-26_23-50-00_IST.md",
  "docs/plans/recall-sync/RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md",
  "docs/plans/recall-sync/RECALL_SCHEDULER_ENABLEMENT_MANUAL_CLEAN_RUN_EVIDENCE_GUARD_EXECUTION_REPORT_2026-06-26_23-56-37_IST.md",
  "docs/plans/recall-sync/RECALL_SCHEDULER_ENABLEMENT_EVIDENCE_RECORDER_EXECUTION_REPORT_2026-06-27_00-07-12_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_WRAPPER_EXECUTION_REPORT_2026-06-27_00-14-29_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md",
  "docs/plans/recall-sync/RECALL_LIVE_DIAGNOSTIC_LOCAL_STATUS_FAILURE_BYPASS_EXECUTION_REPORT_2026-06-27_00-23-39_IST.md",
  "docs/plans/recall-sync/RECALL_LIVE_DIAGNOSTIC_LOCAL_STATUS_FAILURE_RELEASE_GATE_HARDENING_2026-06-27_00-31-34_IST.md",
  "docs/plans/recall-sync/RECALL_LIVE_DIAGNOSTIC_STATUS_HELPER_FAILURE_ACTUAL_RUN_2026-06-27_00-36-10_IST.md",
  "docs/plans/recall-sync/RECALL_COMPLETION_STATUS_SECOND_MANUAL_GATE_GUIDANCE_2026-06-27_00-45-20_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_READINESS_GATE_2026-06-27_00-56-03_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_READINESS_STATUS_GUIDANCE_ALIGNMENT_2026-06-27_01-01-12_IST.md",
  "docs/plans/recall-sync/RECALL_PUBLIC_DOCS_PRIVACY_CORPUS_SECOND_MANUAL_REPORTS_2026-06-27_01-06-52_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_STATUS_CONFIRMATION_ONLY_LIVE_DIAGNOSTIC_GUIDANCE_2026-06-27_01-20-56_IST.md",
  "docs/plans/recall-sync/RECALL_SCHEDULER_MANUAL_RUN_DISTINCTNESS_RECORDER_GUARD_2026-06-27_01-33-47_IST.md",
  "docs/plans/recall-sync/RECALL_COMPLETION_STATUS_COMPLETED_FIRST_APPLY_EVIDENCE_CLARITY_2026-06-27_01-40-24_IST.md",
  "docs/plans/recall-sync/RECALL_PRELIVE_NEXT_GATE_COMPLETION_STATUS_ALIGNMENT_2026-06-27_01-47-04_IST.md",
  "docs/plans/recall-sync/RECALL_PRELIVE_NEXT_GATE_STATIC_RELEASE_GUARD_2026-06-27_01-53-23_IST.md",
  "docs/plans/recall-sync/RECALL_FIRST_APPLY_STATUS_COMPLETED_GATE_RECONCILIATION_2026-06-27_02-08-29_IST.md",
  "docs/plans/recall-sync/RECALL_KEY_ROTATION_HANDOFF_COMPLETED_PHASE_ALIGNMENT_2026-06-27_02-17-05_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_WRAPPER_INTERNAL_READINESS_GATE_2026-06-27_02-24-37_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_COMMAND_BUILDER_2026-06-27_02-34-33_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_RUNTIME_PREFLIGHT_DEPLOY_ALIGNMENT_2026-06-27_02-48-21_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_RUNTIME_PREFLIGHT_PRODUCTION_SYNC_2026-06-27_02-56-32_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_REMOTE_RUNTIME_PREFLIGHT_VERIFIER_2026-06-27_03-06-02_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_PRODUCTION_APPLY_RUNNER_2026-06-27_03-14-39_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_PRODUCTION_COMMAND_HANDOFF_2026-06-27_03-56-03_IST.md",
  "docs/plans/recall-sync/RECALL_KEY_ROTATION_HANDOFF_SECOND_MANUAL_COMMAND_ALIGNMENT_2026-06-27_04-05-23_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_APPROVAL_CLASSIFICATION_HARDENING_2026-06-27_04-17-00_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_REMOTE_BUILT_COMMAND_ENV_2026-06-27_04-29-52_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_SYSTEM_ENV_OVERRIDE_GUARD_2026-06-27_04-39-22_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_PRODUCTION_WRAPPER_DRIFT_FIX_2026-06-27_04-52-13_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_KEY_ROTATION_PREFLIGHT_GUARD_2026-06-27_05-09-57_IST.md",
  "docs/plans/recall-sync/RECALL_PRODUCTION_SYSTEM_KEY_EVIDENCE_RECORDER_2026-06-27_05-26-09_IST.md",
  "docs/plans/recall-sync/RECALL_PRODUCTION_KEY_EVIDENCE_REPAIR_RUNNER_2026-06-27_05-46-16_IST.md",
  "docs/plans/recall-sync/RECALL_PRODUCTION_ENV_KEY_INSTALL_AND_LIVE_PROBE_FIX_2026-06-27_06-07-34_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_APPROVAL_READY_HANDOFF_2026-06-27_06-15-41_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_LOCAL_GATE_BYPASS_CURRENT_VERIFICATION_2026-06-27_06-24-42_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_APPLY_REPORT_CAPTURE_2026-06-27_06-33-33_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_OPERATOR_DOCS_CAPTURE_ALIGNMENT_2026-06-27_06-43-30_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_LOCAL_REPORT_DIR_PRIVACY_GUARD_2026-06-27_06-49-08_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_HANDOFF_LOCAL_REPORT_DIR_VISIBILITY_2026-06-27_06-54-33_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_HANDOFF_LOCAL_REPORT_DIR_SHORT_CIRCUIT_2026-06-27_06-58-50_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_PRE_APPLY_PROGRESS_CLARITY_2026-06-27_07-06-04_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_COMMAND_HANDOFF_PROGRESS_CLARITY_2026-06-27_07-13-20_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_APPROVAL_DOCS_HANDOFF_PROGRESS_ALIGNMENT_2026-06-27_07-19-10_IST.md",
  "docs/plans/recall-sync/RECALL_COMPLETION_STATUS_SECOND_MANUAL_PATH_CLARITY_2026-06-27_07-26-17_IST.md",
  "docs/plans/recall-sync/RECALL_PRELIVE_SECOND_MANUAL_PATH_SUMMARY_2026-06-27_07-31-38_IST.md",
  "docs/plans/recall-sync/RECALL_LOCAL_GATE_WORDING_RESIDUAL_CLEANUP_2026-06-27_07-36-56_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_LOCAL_GATE_RESOLUTION_CHECKER_2026-06-27_07-48-35_IST.md",
  "docs/plans/recall-sync/RECALL_COMPLETION_STATUS_ACTIVE_BLOCKED_REQUIREMENT_CLARITY_2026-06-27_07-56-49_IST.md",
  "docs/plans/recall-sync/RECALL_LOCAL_GATE_CHECKER_ACTIVE_REQUIREMENT_HARDENING_2026-06-27_08-04-47_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_READINESS_ACTIVE_REQUIREMENT_ALIGNMENT_2026-06-27_08-09-49_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_READINESS_SAFE_NEXT_COMMAND_ALIGNMENT_2026-06-27_08-16-02_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_LOCAL_GATE_CURRENT_EVIDENCE_REFRESH_2026-06-27_08-21-13_IST.md",
  "docs/plans/recall-sync/RECALL_DAILY_SYNC_GOAL_COMPLETION_AUDIT_2026-06-27_08-25-25_IST.md",
  "docs/plans/recall-sync/RECALL_GOAL_COMPLETION_AUDIT_CHECKER_2026-06-27_08-34-03_IST.md",
  "docs/plans/recall-sync/RECALL_CURRENT_GATE_CHECKER_2026-06-27_08-42-23_IST.md",
  "docs/plans/recall-sync/RECALL_COMPLETION_STATUS_CURRENT_GATE_ALIGNMENT_2026-06-27_09-03-01_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_NO_APPROVAL_PRODUCTION_RUNNER_PROOF_2026-06-27_09-17-39_IST.md",
  "docs/plans/recall-sync/RECALL_LOCAL_GATE_RESOLUTION_PROOF_PAIR_HARDENING_2026-06-27_09-23-12_IST.md",
  "docs/plans/recall-sync/RECALL_PRELIVE_LOCAL_GATE_RESOLUTION_SUMMARY_2026-06-27_09-31-13_IST.md",
  "docs/plans/recall-sync/RECALL_GOAL_AUDIT_PRELIVE_LOCAL_GATE_ALIGNMENT_2026-06-27_09-38-47_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_APPROVAL_PACKET_PRELIVE_LOCAL_GATE_ALIGNMENT_2026-06-27_09-43-46_IST.md",
  "docs/plans/recall-sync/RECALL_CURRENT_GATE_SAFE_NEXT_PRELIVE_HANDOFF_ALIGNMENT_2026-06-27_09-50-34_IST.md",
  "docs/plans/recall-sync/RECALL_COMPLETION_STATUS_REQUIREDBEFOREAPPLY_ALIGNMENT_2026-06-27_09-55-55_IST.md",
  "docs/plans/recall-sync/RECALL_STALE_FIRST_APPLY_APPROVAL_SECOND_MANUAL_GATE_RECHECK_2026-06-27_10-09-24_IST.md",
  "docs/plans/recall-sync/RECALL_STALE_FIRST_APPLY_APPROVAL_CHECKER_AUTOMATION_2026-06-27_10-19-02_IST.md",
  "docs/plans/recall-sync/RECALL_GOAL_AUDIT_STALE_FIRST_APPLY_PRELIVE_ALIGNMENT_2026-06-27_10-28-06_IST.md",
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_PRODUCTION_VERIFICATION_APPLY_2026-06-27_10-46-05_IST.md",
];

const SECRET_PATTERNS = [
  {
    name: "recall_api_key_assignment",
    pattern:
      /\bRECALL_API_KEY\s*=\s*(?!<redacted|<stored|<paste|<local|<empty|<RECALL_API_KEY>|sk_\.\.\.)[^\s"'<>]+/i,
  },
  {
    name: "authorization_bearer",
    pattern: /\bAuthorization\s*:\s*Bearer\s+(?!<redacted:token>|<key>|<RECALL_API_KEY>|\$\{)[^\s"'<>]+/i,
  },
  {
    name: "bare_bearer_token",
    pattern: /\bBearer\s+(?!<redacted:token>|<key>|<RECALL_API_KEY>|\$\{)[A-Za-z0-9._-]{12,}/i,
  },
  {
    name: "sk_secret",
    pattern: /\bsk_[A-Za-z0-9._-]{12,}\b/i,
  },
  {
    name: "cookie_header",
    pattern: /\bCookie\s*:\s*(?!<redacted:cookie>)[^\s]/i,
  },
  {
    name: "signed_or_tokenized_query",
    pattern:
      /[?&](?:access_token|api_key|apikey|key|refresh_token|signature|sig|token|x-amz-credential|x-amz-security-token|x-amz-signature)=(?!<redacted>)[^&#\s"')]+/i,
  },
];

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const { targets, findings: targetFindings, scope } = collectTargets(args.paths);
const findings = [...targetFindings];

for (const filePath of targets) {
  const text = readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const secret of SECRET_PATTERNS) {
      if (secret.pattern.test(line)) {
        findings.push({
          file: filePath,
          line: index + 1,
          rule: secret.name,
          preview: preview(line),
        });
      }
    }
  });
}

if (targets.length === 0 && args.requireFiles) {
  findings.push({
    file: null,
    line: null,
    rule: "no_doc_files_found",
    preview: "No Markdown files matched the Recall public-docs privacy scan scope.",
  });
}

if (findings.length > 0) {
  console.error("[check:recall-public-docs-privacy] failed");
  console.error(
    JSON.stringify(
      {
        ok: false,
        scannedFiles: targets.length,
        requireFiles: args.requireFiles,
        scope,
        findings,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      scannedFiles: targets.length,
      requireFiles: args.requireFiles,
      scope,
      currentDocsRequired: args.paths.length === 0,
    },
    null,
    2,
  ),
);

function parseArgs(argv) {
  const parsed = {
    paths: [],
    requireFiles: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help") {
      parsed.help = true;
    } else if (arg === "--require-files") {
      parsed.requireFiles = true;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    } else {
      parsed.paths.push(arg);
    }
  }

  return parsed;
}

function collectTargets(paths) {
  const explicitMode = paths.length > 0;
  if (!explicitMode) {
    const findings = [];
    const targets = [];
    for (const currentDocPath of CURRENT_DOC_PATHS) {
      const resolved = resolve(currentDocPath);
      if (!existsSync(resolved)) {
        findings.push({
          file: resolved,
          line: null,
          rule: "missing_current_doc",
          preview: "Current Recall approval/runbook document is missing from the curated privacy scan.",
        });
        continue;
      }
      if (!statSync(resolved).isFile()) {
        findings.push({
          file: resolved,
          line: null,
          rule: "current_doc_not_file",
          preview: "Current Recall approval/runbook path is not a file.",
        });
        continue;
      }
      targets.push(resolved);
    }
    return {
      targets: targets.sort(),
      findings,
    scope:
      "current Recall approval, handoff, runbook, audit, tracker, option, privacy, apply, deploy, scheduler, live-diagnostic, and second-manual evidence docs",
    };
  }

  const files = new Set();
  const findings = [];
  for (const root of paths) {
    const resolved = resolve(root);
    if (!existsSync(resolved)) {
      findings.push({
        file: resolved,
        line: null,
        rule: "missing_explicit_path",
        preview: "Explicit Recall public-docs privacy scan path is missing.",
      });
      continue;
    }
    const stat = statSync(resolved);
    if (stat.isDirectory()) {
      for (const filePath of walk(resolved)) {
        if (isMarkdown(filePath)) files.add(filePath);
      }
    } else if (stat.isFile()) {
      files.add(resolved);
    }
  }

  return {
    targets: Array.from(files).sort(),
    findings,
    scope: "explicit files/directories",
  };
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function isMarkdown(filePath) {
  return filePath.toLowerCase().endsWith(".md");
}

function preview(line) {
  const redacted = redactPreview(line);
  return redacted.length > 180 ? `${redacted.slice(0, 177)}...` : redacted;
}

function redactPreview(line) {
  return line
    .replace(
      /\b(RECALL_API_KEY\s*=\s*)(?!<redacted|<stored|<paste|<local|<empty|<RECALL_API_KEY>|sk_\.\.\.)[^\s"'<>]+/gi,
      "$1<redacted:recall_api_key>",
    )
    .replace(
      /\b(Authorization\s*:\s*Bearer\s+)(?!<redacted:token>|<key>|<RECALL_API_KEY>|\$\{)[^\s"'<>]+/gi,
      "$1<redacted:token>",
    )
    .replace(
      /\b(Bearer\s+)(?!<redacted:token>|<key>|<RECALL_API_KEY>|\$\{)[A-Za-z0-9._-]{12,}/gi,
      "$1<redacted:token>",
    )
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/gi, "sk_<redacted>")
    .replace(/\b(Cookie\s*:\s*)(?!<redacted:cookie>)[^\s]+/gi, "$1<redacted:cookie>")
    .replace(
      /([?&](?:access_token|api_key|apikey|key|refresh_token|signature|sig|token|x-amz-credential|x-amz-security-token|x-amz-signature)=)(?!<redacted>)[^&#\s"')]+/gi,
      "$1<redacted>",
    );
}

function printHelp() {
  console.log(`Recall current public-docs privacy scan

Usage:
  npm run check:recall-public-docs-privacy
  node scripts/check-recall-public-docs-privacy.mjs <file-or-directory> [...]
  node scripts/check-recall-public-docs-privacy.mjs --require-files <file-or-directory> [...]

Default scope:
  Current Recall live approval checklist, compact handoff, operating packet,
  production runbook, completion audit, project tracker, final options V3,
  latest manifest privacy file-safety report, this public-doc privacy execution
  report, live API approval readiness, first apply/deploy evidence,
  scheduler-evidence handoff, live diagnostic evidence, and second-manual
  readiness and approval guidance.

The default scope fails closed if any curated current document is missing. The
check catches obvious public-document leaks such as raw RECALL_API_KEY values,
bearer tokens, sk_* secrets, cookies, and signed/tokenized URL query values.
Failure previews are redacted before output.
`);
}
