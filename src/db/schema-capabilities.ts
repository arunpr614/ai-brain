import { AsyncLocalStorage } from "node:async_hooks";
import type Database from "better-sqlite3";

export type SchemaCapabilityIncompatibilityCode =
  | "schema_discovery_failed"
  | "schema_contract_not_frozen"
  | "schema_contract_invalid"
  | "migration_ledger_incompatible"
  | "migration_ledger_entry_missing"
  | "migration_ledger_filename_mismatch"
  | "migration_ledger_hash_missing"
  | "migration_ledger_hash_mismatch"
  | "table_missing"
  | "column_missing"
  | "column_mismatch"
  | "table_check_mismatch"
  | "trigger_missing"
  | "trigger_mismatch"
  | "index_missing"
  | "index_mismatch";

export type SchemaCapabilityState =
  | { readonly kind: "absent" }
  | { readonly kind: "ready" }
  | {
      readonly kind: "incompatible";
      readonly code: SchemaCapabilityIncompatibilityCode;
    };

export interface SchemaColumnContract {
  readonly name: string;
  readonly type: string;
  readonly notNull: boolean;
  readonly primaryKeyPosition: number;
  readonly defaultSql: string | null;
}

export interface SchemaTableContract {
  readonly name: string;
  readonly columns: readonly SchemaColumnContract[];
  /**
   * Complete CHECK clauses owned by this feature, including the CHECK keyword.
   * Unrelated checks that already existed on a rebuilt table are allowed.
   */
  readonly checks: readonly string[];
}

export interface SchemaTriggerContract {
  readonly name: string;
  readonly table: string;
  /** Exact reviewed CREATE TRIGGER statement, compared as SQL tokens. */
  readonly sql: string;
}

export interface SchemaIndexContract {
  readonly name: string;
  readonly table: string;
  readonly unique: boolean;
  readonly partial: boolean;
  readonly columns: readonly string[];
  /** Exact reviewed CREATE INDEX statement, compared as SQL tokens. */
  readonly sql: string;
}

export type SchemaFeatureMarker =
  | {
      readonly kind: "column";
      readonly table: string;
      readonly name: string;
    }
  | {
      readonly kind: "table" | "trigger" | "index";
      readonly name: string;
    }
  | {
      /**
       * An unambiguous feature token in an sqlite_master object name or SQL.
       * This is only an absence/partial-schema marker, never shape authority.
       */
      readonly kind: "sql_token";
      readonly token: string;
    };

export interface FrozenSchemaCapabilityContract {
  readonly migration: {
    readonly filename: string;
    readonly sha256: string;
    /**
     * Stable filename-family token used to classify a wrong-number/wrong-name
     * ledger entry as a partial feature schema.
     */
    readonly ledgerMarker: string;
  };
  readonly markers: readonly SchemaFeatureMarker[];
  readonly tables: readonly SchemaTableContract[];
  readonly triggers: readonly SchemaTriggerContract[];
  readonly indexes: readonly SchemaIndexContract[];
}

interface MasterRow {
  type: "table" | "trigger" | "index";
  name: string;
  table_name: string;
  sql: string | null;
}

interface TableInfoRow {
  cid: number;
  name: string;
  type: string;
  is_not_null: number;
  default_sql: string | null;
  primary_key_position: number;
}

interface IndexListRow {
  name: string;
  is_unique: number;
  partial: number;
}

interface IndexInfoRow {
  sequence: number;
  name: string | null;
}

interface MigrationLedgerRow {
  name: string;
  sha256: string | null;
}

interface CachedSchemaShape {
  readonly schemaVersion: number;
  readonly master: readonly MasterRow[];
  readonly masterByTypeAndName: ReadonlyMap<string, MasterRow>;
  readonly tableInfo: Map<string, readonly TableInfoRow[]>;
  readonly indexLists: Map<string, readonly IndexListRow[]>;
  readonly indexInfo: Map<string, readonly IndexInfoRow[]>;
}

