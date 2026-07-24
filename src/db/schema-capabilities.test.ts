import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { runMigrations } from "./client";
import {
  attestSchemaCapabilityForFrozenContract,
  getYouTubeBrowserSchemaCapability,
  PACKAGED_YOUTUBE_BROWSER_SCHEMA_CONTRACT,
  type FrozenSchemaCapabilityContract,
  withYouTubeBrowserSchemaContractForTests,
} from "./schema-capabilities";
import {
  createYouTubeBrowserSchemaFixture as createFixture,
  YOUTUBE_BROWSER_FIXTURE_CONTRACT as FIXTURE_CONTRACT,
  YOUTUBE_BROWSER_FIXTURE_MIGRATION_NAME as FIXTURE_MIGRATION_NAME,
  YOUTUBE_BROWSER_FIXTURE_MIGRATION_SHA as FIXTURE_MIGRATION_SHA,
} from "./test-fixtures/youtube-browser-schema";

function setNodeEnv(value: string | undefined): void {
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  if (value === undefined) delete mutableEnvironment.NODE_ENV;
  else mutableEnvironment.NODE_ENV = value;
}

function expectCapability(
  db: Database.Database,
  expected:
    { kind: "absent" | "ready" } | { kind: "incompatible"; code: string },
): void {
  assert.deepEqual(
    attestSchemaCapabilityForFrozenContract(db, FIXTURE_CONTRACT),
    expected,
  );
}

function expectContractInvalid(
  db: Database.Database,
  contract: FrozenSchemaCapabilityContract,
): void {
  assert.deepEqual(attestSchemaCapabilityForFrozenContract(db, contract), {
    kind: "incompatible",
    code: "schema_contract_invalid",
  });
}

test("the current migration-027 schema has no YouTube browser capability markers", () => {
  const db = new Database(":memory:");
  sqliteVec.load(db);
  db.pragma("foreign_keys = ON");
  try {
    runMigrations(db);
    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), {
      kind: "absent",
    });
  } finally {
    db.close();
  }
});

test("a representative pre-feature fixture is absent", () => {
  const db = new Database(":memory:");
  try {
    db.exec(`
      CREATE TABLE _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sha256 TEXT
      );
      INSERT INTO _migrations(name,sha256)
      VALUES('026_notebooklm_export.sql', '${"b".repeat(64)}');
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        body TEXT NOT NULL
      );
    `);
    expectCapability(db, { kind: "absent" });
    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), {
      kind: "absent",
    });
  } finally {
    db.close();
  }
});

test("only the exact audited ordinal-027 migration is ordinary pre-feature schema", () => {
  const db = new Database(":memory:");
  try {
    db.exec(`
      CREATE TABLE _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sha256 TEXT
      );
      CREATE TABLE items (id TEXT PRIMARY KEY, body TEXT NOT NULL);
    `);
    const insert = db.prepare(
      "INSERT INTO _migrations(name,sha256) VALUES(?,?)",
    );
    insert.run(
      "027_notebooklm_url_sources.sql",
      "a488c7e15c54d232ad16708541bbc4a6fea6c2645fd79a999f7c416a8e2603b6",
    );
    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), { kind: "absent" });

    db.prepare("UPDATE _migrations SET sha256=NULL").run();
    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), {
      kind: "incompatible",
      code: "migration_ledger_incompatible",
    });

    db.prepare("UPDATE _migrations SET sha256=?").run("b".repeat(64));
    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), {
      kind: "incompatible",
      code: "migration_ledger_incompatible",
    });

    db.prepare("UPDATE _migrations SET name=?,sha256=?").run(
      "027_wrong_allocation.sql",
      "a".repeat(64),
    );
    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), {
      kind: "incompatible",
      code: "migration_ledger_incompatible",
    });

    db.prepare("UPDATE _migrations SET name=?,sha256=?").run(
      "027_notebooklm_url_sources.sql",
      "a488c7e15c54d232ad16708541bbc4a6fea6c2645fd79a999f7c416a8e2603b6",
    );
    insert.run("027_additional_allocation.sql", "a".repeat(64));
    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), {
      kind: "incompatible",
      code: "migration_ledger_incompatible",
    });
  } finally {
    db.close();
  }
});

test("the generic future-contract attestor accepts exact ledger and complete shape", () => {
  const db = createFixture();
  try {
    expectCapability(db, { kind: "ready" });
  } finally {
    db.close();
  }
});

