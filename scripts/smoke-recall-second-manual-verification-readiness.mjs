#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const privateRoot = resolve("data/private/recall-live-spikes");
mkdirSync(privateRoot, { recursive: true });
const scratch = mkdtempSync(join(privateRoot, "second-manual-readiness-smoke-"));

try {
  const ready = runReadiness(writeFixtures("ready", completionStatusFixture({ gate: "second_manual_verification_run", cleanRuns: 1 })));
  assert(ready.status === 0, "ready fixture should pass");
  const readyJson = JSON.parse(ready.stdout);
  assert(readyJson.ok === true, "ready fixture should report ok true");
  assert(
    readyJson.status === "ready_for_second_manual_verification_approval",
    "ready fixture should report approval-ready status",
  );
  assert(readyJson.liveWriteAllowedNow === false, "readiness must not grant live write permission");
  assert(readyJson.schedulerAllowedNow === false, "readiness must not grant scheduler permission");
  assert(
    readyJson.activeBlockedRequirement === "second_manual_verification",
    "readiness should expose second manual verification as the active blocked requirement",
  );
  assert(
    readyJson.blockedRequirements.includes("scheduler_enablement"),
    "readiness should preserve scheduler enablement as the broader completion requirement",
  );
  assert(
    readyJson.checked.find((entry) => entry.id === "completion_status")?.activeBlockedRequirement ===
      "second_manual_verification",
    "readiness checked summary should include the active blocked requirement",
  );
  assert(readyJson.manualCleanRunReadiness.cleanRunCount === 1, "ready fixture should count one clean run");
  assert(
    readyJson.safeNextCommands.some((command) => command.includes("npm run recall:second-manual:production-command")),
    "readiness should point to the current no-live production handoff command",
  );
  assert(
    readyJson.safeNextCommands.some((command) => command.includes("npm run recall:second-manual:production-apply")),
    "readiness should point to the guarded production apply command only after exact approval",
  );
  assert(
    readyJson.safeNextCommands.every((command) => !command.includes("npm run recall:manual-verification-apply")),
    "readiness safe-next commands should not mention the older manual verification apply alias",
  );
  assert(
    readyJson.nextAction.includes("npm run recall:second-manual:production-command") &&
      readyJson.nextAction.includes("npm run recall:second-manual:production-apply"),
    "readiness next action should name the current handoff and guarded apply path",
  );
  assertNoSecret(ready.stdout, "ready output");

  const schedulerGate = runReadiness(
    writeFixtures("scheduler-gate", completionStatusFixture({ gate: "scheduler_enablement", cleanRuns: 2 })),
  );
  assert(schedulerGate.status === 1, "scheduler-gate fixture should fail second manual readiness");
  assert(
    schedulerGate.stderr.includes("wrong_current_gate") &&
      schedulerGate.stderr.includes("wrong_completion_status") &&
      schedulerGate.stderr.includes("wrong_active_blocked_requirement") &&
      schedulerGate.stderr.includes("second_manual_run_not_needed"),
    "scheduler-gate fixture should explain the wrong status, active requirement, gate, and that second manual run is not needed",
  );
  assertNoSecret(schedulerGate.stdout + schedulerGate.stderr, "scheduler-gate output");

  const missingDeploy = runReadiness(
    writeFixtures(
      "missing-deploy",
      completionStatusFixture({
        gate: "second_manual_verification_run",
        cleanRuns: 1,
        requirementOverrides: { production_deploy: false },
      }),
    ),
  );
  assert(missingDeploy.status === 1, "missing deploy fixture should fail");
  assert(
    missingDeploy.stderr.includes("required_completion_requirement_not_done") &&
      missingDeploy.stderr.includes("production_deploy"),
    "missing deploy fixture should name the missing production deploy requirement",
  );
  assertNoSecret(missingDeploy.stdout + missingDeploy.stderr, "missing deploy output");

  const noPriorRun = runReadiness(
    writeFixtures("no-prior-run", completionStatusFixture({ gate: "second_manual_verification_run", cleanRuns: 0 })),
  );
  assert(noPriorRun.status === 1, "no-prior-run fixture should fail");
  assert(noPriorRun.stderr.includes("no_prior_clean_manual_run"), "no-prior-run fixture should require first clean run");
  assertNoSecret(noPriorRun.stdout + noPriorRun.stderr, "no-prior-run output");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "ready fixture passes without granting live write permission",
          "ready fixture exposes second manual verification as the active blocked requirement",
          "ready fixture points to the current no-live handoff and guarded production apply commands",
          "ready fixture omits the older manual verification apply alias",
          "scheduler-ready fixture fails because second manual run is no longer the active gate",
          "missing production deploy evidence fails readiness",
          "zero prior clean manual runs fails readiness",
          "readiness output does not print secret-shaped values",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function writeFixtures(prefix, completionStatus) {
  return {
    completionStatus: writeJson(`${prefix}-completion-status.json`, completionStatus),
    approvalPacket: writeJson(`${prefix}-approval-packet.json`, { ok: true }),
    publicDocsPrivacy: writeJson(`${prefix}-public-docs-privacy.json`, { ok: true, scannedFiles: 60 }),
    schedulerArtifacts: writeJson(`${prefix}-scheduler-artifacts.json`, {
      ok: true,
      verdict: "PASS_RECALL_SCHEDULER_ARTIFACTS_STATIC_CHECK",
    }),
    manualWrapperSmoke: writeJson(`${prefix}-manual-wrapper-smoke.json`, { ok: true }),
  };
}

function runReadiness(paths) {
  return spawnSync(
    process.execPath,
    [
      "--",
      resolve("scripts/check-recall-second-manual-verification-readiness.mjs"),
      "--completion-status-result",
      paths.completionStatus,
      "--approval-packet-result",
      paths.approvalPacket,
      "--public-docs-privacy-result",
      paths.publicDocsPrivacy,
      "--scheduler-artifacts-result",
      paths.schedulerArtifacts,
      "--manual-wrapper-smoke-result",
      paths.manualWrapperSmoke,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
}

function completionStatusFixture({ gate, cleanRuns, requirementOverrides = {} }) {
  const requirementIds = [
    "live_spike_proof",
    "private_live_diagnostic_proof",
    "approval_packet_and_public_privacy",
    "first_apply_key_and_proof_readiness",
    "first_capped_apply",
    "post_apply_review",
    "scheduler_artifacts",
    "production_deploy",
  ];
  const requirements = requirementIds.map((id) => ({
    id,
    ok: requirementOverrides[id] ?? true,
    status: requirementOverrides[id] === false ? "blocked_or_unverified" : "done",
  }));
  const needsSecondManual = cleanRuns < 2;
  requirements.push({
    id: "scheduler_enablement",
    ok: false,
    status: "missing_scheduler_enablement_evidence",
    evidence: {
      manualCleanRunReadiness: {
        requiredManualCleanRunsBeforeSchedulerEnable: 2,
        cleanRunCount: cleanRuns,
        needsSecondManualVerificationRun: needsSecondManual,
        secondManualVerificationApprovalPacket:
          "docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md",
        schedulerEnablementApprovalAllowedByManualRunEvidence: !needsSecondManual,
        cleanRuns: Array.from({ length: cleanRuns }, (_, index) => ({
          kind: index === 0 ? "manual_first_capped_apply" : "manual_second_guarded_apply_candidate",
          applyReportPath: `data/private/recall-live-spikes/${index === 0 ? "first-apply-report" : "scheduled-apply-20260626T190000Z"}.json`,
          verdict: "PASS_POST_APPLY_REVIEW_GATE",
          ok: true,
        })),
      },
    },
  });

  return {
    ok: false,
    completionAchieved: false,
    status: gate === "second_manual_verification_run" ? "blocked_second_manual_verification_run" : "blocked_scheduler_enablement",
    noLiveNoWrite: true,
    currentBlockingGate: gate,
    activeBlockedRequirement: gate === "second_manual_verification_run" ? "second_manual_verification" : "scheduler_enablement",
    owner: "Arun",
    externalActionRequired: true,
    externalAction:
      gate === "second_manual_verification_run"
        ? "approve_second_manual_verification_run_before_scheduler_enablement"
        : "approve_scheduler_enablement_after_repeated_clean_manual_runs",
    blockedRequirements: ["scheduler_enablement"],
    blockedActions:
      gate === "second_manual_verification_run"
        ? ["second_manual_verification", "scheduler", "checkpoint"]
        : ["scheduler", "checkpoint"],
    requirements,
  };
}

function writeJson(name, value) {
  const path = join(scratch, name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  chmodSync(path, 0o600);
  return path;
}

function assertNoSecret(value, label) {
  assert(!String(value).includes("RECALL_API_KEY="), `${label} printed env contents`);
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(String(value)), `${label} printed secret-shaped value`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
