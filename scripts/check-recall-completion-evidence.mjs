#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const PRIVATE_EVIDENCE_ROOT = "data/private/recall-live-spikes";
const MAX_FILE_FUTURE_SKEW_MS = 60 * 1000;
const MAX_SERVICE_REPORT_SKEW_MS = 10 * 60 * 1000;
const KINDS = {
  "production-deploy": {
    verdict: "PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION",
    label: "production deploy",
  },
  "scheduler-enable": {
    verdict: "PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION",
    label: "scheduler enablement",
  },
};
const SECRET_PATTERNS = [
  {
    name: "recall_api_key_assignment",
    pattern: /\bRECALL_API_KEY\s*=\s*(?!<redacted|<stored|<paste|<local|<empty|<RECALL_API_KEY>|sk_\.\.\.)[^\s"'<>]+/i,
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
const FORBIDDEN_PAYLOAD_KEYS = new Set([
  "body",
  "chunk",
  "chunks",
  "content",
  "full_text",
  "raw",
  "raw_body",
  "raw_content",
  "raw_response",
  "results",
  "source_url",
  "sourceurl",
  "text",
  "title",
  "transcript",
]);

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const kindConfig = KINDS[args.kind];
if (!kindConfig) {
  fail([{ rule: "invalid_kind", message: `--kind must be one of: ${Object.keys(KINDS).join(", ")}` }], null, args);
}

const findings = [];
const warnings = [];
const evidencePath = args.evidencePath ? resolve(args.evidencePath) : null;

if (!evidencePath) {
  fail([{ rule: "missing_evidence_path", message: `Provide a ${kindConfig.label} evidence path.` }], null, args);
}
if (!existsSync(evidencePath)) {
  fail(
    [{ rule: "missing_evidence_file", message: `${kindConfig.label} evidence file does not exist: ${evidencePath}` }],
    evidencePath,
    args,
  );
}

const stats = statSync(evidencePath);
if (!stats.isFile()) {
  findings.push({ rule: "evidence_not_file", message: `${kindConfig.label} evidence path is not a file.` });
}

const nowMs = Date.now();
if (stats.mtimeMs - nowMs > MAX_FILE_FUTURE_SKEW_MS) {
  findings.push({
    rule: "future_dated_evidence_file",
    message: `${kindConfig.label} evidence file mtime is more than 1 minute in the future.`,
  });
}
if (args.maxAgeMinutes != null && nowMs - stats.mtimeMs > minutesToMs(args.maxAgeMinutes)) {
  findings.push({
    rule: "stale_evidence_file",
    message: `${kindConfig.label} evidence file is older than ${args.maxAgeMinutes} minutes.`,
  });
}
if (args.requirePrivatePath && !isUnderPrivateEvidenceRoot(evidencePath)) {
  findings.push({
    rule: "evidence_not_private",
    message: `${kindConfig.label} evidence must stay under ${PRIVATE_EVIDENCE_ROOT}/ when private evidence is required.`,
  });
}
const mode = stats.mode & 0o777;
if (args.requireOwnerOnlyMode && (mode & 0o077) !== 0) {
  findings.push({
    rule: "insecure_evidence_permissions",
    message: `${kindConfig.label} evidence must not be readable, writable, or executable by group/other users.`,
  });
}
if (args.requireIgnored) {
  if (!isIgnored(evidencePath)) {
    findings.push({ rule: "evidence_not_ignored", message: `${kindConfig.label} evidence must be ignored by git.` });
  }
  if (isTracked(evidencePath)) {
    findings.push({ rule: "tracked_private_evidence", message: `${kindConfig.label} evidence must not be tracked by git.` });
  }
}

const text = readFileSync(evidencePath, "utf8");
const evidence = parseJson(text, findings);
addSecretFindings(text, findings);
if (evidence && typeof evidence === "object" && !Array.isArray(evidence)) {
  addForbiddenPayloadKeyFindings(evidence, findings);
  validateCommonEvidence(evidence, findings, kindConfig);
  if (args.kind === "production-deploy") validateProductionDeployEvidence(evidence, findings);
  else if (args.kind === "scheduler-enable") validateSchedulerEnableEvidence(evidence, findings);
} else if (!findings.some((finding) => finding.rule === "invalid_json")) {
  findings.push({ rule: "invalid_evidence_shape", message: `${kindConfig.label} evidence must be a JSON object.` });
}

if (findings.length > 0) {
  fail(findings, evidencePath, args, warnings);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      verdict: kindConfig.verdict,
      kind: args.kind,
      evidencePath,
      summary: summarize(evidence, evidencePath, stats, args.kind),
      warnings,
      nextGate: nextGate(args.kind),
    },
    null,
    2,
  ),
);

function validateCommonEvidence(evidence, findings, kindConfig) {
  requireEqual(evidence, "ok", true, findings);
  requireEqual(evidence, "verdict", kindConfig.verdict, findings);
  requireEqual(evidence, "target", "production", findings);
  requireIsoNotFuture(evidence, "checkedAtIso", findings);
}

function validateProductionDeployEvidence(evidence, findings) {
  requireIsoNotFuture(evidence, "deployedAtIso", findings);
  requireObject(evidence, "approval", findings);
  requireNonEmptyString(evidence.approval ?? {}, "approvedBy", findings);
  requireEqual(evidence.approval ?? {}, "scope", "production_deploy_after_post_apply_review", findings);

  requireObject(evidence, "source", findings);
  requireEqual(evidence.source ?? {}, "postApplyReviewVerdict", "PASS_POST_APPLY_REVIEW_GATE", findings);
  requirePrivateEvidencePathString(evidence.source ?? {}, "firstApplyReportPath", findings);

  requireObject(evidence, "localGates", findings);
  requireEqual(evidence.localGates ?? {}, "checkRecallPreliveOk", true, findings);
  requireEqual(evidence.localGates ?? {}, "checkRecallSchedulerOk", true, findings);
  requireEqual(evidence.localGates ?? {}, "completionStatusBeforeDeployOk", false, findings);

  requireObject(evidence, "deployment", findings);
  requireEqual(evidence.deployment ?? {}, "artifactSynced", true, findings);
  requireEqual(evidence.deployment ?? {}, "serviceRestarted", true, findings);
  requireEqual(evidence.deployment ?? {}, "buildArtifactsChecked", true, findings);

  requireObject(evidence, "healthCheck", findings);
  requireHttpsUrl(evidence.healthCheck ?? {}, "baseUrl", findings);
  requireEqual(evidence.healthCheck ?? {}, "ok", true, findings);
  requireEqual(evidence.healthCheck ?? {}, "httpStatus", 200, findings);
  requireEqual(evidence.healthCheck ?? {}, "authenticated", true, findings);

  requireObject(evidence, "aiProviderCheck", findings);
  requireEqual(evidence.aiProviderCheck ?? {}, "ok", true, findings);

  requireObject(evidence, "recallScheduler", findings);
  requireEqual(evidence.recallScheduler ?? {}, "timerUnitInstalled", true, findings);
  requireEqual(evidence.recallScheduler ?? {}, "timerEnabled", false, findings);
  requireEqual(evidence.recallScheduler ?? {}, "timerActive", false, findings);
  requireEqual(evidence.recallScheduler ?? {}, "enableFlagsDisabled", true, findings);
}

function validateSchedulerEnableEvidence(evidence, findings) {
  requireIsoNotFuture(evidence, "enabledAtIso", findings);
  requireObject(evidence, "approval", findings);
  requireNonEmptyString(evidence.approval ?? {}, "approvedBy", findings);
  requireEqual(evidence.approval ?? {}, "scope", "scheduler_enablement_after_repeated_clean_runs", findings);

  requireEqual(evidence, "productionDeployVerdict", "PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION", findings);
  const manualRuns = requireNonNegativeNumber(evidence, "manualCleanRunsBeforeEnable", findings);
  if (manualRuns != null && manualRuns < 2) {
    findings.push({
      rule: "insufficient_manual_clean_runs",
      message: "manualCleanRunsBeforeEnable must be at least 2 before scheduler enablement is accepted.",
    });
  }
  validateManualCleanRunsEvidence(evidence, manualRuns, findings);

  requireObject(evidence, "timer", findings);
  requireEqual(evidence.timer ?? {}, "unit", "brain-recall-sync.timer", findings);
  requireEqual(evidence.timer ?? {}, "enabled", true, findings);
  requireEqual(evidence.timer ?? {}, "active", true, findings);
  requireIsoNotFuture(evidence.timer ?? {}, "activeSinceIso", findings);
  requireIso(evidence.timer ?? {}, "nextElapseIso", findings);

  requireObject(evidence, "service", findings);
  requireEqual(evidence.service ?? {}, "unit", "brain-recall-sync.service", findings);
  requireEqual(evidence.service ?? {}, "lastRunOk", true, findings);
  requireEqual(evidence.service ?? {}, "lastRunExitCode", 0, findings);
  requireIsoNotFuture(evidence.service ?? {}, "lastRunCompletedAtIso", findings);

  requireObject(evidence, "recallEnv", findings);
  requireEqual(evidence.recallEnv ?? {}, "syncEnabled", true, findings);
  requireEqual(evidence.recallEnv ?? {}, "schedulerEnabled", true, findings);
  requireEqual(evidence.recallEnv ?? {}, "confirmLiveApi", true, findings);

  validateFirstRunEvidence(evidence, findings);
}

function parseArgs(argv) {
  const parsed = {
    kind: null,
    evidencePath: null,
    maxAgeMinutes: null,
    requirePrivatePath: true,
    requireOwnerOnlyMode: true,
    requireIgnored: true,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") {
      parsed.help = true;
    } else if (arg === "--kind" && next) {
      parsed.kind = next;
      i += 1;
    } else if ((arg === "--evidence" || arg === "--evidence-path") && next) {
      parsed.evidencePath = next;
      i += 1;
    } else if (arg === "--max-age-minutes" && next) {
      parsed.maxAgeMinutes = parsePositiveNumber(arg, next);
      i += 1;
    } else if (arg === "--allow-non-private-evidence") {
      parsed.requirePrivatePath = false;
    } else if (arg === "--allow-non-owner-only-mode") {
      parsed.requireOwnerOnlyMode = false;
    } else if (arg === "--skip-ignore-check") {
      parsed.requireIgnored = false;
    } else if (!arg.startsWith("--") && !parsed.evidencePath) {
      parsed.evidencePath = arg;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
}

function summarize(evidence, evidencePath, stats, kind) {
  const common = {
    evidencePath,
    checkedAtIso: evidence.checkedAtIso ?? null,
    file: {
      mode: (stats.mode & 0o777).toString(8).padStart(3, "0"),
      sizeBytes: stats.size,
      mtimeIso: stats.mtime.toISOString(),
    },
  };
  if (kind === "production-deploy") {
    return {
      ...common,
      deployedAtIso: evidence.deployedAtIso ?? null,
      baseUrl: evidence.healthCheck?.baseUrl ?? null,
      healthStatus: evidence.healthCheck?.httpStatus ?? null,
      recallScheduler: {
        timerUnitInstalled: evidence.recallScheduler?.timerUnitInstalled === true,
        timerEnabled: evidence.recallScheduler?.timerEnabled === true,
        timerActive: evidence.recallScheduler?.timerActive === true,
        enableFlagsDisabled: evidence.recallScheduler?.enableFlagsDisabled === true,
      },
    };
  }
  return {
    ...common,
    enabledAtIso: evidence.enabledAtIso ?? null,
    timer: {
      unit: evidence.timer?.unit ?? null,
      enabled: evidence.timer?.enabled === true,
      active: evidence.timer?.active === true,
      nextElapseIso: evidence.timer?.nextElapseIso ?? null,
    },
    firstRun: {
      ok: evidence.firstRun?.ok === true,
      exitCode: evidence.firstRun?.exitCode ?? null,
      completedAtIso: evidence.firstRun?.completedAtIso ?? null,
      applyReportVerdict: evidence.firstRun?.applyReportVerdict ?? null,
    },
    service: {
      lastRunCompletedAtIso: evidence.service?.lastRunCompletedAtIso ?? null,
    },
    manualCleanRunsBeforeEnable: evidence.manualCleanRunsBeforeEnable ?? null,
    manualCleanRunEvidenceCount: Array.isArray(evidence.manualCleanRuns) ? evidence.manualCleanRuns.length : 0,
  };
}

function nextGate(kind) {
  if (kind === "production-deploy") {
    return "Production deploy evidence passed. Scheduler enablement still requires separate approval and first-run evidence.";
  }
  return "Scheduler enablement evidence passed. Rerun the daily sync completion status with both deploy and scheduler evidence.";
}

function parseJson(text, findings) {
  try {
    return JSON.parse(text);
  } catch (error) {
    findings.push({ rule: "invalid_json", message: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

function requireEqual(object, key, expected, findings) {
  if (object?.[key] !== expected) {
    findings.push({
      rule: `${key}_mismatch`,
      message: `${key} must be ${JSON.stringify(expected)}, got ${JSON.stringify(object?.[key])}.`,
    });
  }
}

function requireObject(object, key, findings) {
  if (!object || typeof object[key] !== "object" || object[key] === null || Array.isArray(object[key])) {
    findings.push({ rule: `${key}_missing`, message: `${key} must be an object.` });
  }
}

function requireNonEmptyString(object, key, findings) {
  if (typeof object?.[key] !== "string" || object[key].trim().length === 0) {
    findings.push({ rule: `${key}_missing`, message: `${key} must be a non-empty string.` });
  }
}

function requirePrivateEvidencePathString(object, key, findings) {
  requireNonEmptyString(object, key, findings);
  if (typeof object?.[key] === "string" && !object[key].startsWith(`${PRIVATE_EVIDENCE_ROOT}/`)) {
    findings.push({
      rule: `${key}_not_private`,
      message: `${key} must point under ${PRIVATE_EVIDENCE_ROOT}/.`,
    });
  }
}

function requireHttpsUrl(object, key, findings) {
  requireNonEmptyString(object, key, findings);
  if (typeof object?.[key] === "string" && !object[key].startsWith("https://")) {
    findings.push({ rule: `${key}_not_https`, message: `${key} must start with https://.` });
  }
}

function requireIsoNotFuture(object, key, findings) {
  requireNonEmptyString(object, key, findings);
  if (typeof object?.[key] !== "string") return;
  const epoch = Date.parse(object[key]);
  if (!Number.isFinite(epoch)) {
    findings.push({ rule: `${key}_invalid_iso`, message: `${key} must be a valid ISO timestamp.` });
    return;
  }
  if (epoch - Date.now() > MAX_FILE_FUTURE_SKEW_MS) {
    findings.push({ rule: `${key}_future_dated`, message: `${key} is more than 1 minute in the future.` });
  }
}

function requireIso(object, key, findings) {
  requireNonEmptyString(object, key, findings);
  if (typeof object?.[key] !== "string") return;
  const epoch = Date.parse(object[key]);
  if (!Number.isFinite(epoch)) {
    findings.push({ rule: `${key}_invalid_iso`, message: `${key} must be a valid ISO timestamp.` });
  }
}

function requireNonNegativeNumber(object, key, findings) {
  const value = object?.[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    findings.push({ rule: `${key}_invalid`, message: `${key} must be a non-negative number.` });
    return null;
  }
  return value;
}

function validateManualCleanRunsEvidence(evidence, manualRuns, findings) {
  const runs = evidence?.manualCleanRuns;
  if (!Array.isArray(runs)) {
    findings.push({
      rule: "manualCleanRuns_missing",
      message: "manualCleanRuns must list the private reviewed apply reports counted before scheduler enablement.",
    });
    return;
  }
  if (runs.length < 2) {
    findings.push({
      rule: "manualCleanRuns_insufficient",
      message: "manualCleanRuns must include at least 2 reviewed clean run evidence entries.",
    });
  }
  if (manualRuns != null && runs.length < manualRuns) {
    findings.push({
      rule: "manualCleanRuns_count_mismatch",
      message: `manualCleanRuns has ${runs.length} entries but manualCleanRunsBeforeEnable is ${manualRuns}.`,
    });
  }

  const enabledAtMs = Date.parse(evidence.enabledAtIso ?? "");
  const seenApplyReportPaths = new Set();
  const seenKinds = new Set();
  runs.forEach((run, index) => {
    const path = `manualCleanRuns.${index}`;
    if (!run || typeof run !== "object" || Array.isArray(run)) {
      findings.push({ rule: "manualCleanRun_invalid", message: `${path} must be an object.` });
      return;
    }
    requireEqual(run, "ok", true, findings);
    requireNonEmptyString(run, "kind", findings);
    requireIsoNotFuture(run, "completedAtIso", findings);
    requireEqual(run, "applyReportVerdict", "PASS_POST_APPLY_REVIEW_GATE", findings);
    requirePrivateEvidencePathString(run, "applyReportPath", findings);

    if (typeof run.kind === "string") {
      if (seenKinds.has(run.kind)) {
        findings.push({
          rule: "duplicate_manual_clean_run_kind",
          message: `${path}.kind duplicates another manual clean run evidence entry.`,
        });
      }
      seenKinds.add(run.kind);
    }

    const applyReportPath = run.applyReportPath;
    if (typeof applyReportPath === "string") {
      const normalizedApplyReportPath = normalizeEvidencePath(applyReportPath);
      if (seenApplyReportPaths.has(normalizedApplyReportPath)) {
        findings.push({
          rule: "duplicate_manual_clean_run_apply_report",
          message: `${path}.applyReportPath duplicates another manual clean run evidence entry.`,
        });
      }
      seenApplyReportPaths.add(normalizedApplyReportPath);
    }

    const completedAtMs = Date.parse(run.completedAtIso ?? "");
    if (Number.isFinite(enabledAtMs) && Number.isFinite(completedAtMs) && completedAtMs - enabledAtMs > MAX_FILE_FUTURE_SKEW_MS) {
      findings.push({
        rule: "manual_clean_run_after_enablement",
        message: `${path}.completedAtIso must be before scheduler enablement.`,
      });
    }
  });
}

function validateFirstRunEvidence(evidence, findings) {
  requireObject(evidence, "firstRun", findings);
  const firstRun = evidence.firstRun ?? {};
  requireEqual(firstRun, "ok", true, findings);
  requireEqual(firstRun, "exitCode", 0, findings);
  requireEqual(firstRun, "applyReportVerdict", "PASS_POST_APPLY_REVIEW_GATE", findings);
  requirePrivateEvidencePathString(firstRun, "applyReportPath", findings);
  requireIsoNotFuture(firstRun, "completedAtIso", findings);

  const enabledAtMs = Date.parse(evidence.enabledAtIso ?? "");
  const timerActiveSinceMs = Date.parse(evidence.timer?.activeSinceIso ?? "");
  const serviceCompletedAtMs = Date.parse(evidence.service?.lastRunCompletedAtIso ?? "");
  const firstRunCompletedAtMs = Date.parse(firstRun.completedAtIso ?? "");

  if (
    Number.isFinite(firstRunCompletedAtMs) &&
    Number.isFinite(enabledAtMs) &&
    firstRunCompletedAtMs + MAX_FILE_FUTURE_SKEW_MS < enabledAtMs
  ) {
    findings.push({
      rule: "first_run_before_scheduler_enablement",
      message: "firstRun.completedAtIso must be after scheduler enabledAtIso.",
    });
  }

  if (
    Number.isFinite(firstRunCompletedAtMs) &&
    Number.isFinite(timerActiveSinceMs) &&
    firstRunCompletedAtMs + MAX_FILE_FUTURE_SKEW_MS < timerActiveSinceMs
  ) {
    findings.push({
      rule: "first_run_before_scheduler_activation",
      message: "firstRun.completedAtIso must be after timer.activeSinceIso.",
    });
  }

  if (
    Number.isFinite(serviceCompletedAtMs) &&
    Number.isFinite(timerActiveSinceMs) &&
    serviceCompletedAtMs + MAX_FILE_FUTURE_SKEW_MS < timerActiveSinceMs
  ) {
    findings.push({
      rule: "service_run_before_scheduler_activation",
      message: "service.lastRunCompletedAtIso must be after timer.activeSinceIso.",
    });
  }

  if (
    Number.isFinite(serviceCompletedAtMs) &&
    Number.isFinite(firstRunCompletedAtMs) &&
    Math.abs(serviceCompletedAtMs - firstRunCompletedAtMs) > MAX_SERVICE_REPORT_SKEW_MS
  ) {
    findings.push({
      rule: "first_run_apply_report_not_latest_service_run",
      message:
        "firstRun.completedAtIso must align with service.lastRunCompletedAtIso for the latest successful scheduled service run.",
    });
  }

  if (typeof firstRun.applyReportPath !== "string") return;
  const normalizedFirstRunPath = normalizeEvidencePath(firstRun.applyReportPath);
  const manualRuns = Array.isArray(evidence.manualCleanRuns) ? evidence.manualCleanRuns : [];
  manualRuns.forEach((run, index) => {
    if (typeof run?.applyReportPath !== "string") return;
    if (normalizeEvidencePath(run.applyReportPath) === normalizedFirstRunPath) {
      findings.push({
        rule: "duplicate_first_run_apply_report",
        message:
          `firstRun.applyReportPath must be distinct from manualCleanRuns.${index}.applyReportPath; ` +
          "first scheduled service-run evidence cannot reuse a pre-enable manual apply report.",
      });
    }
  });
}

function normalizeEvidencePath(path) {
  return resolve(path);
}

function addSecretFindings(text, findings) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const secret of SECRET_PATTERNS) {
      if (secret.pattern.test(line)) {
        findings.push({
          rule: secret.name,
          message: `Evidence contains a secret-shaped value at line ${index + 1}: ${redact(line).trim()}`,
        });
      }
    }
  });
}

function addForbiddenPayloadKeyFindings(value, findings, path = []) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => addForbiddenPayloadKeyFindings(entry, findings, [...path, String(index)]));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "_");
    if (FORBIDDEN_PAYLOAD_KEYS.has(normalized)) {
      findings.push({
        rule: "forbidden_payload_key",
        message: `Evidence must not include raw/private payload key ${[...path, key].join(".")}.`,
      });
    }
    addForbiddenPayloadKeyFindings(child, findings, [...path, key]);
  }
}

