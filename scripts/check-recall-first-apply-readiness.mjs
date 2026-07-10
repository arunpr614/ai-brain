#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import Database from "better-sqlite3";
import {
  DEFAULT_RECALL_ENUMERATION_REPORT,
  DEFAULT_RECALL_FIDELITY_REPORT,
  resolveLatestRecallSpikeReportPair,
} from "./lib/recall-latest-spike-reports.mjs";

const DEFAULT_ENUMERATION_REPORT = DEFAULT_RECALL_ENUMERATION_REPORT;
const DEFAULT_FIDELITY_REPORT = DEFAULT_RECALL_FIDELITY_REPORT;
const DEFAULT_MANIFEST = "data/private/recall-live-spikes/controlled-samples.json";
const DEFAULT_ENV_FILE = "data/private/recall-live-spikes/recall.env";
const DEFAULT_KEY_ROTATION_EVIDENCE_FILE = "data/private/recall-live-spikes/key-rotation-evidence.json";
const DEFAULT_DRY_RUN_REPORT = "data/private/recall-live-spikes/dry-run-report.json";
const DEFAULT_BACKUP_PATH =
  "data/private/recall-live-spikes/backups/recall-first-apply-20260624T134927Z.sqlite";
const DEFAULT_ACCEPTED_FIDELITY_RISK =
  "Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used.";
const DEFAULT_MIN_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";
const PRIVATE_ROOT = "data/private/recall-live-spikes";
const MAX_FUTURE_SKEW_MS = 60 * 1000;
const DEFAULT_MIN_FRESHNESS_REMAINING_MINUTES = 5;

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const checked = [];
const findings = [];

if (!args.skipPrivateIgnore) {
  checked.push(runJsonGate("private_ignore", [script("check-recall-private-ignore.mjs")], findings));
}

if (!args.skipLiveGateStatus) {
  checked.push(
    runJsonGate(
      "live_gate_status",
      [
        script("check-recall-live-gate-status.mjs"),
        "--manifest",
        args.manifestPath,
        "--env-file",
        args.envFilePath,
        "--require-ready",
      ],
      findings,
    ),
  );
}

if (!args.skipKeyRotationEvidence) {
  checked.push(
    runJsonGate(
      "key_rotation_evidence",
      [
        script("check-recall-key-rotation-evidence.mjs"),
        "--env-file",
        args.envFilePath,
        "--evidence-file",
        args.keyRotationEvidenceFilePath,
        "--min-rotated-after",
        args.keyRotatedAfterIso,
      ],
      findings,
    ),
  );
}

if (!args.skipApprovalPacket) {
  checked.push(runJsonGate("approval_packet", [script("check-recall-approval-packet.mjs")], findings));
}

checked.push(
  runJsonGate(
    "live_spike_report_proof",
    [
      script("check-recall-live-spike-reports.mjs"),
      "--enumeration",
      args.enumerationPath,
      "--fidelity",
      args.fidelityPath,
      ...(args.allowUnsafeManifestForSmoke ? ["--allow-unsafe-manifest-for-smoke"] : []),
      "--manifest",
      args.manifestPath,
      ...(args.allowFidelityChanges ? ["--allow-fidelity-changes"] : []),
      ...(args.acceptedFidelityRisk ? ["--accepted-fidelity-risk", args.acceptedFidelityRisk] : []),
    ],
    findings,
  ),
);

checked.push(
  runJsonGate(
    "dry_run_report_proof",
    [
      script("check-recall-dry-run-report.mjs"),
      "--report",
      args.dryRunReportPath,
      "--max-planned-imports",
      String(args.maxPlannedImports),
      "--max-age-minutes",
      String(args.dryRunReportMaxAgeMinutes),
      ...(args.allowNonPrivateDryRunReport ? [] : ["--require-private-path"]),
      "--require-cards-seen",
      ...(args.allowUnverifiedFidelity ? ["--allow-unverified-fidelity"] : []),
      ...(args.allowMetadataOnlyFidelity ? ["--allow-metadata-only-fidelity"] : []),
      ...(args.allowPossiblyTruncatedFidelity ? ["--allow-possibly-truncated-fidelity"] : []),
    ],
    findings,
  ),
);
addProofFreshnessFloorFinding(
  "dry_run_report_proof",
  args.dryRunReportPath,
  args.dryRunReportMaxAgeMinutes,
  args.minFreshnessRemainingMinutes,
  findings,
);

