#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import type { RecallSyncClient } from "../src/lib/recall/sync-runner";
import type { RecallCardDetail } from "../src/lib/recall/types";

interface CliArgs {
  help: boolean;
  mode: "dry_run" | "apply";
  confirmApply: boolean;
  dateFrom: string | null;
  dateTo: string | null;
  maxCards: number;
  maxImports: number | null;
  maxTotalChars: number;
  maxTotalChunks: number;
  maxChunksPerCard: number;
  firstRunLookbackHours: number;
  overlapMinutes: number;
  baseUrl: string | null;
  dbPath: string | null;
  migrationsDir: string | null;
  apiKeyEnv: string;
  confirmLiveApi: boolean;
  envFiles: string[];
  fixturePath: string | null;
  outputPath: string | null;
  requireKeyRotationEvidence: boolean;
  keyRotationEnvFilePath: string | null;
  keyRotationEvidenceFilePath: string | null;
  keyRotatedAfterIso: string | null;
  keyRotationSystemEnvFile: boolean;
  requireLiveSpikeReportProof: boolean;
  liveSpikeEnumerationReportPath: string | null;
  liveSpikeFidelityReportPath: string | null;
  liveSpikeManifestPath: string | null;
  liveSpikeReportMaxAgeMinutes: number;
  liveSpikeAllowFidelityChanges: boolean;
  liveSpikeAcceptedFidelityRisk: string;
  requireDryRunProof: boolean;
  dryRunReportPath: string | null;
  dryRunReportMaxAgeMinutes: number;
  dryRunReportMaxPlannedImports: number | null;
  dryRunReportRequireCardsSeen: boolean;
  requireBackupProof: boolean;
  backupPath: string | null;
  backupMaxAgeMinutes: number;
  allowWeakUpgradeByUrl: boolean;
  allowUnverifiedImport: boolean;
  allowPossiblyTruncatedImport: boolean;
  allowMetadataOnlyImport: boolean;
  warningUiAvailable: boolean;
  recoverStaleLock: boolean;
  runId: string | null;
  executionId: string | null;
  trigger: "automatic" | "manual_ui";
  requestId: string | null;
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const MAX_PROOF_FUTURE_SKEW_MS = 60 * 1000;
const DEFAULT_KEY_ROTATION_ENV_FILE = "data/private/recall-live-spikes/recall.env";
const DEFAULT_KEY_ROTATION_EVIDENCE_FILE =
  "data/private/recall-live-spikes/key-rotation-evidence.json";
const DEFAULT_KEY_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  loadEnvFile(resolve(process.cwd(), ".env"));
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  for (const envFile of args.envFiles) loadEnvFile(resolve(envFile));

  if (args.dbPath) process.env.BRAIN_DB_PATH = resolve(args.dbPath);
  if (args.migrationsDir) process.env.BRAIN_MIGRATIONS_DIR = resolve(args.migrationsDir);
  setPackagedMigrationsDirDefault();

  if (args.mode === "apply" && process.env.BRAIN_RECALL_SYNC_ENABLED !== "1") {
    exitConfigError("Apply mode requires BRAIN_RECALL_SYNC_ENABLED=1.");
    return;
  }
  if (args.mode === "apply" && !args.confirmApply) {
    exitConfigError("Apply mode requires --confirm-apply after a reviewed dry-run and backup.");
    return;
  }
  if (args.mode === "apply" && requiresKeyRotationEvidence(args)) {
    const keyRotationEvidenceError = verifyKeyRotationEvidence(args);
    if (keyRotationEvidenceError) {
      exitConfigError(keyRotationEvidenceError);
      return;
    }
  }
  if (requiresLiveSpikeReportProof(args)) {
    const liveSpikeReportError = verifyLiveSpikeReportProof(args);
    if (liveSpikeReportError) {
      exitConfigError(liveSpikeReportError);
      return;
    }
  }
  if (args.mode === "apply" && requiresDryRunProof(args)) {
    const dryRunError = verifyDryRunProof(args);
    if (dryRunError) {
      exitConfigError(dryRunError);
      return;
    }
  }
  if (args.mode === "apply" && requiresBackupProof(args)) {
    const backupError = verifyBackupProof(args);
    if (backupError) {
      exitConfigError(backupError);
      return;
    }
  }

  const apiKey = process.env[args.apiKeyEnv]?.trim() ?? "";
  if (!args.fixturePath && !apiKey) {
    exitConfigError(`${args.apiKeyEnv} is not set. Use --fixture for offline smoke runs.`);
    return;
  }
  if (!args.fixturePath && !isLiveApiConfirmed(args)) {
    exitConfigError(
      "Live Recall API mode requires --confirm-live-api or BRAIN_RECALL_CONFIRM_LIVE_API=1 after approval.",
    );
    return;
  }

