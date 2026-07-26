import { AsyncLocalStorage } from "node:async_hooks";

export const ORDINARY_STARTUP_MIGRATION_CEILING = 27;

export const AUDITED_S27_MIGRATION_SHA256: Readonly<Record<string, string>> =
  Object.freeze({
    "001_initial_schema.sql":
      "1bcd7e62f449f067f5cf3be3021a71179dac810d8b02663006b373fc0888a19e",
    "002_fts5.sql":
      "a182c994f5978d84c277b99158eb20640655fb3a11fbde04b28bfe6411bc0fb8",
    "003_enrichment_queue.sql":
      "aaad83664f03f595991aa0eb08940a448a06987e9f751b1f19036b2212d6f640",
    "004_items_add_quotes.sql":
      "9444fa6d25f5bf5efb62920a6856af765ff31e3cbe5ff350a261f6e4f09e9de6",
    "005_vector_index.sql":
      "8b14cf82441412f1d7d9f80e2b0cfac7a2aff5213221646de18d893d8ab6984a",
    "006_embedding_jobs.sql":
      "4f74f1b9279dd2d087156fe01ea74b4a510cb5763d8ce887bb332134dc3a9088",
    "007_youtube_duration.sql":
      "37969802fcefe5473d5274e3ff8cb539bfc79437a50b178b877957ffd483ea2a",
    "008_batch_id.sql":
      "3f1dae867d694cae2202ed56d1341380e0269e96bfd29eedefbdd4f85c9801ee",
    "009_telegram_source_type.sql":
      "2a81426c3e3598a3ef56b85d7f4ef8f516d7ef8383e09395a1de4610542d7905",
    "010_device_pairing_codes.sql":
      "531f689151ac8260a8d03a8571a76435423a4b29ec1527e5d59809e185e3dd95",
    "011_telegram_updates.sql":
      "059668590795880a846be45bc6ec9f02093a3ffaf8253064c52fd79b045d9640",
    "012_capture_source.sql":
      "d82d062ef8ee862cede5e44e118c6680cc46a1807f68b4e74a33e36014c943af",
    "013_capture_quality.sql":
      "111b80ad0c8f7ab4b10ff677152490d4d1a67a2f773b646eb02562c2bebef29a",
    "014_capture_artifacts.sql":
      "980655a2093af476175f42f083fa90193b5070289afedd1b8604e887cb485b61",
    "015_capture_metadata_cache.sql":
      "08e9126700e42ff73c8437dc79e88d3e61cbdd319e5f82fd8ab5e1e596e6eb74",
    "016_capture_artifacts_hardening.sql":
      "d3581fc47b5aca2b1e2e6fd94d226aa38894b368680302783ed114a0aa7ecf6b",
    "017_topics.sql":
      "af47ed0bc0da8550382f6cde7193ab3959a163378611291dae40fa66bf61b2c6",
    "017_transcript_recovery.sql":
      "cc12728f1ecac7f58ece34ae957813653e63365330919fe3c8b8e0d3a6c1d1f7",
    "018_topics.sql":
      "e6185834406c6da4596d4af514cf9c97737b125ba8554fe0012506e3e1b377cf",
    "018_transcript_policy_sources.sql":
      "96d3fddf114ad0bbe5da61fe81116f6495b398d30ea2e8076d3a5899b188c99b",
    "019_transcript_segments.sql":
      "d35257a78eaf5c0a16cbb0e394ef4966854abc11059a088032a63198d0437aa3",
    "020_recall_sync.sql":
      "353b31cfbac6e2191226ba24ed8dc6ac2d4d01480bea59008563a334e1302dac",
    "021_restore_transcript_recovery_trigger.sql":
      "057af8740a6a5fa6f1aba5b83da33365e9843de8444537ae87bbb7707a9336f7",
    "022_item_notes.sql":
      "9d4487d2ee0289e4aa6ef07bd1fb6cd5febb0c5cd229c327d2814179f9592619",
    "023_source_aware_chunks.sql":
      "306d4d243573b977d3b706d92a78e21c2cd1b06b332e30883946b267323242a3",
    "024_recall_manual_sync.sql":
      "7872a07af79caca6c67b8da7ef49d565e595b2621f8cbcc6cd19ce76674e221a",
    "025_item_workflow.sql":
      "7537dd6d345b1c517802c957fd9dbe24b263818ca44aac5148492198806b42e3",
    "026_notebooklm_export.sql":
      "1ba76b030c58af334b588923ee2eef34282c360d79b8b162d653ef454c96513f",
    "027_notebooklm_url_sources.sql":
      "a488c7e15c54d232ad16708541bbc4a6fea6c2645fd79a999f7c416a8e2603b6",
  });