type FreshMigrationLedger =
  | {
      readonly kind: "available";
      readonly rows: readonly MigrationLedgerRow[];
    }
  | {
      readonly kind: "incompatible";
    };

const ABSENT_STATE: SchemaCapabilityState = Object.freeze({ kind: "absent" });
const READY_STATE: SchemaCapabilityState = Object.freeze({ kind: "ready" });

function incompatible(
  code: SchemaCapabilityIncompatibilityCode,
): SchemaCapabilityState {
  return Object.freeze({ kind: "incompatible", code });
}

/**
 * Migration 028 has not passed its implementation/hash/schema freeze. Keeping
 * the runtime contract null is intentional: even an exact-looking local
 * fixture cannot become production-eligible until the reviewed descriptor is
 * packaged here.
 */
export const PACKAGED_YOUTUBE_BROWSER_SCHEMA_CONTRACT: FrozenSchemaCapabilityContract | null =
  null;

const youtubeBrowserTestContractScope =
  new AsyncLocalStorage<FrozenSchemaCapabilityContract>();

const YOUTUBE_BROWSER_MIGRATION_LEDGER_MARKER = "youtube_browser_transcript";
const YOUTUBE_BROWSER_MIGRATION_ORDINAL = 28;
const AUDITED_PRE_FEATURE_MIGRATION = Object.freeze({
  ordinal: 27,
  filename: "027_notebooklm_url_sources.sql",
  sha256: "a488c7e15c54d232ad16708541bbc4a6fea6c2645fd79a999f7c416a8e2603b6",
});

const YOUTUBE_BROWSER_UNFROZEN_MARKERS: readonly SchemaFeatureMarker[] = [
  { kind: "column", table: "items", name: "content_revision" },
  {
    kind: "column",
    table: "capture_policy_decisions",
    name: "processing_mode",
  },
  {
    kind: "column",
    table: "transcript_jobs",
    name: "expected_content_revision",
  },
  { kind: "column", table: "transcript_jobs", name: "claim_token" },
  { kind: "column", table: "transcript_jobs", name: "claim_token_hash" },
  {
    kind: "column",
    table: "enrichment_jobs",
    name: "expected_content_revision",
  },
  { kind: "column", table: "enrichment_jobs", name: "claim_token_hash" },
  {
    kind: "column",
    table: "embedding_jobs",
    name: "expected_content_revision",
  },
  { kind: "column", table: "embedding_jobs", name: "claim_token_hash" },
  { kind: "table", name: "content_processing_holds" },
  { kind: "table", name: "extension_capture_requests" },
  { kind: "sql_token", token: "content_revision" },
  { kind: "sql_token", token: "expected_content_revision" },
  { kind: "sql_token", token: "claim_token" },
  { kind: "sql_token", token: "processing_hold" },
  { kind: "sql_token", token: "capture_intent" },
  { kind: "sql_token", token: "upload_grant" },
  { kind: "sql_token", token: "extension_capture" },
  { kind: "sql_token", token: "browser_visible_transcript" },
  { kind: "sql_token", token: "browser_link_only_v1" },
  { kind: "sql_token", token: "youtube_browser_v0_1" },
  { kind: "sql_token", token: "youtube_browser_capture_intent" },
  { kind: "sql_token", token: "youtube_browser_upload_grant" },
  { kind: "sql_token", token: "transcript_sources_one_active_per_item" },
];

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const MIGRATION_FILENAME = /^\d{3}_[A-Za-z0-9_]+\.sql$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function isValidIdentifier(value: string): boolean {
  return IDENTIFIER.test(value);
}

