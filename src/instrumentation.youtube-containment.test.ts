import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { register } from "./instrumentation";

const INSTRUMENTATION_SOURCE = readFileSync(
  new URL("./instrumentation.ts", import.meta.url),
  "utf8",
);

test("non-node runtimes emit only the fixed containment skip diagnostic", async () => {
  const originalRuntime = process.env.NEXT_RUNTIME;
  const originalLog = console.log;
  const calls: unknown[][] = [];

  process.env.NEXT_RUNTIME = "edge-runtime-secret-sentinel";
  console.log = (...arguments_: unknown[]) => {
    calls.push(arguments_);
  };

  try {
    await register();
  } finally {
    console.log = originalLog;
    if (originalRuntime === undefined) {
      Reflect.deleteProperty(process.env, "NEXT_RUNTIME");
    } else {
      process.env.NEXT_RUNTIME = originalRuntime;
    }
  }

  assert.deepEqual(calls, [
    ["[boot] instrumentation skipped code=runtime_not_nodejs"],
  ]);
  assert.equal(JSON.stringify(calls).includes("secret-sentinel"), false);
});

test("startup resolves every containment authority before starting content workers", () => {
  const orderedStatements = [
    "const deployment = classifyDeployment();",
    "const configuredOrigin = parseConfiguredPublicOrigin();",
    "const db = getDb();",
    "const schemaCapability = getYouTubeBrowserSchemaCapability(db);",
    "const contentWorkerPlan = resolveContentWorkerPlan({",
    "await startContentWorkers(contentWorkerPlan);",
  ];

  let priorIndex = -1;
  for (const statement of orderedStatements) {
    const nextIndex = INSTRUMENTATION_SOURCE.indexOf(statement);
    assert.notEqual(nextIndex, -1, `missing startup statement: ${statement}`);
    assert.ok(
      nextIndex > priorIndex,
      `startup statement is out of containment order: ${statement}`,
    );
    priorIndex = nextIndex;
  }
});

test("instrumentation never statically imports a content claimant", () => {
  const contentClaimants = [
    "@/lib/queue/enrichment-worker",
    "@/lib/queue/transcript-worker",
    "@/lib/queue/note-index-worker",
    "@/lib/queue/enrichment-batch-cron",
  ];

  for (const claimant of contentClaimants) {
    assert.equal(
      INSTRUMENTATION_SOURCE.includes(claimant),
      false,
      `instrumentation must not import content claimant ${claimant}`,
    );
  }
});
