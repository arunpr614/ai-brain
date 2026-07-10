#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const APPROVAL =
  "I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.";

const REQUIRED_RUNTIME_FILES = [
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
const REQUIRED_SCHEDULED_WRAPPER_SNIPPETS = [
  "manual_env_override_keys",
  "BRAIN_RECALL_SYSTEM_ENV_FILE",
  "manual_verification_mode_before_env",
];
const DEFAULT_KEY_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";

const findings = [];
const checked = [];

requireExactEnv("BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL", APPROVAL);
requireExactEnv("BRAIN_RECALL_SYNC_ENABLED", "1");

if (!process.env.BRAIN_RECALL_FIXTURE_PATH) {
  requireExactEnv("BRAIN_RECALL_CONFIRM_LIVE_API", "1");
}

if (process.env.BRAIN_RECALL_SCHEDULER_ENABLED === "1") {
  findings.push({
    id: "scheduler_enabled",
    message: "BRAIN_RECALL_SCHEDULER_ENABLED must not be 1 for the manual verification wrapper.",
  });
}

requireExactEnv("BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF", "1");
requireExactEnv("BRAIN_RECALL_LIVE_SPIKE_ALLOW_FIDELITY_CHANGES", "1");
requireNonEmptyEnv("BRAIN_RECALL_LIVE_SPIKE_ACCEPTED_FIDELITY_RISK");
requireExactEnv("BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT", "1");
requireExactEnv("BRAIN_RECALL_ALLOW_METADATA_ONLY_IMPORT", "1");
requireExactEnv("BRAIN_RECALL_WARNING_UI_AVAILABLE", "1");

requireReadableFileEnv("BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH");
requireReadableFileEnv("BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH");
if (process.env.BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH) {
  requireReadableFileEnv("BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH");
}

const maxImports = Number(process.env.BRAIN_RECALL_MAX_IMPORTS ?? "");
if (!Number.isInteger(maxImports) || maxImports < 1 || maxImports > 5) {
  findings.push({
    id: "max_imports_cap",
    message: "BRAIN_RECALL_MAX_IMPORTS must be an integer from 1 through 5 for the second manual verification run.",
  });
} else {
  checked.push({ id: "max_imports_cap", ok: true, value: maxImports });
}

for (const filePath of REQUIRED_RUNTIME_FILES) {
  requireReadableFile(filePath, "runtime_file");
}
requireFileIncludes(
  "scripts/recall-scheduled-apply.sh",
  REQUIRED_SCHEDULED_WRAPPER_SNIPPETS,
  "scheduled_wrapper_manual_env_override_guard",
);
if (!process.env.BRAIN_RECALL_FIXTURE_PATH) {
  requireKeyRotationEvidence();
}

const ok = findings.length === 0;
const output = {
  ok,
  status: ok ? "ready_for_second_manual_runtime_preflight" : "blocked_second_manual_runtime_preflight",
  noLiveNoWrite: true,
  approvalRequired: true,
  liveApplyDelegationAllowed: ok,
  schedulerAllowedNow: false,
  checkpointAllowedNow: false,
  checked,
  findings,
  safetyNote:
    "This runtime preflight is no-live and no-write. It validates deployed wrapper inputs and helper availability before delegating to the guarded scheduled apply path.",
};

const text = `${JSON.stringify(output, null, 2)}\n`;
if (!ok) {
  console.error("[check-recall-second-manual-runtime-preflight] failed");
  console.error(text);
  process.exit(1);
}

console.log(text);

function requireExactEnv(name, expected) {
  const value = process.env[name];
  if (value !== expected) {
    findings.push({
      id: envId(name),
      message: `${name} must be set to the expected guarded value.`,
    });
    return;
  }
  checked.push({ id: envId(name), ok: true });
}

function requireNonEmptyEnv(name) {
  const value = process.env[name];
  if (!value || value.includes("<") || value.includes(">")) {
    findings.push({
      id: envId(name),
      message: `${name} must be set to a concrete reviewed value, not a placeholder.`,
    });
    return;
  }
  checked.push({ id: envId(name), ok: true });
}

function requireReadableFileEnv(name) {
  const value = process.env[name];
  if (!value || value.includes("<") || value.includes(">")) {
    findings.push({
      id: envId(name),
      message: `${name} must point to a concrete deployed file path, not a placeholder.`,
    });
    return;
  }
  requireReadableFile(value, envId(name));
}

function requireReadableFile(filePath, id) {
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    findings.push({ id, path: filePath, message: `${filePath} does not exist from the current production root.` });
    return;
  }
  if (!statSync(resolved).isFile()) {
    findings.push({ id, path: filePath, message: `${filePath} is not a readable file.` });
    return;
  }
  checked.push({ id, ok: true, path: filePath });
}

function requireFileIncludes(filePath, snippets, id) {
  const resolved = resolve(filePath);
  if (!existsSync(resolved) || !statSync(resolved).isFile()) return;
  const text = readFileSync(resolved, "utf8");
  const missingSnippets = snippets.filter((snippet) => !text.includes(snippet));
  if (missingSnippets.length > 0) {
    findings.push({
      id,
      path: filePath,
      missingSnippets,
      message: `${filePath} is missing the manual verification env override guard required before apply delegation.`,
    });
    return;
  }
  checked.push({ id, ok: true, path: filePath });
}

function requireKeyRotationEvidence() {
  const envFile =
    process.env.BRAIN_RECALL_KEY_ROTATION_ENV_FILE ||
    process.env.BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE ||
    "/etc/brain/.env";
  const minRotatedAfterIso = process.env.BRAIN_RECALL_KEY_ROTATED_AFTER_ISO || DEFAULT_KEY_ROTATED_AFTER_ISO;
  const result = spawnSync(
    process.execPath,
    [
      "--",
      "scripts/check-recall-key-rotation-evidence.mjs",
      "--env-file",
      envFile,
      "--min-rotated-after",
      minRotatedAfterIso,
      "--system-env-file",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  const parsed = parseMaybeJson(result.status === 0 ? result.stdout : result.stderr || result.stdout);
  if (result.status !== 0 || parsed?.ok !== true) {
    findings.push({
      id: "key_rotation_evidence",
      message: "Production Recall key rotation evidence must pass before second manual apply delegation.",
      exitCode: result.status,
      envFile: parsed?.summary?.envFile ?? envFile,
      minRotatedAfterIso: parsed?.summary?.minRotatedAfterIso ?? minRotatedAfterIso,
      evidenceSource: parsed?.evidenceSource ?? null,
      findingRules: Array.isArray(parsed?.findings)
        ? parsed.findings.map((finding) => finding?.rule).filter(Boolean)
        : [],
    });
    return;
  }
  checked.push({
    id: "key_rotation_evidence",
    ok: true,
    envFile: parsed.summary?.envFile ?? envFile,
    minRotatedAfterIso: parsed.summary?.minRotatedAfterIso ?? minRotatedAfterIso,
    evidenceSource: parsed.evidenceSource ?? null,
  });
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

function envId(name) {
  return name.toLowerCase();
}