  const [{ RecallApiClient }, { runRecallSync }, { sanitizeRecallSyncReport }] = await Promise.all([
    import("../src/lib/recall/client"),
    import("../src/lib/recall/sync-runner"),
    import("../src/lib/recall/scheduler"),
  ]);

  const windowOverride = parseWindowOverride(args);
  const now = windowOverride?.dateToMs ?? Date.now();
  const client: RecallSyncClient = args.fixturePath
    ? fixtureClient(args.fixturePath)
    : new RecallApiClient({
        apiKey,
        baseUrl: args.baseUrl ?? undefined,
      });

  const report = await runRecallSync({
    mode: args.mode,
    client,
    now,
    checkpointIso: windowOverride?.dateFromIso,
    firstRunLookbackMs: windowOverride?.lookbackMs ?? hoursToMs(args.firstRunLookbackHours),
    overlapMs: windowOverride ? 0 : minutesToMs(args.overlapMinutes),
    maxChunksPerCard: args.maxChunksPerCard,
    limits: {
      maxCards: args.maxCards,
      maxImports: args.maxImports ?? (args.mode === "apply" ? 5 : args.maxCards),
      maxTotalChars: args.maxTotalChars,
      maxTotalChunks: args.maxTotalChunks,
    },
    upgradeWeakExistingByUrl: args.allowWeakUpgradeByUrl,
    fidelityPolicy: {
      allowUnverifiedImport: args.allowUnverifiedImport,
      allowPossiblyTruncatedImport: args.allowPossiblyTruncatedImport,
      allowMetadataOnlyImport: args.allowMetadataOnlyImport,
      warningUiAvailable: args.warningUiAvailable,
    },
    allowStaleLockRecovery: args.recoverStaleLock,
    runId: args.runId ?? undefined,
    executionId: args.executionId,
    trigger: args.trigger,
    requestId: args.requestId,
  });
  const redactedReport = sanitizeRecallSyncReport(report);
  const output = `${JSON.stringify(redactedReport, null, 2)}\n`;
  if (args.outputPath) {
    writeFileSync(resolve(args.outputPath), output, "utf8");
  } else {
    process.stdout.write(output);
  }
  process.exitCode = report.exitCode;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    help: false,
    mode: "dry_run",
    confirmApply: false,
    dateFrom: null,
    dateTo: null,
    maxCards: 20,
    maxImports: null,
    maxTotalChars: 250_000,
    maxTotalChunks: 250,
    maxChunksPerCard: 50,
    firstRunLookbackHours: 26,
    overlapMinutes: 10,
    baseUrl: null,
    dbPath: null,
    migrationsDir: null,
    apiKeyEnv: "RECALL_API_KEY",
    confirmLiveApi: false,
    envFiles: [],
    fixturePath: null,
    outputPath: null,
    requireKeyRotationEvidence: false,
    keyRotationEnvFilePath: null,
    keyRotationEvidenceFilePath: null,
    keyRotatedAfterIso: null,
    keyRotationSystemEnvFile: false,
    requireLiveSpikeReportProof: false,
    liveSpikeEnumerationReportPath: null,
    liveSpikeFidelityReportPath: null,
    liveSpikeManifestPath: null,
    liveSpikeReportMaxAgeMinutes: 1440,
    liveSpikeAllowFidelityChanges: false,
    liveSpikeAcceptedFidelityRisk: "",
    requireDryRunProof: false,
    dryRunReportPath: null,
    dryRunReportMaxAgeMinutes: 120,
    dryRunReportMaxPlannedImports: null,
    dryRunReportRequireCardsSeen: false,
    requireBackupProof: false,
    backupPath: null,
    backupMaxAgeMinutes: 120,
    allowWeakUpgradeByUrl: false,
    allowUnverifiedImport: false,
    allowPossiblyTruncatedImport: false,
    allowMetadataOnlyImport: false,
    warningUiAvailable: false,
    recoverStaleLock: false,
    runId: null,
    executionId: null,
    trigger: "automatic",
    requestId: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--dry-run":
        args.mode = "dry_run";
        break;
      case "--apply":
        args.mode = "apply";
        break;
      case "--mode":
        args.mode = parseMode(requireValue(arg, next));
        i += 1;
        break;
      case "--confirm-apply":
        args.confirmApply = true;
        break;
      case "--date-from":
        args.dateFrom = requireValue(arg, next);
        i += 1;
        break;
      case "--date-to":
        args.dateTo = requireValue(arg, next);
        i += 1;
        break;
      case "--max-cards":
        args.maxCards = parsePositiveInt(arg, requireValue(arg, next));
        i += 1;
        break;
      case "--max-imports":
        args.maxImports = parseNonNegativeInt(arg, requireValue(arg, next));
        i += 1;
        break;
      case "--max-total-chars":
        args.maxTotalChars = parsePositiveInt(arg, requireValue(arg, next));
        i += 1;
        break;
      case "--max-total-chunks":
        args.maxTotalChunks = parsePositiveInt(arg, requireValue(arg, next));
        i += 1;
        break;
      case "--max-chunks-per-card":
        args.maxChunksPerCard = Math.min(50, parsePositiveInt(arg, requireValue(arg, next)));
        i += 1;
        break;
      case "--first-run-lookback-hours":
        args.firstRunLookbackHours = parsePositiveNumber(arg, requireValue(arg, next));
        i += 1;
        break;
      case "--overlap-minutes":
        args.overlapMinutes = parseNonNegativeNumber(arg, requireValue(arg, next));
        i += 1;
        break;
      case "--base-url":
        args.baseUrl = requireValue(arg, next).replace(/\/+$/, "");
        i += 1;
        break;
      case "--db-path":
        args.dbPath = requireValue(arg, next);
        i += 1;
        break;
      case "--migrations-dir":
        args.migrationsDir = requireValue(arg, next);
        i += 1;
        break;
      case "--api-key-env":
        args.apiKeyEnv = requireValue(arg, next);
        i += 1;
        break;
      case "--confirm-live-api":
        args.confirmLiveApi = true;
        break;
      case "--env-file":
        args.envFiles.push(requireValue(arg, next));
        i += 1;
        break;
      case "--fixture":
        args.fixturePath = requireValue(arg, next);
        i += 1;
        break;
      case "--output":
        args.outputPath = requireValue(arg, next);
        i += 1;
        break;
      case "--require-key-rotation-evidence":
        args.requireKeyRotationEvidence = true;
        break;
      case "--key-rotation-env-file":
        args.keyRotationEnvFilePath = requireValue(arg, next);
        i += 1;
        break;
      case "--key-rotation-evidence-file":
        args.keyRotationEvidenceFilePath = requireValue(arg, next);
        i += 1;
        break;
      case "--no-key-rotation-evidence-file":
        args.keyRotationEvidenceFilePath = "";
        break;
      case "--key-rotated-after":
        args.keyRotatedAfterIso = requireValue(arg, next);
        i += 1;
        break;
      case "--key-rotation-system-env-file":
        args.keyRotationSystemEnvFile = true;
        break;
      case "--require-live-spike-report-proof":
        args.requireLiveSpikeReportProof = true;
        break;
      case "--live-spike-enumeration-report-path":
        args.liveSpikeEnumerationReportPath = requireValue(arg, next);
        i += 1;
        break;
      case "--live-spike-fidelity-report-path":
        args.liveSpikeFidelityReportPath = requireValue(arg, next);
        i += 1;
        break;
      case "--live-spike-manifest-path":
        args.liveSpikeManifestPath = requireValue(arg, next);
        i += 1;
        break;
      case "--live-spike-report-max-age-minutes":
        args.liveSpikeReportMaxAgeMinutes = parsePositiveNumber(arg, requireValue(arg, next));
        i += 1;
        break;
      case "--live-spike-allow-fidelity-changes":
        args.liveSpikeAllowFidelityChanges = true;
        break;
      case "--live-spike-accepted-fidelity-risk":
        args.liveSpikeAcceptedFidelityRisk = requireValue(arg, next);
        i += 1;
        break;
      case "--require-dry-run-proof":
        args.requireDryRunProof = true;
        break;
      case "--dry-run-report-path":
        args.dryRunReportPath = requireValue(arg, next);
        i += 1;
        break;
      case "--dry-run-report-max-age-minutes":
        args.dryRunReportMaxAgeMinutes = parsePositiveNumber(arg, requireValue(arg, next));
        i += 1;
        break;
      case "--dry-run-report-max-planned-imports":
        args.dryRunReportMaxPlannedImports = parseNonNegativeInt(arg, requireValue(arg, next));
        i += 1;
        break;
      case "--dry-run-report-require-cards-seen":
        args.dryRunReportRequireCardsSeen = true;
        break;
      case "--require-backup-proof":
        args.requireBackupProof = true;
        break;
      case "--backup-path":
        args.backupPath = requireValue(arg, next);
        i += 1;
        break;
      case "--backup-max-age-minutes":
        args.backupMaxAgeMinutes = parsePositiveNumber(arg, requireValue(arg, next));
        i += 1;
        break;
      case "--allow-weak-upgrade-by-url":
        args.allowWeakUpgradeByUrl = true;
        break;
      case "--allow-unverified-import":
        args.allowUnverifiedImport = true;
        break;
      case "--allow-truncated-import":
        args.allowPossiblyTruncatedImport = true;
        break;
      case "--allow-metadata-only-import":
        args.allowMetadataOnlyImport = true;
        break;
      case "--warning-ui-available":
        args.warningUiAvailable = true;
        break;
      case "--json":
        break;
      case "--recover-stale-lock":
        args.recoverStaleLock = true;
        break;
      case "--run-id":
        args.runId = requireValue(arg, next);
        i += 1;
        break;
      case "--execution-id":
        args.executionId = requireValue(arg, next);
        i += 1;
        break;
      case "--trigger": {
        const trigger = requireValue(arg, next);
        if (trigger !== "automatic" && trigger !== "manual_ui") {
          throw new Error("--trigger must be automatic or manual_ui");
        }
        args.trigger = trigger;
        i += 1;
        break;
      }
      case "--request-id":
        args.requestId = requireValue(arg, next);
        i += 1;
        break;
      default:
        throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if ((args.dateFrom && !args.dateTo) || (!args.dateFrom && args.dateTo)) {
    throw new Error("--date-from and --date-to must be provided together.");
  }
  return args;
}