function validContract(contract: FrozenSchemaCapabilityContract): boolean {
  if (
    !MIGRATION_FILENAME.test(contract.migration.filename) ||
    !SHA256.test(contract.migration.sha256) ||
    contract.migration.ledgerMarker.trim().length === 0 ||
    contract.markers.length === 0 ||
    contract.tables.length === 0 ||
    contract.tables.every((table) => table.checks.length === 0) ||
    contract.triggers.length === 0 ||
    contract.indexes.length === 0
  ) {
    return false;
  }

  if (
    !hasUniqueValues(contract.tables.map((table) => table.name)) ||
    !hasUniqueValues(contract.triggers.map((trigger) => trigger.name)) ||
    !hasUniqueValues(contract.indexes.map((index) => index.name))
  ) {
    return false;
  }

  const declaredTables = new Map(
    contract.tables.map((table) => [table.name, table]),
  );
  const declaredTriggers = new Set(
    contract.triggers.map((trigger) => trigger.name),
  );
  const declaredIndexes = new Set(contract.indexes.map((index) => index.name));

  for (const marker of contract.markers) {
    if (marker.kind === "sql_token") {
      if (marker.token.trim().length === 0) return false;
    } else if (
      !isValidIdentifier(marker.name) ||
      (marker.kind === "column" && !isValidIdentifier(marker.table))
    ) {
      return false;
    }
    if (
      (marker.kind === "table" && !declaredTables.has(marker.name)) ||
      (marker.kind === "trigger" && !declaredTriggers.has(marker.name)) ||
      (marker.kind === "index" && !declaredIndexes.has(marker.name)) ||
      (marker.kind === "column" &&
        !declaredTables
          .get(marker.table)
          ?.columns.some((column) => column.name === marker.name))
    ) {
      return false;
    }
  }

  for (const table of contract.tables) {
    if (
      !isValidIdentifier(table.name) ||
      table.columns.length === 0 ||
      !hasUniqueValues(table.columns.map((column) => column.name)) ||
      !hasUniqueValues(table.checks.map(normalizeSql))
    ) {
      return false;
    }
    for (const column of table.columns) {
      if (
        !isValidIdentifier(column.name) ||
        column.type.trim().length === 0 ||
        !Number.isInteger(column.primaryKeyPosition) ||
        column.primaryKeyPosition < 0
      ) {
        return false;
      }
    }
    if (
      table.checks.some(
        (check) =>
          check.trim().length === 0 || extractCheckClauses(check).length !== 1,
      )
    ) {
      return false;
    }
  }

  for (const trigger of contract.triggers) {
    if (
      !isValidIdentifier(trigger.name) ||
      !isValidIdentifier(trigger.table) ||
      !declaredTables.has(trigger.table) ||
      trigger.sql.trim().length === 0
    ) {
      return false;
    }
  }

  for (const index of contract.indexes) {
    if (
      !isValidIdentifier(index.name) ||
      !isValidIdentifier(index.table) ||
      !declaredTables.has(index.table) ||
      index.columns.length === 0 ||
      index.columns.some((column) => !isValidIdentifier(column)) ||
      !hasUniqueValues(index.columns) ||
      index.columns.some(
        (column) =>
          !declaredTables
            .get(index.table)
            ?.columns.some((declared) => declared.name === column),
      ) ||
      index.sql.trim().length === 0
    ) {
      return false;
    }
  }

  return true;
}

function tokenizeSql(sql: string): string[] {
  const tokens: string[] = [];
  let index = 0;

  while (index < sql.length) {
    const character = sql[index]!;
    const next = sql[index + 1];

    if (/\s/u.test(character)) {
      index += 1;
      continue;
    }

    if (character === "-" && next === "-") {
      index += 2;
      while (index < sql.length && sql[index] !== "\n") index += 1;
      continue;
    }

    if (character === "/" && next === "*") {
      index += 2;
      while (
        index < sql.length &&
        !(sql[index] === "*" && sql[index + 1] === "/")
      ) {
        index += 1;
      }
      index = Math.min(index + 2, sql.length);
      continue;
    }

    if (
      character === "'" ||
      character === '"' ||
      character === "`" ||
      character === "["
    ) {
      const closing = character === "[" ? "]" : character;
      const start = index;
      index += 1;
      while (index < sql.length) {
        if (sql[index] === closing) {
          if (sql[index + 1] === closing && closing !== "]") {
            index += 2;
            continue;
          }
          index += 1;
          break;
        }
        index += 1;
      }
      tokens.push(sql.slice(start, index));
      continue;
    }

    if (/[A-Za-z0-9_.$]/u.test(character)) {
      const start = index;
      index += 1;
      while (index < sql.length && /[A-Za-z0-9_.$]/u.test(sql[index]!)) {
        index += 1;
      }
      tokens.push(sql.slice(start, index).toLowerCase());
      continue;
    }

    const threeCharacterOperator = sql.slice(index, index + 3);
    if (threeCharacterOperator === "->>") {
      tokens.push(threeCharacterOperator);
      index += 3;
      continue;
    }

    const twoCharacterOperator = sql.slice(index, index + 2);
    if (
      ["!=", "<=", ">=", "<>", "==", "||", "<<", ">>", "->"].includes(
        twoCharacterOperator,
      )
    ) {
      tokens.push(twoCharacterOperator);
      index += 2;
      continue;
    }

    tokens.push(character);
    index += 1;
  }

  return tokens;
}

