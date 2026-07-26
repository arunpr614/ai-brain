import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { runMigrations } from "./client";
import {
  AUDITED_S27_MIGRATION_SHA256,
  ORDINARY_STARTUP_MIGRATION_CEILING,
  assertOrdinaryStartupMigrationInventory,
  classifyOrdinaryStartupMigration,
  ordinaryStartupMayApplyMigration,
  packagedMigrationOrdinal,
  withAuditedS27MigrationSubsetForTests,
} from "./migration-admission";

const S27_MIGRATION_NAMES = Object.keys(AUDITED_S27_MIGRATION_SHA256);

test("ordinary startup admits only the exact audited S27 inventory", () => {
  assert.equal(ORDINARY_STARTUP_MIGRATION_CEILING, 27);
  assert.equal(S27_MIGRATION_NAMES.length, 29);
  assert.equal(packagedMigrationOrdinal("027_notebooklm_url_sources.sql"), 27);
  assert.deepEqual(
    classifyOrdinaryStartupMigration("027_notebooklm_url_sources.sql"),
    {
      kind: "audited_s27",
      sha256:
        "a488c7e15c54d232ad16708541bbc4a6fea6c2645fd79a999f7c416a8e2603b6",
    },
  );
  assert.equal(
    ordinaryStartupMayApplyMigration("028_youtube_browser_transcript.sql"),
    false,
  );
  assert.equal(
    ordinaryStartupMayApplyMigration("029_manual_transcript_enrichment_expand.sql"),
    false,
  );
  assert.throws(
    () => ordinaryStartupMayApplyMigration("027_unreviewed_backdated.sql"),
    /migration is not in audited S27 inventory/,
  );
  assert.throws(
    () => ordinaryStartupMayApplyMigration("031_unreviewed_future.sql"),
    /migration is not in reviewed gated inventory/,
  );
  assert.throws(
    () => ordinaryStartupMayApplyMigration("28_youtube_browser_transcript.sql"),
    /invalid packaged migration filename/,
  );
});

test("ordinary inventory requires every frozen S27 migration", () => {
  assert.throws(
    () =>
      assertOrdinaryStartupMigrationInventory(
        S27_MIGRATION_NAMES.filter(
          (name) => name !== "027_notebooklm_url_sources.sql",
        ),
      ),
    /audited S27 migration missing: 027_notebooklm_url_sources\.sql/,
  );
});

test("historical subset admission is test-only and callback-scoped", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    delete process.env.NODE_ENV;
    assert.throws(
      () => withAuditedS27MigrationSubsetForTests(() => undefined),
      /test_migration_inventory_override_forbidden/,
    );
    process.env.NODE_ENV = "test";
    assert.doesNotThrow(() =>
      withAuditedS27MigrationSubsetForTests(() =>
        assertOrdinaryStartupMigrationInventory([
          "001_initial_schema.sql",
        ]),
      ),
    );
    assert.throws(
      () =>
        assertOrdinaryStartupMigrationInventory([
          "001_initial_schema.sql",
        ]),
      /audited S27 migration missing/,
    );
    assert.throws(
      () =>
        withAuditedS27MigrationSubsetForTests(() =>
          assertOrdinaryStartupMigrationInventory([
            "001_initial_schema.sql",
            "028_youtube_browser_transcript.sql",
          ]),
        ),
      /gated migration forbidden in audited test subset/,
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("ordinary inventory matches the frozen S27 manifest exactly", () => {
  const manifest = JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        "docs/feature-council/youtube-item-recovery-implementation/implementation/fixtures/stage2-s27-schema-manifest.json",
      ),
      "utf8",
    ),
  ) as { migrations: Array<{ name: string; sha256: string }> };
  assert.deepEqual(
    Object.entries(AUDITED_S27_MIGRATION_SHA256).map(([name, sha256]) => ({
      name,
      sha256,
    })),
    manifest.migrations,
  );
});

test("ordinary migration runner leaves an unseen migration 028 unread and unapplied", () => {
  withCompleteMigrationFixture(
    (db) => {
      runMigrations(db);

      const names = db
        .prepare("SELECT name FROM _migrations ORDER BY name")
        .all()
        .map((row) => (row as { name: string }).name);
      assert.deepEqual(names, [...S27_MIGRATION_NAMES].sort());
      assert.equal(tableExists(db, "forbidden_028"), false);
    },
    (directory) => {
      symlinkSync(
        join(directory, "missing-transition-source.sql"),
        join(directory, "028_youtube_browser_transcript.sql"),
      );
    },
  );
});

test("ordinary migration runner refuses backdated DDL before ledger mutation", () => {
  withCompleteMigrationFixture(
    (db) => {
      assert.throws(
        () => runMigrations(db),
        /migration is not in audited S27 inventory: 027_unreviewed_backdated\.sql/,
      );
      assert.equal(tableExists(db, "_migrations"), false);
      assert.equal(tableExists(db, "unreviewed_027"), false);
    },
    (directory) => {
      writeFileSync(
        join(directory, "027_unreviewed_backdated.sql"),
        "CREATE TABLE unreviewed_027 (id INTEGER PRIMARY KEY);",
        "utf8",
      );
    },
  );
});