function parseWindowOverride(args: CliArgs): {
  dateFromIso: string;
  dateToMs: number;
  lookbackMs: number;
} | null {
  if (!args.dateFrom || !args.dateTo) return null;
  const dateFromMs = Date.parse(args.dateFrom);
  const dateToMs = Date.parse(args.dateTo);
  if (!Number.isFinite(dateFromMs) || !Number.isFinite(dateToMs)) {
    throw new Error("--date-from and --date-to must be valid ISO timestamps.");
  }
  if (dateFromMs > dateToMs) {
    throw new Error("--date-from must be before or equal to --date-to.");
  }
  return {
    dateFromIso: new Date(dateFromMs).toISOString(),
    dateToMs,
    lookbackMs: Math.max(1, dateToMs - dateFromMs),
  };
}

function fixtureClient(path: string): RecallSyncClient {
  const fullPath = resolve(path);
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  const cards = normalizeFixtureCards(parsed);
  const byId = new Map(cards.map((card) => [card.id, card]));
  return {
    async listCards() {
      return {
        cards: cards.map((card) => ({ id: card.id })),
        totalCount: cards.length,
      };
    },
    async getCardDetail(cardId) {
      const card = byId.get(cardId);
      if (!card) throw new Error(`Fixture card not found: ${cardId}`);
      return card;
    },
  };
}

