#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const APPROVAL =
  "I approve enabling the production Recall -> AI Brain daily scheduler after at least two clean manual runs, using the deployed scheduler artifacts, the rotated private Recall env file, explicit live API confirmation, production timer brain-recall-sync.timer, and private scheduler enablement evidence recording.";

const json = runCommand(["--json", "--skip-checks-for-smoke"]);
assert(json.status === 0, `scheduler handoff JSON should pass\n${json.stderr}`);
const parsed = JSON.parse(json.stdout);
assert(parsed.ok === true, "scheduler handoff JSON should be ok");
assert(parsed.mode === "scheduler_enablement_command_handoff", "scheduler handoff mode should be explicit");
assert(parsed.noLiveNoWrite === true, "scheduler handoff should be no-live/no-write");
assert(parsed.approvalRequired === true, "scheduler handoff should require approval");
assert(parsed.approvalStatus.requiredEnv === "BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL", "scheduler approval env should be named");
assert(parsed.approvalStatus.exactApprovalPresent === false, "baseline smoke should not have exact approval");
assert(parsed.approvalStatus.approvalTextPrinted === true, "handoff should disclose that approval text is printed");
assert(parsed.handoffProgress.stoppedAt === "ready_for_exact_scheduler_approval", "handoff should be ready for exact scheduler approval");
assert(parsed.handoffProgress.schedulerEnablementAttempted === false, "handoff should not enable scheduler");
assert(parsed.handoffProgress.liveWriteAttempted === false, "handoff should not call Recall or run apply");
assert(parsed.handoffProgress.checkpointAdvanced === false, "handoff should not advance checkpoints");
assert(parsed.checks.completionStatus.cleanRunCount >= 2, "handoff should require at least two clean manual runs");
assert(
  parsed.checks.currentGate.cleanRunCount === parsed.checks.completionStatus.cleanRunCount,
  "handoff should require current-gate and completion-status clean-run counts to match",
);
assert(
  parsed.manualCleanRuns.length === parsed.checks.completionStatus.cleanRunCount,
  "handoff should include every counted manual clean run in its evidence inputs",
);
assert(parsed.commands.schedulerEnablement.includes("systemctl enable --now brain-recall-sync.timer"), "enable command should include timer enablement");
assert(parsed.commands.schedulerEnablement.includes("upsert BRAIN_RECALL_SCHEDULER_ENABLED 1"), "enable command should set scheduler flag");
assert(
  parsed.commands.schedulerEnablement.includes("^(export[[:space:]]+)?${key}="),
  "enable command should update exported and unexported env lines",
);
assert(
  parsed.commands.schedulerEnablement.includes("export ${key}=${value}"),
  "enable command should write scheduler flags as exported env lines",
);
assert(parsed.commands.evidenceRecording.includes(`BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL='${APPROVAL}'`), "evidence command should include exact approval");
assert(
  parsed.commands.evidenceRecording.includes(
    "--manual-clean-run manual_second_guarded_apply='data/private/recall-live-spikes/scheduled-apply-20260627T050448Z.json'",
  ),
  "evidence command should include the reviewed second manual apply report",
);
assert(
  parsed.commands.evidenceRecording.includes(
    "--manual-clean-run manual_additional_guarded_apply_2='data/private/recall-live-spikes/scheduled-apply-20260627T063340Z.json'",
  ),
  "evidence command should include the additional approved manual apply report with a unique kind",
);
assert(
  parsed.commands.evidenceRecording.includes(
    "--manual-clean-run manual_additional_guarded_apply_3='data/private/recall-live-spikes/scheduled-apply-20260627T073114Z.json'",
  ),
  "evidence command should include the fourth approved manual apply report with a unique kind",
);
assert(
  parsed.commands.evidenceRecording.includes(
    "--manual-clean-run manual_additional_guarded_apply_4='data/private/recall-live-spikes/scheduled-apply-20260627T075410Z.json'",
  ),
  "evidence command should include the fifth approved manual apply report with a unique kind",
);
assert(
  parsed.commands.evidenceRecording.includes(
    "--manual-clean-run manual_additional_guarded_apply_5='data/private/recall-live-spikes/scheduled-apply-20260627T082621Z.json'",
  ),
  "evidence command should include the sixth approved manual apply report with a unique kind",
);
assert(
  parsed.commands.evidenceRecording.includes("data/private/recall-live-spikes/<first-scheduled-service-run-apply-report>.json"),
  "evidence command should keep first scheduled run report as an explicit placeholder",
);
assert(
  parsed.commands.firstRunEvidenceHandoff === "npm run recall:scheduler-evidence:command",
  "handoff should point to the post-enable first-run evidence command handoff",
);
assert(parsed.commands.verification.includes("npm run recall:daily-sync:completion-status -- --require-complete"), "verification should include require-complete");
assert(parsed.commandNotes.some((note) => note.includes("Printing this handoff is not approval")), "notes should distinguish handoff from approval");
assert(
  parsed.commandNotes.some((note) => note.includes("npm run recall:scheduler-evidence:command")),
  "notes should point operators to the post-enable first-run evidence handoff",
);
assert(
  parsed.commandNotes.some((note) => note.includes("The evidence recorder validates and records private evidence only")),
  "notes should distinguish evidence recording from timer mutation",
);
assertNoSecret(json.stdout, "scheduler handoff JSON");

