/**
 * Authoritative deployment classification for restricted content features.
 *
 * Both markers are required for a valid classification. An explicit
 * production marker always wins, including when the other marker is missing,
 * malformed, or contradictory. Callers must use `restrictedCapability` (not
 * `effectiveDeployment !== "production"`) when deciding whether a restricted
 * capability may proceed.
 */

export const DEPLOYMENT_ENVIRONMENTS = [
  "production",
  "lab",
  "development",
  "test",
] as const;

export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number];
export type EffectiveDeployment = DeploymentEnvironment | "unknown";
export type AuthoritativeMarkerState = "valid" | "missing" | "invalid";
export type DeploymentConfigurationState =
  | "valid"
  | "missing"
  | "invalid"
  | "conflict";
export type RestrictedCapabilityDecision =
  | "eligible"
  | "denied_production"
  | "denied_missing_authority"
  | "denied_invalid_authority"
  | "denied_conflicting_authority";

export interface DeploymentClassification {
  readonly effectiveDeployment: EffectiveDeployment;
  readonly deploymentEnvironment: DeploymentEnvironment | null;
  readonly productionRuntime: boolean | null;
  readonly deploymentEnvironmentState: AuthoritativeMarkerState;
  readonly productionRuntimeState: AuthoritativeMarkerState;
  readonly configurationState: DeploymentConfigurationState;
  readonly explicitProduction: boolean;
  readonly restrictedCapability: RestrictedCapabilityDecision;
}

type DeploymentEnvironmentSource = Readonly<
  Record<string, string | undefined>
>;

const DEPLOYMENT_ENVIRONMENT_SET = new Set<string>(DEPLOYMENT_ENVIRONMENTS);

interface ParsedMarker<T> {
  readonly state: AuthoritativeMarkerState;
  readonly value: T | null;
}

export function classifyDeployment(
  source: DeploymentEnvironmentSource = process.env,
): DeploymentClassification {
  const deployment = parseDeploymentEnvironment(
    source.BRAIN_DEPLOYMENT_ENV,
  );
  const productionRuntime = parseProductionRuntime(
    source.BRAIN_PRODUCTION_RUNTIME,
  );

  const explicitProduction =
    deployment.value === "production" || productionRuntime.value === true;
  const effectiveDeployment: EffectiveDeployment = explicitProduction
    ? "production"
    : (deployment.value ?? "unknown");

  const configurationState = resolveConfigurationState(
    deployment,
    productionRuntime,
  );
  const restrictedCapability = resolveRestrictedCapability(
    configurationState,
    explicitProduction,
  );

  return Object.freeze({
    effectiveDeployment,
    deploymentEnvironment: deployment.value,
    productionRuntime: productionRuntime.value,
    deploymentEnvironmentState: deployment.state,
    productionRuntimeState: productionRuntime.state,
    configurationState,
    explicitProduction,
    restrictedCapability,
  });
}

function parseDeploymentEnvironment(
  raw: string | undefined,
): ParsedMarker<DeploymentEnvironment> {
  if (raw === undefined || raw === "") {
    return { state: "missing", value: null };
  }
  if (!DEPLOYMENT_ENVIRONMENT_SET.has(raw)) {
    return { state: "invalid", value: null };
  }
  return {
    state: "valid",
    value: raw as DeploymentEnvironment,
  };
}

function parseProductionRuntime(
  raw: string | undefined,
): ParsedMarker<boolean> {
  if (raw === undefined || raw === "") {
    return { state: "missing", value: null };
  }
  if (raw === "0") return { state: "valid", value: false };
  if (raw === "1") return { state: "valid", value: true };
  return { state: "invalid", value: null };
}

function resolveConfigurationState(
  deployment: ParsedMarker<DeploymentEnvironment>,
  productionRuntime: ParsedMarker<boolean>,
): DeploymentConfigurationState {
  if (
    deployment.state === "valid" &&
    productionRuntime.state === "valid" &&
    (deployment.value === "production") !== productionRuntime.value
  ) {
    return "conflict";
  }
  if (
    deployment.state === "invalid" ||
    productionRuntime.state === "invalid"
  ) {
    return "invalid";
  }
  if (
    deployment.state === "missing" ||
    productionRuntime.state === "missing"
  ) {
    return "missing";
  }
  return "valid";
}

function resolveRestrictedCapability(
  configurationState: DeploymentConfigurationState,
  explicitProduction: boolean,
): RestrictedCapabilityDecision {
  if (configurationState === "conflict") {
    return "denied_conflicting_authority";
  }
  if (configurationState === "invalid") {
    return "denied_invalid_authority";
  }
  if (configurationState === "missing") {
    return "denied_missing_authority";
  }
  if (explicitProduction) {
    return "denied_production";
  }
  return "eligible";
}
