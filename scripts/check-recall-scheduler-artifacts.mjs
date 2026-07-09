#!/usr/bin/env node
import { readFileSync } from "node:fs";

const files = {
  service: read("scripts/deploy/brain-recall-sync.service"),
  timer: read("scripts/deploy/brain-recall-sync.timer"),
  wrapper: read("scripts/recall-scheduled-apply.sh"),
  deploy: read("scripts/deploy.sh"),
  prelive: read("scripts/check-recall-prelive-readiness.mjs"),
  packageJson: read("package.json"),
  cliBundleSmoke: read("scripts/smoke-recall-cli-bundle.mjs"),
  schedulerWrapperSmoke: read("scripts/smoke-recall-scheduled-wrapper.mjs"),
  manualVerificationWrapper: read("scripts/recall-second-manual-verification-apply.sh"),
  manualVerificationWrapperSmoke: read("scripts/smoke-recall-manual-verification-apply.mjs"),
  secondManualReadiness: read("scripts/check-recall-second-manual-verification-readiness.mjs"),
  secondManualReadinessSmoke: read("scripts/smoke-recall-second-manual-verification-readiness.mjs"),
  secondManualCommand: read("scripts/print-recall-second-manual-verification-command.mjs"),
  secondManualCommandSmoke: read("scripts/smoke-recall-second-manual-command.mjs"),
  secondManualRuntimePreflight: read("scripts/check-recall-second-manual-runtime-preflight.mjs"),
  secondManualRuntimePreflightSmoke: read("scripts/smoke-recall-second-manual-runtime-preflight.mjs"),
  secondManualRemoteRuntimePreflight: read("scripts/check-recall-second-manual-remote-runtime-preflight.mjs"),
  secondManualRemoteRuntimePreflightSmoke: read("scripts/smoke-recall-second-manual-remote-runtime-preflight.mjs"),
  secondManualProductionCommand: read("scripts/print-recall-second-manual-production-apply-command.mjs"),
  secondManualProductionCommandSmoke: read("scripts/smoke-recall-second-manual-production-command.mjs"),
  secondManualProductionApply: read("scripts/run-recall-second-manual-production-apply.mjs"),
  secondManualProductionApplySmoke: read("scripts/smoke-recall-second-manual-production-apply.mjs"),
  secondManualLocalGateResolution: read("scripts/check-recall-second-manual-local-gate-resolution.mjs"),
  secondManualLocalGateResolutionSmoke: read("scripts/smoke-recall-second-manual-local-gate-resolution.mjs"),
  schedulerEnableEvidenceRecorder: read("scripts/record-recall-scheduler-enable-evidence.mjs"),
  schedulerEnableEvidenceRecorderSmoke: read("scripts/smoke-recall-scheduler-enable-evidence-record.mjs"),
  schedulerEnableCommand: read("scripts/print-recall-scheduler-enable-command.mjs"),
  schedulerEnableCommandSmoke: read("scripts/smoke-recall-scheduler-enable-command.mjs"),
  schedulerEvidenceCommand: read("scripts/print-recall-scheduler-evidence-command.mjs"),
  schedulerEvidenceCommandSmoke: read("scripts/smoke-recall-scheduler-evidence-command.mjs"),
  dailySyncCompletionStatus: read("scripts/check-recall-daily-sync-completion-status.mjs"),
  dailySyncCompletionStatusSmoke: read("scripts/smoke-recall-daily-sync-completion-status.mjs"),
  goalCompletionAudit: read("scripts/check-recall-goal-completion-audit.mjs"),
  goalCompletionAuditSmoke: read("scripts/smoke-recall-goal-completion-audit.mjs"),
  currentGate: read("scripts/check-recall-current-gate.mjs"),
  currentGateSmoke: read("scripts/smoke-recall-current-gate.mjs"),
  schedulerApprovalPacket: read(
    "docs/plans/recall-sync/RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md",
  ),
  approvalPacketChecker: read("scripts/check-recall-approval-packet.mjs"),
  keyRotationHandoff: read("scripts/print-recall-key-rotation-handoff.mjs"),
  keyRotationHandoffSmoke: read("scripts/smoke-recall-key-rotation-handoff.mjs"),
  keyRotationEvidenceRecorder: read("scripts/record-recall-key-rotation-evidence.mjs"),
  keyRotationEvidenceRecorderSmoke: read("scripts/smoke-recall-key-rotation-evidence-record.mjs"),
  productionKeyEvidenceCommand: read("scripts/print-recall-production-key-evidence-repair-command.mjs"),
  productionKeyEvidenceRepair: read("scripts/run-recall-production-key-evidence-repair.mjs"),
  productionKeyEvidenceRepairSmoke: read("scripts/smoke-recall-production-key-evidence-repair.mjs"),
  productionEnvKeyInstall: read("scripts/run-recall-production-env-key-install.mjs"),
  productionEnvKeyInstallSmoke: read("scripts/smoke-recall-production-env-key-install.mjs"),
  liveAuthProbe: read("scripts/run-recall-live-auth-probe.mjs"),
  firstApplyLiveDiagnosticSmoke: read("scripts/smoke-recall-first-apply-live-diagnostic.mjs"),
  syncCli: read("scripts/sync-recall.ts"),
};

assertIncludes(
  files.packageJson,
  '"recall:daily-sync:completion-status"',
  "package scripts must expose the no-live completion-status command",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-daily-sync-completion-status"',
  "package scripts must expose the completion-status smoke",
);
assertIncludes(
  files.packageJson,
  '"check:recall-goal-completion-audit"',
  "package scripts must expose the goal completion audit checker",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-goal-completion-audit"',
  "package scripts must expose the goal completion audit smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:current-gate"',
  "package scripts must expose the consolidated current-gate checker",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-current-gate"',
  "package scripts must expose the current-gate smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:key-rotation:handoff"',
  "package scripts must expose the no-live key-rotation handoff command",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-key-rotation-handoff"',
  "package scripts must expose the key-rotation handoff smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:key-rotation:write-env"',
  "package scripts must expose the private rotated-key env writer",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-key-rotation-env-writer"',
  "package scripts must expose the private rotated-key env writer smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:key-rotation-evidence:record"',
  "package scripts must expose the key rotation evidence recorder",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-key-rotation-evidence-record"',
  "package scripts must expose the key rotation evidence recorder smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:production-key-evidence:command"',
  "package scripts must expose the production key-evidence repair command handoff",
);
assertIncludes(
  files.packageJson,
  '"recall:production-key-evidence:repair"',
  "package scripts must expose the guarded production key-evidence repair runner",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-production-key-evidence-repair"',
  "package scripts must expose the production key-evidence repair smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:production-env-key:install"',
  "package scripts must expose the guarded production Recall key installer",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-production-env-key-install"',
  "package scripts must expose the production Recall key installer smoke",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-first-apply-prepare-after-rotation"',
  "package scripts must expose the post-rotation prepare smoke",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-first-apply-live-diagnostic"',
  "package scripts must expose the first-apply live diagnostic smoke",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-first-apply-live-diagnostic-prompt-guard"',
  "package scripts must expose the first-apply live diagnostic prompt guard smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:scheduler-enable-evidence:record"',
  "package scripts must expose the scheduler enablement evidence recorder",
);
assertIncludes(
  files.packageJson,
  '"recall:scheduler-enable:command"',
  "package scripts must expose the no-live scheduler enablement command handoff",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-scheduler-enable-command"',
  "package scripts must expose the scheduler enablement command handoff smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:scheduler-evidence:command"',
  "package scripts must expose the scheduler first-run evidence command handoff",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-scheduler-evidence-command"',
  "package scripts must expose the scheduler first-run evidence command handoff smoke",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-scheduler-enable-evidence-record"',
  "package scripts must expose the scheduler enablement evidence recorder smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:manual-verification-apply"',
  "package scripts must expose the second manual verification apply wrapper",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-manual-verification-apply"',
  "package scripts must expose the second manual verification apply smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:second-manual:readiness"',
  "package scripts must expose the second manual verification readiness command",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-second-manual-readiness"',
  "package scripts must expose the second manual verification readiness smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:second-manual:command"',
  "package scripts must expose the second manual verification command builder",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-second-manual-command"',
  "package scripts must expose the second manual verification command builder smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:second-manual:runtime-preflight"',
  "package scripts must expose the second manual production runtime preflight command",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-second-manual-runtime-preflight"',
  "package scripts must expose the second manual production runtime preflight smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:second-manual:remote-runtime-preflight"',
  "package scripts must expose the second manual remote runtime preflight command",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-second-manual-remote-runtime-preflight"',
  "package scripts must expose the second manual remote runtime preflight smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:second-manual:production-command"',
  "package scripts must expose the second manual production command handoff",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-second-manual-production-command"',
  "package scripts must expose the second manual production command handoff smoke",
);
assertIncludes(
  files.packageJson,
  '"recall:second-manual:production-apply"',
  "package scripts must expose the guarded second manual production apply runner",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-second-manual-production-apply"',
  "package scripts must expose the guarded production apply runner smoke",
);
assertIncludes(
  files.packageJson,
  '"check:recall-second-manual-local-gate-resolution"',
  "package scripts must expose the second manual local-gate resolution checker",
);
assertIncludes(
  files.packageJson,
  '"smoke:recall-second-manual-local-gate-resolution"',
  "package scripts must expose the second manual local-gate resolution checker smoke",
);

assertIncludes(files.service, "Type=oneshot", "service must be oneshot");
assertIncludes(files.service, "User=brain", "service must run as brain");
assertIncludes(files.service, "ExecStart=/usr/bin/bash /opt/brain/scripts/recall-scheduled-apply.sh", "service must call wrapper through bash");
assertIncludes(files.service, "ReadWritePaths=/opt/brain/data", "service write scope must be data-only");

assertIncludes(files.timer, "Unit=brain-recall-sync.service", "timer must target Recall service");
assertIncludes(files.timer, "OnCalendar=*-*-* 20:00:00 UTC", "timer must use documented 01:30 IST equivalent");

