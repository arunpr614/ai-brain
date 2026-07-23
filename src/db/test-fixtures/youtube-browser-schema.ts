import Database from "better-sqlite3";
import type { FrozenSchemaCapabilityContract } from "../schema-capabilities";

export const YOUTUBE_BROWSER_FIXTURE_MIGRATION_NAME =
  "027_youtube_browser_transcript.sql";
export const YOUTUBE_BROWSER_FIXTURE_MIGRATION_SHA = "a".repeat(64);

const TRIGGER_SQL = `CREATE TRIGGER items_advance_content_revision
  AFTER UPDATE OF body ON items
  WHEN new.body IS NOT old.body
  BEGIN
    UPDATE items
    SET content_revision = old.content_revision + 1
    WHERE id = old.id;
  END`;

const INDEX_SQL = `CREATE UNIQUE INDEX idx_content_processing_holds_active_item
  ON content_processing_holds(item_id)
  WHERE state = 'held'`;

/**
 * Test-only representative contract. This is deliberately not the packaged
 * migration-027 production contract, which remains unfrozen.
 */
export const YOUTUBE_BROWSER_FIXTURE_CONTRACT: FrozenSchemaCapabilityContract =
  {
    migration: {
      filename: YOUTUBE_BROWSER_FIXTURE_MIGRATION_NAME,
      sha256: YOUTUBE_BROWSER_FIXTURE_MIGRATION_SHA,
      ledgerMarker: "youtube_browser_transcript",
    },
    markers: [
      { kind: "column", table: "items", name: "content_revision" },
      { kind: "table", name: "content_processing_holds" },
      { kind: "trigger", name: "items_advance_content_revision" },
      { kind: "index", name: "idx_content_processing_holds_active_item" },
    ],
    tables: [
      {
        name: "items",
        columns: [
          {
            name: "content_revision",
            type: "INTEGER",
            notNull: true,
            primaryKeyPosition: 0,
            defaultSql: "1",
          },
        ],
        checks: ["CHECK (content_revision > 0)"],
      },
      {
        name: "content_processing_holds",
        columns: [
          {
            name: "id",
            type: "TEXT",
            notNull: false,
            primaryKeyPosition: 1,
            defaultSql: null,
          },
          {
            name: "item_id",
            type: "TEXT",
            notNull: true,
            primaryKeyPosition: 0,
            defaultSql: null,
          },
          {
            name: "expected_content_revision",
            type: "INTEGER",
            notNull: true,
            primaryKeyPosition: 0,
            defaultSql: null,
          },
          {
            name: "state",
            type: "TEXT",
            notNull: true,
            primaryKeyPosition: 0,
            defaultSql: "'held'",
          },
        ],
        checks: [
          "CHECK (expected_content_revision > 0)",
          "CHECK (state IN ('held', 'released'))",
        ],
      },
    ],
    triggers: [
      {
        name: "items_advance_content_revision",
        table: "items",
        sql: TRIGGER_SQL,
      },
    ],
    indexes: [
      {
        name: "idx_content_processing_holds_active_item",
        table: "content_processing_holds",
        unique: true,
        partial: true,
        columns: ["item_id"],
        sql: INDEX_SQL,
      },
    ],
  };

export interface YouTubeBrowserFixtureOptions {
  ledgerName?: string | null;
  ledgerSha?: string | null;
  omitContentRevision?: boolean;
  omitHoldTable?: boolean;
  holdCheck?: "exact" | "missing" | "wrong";
  trigger?: "exact" | "missing" | "wrong";
  index?: "exact" | "missing" | "wrong";
}

export function createYouTubeBrowserSchemaFixture(
  options: YouTubeBrowserFixtureOptions = {},
): Database.Database {
  const db = new Database(":memory:");
  const ledgerName =
    options.ledgerName === undefined
      ? YOUTUBE_BROWSER_FIXTURE_MIGRATION_NAME
      : options.ledgerName;
  const ledgerSha =
    options.ledgerSha === undefined
      ? YOUTUBE_BROWSER_FIXTURE_MIGRATION_SHA
      : options.ledgerSha;
  const holdCheck = options.holdCheck ?? "exact";
  const trigger = options.trigger ?? "exact";
  const index = options.index ?? "exact";

  db.exec(`
    CREATE TABLE _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sha256 TEXT
    );
    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      body TEXT NOT NULL
      ${
        options.omitContentRevision
          ? ""
          : ", content_revision INTEGER NOT NULL DEFAULT 1 CHECK (content_revision > 0)"
      }
    );
  `);
  if (ledgerName !== null) {
    db.prepare("INSERT INTO _migrations(name,sha256) VALUES(?,?)").run(
      ledgerName,
      ledgerSha,
    );
  }

  if (!options.omitHoldTable) {
    const stateCheck =
      holdCheck === "missing"
        ? ""
        : holdCheck === "wrong"
          ? "CHECK (state IN ('held', 'cleared'))"
          : "CHECK (state IN ('held', 'released'))";
    db.exec(`
      CREATE TABLE content_processing_holds (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        expected_content_revision INTEGER NOT NULL
          CHECK (expected_content_revision > 0),
        state TEXT NOT NULL DEFAULT 'held'
          ${stateCheck}
      );
    `);
  }

  if (trigger !== "missing") {
    db.exec(
      trigger === "wrong"
        ? TRIGGER_SQL.replace(
            "old.content_revision + 1",
            "old.content_revision + 2",
          )
        : TRIGGER_SQL,
    );
  }

  if (index !== "missing" && !options.omitHoldTable) {
    db.exec(
      index === "wrong"
        ? INDEX_SQL.replace("state = 'held'", "state = 'released'")
        : INDEX_SQL,
    );
  }

  return db;
}
