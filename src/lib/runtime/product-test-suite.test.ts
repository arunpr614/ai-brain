import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIRECTORY, "..", "..", "..");
const TEST_RUNNER_PATH = resolve(
  REPO_ROOT,
  "scripts",
  "run-product-test-suite.mjs",
);
const STAGE2_NATIVE_TESTS = [
  "src/db/stage2/native-bridge-proof.test.ts",
  "src/db/stage2/file-factory-proof.test.ts",
] as const;

test("product test routing keeps portable and native suites disjoint", () => {
  const result = spawnSync(
    process.execPath,
    [TEST_RUNNER_PATH, "inventory"],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
    },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.stderr, "");

  const inventory = JSON.parse(result.stdout) as {
    portable: string[];
    stage2NativeNominal: string[];
  };
  assert.deepEqual(
    inventory.stage2NativeNominal,
    STAGE2_NATIVE_TESTS,
  );
  assert.equal(
    inventory.portable.includes(
      "src/lib/runtime/product-test-suite.test.ts",
    ),
    true,
  );
  for (const path of STAGE2_NATIVE_TESTS) {
    assert.equal(inventory.portable.includes(path), false);
  }
  assert.equal(
    new Set([
      ...inventory.portable,
      ...inventory.stage2NativeNominal,
    ]).size,
    inventory.portable.length +
      inventory.stage2NativeNominal.length,
  );
});

test("product test routing refuses unknown suites", () => {
  const result = spawnSync(
    process.execPath,
    [TEST_RUNNER_PATH, "unknown"],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
    },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, "");
  assert.equal(
    result.stderr,
    "Usage: run-product-test-suite.mjs " +
      "<portable|stage2-native-nominal|inventory> [--coverage]\n",
  );
});
