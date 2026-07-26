import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const fixtureDir = dirname(scriptPath);
const projectRoot = resolve(fixtureDir, "../../../../..");
const manifestPath = resolve(fixtureDir, "stage2-s27-schema-manifest.json");
const migrationsPath = resolve(projectRoot, "src/db/migrations");
const betterSqlite3PackagePath = resolve(
  projectRoot,
  "node_modules/better-sqlite3/package.json",
);
const sqliteVecPackagePath = resolve(
  projectRoot,
  "node_modules/sqlite-vec/package.json",
);

process.env.BRAIN_DB_PATH = ":memory:";
process.env.BRAIN_MIGRATIONS_DIR = migrationsPath;
process.env.NODE_ENV = "test";

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value) {
  return sha256Bytes(JSON.stringify(value));
}

function compareBytes(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeSql(value) {
  return value == null
    ? null
    : String(value).replace(/\r\n?/gu, "\n").trim();
}

function projectRelativePath(path) {
  const normalized = relative(projectRoot, path).split(sep).join("/");
  if (
    normalized === "" ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error("verification_input_outside_project");
  }
  return normalized;
}

function buildPackageTree(logicalRoot) {
  const root = realpathSync(logicalRoot);
  const files = [];

  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile()) {
        files.push({
          path: relative(root, path).split(sep).join("/"),
          sha256: sha256Bytes(readFileSync(path)),
        });
      } else {
        throw new Error("package_tree_non_regular_entry");
      }
    }
  }

  walk(root);
  files.sort((left, right) => compareBytes(left.path, right.path));
  return {
    file_count: files.length,
    sha256: sha256Json(files),
  };
}

function normalizeSharedObjectPath(path) {
  const resolvedPath = realpathSync(path);
  const normalized = relative(projectRoot, resolvedPath);
  if (
    normalized !== "" &&
    normalized !== ".." &&
    !normalized.startsWith(`..${sep}`)
  ) {
    return `<project_root>/${normalized.split(sep).join("/")}`;
  }
  return resolvedPath;
}

function buildExternalSharedObjectDescriptor() {
  const objects = process.report
    .getReport()
    .sharedObjects.filter(
      (path) =>
        !path.startsWith("/System/Library/") &&
        !path.startsWith("/usr/lib/"),
    )
    .map((path) => ({
      path: normalizeSharedObjectPath(path),
      sha256: sha256Bytes(readFileSync(path)),
    }))
    .sort((left, right) => compareBytes(left.path, right.path));
  return {
    count: objects.length,
    sha256: sha256Json(objects),
  };
}

function buildVecCapabilityDescriptor(db) {
  const compileOptions = db
    .pragma("compile_options")
    .map((row) => row.compile_options)
    .sort(compareBytes);
  const functions = db
    .pragma("function_list")
    .filter((row) => row.name.startsWith("vec_"))
    .map((row) => ({
      name: row.name,
      builtin: row.builtin,
      type: row.type,
      enc: row.enc,
      narg: row.narg,
      flags: row.flags,
    }))
    .sort(
      (left, right) =>
        compareBytes(left.name, right.name) || left.narg - right.narg,
    );
  const modules = db
    .pragma("module_list")
    .map((row) => row.name)
    .filter((name) => name.startsWith("vec"))
    .sort(compareBytes);

  db.exec(
    "CREATE VIRTUAL TABLE vec_capability_probe " +
      "USING vec0(embedding float[2])",
  );
  const insert = db.prepare(
    "INSERT INTO vec_capability_probe(rowid,embedding) " +
      "VALUES (?,vec_f32(?))",
  );
  insert.run(1n, "[1.0,0.0]");
  insert.run(2n, "[0.0,1.0]");
  const golden = {
    scalar: db
      .prepare(
        "SELECT vec_version() AS version, " +
          "vec_length(vec_f32(?)) AS length, " +
          "hex(vec_add(vec_f32(?),vec_f32(?))) AS add_hex, " +
          "vec_distance_cosine(vec_f32(?),vec_f32(?)) AS cosine",
      )
      .get(
        "[1.0,2.0,3.0]",
        "[1.0,2.0]",
        "[3.0,4.0]",
        "[1.0,0.0]",
        "[0.0,1.0]",
      ),
    knn: db
      .prepare(
        "SELECT rowid,distance FROM vec_capability_probe " +
          "WHERE embedding MATCH vec_f32(?) AND k = 2 " +
          "ORDER BY distance",
      )
      .all("[1.0,0.0]"),
  };
  db.exec("DROP TABLE vec_capability_probe");

  return {
    sqlite_source_id: db
      .prepare("SELECT sqlite_source_id() AS value")
      .get().value,
    compile_options_sha256: sha256Json(compileOptions),
    function_registry_sha256: sha256Json(functions),
    module_registry_sha256: sha256Json(modules),
    golden_sha256: sha256Json(golden),
    vec_version: golden.scalar.version,
  };
}

