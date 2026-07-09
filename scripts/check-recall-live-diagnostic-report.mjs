#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

const DEFAULT_REPORT_PATH = "data/private/recall-live-spikes/live-diagnostic-report.json";
const PRIVATE_REPORT_ROOT = "data/private/recall-live-spikes";
const MAX_REPORT_FUTURE_SKEW_MS = 60 * 1000;
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
const VALID_STATUS_BEFORE_PROBE = new Set([
  "blocked_key_rotation_evidence",
  "blocked_first_apply_readiness",
  "local_private_gate_status_failed",
  "needs_no_write_proof_refresh",
  "ready_for_first_capped_apply_approval",
]);

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const findings = [];
const warnings = [];
const reportPath = resolve(args.reportPath);

if (!existsSync(reportPath)) {
  fail([{ rule: "missing_report", message: `Live diagnostic report does not exist: ${reportPath}` }], warnings, reportPath, args);
}

const stats = statSync(reportPath);
if (!stats.isFile()) {
  fail([{ rule: "report_not_file", message: "Live diagnostic report path is not a file." }], warnings, reportPath, args);
}

const nowMs = Date.now();
if (stats.mtimeMs - nowMs > MAX_REPORT_FUTURE_SKEW_MS) {
  findings.push({
    rule: "future_dated_report",
    message: "Live diagnostic report mtime is more than 1 minute in the future.",
  });
}
if (args.maxAgeMinutes != null && nowMs - stats.mtimeMs > minutesToMs(args.maxAgeMinutes)) {
  findings.push({
    rule: "stale_report",
    message: `Live diagnostic report is older than ${args.maxAgeMinutes} minutes.`,
  });
}
if (args.requirePrivatePath && !isUnderPrivateReportRoot(reportPath)) {
  findings.push({
    rule: "report_not_private",
    message: `Live diagnostic report must stay under ${PRIVATE_REPORT_ROOT}/ when --require-private-path is used.`,
  });
}
const mode = stats.mode & 0o777;
if (args.requireOwnerOnlyMode && (mode & 0o077) !== 0) {
  findings.push({
    rule: "insecure_report_permissions",
    message: "Live diagnostic report must not be readable, writable, or executable by group/other users.",
  });
}
if (args.requireIgnored) {
  const ignored = isIgnored(reportPath);
  const tracked = isTracked(reportPath);
  if (!ignored) {
    findings.push({
      rule: "report_not_ignored",
      message: "Live diagnostic report must be ignored by git.",
    });
  }
  if (tracked) {
    findings.push({
      rule: "tracked_private_report",
      message: "Live diagnostic report must not be tracked by git.",
    });
  }
}

const text = readFileSync(reportPath, "utf8");
const report = parseJson(text, findings);
addSecretFindings(text, findings);
if (report && typeof report === "object" && !Array.isArray(report)) {
  addForbiddenPayloadKeyFindings(report, findings);
  validateShape(report, findings);
} else if (!findings.some((finding) => finding.rule === "invalid_json")) {
  findings.push({ rule: "invalid_report_shape", message: "Live diagnostic report must be a JSON object." });
}

if (findings.length > 0) {
  fail(findings, warnings, reportPath, args);
}

const summary = summarize(report, reportPath, stats);
console.log(
  JSON.stringify(
    {
      ok: true,
      verdict: "PASS_RECALL_LIVE_DIAGNOSTIC_REPORT",
      reportPath,
      maxAgeMinutes: args.maxAgeMinutes,
      summary,
      warnings,
      nextGate:
        "Live diagnostic report passed no-write artifact checks. This does not satisfy key-rotation evidence, proof freshness, first-write approval, apply, deploy, scheduler, or checkpoint gates.",
    },
    null,
    2,
  ),
);

