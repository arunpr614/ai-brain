export const MEMORY_ONLY_NATIVE_ROUTE_PREREQUISITE_HASHES = Object.freeze({
  sourceManifest:
    "50db75350d3fba0bb5c2661481c216769d6cebcc87ee7e76c4f30705c5486ee0",
  bridgeSource:
    "fde48c0ae02591c7b9f51ea8042ef247a70f20d60cc0ebb9a0452baf9ef4ac43",
  bridgeHeader:
    "31f50b68119724917aad4134164d23deed028a878782ebf4dea06cf2fb2550c8",
  buildScript:
    "fe999b9e17e449289f5ccc3cdcd367a47934437e096f712d73e0cc32ac16df1b",
  probeCli:
    "2d5ef8857505d4cb4d2debcb9bebd564dd3f88c8a3e058090cb5b1bd2e8a785a",
  proofWorker:
    "74f5e4dbb9613c52f2668cbc8e803624fa6e9a3a04f4792baab6a191c836b316",
  publicTypes:
    "4f6cd925ee90b9cea61f08c3a29437b36802e8f281a30eefe777bf3a7aa02cdb",
  proofController:
    "da5f68468828af15cf0598fa7508108fe8cc91da30e1b74154a65022850ff120",
  proofTests:
    "78ede99752b948fa247f6b6b60ca6bd78948c730d11eec3fbdb51a7fba40a6bc",
} as const);

export const FILE_FACTORY_TRANSPORT_FIXTURE_SCENARIOS = Object.freeze([
  "valid",
  "timeout",
  "cap-equality",
  "cap-plus-one",
  "signal",
  "truncated-json",
  "trailing-byte",
  "stderr",
  "nonzero",
  "held-pipe",
] as const);

export type FileFactoryTransportFixtureScenario =
  (typeof FILE_FACTORY_TRANSPORT_FIXTURE_SCENARIOS)[number];

export const FILE_FACTORY_MAX_WORKER_OUTPUT_BYTES = 2 * 1024 * 1024;
export const FILE_FACTORY_PROOF_TEMP_PREFIX =
  "brain-s28-file-factory-proof-";

