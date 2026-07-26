export const DISPOSABLE_BRIDGE_SOURCE_MANIFEST_SHA256 =
  "3ed8eed98d7dcc1ccef315b947b28781a16d6b4dcdc0ad515f80de1b24a366c7";
export const DISPOSABLE_BRIDGE_BUILD_SCRIPT_SHA256 =
  "06db0261d4b18ab65d88cd3c8a7b2390800c196713652c059523a8c0d9c6907c";

export const DISPOSABLE_NATIVE_PROBE_SCENARIOS = [
  "bridge-attestation",
  "authorizer-denial",
  "observer-open",
  "observer-committed",
  "observer-rolled-back",
  "observer-indeterminate",
] as const;

export type DisposableNativeProbeScenario =
  (typeof DISPOSABLE_NATIVE_PROBE_SCENARIOS)[number];

export interface DisposableNativeProbeResult {
  format: "brain-s28-disposable-native-probe-v1";
  scenario: DisposableNativeProbeScenario;
  outcome:
    | "not_applicable"
    | "open"
    | "committed"
    | "rolled_back"
    | "indeterminate";
  bridgePresent: true;
  authorizerDenied: boolean;
  authorizerCalls: number;
  authorizerDenials: number;
  commitHookCalls: number;
  rollbackHookCalls: number;
  autocommit: number;
  transactionState: number;
  commitStepCode: number;
  sqliteVersion: "3.49.2";
  sqliteSourceId:
    "2025-05-07 10:39:52 17144570b0d96ae63cd6f3edca39e27ebd74925252bbaf6723bcb2f6b4861fb1";
  readinessClaim: "none";
}

export interface DisposableNativeBridgeProofEvidence {
  format: "brain-s28-disposable-native-route-proof-v2";
  readinessClaim: "none";
  disposableOnly: true;
  provenance: {
    sourceManifestSha256: string;
    moduleSha256: string;
    independentBuildCount: 2;
    independentModuleHashesEqual: true;
    transformedWrapperHashesEqual: true;
    compilerIdentity: string;
    compilerVersion: string;
  };
  host: {
    platform: string;
    arch: string;
    nodeVersion: string;
    nodeAbi: string;
  };
  bridge: {
    sqlTripwirePresent: true;
    exactCppdbOwnerUsed: true;
    injectedSymbolOwnerIgnored: true;
  };
  scenarios: Record<
    DisposableNativeProbeScenario,
    DisposableNativeProbeResult
  >;
  negativeControls: {
    genericSqlWriteRefused: true;
    attachRefusedWithoutFile: true;
    vacuumIntoRefusedWithoutFile: true;
    backupRefusedWithoutFile: true;
    loadExtensionRefused: true;
    selfConsistentTamperedArtifactRefused: true;
  };
  rawDatabaseReturned: false;
  artifactPathsReturned: false;
  s28ReadinessProven: false;
  implementationGoProven: false;
}
