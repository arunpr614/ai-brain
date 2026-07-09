#!/usr/bin/env node
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const APPROVAL =
  "I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.";

const scratch = mkdtempSync(join(tmpdir(), "recall-second-manual-runtime-preflight-"));
const enumerationPath = join(scratch, "docs/plans/spikes/SPIKE-013-smoke.md");
const fidelityPath = join(scratch, "docs/plans/spikes/SPIKE-014-smoke.md");
const manifestPath = join(scratch, "data/private/recall-live-spikes/controlled-samples.json");
const checkpoint = "2026-06-24T15:54:17.000Z";
const freshKeyEnvPath = join(scratch, "etc/brain/fresh.env");
const staleKeyEnvPath = join(scratch, "etc/brain/stale.env");

const requiredRuntimeFiles = [
  "scripts/recall-scheduled-apply.sh",
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

try {
  mkdirSync(dirname(enumerationPath), { recursive: true });
  mkdirSync(dirname(manifestPath), { recursive: true });
  mkdirSync(join(scratch, "scripts"), { recursive: true });
  writeFileSync(enumerationPath, "# SPIKE-013 smoke proof\n", "utf8");
  writeFileSync(fidelityPath, "# SPIKE-014 smoke proof\n", "utf8");
  writeFileSync(manifestPath, "{}\n", "utf8");
  writeFileSync(
    join(scratch, "scripts/check-recall-second-manual-runtime-preflight.mjs"),
    readFileSync("scripts/check-recall-second-manual-runtime-preflight.mjs", "utf8"),
    "utf8",
  );
  for (const filePath of requiredRuntimeFiles) {
    const target = join(scratch, filePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(
      target,
      filePath === "scripts/recall-scheduled-apply.sh"
        ? readFileSync("scripts/recall-scheduled-apply.sh", "utf8")
        : filePath === "scripts/check-recall-key-rotation-evidence.mjs"
          ? readFileSync("scripts/check-recall-key-rotation-evidence.mjs", "utf8")
        : "# smoke runtime dependency\n",
      "utf8",
    );
  }
  writeKeyEnv(freshKeyEnvPath, "2026-06-24T16:00:00.000Z");
  writeKeyEnv(staleKeyEnvPath, "2026-06-24T15:00:00.000Z");

  const passed = runPreflight();
  assert(passed.status === 0, `runtime preflight should pass with production-shaped inputs\n${passed.stderr}`);
  const parsed = JSON.parse(passed.stdout);
  assert(parsed.ok === true, "runtime preflight JSON should be ok");
  assert(parsed.noLiveNoWrite === true, "runtime preflight should be no-live/no-write");
  assert(parsed.liveApplyDelegationAllowed === true, "runtime preflight should allow delegation when checks pass");

  const missingProof = runPreflight({ BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH: join(scratch, "missing.md") });
  assert(missingProof.status === 1, "runtime preflight should fail when SPIKE-013 proof path is missing");
  assert(missingProof.stderr.includes("blocked_second_manual_runtime_preflight"), "missing proof failure should be explicit");

  const schedulerEnabled = runPreflight({ BRAIN_RECALL_SCHEDULER_ENABLED: "1" });
  assert(schedulerEnabled.status === 1, "runtime preflight should fail when scheduler is enabled");
  assert(schedulerEnabled.stderr.includes("scheduler_enabled"), "scheduler failure should be explicit");

  const tooManyImports = runPreflight({ BRAIN_RECALL_MAX_IMPORTS: "6" });
  assert(tooManyImports.status === 1, "runtime preflight should fail above the second-manual import cap");
  assert(tooManyImports.stderr.includes("max_imports_cap"), "cap failure should be explicit");

  const staleKeyEvidence = runPreflight({ BRAIN_RECALL_KEY_ROTATION_ENV_FILE: staleKeyEnvPath });
  assert(staleKeyEvidence.status === 1, "runtime preflight should fail when production key evidence is stale");
  assert(staleKeyEvidence.stderr.includes("key_rotation_evidence"), "stale key evidence failure should be explicit");

  const missingRuntimeFile = runPreflight({}, ["scripts/check-recall-key-rotation-evidence.mjs"]);
  assert(missingRuntimeFile.status === 1, "runtime preflight should fail when a deployed helper is missing");
  assert(missingRuntimeFile.stderr.includes("runtime_file"), "missing helper failure should be explicit");

  writeFileSync(join(scratch, "scripts/recall-scheduled-apply.sh"), "# stale scheduled wrapper without manual guard\n", "utf8");
  const missingScheduledWrapperGuard = runPreflight();
  assert(missingScheduledWrapperGuard.status === 1, "runtime preflight should fail when scheduled wrapper guard is missing");
  assert(
    missingScheduledWrapperGuard.stderr.includes("scheduled_wrapper_manual_env_override_guard"),
    "missing scheduled wrapper guard failure should be explicit",
  );

  const output = `${passed.stdout}\n${passed.stderr}\n${missingProof.stdout}\n${missingProof.stderr}\n${schedulerEnabled.stdout}\n${schedulerEnabled.stderr}`;
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(output), "runtime preflight output should not print secret-shaped values");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "runtime preflight passes with production-shaped proof and helper files",
          "runtime preflight refuses missing SPIKE proof path",
          "runtime preflight refuses scheduler-enabled manual run",
          "runtime preflight enforces max 5 imports",
          "runtime preflight refuses stale production key rotation evidence",
          "runtime preflight refuses missing deployed helper",
          "runtime preflight refuses stale scheduled wrapper without manual env override guard",
          "runtime preflight output does not print secret-shaped values",
        ],
        noLiveNoWrite: true,
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function writeKeyEnv(path, mtimeIso) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "RECALL_API_KEY=<redacted-runtime-preflight-smoke>\nBRAIN_RECALL_CONFIRM_LIVE_API=0\n", "utf8");
  chmodSync(path, 0o640);
  const mtime = new Date(mtimeIso);
  utimesSync(path, mtime, mtime);
}

function runPreflight(overrides = {}, removeFiles = []) {
  for (const filePath of removeFiles) {
    rmSync(join(scratch, filePath), { force: true });
  }
  return spawnSync(process.execPath, ["--", "scripts/check-recall-second-manual-runtime-preflight.mjs"], {
    cwd: scratch,
    env: {
      ...process.env,
      BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL,
      BRAIN_RECALL_SYNC_ENABLED: "1",
      BRAIN_RECALL_CONFIRM_LIVE_API: "1",
      BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF: "1",
      BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH: enumerationPath,
      BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH: fidelityPath,
      BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH: manifestPath,
      BRAIN_RECALL_LIVE_SPIKE_ALLOW_FIDELITY_CHANGES: "1",
      BRAIN_RECALL_LIVE_SPIKE_ACCEPTED_FIDELITY_RISK:
        "Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used.",
      BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT: "1",
      BRAIN_RECALL_ALLOW_METADATA_ONLY_IMPORT: "1",
      BRAIN_RECALL_WARNING_UI_AVAILABLE: "1",
      BRAIN_RECALL_MAX_IMPORTS: "5",
      BRAIN_RECALL_KEY_ROTATION_ENV_FILE: freshKeyEnvPath,
      BRAIN_RECALL_KEY_ROTATED_AFTER_ISO: checkpoint,
      ...overrides,
    },
    encoding: "utf8",
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