export const FILE_FACTORY_NATIVE_OPERATION_TRACE = Object.freeze([
  "root.anchor.open",
  "root.identity.attest",
  "root.empty.precreate",
  "database.create.exclusive",
  "database.identity.attest",
  "owner.sqlite.open",
  "owner.connection.config",
  "owner.authorizer.bootstrap.install",
  "owner.pragma.set.01.SQLITE_PRAGMA.fullfsync.ON",
  "owner.pragma.set.02.SQLITE_PRAGMA.checkpoint_fullfsync.ON",
  "owner.pragma.set.03.SQLITE_PRAGMA.journal_mode.WAL",
  "owner.pragma.set.04.SQLITE_PRAGMA.synchronous.FULL",
  "owner.pragma.set.05.SQLITE_PRAGMA.foreign_keys.ON",
  "owner.pragma.set.06.SQLITE_PRAGMA.recursive_triggers.ON",
  "owner.pragma.set.07.SQLITE_PRAGMA.trusted_schema.OFF",
  "owner.pragma.set.08.SQLITE_PRAGMA.secure_delete.ON",
  "owner.pragma.set.09.SQLITE_PRAGMA.ignore_check_constraints.OFF",
  "owner.pragma.set.10.SQLITE_PRAGMA.wal_autocheckpoint.0",
  "owner.authorizer.initial-attest.install",
  "owner.pragma.read.initial.01.SQLITE_PRAGMA.journal_mode.null",
  "owner.pragma.read.initial.02.SQLITE_PRAGMA.foreign_keys.null",
  "owner.pragma.read.initial.03.SQLITE_PRAGMA.recursive_triggers.null",
  "owner.pragma.read.initial.04.SQLITE_PRAGMA.trusted_schema.null",
  "owner.pragma.read.initial.05.SQLITE_PRAGMA.secure_delete.null",
  "owner.pragma.read.initial.06.SQLITE_PRAGMA.synchronous.null",
  "owner.pragma.read.initial.07.SQLITE_PRAGMA.ignore_check_constraints.null",
  "owner.pragma.read.initial.08.SQLITE_PRAGMA.wal_autocheckpoint.null",
  "owner.pragma.read.initial.09.SQLITE_PRAGMA.fullfsync.null",
  "owner.pragma.read.initial.10.SQLITE_PRAGMA.checkpoint_fullfsync.null",
  "owner.authorizer.default.after-initial-attest",
  "owner.protected.before-schema-auth.authorizer.install",
  "owner.protected.before-schema-auth.01.SQLITE_PRAGMA.foreign_keys.null",
  "owner.protected.before-schema-auth.02.SQLITE_PRAGMA.recursive_triggers.null",
  "owner.protected.before-schema-auth.03.SQLITE_PRAGMA.trusted_schema.null",
  "owner.protected.before-schema-auth.04.SQLITE_PRAGMA.secure_delete.null",
  "owner.protected.before-schema-auth.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "owner.protected.before-schema-auth.authorizer.default",
  "owner.schema.prepare.SQLITE_INSERT.sqlite_master.null.AUTH",
  "owner.protected.after-schema-auth.authorizer.install",
  "owner.protected.after-schema-auth.01.SQLITE_PRAGMA.foreign_keys.null",
  "owner.protected.after-schema-auth.02.SQLITE_PRAGMA.recursive_triggers.null",
  "owner.protected.after-schema-auth.03.SQLITE_PRAGMA.trusted_schema.null",
  "owner.protected.after-schema-auth.04.SQLITE_PRAGMA.secure_delete.null",
  "owner.protected.after-schema-auth.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "owner.protected.after-schema-auth.authorizer.default",
  "owner.protected.before-pragma-auth.authorizer.install",
  "owner.protected.before-pragma-auth.01.SQLITE_PRAGMA.foreign_keys.null",
  "owner.protected.before-pragma-auth.02.SQLITE_PRAGMA.recursive_triggers.null",
  "owner.protected.before-pragma-auth.03.SQLITE_PRAGMA.trusted_schema.null",
  "owner.protected.before-pragma-auth.04.SQLITE_PRAGMA.secure_delete.null",
  "owner.protected.before-pragma-auth.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "owner.protected.before-pragma-auth.authorizer.default",
  "owner.pragma-mutation.prepare.SQLITE_PRAGMA.foreign_keys.OFF.AUTH",
  "owner.protected.after-pragma-auth.authorizer.install",
  "owner.protected.after-pragma-auth.01.SQLITE_PRAGMA.foreign_keys.null",
  "owner.protected.after-pragma-auth.02.SQLITE_PRAGMA.recursive_triggers.null",
  "owner.protected.after-pragma-auth.03.SQLITE_PRAGMA.trusted_schema.null",
  "owner.protected.after-pragma-auth.04.SQLITE_PRAGMA.secure_delete.null",
  "owner.protected.after-pragma-auth.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "owner.protected.after-pragma-auth.authorizer.default",
  "rival.sqlite.open",
  "rival.connection.config",
  "rival.authorizer.bootstrap.install",
  "rival.pragma.set.01.SQLITE_PRAGMA.fullfsync.ON",
  "rival.pragma.set.02.SQLITE_PRAGMA.checkpoint_fullfsync.ON",
  "rival.pragma.set.03.SQLITE_PRAGMA.journal_mode.WAL",
  "rival.pragma.set.04.SQLITE_PRAGMA.synchronous.FULL",
  "rival.pragma.set.05.SQLITE_PRAGMA.foreign_keys.ON",
  "rival.pragma.set.06.SQLITE_PRAGMA.recursive_triggers.ON",
  "rival.pragma.set.07.SQLITE_PRAGMA.trusted_schema.OFF",
  "rival.pragma.set.08.SQLITE_PRAGMA.secure_delete.ON",
  "rival.pragma.set.09.SQLITE_PRAGMA.ignore_check_constraints.OFF",
  "rival.pragma.set.10.SQLITE_PRAGMA.wal_autocheckpoint.0",
  "rival.authorizer.initial-attest.install",
  "rival.pragma.read.initial.01.SQLITE_PRAGMA.journal_mode.null",
  "rival.pragma.read.initial.02.SQLITE_PRAGMA.foreign_keys.null",
  "rival.pragma.read.initial.03.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.pragma.read.initial.04.SQLITE_PRAGMA.trusted_schema.null",
  "rival.pragma.read.initial.05.SQLITE_PRAGMA.secure_delete.null",
  "rival.pragma.read.initial.06.SQLITE_PRAGMA.synchronous.null",
  "rival.pragma.read.initial.07.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.pragma.read.initial.08.SQLITE_PRAGMA.wal_autocheckpoint.null",
  "rival.pragma.read.initial.09.SQLITE_PRAGMA.fullfsync.null",
  "rival.pragma.read.initial.10.SQLITE_PRAGMA.checkpoint_fullfsync.null",
  "rival.authorizer.default.after-initial-attest",
  "rival.protected.before-rebind.authorizer.install",
  "rival.protected.before-rebind.01.SQLITE_PRAGMA.foreign_keys.null",
  "rival.protected.before-rebind.02.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.protected.before-rebind.03.SQLITE_PRAGMA.trusted_schema.null",
  "rival.protected.before-rebind.04.SQLITE_PRAGMA.secure_delete.null",
  "rival.protected.before-rebind.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.protected.before-rebind.authorizer.default",
  "rival.rebind.SQLITE_SELECT.null.null.step.row",
  "rival.rebind.misuse",
  "rival.rebind.finalize",
  "rival.authorizer.default.after-rebind",
  "rival.protected.after-rebind.authorizer.install",
  "rival.protected.after-rebind.01.SQLITE_PRAGMA.foreign_keys.null",
  "rival.protected.after-rebind.02.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.protected.after-rebind.03.SQLITE_PRAGMA.trusted_schema.null",
  "rival.protected.after-rebind.04.SQLITE_PRAGMA.secure_delete.null",
  "rival.protected.after-rebind.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.protected.after-rebind.authorizer.default",
  "owner.protected.before-begin.authorizer.install",
  "owner.protected.before-begin.01.SQLITE_PRAGMA.foreign_keys.null",
  "owner.protected.before-begin.02.SQLITE_PRAGMA.recursive_triggers.null",
  "owner.protected.before-begin.03.SQLITE_PRAGMA.trusted_schema.null",
  "owner.protected.before-begin.04.SQLITE_PRAGMA.secure_delete.null",
  "owner.protected.before-begin.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "owner.protected.before-begin.authorizer.default",
  "owner.transaction.SQLITE_TRANSACTION.BEGIN.null.done",
  "owner.authorizer.default.after-begin",
  "owner.protected.after-begin.authorizer.install",
  "owner.protected.after-begin.01.SQLITE_PRAGMA.foreign_keys.null",
  "owner.protected.after-begin.02.SQLITE_PRAGMA.recursive_triggers.null",
  "owner.protected.after-begin.03.SQLITE_PRAGMA.trusted_schema.null",
  "owner.protected.after-begin.04.SQLITE_PRAGMA.secure_delete.null",
  "owner.protected.after-begin.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "owner.protected.after-begin.authorizer.default",
  "rival.protected.before-busy-finalize.authorizer.install",
  "rival.protected.before-busy-finalize.01.SQLITE_PRAGMA.foreign_keys.null",
  "rival.protected.before-busy-finalize.02.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.protected.before-busy-finalize.03.SQLITE_PRAGMA.trusted_schema.null",
  "rival.protected.before-busy-finalize.04.SQLITE_PRAGMA.secure_delete.null",
  "rival.protected.before-busy-finalize.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.protected.before-busy-finalize.authorizer.default",
  "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-finalize.step",
  "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-finalize.finalize",
  "rival.authorizer.default.after-busy-finalize",
  "rival.protected.after-busy-finalize.authorizer.install",
  "rival.protected.after-busy-finalize.01.SQLITE_PRAGMA.foreign_keys.null",
  "rival.protected.after-busy-finalize.02.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.protected.after-busy-finalize.03.SQLITE_PRAGMA.trusted_schema.null",
  "rival.protected.after-busy-finalize.04.SQLITE_PRAGMA.secure_delete.null",
  "rival.protected.after-busy-finalize.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.protected.after-busy-finalize.authorizer.default",
  "rival.protected.before-busy-reset.authorizer.install",
  "rival.protected.before-busy-reset.01.SQLITE_PRAGMA.foreign_keys.null",
  "rival.protected.before-busy-reset.02.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.protected.before-busy-reset.03.SQLITE_PRAGMA.trusted_schema.null",
  "rival.protected.before-busy-reset.04.SQLITE_PRAGMA.secure_delete.null",
  "rival.protected.before-busy-reset.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.protected.before-busy-reset.authorizer.default",
  "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-reset.step",
  "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-reset.reset",
  "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-reset.finalize",
  "rival.authorizer.default.after-busy-reset",
  "rival.protected.after-busy-reset.authorizer.install",
  "rival.protected.after-busy-reset.01.SQLITE_PRAGMA.foreign_keys.null",
  "rival.protected.after-busy-reset.02.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.protected.after-busy-reset.03.SQLITE_PRAGMA.trusted_schema.null",
  "rival.protected.after-busy-reset.04.SQLITE_PRAGMA.secure_delete.null",
  "rival.protected.after-busy-reset.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.protected.after-busy-reset.authorizer.default",
  "owner.protected.before-rollback.authorizer.install",
  "owner.protected.before-rollback.01.SQLITE_PRAGMA.foreign_keys.null",
  "owner.protected.before-rollback.02.SQLITE_PRAGMA.recursive_triggers.null",
  "owner.protected.before-rollback.03.SQLITE_PRAGMA.trusted_schema.null",
  "owner.protected.before-rollback.04.SQLITE_PRAGMA.secure_delete.null",
  "owner.protected.before-rollback.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "owner.protected.before-rollback.authorizer.default",
  "owner.transaction.SQLITE_TRANSACTION.ROLLBACK.null.done",
  "owner.authorizer.default.after-rollback",
  "owner.protected.after-rollback.authorizer.install",
  "owner.protected.after-rollback.01.SQLITE_PRAGMA.foreign_keys.null",
  "owner.protected.after-rollback.02.SQLITE_PRAGMA.recursive_triggers.null",
  "owner.protected.after-rollback.03.SQLITE_PRAGMA.trusted_schema.null",
  "owner.protected.after-rollback.04.SQLITE_PRAGMA.secure_delete.null",
  "owner.protected.after-rollback.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "owner.protected.after-rollback.authorizer.default",
  "rival.protected.before-post-release-begin.authorizer.install",
  "rival.protected.before-post-release-begin.01.SQLITE_PRAGMA.foreign_keys.null",
  "rival.protected.before-post-release-begin.02.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.protected.before-post-release-begin.03.SQLITE_PRAGMA.trusted_schema.null",
  "rival.protected.before-post-release-begin.04.SQLITE_PRAGMA.secure_delete.null",
  "rival.protected.before-post-release-begin.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.protected.before-post-release-begin.authorizer.default",
  "rival.post-release.transaction.SQLITE_TRANSACTION.BEGIN.null.done",
  "rival.authorizer.default.after-post-release-begin",
  "rival.protected.after-post-release-begin.authorizer.install",
  "rival.protected.after-post-release-begin.01.SQLITE_PRAGMA.foreign_keys.null",
  "rival.protected.after-post-release-begin.02.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.protected.after-post-release-begin.03.SQLITE_PRAGMA.trusted_schema.null",
  "rival.protected.after-post-release-begin.04.SQLITE_PRAGMA.secure_delete.null",
  "rival.protected.after-post-release-begin.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.protected.after-post-release-begin.authorizer.default",
  "rival.protected.before-post-release-rollback.authorizer.install",
  "rival.protected.before-post-release-rollback.01.SQLITE_PRAGMA.foreign_keys.null",
  "rival.protected.before-post-release-rollback.02.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.protected.before-post-release-rollback.03.SQLITE_PRAGMA.trusted_schema.null",
  "rival.protected.before-post-release-rollback.04.SQLITE_PRAGMA.secure_delete.null",
  "rival.protected.before-post-release-rollback.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.protected.before-post-release-rollback.authorizer.default",
  "rival.post-release.transaction.SQLITE_TRANSACTION.ROLLBACK.null.done",
  "rival.authorizer.default.after-post-release-rollback",
  "rival.protected.after-post-release-rollback.authorizer.install",
  "rival.protected.after-post-release-rollback.01.SQLITE_PRAGMA.foreign_keys.null",
  "rival.protected.after-post-release-rollback.02.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.protected.after-post-release-rollback.03.SQLITE_PRAGMA.trusted_schema.null",
  "rival.protected.after-post-release-rollback.04.SQLITE_PRAGMA.secure_delete.null",
  "rival.protected.after-post-release-rollback.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.protected.after-post-release-rollback.authorizer.default",
  "owner.authorizer.terminal-attest.install",
  "owner.pragma.read.terminal.01.SQLITE_PRAGMA.journal_mode.null",
  "owner.pragma.read.terminal.02.SQLITE_PRAGMA.foreign_keys.null",
  "owner.pragma.read.terminal.03.SQLITE_PRAGMA.recursive_triggers.null",
  "owner.pragma.read.terminal.04.SQLITE_PRAGMA.trusted_schema.null",
  "owner.pragma.read.terminal.05.SQLITE_PRAGMA.secure_delete.null",
  "owner.pragma.read.terminal.06.SQLITE_PRAGMA.synchronous.null",
  "owner.pragma.read.terminal.07.SQLITE_PRAGMA.ignore_check_constraints.null",
  "owner.pragma.read.terminal.08.SQLITE_PRAGMA.wal_autocheckpoint.null",
  "owner.pragma.read.terminal.09.SQLITE_PRAGMA.fullfsync.null",
  "owner.pragma.read.terminal.10.SQLITE_PRAGMA.checkpoint_fullfsync.null",
  "owner.authorizer.default.after-terminal-attest",
  "rival.authorizer.terminal-attest.install",
  "rival.pragma.read.terminal.01.SQLITE_PRAGMA.journal_mode.null",
  "rival.pragma.read.terminal.02.SQLITE_PRAGMA.foreign_keys.null",
  "rival.pragma.read.terminal.03.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.pragma.read.terminal.04.SQLITE_PRAGMA.trusted_schema.null",
  "rival.pragma.read.terminal.05.SQLITE_PRAGMA.secure_delete.null",
  "rival.pragma.read.terminal.06.SQLITE_PRAGMA.synchronous.null",
  "rival.pragma.read.terminal.07.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.pragma.read.terminal.08.SQLITE_PRAGMA.wal_autocheckpoint.null",
  "rival.pragma.read.terminal.09.SQLITE_PRAGMA.fullfsync.null",
  "rival.pragma.read.terminal.10.SQLITE_PRAGMA.checkpoint_fullfsync.null",
  "rival.authorizer.default.after-terminal-attest",
  "connections.terminal.attest",
  "rival.protected.before-close-busy.authorizer.install",
  "rival.protected.before-close-busy.01.SQLITE_PRAGMA.foreign_keys.null",
  "rival.protected.before-close-busy.02.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.protected.before-close-busy.03.SQLITE_PRAGMA.trusted_schema.null",
  "rival.protected.before-close-busy.04.SQLITE_PRAGMA.secure_delete.null",
  "rival.protected.before-close-busy.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.protected.before-close-busy.authorizer.default",
  "rival.close-busy.prepare.SQLITE_SELECT.null.null",
  "rival.authorizer.default.before-close-busy",
  "rival.close.busy",
  "rival.close.statement.finalize",
  "rival.protected.after-close-busy.authorizer.install",
  "rival.protected.after-close-busy.01.SQLITE_PRAGMA.foreign_keys.null",
  "rival.protected.after-close-busy.02.SQLITE_PRAGMA.recursive_triggers.null",
  "rival.protected.after-close-busy.03.SQLITE_PRAGMA.trusted_schema.null",
  "rival.protected.after-close-busy.04.SQLITE_PRAGMA.secure_delete.null",
  "rival.protected.after-close-busy.05.SQLITE_PRAGMA.ignore_check_constraints.null",
  "rival.protected.after-close-busy.authorizer.default",
  "rival.close.recovery",
  "owner.close",
  "connections.close.complete",
  "database.identity.final",
  "database.header.attest",
  "readonly.sqlite.open",
  "readonly.authorizer.install",
  "readonly.query-only.set.SQLITE_PRAGMA.query_only.ON",
  "readonly.query-only.attest.SQLITE_PRAGMA.query_only.null",
  "readonly.journal-mode.attest.SQLITE_PRAGMA.journal_mode.null",
  "readonly.authorizer.default",
  "readonly.zero-change.attest",
  "readonly.close",
  "sidecars.identity.validate",
  "sidecars.unlink",
  "database.unlink",
  "directory.fsync",
  "owned.empty.scan",
] as const);

