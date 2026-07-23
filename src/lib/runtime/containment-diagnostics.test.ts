import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ContainmentDiagnosticValidationError,
  createContainmentDiagnostic,
  type ContainmentDiagnosticInput,
} from "./containment-diagnostics";

function asInput(value: unknown): ContainmentDiagnosticInput {
  return value as ContainmentDiagnosticInput;
}

function assertRejected(value: unknown): void {
  assert.throws(
    () => createContainmentDiagnostic(asInput(value)),
    (error: unknown) => {
      assert.equal(
        error instanceof ContainmentDiagnosticValidationError,
        true,
      );
      assert.equal(
        (error as ContainmentDiagnosticValidationError).code,
        "invalid_containment_diagnostic",
      );
      assert.equal(
        (error as Error).message,
        "invalid_containment_diagnostic",
      );
      return true;
    },
  );
}

describe("content-free containment diagnostics", () => {
  it("constructs a frozen record from closed operational fields", () => {
    const diagnostic = createContainmentDiagnostic({
      event: "worker_plan_resolved",
      outcome: "disabled",
      deployment: "production",
      configurationState: "valid",
      workerMode: "disabled",
      claimant: "scheduled_enrichment",
      phase: "startup",
      schemaState: "absent",
      aggregateCount: 0,
      guardrailTriggered: true,
      workStarted: false,
      providerContacted: false,
      elapsedBucket: "lt_10ms",
      payloadSizeBucket: "zero",
      contractVersion: "content-worker-mode-v1",
      stopDecision: "stop",
      timestamp: "2026-07-23T03:30:00.000Z",
    });

    assert.deepEqual(diagnostic, {
      event: "worker_plan_resolved",
      outcome: "disabled",
      deployment: "production",
      configurationState: "valid",
      workerMode: "disabled",
      claimant: "scheduled_enrichment",
      phase: "startup",
      schemaState: "absent",
      aggregateCount: 0,
      guardrailTriggered: true,
      workStarted: false,
      providerContacted: false,
      elapsedBucket: "lt_10ms",
      payloadSizeBucket: "zero",
      contractVersion: "content-worker-mode-v1",
      stopDecision: "stop",
      timestamp: "2026-07-23T03:30:00.000Z",
    });
    assert.equal(Object.isFrozen(diagnostic), true);
  });

  it("rejects every representative forbidden key without reading its value", () => {
    const forbiddenKeys = [
      "body",
      "transcript",
      "prompt",
      "response",
      "summary",
      "itemId",
      "videoId",
      "sourceUrl",
      "requestId",
      "jobId",
      "grantId",
      "hash",
      "hostname",
      "origin",
      "email",
      "dataRoot",
      "token",
      "error",
      "stack",
    ];

    for (const forbiddenKey of forbiddenKeys) {
      let getterRead = false;
      const input = {
        event: "claimant_guarded",
        outcome: "denied",
      };
      Object.defineProperty(input, forbiddenKey, {
        enumerable: true,
        get() {
          getterRead = true;
          return "PRIVATE_SENTINEL";
        },
      });

      assertRejected(input);
      assert.equal(getterRead, false, forbiddenKey);
    }
  });

  it("rejects arbitrary strings even when placed in allowlisted fields", () => {
    const sentinel = "PRIVATE_TRANSCRIPT_SENTINEL";
    assertRejected({
      event: sentinel,
      outcome: "denied",
    });
    assertRejected({
      event: "claimant_guarded",
      outcome: sentinel,
    });
    assertRejected({
      event: "claimant_guarded",
      outcome: "denied",
      contractVersion: sentinel,
    });
    assertRejected({
      event: "claimant_guarded",
      outcome: "denied",
      timestamp: sentinel,
    });
  });

  it("rejects arbitrary errors, arrays, symbols, accessors, and non-plain objects with a fixed error", () => {
    assertRejected(new Error("PRIVATE_ERROR_SENTINEL"));
    assertRejected([]);
    assertRejected({
      event: "claimant_guarded",
      outcome: "denied",
      [Symbol("private")]: "PRIVATE_SENTINEL",
    });

    let getterRead = false;
    const accessor = {
      outcome: "denied",
      get event() {
        getterRead = true;
        return "claimant_guarded";
      },
    };
    assertRejected(accessor);
    assert.equal(getterRead, false);

    class CustomDiagnostic {
      event = "claimant_guarded";
      outcome = "denied";
    }
    assertRejected(new CustomDiagnostic());
  });

  it("rejects invalid aggregates, booleans, timestamps, and absent required codes", () => {
    for (const aggregateCount of [-1, 1.5, Number.NaN, Infinity]) {
      assertRejected({
        event: "claimant_guarded",
        outcome: "denied",
        aggregateCount,
      });
    }
    assertRejected({
      event: "claimant_guarded",
      outcome: "denied",
      workStarted: 0,
    });
    assertRejected({
      event: "claimant_guarded",
      outcome: "denied",
      timestamp: "2026-02-31T00:00:00.000Z",
    });
    assertRejected({ outcome: "denied" });
    assertRejected({ event: "claimant_guarded" });
  });

  it("does not serialize omitted fields or a private sentinel", () => {
    const sentinel = "PRIVATE_TRANSCRIPT_SENTINEL";
    const diagnostic = createContainmentDiagnostic({
      event: "restricted_capability_denied",
      outcome: "failed_closed",
      deployment: "unknown",
    });
    const serialized = JSON.stringify(diagnostic);

    assert.equal(serialized.includes(sentinel), false);
    assert.deepEqual(Object.keys(diagnostic), [
      "event",
      "outcome",
      "deployment",
    ]);
  });
});