function normalizeFixtureCards(value: unknown): RecallCardDetail[] {
  const rows =
    Array.isArray(value)
      ? value
      : value && typeof value === "object" && Array.isArray((value as { cards?: unknown }).cards)
        ? ((value as { cards: unknown[] }).cards)
        : [];
  return rows.map((row, index) => {
    if (!row || typeof row !== "object") throw new Error(`Fixture card ${index} must be an object.`);
    const card = row as Record<string, unknown>;
    const id = typeof card.id === "string" ? card.id : null;
    if (!id) throw new Error(`Fixture card ${index} is missing id.`);
    return {
      id,
      title: typeof card.title === "string" ? card.title : null,
      created_at: typeof card.created_at === "string" ? card.created_at : null,
      source_url: typeof card.source_url === "string" ? card.source_url : null,
      image: typeof card.image === "string" ? card.image : null,
      chunks: Array.isArray(card.chunks) ? (card.chunks as RecallCardDetail["chunks"]) : [],
    };
  });
}

function requiresBackupProof(args: CliArgs): boolean {
  return args.requireBackupProof || process.env.BRAIN_RECALL_REQUIRE_BACKUP_PROOF === "1";
}

function requiresKeyRotationEvidence(args: CliArgs): boolean {
  return (
    args.requireKeyRotationEvidence ||
    process.env.BRAIN_RECALL_REQUIRE_KEY_ROTATION_EVIDENCE === "1"
  );
}

function requiresLiveSpikeReportProof(args: CliArgs): boolean {
  return (
    args.requireLiveSpikeReportProof ||
    process.env.BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF === "1"
  );
}

function isLiveApiConfirmed(args: CliArgs): boolean {
  return args.confirmLiveApi || process.env.BRAIN_RECALL_CONFIRM_LIVE_API === "1";
}

function requiresDryRunProof(args: CliArgs): boolean {
  return args.requireDryRunProof || process.env.BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF === "1";
}

