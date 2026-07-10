#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const APPROVAL =
  "I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.";
const FIRST_APPLY_APPROVAL =
  "I approve the first capped Recall -> AI Brain apply for the 2026-06-16 window, capped at 5 planned imports, using the accepted live-spike proof, reviewed dry-run proof, backup proof, and explicit fidelity flags for unverified and metadata-only Recall content.";

const json = runCommand(["--json", "--skip-status-for-smoke", "--skip-remote-preflight-for-smoke"]);
assert(json.status === 0, `production command handoff JSON should pass\n${json.stderr}`);
const parsed = JSON.parse(json.stdout);
assert(parsed.ok === true, "production command handoff JSON should be ok");
assert(parsed.noLiveNoWrite === true, "production command handoff should be no-live/no-write");
assert(parsed.approvalRequired === true, "production command handoff should require approval");
assert(parsed.approvalTextPrinted === true, "production command handoff should disclose that approval text is printed");
assert(parsed.approvalStatus.requiredEnv === "BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL", "approval status should name the required env");
assert(parsed.approvalStatus.currentGate === "second_manual_verification_run", "approval status should name the current gate");
assert(parsed.approvalStatus.firstApplyApprovalPresent === false, "baseline handoff should not see first-apply approval");
assert(parsed.completionStatus.skipped === true, "smoke should skip real completion status");
assert(parsed.remotePreflight.skipped === true, "smoke should skip real remote preflight");
assert(parsed.handoffProgress.stoppedAt === "ready_for_exact_approval", "handoff progress should be ready for exact approval");
assert(parsed.handoffProgress.readyForExactApproval === true, "handoff progress should mark exact approval as the next action");
assert(
  parsed.handoffProgress.localPrivateGatesSkippedForProductionPath === true,
  "handoff progress should show local private gates are not blocking",
);
assert(parsed.handoffProgress.localGateStatus === "not_blocking_production_path", "handoff progress should classify local gates");
assert(parsed.handoffProgress.liveWriteAttempted === false, "handoff progress should remain no-live/no-write");
assert(
  parsed.handoffProgress.liveCallNotAttemptedBecause.includes("exact second-manual approval is the next required action"),
  "handoff progress should explain that exact approval is the next live-write action",
);
assert(parsed.localReportDir.path === "data/private/recall-live-spikes", "handoff should expose the default private local report dir");
assert(parsed.localReportDir.underPrivateRecallEvidencePath === true, "default local report dir should be private");
assert(parsed.localReportDir.runnerDefault === true, "default local report dir should be marked as runner default");
assert(parsed.command.includes(`BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL='${APPROVAL}'`), "command should include exact approval env");
assert(parsed.command.includes("npm run recall:second-manual:production-apply"), "command should call the guarded production runner");
assert(!parsed.command.includes("--local-report-dir"), "default command should not need an explicit local report dir override");
assert(parsed.commandNotes.some((note) => note.includes("Printing this command is not approval")), "notes should distinguish printing from approval");
assert(parsed.commandNotes.some((note) => note.includes("First capped apply approval is already spent")), "notes should classify first-apply approval as stale");
assert(parsed.commandNotes.some((note) => note.includes("does not enable the scheduler")), "notes should keep scheduler separate");
assertNoSecret(json.stdout, "production command JSON");

const staleJson = runCommand(["--json", "--skip-status-for-smoke", "--skip-remote-preflight-for-smoke"], {
  BRAIN_RECALL_FIRST_APPLY_APPROVAL: FIRST_APPLY_APPROVAL,
});
assert(staleJson.status === 0, `production command handoff with stale approval should still print handoff\n${staleJson.stderr}`);
const staleParsed = JSON.parse(staleJson.stdout);
assert(staleParsed.approvalStatus.firstApplyApprovalPresent === true, "handoff should detect stale first-apply approval env");
assert(
  staleParsed.commandNotes.some((note) => note.includes("first capped apply approval is present in the environment")),
  "handoff should warn when stale first-apply approval is present",
);
assertNoSecret(staleJson.stdout, "production command stale-approval JSON");

const privateOverrideJson = runCommand(
  ["--json", "--skip-status-for-smoke", "--skip-remote-preflight-for-smoke", "--local-report-dir", "data/private/recall-live-spikes/handoff-smoke"],
);
assert(privateOverrideJson.status === 0, `production command handoff should allow private local report dir override\n${privateOverrideJson.stderr}`);
const privateOverrideParsed = JSON.parse(privateOverrideJson.stdout);
assert(privateOverrideParsed.localReportDir.underPrivateRecallEvidencePath === true, "private local report dir override should be accepted");
assert(privateOverrideParsed.localReportDir.runnerDefault === false, "private local report dir override should not be marked as default");
assert(
  privateOverrideParsed.command.includes("--local-report-dir 'data/private/recall-live-spikes/handoff-smoke'"),
  "private local report dir override should be printed in the command",
);
assertNoSecret(privateOverrideJson.stdout, "production command private-local-report-dir JSON");