test("the scoped test contract exercises runtime ready without packaging authority", () => {
  const db = createFixture();
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    setNodeEnv("test");
    assert.equal(PACKAGED_YOUTUBE_BROWSER_SCHEMA_CONTRACT, null);
    assert.deepEqual(
      withYouTubeBrowserSchemaContractForTests(FIXTURE_CONTRACT, () =>
        getYouTubeBrowserSchemaCapability(db),
      ),
      { kind: "ready" },
    );
    assert.deepEqual(
      getYouTubeBrowserSchemaCapability(db),
      {
        kind: "incompatible",
        code: "schema_contract_not_frozen",
      },
      "the callback-scoped contract must not linger as global authority",
    );
  } finally {
    setNodeEnv(previousNodeEnv);
    db.close();
  }
});

test("non-test processes cannot install scoped schema authority", async (t) => {
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    for (const nodeEnv of ["production", "development", undefined]) {
      await t.test(nodeEnv ?? "unset", () => {
        setNodeEnv(nodeEnv);
        let callbackRan = false;
        assert.throws(
          () =>
            withYouTubeBrowserSchemaContractForTests(FIXTURE_CONTRACT, () => {
              callbackRan = true;
            }),
          {
            message: "test_schema_contract_override_forbidden",
          },
        );
        assert.equal(callbackRan, false);
      });
    }
  } finally {
    setNodeEnv(previousNodeEnv);
  }
});

test("concurrent async test-contract scopes cannot cross-contaminate authority", async () => {
  const db = createFixture();
  const previousNodeEnv = process.env.NODE_ENV;
  let releaseBarrier: (() => void) | undefined;
  const barrier = new Promise<void>((resolve) => {
    releaseBarrier = resolve;
  });
  const wrongHashContract: FrozenSchemaCapabilityContract = {
    ...FIXTURE_CONTRACT,
    migration: {
      ...FIXTURE_CONTRACT.migration,
      sha256: "c".repeat(64),
    },
  };

  try {
    setNodeEnv("test");
    const readyPath = withYouTubeBrowserSchemaContractForTests(
      FIXTURE_CONTRACT,
      async () => {
        await barrier;
        await Promise.resolve();
        return getYouTubeBrowserSchemaCapability(db);
      },
    );
    const incompatiblePath = withYouTubeBrowserSchemaContractForTests(
      wrongHashContract,
      async () => {
        releaseBarrier?.();
        await Promise.resolve();
        return getYouTubeBrowserSchemaCapability(db);
      },
    );

    const [ready, incompatible] = await Promise.all([
      readyPath,
      incompatiblePath,
    ]);
    assert.deepEqual(ready, { kind: "ready" });
    assert.deepEqual(incompatible, {
      kind: "incompatible",
      code: "migration_ledger_hash_mismatch",
    });
    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), {
      kind: "incompatible",
      code: "schema_contract_not_frozen",
    });
  } finally {
    releaseBarrier?.();
    setNodeEnv(previousNodeEnv);
    db.close();
  }
});

test("truncated or ownership-incoherent manifests cannot become authority", async (t) => {
  const db = createFixture();
  try {
    await t.test("all feature-owned checks omitted", () => {
      expectContractInvalid(db, {
        ...FIXTURE_CONTRACT,
        tables: FIXTURE_CONTRACT.tables.map((table) => ({
          ...table,
          checks: [],
        })),
      });
    });

    await t.test("trigger manifest omitted", () => {
      expectContractInvalid(db, {
        ...FIXTURE_CONTRACT,
        triggers: [],
        markers: FIXTURE_CONTRACT.markers.filter(
          (marker) => marker.kind !== "trigger",
        ),
      });
    });

    await t.test("index manifest omitted", () => {
      expectContractInvalid(db, {
        ...FIXTURE_CONTRACT,
        indexes: [],
        markers: FIXTURE_CONTRACT.markers.filter(
          (marker) => marker.kind !== "index",
        ),
      });
    });

    await t.test("trigger owner is not a declared table", () => {
      expectContractInvalid(db, {
        ...FIXTURE_CONTRACT,
        triggers: FIXTURE_CONTRACT.triggers.map((trigger) => ({
          ...trigger,
          table: "undeclared_items",
        })),
      });
    });

    await t.test("index owner is not a declared table", () => {
      expectContractInvalid(db, {
        ...FIXTURE_CONTRACT,
        indexes: FIXTURE_CONTRACT.indexes.map((index) => ({
          ...index,
          table: "undeclared_holds",
        })),
      });
    });

    await t.test("index column is not declared by its table manifest", () => {
      expectContractInvalid(db, {
        ...FIXTURE_CONTRACT,
        indexes: FIXTURE_CONTRACT.indexes.map((index) => ({
          ...index,
          columns: ["undeclared_item_id"],
        })),
      });
    });
  } finally {
    db.close();
  }
});