const approvedJson = runCommand(["--json", "--skip-checks-for-smoke"], {
  BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL: APPROVAL,
});
assert(approvedJson.status === 0, "scheduler handoff should still be no-live when exact approval env is present");
const approvedParsed = JSON.parse(approvedJson.stdout);
assert(approvedParsed.approvalStatus.exactApprovalPresent === true, "handoff should detect exact scheduler approval env");
assert(approvedParsed.handoffProgress.schedulerEnablementAttempted === false, "approval env presence should not enable scheduler");
assertNoSecret(approvedJson.stdout, "scheduler handoff approved JSON");

const mismatchedCountJson = runCommand(["--json", "--skip-checks-for-smoke", "--smoke-current-gate-clean-run-count", "5"]);
assert(mismatchedCountJson.status === 1, "scheduler handoff should fail closed when current-gate count lags completion status");
const mismatchedParsed = parseCommandJson(mismatchedCountJson.stderr || mismatchedCountJson.stdout);
assert(mismatchedParsed.ok === false, "mismatched clean-run count handoff should not be ok");
assert(
  mismatchedParsed.findings.some((finding) => finding.id === "manual_clean_run_count_mismatch"),
  "mismatched clean-run count handoff should explain the count mismatch",
);
assert(
  mismatchedParsed.handoffProgress.stoppedAt === "scheduler_handoff_precheck_failed",
  "mismatched clean-run count handoff should stop before scheduler approval readiness",
);
assert(mismatchedParsed.handoffProgress.schedulerEnablementAttempted === false, "mismatch should not enable scheduler");
assertNoSecret(mismatchedCountJson.stderr || mismatchedCountJson.stdout, "scheduler handoff mismatched count JSON");

const markdown = runCommand(["--skip-checks-for-smoke"]);
assert(markdown.status === 0, `scheduler handoff markdown should pass\n${markdown.stderr}`);
assert(markdown.stdout.includes("# Recall Scheduler Enablement Command Handoff"), "markdown should include title");
assert(markdown.stdout.includes("Approved Scheduler Enablement Command"), "markdown should include enablement command section");
assert(markdown.stdout.includes("Evidence Recording Command"), "markdown should include evidence command section");
assert(markdown.stdout.includes("Emergency Disable"), "markdown should include rollback command section");
assert(markdown.stdout.includes("Printing this handoff is not approval"), "markdown should include approval warning");
assertNoSecret(markdown.stdout, "scheduler handoff markdown");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "scheduler handoff verifies ready scheduler approval fixture",
        "scheduler handoff prints exact approval and command sequence without running it",
        "scheduler handoff detects exact scheduler approval env without mutating production",
        "scheduler handoff includes every counted manual clean run report",
        "scheduler handoff requires current-gate and completion-status clean-run count agreement",
        "scheduler handoff rejects current-gate/completion clean-run count mismatch",
        "scheduler handoff gives duplicate-source manual runs unique evidence labels",
        "scheduler handoff includes the sixth approved manual clean run report",
        "scheduler handoff includes first scheduled run report placeholder",
        "scheduler handoff points to post-enable first-run evidence command",
        "scheduler handoff includes verification and emergency disable commands",
        "scheduler handoff output is no-live/no-write",
        "scheduler handoff output does not print secret-shaped values",
      ],
      noLiveNoWrite: true,
    },
    null,
    2,
  ),
);

function runCommand(args, env = {}) {
  const childEnv = { ...process.env, ...env };
  if (!Object.hasOwn(env, "BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL")) {
    delete childEnv.BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL;
  }
  return spawnSync(process.execPath, ["--", "scripts/print-recall-scheduler-enable-command.mjs", ...args], {
    cwd: process.cwd(),
    env: childEnv,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

function assertNoSecret(text, label) {
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(text), `${label} should not print secret-shaped API keys`);
  assert(!/\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/i.test(text), `${label} should not print bearer tokens`);
}

function parseCommandJson(text) {
  const value = String(text ?? "");
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  assert(start >= 0 && end > start, "expected command output to include JSON");
  return JSON.parse(value.slice(start, end + 1));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