const unsafeOverrideJson = runCommand(
  ["--json", "--skip-status-for-smoke", "--skip-remote-preflight-for-smoke", "--local-report-dir", "docs/plans/recall-sync/unsafe-handoff-report-cache"],
);
assert(unsafeOverrideJson.status === 1, "production command handoff should refuse public local report dir overrides");
const unsafeOverrideParsed = JSON.parse(unsafeOverrideJson.stderr);
assert(
  unsafeOverrideParsed.findings.some((finding) => finding.id === "local_apply_report_dir_not_private"),
  "unsafe local report dir override should produce explicit finding",
);
assert(unsafeOverrideParsed.localReportDir.underPrivateRecallEvidencePath === false, "unsafe local report dir should be reported as not private");
assert(unsafeOverrideParsed.command === null, "unsafe local report dir handoff should withhold the runnable command");
assert(
  unsafeOverrideParsed.completionStatus.skipped === true &&
    unsafeOverrideParsed.completionStatus.status === "blocked_local_report_dir_not_private",
  "unsafe local report dir handoff should skip completion status checks",
);
assert(
  unsafeOverrideParsed.remotePreflight.skipped === true &&
    unsafeOverrideParsed.remotePreflight.status === "blocked_local_report_dir_not_private",
  "unsafe local report dir handoff should skip remote preflight",
);
assert(
  unsafeOverrideParsed.handoffProgress.stoppedAt === "local_report_dir_private_gate",
  "unsafe local report dir handoff should classify the local report-dir private gate",
);
assert(
  unsafeOverrideParsed.handoffProgress.remotePreflightAttempted === false,
  "unsafe local report dir handoff should report no remote preflight attempt",
);
assert(
  unsafeOverrideParsed.handoffProgress.liveCallNotAttemptedBecause ===
    "local apply-report copy directory is outside private Recall evidence",
  "unsafe local report dir handoff should explain the local privacy stop",
);
assertNoSecret(unsafeOverrideJson.stderr, "production command unsafe-local-report-dir JSON");

const markdown = runCommand(["--skip-status-for-smoke", "--skip-remote-preflight-for-smoke"]);
assert(markdown.status === 0, `production command handoff markdown should pass\n${markdown.stderr}`);
assert(markdown.stdout.includes("# Recall Second Manual Production Apply Command"), "markdown should include title");
assert(markdown.stdout.includes("## Approved Production Runner Command"), "markdown should include command section");
assert(markdown.stdout.includes("Handoff progress"), "markdown should include progress section");
assert(markdown.stdout.includes("ready_for_exact_approval"), "markdown should identify exact approval as next gate");
assert(markdown.stdout.includes("Local private gates blocking: `false`"), "markdown should say local private gates are not blocking");
assert(markdown.stdout.includes("Printing this command is not approval"), "markdown should include approval warning");
assert(markdown.stdout.includes("npm run recall:second-manual:production-apply"), "markdown should include production runner");
assert(markdown.stdout.includes("Local apply-report directory"), "markdown should include local report dir visibility");
assertNoSecret(markdown.stdout, "production command markdown");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "production command handoff prints the guarded production runner command",
        "production command handoff distinguishes printing from live approval",
        "production command handoff classifies first-apply approval as stale for this gate",
        "production command handoff surfaces the private local apply-report directory",
        "production command handoff refuses unsafe local apply-report directory overrides",
        "production command handoff short-circuits unsafe local report-dir overrides before remote preflight",
        "production command handoff reports exact approval as the next live-write action",
        "production command handoff reports local private gates are not blocking the production path",
        "production command handoff keeps scheduler enablement separate",
        "production command handoff output is no-live/no-write",
        "production command handoff output does not print secret-shaped values",
      ],
      noLiveNoWrite: true,
    },
    null,
    2,
  ),
);

function runCommand(args, env = {}) {
  return spawnSync(
    process.execPath,
    ["--", "scripts/print-recall-second-manual-production-apply-command.mjs", ...args],
    {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );
}

function assertNoSecret(text, label) {
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(text), `${label} should not print secret-shaped API keys`);
  assert(!/\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/i.test(text), `${label} should not print bearer tokens`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