test("missing and wrong migration filenames are incompatible", async (t) => {
  await t.test("missing", () => {
    const db = createFixture({ ledgerName: null });
    try {
      expectCapability(db, {
        kind: "incompatible",
        code: "migration_ledger_entry_missing",
      });
    } finally {
      db.close();
    }
  });

  await t.test("wrong filename in the feature family", () => {
    const db = createFixture({
      ledgerName: "028_wrong_youtube_browser_transcript.sql",
    });
    try {
      expectCapability(db, {
        kind: "incompatible",
        code: "migration_ledger_filename_mismatch",
      });
    } finally {
      db.close();
    }
  });
});

test("missing and wrong migration hashes are incompatible", async (t) => {
  await t.test("missing", () => {
    const db = createFixture({ ledgerSha: null });
    try {
      expectCapability(db, {
        kind: "incompatible",
        code: "migration_ledger_hash_missing",
      });
    } finally {
      db.close();
    }
  });

  await t.test("wrong", () => {
    const db = createFixture({ ledgerSha: "c".repeat(64) });
    try {
      expectCapability(db, {
        kind: "incompatible",
        code: "migration_ledger_hash_mismatch",
      });
    } finally {
      db.close();
    }
  });
});

test("partial table and column shape is incompatible", async (t) => {
  await t.test("missing required table", () => {
    const db = createFixture({ omitHoldTable: true, index: "missing" });
    try {
      expectCapability(db, {
        kind: "incompatible",
        code: "table_missing",
      });
    } finally {
      db.close();
    }
  });

  await t.test("missing required column", () => {
    const db = createFixture({ omitContentRevision: true });
    try {
      expectCapability(db, {
        kind: "incompatible",
        code: "column_missing",
      });
    } finally {
      db.close();
    }
  });
});

test("missing and wrong table checks are incompatible", async (t) => {
  await t.test("missing", () => {
    const db = createFixture({ holdCheck: "missing" });
    try {
      expectCapability(db, {
        kind: "incompatible",
        code: "table_check_mismatch",
      });
    } finally {
      db.close();
    }
  });

  await t.test("wrong", () => {
    const db = createFixture({ holdCheck: "wrong" });
    try {
      expectCapability(db, {
        kind: "incompatible",
        code: "table_check_mismatch",
      });
    } finally {
      db.close();
    }
  });
});

test("missing and wrong triggers are incompatible", async (t) => {
  await t.test("missing", () => {
    const db = createFixture({ trigger: "missing" });
    try {
      expectCapability(db, {
        kind: "incompatible",
        code: "trigger_missing",
      });
    } finally {
      db.close();
    }
  });

  await t.test("wrong", () => {
    const db = createFixture({ trigger: "wrong" });
    try {
      expectCapability(db, {
        kind: "incompatible",
        code: "trigger_mismatch",
      });
    } finally {
      db.close();
    }
  });
});

test("missing and wrong indexes are incompatible", async (t) => {
  await t.test("missing", () => {
    const db = createFixture({ index: "missing" });
    try {
      expectCapability(db, {
        kind: "incompatible",
        code: "index_missing",
      });
    } finally {
      db.close();
    }
  });

  await t.test("wrong partial predicate", () => {
    const db = createFixture({ index: "wrong" });
    try {
      expectCapability(db, {
        kind: "incompatible",
        code: "index_mismatch",
      });
    } finally {
      db.close();
    }
  });
});

test("schema discovery failures fail closed without exposing the raw error", () => {
  const db = createFixture();
  db.close();
  expectCapability(db, {
    kind: "incompatible",
    code: "schema_discovery_failed",
  });
  assert.deepEqual(getYouTubeBrowserSchemaCapability(db), {
    kind: "incompatible",
    code: "schema_discovery_failed",
  });
});