export interface DisposableFileFactoryNativeMatrixEvidence {
  format: "brain-s28-disposable-file-factory-native-matrix-v1";
  readinessClaim: "none";
  disposableOnly: true;
  nominalDisposableFileFactoryMatrixSatisfied: true;
  routeSucceeded: true;
  oracleSatisfied: true;
  adversarialCoverage: {
    hostileFilesystem: false;
    injectedFilesystemFaults: false;
    injectedSqliteFaults: false;
    abruptExitRestart: false;
  };
  sqliteVersion: "3.49.2";
  sqliteSourceId:
    "2025-05-07 10:39:52 17144570b0d96ae63cd6f3edca39e27ebd74925252bbaf6723bcb2f6b4861fb1";
  filesystem: {
    rootMode: 448;
    databaseMode: 384;
    ownerUidAttested: true;
    singleLinkAttested: true;
    descriptorRelativeCreate: true;
    sqliteNoFollowOpen: true;
    pathAnchorIdentityStable: true;
    headerAttested: true;
    readOnlyReopenAttested: true;
    sidecarsValidated: true;
    exactOwnedObjectsRemoved: true;
  };
  pragmas: {
    journalMode: "wal";
    foreignKeys: 1;
    recursiveTriggers: 1;
    trustedSchema: 0;
    secureDelete: 1;
    synchronous: 2;
    ignoreCheckConstraints: 0;
    walAutocheckpoint: 0;
    fullfsync: 1;
    checkpointFullfsync: 1;
  };
  authorizer: {
    installedBeforeFirstPrepare: true;
    bootstrapPragmaCount: 20;
    initialAttestationCount: 20;
    terminalAttestationCount: 20;
    protectedBoundaryCount: 20;
    protectedPragmaReadCount: 100;
    schemaPrepareCode: 23;
    pragmaMutationPrepareCode: 23;
    defaultDenyRestored: true;
  };
  writerLock: {
    ownerBeginStepCode: 101;
    ownerBeginFinalizeCode: 0;
    rivalBusyStepCode: 5;
    rivalBusyFinalizeCode: 5;
    rivalBusyResetStepCode: 5;
    rivalBusyResetCode: 5;
    rivalBusyResetFinalizeCode: 0;
    ownerRollbackStepCode: 101;
    ownerRollbackFinalizeCode: 0;
    postReleaseBeginStepCode: 101;
    postReleaseBeginFinalizeCode: 0;
    postReleaseRollbackStepCode: 101;
    postReleaseRollbackFinalizeCode: 0;
  };
  lifecycle: {
    connectionsOpened: 3;
    allStatementsFinalized: true;
    ownerRolledBack: true;
    rivalReleased: true;
    allConnectionsClosed: true;
    autocommitRestored: true;
    transactionStateNone: true;
    cleanupComplete: true;
  };
  faults: {
    activeRebindStepCode: 100;
    activeRebindCode: 21;
    activeRebindFinalizeCode: 0;
    closeBusyCode: 5;
    closeBusyFinalizeCode: 0;
    closeRecoveryCode: 0;
  };
  operationTrace: typeof FILE_FACTORY_NATIVE_OPERATION_TRACE;
  rawDatabaseReturned: false;
  artifactPathsReturned: false;
  processIdentifiersReturned: false;
  reusableHandleReturned: false;
  checkpointCoordinatorAuthority: false;
  migration028Authority: false;
  productionAuthority: false;
  s28ReadinessProven: false;
  implementationGoProven: false;
}