function isUnderPrivateEvidenceRoot(path) {
  const relativePath = relative(resolve(PRIVATE_EVIDENCE_ROOT), path);
  return relativePath === "" || (!relativePath.startsWith("..") && !relativePath.startsWith("/"));
}

function isIgnored(path) {
  return spawnSync("git", ["check-ignore", "-q", "--", path], { encoding: "utf8" }).status === 0;
}

function isTracked(path) {
  return spawnSync("git", ["ls-files", "--error-unmatch", "--", path], { encoding: "utf8" }).status === 0;
}

function fail(findings, evidencePath, args, warnings = []) {
  console.error("[check:recall-completion-evidence] failed");
  console.error(
    JSON.stringify(
      {
        ok: false,
        kind: args.kind ?? null,
        evidencePath,
        verdict: args.kind && KINDS[args.kind] ? `FAIL_${KINDS[args.kind].verdict}` : "FAIL_RECALL_COMPLETION_EVIDENCE",
        findings: findings.map((finding) => ({
          rule: finding.rule,
          message: redact(finding.message),
        })),
        warnings,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

function minutesToMs(minutes) {
  return minutes * 60 * 1000;
}

function parsePositiveNumber(label, value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be a positive number.`);
  return parsed;
}

function redact(value) {
  return String(value)
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer <redacted:token>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>")
    .replace(/\bRECALL_API_KEY\s*=\s*[^\s"'<>]+/gi, "RECALL_API_KEY=<redacted>");
}

function printHelp() {
  console.log(`Recall completion evidence checker

Usage:
  node scripts/check-recall-completion-evidence.mjs --kind production-deploy --evidence data/private/recall-live-spikes/production-deploy-evidence.json
  node scripts/check-recall-completion-evidence.mjs --kind scheduler-enable --evidence data/private/recall-live-spikes/scheduler-enable-evidence.json

This command is no-live and no-write. By default, evidence files must live under
${PRIVATE_EVIDENCE_ROOT}/, be ignored by git, and be owner-only.
`);
}
