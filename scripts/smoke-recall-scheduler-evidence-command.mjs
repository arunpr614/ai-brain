#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const json = runCommand(["--json", "--skip-checks-for-smoke"]);
assert(json.status === 0, `scheduler evidence handoff JSON should pass\n${json.stderr}`);
const parsed = JSON.parse(json.stdout);

assert(parsed.ok === true, "scheduler evidence handoff should be ok");
assert(parsed.mode === "scheduler_first_run_evidence_command_handoff", "scheduler evidence handoff mode should be explicit");
assert(parsed.noLiveNoWrite === true, "scheduler evidence handoff should be no-live/no-write");
assert(
  parsed.handoffProgress.stoppedAt === "ready_for_post_enable_first_run_evidence",
  "scheduler evidence handoff should stop at post-enable first-run evidence readiness",
);
assert(parsed.handoffProgress.schedulerEnablementAttempted === false, "scheduler evidence handoff should not enable scheduler");
assert(parsed.handoffProgress.liveWriteAttempted === false, "scheduler evidence handoff should not call Recall or run apply");
assert(parsed.handoffProgress.checkpointAdvanced === false, "scheduler evidence handoff should not advance checkpoints");
assert(parsed.handoffProgress.evidenceRecorded === false, "scheduler evidence handoff should not write evidence");
assert(
  parsed.checks.currentGate.cleanRunCount === parsed.checks.completionStatus.cleanRunCount,
  "handoff should require current-gate and completion-status clean-run counts to match",
);
assert(parsed.manualCleanRuns.length === parsed.checks.completionStatus.cleanRunCount, "handoff should include every counted manual run");
assert(
  parsed.commands.readOnlyFirstRunInspection.includes("systemctl show brain-recall-sync.timer --property=ActiveEnterTimestamp") &&
    parsed.commands.readOnlyFirstRunInspection.includes("systemctl show brain-recall-sync.service --property=ExecMainExitTimestamp") &&
    parsed.commands.readOnlyFirstRunInspection.includes("scheduled-apply-*.json"),
  "handoff should print read-only timer/service/report inspection command",
);
assert(
  parsed.commands.reviewCandidateFirstRunReport.includes("scripts/check-recall-apply-report.mjs") &&
    parsed.commands.reviewCandidateFirstRunReport.includes(
      "data/private/recall-live-spikes/<first-scheduled-service-run-apply-report>.json",
    ),
  "handoff should print candidate first-run report review command with placeholder",
);
assert(
  parsed.commands.evidenceRecording.includes(
    "--manual-clean-run manual_additional_guarded_apply_2='data/private/recall-live-spikes/scheduled-apply-20260627T063340Z.json'",
  ),
  "handoff should include the additional approved manual report",
);
assert(
  parsed.commands.evidenceRecording.includes(
    "--manual-clean-run manual_additional_guarded_apply_3='data/private/recall-live-spikes/scheduled-apply-20260627T073114Z.json'",
  ),
  "handoff should include the fourth approved manual report",
);
assert(
  parsed.commands.evidenceRecording.includes(
    "--manual-clean-run manual_additional_guarded_apply_4='data/private/recall-live-spikes/scheduled-apply-20260627T075410Z.json'",
  ),
  "handoff should include the fifth approved manual report",
);
assert(
  parsed.commands.evidenceRecording.includes(
    "--manual-clean-run manual_additional_guarded_apply_5='data/private/recall-live-spikes/scheduled-apply-20260627T082621Z.json'",
  ),
  "handoff should include the sixth approved manual report",
);
assert(
  parsed.commands.evidenceRecording.includes(
    "--first-run-apply-report 'data/private/recall-live-spikes/<first-scheduled-service-run-apply-report>.json'",
  ),
  "handoff should keep first scheduled service-run report placeholder explicit",
);
assert(
  parsed.commands.verification.includes("npm run recall:daily-sync:completion-status -- --require-complete"),
  "handoff should print final completion status verification",
);
assertNoSecret(json.stdout, "scheduler evidence handoff JSON");

const mismatchedCountJson = runCommand(["--json", "--skip-checks-for-smoke", "--smoke-current-gate-clean-run-count", "5"]);
assert(mismatchedCountJson.status === 1, "scheduler evidence handoff should fail closed when current-gate count lags completion status");
const mismatchedParsed = parseCommandJson(mismatchedCountJson.stderr || mismatchedCountJson.stdout);
assert(mismatchedParsed.ok === false, "mismatched clean-run count evidence handoff should not be ok");
assert(
  mismatchedParsed.findings.some((finding) => finding.id === "manual_clean_run_count_mismatch"),
  "mismatched clean-run count evidence handoff should explain the count mismatch",
);
assert(
  mismatchedParsed.handoffProgress.stoppedAt === "first_run_evidence_handoff_precheck_failed",
  "mismatched clean-run count evidence handoff should stop before first-run evidence readiness",
);
assert(mismatchedParsed.handoffProgress.evidenceRecorded === false, "mismatch should not write evidence");
assertNoSecret(mismatchedCountJson.stderr || mismatchedCountJson.stdout, "scheduler evidence handoff mismatched count JSON");

const markdown = runCommand(["--skip-checks-for-smoke"]);
assert(markdown.status === 0, `scheduler evidence handoff markdown should pass\n${markdown.stderr}`);
assert(markdown.stdout.includes("# Recall Scheduler First-Run Evidence Handoff"), "markdown should include title");
assert(markdown.stdout.includes("Read-Only First-Run Inspection"), "markdown should include inspection section");
assert(markdown.stdout.includes("Candidate Apply Report Review"), "markdown should include candidate review section");
assert(markdown.stdout.includes("Evidence Recording"), "markdown should include evidence recording section");
assertNoSecret(markdown.stdout, "scheduler evidence handoff markdown");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "scheduler evidence handoff verifies scheduler-ready fixture",
        "scheduler evidence handoff prints read-only timer/service/report inspection command",
        "scheduler evidence handoff prints first scheduled service-run candidate review command",
        "scheduler evidence handoff includes every counted manual clean run report",
        "scheduler evidence handoff requires current-gate and completion-status clean-run count agreement",
        "scheduler evidence handoff rejects current-gate/completion clean-run count mismatch",
        "scheduler evidence handoff includes the sixth approved manual clean run report",
        "scheduler evidence handoff keeps first scheduled service-run placeholder explicit",
        "scheduler evidence handoff prints evidence recording and final verification commands",
        "scheduler evidence handoff output is no-live/no-write",
        "scheduler evidence handoff output does not print secret-shaped values",
      ],
      noLiveNoWrite: true,
    },
    null,
    2,
  ),
);

function runCommand(args) {
  return spawnSync(process.execPath, ["--", "scripts/print-recall-scheduler-evidence-command.mjs", ...args], {
    cwd: process.cwd(),
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