const GATED_MIGRATION_FILENAMES = new Set([
  "028_youtube_browser_transcript.sql",
  "029_manual_transcript_enrichment_expand.sql",
  "030_manual_transcript_enrichment_contract.sql",
]);

const PACKAGED_MIGRATION_FILENAME = /^(\d{3})_[A-Za-z0-9_]+\.sql$/u;
const auditedSubsetTestScope = new AsyncLocalStorage<true>();

export type OrdinaryStartupMigrationAdmission =
  | {
      readonly kind: "audited_s27";
      readonly sha256: string;
    }
  | {
      readonly kind: "gated_transition";
    };

export class OrdinaryMigrationAdmissionError extends Error {
  readonly code = "processing_schema_incompatible";

  constructor(message: string) {
    super(message);
    this.name = "OrdinaryMigrationAdmissionError";
  }
}

export function packagedMigrationOrdinal(filename: string): number {
  const match = PACKAGED_MIGRATION_FILENAME.exec(filename);
  if (!match) {
    throw new OrdinaryMigrationAdmissionError(
      `[db] invalid packaged migration filename: ${filename}`,
    );
  }
  return Number(match[1]);
}

export function classifyOrdinaryStartupMigration(
  filename: string,
): OrdinaryStartupMigrationAdmission {
  const ordinal = packagedMigrationOrdinal(filename);
  const auditedSha256 = AUDITED_S27_MIGRATION_SHA256[filename];
  if (auditedSha256) {
    return Object.freeze({ kind: "audited_s27", sha256: auditedSha256 });
  }
  if (ordinal <= ORDINARY_STARTUP_MIGRATION_CEILING) {
    throw new OrdinaryMigrationAdmissionError(
      `[db] migration is not in audited S27 inventory: ${filename}`,
    );
  }
  if (!GATED_MIGRATION_FILENAMES.has(filename)) {
    throw new OrdinaryMigrationAdmissionError(
      `[db] migration is not in reviewed gated inventory: ${filename}`,
    );
  }
  return Object.freeze({ kind: "gated_transition" });
}

export function assertOrdinaryStartupMigrationInventory(
  filenames: readonly string[],
): ReadonlyMap<string, OrdinaryStartupMigrationAdmission> {
  const admissions = new Map<string, OrdinaryStartupMigrationAdmission>();
  for (const filename of filenames) {
    if (admissions.has(filename)) {
      throw new OrdinaryMigrationAdmissionError(
        `[db] duplicate packaged migration filename: ${filename}`,
      );
    }
    admissions.set(filename, classifyOrdinaryStartupMigration(filename));
  }
  if (auditedSubsetTestScope.getStore()) {
    if (
      [...admissions.values()].some(
        (admission) => admission.kind !== "audited_s27",
      )
    ) {
      throw new OrdinaryMigrationAdmissionError(
        "[db] gated migration forbidden in audited test subset",
      );
    }
    return admissions;
  }
  for (const filename of Object.keys(AUDITED_S27_MIGRATION_SHA256)) {
    if (!admissions.has(filename)) {
      throw new OrdinaryMigrationAdmissionError(
        `[db] audited S27 migration missing: ${filename}`,
      );
    }
  }
  return admissions;
}

/**
 * Ordinary B28 startup remains compatible with an S27 database but never
 * acquires transition authority. Only the exact frozen S27 inventory may be
 * applied; reviewed Stage 2+ filenames are inventoried but remain gated.
 */
export function ordinaryStartupMayApplyMigration(filename: string): boolean {
  return classifyOrdinaryStartupMigration(filename).kind === "audited_s27";
}

/**
 * Historical migration tests can replay an exact hash-pinned prefix without
 * weakening ordinary runtime admission. The override is callback-scoped and
 * unavailable outside a Node test child whose NODE_ENV is explicitly `test`.
 */
export function withAuditedS27MigrationSubsetForTests<T>(
  run: () => T,
): T {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.NODE_TEST_CONTEXT !== "child-v8"
  ) {
    throw new Error("test_migration_inventory_override_forbidden");
  }
  return auditedSubsetTestScope.run(true, run);
}