checked.push(checkBackupProof(args, findings));

if (!args.skipPublicDocsPrivacy) {
  checked.push(runJsonGate("public_docs_privacy", [script("check-recall-public-docs-privacy.mjs")], findings));
}

const ok = findings.length === 0;
const output = {
  ok,
  verdict: ok ? "PASS_FIRST_CAPPED_APPLY_READINESS_GATE" : "DO_NOT_APPLY",
  checked,
  inputs: {
    enumerationReport: args.enumerationPath,
    fidelityReport: args.fidelityPath,
    manifest: args.manifestPath,
    envFile: args.envFilePath,
    dryRunReport: args.dryRunReportPath,
    backupPath: args.backupPath,
  },
  limits: {
    maxPlannedImports: args.maxPlannedImports,
    dryRunReportMaxAgeMinutes: args.dryRunReportMaxAgeMinutes,
    backupMaxAgeMinutes: args.backupMaxAgeMinutes,
    minFreshnessRemainingMinutes: args.minFreshnessRemainingMinutes,
  },
  findings,
  nextGate: ok
    ? "Machine readiness passed. Explicit Arun approval and key rotation acknowledgement are still required before the first capped --apply."
    : "Do not run --apply. Resolve readiness findings, rotate the Recall API key if key evidence failed, refresh stale private proof if needed, then rerun this gate.",
};