function readSourceCommitBlob(sourceCommit, path) {
  return execFileSync("git", ["show", `${sourceCommit}:${path}`], {
    cwd: projectRoot,
    encoding: "buffer",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function stableForeignKeyCheck(db) {
  return JSON.stringify(
    db
      .pragma("foreign_key_check")
      .map((row) => ({
        ...row,
        rowid: row.rowid === null ? null : String(row.rowid),
      }))
      .sort(
        (left, right) =>
          compareBytes(left.table, right.table) ||
          compareBytes(left.rowid ?? "", right.rowid ?? "") ||
          compareBytes(left.parent, right.parent) ||
          left.fkid - right.fkid,
      ),
  );
}

function runAuditedS27Migrations(db, manifest) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      sha256     TEXT,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
  `);
  const insert = db.prepare(
    "INSERT INTO _migrations (name,sha256) VALUES (?,?)",
  );

  for (const migration of manifest.migrations) {
    const sql = readFileSync(
      resolve(migrationsPath, migration.name),
      "utf8",
    );
    assertEqual(
      sha256Bytes(sql),
      migration.sha256,
      "audited_runner_migration_sha256",
    );
    const needsForeignKeysOff =
      /PRAGMA\s+foreign_keys\s*=\s*OFF/iu.test(sql);
    const foreignKeysWereEnabled =
      Number(db.pragma("foreign_keys", { simple: true })) === 1;
    const foreignKeysBefore = needsForeignKeysOff
      ? stableForeignKeyCheck(db)
      : null;
    if (needsForeignKeysOff && foreignKeysWereEnabled) {
      db.pragma("foreign_keys = OFF");
    }
    const apply = db.transaction(() => {
      db.exec(sql);
      if (
        foreignKeysBefore !== null &&
        stableForeignKeyCheck(db) !== foreignKeysBefore
      ) {
        throw new Error("migration_changed_foreign_key_manifest");
      }
      insert.run(migration.name, migration.sha256);
    });
    try {
      apply();
    } finally {
      if (needsForeignKeysOff && foreignKeysWereEnabled) {
        db.pragma("foreign_keys = ON");
      }
    }
  }
}

function buildDescriptor(db) {
  const master = db
    .prepare(
      "SELECT type,name,tbl_name,sql FROM sqlite_master " +
        "WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
    )
    .all()
    .map((row) => ({
      type: row.type,
      name: row.name,
      tbl_name: row.tbl_name,
      sql: normalizeSql(row.sql),
    }));
  const relationNames = [
    ...new Set(
      master
        .filter((entry) => entry.type === "table")
        .map((entry) => entry.name),
    ),
  ].sort(compareBytes);
  const relationDetails = {};

  for (const name of relationNames) {
    const quotedName = JSON.stringify(name);
    const columns = db
      .prepare(`PRAGMA table_xinfo(${quotedName})`)
      .all()
      .map((row) => ({
        cid: row.cid,
        name: row.name,
        type: row.type,
        notnull: row.notnull,
        dflt_value: row.dflt_value,
        pk: row.pk,
        hidden: row.hidden,
      }))
      .sort((left, right) => left.cid - right.cid);
    const foreignKeys = db
      .prepare(`PRAGMA foreign_key_list(${quotedName})`)
      .all()
      .map((row) => ({
        id: row.id,
        seq: row.seq,
        table: row.table,
        from: row.from,
        to: row.to,
        on_update: row.on_update,
        on_delete: row.on_delete,
        match: row.match,
      }))
      .sort((left, right) => left.id - right.id || left.seq - right.seq);
    const indexes = db
      .prepare(`PRAGMA index_list(${quotedName})`)
      .all()
      .map((row) => ({
        name: row.name,
        unique: row.unique,
        origin: row.origin,
        partial: row.partial,
        columns: db
          .prepare(`PRAGMA index_xinfo(${JSON.stringify(row.name)})`)
          .all()
          .map((column) => ({
            seqno: column.seqno,
            cid: column.cid,
            name: column.name,
            desc: column.desc,
            coll: column.coll,
            key: column.key,
          }))
          .sort((left, right) => left.seqno - right.seqno),
      }))
      .sort((left, right) => compareBytes(left.name, right.name));
    const triggers = master
      .filter(
        (entry) => entry.type === "trigger" && entry.tbl_name === name,
      )
      .map((entry) => ({ name: entry.name, sql: entry.sql }));
    relationDetails[name] = {
      table_sql:
        master.find(
          (entry) => entry.type === "table" && entry.name === name,
        )?.sql ?? null,
      columns,
      foreign_keys: foreignKeys,
      indexes,
      triggers,
    };
  }

  const migrations = db
    .prepare("SELECT name,sha256 FROM _migrations ORDER BY id")
    .all()
    .map((row) => ({ name: row.name, sha256: row.sha256 }));
  const sqliteVersion = db
    .prepare("SELECT sqlite_version() AS value")
    .get().value;
  const descriptor = {
    format: "stage2-s27-schema-canonical-v1",
    sqlite_version: sqliteVersion,
    master,
    relations_detail: Object.fromEntries(
      relationNames.map((name) => [name, relationDetails[name]]),
    ),
    migrations,
  };

  return {
    descriptor,
    descriptorSha256: sha256Json(descriptor),
    migrationLedgerSha256: sha256Json(migrations),
    criticalRelationSha256: Object.fromEntries(
      relationNames.map((name) => [
        name,
        sha256Json(relationDetails[name]),
      ]),
    ),
    relationDetails,
    migrations,
    master,
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}_mismatch`);
  }
}