assertIncludes(files.wrapper, 'BRAIN_RECALL_SYNC_ENABLED:-0', "wrapper must require sync enable flag");
assertIncludes(files.wrapper, 'BRAIN_RECALL_SCHEDULER_ENABLED:-0', "wrapper must require scheduler enable flag");
assertIncludes(files.wrapper, "BRAIN_RECALL_CONFIRM_LIVE_API", "wrapper must require explicit live API confirmation for live mode");
assertIncludes(
  files.wrapper,
  "manual_env_override_keys",
  "wrapper must preserve approved manual verification env overrides across system env sourcing",
);
assertIncludes(
  files.wrapper,
  "BRAIN_RECALL_SYSTEM_ENV_FILE",
  "wrapper must allow smoke-safe system env file substitution",
);
assertIncludes(
  files.wrapper,
  "manual_verification_mode_before_env",
  "wrapper must detect manual verification mode before sourcing system env defaults",
);
assertIncludes(
  files.wrapper,
  "check-recall-key-rotation-evidence.mjs",
  "wrapper must verify key rotation evidence before scheduled live work",
);
assertIncludes(
  files.wrapper,
  "BRAIN_RECALL_KEY_ROTATION_ENV_FILE",
  "wrapper must prefer the production key rotation env-file configuration",
);
assertIncludes(
  files.wrapper,
  "BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE",
  "wrapper must keep the legacy production key rotation env-file fallback",
);
assertIncludes(files.wrapper, "--system-env-file", "wrapper must use system env file mode for scheduled key evidence");
assertIncludes(files.wrapper, "--require-key-rotation-evidence", "wrapper must pass key rotation evidence proof into scheduled apply");
assertIncludes(files.wrapper, "--key-rotation-env-file", "wrapper must pass the configured production key evidence env file into scheduled apply");
assertIncludes(files.wrapper, "--key-rotation-system-env-file", "wrapper must pass system env-file mode into scheduled apply");
assertIncludes(
  files.wrapper,
  '${key_rotation_apply_args[@]+"${key_rotation_apply_args[@]}"}',
  "wrapper must safely expand empty key rotation apply args",
);
assertIncludes(
  files.wrapper,
  "BRAIN_RECALL_REQUIRE_KEY_ROTATION_EVIDENCE=1",
  "wrapper must require core key evidence proof for scheduled apply",
);
assertIncludes(files.wrapper, "recall-first-apply-preflight.mjs", "wrapper must create backup proof before apply");
assertIncludes(files.wrapper, "scheduled-dry-run-", "wrapper must write a scheduled dry-run report before apply");
assertIncludes(files.wrapper, "check-recall-dry-run-report.mjs", "wrapper must validate dry-run report before apply");
assertIncludes(files.wrapper, "check-recall-apply-report.mjs", "wrapper must validate apply report after apply");
assertIncludes(files.wrapper, "--confirm-live-api", "wrapper must pass explicit live API confirmation to bundled CLI");
assertIncludes(files.wrapper, "--require-dry-run-proof", "wrapper must enforce dry-run proof");
assertIncludes(files.wrapper, "--dry-run-report-path", "wrapper must pass dry-run report proof to apply");
assertIncludes(files.wrapper, "BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=1", "wrapper must set dry-run proof env for apply");
assertIncludes(files.wrapper, "--require-backup-proof", "wrapper must enforce backup proof");
assertIncludes(
  files.wrapper,
  "BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF",
  "wrapper must honor live spike report proof requirement",
);
assertIncludes(
  files.wrapper,
  "BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH",
  "wrapper must require SPIKE-013 report path when live spike proof is enabled",
);
assertIncludes(
  files.wrapper,
  "BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH",
  "wrapper must require SPIKE-014 report path when live spike proof is enabled",
);
assertIncludes(
  files.wrapper,
  "BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH",
  "wrapper must pass optional controlled-sample manifest to live spike proof checker",
);
assertIncludes(files.wrapper, "--require-live-spike-report-proof", "wrapper must enforce accepted live spike reports");
assertIncludes(files.wrapper, "--live-spike-enumeration-report-path", "wrapper must pass SPIKE-013 proof to CLI");
assertIncludes(files.wrapper, "--live-spike-fidelity-report-path", "wrapper must pass SPIKE-014 proof to CLI");
assertIncludes(files.wrapper, "--live-spike-manifest-path", "wrapper must pass manifest proof to CLI when configured");
assertIncludes(files.wrapper, '${policy_args[@]+"${policy_args[@]}"}', "wrapper must safely expand empty policy args");
assertIncludes(files.wrapper, '${validator_args[@]+"${validator_args[@]}"}', "wrapper must safely expand empty validator args");
assertIncludes(files.wrapper, "sync-recall-prod.mjs", "wrapper must call bundled CLI");

assertIncludes(files.deploy, "brain-recall-sync.service", "deploy must copy/install service");
assertIncludes(files.deploy, "brain-recall-sync.timer", "deploy must copy/install timer");
assertIncludes(
  files.deploy,
  "BRAIN_RECALL_ALLOW_EXISTING_TIMER",
  "deploy must require explicit override if Recall timer already exists enabled/active",
);
assertIncludes(
  files.deploy,
  "systemctl is-enabled --quiet brain-recall-sync.timer",
  "deploy must fail when Recall timer is already enabled",
);
assertIncludes(
  files.deploy,
  "systemctl is-active --quiet brain-recall-sync.timer",
  "deploy must fail when Recall timer is already active",
);
assertIncludes(
  files.deploy,
  "BRAIN_RECALL_ALLOW_ENABLED_FLAGS",
  "deploy must require explicit override if Recall env enable flags are already set",
);
assertIncludes(
  files.deploy,
  "remote_recall_key_rotation_evidence_preflight",
  "deploy must run remote key rotation evidence preflight for Recall override windows",
);
assertIncludes(
  files.deploy,
  "BRAIN_RECALL_KEY_ROTATION_ENV_FILE",
  "deploy must prefer remote key rotation env-file configuration",
);
assertIncludes(
  files.deploy,
  "BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE",
  "deploy must keep the legacy remote key rotation env-file fallback",
);
assertIncludes(
  files.deploy,
  "BRAIN_RECALL_KEY_ROTATED_AFTER_ISO",
  "deploy must use the key rotation checkpoint for remote key evidence",
);
assertIncludes(
  files.deploy,
  "Recall key rotation evidence file predates the required checkpoint",
  "deploy must reject stale remote key rotation evidence",
);
assertIncludes(
  files.deploy,
  "remote Recall key rotation evidence must pass when Recall deploy overrides are used",
  "deploy must fail closed on remote key evidence failure",
);
assertIncludes(
  files.deploy,
  "BRAIN_RECALL_SYNC_ENABLED BRAIN_RECALL_SCHEDULER_ENABLED BRAIN_RECALL_CONFIRM_LIVE_API",
  "deploy must check all remote Recall enable flags",
);
assertIncludes(files.deploy, "grep -Eq", "deploy must use a robust env assignment matcher");
assertIncludes(
  files.deploy,
  "export[[:space:]]+",
  "deploy must catch exported remote Recall enable flags",
);
assertIncludes(files.deploy, "check-recall-key-rotation-evidence.mjs", "deploy must copy key rotation evidence checker");
assertIncludes(files.deploy, "check-recall-live-spike-reports.mjs", "deploy must copy live spike report checker");
assertIncludes(files.deploy, "check-recall-public-privacy.mjs", "deploy must copy live spike privacy checker");
assertIncludes(
  files.deploy,
  "check-recall-public-manifest-privacy.mjs",
  "deploy must copy manifest-aware live spike privacy checker",
);
assertIncludes(files.deploy, "scripts/lib", "deploy must create the scripts/lib helper directory");
assertIncludes(
  files.deploy,
  "recall-controlled-samples.mjs",
  "deploy must copy manifest helper required by manifest-aware privacy checker",
);
assertIncludes(files.deploy, "smoke:recall-live-spikes", "deploy must smoke live spike report generation");
assertIncludes(
  files.deploy,
  "smoke:recall-public-docs-privacy",
  "deploy must smoke current public approval/runbook docs privacy scanner",
);
assertIncludes(
  files.deploy,
  "check:recall-public-docs-privacy",
  "deploy must scan current public approval/runbook docs for obvious secret leaks",
);
assertIncludes(
  files.deploy,
  "smoke:recall-key-rotation-env-writer",
  "deploy must smoke private rotated-key env writer before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-key-rotation-handoff",
  "deploy must smoke key-rotation handoff before production deployment",
);
assertIncludes(
  files.deploy,
  "recall:key-rotation:handoff",
  "deploy must print no-live key-rotation handoff before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-first-apply-prepare-after-rotation",
  "deploy must smoke post-rotation prepare before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-first-apply-live-diagnostic",
  "deploy must smoke first-apply read-only live diagnostic before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-first-apply-live-diagnostic-prompt-guard",
  "deploy must smoke first-apply live diagnostic prompt guard before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-scheduler-wrapper",
  "deploy must smoke scheduled Recall wrapper before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-manual-verification-apply",
  "deploy must smoke second manual verification wrapper before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-second-manual-readiness",
  "deploy must smoke second manual verification readiness before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-second-manual-command",
  "deploy must smoke second manual verification command builder before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-second-manual-runtime-preflight",
  "deploy must smoke second manual production runtime preflight before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-second-manual-remote-runtime-preflight",
  "deploy must smoke second manual remote runtime preflight verifier before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-production-key-evidence-repair",
  "deploy must smoke production key-evidence repair before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-production-env-key-install",
  "deploy must smoke production Recall key install before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-second-manual-production-apply",
  "deploy must smoke the guarded second manual production apply runner before production deployment",
);
assertIncludes(
  files.deploy,
  "recall-second-manual-verification-apply.sh",
  "deploy must copy second manual verification wrapper to production scripts",
);
assertIncludes(
  files.deploy,
  "check-recall-second-manual-runtime-preflight.mjs",
  "deploy must copy second manual production runtime preflight to production scripts",
);
assertIncludes(
  files.deploy,
  "check-recall-apply-report.mjs",
  "deploy must copy post-apply report checker used by the scheduled wrapper",
);
assertIncludes(
  files.deploy,
  "docs/plans/spikes",
  "deploy must create the public SPIKE proof report directory on production",
);
assertIncludes(
  files.deploy,
  "SPIKE-013-recall-rest-enumeration-*.md",
  "deploy must copy public SPIKE-013 proof reports to production",
);
assertIncludes(
  files.deploy,
  "SPIKE-014-recall-content-fidelity-*.md",
  "deploy must copy public SPIKE-014 proof reports to production",
);
assertIncludes(
  files.deploy,
  "smoke:recall-daily-sync-completion-status",
  "deploy must smoke whole-goal completion status before production deployment",
);
assertIncludes(
  files.deploy,
  "recall:daily-sync:completion-status",
  "deploy must print whole-goal Recall completion status before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-scheduler-enable-evidence-record",
  "deploy must smoke scheduler enablement evidence recorder before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-scheduler-enable-command",
  "deploy must smoke scheduler enablement command handoff before production deployment",
);
assertIncludes(
  files.deploy,
  "smoke:recall-scheduler-evidence-command",
  "deploy must smoke scheduler first-run evidence command handoff before production deployment",
);
assertIncludes(
  files.prelive,
  "smoke:recall-daily-sync-completion-status",
  "pre-live readiness must smoke whole-goal completion status",
);
assertIncludes(
  files.prelive,
  "recall:daily-sync:completion-status",
  "pre-live readiness must report whole-goal completion status",
);
assertIncludes(
  files.prelive,
  "smoke:recall-scheduler-enable-command",
  "pre-live readiness must smoke scheduler enablement command handoff",
);
assertIncludes(
  files.prelive,
  "smoke:recall-scheduler-evidence-command",
  "pre-live readiness must smoke scheduler first-run evidence command handoff",
);
assertIncludes(
  files.prelive,
  "smoke:recall-manual-verification-apply",
  "pre-live readiness must smoke second manual verification wrapper",
);
assertIncludes(
  files.prelive,
  "smoke:recall-second-manual-readiness",
  "pre-live readiness must smoke second manual verification readiness",
);
assertIncludes(
  files.prelive,
  "smoke:recall-second-manual-command",
  "pre-live readiness must smoke second manual verification command builder",
);
assertIncludes(
  files.prelive,
  "smoke:recall-second-manual-runtime-preflight",
  "pre-live readiness must smoke second manual production runtime preflight",
);
assertIncludes(
  files.prelive,
  "smoke:recall-second-manual-remote-runtime-preflight",
  "pre-live readiness must smoke second manual remote runtime preflight verifier",
);
assertIncludes(
  files.prelive,
  "smoke:recall-second-manual-production-command",
  "pre-live readiness must smoke the second manual production command handoff",
);
assertIncludes(
  files.prelive,
  "smoke:recall-second-manual-production-apply",
  "pre-live readiness must smoke the guarded second manual production apply runner",
);
assertIncludes(
  files.prelive,
  "smoke:recall-second-manual-local-gate-resolution",
  "pre-live readiness must smoke the second manual local-gate resolution checker",
);
assertIncludes(
  files.prelive,
  "check:recall-second-manual-local-gate-resolution",
  "pre-live readiness must run the real second manual local-gate resolution checker",
);
assertIncludes(
  files.prelive,
  "localGateResolutionSummary",
  "pre-live readiness must summarize real local-gate resolution evidence",
);
assertIncludes(
  files.prelive,
  "smoke:recall-production-key-evidence-repair",
  "pre-live readiness must smoke production key-evidence repair",
);
assertIncludes(
  files.prelive,
  "smoke:recall-production-env-key-install",
  "pre-live readiness must smoke production Recall key install",
);
assertIncludes(
  files.prelive,
  "statusSummary",
  "pre-live readiness must expose a sanitized completion-status summary",
);
assertIncludes(
  files.prelive,
  "currentProductionGate",
  "pre-live readiness nextGate must surface the current production gate",
);
assertIncludes(
  files.prelive,
  "localGateResolution",
  "pre-live readiness nextGate must surface local-gate resolution evidence",
);
assertIncludes(
  files.prelive,
  "selectedMatchesRemoteLatest",
  "pre-live readiness local-gate summary must preserve selected proof-pair freshness",
);
assertIncludes(
  files.prelive,
  "staleFirstApplyApprovalProgress",
  "pre-live readiness local-gate summary must preserve stale first-apply approval proof",
);
assertIncludes(
  files.prelive,
  "localPrivateGatesSkippedForProductionPath",
  "pre-live readiness local-gate summary must preserve local-gate bypass proof",
);
assertIncludes(
  files.approvalPacketChecker,
  "npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json",
  "approval packet checker must require manifest-enforced pre-live before second-manual apply",
);
assertIncludes(
  files.approvalPacketChecker,
  "nextGate.localGateResolution.preApplyProgress.deployedLatestReports.selectedMatchesRemoteLatest: true",
  "approval packet checker must require pre-live latest deployed proof-pair evidence",
);
assertIncludes(
  files.approvalPacketChecker,
  "Do not run the live command if broad pre-live no longer carries this proof",
  "approval packet checker must require stop guidance for missing pre-live local-gate proof",
);
assertIncludes(
  files.prelive,
  "manualCleanRunReadiness",
  "pre-live readiness nextGate must include manual clean-run readiness",
);
assertIncludes(
  files.prelive,
  "summarizeSecondManualVerificationPath",
  "pre-live readiness must sanitize and expose the second-manual path summary",
);
assertIncludes(
  files.prelive,
  "secondManualVerificationPath",
  "pre-live readiness currentProductionGate must include second-manual handoff path details",
);
assertIncludes(
  files.prelive,
  "readyCurrentGateMustShow",
  "pre-live readiness currentProductionGate must preserve current-gate proof fields",
);
assertIncludes(
  files.prelive,
  "firstApplyApprovalPresent",
  "pre-live readiness currentProductionGate must preserve stale first-apply approval status",
);
assertIncludes(
  files.prelive,
  "readyHandoffMustShow",
  "pre-live readiness must expose the ready handoff proof fields",
);
assertIncludes(
  files.prelive,
  "localPrivateGatesAreNotThePlannedProductionGate",
  "pre-live readiness must carry local-private-gates-not-blocking guidance",
);
assertIncludes(
  files.prelive,
  "handoffProgress.stoppedAt=ready_for_exact_approval",
  "pre-live fallback next action must require exact ready-handoff progress",
);
assertIncludes(
  files.prelive,
  "handoffProgress.localGateStatus=not_blocking_production_path",
  "pre-live fallback next action must require local private gates not blocking",
);
assertIncludes(
  files.prelive,
  "Pre-live is no-live/no-write. It does not approve live writes, scheduler enablement, or checkpoint movement.",
  "pre-live readiness nextGate must keep the no-write safety note",
);
assertIncludes(
  files.prelive,
  "smoke:recall-scheduler-enable-evidence-record",
  "pre-live readiness must smoke scheduler enablement evidence recorder",
);
assertIncludes(
  files.prelive,
  "smoke:recall-key-rotation-env-writer",
  "pre-live readiness must smoke private rotated-key env writer",
);
assertIncludes(
  files.prelive,
  "smoke:recall-key-rotation-handoff",
  "pre-live readiness must smoke key-rotation handoff output",
);
assertIncludes(
  files.prelive,
  "recall:key-rotation:handoff",
  "pre-live readiness must report key-rotation handoff status",
);
assertIncludes(
  files.prelive,
  "smoke:recall-first-apply-prepare-after-rotation",
  "pre-live readiness must smoke post-rotation prepare",
);
assertIncludes(
  files.prelive,
  "smoke:recall-first-apply-live-diagnostic",
  "pre-live readiness must smoke first-apply read-only live diagnostic",
);
assertIncludes(
  files.prelive,
  "smoke:recall-first-apply-live-diagnostic-prompt-guard",
  "pre-live readiness must smoke first-apply live diagnostic prompt guard",
);
assertIncludes(
  files.firstApplyLiveDiagnosticSmoke,
  "local status helper fails",
  "first-apply live diagnostic smoke must cover local status-helper failure before the read-only probe",
);
assertIncludes(
  files.firstApplyLiveDiagnosticSmoke,
  "failureBypassedForReadOnlyProbe",
  "first-apply live diagnostic smoke must assert the read-only-only bypass metadata",
);
assertIncludes(
  files.cliBundleSmoke,
  'join(tmp, "scripts/sync-recall-prod.mjs")',
  "bundled CLI smoke must mirror production scripts/ CLI path",
);
assertIncludes(
  files.cliBundleSmoke,
  'join(tmp, "scripts/db")',
  "bundled CLI smoke must mirror production scripts/db migration path",
);
assertIncludes(
  files.cliBundleSmoke,
  "check-recall-public-manifest-privacy.mjs",
  "bundled CLI smoke must package manifest-aware privacy checker",
);
assertIncludes(
  files.cliBundleSmoke,
  "scripts/lib/recall-controlled-samples.mjs",
  "bundled CLI smoke must package manifest helper",
);
assertIncludes(
  files.cliBundleSmoke,
  "--manifest",
  "bundled CLI smoke must exercise manifest-aware report gate",
);
assertIncludes(
  files.cliBundleSmoke,
  "--live-spike-manifest-path",
  "bundled CLI smoke must exercise manifest-aware live-spike proof in the packaged CLI",
);
assertIncludes(
  files.cliBundleSmoke,
  "futureLiveSpikeProofResult",
  "bundled CLI smoke must reject future-dated live spike proof",
);
assertIncludes(
  files.cliBundleSmoke,
  "futureDryRunProofResult",
  "bundled CLI smoke must reject future-dated dry-run proof",
);
assertIncludes(
  files.cliBundleSmoke,
  "futureBackupProofResult",
  "bundled CLI smoke must reject future-dated backup proof",
);
assertIncludes(
  files.schedulerWrapperSmoke,
  "blockedFidelityResult",
  "scheduled wrapper smoke must prove unaccepted unverified Recall chunks stop before apply",
);
assertIncludes(
  files.schedulerWrapperSmoke,
  "staleKeyEvidenceResult",
  "scheduled wrapper smoke must prove stale key rotation evidence stops before report creation",
);
assertIncludes(
  files.schedulerWrapperSmoke,
  "--require-key-rotation-evidence",
  "scheduled wrapper smoke must assert core apply key evidence flag pass-through",
);
assertIncludes(
  files.schedulerWrapperSmoke,
  "BRAIN_RECALL_REQUIRE_KEY_ROTATION_EVIDENCE=1",
  "scheduled wrapper smoke must assert core apply key evidence env pass-through",
);
assertIncludes(
  files.schedulerWrapperSmoke,
  "env_file_not_rotated_after_checkpoint",
  "scheduled wrapper smoke must assert stale key evidence blocker reporting",
);
assertIncludes(
  files.schedulerWrapperSmoke,
  "blocked_by_fidelity_policy",
  "scheduled wrapper smoke must assert fidelity-policy blocker reporting",
);
assertIncludes(
  files.schedulerWrapperSmoke,
  "preserves approved manual verification env over disabled system env values",
  "scheduled wrapper smoke must prove approved manual verification env survives disabled system env defaults",
);
assertIncludes(
  files.schedulerWrapperSmoke,
  "check-recall-apply-report.mjs",
  "scheduled wrapper smoke must package the post-apply report checker",
);
assertIncludes(
  files.schedulerWrapperSmoke,
  "post-apply report review",
  "scheduled wrapper smoke must prove the post-apply report review path",
);