function parseArgs(argv) {
  const parsed = {
    reportPath: DEFAULT_REPORT_PATH,
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
    } else if ((arg === "--report" || arg === "--report-path") && next) {
      parsed.reportPath = next;
      i += 1;
    } else if (arg === "--max-age-minutes" && next) {
      parsed.maxAgeMinutes = parsePositiveNumber(arg, next);
      i += 1;
    } else if (arg === "--require-private-path") {
      parsed.requirePrivatePath = true;
    } else if (arg === "--allow-non-private-report") {
      parsed.requirePrivatePath = false;
    } else if (arg === "--require-owner-only-mode") {
      parsed.requireOwnerOnlyMode = true;
    } else if (arg === "--allow-non-owner-only-mode") {
      parsed.requireOwnerOnlyMode = false;
    } else if (arg === "--require-ignored") {
      parsed.requireIgnored = true;
    } else if (arg === "--skip-ignore-check") {
      parsed.requireIgnored = false;
    } else if (!arg.startsWith("--")) {
      parsed.reportPath = arg;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
}

function validateShape(report, findings) {
  requireEqual(report, "ok", true, findings);
  requireEqual(report, "mode", "first_apply_live_read_diagnostic", findings);
  requireObject(report, "statusBeforeProbe", findings);
  requireObject(report, "firstWriteSafety", findings);
  requireObject(report, "diagnosticOutputFile", findings);
  requireObject(report, "liveAuthProbe", findings);

  requireValidStatusBeforeProbe(report.statusBeforeProbe ?? {}, findings);
  requireBoolean(report.statusBeforeProbe?.firstWriteSafety ?? {}, "proofRefreshAllowedNow", findings);
  requireBoolean(report.statusBeforeProbe?.firstWriteSafety ?? {}, "applyAllowedNow", findings);
  requireBoolean(report.firstWriteSafety ?? {}, "proofRefreshAllowedNow", findings);
  requireBoolean(report.firstWriteSafety ?? {}, "applyAllowedNow", findings);

  requireEqual(report.diagnosticOutputFile ?? {}, "written", true, findings);
  requireEqual(report.diagnosticOutputFile ?? {}, "privateRoot", PRIVATE_REPORT_ROOT, findings);
  requireEqual(report.diagnosticOutputFile ?? {}, "mode", "0600", findings);
  requireString(report.diagnosticOutputFile ?? {}, "path", findings);
  if (report.diagnosticOutputFile?.path && !String(report.diagnosticOutputFile.path).startsWith(`${PRIVATE_REPORT_ROOT}/`)) {
    findings.push({
      rule: "output_file_not_private",
      message: "diagnosticOutputFile.path must stay under the private Recall evidence root.",
    });
  }

  requireEqual(report.liveAuthProbe ?? {}, "ok", true, findings);
  requireEqual(report.liveAuthProbe ?? {}, "endpoint", "/cards", findings);
  requireEqual(report.liveAuthProbe ?? {}, "method", "GET", findings);
  requireObject(report.liveAuthProbe ?? {}, "dateWindow", findings);
  requireObject(report.liveAuthProbe ?? {}, "envFile", findings);
  requireObject(report.liveAuthProbe ?? {}, "firstWriteSafety", findings);
  requireObject(report.liveAuthProbe ?? {}, "result", findings);
  requireEqual(report.liveAuthProbe?.firstWriteSafety ?? {}, "purpose", "diagnostic_context_only", findings);
  requireEqual(report.liveAuthProbe?.firstWriteSafety ?? {}, "keyRotationEvidenceGateRun", false, findings);
  requireEqual(report.liveAuthProbe?.firstWriteSafety ?? {}, "proofRefreshAllowedByThisProbe", false, findings);
  requireEqual(report.liveAuthProbe?.firstWriteSafety ?? {}, "applyAllowedByThisProbe", false, findings);
  requireEqual(report.liveAuthProbe?.result ?? {}, "httpStatus", 200, findings);
  requireEqual(report.liveAuthProbe?.result ?? {}, "authenticated", true, findings);
  requireEqual(report.liveAuthProbe?.result ?? {}, "reachable", true, findings);
  requireEqual(report.liveAuthProbe?.result ?? {}, "responseHadResultsArray", true, findings);
  requireNonNegativeNumber(report.liveAuthProbe?.result ?? {}, "totalCount", findings);
  requireNonNegativeNumber(report.liveAuthProbe?.result ?? {}, "resultCount", findings);
}

function summarize(report, reportPath, stats) {
  return {
    mode: report.mode ?? null,
    statusBeforeProbe: report.statusBeforeProbe?.status ?? null,
    failedChecks: report.statusBeforeProbe?.failedChecks ?? [],
    diagnosticOutputFile: {
      path: report.diagnosticOutputFile?.path ?? null,
      written: report.diagnosticOutputFile?.written === true,
      mode: report.diagnosticOutputFile?.mode ?? null,
      statMode: (stats.mode & 0o777).toString(8).padStart(3, "0"),
      sizeBytes: stats.size,
      mtimeIso: stats.mtime.toISOString(),
    },
    liveAuthProbe: {
      ok: report.liveAuthProbe?.ok === true,
      endpoint: report.liveAuthProbe?.endpoint ?? null,
      method: report.liveAuthProbe?.method ?? null,
      httpStatus: report.liveAuthProbe?.result?.httpStatus ?? null,
      authenticated: report.liveAuthProbe?.result?.authenticated ?? null,
      reachable: report.liveAuthProbe?.result?.reachable ?? null,
      totalCount: report.liveAuthProbe?.result?.totalCount ?? null,
      resultCount: report.liveAuthProbe?.result?.resultCount ?? null,
      envFileMtimeAfterCheckpoint: report.liveAuthProbe?.firstWriteSafety?.envFileMtimeAfterCheckpoint ?? null,
    },
    firstWriteSafety: {
      proofRefreshAllowedNow: report.firstWriteSafety?.proofRefreshAllowedNow ?? null,
      applyAllowedNow: report.firstWriteSafety?.applyAllowedNow ?? null,
      proofRefreshAllowedByThisProbe: report.liveAuthProbe?.firstWriteSafety?.proofRefreshAllowedByThisProbe ?? null,
      applyAllowedByThisProbe: report.liveAuthProbe?.firstWriteSafety?.applyAllowedByThisProbe ?? null,
    },
  };
}

function parseJson(text, findings) {
  try {
    return JSON.parse(text);
  } catch (error) {
    findings.push({
      rule: "invalid_json",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function addSecretFindings(text, findings) {
  const lines = String(text).split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const secret of SECRET_PATTERNS) {
      if (secret.pattern.test(line)) {
        findings.push({
          rule: secret.name,
          message: `Live diagnostic report contains a secret-shaped value at line ${index + 1}.`,
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
    const normalized = key.toLowerCase();
    if (FORBIDDEN_PAYLOAD_KEYS.has(normalized)) {
      findings.push({
        rule: "forbidden_payload_key",
        message: `Live diagnostic report must not include private Recall payload key: ${[...path, key].join(".")}`,
      });
    }
    addForbiddenPayloadKeyFindings(child, findings, [...path, key]);
  }
}

function requireObject(target, key, findings) {
  const value = target?.[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    findings.push({
      rule: "missing_or_invalid_object",
      message: `${key} must be an object.`,
    });
    return null;
  }
  return value;
}

function requireString(target, key, findings) {
  const value = target?.[key];
  if (typeof value !== "string" || value.trim() === "") {
    findings.push({
      rule: "missing_or_invalid_string",
      message: `${key} must be a non-empty string.`,
    });
    return null;
  }
  return value;
}

function requireEqual(target, key, expected, findings, override = null) {
  const actual = target?.[key];
  if (actual !== expected) {
    findings.push(
      override ?? {
        rule: "unexpected_value",
        message: `${key} must be ${JSON.stringify(expected)}; got ${JSON.stringify(actual)}.`,
      },
    );
  }
}

function requireNonNegativeNumber(target, key, findings) {
  const value = target?.[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    findings.push({
      rule: "missing_or_invalid_number",
      message: `${key} must be a non-negative number.`,
    });
    return null;
  }
  return value;
}

function requireBoolean(target, key, findings) {
  const value = target?.[key];
  if (typeof value !== "boolean") {
    findings.push({
      rule: "missing_or_invalid_boolean",
      message: `${key} must be a boolean.`,
    });
  }
}

function requireValidStatusBeforeProbe(target, findings) {
  const status = target?.status;
  if (!VALID_STATUS_BEFORE_PROBE.has(status)) {
    findings.push({
      rule: "invalid_status_before_probe",
      message:
        "statusBeforeProbe.status must be a known first-apply gate state. Diagnostic reports may be captured before or after key-rotation readiness, but they must not authorize first-write work.",
    });
  }
}

function fail(findings, warnings, reportPath, args) {
  console.error("[check:recall-live-diagnostic-report] failed");
  console.error(
    JSON.stringify(
      {
        ok: false,
        reportPath,
        maxAgeMinutes: args.maxAgeMinutes,
        findings,
        warnings,
        nextGate:
          "Do not use this live diagnostic report as write authorization. It is diagnostic-only and must not satisfy key rotation evidence, proof freshness, apply, deploy, scheduler, or checkpoint gates.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

function isUnderPrivateReportRoot(filePath) {
  const rel = relative(resolve(PRIVATE_REPORT_ROOT), filePath);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith("/"));
}

function isIgnored(path) {
  const result = spawnSync("git", ["check-ignore", "-q", "--", gitPath(path)], { encoding: "utf8" });
  return result.status === 0;
}

function isTracked(path) {
  const result = spawnSync("git", ["ls-files", "--error-unmatch", "--", gitPath(path)], { encoding: "utf8" });
  return result.status === 0;
}

function gitPath(path) {
  const rel = relative(process.cwd(), path);
  return rel && !rel.startsWith("..") ? rel : path;
}

function parsePositiveNumber(label, value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be a positive number.`);
  return parsed;
}

function minutesToMs(minutes) {
  return minutes * 60 * 1000;
}

function printHelp() {
  console.log(`Recall live diagnostic report checker

Usage:
  npm run check:recall-live-diagnostic-report
  npm run check:recall-live-diagnostic-report -- --report data/private/recall-live-spikes/live-diagnostic-report.json

This is a no-live, no-write artifact validator. Passing it does not satisfy
key-rotation evidence, proof freshness, first-write approval, apply, deploy,
scheduler, or checkpoint gates.
`);
}
