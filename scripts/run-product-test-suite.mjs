#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  lstatSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = realpathSync(resolve(dirname(SCRIPT_PATH), ".."));
const SOURCE_ROOT = join(REPO_ROOT, "src");
const STAGE2_NATIVE_TESTS = Object.freeze([
  "src/db/stage2/native-bridge-proof.test.ts",
  "src/db/stage2/file-factory-proof.test.ts",
]);
const COVERAGE_ARGUMENTS = Object.freeze([
  "--experimental-test-coverage",
  "--test-coverage-include=src/lib/llm/**/*.ts",
  "--test-coverage-include=src/lib/embed/**/*.ts",
  "--test-coverage-exclude=**/*.test.ts",
]);
const USAGE =
  "Usage: run-product-test-suite.mjs " +
  "<portable|stage2-native-nominal|inventory> [--coverage]\n";

function refuse() {
  process.stderr.write(USAGE);
  process.exitCode = 1;
}

function repositoryPath(path) {
  const normalized = relative(REPO_ROOT, path).split(sep).join("/");
  if (
    normalized.length === 0 ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error("Test discovery escaped the repository root");
  }
  return normalized;
}

function discoverTests(directory) {
  const tests = [];
  const entries = readdirSync(directory, {
    withFileTypes: true,
  }).sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error("Test discovery refuses symbolic links");
    }
    if (entry.isDirectory()) {
      tests.push(...discoverTests(path));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      const stat = lstatSync(path);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new Error("Test discovery requires regular files");
      }
      tests.push(repositoryPath(path));
    }
  }
  return tests;
}

function inventory() {
  const all = discoverTests(SOURCE_ROOT);
  const allSet = new Set(all);
  for (const path of STAGE2_NATIVE_TESTS) {
    if (!allSet.has(path)) {
      throw new Error(`Required Stage 2 native test is missing: ${path}`);
    }
  }
  const nativeSet = new Set(STAGE2_NATIVE_TESTS);
  const portable = all.filter((path) => !nativeSet.has(path));
  if (
    portable.length + STAGE2_NATIVE_TESTS.length !== all.length ||
    new Set(portable).size !== portable.length
  ) {
    throw new Error("Product test partition is not exact");
  }
  return {
    portable,
    stage2NativeNominal: [...STAGE2_NATIVE_TESTS],
  };
}

function run(paths, coverage) {
  const argumentsList = [
    "--import",
    "tsx",
    "--test",
    ...(coverage ? COVERAGE_ARGUMENTS : []),
    ...paths,
  ];
  const result = spawnSync(process.execPath, argumentsList, {
    cwd: REPO_ROOT,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error !== undefined || result.signal !== null) {
    process.exitCode = 1;
    return;
  }
  process.exitCode = result.status ?? 1;
}

const [suite, option, ...extra] = process.argv.slice(2);
const coverage = option === "--coverage";
if (
  extra.length !== 0 ||
  (option !== undefined && !coverage) ||
  ![
    "portable",
    "stage2-native-nominal",
    "inventory",
  ].includes(suite) ||
  (suite !== "portable" && coverage)
) {
  refuse();
} else {
  try {
    const suites = inventory();
    if (suite === "inventory") {
      process.stdout.write(`${JSON.stringify(suites)}\n`);
    } else if (suite === "portable") {
      run(suites.portable, coverage);
    } else {
      run(suites.stage2NativeNominal, false);
    }
  } catch {
    process.stderr.write("Product test suite discovery refused\n");
    process.exitCode = 1;
  }
}
