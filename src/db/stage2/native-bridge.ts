export const DISPOSABLE_BRIDGE_SOURCE_MANIFEST_SHA256 =
  "50db75350d3fba0bb5c2661481c216769d6cebcc87ee7e76c4f30705c5486ee0";
export const DISPOSABLE_BRIDGE_BUILD_SCRIPT_SHA256 =
  "fe999b9e17e449289f5ccc3cdcd367a47934437e096f712d73e0cc32ac16df1b";
export const DISPOSABLE_BRIDGE_PROOF_WORKER_SHA256 =
  "74f5e4dbb9613c52f2668cbc8e803624fa6e9a3a04f4792baab6a191c836b316";

export const DISPOSABLE_NATIVE_PROBE_SCENARIOS = [
  "bridge-attestation",
  "authorizer-denial",
  "prepared-role",
  "prepared-role-bind-root-key-refused",
  "prepared-role-bind-value-refused",
  "prepared-role-bind-key-type-refused",
  "prepared-role-bind-value-type-refused",
  "prepared-role-bind-count-missing-refused",
  "prepared-role-bind-count-extra-refused",
  "prepared-role-sql-refused",
  "prepared-role-trace-refused",
  "prepared-role-step-finalize-refused",
  "prepared-role-auto-reprepare-refused",
  "prepared-role-replay-refused",
  "prepared-role-reset-refused",
  "prepared-role-rebind-refused",
  "observer-arm-refused",
  "observer-statement-arm-refused",
  "observer-open",
  "observer-committed",
  "observer-rolled-back",
  "observer-indeterminate",
  "observer-stale-nonce",
  "observer-double-event",
] as const;

export type DisposableNativeProbeScenario =
  (typeof DISPOSABLE_NATIVE_PROBE_SCENARIOS)[number];

export interface DisposableNativeProbeResult {
  format: "brain-s28-disposable-native-probe-v4";
  scenario: DisposableNativeProbeScenario;
  outcome:
    | "not_applicable"
    | "open"
    | "committed"
    | "rolled_back"
    | "indeterminate";
  quarantineRequired: boolean;
  bridgePresent: true;
  authorizerDenied: boolean;
  authorizerCalls: number;
  authorizerDenials: number;
  roleAuthorizerCalls: number;
  roleAuthorizerDenials: number;
  commitHookCalls: number;
  rollbackHookCalls: number;
  commitPrepareCount: number;
  commitStepCount: number;
  commitFinalizeCount: number;
  postClassificationSqlCount: number;
  autocommit: number;
  transactionState: number;
  commitStepCode: number;
  commitFinalizeCode: number;
  commitAttempted: boolean;
  prepareCount: number;
  bindValidationCount: number;
  bindValidationDenials: number;
  bindCount: number;
  stepCount: number;
  finalizeCount: number;
  roleStepCode: number;
  roleFinalizeCode: number;
  replayAttemptCount: number;
  replayOperationCount: number;
  resetAttemptCount: number;
  resetOperationCount: number;
  rebindAttemptCount: number;
  rebindOperationCount: number;
  outerChanges: number;
  roleAttested: boolean;
  roleRefused: boolean;
  pragmaAttested: boolean;
  pragmaBeforeAttested: boolean;
  pragmaAfterAttempted: boolean;
  pragmaAfterAttested: boolean;
  observerArmed: boolean;
  observerRefused: boolean;
  observerInvalid: boolean;
  hooksPresentAtClassification: boolean;
  nonceMatchedAtClassification: boolean;
  cleanupRollbackAttested: boolean;
  commitRefusalOpenClassifierAttested: boolean;
  unfinalizedCommitClassifierRefused: boolean;
  finalizeErrorClassifierAttested: boolean;
  sqliteVersion: "3.49.2";
  sqliteSourceId:
    "2025-05-07 10:39:52 17144570b0d96ae63cd6f3edca39e27ebd74925252bbaf6723bcb2f6b4861fb1";
  readinessClaim: "none";
}

export interface DisposableNativeBridgeProofEvidence {
  format: "brain-s28-disposable-native-route-proof-v5";
  readinessClaim: "none";
  disposableOnly: true;
  provenance: {
    sourceManifestSha256: string;
    proofWorkerSha256: string;
    moduleSha256: string;
    independentBuildCount: 2;
    independentModuleHashesEqual: true;
    transformedWrapperHashesEqual: true;
    compilerIdentity: "/usr/bin/clang++";
    compilerVersion:
      "Apple clang version 21.0.0 (clang-2100.1.1.101)";
  };
  host: {
    platform: "darwin";
    arch: "arm64";
    nodeVersion: "22.22.3";
    nodeAbi: "127";
  };
  bridge: {
    sqlTripwirePresent: true;
    directNativeOwnerUsed: true;
    closedAddonSurfaceAttested: true;
    immutableNativeSurfaceAttested: true;
    sealedChildProcess: true;
  };
  lifecycle: {
    scenarioConnectionCount: number;
    allScenarioConnectionsClosed: true;
    indeterminateConnectionsQuarantinedByClose: true;
    processExitIsFinalQuarantine: true;
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
    serializeRefused: true;
    functionRegistrationRefused: true;
    unsafeModeRefused: true;
    emptyFilenameRefused: true;
    whitespaceFilenameRefused: true;
    fileBackedConstructorRefused: true;
    uriFilenameRefused: true;
    embeddedNulFilenameRefused: true;
    mismatchedFilenameGivenRefused: true;
    falseInMemoryRefused: true;
    readonlyRefused: true;
    mustExistRefused: true;
    timeoutOverrideRefused: true;
    loggerRefused: true;
    serializedBufferConstructorRefused: true;
    missingArgumentRefused: true;
    extraArgumentRefused: true;
    noConstructorNegativeCreatedAFile: true;
    selfConsistentTamperedArtifactRefused: true;
  };
  rawDatabaseReturned: false;
  artifactPathsReturned: false;
  processIdentifiersReturned: false;
  s28ReadinessProven: false;
  implementationGoProven: false;
}
