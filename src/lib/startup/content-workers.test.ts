import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { SchemaCapabilityState } from "@/db/schema-capabilities";
import type { DeploymentClassification } from "@/lib/runtime/deployment";
import {
  resolveContentWorkerPlan,
  startContentWorkers,
  type ContentWorkerLoaders,
} from "./content-workers";

const ABSENT: SchemaCapabilityState = { kind: "absent" };
const READY: SchemaCapabilityState = { kind: "ready" };
const INCOMPATIBLE: SchemaCapabilityState = {
  kind: "incompatible",
  code: "schema_contract_not_frozen",
};

function deployment(
  configurationState: DeploymentClassification["configurationState"],
  effectiveDeployment: DeploymentClassification["effectiveDeployment"],
) {
  return { configurationState, effectiveDeployment };
}

function plan(input: {
  mode?: string;
  schema?: SchemaCapabilityState;
  configurationState?: DeploymentClassification["configurationState"];
  effectiveDeployment?: DeploymentClassification["effectiveDeployment"];
  environment?: Record<string, string | undefined>;
}) {
  return resolveContentWorkerPlan({
    deployment: deployment(
      input.configurationState ?? "valid",
      input.effectiveDeployment ?? "production",
    ),
    schemaCapability: input.schema ?? ABSENT,
    environment: {
      ...(input.mode === undefined
        ? {}
        : { BRAIN_BACKGROUND_WORKERS_MODE: input.mode }),
      ...input.environment,
    },
  });
}

function assertNoWorkers(result: ReturnType<typeof plan>): void {
  assert.deepEqual(result.starts, {
    scheduledEnrichment: false,
    transcriptRecovery: false,
    noteIndex: false,
    batchSubmit: false,
    batchPoll: false,
  });
}

function assertStandardWorkers(result: ReturnType<typeof plan>): void {
  assert.deepEqual(result.starts, {
    scheduledEnrichment: true,
    transcriptRecovery: true,
    noteIndex: true,
    batchSubmit: true,
    batchPoll: true,
  });
}