test("same-version ledger insertion and removal are observed on every runtime call", () => {
  const db = new Database(":memory:");
  try {
    db.exec(`
      CREATE TABLE _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sha256 TEXT
      );
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        body TEXT NOT NULL
      );
    `);
    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), {
      kind: "absent",
    });
    const schemaVersion = db.pragma("schema_version", {
      simple: true,
    }) as number;

    db.prepare("INSERT INTO _migrations(name,sha256) VALUES(?,?)").run(
      FIXTURE_MIGRATION_NAME,
      FIXTURE_MIGRATION_SHA,
    );
    assert.equal(
      db.pragma("schema_version", { simple: true }),
      schemaVersion,
      "ledger DML must not masquerade as shape-cache invalidation",
    );
    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), {
      kind: "incompatible",
      code: "schema_contract_not_frozen",
    });

    db.prepare("DELETE FROM _migrations WHERE name=?").run(
      FIXTURE_MIGRATION_NAME,
    );
    assert.equal(db.pragma("schema_version", { simple: true }), schemaVersion);
    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), { kind: "absent" });
  } finally {
    db.close();
  }
});

test("a differently named 028 ledger row is never mistaken for pre-feature absence", () => {
  const db = new Database(":memory:");
  try {
    db.exec(`
      CREATE TABLE _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sha256 TEXT
      );
      CREATE TABLE items (id TEXT PRIMARY KEY, body TEXT NOT NULL);
      INSERT INTO _migrations(name, sha256)
      VALUES ('028_wrong_allocation.sql', '${"a".repeat(64)}');
    `);

    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), {
      kind: "incompatible",
      code: "schema_contract_not_frozen",
    });

    db.prepare("DELETE FROM _migrations").run();
    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), {
      kind: "absent",
    });
  } finally {
    db.close();
  }
});

test("same-version ledger name, hash, and deletion mutations immediately revoke generic ready", () => {
  const db = createFixture();
  try {
    const schemaVersion = db.pragma("schema_version", {
      simple: true,
    }) as number;
    expectCapability(db, { kind: "ready" });

    db.prepare("UPDATE _migrations SET sha256=? WHERE name=?").run(
      "c".repeat(64),
      FIXTURE_MIGRATION_NAME,
    );
    assert.equal(db.pragma("schema_version", { simple: true }), schemaVersion);
    expectCapability(db, {
      kind: "incompatible",
      code: "migration_ledger_hash_mismatch",
    });

    db.prepare("UPDATE _migrations SET sha256=? WHERE name=?").run(
      FIXTURE_MIGRATION_SHA,
      FIXTURE_MIGRATION_NAME,
    );
    expectCapability(db, { kind: "ready" });

    const wrongName = "028_wrong_youtube_browser_transcript.sql";
    db.prepare("UPDATE _migrations SET name=? WHERE name=?").run(
      wrongName,
      FIXTURE_MIGRATION_NAME,
    );
    assert.equal(db.pragma("schema_version", { simple: true }), schemaVersion);
    expectCapability(db, {
      kind: "incompatible",
      code: "migration_ledger_filename_mismatch",
    });

    db.prepare("UPDATE _migrations SET name=? WHERE name=?").run(
      FIXTURE_MIGRATION_NAME,
      wrongName,
    );
    expectCapability(db, { kind: "ready" });

    db.prepare("DELETE FROM _migrations WHERE name=?").run(
      FIXTURE_MIGRATION_NAME,
    );
    assert.equal(db.pragma("schema_version", { simple: true }), schemaVersion);
    expectCapability(db, {
      kind: "incompatible",
      code: "migration_ledger_entry_missing",
    });
  } finally {
    db.close();
  }
});

test("shape cache invalidates when DDL advances schema_version", () => {
  const db = createFixture();
  try {
    expectCapability(db, { kind: "ready" });
    expectCapability(db, { kind: "ready" });
    const priorSchemaVersion = db.pragma("schema_version", {
      simple: true,
    }) as number;

    db.exec("DROP TRIGGER items_advance_content_revision");
    const currentSchemaVersion = db.pragma("schema_version", {
      simple: true,
    }) as number;
    assert.notEqual(currentSchemaVersion, priorSchemaVersion);
    expectCapability(db, {
      kind: "incompatible",
      code: "trigger_missing",
    });
  } finally {
    db.close();
  }
});

test("future markers cannot report runtime ready while the packaged contract is unfrozen", () => {
  const db = createFixture();
  try {
    assert.deepEqual(getYouTubeBrowserSchemaCapability(db), {
      kind: "incompatible",
      code: "schema_contract_not_frozen",
    });
    assert.notEqual(getYouTubeBrowserSchemaCapability(db).kind, "ready");
  } finally {
    db.close();
  }
});
