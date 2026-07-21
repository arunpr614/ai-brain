import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  openSync,
  realpathSync,
  statSync,
} from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { A1HarnessError } from "./errors";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const OUTPUT_FILENAME = "a1-normalized-transcript.private.json";

export type A1ExecutionClass = "DEV" | "SEALED";
export type A1SubtitleFormat = "srt" | "vtt";
export type A1CompletenessBasis =
  | "explicit_source_assertion"
  | "source_coverage_record"
  | "user_attestation"
  | "unknown";
export type A1ContentCompleteness = "complete" | "partial" | "unknown";
export type A1ExpectedClass = "eligible_supported" | "expected_safe_rejection";

export interface A1CliOptions {
  executionClass: A1ExecutionClass;
  attestationPath: string;
  expectedAttestationSha256: string;
  inputPath: string;
  expectedInputSha256: string;
  expectedVideoId: string;
  format: A1SubtitleFormat;
  expectedCueCount: number;
  declaredDurationMs: number;
  expectedLastCueEndMs: number;
  language: string;
  inputFileIntegrityAttested: true;
  contentCompleteness: A1ContentCompleteness;
  contentCompletenessBasis: A1CompletenessBasis;
  expectedClass: A1ExpectedClass;
  privateOutputDir: string;
}

export interface A1BootstrapContext {
  options: A1CliOptions;
  dbPath: string;
  privateOutputDir: string;
  privateNormalizedOutputPath: string;
  repoRoot: string;
}

const VALUE_FLAGS = new Set([
  "execution-class",
  "attestation",
  "expected-attestation-sha256",
  "input",
  "expected-input-sha256",
  "expected-video-id",
  "format",
  "expected-cue-count",
  "declared-duration-ms",
  "expected-last-cue-end-ms",
  "language",
  "input-file-integrity-attested",
  "content-completeness",
  "content-completeness-basis",
  "expected-class",
  "private-output-dir",
]);

export function parseCliOptions(argv: readonly string[]): A1CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new A1HarnessError("ARGUMENT_INVALID", "Every CLI option requires one explicit value.");
    }
    const key = flag.slice(2);
    if (!VALUE_FLAGS.has(key) || values.has(key)) {
      throw new A1HarnessError("ARGUMENT_INVALID", "Unknown or duplicate CLI option.");
    }
    values.set(key, value);
  }

  if (argv.length !== VALUE_FLAGS.size * 2 || values.size !== VALUE_FLAGS.size) {
    throw new A1HarnessError("ARGUMENT_INVALID", "The complete locked CLI contract is required.");
  }

  const executionClass = required(values, "execution-class");
  const format = required(values, "format");
  const expectedAttestationSha256 = required(values, "expected-attestation-sha256");
  const expectedInputSha256 = required(values, "expected-input-sha256");
  const expectedVideoId = required(values, "expected-video-id");
  const language = required(values, "language");

  if (executionClass !== "DEV" && executionClass !== "SEALED") {
    throw new A1HarnessError("ARGUMENT_INVALID", "execution-class must be DEV or SEALED.");
  }
  if (format !== "srt" && format !== "vtt") {
    throw new A1HarnessError("ARGUMENT_INVALID", "format must be srt or vtt.");
  }
  if (!SHA256_PATTERN.test(expectedAttestationSha256) || !SHA256_PATTERN.test(expectedInputSha256)) {
    throw new A1HarnessError("ARGUMENT_INVALID", "Expected hashes must be lowercase SHA-256 values.");
  }
  if (!VIDEO_ID_PATTERN.test(expectedVideoId)) {
    throw new A1HarnessError("ARGUMENT_INVALID", "The expected YouTube video ID is invalid.");
  }
  if (!LANGUAGE_PATTERN.test(language)) {
    throw new A1HarnessError("ARGUMENT_INVALID", "The language tag is invalid.");
  }
  if (required(values, "input-file-integrity-attested") !== "true") {
    throw new A1HarnessError("ARGUMENT_INVALID", "Exact input-file integrity must be explicitly attested.");
  }
  const contentCompleteness = required(values, "content-completeness");
  if (
    contentCompleteness !== "complete"
    && contentCompleteness !== "partial"
    && contentCompleteness !== "unknown"
  ) {
    throw new A1HarnessError(
      "ARGUMENT_INVALID",
      "Content completeness must be complete, partial, or unknown.",
    );
  }
  const contentCompletenessBasis = required(values, "content-completeness-basis");
  if (
    contentCompletenessBasis !== "explicit_source_assertion"
    && contentCompletenessBasis !== "source_coverage_record"
    && contentCompletenessBasis !== "user_attestation"
    && contentCompletenessBasis !== "unknown"
  ) {
    throw new A1HarnessError(
      "ARGUMENT_INVALID",
      "The completeness basis is invalid.",
    );
  }
  const expectedClass = required(values, "expected-class");
  if (expectedClass !== "eligible_supported" && expectedClass !== "expected_safe_rejection") {
    throw new A1HarnessError("ARGUMENT_INVALID", "The expected A1 class is invalid.");
  }

  return {
    executionClass,
    attestationPath: resolve(required(values, "attestation")),
    expectedAttestationSha256,
    inputPath: resolve(required(values, "input")),
    expectedInputSha256,
    expectedVideoId,
    format,
    expectedCueCount: positiveInteger(required(values, "expected-cue-count")),
    declaredDurationMs: positiveInteger(required(values, "declared-duration-ms")),
    expectedLastCueEndMs: nonNegativeInteger(required(values, "expected-last-cue-end-ms")),
    language,
    inputFileIntegrityAttested: true,
    contentCompleteness,
    contentCompletenessBasis,
    expectedClass,
    privateOutputDir: required(values, "private-output-dir"),
  };
}