function verifyKeyRotationEvidence(args: CliArgs): string | null {
  const checkerPath = resolveKeyRotationEvidenceCheckerPath();
  if (!checkerPath) {
    return "Key rotation evidence checker not found. Expected scripts/check-recall-key-rotation-evidence.mjs.";
  }

  const keyRotationEnvFile =
    args.keyRotationEnvFilePath ??
    process.env.BRAIN_RECALL_KEY_ROTATION_ENV_FILE ??
    args.envFiles[0] ??
    DEFAULT_KEY_ROTATION_ENV_FILE;
  const keyRotationEvidenceFile =
    args.keyRotationEvidenceFilePath ??
    process.env.BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE ??
    DEFAULT_KEY_ROTATION_EVIDENCE_FILE;
  const keyRotatedAfter =
    args.keyRotatedAfterIso ??
    process.env.BRAIN_RECALL_KEY_ROTATED_AFTER_ISO ??
    DEFAULT_KEY_ROTATED_AFTER_ISO;
  const keyRotationSystemEnvFile =
    args.keyRotationSystemEnvFile ||
    process.env.BRAIN_RECALL_KEY_ROTATION_SYSTEM_ENV_FILE === "1";

  const commandArgs = [
    checkerPath,
    "--env-file",
    keyRotationEnvFile,
    ...(keyRotationEvidenceFile
      ? ["--evidence-file", keyRotationEvidenceFile]
      : ["--no-evidence-file"]),
    "--min-rotated-after",
    keyRotatedAfter,
    ...(keyRotationSystemEnvFile ? ["--system-env-file"] : []),
  ];
  const result = spawnSync(process.execPath, ["--", ...commandArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return `Key rotation evidence failed: ${previewProofFailure(result.stderr || result.stdout)}`;
  }

  console.error("[recall-sync] key rotation evidence ok");
  return null;
}

function verifyLiveSpikeReportProof(args: CliArgs): string | null {
  if (!args.liveSpikeEnumerationReportPath) {
    return "Recall sync requires --live-spike-enumeration-report-path when live spike report proof is required.";
  }
  if (!args.liveSpikeFidelityReportPath) {
    return "Recall sync requires --live-spike-fidelity-report-path when live spike report proof is required.";
  }

  const enumerationPath = resolve(args.liveSpikeEnumerationReportPath);
  const fidelityPath = resolve(args.liveSpikeFidelityReportPath);
  const manifestPath = args.liveSpikeManifestPath ? resolve(args.liveSpikeManifestPath) : null;
  const checkerPath = resolveLiveSpikeReportCheckerPath();
  if (!checkerPath) {
    return "Live spike report proof checker not found. Expected scripts/check-recall-live-spike-reports.mjs.";
  }

  const freshnessError = verifyReportFreshness(
    [
      ["SPIKE-013", enumerationPath],
      ["SPIKE-014", fidelityPath],
    ],
    args.liveSpikeReportMaxAgeMinutes,
  );
  if (freshnessError) return freshnessError;

  const commandArgs = [
    checkerPath,
    "--enumeration",
    enumerationPath,
    "--fidelity",
    fidelityPath,
    ...(manifestPath && args.fixturePath ? ["--allow-unsafe-manifest-for-smoke"] : []),
    ...(manifestPath ? ["--manifest", manifestPath] : []),
    ...(args.liveSpikeAllowFidelityChanges ? ["--allow-fidelity-changes"] : []),
    ...(args.liveSpikeAcceptedFidelityRisk
      ? ["--accepted-fidelity-risk", args.liveSpikeAcceptedFidelityRisk]
      : []),
  ];
  const result = spawnSync(process.execPath, ["--", ...commandArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return `Live spike report proof failed: ${previewProofFailure(result.stderr || result.stdout)}`;
  }

  console.error("[recall-sync] live spike report proof ok");
  return null;
}

function verifyDryRunProof(args: CliArgs): string | null {
  if (!args.dryRunReportPath) {
    return "Apply mode requires --dry-run-report-path when dry-run proof is required.";
  }
  const reportPath = resolve(args.dryRunReportPath);
  if (!existsSync(reportPath)) return `Dry-run proof report not found: ${reportPath}`;

  const freshnessError = verifyProofFileFreshness(
    reportPath,
    "Dry-run proof report",
    args.dryRunReportMaxAgeMinutes,
  );
  if (freshnessError) return freshnessError;

  let report: Record<string, unknown>;
  try {
    const parsed = JSON.parse(readFileSync(reportPath, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "Dry-run proof report must be a JSON object.";
    }
    report = parsed as Record<string, unknown>;
  } catch (error) {
    return `Dry-run proof report is not valid JSON: ${error instanceof Error ? error.message : String(error)}`;
  }

  const maxPlannedImports =
    args.dryRunReportMaxPlannedImports ?? args.maxImports ?? (args.mode === "apply" ? 5 : args.maxCards);
  const findings = validateDryRunProofReport(report, args, maxPlannedImports);
  if (findings.length > 0) {
    return `Dry-run proof failed: ${findings.join("; ")}`;
  }

  console.error(`[recall-sync] dry-run proof ok: ${reportPath}`);
  return null;
}

function validateDryRunProofReport(
  report: Record<string, unknown>,
  args: CliArgs,
  maxPlannedImports: number,
): string[] {
  const findings: string[] = [];
  requireReportValue(report, "mode", "dry_run", findings);
  requireReportValue(report, "state", "done", findings);
  requireReportValue(report, "exitCode", 0, findings);
  requireReportEmpty(report, "errorName", findings);
  requireReportEmpty(report, "lastError", findings);
  requireReportValue(report, "checkpointAdvanced", false, findings);
  requireReportValue(report, "cardsImported", 0, findings);
  requireReportValue(report, "cardsUpgraded", 0, findings);

  if (args.dateFrom && args.dateTo) {
    const expectedDateFrom = new Date(Date.parse(args.dateFrom)).toISOString();
    const expectedDateTo = new Date(Date.parse(args.dateTo)).toISOString();
    requireReportValue(report, "dateFrom", expectedDateFrom, findings);
    requireReportValue(report, "dateTo", expectedDateTo, findings);
  }

  const cardsSeen = getReportNumber(report, "cardsSeen", findings);
  const cardsAvailable = getReportNumber(report, "cardsAvailable", findings);
  requireReportValue(report, "enumerationComplete", true, findings);
  const cardsBlocked = getReportNumber(report, "cardsBlocked", findings);
  const cardsChangedRemote = getReportNumber(report, "cardsChangedRemote", findings);
  const cardsPlannedForImport = getReportNumber(report, "cardsPlannedForImport", findings);
  const policyBlockCounts = getReportObject(report, "policyBlockCounts", findings);
  const fidelityCounts = getReportObject(report, "fidelityCounts", findings);
  const plannedActionCounts = getReportObject(report, "plannedActionCounts", findings);

  if (args.dryRunReportRequireCardsSeen && cardsSeen === 0) {
    findings.push("dry-run proof saw zero Recall cards");
  }
  if (cardsAvailable !== cardsSeen) {
    findings.push(
      `dry-run proof cardsAvailable ${cardsAvailable} does not match cardsSeen ${cardsSeen}`,
    );
  }
  if (cardsPlannedForImport > maxPlannedImports) {
    findings.push(
      `dry-run proof planned imports ${cardsPlannedForImport} exceeds cap ${maxPlannedImports}`,
    );
  }
  if (cardsBlocked > 0) findings.push(`dry-run proof has cardsBlocked=${cardsBlocked}`);
  if (cardsChangedRemote > 0) {
    findings.push(`dry-run proof has cardsChangedRemote=${cardsChangedRemote}`);
  }

  const policyBlockTotal = sumReportCounts(policyBlockCounts);
  if (policyBlockTotal > 0) findings.push(`dry-run proof has policyBlockCounts total ${policyBlockTotal}`);

  const blockedByFidelity = getRecordCount(plannedActionCounts, "blocked_by_fidelity_policy");
  if (blockedByFidelity > 0) {
    findings.push(`dry-run proof has blocked_by_fidelity_policy=${blockedByFidelity}`);
  }

  const changedRemote = getRecordCount(plannedActionCounts, "changed_remote");
  if (changedRemote > 0) findings.push(`dry-run proof has changed_remote=${changedRemote}`);

  const weakUpgrades = getRecordCount(plannedActionCounts, "upgraded_existing_weak");
  if (!args.allowWeakUpgradeByUrl && weakUpgrades > 0) {
    findings.push(`dry-run proof has weak upgrades without --allow-weak-upgrade-by-url`);
  }

  if (!args.allowUnverifiedImport && getRecordCount(fidelityCounts, "api_chunks_unverified") > 0) {
    findings.push("dry-run proof has api_chunks_unverified without --allow-unverified-import");
  }
  if (
    !args.allowPossiblyTruncatedImport &&
    getRecordCount(fidelityCounts, "possibly_truncated") > 0
  ) {
    findings.push("dry-run proof has possibly_truncated without --allow-truncated-import");
  }
  if (!args.allowMetadataOnlyImport && getRecordCount(fidelityCounts, "metadata_only") > 0) {
    findings.push("dry-run proof has metadata_only without --allow-metadata-only-import");
  }
  if (getRecordCount(fidelityCounts, "blocked_unknown") > 0) {
    findings.push("dry-run proof has blocked_unknown fidelity");
  }

  return findings;
}

function verifyBackupProof(args: CliArgs): string | null {
  if (!args.backupPath) {
    return "Apply mode requires --backup-path when backup proof is required.";
  }
  const backupPath = resolve(args.backupPath);
  if (!existsSync(backupPath)) return `Backup proof file not found: ${backupPath}`;

  const freshnessError = verifyProofFileFreshness(backupPath, "Backup proof", args.backupMaxAgeMinutes);
  if (freshnessError) return freshnessError;

  const db = new Database(backupPath, { readonly: true, fileMustExist: true });
  try {
    const integrity = db.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") return `Backup integrity_check failed: ${integrity}`;
  } catch (error) {
    return `Backup integrity_check failed: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    db.close();
  }

  console.error(`[recall-sync] backup proof ok: ${backupPath}`);
  return null;
}

function verifyReportFreshness(entries: Array<[string, string]>, maxAgeMinutes: number): string | null {
  for (const [label, path] of entries) {
    if (!existsSync(path)) return `${label} live spike report not found: ${path}`;
    const freshnessError = verifyProofFileFreshness(path, `${label} live spike report`, maxAgeMinutes);
    if (freshnessError) return freshnessError;
  }
  return null;
}

function verifyProofFileFreshness(path: string, label: string, maxAgeMinutes: number): string | null {
  const stats = statSync(path);
  const nowMs = Date.now();
  if (stats.mtimeMs - nowMs > MAX_PROOF_FUTURE_SKEW_MS) {
    return `${label} mtime is more than 1 minute in the future: ${path}`;
  }
  const maxAgeMs = minutesToMs(maxAgeMinutes);
  if (nowMs - stats.mtimeMs > maxAgeMs) {
    return `${label} is older than ${maxAgeMinutes} minutes: ${path}`;
  }
  return null;
}

function resolveLiveSpikeReportCheckerPath(): string | null {
  const candidates = [
    resolve(process.cwd(), "scripts/check-recall-live-spike-reports.mjs"),
    join(SCRIPT_DIR, "check-recall-live-spike-reports.mjs"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function resolveKeyRotationEvidenceCheckerPath(): string | null {
  const candidates = [
    resolve(process.cwd(), "scripts/check-recall-key-rotation-evidence.mjs"),
    join(SCRIPT_DIR, "check-recall-key-rotation-evidence.mjs"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function previewProofFailure(value: string): string {
  const trimmed = redact(value.trim());
  if (!trimmed) return "checker exited without output";
  return trimmed.length > 700 ? `${trimmed.slice(0, 697)}...` : trimmed;
}

function requireReportValue(
  report: Record<string, unknown>,
  key: string,
  expected: unknown,
  findings: string[],
): void {
  if (report[key] !== expected) {
    findings.push(`${key} must be ${JSON.stringify(expected)}, got ${JSON.stringify(report[key])}`);
  }
}

function requireReportEmpty(
  report: Record<string, unknown>,
  key: string,
  findings: string[],
): void {
  if (report[key] !== null && report[key] !== undefined && report[key] !== "") {
    findings.push(`${key} must be null/empty, got ${JSON.stringify(report[key])}`);
  }
}

function getReportNumber(
  report: Record<string, unknown>,
  key: string,
  findings: string[],
): number {
  const value = report[key];
  if (!Number.isFinite(value) || (value as number) < 0) {
    findings.push(`${key} must be a non-negative number, got ${JSON.stringify(value)}`);
    return 0;
  }
  return value as number;
}

function getReportObject(
  report: Record<string, unknown>,
  key: string,
  findings: string[],
): Record<string, unknown> {
  const value = report[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    findings.push(`${key} must be an object`);
    return {};
  }
  return value as Record<string, unknown>;
}

function sumReportCounts(record: Record<string, unknown>): number {
  return Object.values(record).reduce<number>(
    (sum, value) => sum + (typeof value === "number" && Number.isFinite(value) ? value : 0),
    0,
  );
}

function getRecordCount(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function setPackagedMigrationsDirDefault(): void {
  if (process.env.BRAIN_MIGRATIONS_DIR?.trim()) return;
  const packaged = join(SCRIPT_DIR, "db", "migrations");
  if (existsSync(packaged)) process.env.BRAIN_MIGRATIONS_DIR = packaged;
}

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = stripUnquotedComment(line).trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    if (process.env[key] !== undefined && process.env[key] !== "") continue;
    process.env[key] = unquoteEnvValue(match[2].trim());
  }
}

function stripUnquotedComment(value: string): string {
  let quote: string | null = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if ((char === '"' || char === "'") && value[index - 1] !== "\\") {
      quote = quote === char ? null : quote ?? char;
    }
    if (char === "#" && !quote) return value.slice(0, index);
  }
  return value;
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function requireValue(arg: string, value: string | undefined): string {
  if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value.`);
  return value;
}

function parseMode(value: string): "dry_run" | "apply" {
  if (value === "dry_run" || value === "dry-run") return "dry_run";
  if (value === "apply") return "apply";
  throw new Error(`--mode must be dry-run or apply, got ${value}`);
}

function parsePositiveInt(label: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${label} must be a positive integer.`);
  return parsed;
}

function parseNonNegativeInt(label: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return parsed;
}

function parsePositiveNumber(label: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be a positive number.`);
  return parsed;
}

function parseNonNegativeNumber(label: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return parsed;
}

function hoursToMs(value: number): number {
  return Math.round(value * 60 * 60 * 1000);
}

function minutesToMs(value: number): number {
  return Math.round(value * 60 * 1000);
}

function exitConfigError(message: string): void {
  console.error(`[recall-sync] ${redact(message)}`);
  process.exitCode = 2;
}

function redact(value: string): string {
  return value
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer <redacted:token>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>");
}

function printHelp(): void {
  console.log(`Recall daily snapshot import CLI

Usage:
  node scripts/sync-recall.ts --dry-run --date-from 2026-06-24T00:00:00Z --date-to 2026-06-24T23:59:59Z
  BRAIN_RECALL_SYNC_ENABLED=1 node scripts/sync-recall.ts --apply --confirm-apply --max-imports 5

Options:
  --dry-run                         Plan a run without writing items or advancing checkpoint. Default.
  --apply                           Import cards and advance checkpoint only after a clean run.
  --confirm-apply                   Required with --apply.
  --date-from <iso>                 Override start of Recall API date window.
  --date-to <iso>                   Override end of Recall API date window.
  --max-cards <n>                   Default 20.
  --max-imports <n>                 Default max-cards for dry-run, 5 for apply.
  --max-total-chars <n>             Default 250000.
  --max-total-chunks <n>            Default 250.
  --max-chunks-per-card <n>         Default 50; clamped to Recall API range 1-50.
  --first-run-lookback-hours <n>    Default 26 when no checkpoint exists.
  --overlap-minutes <n>             Default 10.
  --allow-weak-upgrade-by-url       Optional exact source-URL weak item upgrade. Default off.
  --allow-unverified-import         Allow Recall API chunks whose completeness is not verified.
  --allow-truncated-import          Allow exactly-max-chunk Recall cards; retrieval remains blocked.
  --allow-metadata-only-import      Allow metadata-only Recall cards; retrieval remains blocked.
  --warning-ui-available            Mark allowed unverified chunks as retrieval-eligible.
  --recover-stale-lock              Explicitly recover stale lock rows.
  --run-id <id>                     Trusted stable run correlation ID.
  --execution-id <id>               Trusted wrapper execution correlation ID.
  --trigger <automatic|manual_ui>   Trusted trigger classification.
  --request-id <id>                 Trusted manual request correlation ID.
  --db-path <path>                  Sets BRAIN_DB_PATH before loading the DB layer.
  --migrations-dir <path>           Sets BRAIN_MIGRATIONS_DIR. Bundled CLI defaults to ./db/migrations.
  --api-key-env <name>              Env var that contains the Recall API key. Default RECALL_API_KEY.
  --confirm-live-api                Required for live Recall API mode. Not required with --fixture.
  --base-url <url>                  Recall API base URL override.
  --env-file <path>                 Load an additional env file. Repeatable.
  --fixture <path>                  Offline fixture JSON for bundle smoke/testing; does not call Recall.
  --output <path>                   Write redacted JSON report to a file instead of stdout.
  --require-key-rotation-evidence   Require local key-rotation evidence before apply.
  --key-rotation-env-file <path>    Env file checked for rotation metadata. Defaults to first --env-file, then ${DEFAULT_KEY_ROTATION_ENV_FILE}.
  --key-rotation-evidence-file <path> Optional private evidence JSON. Default ${DEFAULT_KEY_ROTATION_EVIDENCE_FILE}.
  --no-key-rotation-evidence-file   Disable optional private evidence JSON fallback.
  --key-rotated-after <iso>         Minimum rotation checkpoint. Default ${DEFAULT_KEY_ROTATED_AFTER_ISO}.
  --key-rotation-system-env-file    Use system env-file metadata rules for the key evidence gate.
  --require-live-spike-report-proof Require accepted SPIKE-013/SPIKE-014 reports before dry-run/apply.
  --live-spike-enumeration-report-path <path> SPIKE-013 Markdown report proof.
  --live-spike-fidelity-report-path <path> SPIKE-014 Markdown report proof.
  --live-spike-manifest-path <path> Optional private controlled-sample manifest for exact and normalized private-value privacy scanning.
  --live-spike-report-max-age-minutes <n> Freshness window for live spike reports. Default 1440.
  --live-spike-allow-fidelity-changes Allow SPIKE-014 PROCEED-WITH-CHANGES after review.
  --live-spike-accepted-fidelity-risk <text> Required note when accepting fidelity changes.
  --require-dry-run-proof           Require a fresh reviewed dry-run report before apply.
  --dry-run-report-path <path>      Redacted dry-run report JSON proof.
  --dry-run-report-max-age-minutes <n> Freshness window for dry-run proof. Default 120. Proof files more than 1 minute in the future are rejected.
  --dry-run-report-max-planned-imports <n> Approved planned import cap for dry-run proof.
  --dry-run-report-require-cards-seen Fail proof if cardsSeen is 0.
  --require-backup-proof            Require a fresh SQLite backup before apply.
  --backup-path <path>              Backup verified with PRAGMA integrity_check when proof is required.
  --backup-max-age-minutes <n>      Freshness window for backup proof. Default 120. Proof files more than 1 minute in the future are rejected.
  --json                           Accepted for script compatibility; output is always JSON.
`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[recall-sync] ${redact(message)}`);
  process.exit(1);
});