function normalizeSql(sql: string): string {
  return tokenizeSql(sql).join(" ");
}

function extractCheckClauses(sql: string): string[] {
  const tokens = tokenizeSql(sql);
  const checks: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] !== "check" || tokens[index + 1] !== "(") continue;

    let depth = 0;
    for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
      if (tokens[cursor] === "(") depth += 1;
      else if (tokens[cursor] === ")") depth -= 1;
      if (depth === 0) {
        checks.push(tokens.slice(index, cursor + 1).join(" "));
        index = cursor;
        break;
      }
    }
  }

  return checks;
}

function readMaster(db: Database.Database): MasterRow[] {
  return db
    .prepare(
      `SELECT type,name,tbl_name AS table_name,sql
       FROM sqlite_master
       WHERE type IN ('table','trigger','index')
       ORDER BY type,name`,
    )
    .all() as MasterRow[];
}

function readTableInfo(db: Database.Database, table: string): TableInfoRow[] {
  return db
    .prepare(
      `SELECT cid,name,type,
              "notnull" AS is_not_null,
              dflt_value AS default_sql,
              pk AS primary_key_position
       FROM pragma_table_info(?)
       ORDER BY cid`,
    )
    .all(table) as TableInfoRow[];
}

function readIndexList(db: Database.Database, table: string): IndexListRow[] {
  return db
    .prepare(
      `SELECT name,"unique" AS is_unique,partial
       FROM pragma_index_list(?)`,
    )
    .all(table) as IndexListRow[];
}

function readIndexInfo(db: Database.Database, index: string): IndexInfoRow[] {
  return db
    .prepare(
      `SELECT seqno AS sequence,name
       FROM pragma_index_info(?)
       ORDER BY seqno`,
    )
    .all(index) as IndexInfoRow[];
}

function readSchemaVersion(db: Database.Database): number {
  const schemaVersion = Number(
    db.pragma("schema_version", { simple: true }) as number | bigint,
  );
  if (!Number.isSafeInteger(schemaVersion) || schemaVersion < 0) {
    throw new Error("invalid_schema_version");
  }
  return schemaVersion;
}

const schemaShapeCache = new WeakMap<Database.Database, CachedSchemaShape>();

function getSchemaShape(db: Database.Database): CachedSchemaShape {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const schemaVersion = readSchemaVersion(db);
    const cached = schemaShapeCache.get(db);
    if (cached?.schemaVersion === schemaVersion) return cached;

    const master = readMaster(db);
    if (readSchemaVersion(db) !== schemaVersion) continue;

    const shape: CachedSchemaShape = {
      schemaVersion,
      master,
      masterByTypeAndName: new Map(
        master.map((row) => [`${row.type}:${row.name}`, row]),
      ),
      tableInfo: new Map(),
      indexLists: new Map(),
      indexInfo: new Map(),
    };
    schemaShapeCache.set(db, shape);
    return shape;
  }
  throw new Error("schema_changed_during_discovery");
}