/**
 * This function is intentionally called by cli.ts before the network guard's
 * later dynamic import of any application module.
 */
export function assertBootstrapEnvironment(options: A1CliOptions): A1BootstrapContext {
  if (
    process.env.YOUTUBE_TRANSCRIPT_RECOVERY_ENABLED !== "0"
    || process.env.YOUTUBE_TRANSCRIPT_WORKER_ENABLED !== "0"
  ) {
    throw new A1HarnessError(
      "BOOTSTRAP_FLAGS_REQUIRED",
      "Both transcript recovery controls must be explicitly disabled before process start.",
    );
  }

  const configuredDbPath = process.env.BRAIN_DB_PATH?.trim();
  if (!configuredDbPath || configuredDbPath === ":memory:" || !isAbsolute(configuredDbPath)) {
    throw new A1HarnessError(
      "BRAIN_DB_PATH_REQUIRED",
      "BRAIN_DB_PATH must be an explicit absolute filesystem path.",
    );
  }

  if (!isAbsolute(options.privateOutputDir)) {
    throw new A1HarnessError(
      "PRIVATE_OUTPUT_INVALID",
      "The caller-supplied private output directory must be absolute.",
    );
  }

  let privateOutputDir: string;
  try {
    privateOutputDir = realpathSync(options.privateOutputDir);
    const stat = statSync(privateOutputDir);
    if (!stat.isDirectory() || (stat.mode & 0o077) !== 0) {
      throw new Error("not a private directory");
    }
  } catch {
    throw new A1HarnessError(
      "PRIVATE_OUTPUT_INVALID",
      "The private output directory must already exist and deny group/world access.",
    );
  }

  const repoRoot = realpathSync(fileURLToPath(new URL("../../../../../", import.meta.url)));
  if (isWithin(repoRoot, privateOutputDir)) {
    throw new A1HarnessError(
      "PRIVATE_OUTPUT_INVALID",
      "Raw output must be outside the repository worktree.",
    );
  }

  let dbParent: string;
  try {
    dbParent = realpathSync(dirname(configuredDbPath));
  } catch {
    throw new A1HarnessError(
      "BRAIN_DB_PATH_REQUIRED",
      "BRAIN_DB_PATH must have an existing private parent directory.",
    );
  }
  const dbPath = join(dbParent, basename(configuredDbPath));
  if (dbParent !== privateOutputDir || extname(dbPath) !== ".sqlite") {
    throw new A1HarnessError(
      "BRAIN_DB_PATH_REQUIRED",
      "BRAIN_DB_PATH must name a .sqlite file directly inside the private output directory.",
    );
  }

  assertBrandNewDatabasePath(dbPath);
  const privateNormalizedOutputPath = resolve(privateOutputDir, OUTPUT_FILENAME);
  if (existsSync(privateNormalizedOutputPath)) {
    throw new A1HarnessError(
      "PRIVATE_OUTPUT_INVALID",
      "The private normalized output already exists; overwriting is prohibited.",
    );
  }

  // The application DB client reads the environment at module evaluation.
  // Replace any caller spelling that traversed a benign parent symlink (for
  // example /var -> /private/var on macOS) with the verified canonical path.
  process.env.BRAIN_DB_PATH = dbPath;

  return {
    options: { ...options, privateOutputDir },
    dbPath,
    privateOutputDir,
    privateNormalizedOutputPath,
    repoRoot,
  };
}

export function assertBrandNewDatabasePath(dbPath: string): void {
  if (
    existsSync(dbPath)
    || existsSync(`${dbPath}-wal`)
    || existsSync(`${dbPath}-shm`)
    || existsSync(`${dbPath}-journal`)
  ) {
    throw new A1HarnessError(
      "BRAIN_DB_NOT_FRESH",
      "The throwaway database path or an SQLite sidecar already exists.",
    );
  }
}

/** Atomically claims the previously absent path before better-sqlite3 opens it. */
export function reserveBrandNewDatabasePath(dbPath: string): void {
  assertBrandNewDatabasePath(dbPath);
  try {
    const fd = openSync(
      dbPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | constants.O_NOFOLLOW,
      0o600,
    );
    closeSync(fd);
    chmodSync(dbPath, 0o600);
  } catch {
    throw new A1HarnessError(
      "BRAIN_DB_NOT_FRESH",
      "The throwaway database path could not be claimed exclusively.",
    );
  }
}

function required(values: ReadonlyMap<string, string>, key: string): string {
  const value = values.get(key);
  if (!value) throw new A1HarnessError("ARGUMENT_INVALID", "A required CLI value is missing.");
  return value;
}

function positiveInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new A1HarnessError("ARGUMENT_INVALID", "A positive integer option is invalid.");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new A1HarnessError("ARGUMENT_INVALID", "A numeric option exceeds the safe integer range.");
  }
  return parsed;
}

function nonNegativeInteger(value: string): number {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new A1HarnessError("ARGUMENT_INVALID", "A non-negative integer option is invalid.");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new A1HarnessError("ARGUMENT_INVALID", "A numeric option exceeds the safe integer range.");
  }
  return parsed;
}

function isWithin(parent: string, candidate: string): boolean {
  const child = relative(parent, candidate);
  return child === "" || (!child.startsWith("..") && !isAbsolute(child));
}