function assertJsonEqual(actual, expected, label) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), label);
}

async function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const betterSqlite3Package = JSON.parse(
    readFileSync(betterSqlite3PackagePath, "utf8"),
  );
  const sqliteVecPackage = JSON.parse(
    readFileSync(sqliteVecPackagePath, "utf8"),
  );
  const scriptSha256 = sha256Bytes(readFileSync(scriptPath));

  assertEqual(
    scriptSha256,
    manifest.canonicalizer.sha256,
    "canonicalizer_sha256",
  );
  const resolvedSourceCommit = execFileSync(
    "git",
    ["rev-parse", "--verify", `${manifest.source_commit}^{commit}`],
    {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();
  assertEqual(
    resolvedSourceCommit,
    manifest.source_commit,
    "source_commit",
  );
  const rootPackageBytes = readSourceCommitBlob(
    manifest.source_commit,
    manifest.verification_inputs.root_package_path,
  );
  const packageLockBytes = readSourceCommitBlob(
    manifest.source_commit,
    manifest.verification_inputs.package_lock_path,
  );
  const auditedRunnerBytes = readSourceCommitBlob(
    manifest.source_commit,
    manifest.verification_inputs.migration_runner_path,
  );
  const rootPackage = JSON.parse(rootPackageBytes.toString("utf8"));
  const packageLock = JSON.parse(packageLockBytes.toString("utf8"));
  assertEqual(
    rootPackage.version,
    packageLock.packages[""].version,
    "root_package_lock_version",
  );
  assertEqual(
    packageLock.packages["node_modules/better-sqlite3"].version,
    manifest.runtime.better_sqlite3,
    "better_sqlite3_lock_version",
  );
  assertEqual(
    packageLock.packages["node_modules/sqlite-vec"].version,
    manifest.runtime.sqlite_vec,
    "sqlite_vec_lock_version",
  );
  assertEqual(
    packageLock.packages["node_modules/sqlite-vec-darwin-arm64"].version,
    manifest.runtime.sqlite_vec_native_package,
    "sqlite_vec_native_lock_version",
  );
  assertEqual(
    betterSqlite3Package.version,
    manifest.runtime.better_sqlite3,
    "better_sqlite3_installed_version",
  );
  assertEqual(
    sqliteVecPackage.version,
    manifest.runtime.sqlite_vec,
    "sqlite_vec_installed_version",
  );
  assertEqual(
    Number(process.versions.node.split(".")[0]),
    manifest.runtime.node_major,
    "node_major",
  );
  assertEqual(process.versions.node, manifest.runtime.generator_node, "node");
  assertEqual(process.versions.v8, manifest.runtime.generator_v8, "v8");
  assertEqual(process.versions.icu, manifest.runtime.generator_icu, "icu");
  assertEqual(process.platform, manifest.runtime.generator_platform, "platform");
  assertEqual(process.arch, manifest.runtime.generator_arch, "arch");
  assertJsonEqual(
    process.execArgv,
    manifest.runtime.generator_exec_argv,
    "exec_argv",
  );
  assertEqual(
    sha256Bytes(readFileSync(process.execPath)),
    manifest.runtime.generator_node_executable_sha256,
    "node_executable_sha256",
  );
  for (const name of manifest.runtime.launch_environment_must_be_unset) {
    if (process.env[name] !== undefined) {
      throw new Error("launch_environment_not_clean");
    }
  }
  assertEqual(
    sha256Bytes(rootPackageBytes),
    manifest.verification_inputs.root_package_sha256,
    "root_package_sha256",
  );
  assertEqual(
    sha256Bytes(packageLockBytes),
    manifest.verification_inputs.package_lock_sha256,
    "package_lock_sha256",
  );
  assertEqual(
    sha256Bytes(auditedRunnerBytes),
    manifest.verification_inputs.migration_runner_sha256,
    "migration_runner_sha256",
  );
  for (const expected of manifest.verification_inputs.installed_package_trees) {
    const built = buildPackageTree(resolve(projectRoot, expected.path));
    assertEqual(
      built.file_count,
      expected.file_count,
      "installed_package_tree_file_count",
    );
    assertEqual(
      built.sha256,
      expected.sha256,
      "installed_package_tree_sha256",
    );
  }
  for (const expected of manifest.verification_inputs.executed_artifacts) {
    const path = resolve(projectRoot, expected.path);
    if (!lstatSync(path).isFile()) {
      throw new Error("executed_artifact_not_regular_file");
    }
    assertEqual(
      sha256Bytes(readFileSync(path)),
      expected.sha256,
      "executed_artifact_sha256",
    );
  }
  const resolvedEntries = new Map();
  for (const expected of manifest.verification_inputs.resolved_entries) {
    const resolvedEntry = fileURLToPath(import.meta.resolve(expected.specifier));
    assertEqual(
      realpathSync(resolvedEntry),
      realpathSync(resolve(projectRoot, expected.path)),
      "resolved_entry",
    );
    resolvedEntries.set(expected.specifier, realpathSync(resolvedEntry));
  }
  const betterSqlite3Require = createRequire(
    resolvedEntries.get("better-sqlite3"),
  );
  const bindingsEntry = realpathSync(
    betterSqlite3Require.resolve("bindings"),
  );
  const fileUriToPathEntry = realpathSync(
    createRequire(bindingsEntry).resolve("file-uri-to-path"),
  );
  const resolvedDependencyEntries = new Map([
    ["bindings", bindingsEntry],
    ["file-uri-to-path", fileUriToPathEntry],
  ]);
  for (
    const expected of
    manifest.verification_inputs.resolved_dependency_package_trees
  ) {
    const entry = resolvedDependencyEntries.get(expected.specifier);
    if (!entry) throw new Error("resolved_dependency_entry_missing");
    assertEqual(
      sha256Bytes(readFileSync(entry)),
      expected.entry_sha256,
      "resolved_dependency_entry_sha256",
    );
    const packageRoot = dirname(entry);
    const packageMetadata = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf8"),
    );
    assertEqual(
      packageMetadata.version,
      expected.version,
      "resolved_dependency_version",
    );
    assertEqual(
      packageLock.packages[expected.package_lock_path].version,
      expected.version,
      "resolved_dependency_lock_version",
    );
    const tree = buildPackageTree(packageRoot);
    assertEqual(
      tree.file_count,
      expected.file_count,
      "resolved_dependency_tree_file_count",
    );
    assertEqual(
      tree.sha256,
      expected.sha256,
      "resolved_dependency_tree_sha256",
    );
  }

  const migrationNames = readdirSync(migrationsPath)
    .filter((name) => /^\d{3}_.+\.sql$/u.test(name))
    .filter((name) => Number.parseInt(name.slice(0, 3), 10) <= 27)
    .sort(compareBytes);
  assertJsonEqual(
    migrationNames,
    manifest.migrations.map((migration) => migration.name),
    "migration_source_names",
  );
  for (const migration of manifest.migrations) {
    assertEqual(
      sha256Bytes(readFileSync(resolve(migrationsPath, migration.name))),
      migration.sha256,
      "migration_source_sha256",
    );
  }
  const sourceCommitBindings = [
    {
      path: manifest.verification_inputs.root_package_path,
      sha256: manifest.verification_inputs.root_package_sha256,
    },
    {
      path: manifest.verification_inputs.package_lock_path,
      sha256: manifest.verification_inputs.package_lock_sha256,
    },
    {
      path: manifest.verification_inputs.migration_runner_path,
      sha256: manifest.verification_inputs.migration_runner_sha256,
    },
    ...manifest.migrations.map((migration) => ({
      path: projectRelativePath(
        resolve(migrationsPath, migration.name),
      ),
      sha256: migration.sha256,
    })),
  ];
  for (const binding of sourceCommitBindings) {
    assertEqual(
      sha256Bytes(
        readSourceCommitBlob(manifest.source_commit, binding.path),
      ),
      binding.sha256,
      "source_commit_blob_sha256",
    );
  }

  const [{ default: Database }, sqliteVec] = await Promise.all([
    import("better-sqlite3"),
    import("sqlite-vec"),
  ]);
  const sqliteVecLoadablePath = realpathSync(sqliteVec.getLoadablePath());
  assertEqual(
    sha256Bytes(readFileSync(sqliteVecLoadablePath)),
    manifest.verification_inputs.sqlite_vec_loadable_sha256,
    "sqlite_vec_loadable_sha256",
  );
  const sqliteVecNativePackageRoot = dirname(sqliteVecLoadablePath);
  const sqliteVecNativePackage = JSON.parse(
    readFileSync(resolve(sqliteVecNativePackageRoot, "package.json"), "utf8"),
  );
  assertEqual(
    sqliteVecNativePackage.version,
    manifest.runtime.sqlite_vec_native_package,
    "sqlite_vec_native_installed_version",
  );
  assertJsonEqual(
    sqliteVecNativePackage.os,
    [manifest.runtime.generator_platform],
    "sqlite_vec_native_os",
  );
  assertJsonEqual(
    sqliteVecNativePackage.cpu,
    [manifest.runtime.generator_arch],
    "sqlite_vec_native_cpu",
  );
  const sqliteVecNativeTree = buildPackageTree(sqliteVecNativePackageRoot);
  assertEqual(
    sqliteVecNativeTree.file_count,
    manifest.verification_inputs.resolved_native_package_tree.file_count,
    "sqlite_vec_native_tree_file_count",
  );
  assertEqual(
    sqliteVecNativeTree.sha256,
    manifest.verification_inputs.resolved_native_package_tree.sha256,
    "sqlite_vec_native_tree_sha256",
  );
  const db = new Database(":memory:");
  try {
    db.pragma("foreign_keys = ON");
    sqliteVec.load(db);
    const sharedObjects = buildExternalSharedObjectDescriptor();
    assertEqual(
      sharedObjects.count,
      manifest.runtime.external_shared_object_count,
      "external_shared_object_count",
    );
    assertEqual(
      sharedObjects.sha256,
      manifest.runtime.external_shared_object_descriptor_sha256,
      "external_shared_object_descriptor_sha256",
    );
    const capabilities = buildVecCapabilityDescriptor(db);
    assertEqual(
      capabilities.sqlite_source_id,
      manifest.runtime.sqlite_source_id,
      "sqlite_source_id",
    );
    assertEqual(
      capabilities.compile_options_sha256,
      manifest.runtime.sqlite_compile_options_sha256,
      "sqlite_compile_options_sha256",
    );
    assertEqual(
      capabilities.vec_version,
      manifest.runtime.sqlite_vec_runtime_version,
      "sqlite_vec_runtime_version",
    );
    assertEqual(
      capabilities.function_registry_sha256,
      manifest.runtime.sqlite_vec_function_registry_sha256,
      "sqlite_vec_function_registry_sha256",
    );
    assertEqual(
      capabilities.module_registry_sha256,
      manifest.runtime.sqlite_vec_module_registry_sha256,
      "sqlite_vec_module_registry_sha256",
    );
    assertEqual(
      capabilities.golden_sha256,
      manifest.runtime.sqlite_vec_golden_sha256,
      "sqlite_vec_golden_sha256",
    );
    runAuditedS27Migrations(db, manifest);

    assertEqual(
      db.pragma("quick_check", { simple: true }),
      "ok",
      "quick_check",
    );
    assertEqual(
      db.pragma("foreign_key_check").length,
      0,
      "foreign_key_check",
    );

    const built = buildDescriptor(db);
    assertEqual(
      built.descriptor.sqlite_version,
      manifest.sqlite_version,
      "sqlite_version",
    );
    assertEqual(
      built.descriptorSha256,
      manifest.canonical_descriptor_sha256,
      "canonical_descriptor_sha256",
    );
    assertEqual(
      built.migrationLedgerSha256,
      manifest.migration_ledger_sha256,
      "migration_ledger_sha256",
    );
    assertJsonEqual(built.migrations, manifest.migrations, "migrations");

    const objectCounts = {
      tables: built.master.filter((entry) => entry.type === "table").length,
      indexes: built.master.filter((entry) => entry.type === "index").length,
      triggers: built.master.filter((entry) => entry.type === "trigger").length,
      views: built.master.filter((entry) => entry.type === "view").length,
    };
    assertJsonEqual(objectCounts, manifest.object_counts, "object_counts");

    for (const [name, expected] of Object.entries(
      manifest.critical_relations,
    )) {
      const detail = built.relationDetails[name];
      if (!detail) throw new Error("critical_relation_missing");
      assertEqual(
        built.criticalRelationSha256[name],
        expected.sha256,
        "critical_relation_sha256",
      );
      assertEqual(detail.columns.length, expected.columns, "critical_columns");
      assertEqual(
        detail.foreign_keys.length,
        expected.foreign_keys,
        "critical_foreign_keys",
      );
      assertEqual(detail.indexes.length, expected.indexes, "critical_indexes");
      assertEqual(
        detail.triggers.length,
        expected.triggers,
        "critical_triggers",
      );
    }

    process.stdout.write(
      `${JSON.stringify({
        status: "ok",
        manifest_sha256: sha256Bytes(readFileSync(manifestPath)),
        canonicalizer_sha256: scriptSha256,
        canonical_descriptor_sha256: built.descriptorSha256,
        migration_ledger_sha256: built.migrationLedgerSha256,
        object_counts: objectCounts,
        migration_count: built.migrations.length,
        verified_input_count:
          manifest.migrations.length +
          manifest.verification_inputs.installed_package_trees.length +
          manifest.verification_inputs.resolved_dependency_package_trees
            .length +
          manifest.verification_inputs.executed_artifacts.length +
          7,
        verified_git_blob_count: sourceCommitBindings.length,
        verified_runtime_capability_count: 6,
        critical_relation_count: Object.keys(
          manifest.critical_relations,
        ).length,
      })}\n`,
    );
  } finally {
    db.close();
  }
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({
      status: "error",
      code:
        error instanceof Error
          ? error.message
          : "unknown_manifest_verification_error",
    })}\n`,
  );
  process.exitCode = 1;
});
