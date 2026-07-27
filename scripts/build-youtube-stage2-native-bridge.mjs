#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const BRIDGE_ROOT = join(REPO_ROOT, "native", "brain-s28-bridge");
const SOURCE_MANIFEST_PATH = join(BRIDGE_ROOT, "bridge-source-manifest.json");
const TEMP_BUILD_PREFIX =
  `brain-s28-disposable-native-bridge-${process.pid}-`;
const require = createRequire(import.meta.url);
const FORBIDDEN_BUILD_ENVIRONMENT_KEYS = [
  "AR",
  "AS",
  "BRAIN_S28_NODE_INCLUDE_DIR",
  "CCC_OVERRIDE_OPTIONS",
  "CC",
  "CFLAGS",
  "CLANG_CONFIG_FILE",
  "COMPILER_PATH",
  "CPATH",
  "CPPFLAGS",
  "CPLUS_INCLUDE_PATH",
  "CXX",
  "CXXFLAGS",
  "DEVELOPER_DIR",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "GCC_EXEC_PREFIX",
  "LD",
  "LD_PRELOAD",
  "LDFLAGS",
  "LIBRARY_PATH",
  "MACOSX_DEPLOYMENT_TARGET",
  "NM",
  "NODE_OPTIONS",
  "NODE_PATH",
  "OBJC",
  "RANLIB",
  "RC_ARCHS",
  "SDKROOT",
  "SOURCE_DATE_EPOCH",
  "STRIP",
  "TOOLCHAINS",
  "ZERO_AR_DATE",
];

function sha256File(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function fail(message) {
  throw new Error(`Disposable native bridge build refused: ${message}`);
}

function assertRegularFile(path, label) {
  if (!existsSync(path)) fail(`${label} is missing at ${path}`);
  const stat = lstatSync(path);
  if (!stat.isFile() && !stat.isSymbolicLink()) {
    fail(`${label} is not a file at ${path}`);
  }
}

function cleanupFailedBuildDirectory(path) {
  if (!existsSync(path)) return;
  const stat = lstatSync(path);
  const verifiedPath = realpathSync(path);
  const verifiedTempRoot = realpathSync(tmpdir());
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    dirname(verifiedPath) !== verifiedTempRoot ||
    !basename(verifiedPath).startsWith(TEMP_BUILD_PREFIX)
  ) {
    fail("failed-build cleanup target escaped the disposable temp boundary");
  }
  rmSync(path, { recursive: true, force: true });
}

