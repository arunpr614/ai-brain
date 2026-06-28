#!/usr/bin/env node
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const APPROVAL =
  "I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.";
const scratch = mkdtempSync(join(tmpdir(), `recall-manual-verification-apply-${process.pid}-${Date.now()}`));
const scriptsDir = join(scratch, "scripts");
const markerPath = join(scratch, "manual-verification-marker.json");
const runtimePreflightMarkerPath = join(scratch, "manual-verification-runtime-preflight-marker.jsonl");

try {
  mkdirSync(scriptsDir, { recursive: true });
  writeFileSync(join(scriptsDir, "recall-second-manual-verification-apply.sh"), readFileSync("scripts/recall-second-manual-verification-apply.sh", "utf8"), "utf8");
  writeFileSync(
    join(scriptsDir, "check-recall-second-manual-runtime-preflight.mjs"),
    `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const markerPath = process.env.SMOKE_RUNTIME_PREFLIGHT_MARKER;
if (markerPath) appendFileSync(markerPath, JSON.stringify({ status: process.env.BRAIN_RECALL_SECOND_MANUAL_RUNTIME_PREFLIGHT_STUB_FAIL === "1" ? "failed" : "passed" }) + "\\n");
if (process.env.BRAIN_RECALL_SECOND_MANUAL_RUNTIME_PREFLIGHT_STUB_FAIL === "1") {
  console.error(JSON.stringify({ ok: false, status: "blocked_second_manual_runtime_preflight", noLiveNoWrite: true }));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, status: "ready_for_second_manual_runtime_preflight", noLiveNoWrite: true }));
`,
    "utf8",
  );
  writeFileSync(
    join(scriptsDir, "recall-scheduled-apply.sh"),
    `#!/usr/bin/env bash
set -euo pipefail
node -e 'const fs=require("fs"); fs.writeFileSync(process.argv[1], JSON.stringify({manualMode: process.env.BRAIN_RECALL_MANUAL_VERIFICATION_MODE, approval: process.env.BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL, syncEnabled: process.env.BRAIN_RECALL_SYNC_ENABLED, confirmLiveApi: process.env.BRAIN_RECALL_CONFIRM_LIVE_API, schedulerEnabled: process.env.BRAIN_RECALL_SCHEDULER_ENABLED || null}, null, 2));' "${markerPath}"
echo "[recall-scheduled-apply] done dry_run_report=data/private/recall-live-spikes/scheduled-dry-run-smoke.json apply_report=data/private/recall-live-spikes/scheduled-apply-smoke.json backup=data/backups/smoke.sqlite"
`,
    "utf8",
  );
  chmodSync(join(scriptsDir, "recall-second-manual-verification-apply.sh"), 0o755);
  chmodSync(join(scriptsDir, "check-recall-second-manual-runtime-preflight.mjs"), 0o755);
  chmodSync(join(scriptsDir, "recall-scheduled-apply.sh"), 0o755);

  const wrapperSource = readFileSync("scripts/recall-second-manual-verification-apply.sh", "utf8");
  assert(!wrapperSource.includes("systemctl enable"), "manual wrapper must not enable timers");
  assert(!wrapperSource.includes("systemctl start"), "manual wrapper must not start timers");
  assert(wrapperSource.includes("BRAIN_RECALL_MANUAL_VERIFICATION_MODE=1"), "manual wrapper must set manual mode");
  assert(
    wrapperSource.includes("check-recall-second-manual-runtime-preflight.mjs"),
    "manual wrapper must run production runtime preflight before apply delegation",
  );

  const scheduledSource = readFileSync("scripts/recall-scheduled-apply.sh", "utf8");
  assert(
    scheduledSource.includes("BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL") &&
      scheduledSource.includes("BRAIN_RECALL_MANUAL_VERIFICATION_MODE"),
    "scheduled wrapper must enforce manual verification approval when in manual mode",
  );

  const missingApproval = runWrapper({
    BRAIN_RECALL_SYNC_ENABLED: "1",
    BRAIN_RECALL_CONFIRM_LIVE_API: "1",
  });
  assert(missingApproval.status === 2, "manual wrapper should refuse without exact approval");
  assert(missingApproval.stderr.includes("exact BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL"), "missing approval should be explicit");

  const missingSync = runWrapper({
    BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL,
    BRAIN_RECALL_CONFIRM_LIVE_API: "1",
  });
  assert(missingSync.status === 2, "manual wrapper should require sync enabled");
  assert(missingSync.stderr.includes("BRAIN_RECALL_SYNC_ENABLED must be 1"), "missing sync should be explicit");

  const missingLiveConfirm = runWrapper({
    BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL,
    BRAIN_RECALL_SYNC_ENABLED: "1",
  });
  assert(missingLiveConfirm.status === 2, "manual wrapper should require live confirmation without fixture");
  assert(missingLiveConfirm.stderr.includes("BRAIN_RECALL_CONFIRM_LIVE_API must be 1"), "missing live confirmation should be explicit");

  const runtimePreflightFailed = runWrapper({
    BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL,
    BRAIN_RECALL_SYNC_ENABLED: "1",
    BRAIN_RECALL_CONFIRM_LIVE_API: "1",
    BRAIN_RECALL_SECOND_MANUAL_RUNTIME_PREFLIGHT_STUB_FAIL: "1",
  });
  assert(runtimePreflightFailed.status === 2, "manual wrapper should stop when runtime preflight fails");
  assert(
    runtimePreflightFailed.stderr.includes("second manual runtime preflight failed"),
    "runtime preflight failure should be explicit",
  );

  const passed = runWrapper({
    BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL,
    BRAIN_RECALL_SYNC_ENABLED: "1",
    BRAIN_RECALL_CONFIRM_LIVE_API: "1",
  });
  assert(passed.status === 0, `manual wrapper should call scheduled wrapper with manual mode\n${passed.stderr}`);
  assert(passed.stdout.includes("[recall-scheduled-apply] done"), "manual wrapper should surface scheduled wrapper completion");

  const marker = JSON.parse(readFileSync(markerPath, "utf8"));
  assert(marker.manualMode === "1", "manual wrapper should pass manual mode to scheduled wrapper");
  assert(marker.approval === APPROVAL, "manual wrapper should pass exact approval to scheduled wrapper");
  assert(marker.syncEnabled === "1", "manual wrapper should preserve sync enabled flag");
  assert(marker.confirmLiveApi === "1", "manual wrapper should preserve live confirmation");
  assert(marker.schedulerEnabled === null, "manual wrapper should not require or set scheduler enabled flag");
  const runtimePreflightMarkers = readFileSync(runtimePreflightMarkerPath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert(
    runtimePreflightMarkers.some((entry) => entry.status === "failed") &&
      runtimePreflightMarkers.some((entry) => entry.status === "passed"),
    "manual wrapper should call runtime preflight for failed and successful approved attempts",
  );

  const output = `${missingApproval.stdout}\n${missingApproval.stderr}\n${runtimePreflightFailed.stdout}\n${runtimePreflightFailed.stderr}\n${passed.stdout}\n${passed.stderr}`;
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(output), "manual wrapper output should not print secret-shaped values");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "manual wrapper refuses without exact approval",
          "manual wrapper requires sync enabled",
          "manual wrapper requires live confirmation for non-fixture mode",
          "manual wrapper runs production runtime preflight before apply delegation",
          "manual wrapper stops when runtime preflight fails",
          "manual wrapper sets manual verification mode for scheduled apply",
          "manual wrapper does not enable or start timers",
          "scheduled wrapper enforces manual verification approval in manual mode",
          "manual wrapper output does not print secret-shaped values",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function runWrapper(env) {
  return spawnSync("bash", ["scripts/recall-second-manual-verification-apply.sh"], {
    cwd: scratch,
    env: { ...process.env, BRAIN_DIR: scratch, SMOKE_RUNTIME_PREFLIGHT_MARKER: runtimePreflightMarkerPath, ...env },
    encoding: "utf8",
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
