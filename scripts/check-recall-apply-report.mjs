#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

const PRIVATE_REPORT_ROOT = "data/private/recall-live-spikes";
const MAX_REPORT_FUTURE_SKEW_MS = 60 * 1000;
const RISKY_FIDELITY_FLAGS = {
  api_chunks_unverified: "allowUnverifiedFidelity",
  possibly_truncated: "allowPossiblyTruncatedFidelity",
  metadata_only: "allowMetadataOnlyFidelity",
};
const SECRET_PATTERNS = [
  {
    name: "recall_api_key_assignment",
    pattern: /\bRECALL_API_KEY\s*=\s*(?!<redacted|<stored|<paste|<redacted locally>|sk_\.\.\.)[^\s"'<>]+/i,
  },
  {
    name: "authorization_bearer",
    pattern: /\bAuthorization\s*:\s*Bearer\s+(?!<redacted:token>)[^\s"'<>]+/i,
  },
  {
    name: "bare_bearer_token",
    pattern: /\bBearer\s+(?!<redacted:token>|<key>|\$\{)[A-Za-z0-9._-]{12,}/i,
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
  "raw_content",
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

const findings = [];
const warnings = [];
const reportPath = args.reportPath ? resolve(args.reportPath) : null;

if (!reportPath) {
  fail([{ rule: "missing_report_path", message: "Provide an apply report path." }], warnings, null, args);
}
if (!existsSync(reportPath)) {
  fail(
    [{ rule: "missing_report", message: `Apply report does not exist: ${reportPath}` }],
    warnings,
    reportPath,
    args,
  );
}

const stats = statSync(reportPath);
const maxAgeMs = minutesToMs(args.maxAgeMinutes);
const nowMs = Date.now();
if (stats.mtimeMs - nowMs > MAX_REPORT_FUTURE_SKEW_MS) {
  fail(
    [
      {
        rule: "future_dated_report",
        message: "Apply report mtime is more than 1 minute in the future.",
      },
    ],
    warnings,
    reportPath,
    args,
  );
}
if (nowMs - stats.mtimeMs > maxAgeMs) {
  fail(
    [
      {
        rule: "stale_report",
        message: `Apply report is older than ${args.maxAgeMinutes} minutes.`,
      },
    ],
    warnings,
    reportPath,
    args,
  );
}

const text = readFileSync(reportPath, "utf8");
const report = parseJson(text, findings);
if (!report || typeof report !== "object" || Array.isArray(report)) {
  fail(findings, warnings, reportPath, args);
}

if (args.requirePrivatePath && !isUnderPrivateReportRoot(reportPath)) {
  findings.push({
    rule: "report_not_private",
    message: `Apply report must stay under ${PRIVATE_REPORT_ROOT}/ when --require-private-path is used.`,
  });
}

addSecretFindings(text, findings);
addForbiddenPayloadKeyFindings(report, findings);
validateShape(report, findings, warnings, args);

if (findings.length > 0) {
  fail(findings, warnings, reportPath, args);
}

const summary = summarize(report);
console.log(
  JSON.stringify(
    {
      ok: true,
      verdict: "PASS_POST_APPLY_REVIEW_GATE",
      reportPath,
      maxAppliedImports: args.maxAppliedImports,
      maxAgeMinutes: args.maxAgeMinutes,
      summary,
      warnings,
      nextGate:
        "Apply report passed machine checks. Human review is still required before deploy or scheduler enablement.",
    },
    null,
    2,
  ),
);

function parseArgs(argv) {
  const parsed = {
    reportPath: null,
    maxAppliedImports: 5,
    maxAgeMinutes: 120,
    requireCardsSeen: false,
    requireAppliedImports: false,
    requirePrivatePath: false,
    failAllSkipped: false,
    allowNoCheckpointAdvance: false,
    allowWeakUpgrades: false,
    allowUnverifiedFidelity: false,
    allowPossiblyTruncatedFidelity: false,
    allowMetadataOnlyFidelity: false,
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
    } else if (arg === "--max-applied-imports" && next) {
      parsed.maxAppliedImports = parseNonNegativeInt(arg, next);
      i += 1;
    } else if (arg === "--max-age-minutes" && next) {
      parsed.maxAgeMinutes = parsePositiveInt(arg, next);
      i += 1;
    } else if (arg === "--require-cards-seen") {
      parsed.requireCardsSeen = true;
    } else if (arg === "--require-applied-imports") {
      parsed.requireAppliedImports = true;
    } else if (arg === "--require-private-path") {
      parsed.requirePrivatePath = true;
    } else if (arg === "--fail-all-skipped") {
      parsed.failAllSkipped = true;
    } else if (arg === "--allow-no-checkpoint-advance") {
      parsed.allowNoCheckpointAdvance = true;
    } else if (arg === "--allow-weak-upgrades") {
      parsed.allowWeakUpgrades = true;
    } else if (arg === "--allow-unverified-fidelity") {
      parsed.allowUnverifiedFidelity = true;
    } else if (arg === "--allow-possibly-truncated-fidelity") {
      parsed.allowPossiblyTruncatedFidelity = true;
    } else if (arg === "--allow-metadata-only-fidelity") {
      parsed.allowMetadataOnlyFidelity = true;
    } else if (!arg.startsWith("--") && !parsed.reportPath) {
      parsed.reportPath = arg;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
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

function validateShape(report, findings, warnings, args) {
  requireEqual(report, "mode", "apply", findings);
  requireEqual(report, "state", "done", findings);
  requireEqual(report, "exitCode", 0, findings);
  requireNullish(report, "errorName", findings);
  requireNullish(report, "lastError", findings);

  const checkpointAdvanced = report.checkpointAdvanced;
  if (checkpointAdvanced !== true && !args.allowNoCheckpointAdvance) {
    findings.push({
      rule: "checkpoint_not_advanced",
      message: `checkpointAdvanced must be true for a successful apply report, got ${JSON.stringify(checkpointAdvanced)}.`,
    });
  }

  const cardsSeen = requireNonNegativeNumber(report, "cardsSeen", findings);
  const cardsAvailable = requireNonNegativeNumber(report, "cardsAvailable", findings);
  requireEqual(report, "enumerationComplete", true, findings);
  const cardsImported = requireNonNegativeNumber(report, "cardsImported", findings);
  const cardsUpgraded = requireNonNegativeNumber(report, "cardsUpgraded", findings);
  const cardsSkipped = requireNonNegativeNumber(report, "cardsSkipped", findings);
  const cardsBlocked = requireNonNegativeNumber(report, "cardsBlocked", findings);
  const cardsChangedRemote = requireNonNegativeNumber(report, "cardsChangedRemote", findings);
  const cardsPlannedForImport = requireNonNegativeNumber(report, "cardsPlannedForImport", findings);
  requireNonNegativeNumber(report, "totalCharsPlanned", findings);
  requireNonNegativeNumber(report, "totalChunksFetched", findings);
  requireObject(report, "fidelityCounts", findings);
  requireObject(report, "policyBlockCounts", findings);
  requireObject(report, "plannedActionCounts", findings);

  if (cardsSeen === 0) {
    const message = "Apply saw zero Recall cards. This may be valid, but it does not prove import behavior.";
    if (args.requireCardsSeen) findings.push({ rule: "no_cards_seen", message });
    else warnings.push({ rule: "no_cards_seen", message });
  }

  if (cardsAvailable !== cardsSeen) {
    findings.push({
      rule: "enumeration_count_mismatch",
      message: `cardsAvailable ${cardsAvailable} must match cardsSeen ${cardsSeen} after apply.`,
    });
  }

  const appliedImports = cardsImported + cardsUpgraded;
  if (appliedImports === 0) {
    const message = "Apply wrote zero imported/upgraded cards. This may be valid only if all cards already existed.";
    if (args.requireAppliedImports) findings.push({ rule: "no_applied_imports", message });
    else warnings.push({ rule: "no_applied_imports", message });
  }

  if (appliedImports > args.maxAppliedImports) {
    findings.push({
      rule: "applied_import_cap_exceeded",
      message: `cardsImported + cardsUpgraded is ${appliedImports}, exceeding approved cap ${args.maxAppliedImports}.`,
    });
  }

  if (appliedImports > cardsPlannedForImport) {
    findings.push({
      rule: "applied_imports_exceed_plan",
      message: `applied imports ${appliedImports} exceeds cardsPlannedForImport ${cardsPlannedForImport}.`,
    });
  }

  if (cardsPlannedForImport > args.maxAppliedImports) {
    findings.push({
      rule: "planned_import_cap_exceeded",
      message: `cardsPlannedForImport ${cardsPlannedForImport} exceeds approved cap ${args.maxAppliedImports}.`,
    });
  }

  if (cardsBlocked > 0) {
    findings.push({
      rule: "blocked_cards_present",
      message: `cardsBlocked is ${cardsBlocked}; do not deploy or schedule until resolved.`,
    });
  }

  if (cardsChangedRemote > 0) {
    findings.push({
      rule: "changed_remote_cards_present",
      message: `cardsChangedRemote is ${cardsChangedRemote}; changed remote content requires review.`,
    });
  }

  const policyBlockTotal = sumRecord(report.policyBlockCounts);
  if (policyBlockTotal > 0) {
    findings.push({
      rule: "policy_blocks_present",
      message: `policyBlockCounts total is ${policyBlockTotal}; apply result is not clean.`,
    });
  }

  const blockedByFidelity = getCount(report.plannedActionCounts, "blocked_by_fidelity_policy");
  if (blockedByFidelity > 0) {
    findings.push({
      rule: "blocked_by_fidelity_policy_present",
      message: `plannedActionCounts.blocked_by_fidelity_policy is ${blockedByFidelity}.`,
    });
  }

  const changedRemote = getCount(report.plannedActionCounts, "changed_remote");
  if (changedRemote > 0) {
    findings.push({
      rule: "changed_remote_action_present",
      message: `plannedActionCounts.changed_remote is ${changedRemote}.`,
    });
  }

  const weakUpgrades = getCount(report.plannedActionCounts, "upgraded_existing_weak");
  if (!args.allowWeakUpgrades && weakUpgrades > 0) {
    findings.push({
      rule: "weak_upgrades_present",
      message: `plannedActionCounts.upgraded_existing_weak is ${weakUpgrades}; weak upgrades require separate approval.`,
    });
  }

  for (const [fidelity, flagName] of Object.entries(RISKY_FIDELITY_FLAGS)) {
    const count = getCount(report.fidelityCounts, fidelity);
    if (!args[flagName] && count > 0) {
      findings.push({
        rule: "risky_fidelity_present",
        message: `fidelityCounts.${fidelity} is ${count}; pass the matching explicit allow flag only after approval.`,
      });
    }
  }

  const unknownCount = getCount(report.fidelityCounts, "blocked_unknown");
  if (unknownCount > 0) {
    findings.push({
      rule: "unknown_fidelity_present",
      message: `fidelityCounts.blocked_unknown is ${unknownCount}; unknown Recall fidelity must be investigated.`,
    });
  }

  if (args.failAllSkipped && cardsSeen > 0 && cardsSkipped === cardsSeen) {
    findings.push({
      rule: "all_cards_skipped",
      message: "All seen Recall cards were skipped; confirm this is expected before deploy or scheduler enablement.",
    });
  } else if (cardsSeen > 0 && cardsSkipped === cardsSeen) {
    warnings.push({
      rule: "all_cards_skipped",
      message: "All seen Recall cards were skipped; confirm this is expected before deploy or scheduler enablement.",
    });
  }
}

function requireEqual(report, key, expected, findings) {
  if (report[key] !== expected) {
    findings.push({
      rule: "unexpected_report_value",
      message: `${key} must be ${safeJson(expected)}, got ${safeJson(report[key])}.`,
    });
  }
}

function requireNullish(report, key, findings) {
  if (report[key] !== null && report[key] !== undefined && report[key] !== "") {
    findings.push({
      rule: "unexpected_report_value",
      message: `${key} must be null/empty, got ${safeJson(report[key])}.`,
    });
  }
}

function requireNonNegativeNumber(report, key, findings) {
  const value = report[key];
  if (!Number.isFinite(value) || value < 0) {
    findings.push({
      rule: "invalid_numeric_field",
      message: `${key} must be a non-negative number, got ${safeJson(value)}.`,
    });
    return 0;
  }
  return value;
}

function requireObject(report, key, findings) {
  const value = report[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    findings.push({
      rule: "invalid_object_field",
      message: `${key} must be an object, got ${safeJson(value)}.`,
    });
  }
}

function addSecretFindings(text, findings) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const secret of SECRET_PATTERNS) {
      if (secret.pattern.test(line)) {
        findings.push({
          rule: "private_report_secret_leak",
          message: `Potential ${secret.name} on line ${index + 1}.`,
          preview: preview(line),
        });
      }
    }
  });
}

function addForbiddenPayloadKeyFindings(value, findings, path = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => addForbiddenPayloadKeyFindings(entry, findings, path.concat(index)));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entryValue] of Object.entries(value)) {
    if (FORBIDDEN_PAYLOAD_KEYS.has(key.toLowerCase())) {
      findings.push({
        rule: "raw_payload_field_present",
        message: `Apply report contains forbidden raw payload field: ${path.concat(key).join(".")}.`,
      });
    }
    addForbiddenPayloadKeyFindings(entryValue, findings, path.concat(key));
  }
}