describe("resolveContentWorkerPlan", () => {
  test("preserves the ordinary schema-026 worker set through the missing-mode compatibility bridge", () => {
    const result = plan({
      configurationState: "missing",
      effectiveDeployment: "unknown",
    });
    assert.equal(result.effectiveMode, "legacy_default_standard");
    assert.equal(result.code, "legacy_default_standard");
    assertStandardWorkers(result);
  });

  test("an explicit standard mode starts only the existing ordinary worker set", () => {
    const result = plan({ mode: "standard" });
    assert.equal(result.effectiveMode, "standard");
    assert.equal(result.code, "standard");
    assertStandardWorkers(result);
  });

  test("an explicit disabled mode starts no content worker", () => {
    const result = plan({ mode: "disabled" });
    assert.equal(result.code, "explicit_disabled");
    assertNoWorkers(result);
  });

  test("unknown, padded, and case-shifted worker modes fail closed", () => {
    for (const mode of ["enabled", " standard", "STANDARD", "0", "false"]) {
      const result = plan({ mode });
      assert.equal(result.code, "worker_mode_invalid");
      assertNoWorkers(result);
    }
  });

  test("invalid and conflicting authoritative deployment markers stop content workers", () => {
    for (const configurationState of ["invalid", "conflict"] as const) {
      const result = plan({
        mode: "standard",
        configurationState,
        effectiveDeployment: "production",
      });
      assert.equal(
        result.code,
        configurationState === "conflict"
          ? "deployment_conflict"
          : "deployment_invalid",
      );
      assertNoWorkers(result);
    }
  });

  test("missing authoritative markers do not break explicit ordinary schema-026 standard mode", () => {
    const result = plan({
      mode: "standard",
      configurationState: "missing",
      effectiveDeployment: "unknown",
    });
    assert.equal(result.code, "standard");
    assertStandardWorkers(result);
  });

  test("a missing mode plus any requested or malformed restricted flag stops all workers", () => {
    const cases = [
      { BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE: "lab" },
      { BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE: "unexpected" },
      { BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_UI_ENABLED: "1" },
      { BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_WRITE_ENABLED: "true" },
      { BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_EXECUTION_ENABLED: "TRUE" },
    ];
    for (const environment of cases) {
      const result = plan({ environment });
      assert.equal(
        result.code,
        "worker_mode_missing_with_restricted_request",
      );
      assertNoWorkers(result);
    }
  });

  test("exact off values do not turn the compatibility bridge into a restricted request", () => {
    const result = plan({
      environment: {
        BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE: "disabled",
        BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_UI_ENABLED: "0",
        BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_WRITE_ENABLED: "false",
        BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_EXECUTION_ENABLED: "",
      },
    });
    assertStandardWorkers(result);
  });

  test("legacy transcript environment and approvals never influence worker authority", () => {
    const result = plan({
      configurationState: "missing",
      effectiveDeployment: "unknown",
      environment: {
        BRAIN_TRANSCRIPT_ENV: "lab",
        BRAIN_TRANSCRIPT_LEGAL_APPROVAL_ID: "approval",
      },
    });
    assert.equal(result.code, "legacy_default_standard");
    assertStandardWorkers(result);
  });

  test("an incompatible schema starts no claimant in every configured mode", () => {
    for (const mode of [undefined, "standard", "manual-transcript-lab"] as const) {
      const result = plan({ mode, schema: INCOMPATIBLE });
      assert.equal(result.code, "schema_incompatible");
      assertNoWorkers(result);
    }
  });

  test("a ready schema remains stopped until every claimant containment gate is reviewed", () => {
    for (const mode of [undefined, "standard"] as const) {
      const result = plan({ mode, schema: READY });
      assert.equal(result.code, "ready_schema_claimants_not_contained");
      assertNoWorkers(result);
    }
  });

  test("manual-transcript-lab requires an exact valid lab deployment and still starts nothing in Stage 1", () => {
    const denied = plan({
      mode: "manual-transcript-lab",
      effectiveDeployment: "production",
    });
    assert.equal(denied.code, "manual_lab_environment_denied");
    assertNoWorkers(denied);

    const unavailable = plan({
      mode: "manual-transcript-lab",
      effectiveDeployment: "lab",
    });
    assert.equal(unavailable.code, "manual_lab_runner_unavailable");
    assertNoWorkers(unavailable);
  });

  test("plans and nested start maps are immutable", () => {
    const result = plan({ mode: "standard" });
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.starts), true);
  });
});

test("startContentWorkers imports and starts only the four existing standard modules", async () => {
  const calls: string[] = [];
  const loader = (name: string) => async () => {
    calls.push(`load:${name}`);
    return () => calls.push(`start:${name}`);
  };
  const loaders: ContentWorkerLoaders = {
    scheduledEnrichment: loader("enrichment"),
    transcriptRecovery: loader("transcript"),
    noteIndex: loader("note"),
    batchSubmitPoll: loader("batch"),
  };

  const started = await startContentWorkers(plan({ mode: "standard" }), loaders);

  assert.deepEqual(started, [
    "scheduled_enrichment",
    "transcript_recovery",
    "note_index",
    "batch_submit_poll",
  ]);
  assert.deepEqual(calls.slice(0, 4).sort(), [
    "load:batch",
    "load:enrichment",
    "load:note",
    "load:transcript",
  ]);
  assert.deepEqual(calls.slice(4), [
    "start:enrichment",
    "start:transcript",
    "start:note",
    "start:batch",
  ]);
});

test("startContentWorkers does not import a module for a stopped plan", async () => {
  let loads = 0;
  const never = async () => {
    loads += 1;
    return () => undefined;
  };
  const loaders: ContentWorkerLoaders = {
    scheduledEnrichment: never,
    transcriptRecovery: never,
    noteIndex: never,
    batchSubmitPoll: never,
  };

  const started = await startContentWorkers(plan({ mode: "disabled" }), loaders);
  assert.deepEqual(started, []);
  assert.equal(loads, 0);
});