function getTableInfo(
  db: Database.Database,
  shape: CachedSchemaShape,
  table: string,
): readonly TableInfoRow[] {
  const cached = shape.tableInfo.get(table);
  if (cached) return cached;
  const discovered = readTableInfo(db, table);
  shape.tableInfo.set(table, discovered);
  return discovered;
}

function getIndexList(
  db: Database.Database,
  shape: CachedSchemaShape,
  table: string,
): readonly IndexListRow[] {
  const cached = shape.indexLists.get(table);
  if (cached) return cached;
  const discovered = readIndexList(db, table);
  shape.indexLists.set(table, discovered);
  return discovered;
}

function getIndexInfo(
  db: Database.Database,
  shape: CachedSchemaShape,
  index: string,
): readonly IndexInfoRow[] {
  const cached = shape.indexInfo.get(index);
  if (cached) return cached;
  const discovered = readIndexInfo(db, index);
  shape.indexInfo.set(index, discovered);
  return discovered;
}

/**
 * Ledger state is authority, not cached schema shape. Existence, columns, and
 * rows are deliberately queried on every capability call so same-version DML
 * cannot preserve or manufacture a ready verdict through the shape cache.
 */
function readFreshMigrationLedger(db: Database.Database): FreshMigrationLedger {
  const table = db
    .prepare(
      `SELECT 1 AS present
       FROM sqlite_master
       WHERE type='table' AND name='_migrations'`,
    )
    .get() as { present: number } | undefined;
  if (!table) return { kind: "available", rows: [] };

  const columns = new Set(
    readTableInfo(db, "_migrations").map((column) => column.name),
  );
  if (!columns.has("name") || !columns.has("sha256")) {
    return { kind: "incompatible" };
  }

  return {
    kind: "available",
    rows: db
      .prepare("SELECT name,sha256 FROM _migrations ORDER BY name")
      .all() as MigrationLedgerRow[],
  };
}

function markerPresent(args: {
  db: Database.Database;
  shape: CachedSchemaShape;
  markers: readonly SchemaFeatureMarker[];
  migrationLedgerMarker: string;
  ledger: readonly MigrationLedgerRow[];
}): boolean {
  const masterByTypeAndName = new Set(args.shape.masterByTypeAndName.keys());
  const searchableMaster = args.shape.master
    .map((row) => `${row.name}\n${row.table_name}\n${row.sql ?? ""}`)
    .join("\n")
    .toLowerCase();

  if (
    args.ledger.some((row) =>
      row.name.toLowerCase().includes(args.migrationLedgerMarker.toLowerCase()),
    )
  ) {
    return true;
  }

  for (const marker of args.markers) {
    if (marker.kind === "sql_token") {
      if (searchableMaster.includes(marker.token.toLowerCase())) return true;
      continue;
    }
    if (marker.kind === "column") {
      if (
        args.shape.master.some(
          (row) => row.type === "table" && row.name === marker.table,
        ) &&
        getTableInfo(args.db, args.shape, marker.table).some(
          (column) => column.name === marker.name,
        )
      ) {
        return true;
      }
      continue;
    }
    if (masterByTypeAndName.has(`${marker.kind}:${marker.name}`)) return true;
  }

  return false;
}