function isUnderPrivateReportRoot(reportPath) {
  const rel = relative(resolve(PRIVATE_REPORT_ROOT), reportPath);
  return rel && !rel.startsWith("..") && !rel.startsWith("/");
}

function sumRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return Object.values(value).reduce((sum, entry) => sum + (Number.isFinite(entry) ? entry : 0), 0);
}

function getCount(value, key) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  const count = value[key];
  return Number.isFinite(count) ? count : 0;
}

function summarize(report) {
  return {
    mode: report.mode,
    state: report.state,
    cardsSeen: report.cardsSeen,
    cardsAvailable: report.cardsAvailable,
    enumerationComplete: report.enumerationComplete,
    cardsPlannedForImport: report.cardsPlannedForImport,
    cardsImported: report.cardsImported,
    cardsUpgraded: report.cardsUpgraded,
    cardsSkipped: report.cardsSkipped,
    cardsBlocked: report.cardsBlocked,
    cardsChangedRemote: report.cardsChangedRemote,
    fidelityCounts: report.fidelityCounts,
    plannedActionCounts: report.plannedActionCounts,
    checkpointAdvanced: report.checkpointAdvanced,
  };
}

function parseNonNegativeInt(label, value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer, got ${value}`);
  }
  return parsed;
}

function parsePositiveInt(label, value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer, got ${value}`);
  }
  return parsed;
}