test("ordinary migration runner refuses changed S27 bytes before ledger mutation", () => {
  withCompleteMigrationFixture(
    (db) => {
      assert.throws(
        () => runMigrations(db),
        /packaged S27 migration hash mismatch: 027_notebooklm_url_sources\.sql/,
      );
      assert.equal(tableExists(db, "_migrations"), false);
    },
    (directory) => {
      writeFileSync(
        join(directory, "027_notebooklm_url_sources.sql"),
        "SELECT 27;",
        "utf8",
      );
    },
  );
});

test("ordinary migration runner refuses recorded 028 until S28 authority is packaged", () => {
  const migrationSql =
    "CREATE TABLE transition_only_028 (id INTEGER PRIMARY KEY);";
  withCompleteMigrationFixture(
    (db) => {
      runMigrations(db);
      db.prepare("INSERT INTO _migrations(name,sha256) VALUES(?,?)").run(
        "028_youtube_browser_transcript.sql",
        createHash("sha256").update(migrationSql).digest("hex"),
      );

      assert.throws(
        () => runMigrations(db),
        /applied gated migration unsupported by this binary: 028_youtube_browser_transcript\.sql/,
      );
      assert.equal(tableExists(db, "transition_only_028"), false);
    },
    (directory) => {
      writeFileSync(
        join(directory, "028_youtube_browser_transcript.sql"),
        migrationSql,
        "utf8",
      );
    },
  );
});

test("ordinary migration runner does not upgrade a legacy ledger containing 028", () => {
  withCompleteMigrationFixture(
    (db) => {
      db.exec(`
        CREATE TABLE _migrations (
          id   INTEGER PRIMARY KEY,
          name TEXT NOT NULL UNIQUE
        );
        INSERT INTO _migrations(name)
        VALUES('028_youtube_browser_transcript.sql');
      `);

      assert.throws(
        () => runMigrations(db),
        /gated migration hash missing: 028_youtube_browser_transcript\.sql/,
      );
      assert.deepEqual(
        (
          db.pragma("table_info('_migrations')") as Array<{ name: string }>
        ).map((column) => column.name),
        ["id", "name"],
      );
    },
    (directory) => {
      symlinkSync(
        join(directory, "missing-transition-source.sql"),
        join(directory, "028_youtube_browser_transcript.sql"),
      );
    },
  );
});

test("ordinary migration runner backfills NULL legacy S27 hashes only", () => {
  withCompleteMigrationFixture((db) => {
    runMigrations(db);
    db.prepare("UPDATE _migrations SET sha256=NULL WHERE name=?").run(
      "027_notebooklm_url_sources.sql",
    );

    runMigrations(db);
    assert.equal(
      (
        db
          .prepare("SELECT sha256 FROM _migrations WHERE name=?")
          .get("027_notebooklm_url_sources.sql") as { sha256: string }
      ).sha256,
      AUDITED_S27_MIGRATION_SHA256["027_notebooklm_url_sources.sql"],
    );
  });
});

test("ordinary migration runner refuses empty or malformed recorded hashes", () => {
  for (const malformed of ["", "0".repeat(63), "z".repeat(64)]) {
    withCompleteMigrationFixture((db) => {
      runMigrations(db);
      db.prepare("UPDATE _migrations SET sha256=? WHERE name=?").run(
        malformed,
        "027_notebooklm_url_sources.sql",
      );

      assert.throws(
        () => runMigrations(db),
        /applied migration hash mismatch: 027_notebooklm_url_sources\.sql/,
      );
    });
  }
});

function withCompleteMigrationFixture(
  run: (db: Database.Database) => void,
  setup?: (directory: string) => void,
): void {
  const directory = mkdtempSync(join(tmpdir(), "brain-stage2-migrations-"));
  const sourceDirectory = resolve(process.cwd(), "src/db/migrations");
  const previous = process.env.BRAIN_MIGRATIONS_DIR;
  const db = new Database(":memory:");
  try {
    sqliteVec.load(db);
    for (const filename of S27_MIGRATION_NAMES) {
      copyFileSync(
        join(sourceDirectory, filename),
        join(directory, filename),
      );
    }
    setup?.(directory);
    process.env.BRAIN_MIGRATIONS_DIR = directory;
    run(db);
  } finally {
    db.close();
    if (previous === undefined) delete process.env.BRAIN_MIGRATIONS_DIR;
    else process.env.BRAIN_MIGRATIONS_DIR = previous;
    rmSync(directory, { recursive: true, force: true });
  }
}

function tableExists(db: Database.Database, name: string): boolean {
  return Boolean(
    db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=? LIMIT 1",
      )
      .get(name),
  );
}