function combineShapeAndLedger(
  db: Database.Database,
  shape: CachedSchemaShape,
  ledgerDiscovery: FreshMigrationLedger,
  contract: FrozenSchemaCapabilityContract | null,
  markers: readonly SchemaFeatureMarker[],
  migrationLedgerMarker: string,
): SchemaCapabilityState {
  if (ledgerDiscovery.kind === "incompatible") {
    return incompatible("migration_ledger_incompatible");
  }
  const ledger = ledgerDiscovery.rows;

  const featureMarkerPresent = markerPresent({
    db,
    shape,
    markers,
    migrationLedgerMarker,
    ledger,
  });
  if (!featureMarkerPresent) return ABSENT_STATE;
  if (contract === null) return incompatible("schema_contract_not_frozen");

  const exactLedgerRows = ledger.filter(
    (row) => row.name === contract.migration.filename,
  );
  if (exactLedgerRows.length !== 1) {
    const sameFamily = ledger.some((row) =>
      row.name
        .toLowerCase()
        .includes(contract.migration.ledgerMarker.toLowerCase()),
    );
    return incompatible(
      sameFamily
        ? "migration_ledger_filename_mismatch"
        : "migration_ledger_entry_missing",
    );
  }
  const recordedHash = exactLedgerRows[0]!.sha256;
  if (recordedHash === null || recordedHash.trim().length === 0) {
    return incompatible("migration_ledger_hash_missing");
  }
  if (recordedHash !== contract.migration.sha256) {
    return incompatible("migration_ledger_hash_mismatch");
  }

  for (const tableContract of contract.tables) {
    const masterTable = shape.masterByTypeAndName.get(
      `table:${tableContract.name}`,
    );
    if (!masterTable || masterTable.sql === null) {
      return incompatible("table_missing");
    }

    const actualColumns = new Map(
      getTableInfo(db, shape, tableContract.name).map((column) => [
        column.name,
        column,
      ]),
    );
    for (const expected of tableContract.columns) {
      const actual = actualColumns.get(expected.name);
      if (!actual) return incompatible("column_missing");
      if (
        actual.type.trim().toUpperCase() !==
          expected.type.trim().toUpperCase() ||
        Boolean(actual.is_not_null) !== expected.notNull ||
        actual.primary_key_position !== expected.primaryKeyPosition ||
        (actual.default_sql === null
          ? null
          : normalizeSql(actual.default_sql)) !==
          (expected.defaultSql === null
            ? null
            : normalizeSql(expected.defaultSql))
      ) {
        return incompatible("column_mismatch");
      }
    }

    const actualChecks = new Set(extractCheckClauses(masterTable.sql));
    if (
      tableContract.checks.some(
        (check) => !actualChecks.has(normalizeSql(check)),
      )
    ) {
      return incompatible("table_check_mismatch");
    }
  }

  for (const expected of contract.triggers) {
    const actual = shape.masterByTypeAndName.get(`trigger:${expected.name}`);
    if (!actual || actual.sql === null) return incompatible("trigger_missing");
    if (
      actual.table_name !== expected.table ||
      normalizeSql(actual.sql) !== normalizeSql(expected.sql)
    ) {
      return incompatible("trigger_mismatch");
    }
  }

  for (const expected of contract.indexes) {
    const actual = shape.masterByTypeAndName.get(`index:${expected.name}`);
    if (!actual || actual.sql === null) return incompatible("index_missing");
    const listed = getIndexList(db, shape, expected.table).find(
      (index) => index.name === expected.name,
    );
    const columns = getIndexInfo(db, shape, expected.name).map(
      (column) => column.name,
    );
    if (
      actual.table_name !== expected.table ||
      normalizeSql(actual.sql) !== normalizeSql(expected.sql) ||
      !listed ||
      Boolean(listed.is_unique) !== expected.unique ||
      Boolean(listed.partial) !== expected.partial ||
      columns.some((column) => column === null) ||
      columns.length !== expected.columns.length ||
      columns.some((column, index) => column !== expected.columns[index])
    ) {
      return incompatible("index_mismatch");
    }
  }

  return READY_STATE;
}

function attestWithCachedShape(
  db: Database.Database,
  contract: FrozenSchemaCapabilityContract | null,
  markers: readonly SchemaFeatureMarker[],
  migrationLedgerMarker: string,
): SchemaCapabilityState {
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const shape = getSchemaShape(db);
      const ledger = readFreshMigrationLedger(db);
      if (readSchemaVersion(db) !== shape.schemaVersion) continue;
      const state = combineShapeAndLedger(
        db,
        shape,
        ledger,
        contract,
        markers,
        migrationLedgerMarker,
      );
      if (readSchemaVersion(db) !== shape.schemaVersion) continue;
      return state;
    }
  } catch {
    return incompatible("schema_discovery_failed");
  }
  return incompatible("schema_discovery_failed");
}

