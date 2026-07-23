import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyDeployment,
  type DeploymentEnvironment,
} from "./deployment";

const DEPLOYMENTS: readonly DeploymentEnvironment[] = [
  "production",
  "lab",
  "development",
  "test",
];

describe("authoritative deployment classification", () => {
  for (const deployment of DEPLOYMENTS) {
    for (const runtime of ["0", "1"] as const) {
      it(`classifies ${deployment}/${runtime} without letting a non-production marker override production`, () => {
        const result = classifyDeployment({
          BRAIN_DEPLOYMENT_ENV: deployment,
          BRAIN_PRODUCTION_RUNTIME: runtime,
        });
        const deploymentSaysProduction = deployment === "production";
        const runtimeSaysProduction = runtime === "1";
        const conflict =
          deploymentSaysProduction !== runtimeSaysProduction;
        const explicitProduction =
          deploymentSaysProduction || runtimeSaysProduction;

        assert.equal(result.explicitProduction, explicitProduction);
        assert.equal(
          result.effectiveDeployment,
          explicitProduction ? "production" : deployment,
        );
        assert.equal(
          result.configurationState,
          conflict ? "conflict" : "valid",
        );
        assert.equal(
          result.restrictedCapability,
          conflict
            ? "denied_conflicting_authority"
            : explicitProduction
              ? "denied_production"
              : "eligible",
        );
      });
    }
  }

  it("treats the explicit lab/production-runtime conflict as effective production and invalid for restricted work", () => {
    const result = classifyDeployment({
      BRAIN_DEPLOYMENT_ENV: "lab",
      BRAIN_PRODUCTION_RUNTIME: "1",
    });

    assert.deepEqual(result, {
      effectiveDeployment: "production",
      deploymentEnvironment: "lab",
      productionRuntime: true,
      deploymentEnvironmentState: "valid",
      productionRuntimeState: "valid",
      configurationState: "conflict",
      explicitProduction: true,
      restrictedCapability: "denied_conflicting_authority",
    });
  });

  it("keeps explicit production effective when the second marker is missing or malformed", () => {
    for (const runtime of [undefined, "", "true", " 1", "2"]) {
      const result = classifyDeployment({
        BRAIN_DEPLOYMENT_ENV: "production",
        BRAIN_PRODUCTION_RUNTIME: runtime,
      });
      assert.equal(result.effectiveDeployment, "production");
      assert.equal(result.explicitProduction, true);
      assert.notEqual(result.restrictedCapability, "eligible");
    }

    for (const deployment of [undefined, "", "prod", " production"]) {
      const result = classifyDeployment({
        BRAIN_DEPLOYMENT_ENV: deployment,
        BRAIN_PRODUCTION_RUNTIME: "1",
      });
      assert.equal(result.effectiveDeployment, "production");
      assert.equal(result.explicitProduction, true);
      assert.notEqual(result.restrictedCapability, "eligible");
    }
  });

  it("denies restricted capability when either authoritative marker is missing", () => {
    const cases = [
      {},
      { BRAIN_DEPLOYMENT_ENV: "lab" },
      { BRAIN_PRODUCTION_RUNTIME: "0" },
      {
        BRAIN_DEPLOYMENT_ENV: "",
        BRAIN_PRODUCTION_RUNTIME: "0",
      },
      {
        BRAIN_DEPLOYMENT_ENV: "test",
        BRAIN_PRODUCTION_RUNTIME: "",
      },
    ];

    for (const source of cases) {
      const result = classifyDeployment(source);
      assert.equal(result.configurationState, "missing");
      assert.equal(
        result.restrictedCapability,
        "denied_missing_authority",
      );
    }
  });

  it("strictly rejects malformed, padded, case-shifted, and unknown markers", () => {
    const malformedDeployments = [
      "LAB",
      "prod",
      "staging",
      " lab",
      "lab ",
      "lab\n",
    ];
    for (const deployment of malformedDeployments) {
      const result = classifyDeployment({
        BRAIN_DEPLOYMENT_ENV: deployment,
        BRAIN_PRODUCTION_RUNTIME: "0",
      });
      assert.equal(result.configurationState, "invalid");
      assert.equal(
        result.restrictedCapability,
        "denied_invalid_authority",
      );
    }

    for (const runtime of ["false", "true", "00", "01", " 0", "1 "]) {
      const result = classifyDeployment({
        BRAIN_DEPLOYMENT_ENV: "lab",
        BRAIN_PRODUCTION_RUNTIME: runtime,
      });
      assert.equal(result.configurationState, "invalid");
      assert.equal(
        result.restrictedCapability,
        "denied_invalid_authority",
      );
    }
  });

  it("never lets legacy environment, flags, approvals, or caller values promote a runtime", () => {
    const result = classifyDeployment({
      BRAIN_TRANSCRIPT_ENV: "lab",
      BRAIN_TRANSCRIPT_CAPTURE_ENABLED: "1",
      BRAIN_LEGAL_APPROVAL_ID: "approved",
      NODE_ENV: "development",
      environment: "lab",
    });

    assert.equal(result.effectiveDeployment, "unknown");
    assert.equal(result.configurationState, "missing");
    assert.equal(
      result.restrictedCapability,
      "denied_missing_authority",
    );
  });

  it("uses authoritative lab markers even when NODE_ENV hosts the lab build in production mode", () => {
    const result = classifyDeployment({
      BRAIN_DEPLOYMENT_ENV: "lab",
      BRAIN_PRODUCTION_RUNTIME: "0",
      BRAIN_TRANSCRIPT_ENV: "production",
      NODE_ENV: "production",
    });

    assert.equal(result.effectiveDeployment, "lab");
    assert.equal(result.configurationState, "valid");
    assert.equal(result.restrictedCapability, "eligible");
  });

  it("returns an immutable content-free classification without raw invalid values", () => {
    const secretLikeInvalidValue = "lab-private-origin.example";
    const result = classifyDeployment({
      BRAIN_DEPLOYMENT_ENV: secretLikeInvalidValue,
      BRAIN_PRODUCTION_RUNTIME: "0",
    });

    assert.equal(Object.isFrozen(result), true);
    assert.equal(
      JSON.stringify(result).includes(secretLikeInvalidValue),
      false,
    );
  });
});
