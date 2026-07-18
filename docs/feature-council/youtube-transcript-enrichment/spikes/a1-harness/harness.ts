import { basename, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { chmodSync, lstatSync, readFileSync, writeFileSync } from "node:fs";

import {
  SUBTITLE_PREFLIGHT_VERSION,
  SUBTITLE_LIMITS,
  SubtitlePreflightError,
  preflightSubtitleBytes,
} from "../../benchmark/tools/subtitle-preflight";

import { parseLockedA1Attestation, sha256Hex } from "./attestation";
import {
  type A1BootstrapContext,
  reserveBrandNewDatabasePath,
} from "./bootstrap";
import { A1HarnessError } from "./errors";
import type { InstalledNetworkGuard, NetworkAttemptRecord } from "./network-guard";
import {
  assertExactPersistedSegments,
  buildNormalizedTranscript,
  canonicalizePersistedSegments,
  expectedPersistedSegments,
  stableJson,
} from "./normalized-transcript";
import { verifyHarnessSchemaFiles } from "./schema-integrity";

export const A1_HARNESS_VERSION = "1.0.0";

const CURRENT_PRODUCT_GAP_CODES = Object.freeze([
  "attestation_not_collected_or_enforced_by_current_service",
  "permissive_parser_requires_harness_preflight",
  "retention_and_derivation_not_runtime_enforced",
  "legacy_recovery_queue_coupled_to_youtube_item_insert",
  "normalized_contract_not_fully_persisted",
] as const);

export interface A1PublicationSafeReport {
  schema_version: "1.0";
  harness_version: typeof A1_HARNESS_VERSION;
  execution_class: "DEV" | "SEALED";
  claim_scope: "development_wiring_only" | "locked_cell_only";
  status: "pass";
  hashes: {
    attestation_sha256: string;
    attestation_schema_sha256: string;
    input_sha256: string;
    video_id_sha256: string;
    preflight_canonical_sha256: string;
    expected_segments_sha256: string;
    persisted_segments_sha256: string;
    normalized_transcript_sha256: string;
    normalized_transcript_schema_sha256: string;
    benchmark_lock_sha256?: string;
  };
  counts: {
    attestation_part_count: number;
    raw_byte_count: number;
    normalized_text_character_count: number;
    locked_cue_count: number;
    declared_duration_ms: number;
    last_cue_end_ms: number;
    persisted_segment_count: number;
    overlap_count: number;
    exact_duplicate_count: number;
    recovery_job_count: number;
    transcript_provider_attempt_count: number;
    enrichment_provider_attempt_count: number;
    llm_provider_attempt_count: number;
    provider_attempt_count: number;
    network_attempt_count: number;
    current_product_gap_count: number;
  };
  versions: {
    strict_preflight: string;
    app_file_parser: string;
  };
  classification: {
    locked: "eligible_supported";
    observed: "eligible_supported";
    content_completeness: "complete" | "partial";
    content_completeness_basis:
      | "explicit_source_assertion"
      | "source_coverage_record"
      | "user_attestation";
  };
  network_attempts: readonly NetworkAttemptRecord[];
  outcomes: {
    isolated_a1_strategy: {
      ingestion_invoked: true;
      feasible: true;
      exact_segment_match: true;
      no_network_attempt: true;
      no_provider_attempt: true;
    };
    current_product: {
      ready: false;
      known_gap_codes: readonly string[];
    };
  };
}

export interface A1PublicationSafeRejectionReport {
  schema_version: "1.0";
  harness_version: typeof A1_HARNESS_VERSION;
  execution_class: "DEV" | "SEALED";
  claim_scope: "development_wiring_only" | "locked_cell_only";
  status: "safe_rejection";
  hashes: {
    attestation_sha256: string;
    attestation_schema_sha256: string;
    input_sha256: string;
    video_id_sha256: string;
    preflight_canonical_sha256: string;
    normalized_transcript_schema_sha256: string;
    benchmark_lock_sha256?: string;
  };
  counts: {
    attestation_part_count: number;
    raw_byte_count: number;
    normalized_text_character_count: number;
    locked_cue_count: number;
    declared_duration_ms: number;
    last_cue_end_ms: number;
    overlap_count: number;
    exact_duplicate_count: number;
    persisted_segment_count: 0;
    recovery_job_count: 0;
    enrichment_provider_attempt_count: 0;
    provider_attempt_count: 0;
    network_attempt_count: 0;
    current_product_gap_count: number;
  };
  versions: {
    strict_preflight: string;
  };
  classification: {
    locked: "expected_safe_rejection";
    observed: "expected_safe_rejection";
    content_completeness: "complete" | "partial" | "unknown";
    content_completeness_basis:
      | "explicit_source_assertion"
      | "source_coverage_record"
      | "user_attestation"
      | "unknown";
  };
  network_attempts: readonly NetworkAttemptRecord[];
  outcomes: {
    isolated_a1_strategy: {
      ingestion_invoked: false;
      truthful_safe_rejection: true;
      no_network_attempt: true;
      no_provider_attempt: true;
    };
    current_product: {
      ready: false;
      known_gap_codes: readonly string[];
    };
  };
}

export type A1HarnessRunReport = A1PublicationSafeReport | A1PublicationSafeRejectionReport;

interface VerifiedSealEvidence {
  lockSha256: string;
  frozenFiles: ReadonlyMap<string, string>;
}

export async function runA1Harness(
  context: A1BootstrapContext,
  networkGuard: InstalledNetworkGuard,
): Promise<A1HarnessRunReport> {
  const sealEvidence = await verifySealForSealedRun(context);
  const benchmarkLockSha256 = sealEvidence?.lockSha256 ?? null;
  const schemaEvidence = verifyHarnessSchemaFiles();
  const attestationBytes = readRegularFile(context.options.attestationPath, 256_000);
  const locked = parseLockedA1Attestation(
    attestationBytes,
    context.options.expectedAttestationSha256,
  );
  assertAttestationFrozenBySeal(context, locked.rawSha256, sealEvidence);
  assertLockedInputContract(context, locked.attestation.input_contract);

  if (locked.attestation.youtube_video_id !== context.options.expectedVideoId) {
    throw new A1HarnessError(
      "VIDEO_ID_LOCK_MISMATCH",
      "The CLI and locked attestation video IDs differ.",
    );
  }
  if (locked.attestation.source.sidecar_sha256 !== context.options.expectedInputSha256) {
    throw new A1HarnessError(
      "INPUT_LOCK_MISMATCH",
      "The CLI and locked attestation input digests differ.",
    );
  }
  if (extname(locked.attestation.source.private_relative_path) !== `.${context.options.format}`) {
    throw new A1HarnessError(
      "INPUT_LOCK_MISMATCH",
      "The locked private input path does not match the declared format.",
    );
  }

  const inputBytes = readRegularFile(context.options.inputPath, SUBTITLE_LIMITS.maxBytes);
  const inputSha256 = sha256Hex(inputBytes);
  if (
    inputSha256 !== context.options.expectedInputSha256
    || inputSha256 !== locked.attestation.source.sidecar_sha256
  ) {
    throw new A1HarnessError(
      "INPUT_LOCK_MISMATCH",
      "The exact input bytes do not match both locked digests.",
    );
  }

  let preflight;
  try {
    preflight = preflightSubtitleBytes(inputBytes, {
      format: context.options.format,
      declaredDurationMs: context.options.declaredDurationMs,
      expectedRawSha256: context.options.expectedInputSha256,
      expectedCueCount: context.options.expectedCueCount,
      inputFileIntegrityAttested: context.options.inputFileIntegrityAttested,
      contentCompleteness: context.options.contentCompleteness,
      contentCompletenessBasis: context.options.contentCompletenessBasis,
    });
  } catch (error) {
    if (error instanceof SubtitlePreflightError) {
      throw new A1HarnessError(
        "PREFLIGHT_REJECTED",
        "Strict subtitle preflight rejected the entire input.",
        error.code,
      );
    }
    throw error;
  }

  const lastCueEndMs = preflight.cues[preflight.cues.length - 1]?.endMs ?? -1;
  if (lastCueEndMs !== context.options.expectedLastCueEndMs) {
    throw new A1HarnessError(
      "ATTESTATION_CONTRACT_MISMATCH",
      "The parsed last cue end does not match the locked input contract.",
    );
  }

  const observedClass = classifyPreflightResult(
    preflight.a1SupportedClass.state,
    context.options.contentCompleteness,
    context.options.contentCompletenessBasis,
  );
  if (observedClass !== context.options.expectedClass) {
    throw new A1HarnessError(
      "ATTESTATION_CONTRACT_MISMATCH",
      "The observed A1 class does not match the locked expected class.",
    );
  }

  if (observedClass === "expected_safe_rejection") {
    if (networkGuard.attempts.length !== 0) {
      throw new A1HarnessError(
        "NETWORK_ATTEMPT_BLOCKED",
        "The network guard observed an attempted call before safe rejection.",
      );
    }
    return {
      schema_version: "1.0",
      harness_version: A1_HARNESS_VERSION,
      execution_class: context.options.executionClass,
      claim_scope: context.options.executionClass === "DEV"
        ? "development_wiring_only"
        : "locked_cell_only",
      status: "safe_rejection",
      hashes: {
        attestation_sha256: locked.rawSha256,
        attestation_schema_sha256: schemaEvidence.attestationSchemaSha256,
        input_sha256: inputSha256,
        video_id_sha256: sha256Hex(locked.attestation.youtube_video_id),
        preflight_canonical_sha256: preflight.normalizedSha256,
        normalized_transcript_schema_sha256: schemaEvidence.normalizedTranscriptSchemaSha256,
        ...(benchmarkLockSha256 ? { benchmark_lock_sha256: benchmarkLockSha256 } : {}),
      },
      counts: {
        attestation_part_count: locked.attestationPartCount,
        raw_byte_count: preflight.rawByteLength,
        normalized_text_character_count: preflight.normalizedTextCharacterCount,
        locked_cue_count: preflight.cueCount,
        declared_duration_ms: preflight.declaredDurationMs,
        last_cue_end_ms: lastCueEndMs,
        overlap_count: preflight.overlapCount,
        exact_duplicate_count: preflight.exactDuplicateCount,
        persisted_segment_count: 0,
        recovery_job_count: 0,
        enrichment_provider_attempt_count: 0,
        provider_attempt_count: 0,
        network_attempt_count: 0,
        current_product_gap_count: CURRENT_PRODUCT_GAP_CODES.length,
      },
      versions: {
        strict_preflight: SUBTITLE_PREFLIGHT_VERSION,
      },
      classification: {
        locked: "expected_safe_rejection",
        observed: "expected_safe_rejection",
        content_completeness: context.options.contentCompleteness,
        content_completeness_basis: context.options.contentCompletenessBasis,
      },
      network_attempts: networkGuard.attempts,
      outcomes: {
        isolated_a1_strategy: {
          ingestion_invoked: false,
          truthful_safe_rejection: true,
          no_network_attempt: true,
          no_provider_attempt: true,
        },
        current_product: {
          ready: false,
          known_gap_codes: CURRENT_PRODUCT_GAP_CODES,
        },
      },
    };
  }

  if (preflight.a1SupportedClass.state !== "eligible_supported") {
    throw new A1HarnessError(
      "PREFLIGHT_REJECTED",
      "The input is outside the declared A1 service-supported class.",
      "A1_UNSUPPORTED_CLASS",
    );
  }
  const eligibleContentCompleteness = context.options.contentCompleteness;
  const eligibleCompletenessBasis = context.options.contentCompletenessBasis;
  if (eligibleContentCompleteness === "unknown" || eligibleCompletenessBasis === "unknown") {
    throw new A1HarnessError(
      "ATTESTATION_CONTRACT_MISMATCH",
      "Unknown completeness cannot enter the eligible service path.",
    );
  }

  // The path was required to be absent at bootstrap. Claim it atomically only
  // after every content/attestation check and immediately before app imports.
  reserveBrandNewDatabasePath(context.dbPath);

  // Intentionally narrow dynamic imports: no route, instrumentation module,
  // provider, queue loop, worker, capture URL flow, or application server.
  const [dbModule, itemsModule, transcriptsModule, serviceModule, parserModule] = await Promise.all([
    import("@/db/client"),
    import("@/db/items"),
    import("@/db/transcripts"),
    import("@/lib/capture/transcripts/user-provided"),
    import("@/lib/capture/transcripts/parse-file"),
  ]);

  const db = dbModule.getDb();
  let databaseEvidenceReady = false;
  try {
    const canonicalSourceUrl =
      `https://www.youtube.com/watch?v=${locked.attestation.youtube_video_id}`;
    const seeded = itemsModule.insertCaptured({
      source_type: "youtube",
      capture_source: "system",
      source_url: canonicalSourceUrl,
      title: "Isolated A1 sidecar seed",
      body: "Local metadata placeholder. The URL capture route was not invoked.",
      duration_seconds: context.options.declaredDurationMs / 1_000,
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_method: "a1_isolated_seed",
      extraction_version: A1_HARNESS_VERSION,
      extraction_warning: "no_transcript",
    });
    const seededPersisted = itemsModule.getItem(seeded.id);
    if (
      !seededPersisted
      || seededPersisted.source_type !== "youtube"
      || seededPersisted.source_url !== canonicalSourceUrl
    ) {
      throw new A1HarnessError(
        "SEEDED_ITEM_MISMATCH",
        "The directly seeded item does not match the locked YouTube identity.",
      );
    }

    const attached = serviceModule.attachUploadedTranscriptFileToYoutubeItem({
      itemId: seeded.id,
      filename: basename(locked.attestation.source.private_relative_path),
      contentType: context.options.format === "vtt" ? "text/vtt" : "application/x-subrip",
      bytes: inputBytes,
      languageCode: context.options.language,
    });

    const persistedRows = transcriptsModule.listTranscriptSegmentsForSource(
      attached.transcriptSource.id,
    );
    const expectedSegments = expectedPersistedSegments(preflight.cues);
    const persistedSegments = canonicalizePersistedSegments(persistedRows);
    assertExactPersistedSegments(expectedSegments, persistedSegments);

    const transcriptAttemptCount = scalarCount(
      db,
      "SELECT COUNT(*) AS count FROM transcript_attempts WHERE item_id = ?",
      seeded.id,
    );
    const transcriptJobProviderCount = scalarCount(
      db,
      `SELECT COUNT(*) AS count
       FROM transcript_jobs
       WHERE item_id = ?
         AND (attempts > 0 OR last_attempt_id IS NOT NULL OR last_provider IS NOT NULL)`,
      seeded.id,
    );
    const llmProviderAttemptCount = scalarCount(
      db,
      "SELECT COUNT(*) AS count FROM llm_usage",
    );
    const enrichmentProviderAttemptCount = scalarCount(
      db,
      `SELECT COUNT(*) AS count
       FROM enrichment_jobs
       WHERE item_id = ? AND (state <> 'pending' OR attempts > 0)`,
      seeded.id,
    );
    const providerAttemptCount =
      transcriptAttemptCount
      + transcriptJobProviderCount
      + enrichmentProviderAttemptCount
      + llmProviderAttemptCount;
    const recoveryJobCount = scalarCount(
      db,
      "SELECT COUNT(*) AS count FROM transcript_jobs WHERE item_id = ?",
      seeded.id,
    );

    if (providerAttemptCount !== 0) {
      throw new A1HarnessError(
        "PROVIDER_ATTEMPT_DETECTED",
        "A provider-attempt evidence row was created during isolated ingestion.",
      );
    }
    if (networkGuard.attempts.length !== 0) {
      throw new A1HarnessError(
        "NETWORK_ATTEMPT_BLOCKED",
        "The network guard observed an attempted call.",
      );
    }

    const expectedSegmentsJson = stableJson(expectedSegments);
    const persistedSegmentsJson = stableJson(persistedSegments);
    const normalized = buildNormalizedTranscript({
      attestation: locked.attestation,
      language: context.options.language,
      declaredDurationMs: context.options.declaredDurationMs,
      contentCompleteness: preflight.contentCompletenessDeclaration.state,
      contentCompletenessBasis: context.options.contentCompletenessBasis,
      cues: preflight.cues,
      persistedSegments,
      processingVersion:
        `a1-harness-${A1_HARNESS_VERSION}+preflight-${SUBTITLE_PREFLIGHT_VERSION}`
        + `+${parserModule.TRANSCRIPT_FILE_PARSER_VERSION}`,
    });
    const normalizedBytes = Buffer.from(`${stableJson(normalized)}\n`, "utf8");

    try {
      writeFileSync(context.privateNormalizedOutputPath, normalizedBytes, {
        flag: "wx",
        mode: 0o600,
      });
      chmodSync(context.privateNormalizedOutputPath, 0o600);
      chmodSync(context.dbPath, 0o600);
    } catch {
      throw new A1HarnessError(
        "PRIVATE_OUTPUT_WRITE_FAILED",
        "The private normalized artifact could not be written exclusively.",
      );
    }

    databaseEvidenceReady = true;

    return {
      schema_version: "1.0",
      harness_version: A1_HARNESS_VERSION,
      execution_class: context.options.executionClass,
      claim_scope: context.options.executionClass === "DEV"
        ? "development_wiring_only"
        : "locked_cell_only",
      status: "pass",
      hashes: {
        attestation_sha256: locked.rawSha256,
        attestation_schema_sha256: schemaEvidence.attestationSchemaSha256,
        input_sha256: inputSha256,
        video_id_sha256: sha256Hex(locked.attestation.youtube_video_id),
        preflight_canonical_sha256: preflight.normalizedSha256,
        expected_segments_sha256: sha256Hex(expectedSegmentsJson),
        persisted_segments_sha256: sha256Hex(persistedSegmentsJson),
        normalized_transcript_sha256: sha256Hex(normalizedBytes),
        normalized_transcript_schema_sha256: schemaEvidence.normalizedTranscriptSchemaSha256,
        ...(benchmarkLockSha256 ? { benchmark_lock_sha256: benchmarkLockSha256 } : {}),
      },
      counts: {
        attestation_part_count: locked.attestationPartCount,
        raw_byte_count: preflight.rawByteLength,
        normalized_text_character_count: preflight.normalizedTextCharacterCount,
        locked_cue_count: preflight.cueCount,
        declared_duration_ms: preflight.declaredDurationMs,
        last_cue_end_ms: lastCueEndMs,
        persisted_segment_count: persistedSegments.length,
        overlap_count: preflight.overlapCount,
        exact_duplicate_count: preflight.exactDuplicateCount,
        recovery_job_count: recoveryJobCount,
        transcript_provider_attempt_count: transcriptAttemptCount + transcriptJobProviderCount,
        enrichment_provider_attempt_count: enrichmentProviderAttemptCount,
        llm_provider_attempt_count: llmProviderAttemptCount,
        provider_attempt_count: providerAttemptCount,
        network_attempt_count: networkGuard.attempts.length,
        current_product_gap_count: CURRENT_PRODUCT_GAP_CODES.length,
      },
      versions: {
        strict_preflight: SUBTITLE_PREFLIGHT_VERSION,
        app_file_parser: parserModule.TRANSCRIPT_FILE_PARSER_VERSION,
      },
      classification: {
        locked: "eligible_supported",
        observed: "eligible_supported",
        content_completeness: eligibleContentCompleteness,
        content_completeness_basis: eligibleCompletenessBasis,
      },
      network_attempts: networkGuard.attempts,
      outcomes: {
        isolated_a1_strategy: {
          ingestion_invoked: true,
          feasible: true,
          exact_segment_match: true,
          no_network_attempt: true,
          no_provider_attempt: true,
        },
        current_product: {
          ready: false,
          known_gap_codes: CURRENT_PRODUCT_GAP_CODES,
        },
      },
    };
  } finally {
    try {
      if (databaseEvidenceReady) {
        try {
          db.pragma("synchronous = FULL");
          const synchronous = db.pragma("synchronous", { simple: true });
          const checkpoint = db.pragma("wal_checkpoint(TRUNCATE)") as Array<{
            busy: number;
            log: number;
            checkpointed: number;
          }>;
          const journalMode = db.pragma("journal_mode = DELETE", { simple: true });
          if (
            synchronous !== 2
            || checkpoint.length !== 1
            || checkpoint[0]?.busy !== 0
            || checkpoint[0]?.log !== 0
            || checkpoint[0]?.checkpointed !== 0
            || journalMode !== "delete"
          ) {
            throw new Error("SQLite evidence finalization did not reach the frozen state");
          }
        } catch {
          throw new A1HarnessError(
            "DATABASE_EVIDENCE_FINALIZATION_FAILED",
            "The private SQLite evidence could not be durably checkpointed into one sidecar-free file.",
          );
        }
      }
    } finally {
      db.close();
    }
  }
}

async function verifySealForSealedRun(
  context: A1BootstrapContext,
): Promise<VerifiedSealEvidence | null> {
  if (context.options.executionClass !== "SEALED") return null;
  const verifier = await import("../../benchmark/tools/verify-lock");
  try {
    const report = verifier.verifyLock({ repoRoot: context.repoRoot });
    const lock = verifier.parseLockJsonBytes(readFileSync(
      resolve(context.repoRoot, report.lockPath),
    ));
    return {
      lockSha256: report.lockSha256,
      frozenFiles: new Map(lock.frozen_files.map((file) => [file.path, file.sha256])),
    };
  } catch (error) {
    throw new A1HarnessError(
      "BENCHMARK_LOCK_INVALID",
      "SEALED execution requires a valid checked-out two-commit benchmark lock.",
      error instanceof verifier.LockVerificationError ? error.code : undefined,
    );
  }
}

function assertAttestationFrozenBySeal(
  context: A1BootstrapContext,
  attestationSha256: string,
  sealEvidence: VerifiedSealEvidence | null,
): void {
  if (!sealEvidence) return;
  const relativePath = relative(context.repoRoot, context.options.attestationPath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new A1HarnessError(
      "BENCHMARK_LOCK_INVALID",
      "A SEALED attestation must be a frozen repository artifact.",
    );
  }
  const gitPath = relativePath.split(sep).join("/");
  if (sealEvidence.frozenFiles.get(gitPath) !== attestationSha256) {
    throw new A1HarnessError(
      "BENCHMARK_LOCK_INVALID",
      "The exact attestation is not present in the verified frozen-file manifest.",
    );
  }
}

function assertLockedInputContract(
  context: A1BootstrapContext,
  contract: {
    format: "srt" | "vtt";
    language_tag: string;
    declared_duration_ms: number;
    expected_cue_count: number;
    last_cue_end_ms: number;
    content_completeness: {
      state: "complete" | "partial" | "unknown";
      basis: "explicit_source_assertion" | "source_coverage_record" | "user_attestation" | "unknown";
    };
    expected_class: "eligible_supported" | "expected_safe_rejection";
  },
): void {
  const options = context.options;
  if (
    options.format !== contract.format
    || options.language !== contract.language_tag
    || options.declaredDurationMs !== contract.declared_duration_ms
    || options.expectedCueCount !== contract.expected_cue_count
    || options.expectedLastCueEndMs !== contract.last_cue_end_ms
    || options.contentCompleteness !== contract.content_completeness.state
    || options.contentCompletenessBasis !== contract.content_completeness.basis
    || options.expectedClass !== contract.expected_class
  ) {
    throw new A1HarnessError(
      "ATTESTATION_CONTRACT_MISMATCH",
      "Caller options do not exactly match the locked attestation input contract.",
    );
  }
}

function classifyPreflightResult(
  parserClass: "eligible_supported" | "expected_safe_rejection",
  completeness: "complete" | "partial" | "unknown",
  basis: "explicit_source_assertion" | "source_coverage_record" | "user_attestation" | "unknown",
): "eligible_supported" | "expected_safe_rejection" {
  if (parserClass === "expected_safe_rejection") return parserClass;
  if (completeness === "unknown" || basis === "unknown") return "expected_safe_rejection";
  if (completeness === "partial" && basis !== "source_coverage_record") {
    return "expected_safe_rejection";
  }
  return "eligible_supported";
}

function readRegularFile(path: string, maximumBytes: number): Buffer {
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > maximumBytes) {
      throw new Error("unsafe input file");
    }
    return readFileSync(path);
  } catch (error) {
    if (error instanceof A1HarnessError) throw error;
    throw new A1HarnessError(
      "INPUT_LOCK_MISMATCH",
      "An input must be a bounded regular non-symlink file.",
    );
  }
}

function scalarCount(
  db: { prepare(sql: string): { get(...params: unknown[]): unknown } },
  sql: string,
  ...params: unknown[]
): number {
  const row = db.prepare(sql).get(...params) as { count?: unknown } | undefined;
  if (!row || !Number.isSafeInteger(row.count) || (row.count as number) < 0) {
    throw new A1HarnessError("PROVIDER_ATTEMPT_DETECTED", "A provider evidence count was invalid.");
  }
  return row.count as number;
}