function minutesToMs(minutes) {
  return minutes * 60 * 1000;
}

function preview(line) {
  const redacted = redactPreview(line);
  return redacted.length > 180 ? `${redacted.slice(0, 177)}...` : redacted;
}

function safeJson(value) {
  return redactPreview(JSON.stringify(value));
}

function redactPreview(line) {
  return line
    .replace(
      /\b(RECALL_API_KEY\s*=\s*)(?!<redacted|<stored|<paste|<redacted locally>|sk_\.\.\.)[^\s"'<>]+/gi,
      "$1<redacted:recall_api_key>",
    )
    .replace(/\b(Authorization\s*:\s*Bearer\s+)(?!<redacted:token>)[^\s"'<>]+/gi, "$1<redacted:token>")
    .replace(/\b(Bearer\s+)(?!<redacted:token>|<key>|\$\{)[A-Za-z0-9._-]{12,}/gi, "$1<redacted:token>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/gi, "sk_<redacted>")
    .replace(/\b(Cookie\s*:\s*)(?!<redacted:cookie>)[^\s]+/gi, "$1<redacted:cookie>")
    .replace(
      /([?&](?:access_token|api_key|apikey|key|refresh_token|signature|sig|token|x-amz-credential|x-amz-security-token|x-amz-signature)=)(?!<redacted>)[^&#\s"')]+/gi,
      "$1<redacted>",
    );
}

function fail(findings, warnings, reportPath, args) {
  console.error("[check:recall-apply-report] failed");
  console.error(
    JSON.stringify(
      {
        ok: false,
        verdict: "DO_NOT_DEPLOY_OR_SCHEDULE",
        reportPath,
        maxAppliedImports: args.maxAppliedImports,
        maxAgeMinutes: args.maxAgeMinutes,
        findings,
        warnings,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

function printHelp() {
  console.log(`Recall apply report post-apply review check

Usage:
  npm run check:recall-apply-report -- data/private/recall-live-spikes/first-apply-report.json
  npm run check:recall-apply-report -- --report data/private/recall-live-spikes/first-apply-report.json --max-applied-imports 5

Default pass criteria:
  - report is JSON from sync-recall apply mode
  - state is done and exitCode is 0
  - file mtime is within --max-age-minutes (default 120)
  - file mtime is not more than 1 minute in the future
  - checkpointAdvanced is true unless --allow-no-checkpoint-advance is used
  - enumerationComplete is true and cardsAvailable equals cardsSeen
  - cardsImported + cardsUpgraded is <= --max-applied-imports (default 5)
  - cardsImported + cardsUpgraded does not exceed cardsPlannedForImport
  - no blocked cards, changed remote cards, policy blocks, weak upgrades, risky fidelity classes, obvious secrets, or raw payload fields

Options:
  --report <path>                         Apply report path.
  --max-applied-imports <n>               Approved first-apply write cap. Default 5.
  --max-age-minutes <n>                   Report freshness window. Default 120.
  --require-cards-seen                    Fail if cardsSeen is 0.
  --require-applied-imports               Fail if cardsImported + cardsUpgraded is 0.
  --require-private-path                  Require the report under ${PRIVATE_REPORT_ROOT}/.
  --fail-all-skipped                      Fail if all seen cards were skipped.
  --allow-no-checkpoint-advance           Permit checkpointAdvanced=false for investigation only.
  --allow-weak-upgrades                   Permit weak source-URL upgrades.
  --allow-unverified-fidelity             Permit api_chunks_unverified fidelity.
  --allow-possibly-truncated-fidelity     Permit possibly_truncated fidelity.
  --allow-metadata-only-fidelity          Permit metadata_only fidelity.

This command does not call the live Recall API and does not write production data.
`);
}
