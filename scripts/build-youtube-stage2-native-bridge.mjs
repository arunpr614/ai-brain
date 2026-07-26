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
const TEMP_BUILD_PREFIX = "brain-s28-disposable-native-bridge-";
const require = createRequire(import.meta.url);

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
    env: process.env,
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

function resolveNodeIncludeDirectory() {
  const configuredPrefix =
    typeof process.config.variables.node_prefix === "string"
      ? process.config.variables.node_prefix
      : "";
  const candidates = [
    process.env.BRAIN_S28_NODE_INCLUDE_DIR,
    configuredPrefix ? join(configuredPrefix, "include", "node") : "",
    resolve(dirname(process.execPath), "..", "include", "node"),
    "/usr/include/node",
    "/usr/local/include/node",
    "/opt/homebrew/include/node",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(join(candidate, "node.h")) &&
        existsSync(join(candidate, "v8.h"))) {
      return realpathSync(candidate);
    }
  }
  fail(
    "Node headers matching the running Node executable were not found; " +
      "set BRAIN_S28_NODE_INCLUDE_DIR explicitly",
  );
}

function verifyPinnedInputs(sourceManifest, upstreamRoot) {
  if (sourceManifest.format !==
      "brain-s28-disposable-native-bridge-source-v1") {
    fail("unknown source manifest format");
  }
  if (sourceManifest.readinessClaim !== "none" ||
      sourceManifest.disposableOnly !== true) {
    fail("source manifest must make no readiness claim and be disposable-only");
  }
  if (sourceManifest.betterSqlite3Version !== "11.10.0") {
    fail("source manifest does not pin better-sqlite3 11.10.0");
  }
  if (sourceManifest.nodeMajor !== 22) {
    fail("source manifest does not pin Node major 22");
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
      '#include "brain_s28_bridge.hpp"\n',
    "bridge header include",
  );
  transformed = replaceExactly(
    transformed,
    '                SetPrototypeMethod(isolate, data, t, "unsafeMode", JS_unsafeMode);\n',
    '                SetPrototypeMethod(isolate, data, t, "unsafeMode", JS_unsafeMode);\n' +
      '                SetPrototypeMethod(isolate, data, t, "_stage2DisposableBridgeProbe", S28DisposableBridgeProbe);\n',
    "closed native probe registration",
  );
  transformed = replaceExactly(
    transformed,
    '                SetPrototypeMethod(isolate, data, t, "backup", JS_backup);\n',
    "",
    "disable native backup entrypoint",
  );
  transformed = replaceExactly(
    transformed,
    '                SetPrototypeMethod(isolate, data, t, "loadExtension", JS_loadExtension);\n',
    "",
    "disable native extension-loading entrypoint",
  );
  transformed = replaceExactly(
    transformed,
    'v8 :: Local < v8 :: Value > buffer = info [ 7 ] ;\n\n' +
      '                Addon * addon',
    'v8 :: Local < v8 :: Value > buffer = info [ 7 ] ;\n\n' +
      '                v8::String::Utf8Value s28_disposable_filename(info.GetIsolate(), filename);\n' +
      '                if (!in_memory || (strcmp(*s28_disposable_filename, ":memory:") != 0 && strcmp(*s28_disposable_filename, "") != 0)) return ThrowTypeError("The disposable S28 native bridge refuses file-backed databases");\n\n' +
      '                Addon * addon',
    "pre-open disposable-only guard",
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
const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
if (nodeMajor !== 22) {
  fail(`Node ${process.versions.node} is outside the pinned Node 22 toolchain`);
}
if (!["darwin", "linux"].includes(process.platform) ||
    !["arm64", "x64"].includes(process.arch)) {
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

const nodeIncludeDirectory = resolveNodeIncludeDirectory();
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

const cCompiler =
  process.env.CC || (process.platform === "darwin" ? "clang" : "cc");
const cppCompiler =
  process.env.CXX || (process.platform === "darwin" ? "clang++" : "c++");
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
const cCompilerPath = realpathSync(run("which", [cCompiler]));
const cppCompilerPath = realpathSync(run("which", [cppCompiler]));
const bindingSha256 = sha256File(bindingPath);
const sourceManifestSha256 = sha256Text(sourceManifestText);
const buildManifest = {
  format: "brain-s28-disposable-native-bridge-build-v1",
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
    format: "brain-s28-disposable-native-bridge-build-result-v1",
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