assertIncludes(
  files.manualVerificationWrapper,
  "check-recall-second-manual-runtime-preflight.mjs",
  "manual verification wrapper must run production runtime preflight before scheduled apply delegation",
);
assertIncludes(
  files.manualVerificationWrapper,
  "BRAIN_RECALL_MANUAL_VERIFICATION_MODE=1",
  "manual verification wrapper must still set manual mode before scheduled apply delegation",
);
assertIncludes(
  files.manualVerificationWrapperSmoke,
  "manual wrapper runs production runtime preflight before apply delegation",
  "manual verification wrapper smoke must assert runtime preflight delegation",
);
assertIncludes(
  files.secondManualRuntimePreflight,
  "BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH",
  "runtime preflight must validate the SPIKE-013 proof path",
);
assertIncludes(
  files.secondManualRuntimePreflight,
  "BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH",
  "runtime preflight must validate the SPIKE-014 proof path",
);
assertIncludes(
  files.secondManualRuntimePreflight,
  "BRAIN_RECALL_MAX_IMPORTS",
  "runtime preflight must enforce the second-manual import cap",
);
assertIncludes(
  files.secondManualRuntimePreflight,
  "scheduled_wrapper_manual_env_override_guard",
  "runtime preflight must reject deployed scheduled wrappers missing the manual env override guard",
);
assertIncludes(
  files.secondManualRuntimePreflight,
  "BRAIN_RECALL_SCHEDULER_ENABLED",
  "runtime preflight must keep scheduler enablement out of the manual run",
);
assertIncludes(
  files.secondManualRuntimePreflight,
  "check-recall-key-rotation-evidence.mjs",
  "runtime preflight must verify production key rotation evidence before apply delegation",
);
assertIncludes(
  files.secondManualRuntimePreflight,
  "BRAIN_RECALL_KEY_ROTATION_ENV_FILE",
  "runtime preflight must use the same production key evidence env-file variable as the scheduled wrapper",
);
assertIncludes(
  files.secondManualRuntimePreflightSmoke,
  "runtime preflight refuses missing deployed helper",
  "runtime preflight smoke must cover missing production helper failures",
);
assertIncludes(
  files.secondManualRuntimePreflightSmoke,
  "runtime preflight refuses stale production key rotation evidence",
  "runtime preflight smoke must cover stale key rotation evidence failures",
);
assertIncludes(
  files.secondManualRuntimePreflightSmoke,
  "runtime preflight refuses stale scheduled wrapper without manual env override guard",
  "runtime preflight smoke must cover stale scheduled wrapper drift failures",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflight,
  "check-recall-second-manual-runtime-preflight.mjs",
  "remote runtime preflight verifier must run the production runtime preflight remotely",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflight,
  "BRAIN_RECALL_REMOTE_PREFLIGHT_SSH_COMMAND",
  "remote runtime preflight verifier must support a smoke-safe SSH command override",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflight,
  "skipRemoteSystemChecks",
  "remote runtime preflight verifier must keep remote system checks explicit for smoke fixtures",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflight,
  "skipLiveSpikeGate",
  "remote runtime preflight verifier must pass through the local live-spike gate skip when production tooling requests it",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflight,
  "proofReports",
  "remote runtime preflight verifier must expose deployed proof report readiness",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflight,
  "deployedLatestReports",
  "remote runtime preflight verifier must expose latest deployed proof-pair discovery",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflight,
  "remoteBuildCommandEnv",
  "remote runtime preflight verifier must support remote command-env construction",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflight,
  "remote_deployed_latest_spike_pair",
  "remote runtime preflight verifier must default command env to the deployed proof pair",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflight,
  "selectedMatchesRemoteLatest",
  "remote runtime preflight verifier must compare local selected proof pair with latest deployed proof pair",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflight,
  "no-live and no-write",
  "remote runtime preflight verifier must document its no-live/no-write contract",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflightSmoke,
  "remote verifier fails when a remote runtime helper is missing",
  "remote runtime preflight smoke must prove missing remote helper failures",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflightSmoke,
  "remote verifier exposes deployed SPIKE proof file checks",
  "remote runtime preflight smoke must prove deployed SPIKE proof checks are surfaced",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflightSmoke,
  "remote verifier surfaces latest deployed SPIKE proof pair and local selection match",
  "remote runtime preflight smoke must prove latest deployed proof-pair matching is surfaced",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflightSmoke,
  "remote verifier fails when remote key rotation evidence is stale",
  "remote runtime preflight smoke must prove stale remote key evidence failures",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflightSmoke,
  "remote verifier fails when the deployed scheduled wrapper lacks the manual env override guard",
  "remote runtime preflight smoke must prove stale scheduled wrapper drift failures",
);
assertIncludes(
  files.secondManualRemoteRuntimePreflightSmoke,
  "remote verifier builds command env from the deployed proof pair by default",
  "remote runtime preflight smoke must prove remote-built command env is the default",
);
assertIncludes(
  files.secondManualProductionCommand,
  "Printing this command is not approval",
  "production command handoff must distinguish printing from approval",
);
assertIncludes(
  files.secondManualProductionCommand,
  "check-recall-second-manual-remote-runtime-preflight.mjs",
  "production command handoff must run no-live remote runtime preflight",
);
assertIncludes(
  files.secondManualProductionCommand,
  "check-recall-daily-sync-completion-status.mjs",
  "production command handoff must inspect current completion gate",
);
assertIncludes(
  files.secondManualProductionCommand,
  "recall:second-manual:production-apply",
  "production command handoff must print the guarded production runner command",
);
assertIncludes(
  files.secondManualProductionCommand,
  "does not enable the scheduler",
  "production command handoff must keep scheduler enablement separate",
);
assertIncludes(
  files.secondManualProductionCommand,
  "firstApplyApprovalPresent",
  "production command handoff must surface stale first-apply approval classification",
);
assertIncludes(
  files.secondManualProductionCommand,
  "First capped apply approval is already spent",
  "production command handoff must warn that first-apply approval does not authorize the second manual run",
);
assertIncludes(
  files.secondManualProductionCommand,
  "localReportDir",
  "production command handoff must surface the local apply-report directory",
);
assertIncludes(
  files.secondManualProductionCommand,
  "PRIVATE_RECALL_EVIDENCE_ROOT",
  "production command handoff must define the private local apply-report evidence root",
);
assertIncludes(
  files.secondManualProductionCommand,
  "local_apply_report_dir_not_private",
  "production command handoff must refuse unsafe local apply-report directory overrides",
);
assertIncludes(
  files.secondManualProductionCommand,
  "localInputBlocked",
  "production command handoff must short-circuit unsafe local report-dir input before remote preflight",
);
assertIncludes(
  files.secondManualProductionCommand,
  "handoffProgress",
  "production command handoff must expose the pre-approval stop point",
);
assertIncludes(
  files.secondManualProductionCommand,
  "ready_for_exact_approval",
  "production command handoff must report exact approval as the next live-write action when preflight is ready",
);
assertIncludes(
  files.secondManualProductionCommand,
  "localPrivateGatesSkippedForProductionPath",
  "production command handoff must make local private-gate status explicit",
);
assertIncludes(
  files.secondManualProductionCommand,
  "this handoff is no-live/no-write; exact second-manual approval is the next required action after production remote preflight passed",
  "production command handoff must explain why the live call was not attempted",
);
assertIncludes(
  files.secondManualProductionCommandSmoke,
  "production command handoff distinguishes printing from live approval",
  "production command handoff smoke must prove approval warning",
);
assertIncludes(
  files.secondManualProductionCommandSmoke,
  "production command handoff classifies first-apply approval as stale for this gate",
  "production command handoff smoke must prove stale first-apply approval classification",
);
assertIncludes(
  files.secondManualProductionCommandSmoke,
  "production command handoff surfaces the private local apply-report directory",
  "production command handoff smoke must prove private local report-dir visibility",
);
assertIncludes(
  files.secondManualProductionCommandSmoke,
  "production command handoff refuses unsafe local apply-report directory overrides",
  "production command handoff smoke must prove unsafe local report-dir overrides are refused",
);
assertIncludes(
  files.secondManualProductionCommandSmoke,
  "production command handoff short-circuits unsafe local report-dir overrides before remote preflight",
  "production command handoff smoke must prove unsafe local report-dir overrides short-circuit before remote preflight",
);
assertIncludes(
  files.secondManualProductionCommandSmoke,
  "production command handoff reports exact approval as the next live-write action",
  "production command handoff smoke must prove exact approval is the next no-live handoff action",
);
assertIncludes(
  files.secondManualProductionCommandSmoke,
  "production command handoff reports local private gates are not blocking the production path",
  "production command handoff smoke must prove local private gates are not the handoff blocker",
);
assertIncludes(
  files.secondManualProductionCommandSmoke,
  "production command handoff keeps scheduler enablement separate",
  "production command handoff smoke must prove scheduler separation",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "SECOND_MANUAL_VERIFICATION_PRODUCTION_COMMAND",
  "completion status must define the no-live second-manual production command handoff",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "SECOND_MANUAL_VERIFICATION_CURRENT_GATE_COMMAND",
  "completion status must define the current-gate precheck before the second-manual handoff",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "SECOND_MANUAL_VERIFICATION_MANIFEST_PRELIVE_COMMAND",
  "completion status must define the manifest-enforced pre-live check before the second-manual handoff",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "PRODUCTION_KEY_EVIDENCE_REPAIR_COMMAND",
  "completion status must define the no-live production key-evidence repair handoff",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "No-live handoff before approval",
  "completion status safe next commands must point to the no-live production command handoff",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "npm run recall:current-gate",
  "completion status safe next commands must point to the current-gate precheck",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json",
  "completion status safe next commands must point to manifest-enforced pre-live",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "blocked_second_manual_verification_run",
  "completion status must use an explicit second-manual status while that is the active gate",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "blocked_scheduler_enablement",
  "completion status must distinguish scheduler approval after repeated clean runs",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "SCHEDULER_ENABLEMENT_COMMAND_HANDOFF",
  "completion status must define the no-live scheduler enablement command handoff",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "DEFAULT_DURABLE_APPLY_REPORT_EVIDENCE_MAX_AGE_MINUTES",
  "completion status must use durable max-age for historical manual clean-run evidence",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "No-live scheduler handoff before approval",
  "completion status scheduler-ready safe next commands must point to the no-live scheduler handoff",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "ready_for_exact_scheduler_approval",
  "completion status scheduler-ready next action must require the no-live scheduler handoff proof",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "discoverScheduledApplyReportPaths(firstApplyReportPath)",
  "completion status must discover second manual run candidates relative to the reviewed first apply report",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "firstApplyDir === defaultPrivateDir",
  "completion status must not let smoke fixture apply reports count real private scheduled-apply reports",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "activeBlockedRequirement",
  "completion status must expose the active blocked requirement separately from broad completion requirements",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "secondManualVerificationPath",
  "completion status must expose the second-manual handoff and approval path",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "requires_no_live_production_handoff_then_exact_approval",
  "completion status must name the no-live handoff before exact approval status",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "readyHandoffMustShow",
  "completion status must define the ready handoff proof fields",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "readyCurrentGateMustShow",
  "completion status must define the ready current-gate proof fields",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "requiredBeforeApply",
  "completion status must expose the required pre-apply sequence for second-manual verification",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "selectedMatchesRemoteLatest",
  "completion status must require latest deployed proof-pair evidence before apply",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "firstApplyApprovalPresent=false",
  "completion status next action must reject stale first-apply approval before handoff",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "secondManualApprovalInWrongEnv=false",
  "completion status next action must reject wrong-env second-manual approval before handoff",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "localPrivateGatesAreNotThePlannedProductionGate",
  "completion status must explicitly say local private gates are not the planned production gate",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "npm run recall:production-key-evidence:command",
  "completion status safe next commands must point to the production key-evidence repair handoff",
);
assertIncludes(
  files.dailySyncCompletionStatus,
  "npm run recall:production-env-key:install",
  "completion status safe next commands must point to the production Recall key install when the production env lacks RECALL_API_KEY",
);
assertIncludes(
  files.dailySyncCompletionStatusSmoke,
  "activeBlockedRequirement",
  "completion status smoke must prove the active blocked requirement",
);
assertIncludes(
  files.dailySyncCompletionStatusSmoke,
  "blocked_second_manual_verification_run",
  "completion status smoke must prove the explicit second-manual status",
);
assertIncludes(
  files.prelive,
  "activeBlockedRequirement",
  "pre-live readiness must carry the active blocked requirement from completion status",
);
assertIncludes(
  files.dailySyncCompletionStatusSmoke,
  "production key-evidence repair handoff if remote preflight blocks",
  "completion status smoke must prove production key-evidence repair handoff guidance",
);
assertIncludes(
  files.dailySyncCompletionStatusSmoke,
  "production Recall key install when the production env lacks RECALL_API_KEY",
  "completion status smoke must prove production Recall key install guidance",
);
assertIncludes(
  files.dailySyncCompletionStatusSmoke,
  "no-live production command handoff before approval",
  "completion status smoke must prove the no-live production command handoff guidance",
);
assertIncludes(
  files.dailySyncCompletionStatusSmoke,
  "current-gate command before readiness and production handoff",
  "completion status smoke must prove current-gate guidance comes before readiness and production handoff",
);
assertIncludes(
  files.dailySyncCompletionStatusSmoke,
  "exact current-gate proof fields",
  "completion status smoke must prove current-gate proof fields are required before approval",
);
assertIncludes(
  files.dailySyncCompletionStatusSmoke,
  "current-gate approval mismatch guidance",
  "completion status smoke must preserve stale/wrong-env approval mismatch guidance",
);
assertIncludes(
  files.dailySyncCompletionStatusSmoke,
  "ready handoff proof fields before approval",
  "completion status smoke must prove ready handoff progress fields are required before approval",
);
assertIncludes(
  files.dailySyncCompletionStatusSmoke,
  "local private gates are not the planned production gate",
  "completion status smoke must prove local private gates are not the planned production gate",
);
assertIncludes(
  files.dailySyncCompletionStatusSmoke,
  "scheduler-ready fixture points to the no-live scheduler command handoff before approval",
  "completion status smoke must prove scheduler handoff guidance before approval",
);
assertIncludes(
  files.dailySyncCompletionStatusSmoke,
  "scheduler-ready fixture requires post-approval timer/first-run sequence before evidence recording",
  "completion status smoke must prove post-approval timer and first scheduled run guidance before evidence recording",
);
assertIncludes(
  files.goalCompletionAudit,
  "RECALL_DAILY_SYNC_FINAL_COMPLETION_AUDIT_2026-06-28_01-40-12_IST.md",
  "goal completion audit checker must validate the final audit document by default",
);
assertIncludes(
  files.goalCompletionAudit,
  "goal_completion_audit_final_state_verified",
  "goal completion audit checker must expose the final-state verdict",
);
assertIncludes(
  files.goalCompletionAudit,
  "goal_completion_audit_current_incomplete_state_verified",
  "goal completion audit checker must expose the current incomplete-state verdict",
);
assertIncludes(
  files.goalCompletionAudit,
  "blocked_scheduler_enablement",
  "goal completion audit checker must require the current scheduler blocked status",
);
assertIncludes(
  files.goalCompletionAudit,
  "wrong_current_manual_clean_run_count",
  "goal completion audit checker must fail when manual clean-run count changes",
);
assertIncludes(
  files.goalCompletionAudit,
  "missing_scheduler_handoff_safe_next",
  "goal completion audit checker must fail when scheduler handoff safe-next guidance is missing",
);
assertIncludes(
  files.goalCompletionAudit,
  "missing_scheduler_enable_and_first_run_safe_next",
  "goal completion audit checker must fail when scheduler safe-next guidance skips timer/first-run verification",
);
assertIncludes(
  files.goalCompletionAudit,
  "ready_for_exact_scheduler_approval",
  "goal completion audit checker must require scheduler handoff ready proof wording",
);
assertIncludes(
  files.goalCompletionAudit,
  "localPrivateGatesAreNotThePlannedProductionGate",
  "goal completion audit checker must verify the local-gate fix remains exposed",
);
assertIncludes(
  files.goalCompletionAudit,
  "--prelive-result",
  "goal completion audit checker must accept explicit pre-live evidence",
);
assertIncludes(
  files.goalCompletionAudit,
  "nextGate.localGateResolution",
  "goal completion audit checker must require pre-live local-gate proof wording",
);
assertIncludes(
  files.goalCompletionAudit,
  "prelive_local_gate_not_latest",
  "goal completion audit checker must reject stale pre-live proof-pair evidence",
);
assertIncludes(
  files.goalCompletionAudit,
  "prelive_stale_first_apply_missing_finding",
  "goal completion audit checker must require stale first-apply approval classification from pre-live",
);
assertIncludes(
  files.goalCompletionAudit,
  "prelive_stale_first_apply_local_gate_bypass_not_preserved",
  "goal completion audit checker must require stale first-apply local-gate bypass proof",
);
assertIncludes(
  files.goalCompletionAudit,
  "prelive_stale_first_apply_not_latest",
  "goal completion audit checker must reject stale first-apply proof-pair regressions",
);
assertIncludes(
  files.goalCompletionAudit,
  "This checker is no-live/no-write",
  "goal completion audit checker must state its no-live/no-write contract",
);
assertIncludes(
  files.goalCompletionAuditSmoke,
  "current incomplete audit fixture passes",
  "goal completion audit smoke must prove the current incomplete audit fixture",
);
assertIncludes(
  files.goalCompletionAuditSmoke,
  "final completion audit fixture passes",
  "goal completion audit smoke must prove the final completion audit fixture",
);
assertIncludes(
  files.goalCompletionAuditSmoke,
  "stale scheduler pre-live current gate fails",
  "goal completion audit smoke must reject stale pre-live current-gate regressions",
);
assertIncludes(
  files.goalCompletionAuditSmoke,
  "stale complete audit fixture fails",
  "goal completion audit smoke must reject stale complete audit claims",
);
assertIncludes(
  files.goalCompletionAuditSmoke,
  "stale second-manual completion status fails the post-apply audit",
  "goal completion audit smoke must reject stale second-manual drift after approved apply",
);
assertIncludes(
  files.goalCompletionAuditSmoke,
  "stale scheduler pre-live current gate fails",
  "goal completion audit smoke must reject stale scheduler pre-live current gate",
);
assertIncludes(
  files.goalCompletionAuditSmoke,
  "stale scheduler handoff guidance fails",
  "goal completion audit smoke must reject stale scheduler handoff guidance",
);
assertIncludes(
  files.goalCompletionAuditSmoke,
  "stale scheduler post-approval sequence fails",
  "goal completion audit smoke must reject stale scheduler post-approval sequencing",
);
assertIncludes(
  files.prelive,
  "goal_completion_audit_smoke",
  "pre-live readiness must run the goal completion audit smoke",
);
assertIncludes(
  files.prelive,
  "goal_completion_audit_check",
  "pre-live readiness must run the real goal completion audit checker",
);
assertIncludes(
  files.currentGate,
  "ready_for_second_manual_exact_approval",
  "current-gate checker must expose the ready-for-exact-approval status",
);
assertIncludes(
  files.currentGate,
  "not_blocking_production_path",
  "current-gate checker must require local gates not blocking the production path",
);
assertIncludes(
  files.currentGate,
  "ready_for_second_manual_remote_runtime_preflight",
  "current-gate checker must require passed production remote preflight",
);
assertIncludes(
  files.currentGate,
  "approval_already_present",
  "current-gate checker must fail if exact approval is already present in the environment",
);
assertIncludes(
  files.currentGate,
  "stale_first_apply_approval_present",
  "current-gate checker must fail when stale first-apply approval is present for the second-manual gate",
);
assertIncludes(
  files.currentGate,
  "second_manual_approval_wrong_env",
  "current-gate checker must fail when second-manual approval text is present outside the required env var",
);
assertIncludes(
  files.currentGate,
  "This current-gate checker is no-live/no-write",
  "current-gate checker must state its no-live/no-write contract",
);
assertIncludes(
  files.currentGate,
  "npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json",
  "current-gate checker must direct operators through manifest-enforced pre-live before apply",
);
assertIncludes(
  files.currentGate,
  "npm run recall:second-manual:production-command",
  "current-gate checker must direct operators through the no-live production handoff before apply",
);
assertIncludes(
  files.currentGate,
  "npm run recall:scheduler-enable:command",
  "current-gate checker must direct operators through the no-live scheduler handoff before scheduler approval",
);
assertIncludes(
  files.currentGate,
  "manualCleanRunReadiness: summarizeManualCleanRunReadiness",
  "current-gate checker must expose manual clean-run readiness in scheduler approval output",
);
assertIncludes(
  files.currentGate,
  "postEnableFirstRunEvidenceHandoffCommand",
  "current-gate checker must expose the post-enable first-run evidence handoff field",
);
assertIncludes(
  files.currentGate,
  "npm run recall:scheduler-evidence:command",
  "current-gate checker must direct operators through the post-enable first-run evidence handoff before recording scheduler evidence",
);
assertIncludes(
  files.currentGate,
  "timer/flag enablement command",
  "current-gate checker must require post-approval timer/flag enablement before evidence recording",
);
assertIncludes(
  files.currentGate,
  "first scheduled service run completed after scheduler timer activation",
  "current-gate checker must require first scheduled run verification before evidence recording",
);
assertIncludes(
  files.currentGate,
  "selectedMatchesRemoteLatest",
  "current-gate checker must document latest deployed proof-pair evidence before apply",
);
assertIncludes(
  files.currentGateSmoke,
  "scheduler current-gate fixture passes",
  "current-gate smoke must prove the scheduler ready fixture",
);
assertIncludes(
  files.currentGateSmoke,
  "local private-gate regression fails",
  "current-gate smoke must reject local private-gate regressions",
);
assertIncludes(
  files.currentGateSmoke,
  "remote preflight blocked fixture fails",
  "current-gate smoke must reject remote preflight failures",
);
assertIncludes(
  files.currentGateSmoke,
  "stale first-apply approval fixture fails",
  "current-gate smoke must reject stale first-apply approval in the current environment",
);
assertIncludes(
  files.currentGateSmoke,
  "second-manual approval in wrong env fixture fails",
  "current-gate smoke must reject second-manual approval supplied outside the required env var",
);
assertIncludes(
  files.currentGateSmoke,
  "approval already present fixture fails",
  "current-gate smoke must reject ambiguous pre-approval state when approval is already present",
);
assertIncludes(
  files.currentGateSmoke,
  "ready output requires scheduler evidence recording",
  "current-gate smoke must prove scheduler evidence recording guidance",
);
assertIncludes(
  files.currentGateSmoke,
  "ready output exposes manual clean-run readiness for scheduler approval",
  "current-gate smoke must prove scheduler manual clean-run readiness is visible to operators",
);
assertIncludes(
  files.currentGateSmoke,
  "ready output requires post-approval timer/first-run/evidence-handoff/evidence sequence",
  "current-gate smoke must prove the post-approval timer, first scheduled run, evidence handoff, and evidence sequence",
);
assertIncludes(
  files.currentGateSmoke,
  "ready fixture should include post-enable first-run evidence handoff guidance",
  "current-gate smoke must prove ready output names the post-enable first-run evidence handoff",
);
assertIncludes(
  files.currentGateSmoke,
  "ready output requires scheduler evidence verification",
  "current-gate smoke must prove scheduler evidence verification guidance",
);
assertIncludes(
  files.prelive,
  "current_gate_smoke",
  "pre-live readiness must run the current-gate smoke",
);
assertIncludes(
  files.prelive,
  "current_gate_check",
  "pre-live readiness must run the real current-gate checker",
);
assertIncludes(
  files.keyRotationHandoff,
  "secondManualProductionCommand",
  "key-rotation handoff must expose the no-live second-manual production command in completed phase",
);
assertIncludes(
  files.keyRotationHandoffSmoke,
  "completed handoff includes the no-live second manual production command handoff",
  "key-rotation handoff smoke must prove completed-phase production command guidance",
);
assertIncludes(
  files.liveAuthProbe,
  "--system-env-file",
  "live auth probe must support production system env files for key evidence repair",
);
assertIncludes(
  files.liveAuthProbe,
  "assertSystemEnvFileSafety",
  "live auth probe must validate restrictive permissions for production system env files",
);
assertIncludes(
  files.keyRotationEvidenceRecorder,
  "BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK",
  "key evidence recorder must require a production-specific acknowledgement for system env files",
);
assertIncludes(
  files.keyRotationEvidenceRecorder,
  "production_system_env_key_rotation_evidence_recorded",
  "key evidence recorder must make production system evidence mode explicit",
);
assertIncludes(
  files.keyRotationEvidenceRecorder,
  "--system-env-file",
  "key evidence recorder must verify production evidence with the system env-file gate",
);
assertIncludes(
  files.keyRotationEvidenceRecorderSmoke,
  "system-env recorder verifies evidence with the system env-file gate",
  "key evidence recorder smoke must prove production system-env evidence recording",
);
assertIncludes(
  files.productionKeyEvidenceCommand,
  "BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK",
  "production key-evidence command must print the guarded system acknowledgement command",
);
assertIncludes(
  files.productionKeyEvidenceCommand,
  "no-live and no-write",
  "production key-evidence command must document its no-live/no-write handoff contract",
);
assertIncludes(
  files.productionKeyEvidenceCommand,
  "npm run recall:production-key-evidence:repair",
  "production key-evidence command must print the guarded repair runner",
);
assertIncludes(
  files.productionKeyEvidenceCommand,
  "remoteEnvContract",
  "production key-evidence command must report whether the production env contains RECALL_API_KEY",
);
assertIncludes(
  files.productionKeyEvidenceCommand,
  "npm run recall:production-env-key:install",
  "production key-evidence command must print the guarded production Recall key install command",
);
assertIncludes(
  files.productionKeyEvidenceRepair,
  "BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK",
  "production key-evidence repair runner must require exact production system acknowledgement",
);
assertIncludes(
  files.productionKeyEvidenceRepair,
  "private_acknowledgement_wrong_gate",
  "production key-evidence repair runner must reject the local private acknowledgement for the production system gate",
);
assertIncludes(
  files.productionKeyEvidenceRepair,
  "record-recall-key-rotation-evidence.mjs",
  "production key-evidence repair runner must delegate to the recorder on the production host",
);
assertIncludes(
  files.productionKeyEvidenceRepair,
  "--system-env-file",
  "production key-evidence repair runner must use system env-file mode",
);
assertIncludes(
  files.productionKeyEvidenceRepair,
  "readOnlyRecallAuthProbeAttempted",
  "production key-evidence repair runner must report whether the read-only auth probe was attempted",
);
assertIncludes(
  files.productionKeyEvidenceRepair,
  "aiBrainWriteAttempted: false",
  "production key-evidence repair runner must report no AI Brain row writes",
);
assertIncludes(
  files.productionKeyEvidenceRepair,
  "recallImportAttempted: false",
  "production key-evidence repair runner must report no Recall imports",
);
assertIncludes(
  files.productionKeyEvidenceRepair,
  "schedulerEnablementAttempted: false",
  "production key-evidence repair runner must report no scheduler enablement",
);
assertIncludes(
  files.productionKeyEvidenceRepair,
  "checkpointMovementAttempted: false",
  "production key-evidence repair runner must report no checkpoint movement",
);
assertIncludes(
  files.productionKeyEvidenceRepairSmoke,
  "production key-evidence repair runner refuses without exact system acknowledgement",
  "production key-evidence repair smoke must prove missing acknowledgement refusal",
);
assertIncludes(
  files.productionKeyEvidenceRepairSmoke,
  "production key-evidence repair runner refuses the local private acknowledgement",
  "production key-evidence repair smoke must prove local private acknowledgement is rejected",
);
assertIncludes(
  files.productionKeyEvidenceRepairSmoke,
  "production key-evidence repair runner runs one read-only auth probe after exact system acknowledgement",
  "production key-evidence repair smoke must prove read-only auth probe path after exact acknowledgement",
);
assertIncludes(
  files.productionKeyEvidenceRepairSmoke,
  "production key-evidence repair runner does not import Recall data, write AI Brain rows, enable scheduler, or move checkpoint",
  "production key-evidence repair smoke must prove no import/database/scheduler/checkpoint side effects",
);
assertIncludes(
  files.productionEnvKeyInstall,
  "BRAIN_RECALL_PRODUCTION_KEY_INSTALL_ACK",
  "production Recall key installer must require exact acknowledgement",
);
assertIncludes(
  files.productionEnvKeyInstall,
  "assertRecallEnvFileSafety",
  "production Recall key installer must read only a safe ignored local private Recall env file",
);
assertIncludes(
  files.productionEnvKeyInstall,
  "RECALL_API_KEY",
  "production Recall key installer must install the Recall API key into the system env file",
);
assertIncludes(
  files.productionEnvKeyInstall,
  "BRAIN_RECALL_CONFIRM_LIVE_API=0",
  "production Recall key installer must keep live confirmation disabled by default",
);
assertIncludes(
  files.productionEnvKeyInstall,
  "run-recall-live-auth-probe.mjs",
  "production Recall key installer must verify with the read-only live auth probe",
);
assertIncludes(
  files.productionEnvKeyInstall,
  "check-recall-key-rotation-evidence.mjs",
  "production Recall key installer must rerun the system env-file key evidence gate",
);
assertIncludes(
  files.productionEnvKeyInstall,
  "aiBrainWriteAttempted: false",
  "production Recall key installer must report no AI Brain row writes",
);
assertIncludes(
  files.productionEnvKeyInstall,
  "recallImportAttempted: false",
  "production Recall key installer must report no Recall imports",
);
assertIncludes(
  files.productionEnvKeyInstall,
  "schedulerEnablementAttempted: false",
  "production Recall key installer must report no scheduler enablement",
);
assertIncludes(
  files.productionEnvKeyInstall,
  "checkpointMovementAttempted: false",
  "production Recall key installer must report no checkpoint movement",
);
assertIncludes(
  files.productionEnvKeyInstallSmoke,
  "production env key installer refuses before key read or remote write without exact acknowledgement",
  "production Recall key install smoke must prove missing acknowledgement refusal",
);
assertIncludes(
  files.productionEnvKeyInstallSmoke,
  "production env key installer runs exactly one read-only Recall auth probe after acknowledgement",
  "production Recall key install smoke must prove the read-only auth probe runs after acknowledgement",
);
assertIncludes(
  files.productionEnvKeyInstallSmoke,
  "production env key installer makes the system env-file key evidence gate pass from env-file mtime",
  "production Recall key install smoke must prove key evidence passes from production env mtime",
);
assertIncludes(
  files.productionEnvKeyInstallSmoke,
  "production env key installer does not import Recall data, write AI Brain rows, enable scheduler, or move checkpoint",
  "production Recall key install smoke must prove no import/database/scheduler/checkpoint side effects",
);
assertIncludes(
  files.secondManualProductionApply,
  "BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL",
  "production apply runner must require exact manual verification approval",
);
assertIncludes(
  files.secondManualProductionApply,
  "stale_first_apply_approval",
  "production apply runner must distinguish stale first-apply approval from current second-manual approval",
);
assertIncludes(
  files.secondManualProductionApply,
  "second_manual_approval_wrong_env",
  "production apply runner must distinguish second-manual approval supplied in the wrong env var",
);
assertIncludes(
  files.secondManualProductionApply,
  "approvalStatus",
  "production apply runner must report approval classification without printing approval values",
);
assertIncludes(
  files.secondManualProductionApply,
  "remoteBuildCommandEnv",
  "production apply runner must support remote command-env construction",
);
assertIncludes(
  files.secondManualProductionApply,
  "remote_deployed_latest_spike_pair",
  "production apply runner must default command env to the deployed proof pair",
);
assertIncludes(
  files.secondManualProductionApply,
  "check-recall-second-manual-remote-runtime-preflight.mjs",
  "production apply runner must run the remote runtime preflight before apply",
);
assertIncludes(
  files.secondManualProductionApply,
  "--skip-readiness",
  "production apply runner must skip broad local readiness by default",
);
assertIncludes(
  files.secondManualProductionApply,
  "--skip-live-spike-gate",
  "production apply runner must skip local live-spike proof validation by default",
);
assertIncludes(
  files.secondManualProductionApply,
  "requireLocalGates",
  "production apply runner must make broad local gates opt-in",
);
assertIncludes(
  files.secondManualProductionApply,
  "BRAIN_DIR=",
  "production apply runner must pass the verified remote root to the remote wrapper",
);
assertIncludes(
  files.secondManualProductionApply,
  "scripts/print-recall-second-manual-verification-command.mjs",
  "production apply runner must use the command builder instead of hand-built env",
);
assertIncludes(
  files.secondManualProductionApply,
  "liveWriteAttempted",
  "production apply runner must report whether a live write was attempted",
);
assertIncludes(
  files.secondManualProductionApply,
  "preApplyProgress",
  "production apply runner must expose where it stopped before live apply",
);
assertIncludes(
  files.secondManualProductionApply,
  "localPrivateGatesSkippedForProductionPath",
  "production apply runner must make local private-gate bypass explicit for the remote production path",
);
assertIncludes(
  files.secondManualProductionApply,
  "exact second-manual approval is missing after production remote preflight passed",
  "production apply runner must explain approval-gate stops after remote preflight",
);
assertIncludes(
  files.secondManualProductionApply,
  "proofReports",
  "production apply runner must surface deployed SPIKE proof report readiness",
);
assertIncludes(
  files.secondManualProductionApply,
  "deployedLatestReports",
  "production apply runner must surface latest deployed proof-pair discovery",
);
assertIncludes(
  files.secondManualProductionApply,
  "captureAndValidateRemoteApplyReport",
  "production apply runner must capture the remote second-manual apply report after approved execution",
);
assertIncludes(
  files.secondManualProductionApply,
  "secondManualApplyReport",
  "production apply runner must return the captured second-manual apply report summary",
);
assertIncludes(
  files.secondManualProductionApply,
  "apply_report=",
  "production apply runner must parse the remote scheduled wrapper apply-report path",
);
assertIncludes(
  files.secondManualProductionApply,
  "scheduled-apply-\\d{8}T\\d{6}Z",
  "production apply runner must require production-shaped scheduled apply-report paths",
);
assertIncludes(
  files.secondManualProductionApply,
  "scripts/check-recall-apply-report.mjs",
  "production apply runner must locally validate the captured second-manual apply report",
);
assertIncludes(
  files.secondManualProductionApply,
  "--local-report-dir",
  "production apply runner must support a private local apply-report capture directory",
);
assertIncludes(
  files.secondManualProductionApply,
  "PRIVATE_RECALL_EVIDENCE_ROOT",
  "production apply runner must define the private local apply-report evidence root",
);
assertIncludes(
  files.secondManualProductionApply,
  "local_apply_report_dir_not_private",
  "production apply runner must block unsafe local apply-report capture directories before remote apply",
);
assertIncludes(
  files.secondManualProductionApply,
  "isUnderPrivateRecallEvidenceRoot",
  "production apply runner must verify the local apply-report capture directory is private",
);
assertIncludes(
  files.secondManualProductionApply,
  "no-live/no-write",
  "production apply runner must document its no-live/no-write behavior before approval",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner refuses without exact approval",
  "production apply runner smoke must prove approval refusal",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner classifies stale first-apply approval without attempting remote apply",
  "production apply runner smoke must prove stale first-apply approval stays no-live/no-write",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner classifies second-manual approval in the wrong env without attempting remote apply",
  "production apply runner smoke must prove wrong-env second-manual approval stays no-live/no-write",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner builds command env from deployed remote proof by default",
  "production apply runner smoke must prove remote-built command env is the default",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner skips broad local readiness/proof gates by default",
  "production apply runner smoke must prove broad local gates are skipped by default",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner reports that local private gates are not blocking the production path",
  "production apply runner smoke must prove local private gates are not the second-manual blocker",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner reports approval gate after remote preflight when exact approval is missing",
  "production apply runner smoke must prove approval, not local private gates, blocks no-approval runs",
);
assertIncludes(
  files.secondManualLocalGateResolution,
  "print-recall-second-manual-production-apply-command.mjs",
  "local-gate resolution checker must run the no-live second manual handoff",
);
assertIncludes(
  files.secondManualLocalGateResolution,
  "run-recall-second-manual-production-apply.mjs",
  "local-gate resolution checker must run the no-approval production apply probe",
);
assertIncludes(
  files.secondManualLocalGateResolution,
  "staleFirstApplyApprovalEnv",
  "local-gate resolution checker must run a stale first-apply approval production probe",
);
assertIncludes(
  files.secondManualLocalGateResolution,
  "BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: \"\"",
  "local-gate resolution checker must clear exact approval for no-live probes",
);
assertIncludes(
  files.secondManualLocalGateResolution,
  "local_private_gates_stopped_first",
  "local-gate resolution checker must scan for stale local-gate stopped-first wording",
);
assertIncludes(
  files.secondManualLocalGateResolution,
  "activeBlockedRequirement",
  "local-gate resolution checker must require the active blocked requirement",
);
assertIncludes(
  files.secondManualLocalGateResolution,
  "blocked_second_manual_verification_run",
  "local-gate resolution checker must require the explicit second-manual status",
);
assertIncludes(
  files.secondManualLocalGateResolution,
  "ready_for_exact_approval",
  "local-gate resolution checker must require ready handoff progress",
);
assertIncludes(
  files.secondManualLocalGateResolution,
  "approval_gate",
  "local-gate resolution checker must require the no-approval apply to stop at approval_gate",
);
assertIncludes(
  files.secondManualLocalGateResolution,
  "not_blocking_production_path",
  "local-gate resolution checker must require local gates not blocking the production path",
);
assertIncludes(
  files.secondManualLocalGateResolution,
  "apply_missing_selected_deployed_proof_pair",
  "local-gate resolution checker must require selected deployed proof-pair visibility",
);
assertIncludes(
  files.secondManualLocalGateResolution,
  "selectedMatchesRemoteLatest",
  "local-gate resolution checker must require selected proof-pair freshness",
);
assertIncludes(
  files.secondManualLocalGateResolution,
  "stale_first_apply_approval",
  "local-gate resolution checker must require stale first-apply approval classification",
);
assertIncludes(
  files.secondManualLocalGateResolutionSmoke,
  "local-gate resolution checker proves second manual verification is the active blocked requirement",
  "local-gate resolution checker smoke must prove active blocked requirement clarity",
);
assertIncludes(
  files.secondManualLocalGateResolutionSmoke,
  "local-gate resolution checker rejects stale broad completion-status wording",
  "local-gate resolution checker smoke must reject stale broad completion status wording",
);
assertIncludes(
  files.secondManualLocalGateResolutionSmoke,
  "local-gate resolution checker rejects stale local-gate stopped-first wording",
  "local-gate resolution checker smoke must prove stale wording fails closed",
);
assertIncludes(
  files.secondManualLocalGateResolutionSmoke,
  "local-gate resolution checker rejects apply output that stops before remote preflight",
  "local-gate resolution checker smoke must prove pre-remote-preflight apply stops fail",
);
assertIncludes(
  files.secondManualLocalGateResolutionSmoke,
  "local-gate resolution checker proves deployed proof-pair selection and readiness",
  "local-gate resolution checker smoke must prove deployed proof-pair readiness",
);
assertIncludes(
  files.secondManualLocalGateResolutionSmoke,
  "local-gate resolution checker rejects missing or stale deployed proof-pair selection",
  "local-gate resolution checker smoke must reject stale deployed proof-pair selection",
);
assertIncludes(
  files.secondManualLocalGateResolutionSmoke,
  "local-gate resolution checker proves stale first-apply approval reaches remote preflight before approval_gate",
  "local-gate resolution checker smoke must prove stale first-apply approval reaches remote preflight",
);
assertIncludes(
  files.secondManualLocalGateResolutionSmoke,
  "local-gate resolution checker rejects stale first-apply approval regressions that stop before remote preflight",
  "local-gate resolution checker smoke must reject stale first-apply approval preflight regressions",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner exposes deployed SPIKE proof file checks",
  "production apply runner smoke must prove deployed SPIKE proof checks are surfaced",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner exposes latest deployed SPIKE proof pair and local selection match",
  "production apply runner smoke must prove latest deployed proof-pair matching is surfaced",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner stops before remote apply when remote preflight fails",
  "production apply runner smoke must prove remote preflight failure stops apply",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner stops before remote apply when remote key evidence is stale",
  "production apply runner smoke must prove stale remote key evidence stops apply",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner stops before remote apply when deployed scheduled wrapper guard is missing",
  "production apply runner smoke must prove stale deployed scheduled wrapper guard stops apply",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner executes the remote manual wrapper through SSH only after exact approval",
  "production apply runner smoke must prove approved remote wrapper execution",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "approved production runner copies and locally validates the remote second-manual apply report",
  "production apply runner smoke must prove approved execution captures and locally validates the remote apply report",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  "production apply runner blocks unsafe local report directories before remote apply",
  "production apply runner smoke must prove unsafe local report directories block before remote apply",
);
assertIncludes(
  files.secondManualProductionApplySmoke,
  'localReview.verdict === "PASS_POST_APPLY_REVIEW_GATE"',
  "production apply runner smoke must prove the captured report passes the post-apply review gate",
);
assertIncludes(
  files.secondManualCommand,
  "includeRuntimeManifest",
  "second manual command builder must keep private manifest inclusion explicit",
);
assertIncludes(
  files.secondManualCommand,
  "skipLiveSpikeGate",
  "second manual command builder must allow production-runtime tooling to skip local live-spike validation",
);
assertIncludes(
  files.secondManualCommandSmoke,
  "command should omit private manifest path by default",
  "second manual command builder smoke must prove private manifest omission by default",
);
assertIncludes(
  files.wrapper,
  "BRAIN_RECALL_MANUAL_VERIFICATION_MODE",
  "scheduled wrapper must support approved manual verification mode",
);
assertIncludes(
  files.wrapper,
  "BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL",
  "scheduled wrapper must require approval in manual verification mode",
);
assertIncludes(
  files.manualVerificationWrapper,
  "BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL",
  "manual verification wrapper must require exact approval",
);
assertIncludes(
  files.manualVerificationWrapper,
  "BRAIN_RECALL_CONFIRM_LIVE_API must be 1",
  "manual verification wrapper must require live API confirmation outside fixtures",
);
assertIncludes(
  files.manualVerificationWrapper,
  "BRAIN_RECALL_MANUAL_VERIFICATION_MODE=1",
  "manual verification wrapper must set manual mode",
);
assertIncludes(
  files.manualVerificationWrapper,
  "check-recall-second-manual-runtime-preflight.mjs",
  "manual verification wrapper must rerun production runtime preflight before apply delegation",
);
assertNotIncludes(
  files.manualVerificationWrapper,
  "systemctl enable",
  "manual verification wrapper must not enable timers",
);
assertNotIncludes(
  files.manualVerificationWrapper,
  "systemctl start",
  "manual verification wrapper must not start timers",
);
assertIncludes(
  files.manualVerificationWrapperSmoke,
  "manual wrapper refuses without exact approval",
  "manual verification wrapper smoke must prove approval refusal",
);
assertIncludes(
  files.manualVerificationWrapperSmoke,
  "manual wrapper runs production runtime preflight before apply delegation",
  "manual verification wrapper smoke must prove internal runtime preflight gating",
);
assertIncludes(
  files.secondManualReadiness,
  "blocked_second_manual_verification_run",
  "second manual readiness must require the explicit second-manual completion status",
);
assertIncludes(
  files.secondManualReadiness,
  "activeBlockedRequirement",
  "second manual readiness must expose the active blocked requirement",
);
assertIncludes(
  files.secondManualReadiness,
  "scheduler_enablement",
  "second manual readiness must preserve scheduler enablement as the broader completion requirement",
);
assertIncludes(
  files.secondManualReadiness,
  "second_manual_verification_run",
  "second manual readiness must require the second manual verification gate",
);
assertIncludes(
  files.secondManualReadiness,
  "manualCleanRunReadiness",
  "second manual readiness must inspect manual clean-run readiness",
);
assertIncludes(
  files.secondManualReadiness,
  "liveWriteAllowedNow: false",
  "second manual readiness must not grant live write permission",
);
assertIncludes(
  files.secondManualReadiness,
  "npm run recall:second-manual:production-command",
  "second manual readiness must point operators to the current no-live production handoff command",
);
assertIncludes(
  files.secondManualReadiness,
  "npm run recall:second-manual:production-apply",
  "second manual readiness must point operators to the guarded production apply command after exact approval",
);
assertIncludes(
  files.secondManualReadinessSmoke,
  "ready fixture exposes second manual verification as the active blocked requirement",
  "second manual readiness smoke must prove active blocked requirement output",
);
assertIncludes(
  files.secondManualReadinessSmoke,
  "ready fixture points to the current no-live handoff and guarded production apply commands",
  "second manual readiness smoke must prove current safe-next production commands",
);
assertIncludes(
  files.secondManualReadinessSmoke,
  "ready fixture omits the older manual verification apply alias",
  "second manual readiness smoke must reject stale manual verification apply alias guidance",
);
assertIncludes(
  files.secondManualReadinessSmoke,
  "wrong_active_blocked_requirement",
  "second manual readiness smoke must reject scheduler-ready active requirement",
);
assertIncludes(
  files.secondManualReadinessSmoke,
  "ready fixture passes without granting live write permission",
  "second manual readiness smoke must prove the approval-ready fixture",
);
assertIncludes(
  files.secondManualCommand,
  "check-recall-live-spike-reports.mjs",
  "second manual command builder must validate selected SPIKE reports",
);
assertIncludes(
  files.secondManualCommand,
  "BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH",
  "second manual command builder must print the resolved SPIKE-013 path env var",
);
assertIncludes(
  files.secondManualCommand,
  "BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH",
  "second manual command builder must print the resolved SPIKE-014 path env var",
);
assertIncludes(
  files.secondManualCommandSmoke,
  "builder prints concrete report paths without placeholders",
  "second manual command builder smoke must prove concrete paths",
);
assertIncludes(
  files.secondManualReadinessSmoke,
  "scheduler-ready fixture fails",
  "second manual readiness smoke must prove scheduler-ready is not the second-run gate",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorder,
  "BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL",
  "scheduler evidence recorder must require exact scheduler approval",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorder,
  "manualCleanRuns",
  "scheduler evidence recorder must write manual clean run evidence entries",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorder,
  "check-recall-completion-evidence.mjs",
  "scheduler evidence recorder must run the strict completion evidence checker",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorder,
  "systemctl is-enabled brain-recall-sync.timer",
  "scheduler evidence recorder must collect timer enabled state",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorder,
  "systemctl is-active brain-recall-sync.timer",
  "scheduler evidence recorder must collect timer active state",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorder,
  "No scheduler timer was enabled by this command.",
  "scheduler evidence recorder must document no timer mutation",
);
assertIncludes(
  files.schedulerApprovalPacket,
  "Second manual Recall -> AI Brain production verification apply completed through the guarded production path.",
  "scheduler approval packet must reflect that the second manual verification run is complete",
);
assertIncludes(
  files.schedulerApprovalPacket,
  "manualCleanRunReadiness.cleanRunCount >= 2",
  "scheduler approval packet must tell operators to verify at least two clean manual runs before approval",
);
assertIncludes(
  files.schedulerApprovalPacket,
  "scheduled-apply-20260627T063340Z.json",
  "scheduler approval packet must record the extra approved manual verification report",
);
assertIncludes(
  files.schedulerApprovalPacket,
  "`firstRun.applyReportPath` distinct from every pre-enable manual clean-run apply report path",
  "scheduler approval packet must require the first scheduled run report to be distinct from manual run reports",
);
assertIncludes(
  files.schedulerApprovalPacket,
  "`firstRun.completedAtIso` after scheduler timer activation",
  "scheduler approval packet must require first scheduled run timing after timer activation",
);
assertIncludes(
  files.schedulerApprovalPacket,
  "npm run recall:scheduler-enable:command",
  "scheduler approval packet must include the no-live scheduler command handoff",
);
assertIncludes(
  files.schedulerApprovalPacket,
  "data/private/recall-live-spikes/scheduled-apply-20260627T050448Z.json",
  "scheduler approval packet must name the reviewed second manual apply report",
);
assertIncludes(
  files.schedulerApprovalPacket,
  "The recorder does not enable timers, call Recall, apply imports, deploy, or advance checkpoints",
  "scheduler approval packet must distinguish evidence recording from timer mutation",
);
assertIncludes(
  files.schedulerEnableCommand,
  "scheduler_enablement_command_handoff",
  "scheduler enablement command handoff must identify its mode",
);
assertIncludes(
  files.schedulerEnableCommand,
  "BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL",
  "scheduler enablement command handoff must require exact scheduler approval env",
);
assertIncludes(
  files.schedulerEnableCommand,
  "ready_for_scheduler_enablement_approval",
  "scheduler enablement command handoff must require the scheduler approval gate",
);
assertIncludes(
  files.schedulerEnableCommand,
  "scheduled-apply-20260627T050448Z.json",
  "scheduler enablement command handoff must include the reviewed second manual apply report",
);
assertIncludes(
  files.schedulerEnableCommand,
  "extractManualCleanRuns",
  "scheduler enablement command handoff must derive manual clean-run evidence from completion status",
);
assertIncludes(
  files.schedulerEnableCommand,
  "manualCleanRunConsistencyFindings",
  "scheduler enablement command handoff must compare current-gate and completion-status clean-run counts",
);
assertIncludes(
  files.schedulerEnableCommand,
  "manual_additional_guarded_apply_",
  "scheduler enablement command handoff must give extra manual runs unique evidence labels",
);
assertIncludes(
  files.schedulerEnableCommandSmoke,
  "scheduled-apply-20260627T063340Z.json",
  "scheduler enablement command smoke must prove extra manual clean-run report inclusion",
);
assertIncludes(
  files.schedulerEnableCommandSmoke,
  "scheduled-apply-20260627T073114Z.json",
  "scheduler enablement command smoke must prove latest extra manual clean-run report inclusion",
);
assertIncludes(
  files.schedulerEnableCommandSmoke,
  "scheduled-apply-20260627T075410Z.json",
  "scheduler enablement command smoke must prove fifth extra manual clean-run report inclusion",
);
assertIncludes(
  files.schedulerEnableCommandSmoke,
  "scheduled-apply-20260627T082621Z.json",
  "scheduler enablement command smoke must prove sixth extra manual clean-run report inclusion",
);
assertIncludes(
  files.schedulerApprovalPacket,
  "manual_additional_guarded_apply_2=data/private/recall-live-spikes/scheduled-apply-20260627T063340Z.json",
  "scheduler approval packet evidence command must include the extra approved manual report",
);
assertIncludes(
  files.schedulerApprovalPacket,
  "manual_additional_guarded_apply_3=data/private/recall-live-spikes/scheduled-apply-20260627T073114Z.json",
  "scheduler approval packet evidence command must include the latest extra approved manual report",
);
assertIncludes(
  files.schedulerApprovalPacket,
  "manual_additional_guarded_apply_4=data/private/recall-live-spikes/scheduled-apply-20260627T075410Z.json",
  "scheduler approval packet evidence command must include the fifth extra approved manual report",
);
assertIncludes(
  files.schedulerApprovalPacket,
  "manual_additional_guarded_apply_5=data/private/recall-live-spikes/scheduled-apply-20260627T082621Z.json",
  "scheduler approval packet evidence command must include the sixth extra approved manual report",
);
assertIncludes(
  files.schedulerEnableCommand,
  "<first-scheduled-service-run-apply-report>.json",
  "scheduler enablement command handoff must keep first scheduled run report as an explicit placeholder",
);
assertIncludes(
  files.schedulerEnableCommand,
  "recall:scheduler-evidence:command",
  "scheduler enablement command handoff must point to the post-enable first-run evidence handoff",
);
assertIncludes(
  files.schedulerEnableCommand,
  "systemctl enable --now brain-recall-sync.timer",
  "scheduler enablement command handoff must print the timer enablement command only as handoff text",
);
assertIncludes(
  files.schedulerEnableCommand,
  "sudo systemctl disable --now brain-recall-sync.timer",
  "scheduler enablement command handoff must print the emergency disable command",
);
assertIncludes(
  files.schedulerEnableCommand,
  "This handoff command is no-live/no-write",
  "scheduler enablement command handoff must document no-live/no-write behavior",
);
assertIncludes(
  files.schedulerEnableCommandSmoke,
  "scheduler handoff prints exact approval and command sequence without running it",
  "scheduler enablement command smoke must prove the printed command is not executed",
);
assertIncludes(
  files.schedulerEnableCommandSmoke,
  "scheduler handoff detects exact scheduler approval env without mutating production",
  "scheduler enablement command smoke must prove approval env presence is still no-live",
);
assertIncludes(
  files.schedulerEnableCommandSmoke,
  "scheduler handoff requires current-gate and completion-status clean-run count agreement",
  "scheduler enablement command smoke must prove current-gate/completion count agreement",
);
assertIncludes(
  files.schedulerEnableCommand,
  "--smoke-current-gate-clean-run-count",
  "scheduler enablement command handoff must expose a smoke-only current-gate count override",
);
assertIncludes(
  files.schedulerEnableCommandSmoke,
  "scheduler handoff rejects current-gate/completion clean-run count mismatch",
  "scheduler enablement command smoke must prove count mismatch rejection",
);
assertIncludes(
  files.schedulerEnableCommandSmoke,
  "manual_clean_run_count_mismatch",
  "scheduler enablement command smoke must assert the mismatch finding id",
);
assertIncludes(
  files.schedulerEnableCommandSmoke,
  "scheduler handoff includes first scheduled run report placeholder",
  "scheduler enablement command smoke must prove the first scheduled run report placeholder",
);
assertIncludes(
  files.schedulerEnableCommandSmoke,
  "scheduler handoff points to post-enable first-run evidence command",
  "scheduler enablement command smoke must prove the post-enable first-run evidence handoff pointer",
);
assertIncludes(
  files.schedulerEvidenceCommand,
  "scheduler_first_run_evidence_command_handoff",
  "scheduler first-run evidence command handoff must identify its mode",
);
assertIncludes(
  files.schedulerEvidenceCommand,
  "manualCleanRunConsistencyFindings",
  "scheduler first-run evidence handoff must compare current-gate and completion-status clean-run counts",
);
assertIncludes(
  files.schedulerEvidenceCommand,
  "readOnlyFirstRunInspection",
  "scheduler first-run evidence command handoff must print read-only inspection commands",
);
assertIncludes(
  files.schedulerEvidenceCommand,
  "reviewCandidateFirstRunReport",
  "scheduler first-run evidence command handoff must print candidate apply-report review command",
);
assertIncludes(
  files.schedulerEvidenceCommand,
  "systemctl show brain-recall-sync.timer --property=ActiveEnterTimestamp",
  "scheduler first-run evidence command handoff must inspect timer activation timestamp",
);
assertIncludes(
  files.schedulerEvidenceCommand,
  "systemctl show brain-recall-sync.service --property=ExecMainExitTimestamp",
  "scheduler first-run evidence command handoff must inspect service completion timestamp",
);
assertIncludes(
  files.schedulerEvidenceCommand,
  "scheduled-apply-*.json",
  "scheduler first-run evidence command handoff must help find scheduled apply reports",
);
assertIncludes(
  files.schedulerEvidenceCommand,
  "recall:scheduler-enable-evidence:record",
  "scheduler first-run evidence command handoff must print evidence recording command",
);
assertIncludes(
  files.schedulerEvidenceCommandSmoke,
  "scheduler evidence handoff prints first scheduled service-run candidate review command",
  "scheduler first-run evidence command smoke must prove candidate report review handoff",
);
assertIncludes(
  files.schedulerEvidenceCommandSmoke,
  "scheduler evidence handoff keeps first scheduled service-run placeholder explicit",
  "scheduler first-run evidence command smoke must prove explicit first-run placeholder",
);
assertIncludes(
  files.schedulerEvidenceCommandSmoke,
  "scheduler evidence handoff requires current-gate and completion-status clean-run count agreement",
  "scheduler first-run evidence command smoke must prove current-gate/completion count agreement",
);
assertIncludes(
  files.schedulerEvidenceCommand,
  "--smoke-current-gate-clean-run-count",
  "scheduler first-run evidence command handoff must expose a smoke-only current-gate count override",
);
assertIncludes(
  files.schedulerEvidenceCommandSmoke,
  "scheduler evidence handoff rejects current-gate/completion clean-run count mismatch",
  "scheduler first-run evidence command smoke must prove count mismatch rejection",
);
assertIncludes(
  files.schedulerEvidenceCommandSmoke,
  "manual_clean_run_count_mismatch",
  "scheduler first-run evidence command smoke must assert the mismatch finding id",
);
assertIncludes(
  files.schedulerEvidenceCommandSmoke,
  "scheduled-apply-20260627T075410Z.json",
  "scheduler first-run evidence command smoke must prove fifth clean manual-run report inclusion",
);
assertIncludes(
  files.schedulerEvidenceCommandSmoke,
  "scheduled-apply-20260627T082621Z.json",
  "scheduler first-run evidence command smoke must prove sixth clean manual-run report inclusion",
);
assertIncludes(
  files.schedulerEvidenceCommandSmoke,
  "scheduler evidence handoff output is no-live/no-write",
  "scheduler first-run evidence command smoke must prove no-live/no-write behavior",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorderSmoke,
  "recorder refuses without exact scheduler approval",
  "scheduler evidence recorder smoke must prove approval refusal",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorderSmoke,
  "recorder requires at least two manual clean run reports",
  "scheduler evidence recorder smoke must prove repeated-run evidence refusal",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorderSmoke,
  "duplicate_first_run_apply_report",
  "scheduler evidence recorder smoke must reject reused manual reports as first scheduled run evidence",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorder,
  "validateFirstRunApplyReportArgDistinct",
  "scheduler evidence recorder must reject reused manual reports as first scheduled run evidence before writing",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorder,
  "validateFirstRunTiming",
  "scheduler evidence recorder must reject first scheduled run reports that predate scheduler activation",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorder,
  "ActiveEnterTimestamp",
  "scheduler evidence recorder must collect timer activation timestamp from systemd",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorder,
  "remoteSystemdIso",
  "scheduler evidence recorder must normalize remote systemd timestamps before local validation",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorder,
  "date -u -d",
  "scheduler evidence recorder must ask the production host to convert systemd timestamps to ISO",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorder,
  "ExecMainExitTimestamp",
  "scheduler evidence recorder must collect latest service completion timestamp from systemd",
);
assertNotIncludes(
  files.schedulerEnableEvidenceRecorder,
  "parseSystemdIso",
  "scheduler evidence recorder must not rely on local Date.parse of systemd human timestamps",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorderSmoke,
  "strict completion evidence checker rejects forged duplicate first scheduled service run evidence",
  "scheduler evidence recorder smoke must prove strict evidence checker rejects forged duplicate first-run evidence",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorderSmoke,
  "recorder rejects first scheduled service run evidence completed before scheduler activation",
  "scheduler evidence recorder smoke must prove recorder rejects stale first-run timing before writing",
);
assertIncludes(
  files.schedulerEnableEvidenceRecorderSmoke,
  "strict completion evidence checker rejects forged stale first scheduled service run evidence",
  "scheduler evidence recorder smoke must prove strict evidence checker rejects stale first-run timing evidence",
);
assertIncludes(
  files.syncCli,
  "MAX_PROOF_FUTURE_SKEW_MS",
  "sync CLI must define a future-dated proof skew guard",
);
assertIncludes(
  files.syncCli,
  "verifyProofFileFreshness",
  "sync CLI must centralize proof file freshness checks",
);
assertIncludes(
  files.syncCli,
  "mtime is more than 1 minute in the future",
  "sync CLI must reject future-dated proof files",
);
assertNotIncludes(files.deploy, "enable brain-recall-sync.timer", "deploy must not enable timer");
assertNotIncludes(files.deploy, "start brain-recall-sync.timer", "deploy must not start timer");

console.log("[check:recall-scheduler-artifacts] ok");

function read(path) {
  return readFileSync(path, "utf8");
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    console.error(`[check:recall-scheduler-artifacts] ${message}`);
    console.error(`missing: ${needle}`);
    process.exit(1);
  }
}

function assertNotIncludes(haystack, needle, message) {
  if (haystack.includes(needle)) {
    console.error(`[check:recall-scheduler-artifacts] ${message}`);
    console.error(`forbidden: ${needle}`);
    process.exit(1);
  }
}