if (!ok) {
  console.error("[check:recall-first-apply-readiness] failed");
  console.error(JSON.stringify(output, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(output, null, 2));

function checkBackupProof(parsedArgs, findings) {
  const backupPath = resolve(parsedArgs.backupPath);
  const summary = {
    id: "backup_proof",
    path: parsedArgs.backupPath,
    ok: false,
  };

  if (!existsSync(backupPath)) {
    findings.push({ id: "backup_proof", rule: "missing_backup", message: `Backup proof does not exist: ${backupPath}` });
    return summary;
  }

  const stats = statSync(backupPath);
  const mode = stats.mode & 0o777;
  summary.sizeBytes = stats.size;
  summary.mtimeIso = stats.mtime.toISOString();
  summary.mode = mode.toString(8).padStart(3, "0");

  const nowMs = Date.now();
  Object.assign(summary, proofFreshness(stats.mtimeMs, parsedArgs.backupMaxAgeMinutes, nowMs));
  if (summary.freshnessRemainingMinutes < parsedArgs.minFreshnessRemainingMinutes) {
    findings.push({
      id: "backup_proof",
      rule: "proof_expiring_soon",
      message: `Backup proof has ${summary.freshnessRemainingMinutes} freshness minutes remaining; require at least ${parsedArgs.minFreshnessRemainingMinutes}.`,
    });
  }
  if (stats.mtimeMs - nowMs > MAX_FUTURE_SKEW_MS) {
    findings.push({
      id: "backup_proof",
      rule: "future_dated_backup",
      message: "Backup proof mtime is more than 1 minute in the future.",
    });
  }
  if (nowMs - stats.mtimeMs > minutesToMs(parsedArgs.backupMaxAgeMinutes)) {
    findings.push({
      id: "backup_proof",
      rule: "stale_backup",
      message: `Backup proof is older than ${parsedArgs.backupMaxAgeMinutes} minutes.`,
    });
  }
  if (!parsedArgs.allowNonPrivateBackup && !isUnderPrivateRoot(backupPath)) {
    findings.push({
      id: "backup_proof",
      rule: "backup_not_private",
      message: `Backup proof must stay under ${PRIVATE_ROOT}/.`,
    });
  }
  if (!hasSecurePrivateMode(mode)) {
    findings.push({
      id: "backup_proof",
      rule: "insecure_backup_permissions",
      message: "Backup proof must be owner-readable only, for example mode 0600.",
    });
  }

  try {
    const db = new Database(backupPath, { readonly: true, fileMustExist: true });
    try {
      summary.integrity = db.pragma("integrity_check", { simple: true });
    } finally {
      db.close();
    }
    if (summary.integrity !== "ok") {
      findings.push({
        id: "backup_proof",
        rule: "backup_integrity_failed",
        message: `Backup integrity_check returned ${String(summary.integrity)}`,
      });
    }
  } catch (error) {
    findings.push({
      id: "backup_proof",
      rule: "backup_integrity_error",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  summary.ok =
    !findings.some((finding) => finding.id === "backup_proof") && summary.integrity === "ok";
  return summary;
}

function runJsonGate(id, commandArgs, findings) {
  const result = spawnSync(process.execPath, ["--", ...commandArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const summary = {
    id,
    ok: result.status === 0,
    exitCode: result.status,
  };
  const text = result.status === 0 ? result.stdout : result.stderr || result.stdout;
  const parsed = parseMaybeJson(text);
  if (parsed && typeof parsed === "object") {
    summary.verdict = parsed.verdict ?? parsed.status ?? null;
    summary.details = summarizeGateResult(id, parsed);
  } else {
    summary.preview = preview(text);
  }
  if (result.status !== 0) {
    findings.push({
      id,
      rule: "gate_failed",
      message: `${id} failed with exit code ${result.status}.`,
      preview: preview(text),
    });
  }
  return summary;
}

function summarizeGateResult(id, value) {
  if (id === "live_gate_status") {
    return {
      readyForApprovedLiveSpikes: value.readyForApprovedLiveSpikes === true,
      privateEvidenceOk: value.privateEvidenceOk === true,
      envFileLoaded: value.credential?.recallEnvFile?.loaded === true,
    };
  }
  if (id === "live_spike_report_proof") {
    return {
      enumerationVerdict: value.reports?.enumeration?.verdict ?? null,
      fidelityVerdict: value.reports?.fidelity?.verdict ?? null,
      manifestPrivacyScanRequired: value.manifestPrivacyScan?.required === true,
    };
  }
  if (id === "dry_run_report_proof") {
    return {
      cardsSeen: value.summary?.cardsSeen ?? null,
      cardsPlannedForImport: value.summary?.cardsPlannedForImport ?? null,
      checkpointAdvanced: value.summary?.checkpointAdvanced ?? null,
      proofFreshness: proofFreshnessFromPath(args.dryRunReportPath, args.dryRunReportMaxAgeMinutes),
    };
  }
  if (id === "approval_packet") {
    return {
      checkedDocs: Array.isArray(value.checkedDocs) ? value.checkedDocs.length : null,
      requiredScripts: value.scriptCheck?.requiredScripts ?? null,
    };
  }
  if (id === "key_rotation_evidence") {
    return {
      verdict: value.verdict ?? null,
      envFile: value.summary?.envFile ?? null,
      minRotatedAfterIso: value.summary?.minRotatedAfterIso ?? null,
      mtimeIso: value.summary?.mtimeIso ?? null,
      mode: value.summary?.mode ?? null,
      underPrivateRecallEvidencePath: value.summary?.underPrivateRecallEvidencePath ?? null,
      ignored: value.summary?.ignored ?? null,
      tracked: value.summary?.tracked ?? null,
      findings: summarizeChildFindings(value.findings),
    };
  }
  if (id === "public_docs_privacy") {
    return {
      scannedFiles: value.scannedFiles ?? null,
      currentDocsRequired: value.currentDocsRequired === true,
    };
  }
  return { ok: value.ok === true };
}

function summarizeChildFindings(value) {
  if (!Array.isArray(value)) return [];
  return value.map((finding) => ({
    rule: finding?.rule ?? null,
    message: finding?.message ? preview(String(finding.message)) : null,
  }));
}

function parseMaybeJson(text) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const latestSpikeReports = resolveLatestRecallSpikeReportPair();
  const parsed = {
    enumerationPath: process.env.BRAIN_RECALL_FIRST_APPLY_ENUMERATION_REPORT_PATH ?? latestSpikeReports.enumerationPath,
    fidelityPath: process.env.BRAIN_RECALL_FIRST_APPLY_FIDELITY_REPORT_PATH ?? latestSpikeReports.fidelityPath,
    manifestPath: DEFAULT_MANIFEST,
    envFilePath: DEFAULT_ENV_FILE,
    keyRotationEvidenceFilePath: DEFAULT_KEY_ROTATION_EVIDENCE_FILE,
    dryRunReportPath: DEFAULT_DRY_RUN_REPORT,
    backupPath: DEFAULT_BACKUP_PATH,
    acceptedFidelityRisk: DEFAULT_ACCEPTED_FIDELITY_RISK,
    keyRotatedAfterIso: DEFAULT_MIN_ROTATED_AFTER_ISO,
    maxPlannedImports: 5,
    dryRunReportMaxAgeMinutes: 120,
    backupMaxAgeMinutes: 120,
    minFreshnessRemainingMinutes: DEFAULT_MIN_FRESHNESS_REMAINING_MINUTES,
    allowFidelityChanges: true,
    allowUnverifiedFidelity: true,
    allowMetadataOnlyFidelity: true,
    allowPossiblyTruncatedFidelity: false,
    allowUnsafeManifestForSmoke: false,
    allowNonPrivateDryRunReport: false,
    allowNonPrivateBackup: false,
    skipPrivateIgnore: false,
    skipLiveGateStatus: false,
    skipKeyRotationEvidence: false,
    skipApprovalPacket: false,
    skipPublicDocsPrivacy: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--enumeration" && next) {
      parsed.enumerationPath = next;
      i += 1;
    } else if (arg === "--fidelity" && next) {
      parsed.fidelityPath = next;
      i += 1;
    } else if (arg === "--manifest" && next) {
      parsed.manifestPath = next;
      i += 1;
    } else if (arg === "--env-file" && next) {
      parsed.envFilePath = next;
      i += 1;
    } else if (arg === "--key-rotation-evidence-file" && next) {
      parsed.keyRotationEvidenceFilePath = next;
      i += 1;
    } else if (arg === "--dry-run-report" && next) {
      parsed.dryRunReportPath = next;
      i += 1;
    } else if (arg === "--backup-path" && next) {
      parsed.backupPath = next;
      i += 1;
    } else if (arg === "--accepted-fidelity-risk" && next) {
      parsed.acceptedFidelityRisk = next;
      i += 1;
    } else if (arg === "--key-rotated-after" && next) {
      parsed.keyRotatedAfterIso = next;
      i += 1;
    } else if (arg === "--max-planned-imports" && next) {
      parsed.maxPlannedImports = parseNonNegativeInt(arg, next);
      i += 1;
    } else if (arg === "--dry-run-report-max-age-minutes" && next) {
      parsed.dryRunReportMaxAgeMinutes = parsePositiveNumber(arg, next);
      i += 1;
    } else if (arg === "--backup-max-age-minutes" && next) {
      parsed.backupMaxAgeMinutes = parsePositiveNumber(arg, next);
      i += 1;
    } else if (arg === "--min-freshness-remaining-minutes" && next) {
      parsed.minFreshnessRemainingMinutes = parseNonNegativeNumber(arg, next);
      i += 1;
    } else if (arg === "--allow-fidelity-changes") parsed.allowFidelityChanges = true;
    else if (arg === "--no-allow-fidelity-changes") parsed.allowFidelityChanges = false;
    else if (arg === "--allow-unverified-fidelity") parsed.allowUnverifiedFidelity = true;
    else if (arg === "--allow-metadata-only-fidelity") parsed.allowMetadataOnlyFidelity = true;
    else if (arg === "--allow-possibly-truncated-fidelity") parsed.allowPossiblyTruncatedFidelity = true;
    else if (arg === "--allow-unsafe-manifest-for-smoke") parsed.allowUnsafeManifestForSmoke = true;
    else if (arg === "--allow-non-private-dry-run-report") parsed.allowNonPrivateDryRunReport = true;
    else if (arg === "--allow-non-private-backup") parsed.allowNonPrivateBackup = true;
    else if (arg === "--skip-private-ignore") parsed.skipPrivateIgnore = true;
    else if (arg === "--skip-live-gate-status") parsed.skipLiveGateStatus = true;
    else if (arg === "--skip-key-rotation-evidence") parsed.skipKeyRotationEvidence = true;
    else if (arg === "--skip-approval-packet") parsed.skipApprovalPacket = true;
    else if (arg === "--skip-public-docs-privacy") parsed.skipPublicDocsPrivacy = true;
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  return parsed;
}

function script(name) {
  return resolve("scripts", name);
}

function isUnderPrivateRoot(path) {
  const root = resolve(PRIVATE_ROOT);
  return path === root || path.startsWith(`${root}${sep}`);
}

function hasSecurePrivateMode(mode) {
  const ownerCanRead = (mode & 0o400) !== 0;
  const groupOrOtherHasAccess = (mode & 0o077) !== 0;
  return ownerCanRead && !groupOrOtherHasAccess;
}

function minutesToMs(value) {
  return Math.round(value * 60 * 1000);
}

function proofFreshnessFromPath(path, maxAgeMinutes) {
  const resolved = resolve(path);
  if (!existsSync(resolved)) return null;
  const stats = statSync(resolved);
  return {
    mtimeIso: stats.mtime.toISOString(),
    ...proofFreshness(stats.mtimeMs, maxAgeMinutes),
  };
}

function proofFreshness(mtimeMs, maxAgeMinutes, nowMs = Date.now()) {
  const ageMs = nowMs - mtimeMs;
  return {
    ageMinutes: roundToTenth(ageMs / 60_000),
    maxAgeMinutes,
    freshnessRemainingMinutes: roundToTenth((minutesToMs(maxAgeMinutes) - ageMs) / 60_000),
    futureSkewMinutes: ageMs < 0 ? roundToTenth(-ageMs / 60_000) : 0,
  };
}

function addProofFreshnessFloorFinding(id, path, maxAgeMinutes, minFreshnessRemainingMinutes, findings) {
  const resolved = resolve(path);
  if (!existsSync(resolved)) return;
  const stats = statSync(resolved);
  const freshness = proofFreshness(stats.mtimeMs, maxAgeMinutes);
  if (freshness.freshnessRemainingMinutes < minFreshnessRemainingMinutes) {
    findings.push({
      id,
      rule: "proof_expiring_soon",
      message: `${id} has ${freshness.freshnessRemainingMinutes} freshness minutes remaining; require at least ${minFreshnessRemainingMinutes}.`,
    });
  }
}

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

function parsePositiveNumber(label, value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be a positive number.`);
  return parsed;
}

function parseNonNegativeNumber(label, value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative number.`);
  return parsed;
}

function parseNonNegativeInt(label, value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative integer.`);
  return parsed;
}

function preview(value) {
  const redacted = String(value)
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer <redacted:token>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>");
  const trimmed = redacted.trim();
  return trimmed.length > 500 ? `${trimmed.slice(0, 497)}...` : trimmed;
}

function printHelp() {
  console.log(`Recall first capped apply readiness gate

Usage:
  npm run check:recall-first-apply-readiness

This command does not call the live Recall API, does not import AI Brain items,
and does not advance a checkpoint. It verifies the current first capped apply
proof chain: private gates, live readiness status, approval-packet consistency,
local key rotation evidence, accepted live SPIKE reports, reviewed dry-run proof,
backup integrity/freshness, and public-doc privacy. It also requires proof files to have at least
--min-freshness-remaining-minutes remaining; default ${DEFAULT_MIN_FRESHNESS_REMAINING_MINUTES}.
`);
}