function replaceExactly(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  if (first < 0) fail(`upstream transform sentinel is absent: ${label}`);
  if (source.indexOf(needle, first + needle.length) >= 0) {
    fail(`upstream transform sentinel is ambiguous: ${label}`);
  }
  return source.slice(0, first) + replacement +
    source.slice(first + needle.length);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    encoding: "utf8",
    env: {
      LANG: "C",
      LC_ALL: "C",
      PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
      TMPDIR: realpathSync(tmpdir()),
    },
  });
  if (result.error) {
    fail(`${command} could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n")
      .trim();
    fail(
      `${command} exited ${result.status}` +
        (output ? `\n${output}` : ""),
    );
  }
  return result.stdout.trim();
}

function rejectAmbientBuildOverrides() {
  const present = FORBIDDEN_BUILD_ENVIRONMENT_KEYS.filter(
    (key) => Object.hasOwn(process.env, key),
  );
  if (present.length !== 0) {
    fail(`ambient build override is forbidden: ${present.join(",")}`);
  }
}

function resolvePinnedNodeIncludeDirectory(sourceManifest) {
  const directory = sourceManifest.nodeHeaders?.directory;
  if (typeof directory !== "string") {
    fail("source manifest does not pin the Node header directory");
  }
  const verified = realpathSync(directory);
  if (
    verified !== directory ||
    sha256File(join(verified, "node.h")) !==
      sourceManifest.nodeHeaders.nodeHeaderSha256 ||
    sha256File(join(verified, "node_version.h")) !==
      sourceManifest.nodeHeaders.nodeVersionHeaderSha256 ||
    !existsSync(join(verified, "v8.h"))
  ) {
    fail("pinned Node headers are absent or have drifted");
  }
  return verified;
}

function verifyPinnedInputs(sourceManifest, upstreamRoot) {
  if (sourceManifest.format !==
      "brain-s28-disposable-native-bridge-source-v4") {
    fail("unknown source manifest format");
  }
  if (sourceManifest.readinessClaim !== "none" ||
      sourceManifest.disposableOnly !== true) {
    fail("source manifest must make no readiness claim and be disposable-only");
  }
  if (sourceManifest.betterSqlite3Version !== "11.10.0") {
    fail("source manifest does not pin better-sqlite3 11.10.0");
  }
  if (
    sourceManifest.nodeMajor !== 22 ||
    sourceManifest.nodeVersion !== "22.22.3" ||
    sourceManifest.nodeAbi !== "127" ||
    sourceManifest.nodeExecutable !==
      "/opt/homebrew/Cellar/node@22/22.22.3/bin/node" ||
    sourceManifest.toolchain?.c !== "/usr/bin/clang" ||
    sourceManifest.toolchain?.cxx !== "/usr/bin/clang++" ||
    sourceManifest.toolchain?.version !==
      "Apple clang version 21.0.0 (clang-2100.1.1.101)"
  ) {
    fail("source manifest does not pin the executed Node and compiler slice");
  }

  const packageJson = JSON.parse(
    readFileSync(join(upstreamRoot, "package.json"), "utf8"),
  );
  if (packageJson.version !== sourceManifest.betterSqlite3Version) {
    fail(
      `resolved better-sqlite3 is ${packageJson.version}; expected ` +
        sourceManifest.betterSqlite3Version,
    );
  }

  for (const [relativePath, expectedHash] of Object.entries(
    sourceManifest.upstreamFiles,
  )) {
    const absolutePath = join(upstreamRoot, relativePath);
    assertRegularFile(absolutePath, `pinned upstream input ${relativePath}`);
    const actualHash = sha256File(absolutePath);
    if (actualHash !== expectedHash) {
      fail(
        `upstream source drift for ${relativePath}: expected ` +
          `${expectedHash}, received ${actualHash}`,
      );
    }
  }

  for (const [relativePath, expectedHash] of Object.entries(
    sourceManifest.repositoryFiles,
  )) {
    const absolutePath = join(REPO_ROOT, relativePath);
    assertRegularFile(absolutePath, `pinned repository input ${relativePath}`);
    const actualHash = sha256File(absolutePath);
    if (actualHash !== expectedHash) {
      fail(
        `repository source drift for ${relativePath}: expected ` +
          `${expectedHash}, received ${actualHash}`,
      );
    }
  }
}

function transformBetterSqlite3Source(source) {
  let transformed = replaceExactly(
    source,
    '#include "better_sqlite3.hpp"\n',
    '#include "better_sqlite3.hpp"\n' +
      '#include "brain_s28_bridge.hpp"\n' +
      '#include <cstdlib>\n' +
      '#include <cstring>\n',
    "bridge header include",
  );
  transformed = replaceExactly(
    transformed,
    '\t\tdata,\n' +
      '\t\tv8::AccessControl::DEFAULT,\n' +
      '\t\tv8::PropertyAttribute::None\n' +
      '\t);\n' +
      '\t#else\n' +
      '\trecv->InstanceTemplate()->SetNativeDataProperty(\n' +
      '\t\tInternalizedFromLatin1(isolate, name),\n' +
      '\t\tfunc,\n' +
      '\t\t0,\n' +
      '\t\tdata\n' +
      '\t);\n',
    '\t\tdata,\n' +
      '\t\tv8::AccessControl::DEFAULT,\n' +
      '\t\tstatic_cast<v8::PropertyAttribute>(v8::ReadOnly | v8::DontDelete)\n' +
      '\t);\n' +
      '\t#else\n' +
      '\trecv->InstanceTemplate()->SetNativeDataProperty(\n' +
      '\t\tInternalizedFromLatin1(isolate, name),\n' +
      '\t\tfunc,\n' +
      '\t\t0,\n' +
      '\t\tdata,\n' +
      '\t\tstatic_cast<v8::PropertyAttribute>(v8::ReadOnly | v8::DontDelete)\n' +
      '\t);\n',
    "immutable native getter attributes",
  );
  transformed = replaceExactly(
    transformed,
    '\t// Create and export native-backed classes and functions.\n' +
      '\texports->Set(context, InternalizedFromLatin1(isolate, "Database"), Database::Init(isolate, data)).FromJust();\n' +
      '\texports->Set(context, InternalizedFromLatin1(isolate, "Statement"), Statement::Init(isolate, data)).FromJust();\n' +
      '\texports->Set(context, InternalizedFromLatin1(isolate, "StatementIterator"), StatementIterator::Init(isolate, data)).FromJust();\n' +
      '\texports->Set(context, InternalizedFromLatin1(isolate, "Backup"), Backup::Init(isolate, data)).FromJust();\n' +
      '\texports->Set(context, InternalizedFromLatin1(isolate, "setErrorConstructor"), v8::FunctionTemplate::New(isolate, Addon::JS_setErrorConstructor, data)->GetFunction(context).ToLocalChecked()).FromJust();\n\n' +
      '\t// Store addon instance data.\n' +
      '\taddon->Statement.Reset(isolate, exports->Get(context, InternalizedFromLatin1(isolate, "Statement")).ToLocalChecked().As<v8::Function>());\n' +
      '\taddon->StatementIterator.Reset(isolate, exports->Get(context, InternalizedFromLatin1(isolate, "StatementIterator")).ToLocalChecked().As<v8::Function>());\n' +
      '\taddon->Backup.Reset(isolate, exports->Get(context, InternalizedFromLatin1(isolate, "Backup")).ToLocalChecked().As<v8::Function>());\n',
    '\t// Export only the closed disposable constructor and error setup.\n' +
      '\tv8::Local<v8::Function> database_constructor = Database::Init(isolate, data);\n' +
      '\tv8::Local<v8::Function> statement_constructor = Statement::Init(isolate, data);\n' +
      '\tv8::Local<v8::Function> iterator_constructor = StatementIterator::Init(isolate, data);\n' +
      '\tv8::Local<v8::Function> backup_constructor = Backup::Init(isolate, data);\n' +
      '\texports->Set(context, InternalizedFromLatin1(isolate, "Database"), database_constructor).FromJust();\n' +
      '\texports->Set(context, InternalizedFromLatin1(isolate, "setErrorConstructor"), v8::FunctionTemplate::New(isolate, Addon::JS_setErrorConstructor, data)->GetFunction(context).ToLocalChecked()).FromJust();\n\n' +
      '\t// Keep helper constructors private for internal cleanup only.\n' +
      '\taddon->Statement.Reset(isolate, statement_constructor);\n' +
      '\taddon->StatementIterator.Reset(isolate, iterator_constructor);\n' +
      '\taddon->Backup.Reset(isolate, backup_constructor);\n',
    "closed addon export surface",
  );
  transformed = replaceExactly(
    transformed,
    '                SetPrototypeMethod(isolate, data, t, "prepare", JS_prepare);\n' +
      '                SetPrototypeMethod(isolate, data, t, "exec", JS_exec);\n' +
      '                SetPrototypeMethod(isolate, data, t, "backup", JS_backup);\n' +
      '                SetPrototypeMethod(isolate, data, t, "serialize", JS_serialize);\n' +
      '                SetPrototypeMethod(isolate, data, t, "function", JS_function);\n' +
      '                SetPrototypeMethod(isolate, data, t, "aggregate", JS_aggregate);\n' +
      '                SetPrototypeMethod(isolate, data, t, "table", JS_table);\n' +
      '                SetPrototypeMethod(isolate, data, t, "loadExtension", JS_loadExtension);\n' +
      '                SetPrototypeMethod(isolate, data, t, "close", JS_close);\n' +
      '                SetPrototypeMethod(isolate, data, t, "defaultSafeIntegers", JS_defaultSafeIntegers);\n' +
      '                SetPrototypeMethod(isolate, data, t, "unsafeMode", JS_unsafeMode);\n' +
      '                SetPrototypeGetter(isolate, data, t, "open", JS_open);\n' +
      '                SetPrototypeGetter(isolate, data, t, "inTransaction", JS_inTransaction);\n',
    '                SetPrototypeMethod(isolate, data, t, "close", JS_close);\n' +
      '                SetPrototypeMethod(isolate, data, t, "_stage2DisposableBridgeProbe", S28DisposableBridgeProbe);\n' +
      '                SetPrototypeGetter(isolate, data, t, "open", JS_open);\n',
    "close-plus-probe-only native database surface",
  );
  transformed = replaceExactly(
    transformed,
    'v8 :: Local < v8 :: Value > buffer = info [ 7 ] ;\n\n' +
      '                Addon * addon',
      'v8 :: Local < v8 :: Value > buffer = info [ 7 ] ;\n\n' +
      '                v8::String::Utf8Value s28_disposable_filename(info.GetIsolate(), filename);\n' +
      '                v8::String::Utf8Value s28_disposable_filename_given(info.GetIsolate(), filenameGiven);\n' +
      '                const char s28_disposable_memory_name[] = ":memory:";\n' +
      '                const bool s28_exact_filename = *s28_disposable_filename != NULL && s28_disposable_filename.length() == 8 && memcmp(*s28_disposable_filename, s28_disposable_memory_name, 8) == 0;\n' +
      '                const bool s28_exact_filename_given = *s28_disposable_filename_given != NULL && s28_disposable_filename_given.length() == 8 && memcmp(*s28_disposable_filename_given, s28_disposable_memory_name, 8) == 0;\n' +
      '                if (info.Length() != 8 || !s28_exact_filename || !s28_exact_filename_given || !in_memory || readonly || must_exist || timeout != 5000 || !logger->IsNull() || !buffer->IsNull()) return ThrowTypeError("The disposable S28 native bridge requires the exact eight-argument callback-free non-buffer :memory: constructor");\n\n' +
      '                Addon * addon',
    "pre-open disposable-only guard",
  );
  transformed = replaceExactly(
    transformed,
    '                int status = sqlite3_db_config(db_handle, SQLITE_DBCONFIG_ENABLE_LOAD_EXTENSION, 1, NULL);\n',
    '                int status = sqlite3_db_config(db_handle, SQLITE_DBCONFIG_ENABLE_LOAD_EXTENSION, 0, NULL);\n',
    "disable loadable extensions at the connection",
  );
  transformed = replaceExactly(
    transformed,
    '                assert(sqlite3_db_mutex(db_handle) == NULL);\n',
    '                const char* s28_opened_filename = sqlite3_db_filename(db_handle, "main");\n' +
      '                if (s28_opened_filename == NULL || s28_opened_filename[0] != \'\\0\' || sqlite3_get_autocommit(db_handle) != 1 || sqlite3_txn_state(db_handle, "main") != SQLITE_TXN_NONE || sqlite3_db_readonly(db_handle, "main") != 0) {\n' +
      '                        const int s28_close_status = sqlite3_close(db_handle);\n' +
      '                        if (s28_close_status != SQLITE_OK) abort();\n' +
      '                        return ThrowTypeError("The disposable S28 native bridge opened a noncanonical database state");\n' +
      '                }\n\n' +
      '                assert(sqlite3_db_mutex(db_handle) == NULL);\n',
    "post-open memory database attestation",
  );
  transformed = replaceExactly(
    transformed,
    '                        stmts.clear();\n' +
      '                        backups.clear();\n' +
      '                        int status = sqlite3_close(db_handle);\n' +
      '                        assert(status == SQLITE_OK); ((void)status);\n',
    '                        stmts.clear();\n' +
      '                        backups.clear();\n' +
      '                        int status = sqlite3_close(db_handle);\n' +
      '                        if (status != SQLITE_OK) abort();\n',
    "fatal close-status enforcement",
  );
  transformed = replaceExactly(
    transformed,
    '                status = sqlite3_db_config(db_handle, SQLITE_DBCONFIG_DEFENSIVE, 1, NULL);\n' +
      '                assert(status == SQLITE_OK);\n',
    '                status = sqlite3_db_config(db_handle, SQLITE_DBCONFIG_DEFENSIVE, 1, NULL);\n' +
      '                assert(status == SQLITE_OK);\n' +
      '                status = S28InstallDisposableBridge(db_handle);\n' +
      '                if (status != SQLITE_OK) {\n' +
      '                        ThrowSqliteError(addon, db_handle);\n' +
      '                        int close_status = sqlite3_close(db_handle);\n' +
      '                        assert(close_status == SQLITE_OK); ((void)close_status);\n' +
      '                        return;\n' +
      '                }\n',
    "constant bridge installation",
  );
  return transformed;
}

const sourceManifestText = readFileSync(SOURCE_MANIFEST_PATH, "utf8");
const sourceManifest = JSON.parse(sourceManifestText);
rejectAmbientBuildOverrides();
const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
if (
  nodeMajor !== 22 ||
  process.versions.node !== sourceManifest.nodeVersion ||
  process.versions.modules !== sourceManifest.nodeAbi ||
  realpathSync(process.execPath) !== sourceManifest.nodeExecutable
) {
  fail("running Node executable/version/ABI differs from the pinned slice");
}
if (process.platform !== "darwin" || process.arch !== "arm64") {
  fail(`unsupported host ${process.platform}-${process.arch}`);
}
if (!sourceManifest.supportedHosts.includes(
  `${process.platform}-${process.arch}`,
)) {
  fail(`host ${process.platform}-${process.arch} is not in the source manifest`);
}

const betterSqlite3PackagePath =
  require.resolve("better-sqlite3/package.json");
const upstreamRoot = realpathSync(dirname(betterSqlite3PackagePath));
verifyPinnedInputs(sourceManifest, upstreamRoot);

const nodeIncludeDirectory =
  resolvePinnedNodeIncludeDirectory(sourceManifest);
const outputDirectory = mkdtempSync(
  join(tmpdir(), TEMP_BUILD_PREFIX),
);
try {
const generatedSourcePath = join(outputDirectory, "better_sqlite3.cpp");
const sqliteObjectPath = join(outputDirectory, "sqlite3.o");
const wrapperObjectPath = join(outputDirectory, "better_sqlite3.o");
const bridgeObjectPath = join(outputDirectory, "brain_s28_bridge.o");
const bindingPath = join(outputDirectory, "brain_s28_bridge.node");
const buildManifestPath = join(
  outputDirectory,
  "brain_s28_bridge.build-manifest.json",
);

const upstreamCppPath = join(upstreamRoot, "src", "better_sqlite3.cpp");
const transformedSource = transformBetterSqlite3Source(
  readFileSync(upstreamCppPath, "utf8"),
);
writeFileSync(generatedSourcePath, transformedSource);

const sqliteDirectory = join(upstreamRoot, "deps", "sqlite3");
const definesText = readFileSync(
  join(upstreamRoot, "deps", "defines.gypi"),
  "utf8",
);
const sqliteDefines = Array.from(
  definesText.matchAll(/^\s*'([^']+)',?\s*$/gm),
  (match) => `-D${match[1]}`,
);
if (sqliteDefines.length < 20) {
  fail("could not recover the complete pinned SQLite compiler define set");
}

const cCompiler = sourceManifest.toolchain.c;
const cppCompiler = sourceManifest.toolchain.cxx;
const commonCompileFlags = [
  "-O3",
  "-fPIC",
  "-fvisibility=hidden",
  "-DNDEBUG",
  "-DBUILDING_NODE_EXTENSION",
  "-DNODE_GYP_MODULE_NAME=brain_s28_bridge",
];
const cArguments = [
  "-c",
  join(sqliteDirectory, "sqlite3.c"),
  "-o",
  sqliteObjectPath,
  "-std=c99",
  "-w",
  ...commonCompileFlags,
  ...sqliteDefines,
];
const cppBaseArguments = [
  "-c",
  "-std=c++20",
  ...commonCompileFlags,
  "-I",
  nodeIncludeDirectory,
  "-I",
  sqliteDirectory,
  "-I",
  join(upstreamRoot, "src"),
  "-I",
  join(BRIDGE_ROOT, "src"),
  ...(process.platform === "darwin" ? ["-stdlib=libc++"] : ["-pthread"]),
];
const wrapperArguments = [
  ...cppBaseArguments,
  generatedSourcePath,
  "-o",
  wrapperObjectPath,
];
const bridgeArguments = [
  ...cppBaseArguments,
  join(BRIDGE_ROOT, "src", "brain_s28_bridge.cpp"),
  "-o",
  bridgeObjectPath,
];
const linkArguments =
  process.platform === "darwin"
    ? [
        "-bundle",
        "-undefined",
        "dynamic_lookup",
        "-stdlib=libc++",
        wrapperObjectPath,
        bridgeObjectPath,
        sqliteObjectPath,
        "-o",
        bindingPath,
      ]
    : [
        "-shared",
        "-pthread",
        "-Wl,-Bsymbolic",
        "-Wl,--exclude-libs,ALL",
        wrapperObjectPath,
        bridgeObjectPath,
        sqliteObjectPath,
        "-ldl",
        "-o",
        bindingPath,
      ];

run(cCompiler, cArguments);
run(cppCompiler, wrapperArguments);
run(cppCompiler, bridgeArguments);
run(cppCompiler, linkArguments);
assertRegularFile(bindingPath, "compiled native binding");

const compilerVersion = run(cppCompiler, ["--version"]).split("\n")[0];
const cCompilerPath = realpathSync(cCompiler);
const cppCompilerPath = realpathSync(cppCompiler);
if (
  cCompilerPath !== sourceManifest.toolchain.c ||
  cppCompilerPath !== sourceManifest.toolchain.cxx ||
  compilerVersion !== sourceManifest.toolchain.version
) {
  fail("compiler path or version differs from the pinned slice");
}
const bindingSha256 = sha256File(bindingPath);
const sourceManifestSha256 = sha256Text(sourceManifestText);
const buildManifest = {
  format: "brain-s28-disposable-native-bridge-build-v2",
  readinessClaim: "none",
  disposableOnly: true,
  bridgeFunction: "brain_s28_bridge_present",
  closedNativeProbeMethod: "_stage2DisposableBridgeProbe",
  betterSqlite3Version: sourceManifest.betterSqlite3Version,
  sqliteVersion: sourceManifest.sqliteVersion,
  sqliteSourceId: sourceManifest.sqliteSourceId,
  nodeVersion: process.versions.node,
  nodeAbi: process.versions.modules,
  platform: process.platform,
  arch: process.arch,
  compiler: {
    c: cCompilerPath,
    cxx: cppCompilerPath,
    version: compilerVersion,
  },
  nodeHeaders: {
    directory: nodeIncludeDirectory,
    nodeHeaderSha256: sha256File(join(nodeIncludeDirectory, "node.h")),
    nodeVersionHeaderSha256: sha256File(
      join(nodeIncludeDirectory, "node_version.h"),
    ),
  },
  packageLockSha256: sourceManifest.repositoryFiles["package-lock.json"],
  commands: {
    sqliteCompile: {
      command: cCompilerPath,
      arguments: cArguments,
    },
    wrapperCompile: {
      command: cppCompilerPath,
      arguments: wrapperArguments,
    },
    bridgeCompile: {
      command: cppCompilerPath,
      arguments: bridgeArguments,
    },
    link: {
      command: cppCompilerPath,
      arguments: linkArguments,
    },
  },
  sourceManifestSha256,
  transformedBetterSqlite3Sha256: sha256Text(transformedSource),
  moduleFile: "brain_s28_bridge.node",
  moduleSha256: bindingSha256,
};
writeFileSync(
  buildManifestPath,
  `${JSON.stringify(buildManifest, null, 2)}\n`,
);

process.stdout.write(
  `${JSON.stringify({
    format: "brain-s28-disposable-native-bridge-build-result-v2",
    readinessClaim: "none",
    disposableOnly: true,
    outputDirectory,
    bindingPath,
    buildManifestPath,
    moduleSha256: bindingSha256,
    sourceManifestSha256,
  })}\n`,
);
} catch (error) {
  cleanupFailedBuildDirectory(outputDirectory);
  throw error;
}