export interface DisposableFileFactoryProofEvidence {
  format: "brain-s28-private-file-factory-proof-v1";
  readinessClaim: "none";
  disposableOnly: true;
  routeSucceeded: true;
  oracleSatisfied: true;
  provenance: {
    memoryOnlyPrerequisitesAttested: true;
    sourceManifestSha256: string;
    buildScriptSha256: string;
    proofWorkerSha256: string;
    moduleSha256: string;
    operationTraceSha256: string;
    independentBuildCount: 2;
    independentModuleHashesEqual: true;
    nativeSourceHashesEqual: true;
    buildManifestInputsEqual: true;
    compilerAttested: true;
  };
  host: {
    platform: "darwin";
    arch: "arm64";
    nodeVersion: "22.22.3";
    nodeAbi: "127";
  };
  isolation: {
    pinnedPrivateRoot: true;
    ambientTempIgnored: true;
    ambientDatabasePathIgnored: true;
    parentRetainedRootIdentity: true;
    sealedChildProcess: true;
    childReceivedNoRootDescriptor: true;
  };
  native: DisposableFileFactoryNativeMatrixEvidence;
  lifecycle: {
    independentBuildOutputsRemovedBeforeResponse: true;
    nativeTargetClosedBeforeResponse: true;
    nativeTargetRemovedBeforeResponse: true;
    workerRootEmptyBeforeResponse: true;
    parentRevalidatedRootIdentity: true;
    parentRemovedRetainedRoot: true;
  };
  rawDatabaseReturned: false;
  artifactPathsReturned: false;
  processIdentifiersReturned: false;
  reusableHandleReturned: false;
  checkpointCoordinatorAuthority: false;
  migration028Executed: false;
  migration028Authority: false;
  productionAuthority: false;
  s28ReadinessProven: false;
  implementationGoProven: false;
}