/**
 * Generic attestor for tests and for assembling a future independently frozen
 * packaged contract. It shares only DB-handle/schema-version shape discovery;
 * ledger authority is re-read on every call. Runtime call sites must use
 * getYouTubeBrowserSchemaCapability() so callers cannot inject authority.
 */
export function attestSchemaCapabilityForFrozenContract(
  db: Database.Database,
  contract: FrozenSchemaCapabilityContract,
): SchemaCapabilityState {
  if (!validContract(contract)) return incompatible("schema_contract_invalid");
  return attestWithCachedShape(
    db,
    contract,
    contract.markers,
    contract.migration.ledgerMarker,
  );
}

/**
 * Exercise the fixed runtime wrapper against a representative future contract
 * without turning that contract into production authority.
 *
 * The override is callback-scoped and asynchronous-context-local. It cannot be
 * installed globally, it does not leak after callback completion, and callers
 * outside an exact NODE_ENV=test process are rejected before their callback
 * can run.
 */
export function withYouTubeBrowserSchemaContractForTests<T>(
  contract: FrozenSchemaCapabilityContract,
  callback: () => T,
): T {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("test_schema_contract_override_forbidden");
  }
  if (!validContract(contract)) {
    throw new Error("test_schema_contract_override_invalid");
  }
  return youtubeBrowserTestContractScope.run(contract, callback);
}

/**
 * Runtime-safe fixed wrapper. Only schema shape is cached by DB handle plus
 * PRAGMA schema_version. Migration-ledger authority is re-read on every call.
 * Item hold state is deliberately outside this module and must never be cached.
 */
export function getYouTubeBrowserSchemaCapability(
  db: Database.Database,
): SchemaCapabilityState {
  const scopedTestContract =
    process.env.NODE_ENV === "test"
      ? youtubeBrowserTestContractScope.getStore()
      : undefined;
  if (scopedTestContract) {
    return attestWithCachedShape(
      db,
      scopedTestContract,
      scopedTestContract.markers,
      scopedTestContract.migration.ledgerMarker,
    );
  }

  // Migration 028 is frozen as the browser-transcript allocation. While its
  // packaged contract remains null, even a differently named 028+ ledger row
  // is a mixed/unknown schema, not legitimate pre-feature schema absence.
  if (PACKAGED_YOUTUBE_BROWSER_SCHEMA_CONTRACT === null) {
    try {
      const ledger = readFreshMigrationLedger(db);
      if (ledger.kind === "incompatible") {
        return incompatible("migration_ledger_incompatible");
      }
      if (
        ledger.rows.some(
          (row) =>
            migrationOrdinal(row.name) >= YOUTUBE_BROWSER_MIGRATION_ORDINAL,
        )
      ) {
        return incompatible("schema_contract_not_frozen");
      }
      const auditedOrdinalRows = ledger.rows.filter(
        (row) =>
          migrationOrdinal(row.name) === AUDITED_PRE_FEATURE_MIGRATION.ordinal,
      );
      if (
        auditedOrdinalRows.length > 1 ||
        (auditedOrdinalRows.length === 1 &&
          (auditedOrdinalRows[0]!.name !==
            AUDITED_PRE_FEATURE_MIGRATION.filename ||
            auditedOrdinalRows[0]!.sha256 !==
              AUDITED_PRE_FEATURE_MIGRATION.sha256))
      ) {
        return incompatible("migration_ledger_incompatible");
      }
    } catch {
      return incompatible("schema_discovery_failed");
    }
  }
  return attestWithCachedShape(
    db,
    PACKAGED_YOUTUBE_BROWSER_SCHEMA_CONTRACT,
    YOUTUBE_BROWSER_UNFROZEN_MARKERS,
    YOUTUBE_BROWSER_MIGRATION_LEDGER_MARKER,
  );
}

function migrationOrdinal(filename: string): number {
  const match = /^(\d{3})_/u.exec(filename);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}
