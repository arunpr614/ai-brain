#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmdirSync,
  unlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

const WORKER_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(WORKER_PATH), "..");
const SOURCE_MANIFEST_PATH = join(
  REPO_ROOT,
  "native",
  "brain-s28-file-factory",
  "file-factory-source-manifest.json",
);
const NATIVE_SOURCE_PATH = join(
  REPO_ROOT,
  "native",
  "brain-s28-file-factory",
  "src",
  "brain_s28_file_factory.cpp",
);
const BUILD_SCRIPT_PATH = join(
  REPO_ROOT,
  "scripts",
  "build-youtube-stage2-file-factory.mjs",
);
const PINNED_NODE_EXECUTABLE =
  "/opt/homebrew/Cellar/node@22/22.22.3/bin/node";
const PINNED_NODE_VERSION = "22.22.3";
const PINNED_NODE_ABI = "127";
const PINNED_PRIVATE_TEMP_ROOT = "/private/tmp";
const PRIVATE_ROOT_PREFIX = "brain-s28-file-factory-proof-";
const BUILD_RESULT_FORMAT =
  "brain-s28-disposable-file-factory-build-result-v1";
const WORKER_FORMAT =
  "brain-s28-private-file-factory-worker-evidence-v1";
const NATIVE_FORMAT =
  "brain-s28-disposable-file-factory-native-matrix-v1";
const NATIVE_EXPORT = "runDisposableFileFactoryMatrix";
const NATIVE_MODULE_FILE = "brain_s28_file_factory.node";
const EXPECTED_COMPILER_VERSION =
  "Apple clang version 21.0.0 (clang-2100.1.1.101)";
const MAX_BUILD_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_NATIVE_OUTPUT_BYTES = 65_536;
const MAX_WORKER_OUTPUT_BYTES = 2 * 1024 * 1024;
const require = createRequire(import.meta.url);
const BUILD_OUTPUT_LEAF_NAMES = Object.freeze([
  "brain_s28_file_factory.build-manifest.json",
  "brain_s28_file_factory.node",
  "brain_s28_file_factory.o",
  "sqlite3.o",
]);

const ALLOWED_ENVIRONMENT_KEYS = Object.freeze([
  "LANG",
  "LC_ALL",
  "NODE_ENV",
  "PATH",
  "TMPDIR",
  "__CF_USER_TEXT_ENCODING",
]);
const BUILD_RESULT_KEYS = Object.freeze([
  "format",
  "readinessClaim",
  "disposableOnly",
  "outputDirectory",
  "bindingPath",
  "buildManifestPath",
  "moduleSha256",
  "sourceManifestSha256",
]);
const BUILD_MANIFEST_KEYS = Object.freeze([
  "format",
  "readinessClaim",
  "disposableOnly",
  "fileBackedFactoryOnly",
  "productionAuthority",
  "migration028Authority",
  "addonExport",
  "moduleFile",
  "nodeVersion",
  "nodeAbi",
  "sqliteVersion",
  "sqliteSourceId",
  "platform",
  "arch",
  "compiler",
  "nodeHeaders",
  "sourceManifestSha256",
  "nativeSourceSha256",
  "buildInputSha256",
  "commands",
  "moduleSha256",
  "localArtifactReleaseProvenance",
]);
const BUILD_COMPILER_KEYS = Object.freeze([
  "c",
  "cxx",
  "version",
]);
const BUILD_NODE_HEADER_KEYS = Object.freeze([
  "directory",
  "nodeHeaderSha256",
  "nodeVersionHeaderSha256",
]);
const BUILD_COMMAND_KEYS = Object.freeze([
  "sqliteCompile",
  "factoryCompile",
  "link",
]);
const BUILD_COMMAND_RECORD_KEYS = Object.freeze([
  "command",
  "arguments",
]);
const NATIVE_KEYS = Object.freeze([
  "format",
  "readinessClaim",
  "disposableOnly",
  "nominalDisposableFileFactoryMatrixSatisfied",
  "routeSucceeded",
  "oracleSatisfied",
  "adversarialCoverage",
  "sqliteVersion",
  "sqliteSourceId",
  "filesystem",
  "pragmas",
  "authorizer",
  "writerLock",
  "lifecycle",
  "operationTrace",
  "faults",
  "rawDatabaseReturned",
  "artifactPathsReturned",
  "processIdentifiersReturned",
  "reusableHandleReturned",
  "checkpointCoordinatorAuthority",
  "migration028Authority",
  "productionAuthority",
  "s28ReadinessProven",
  "implementationGoProven",
]);
const NATIVE_FILESYSTEM_KEYS = Object.freeze([
  "rootMode",
  "databaseMode",
  "ownerUidAttested",
  "singleLinkAttested",
  "descriptorRelativeCreate",
  "sqliteNoFollowOpen",
  "pathAnchorIdentityStable",
  "headerAttested",
  "readOnlyReopenAttested",
  "sidecarsValidated",
  "exactOwnedObjectsRemoved",
]);
const NATIVE_PRAGMA_KEYS = Object.freeze([
  "journalMode",
  "foreignKeys",
  "recursiveTriggers",
  "trustedSchema",
  "secureDelete",
  "synchronous",
  "ignoreCheckConstraints",
  "walAutocheckpoint",
  "fullfsync",
  "checkpointFullfsync",
]);
const NATIVE_AUTHORIZER_KEYS = Object.freeze([
  "installedBeforeFirstPrepare",
  "bootstrapPragmaCount",
  "initialAttestationCount",
  "terminalAttestationCount",
  "protectedBoundaryCount",
  "protectedPragmaReadCount",
  "schemaPrepareCode",
  "pragmaMutationPrepareCode",
  "defaultDenyRestored",
]);
const NATIVE_ADVERSARIAL_COVERAGE_KEYS = Object.freeze([
  "hostileFilesystem",
  "injectedFilesystemFaults",
  "injectedSqliteFaults",
  "abruptExitRestart",
]);
const NATIVE_WRITER_LOCK_KEYS = Object.freeze([
  "ownerBeginStepCode",
  "ownerBeginFinalizeCode",
  "rivalBusyStepCode",
  "rivalBusyFinalizeCode",
  "rivalBusyResetStepCode",
  "rivalBusyResetCode",
  "rivalBusyResetFinalizeCode",
  "ownerRollbackStepCode",
  "ownerRollbackFinalizeCode",
  "postReleaseBeginStepCode",
  "postReleaseBeginFinalizeCode",
  "postReleaseRollbackStepCode",
  "postReleaseRollbackFinalizeCode",
]);
const NATIVE_LIFECYCLE_KEYS = Object.freeze([
  "connectionsOpened",
  "allStatementsFinalized",
  "ownerRolledBack",
  "rivalReleased",
  "allConnectionsClosed",
  "autocommitRestored",
  "transactionStateNone",
  "cleanupComplete",
]);
const NATIVE_FAULT_KEYS = Object.freeze([
  "activeRebindStepCode",
  "activeRebindCode",
  "activeRebindFinalizeCode",
  "closeBusyCode",
  "closeBusyFinalizeCode",
  "closeRecoveryCode",
]);
const EXPECTED_OPERATION_TRACE = Object.freeze([
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
]);
const MEMORY_ONLY_PREREQUISITES = Object.freeze({
  "native/brain-s28-bridge/bridge-source-manifest.json":
    "50db75350d3fba0bb5c2661481c216769d6cebcc87ee7e76c4f30705c5486ee0",
  "native/brain-s28-bridge/src/brain_s28_bridge.cpp":
    "fde48c0ae02591c7b9f51ea8042ef247a70f20d60cc0ebb9a0452baf9ef4ac43",
  "native/brain-s28-bridge/src/brain_s28_bridge.hpp":
    "31f50b68119724917aad4134164d23deed028a878782ebf4dea06cf2fb2550c8",
  "scripts/build-youtube-stage2-native-bridge.mjs":
    "fe999b9e17e449289f5ccc3cdcd367a47934437e096f712d73e0cc32ac16df1b",
  "scripts/probe-youtube-stage2-native-bridge.mjs":
    "2d5ef8857505d4cb4d2debcb9bebd564dd3f88c8a3e058090cb5b1bd2e8a785a",
  "scripts/run-youtube-stage2-native-bridge-proof-worker.mjs":
    "74f5e4dbb9613c52f2668cbc8e803624fa6e9a3a04f4792baab6a191c836b316",
  "src/db/stage2/native-bridge.ts":
    "4f6cd925ee90b9cea61f08c3a29437b36802e8f281a30eefe777bf3a7aa02cdb",
  "src/db/stage2/native-bridge-proof.ts":
    "da5f68468828af15cf0598fa7508108fe8cc91da30e1b74154a65022850ff120",
  "src/db/stage2/native-bridge-proof.test.ts":
    "78ede99752b948fa247f6b6b60ca6bd78948c730d11eec3fbdb51a7fba40a6bc",
});

function refuse() {
  throw new Error("Disposable file factory proof worker refused");
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256File(path) {
  return sha256Bytes(readFileSync(path));
}

function parseJson(raw, label, { canonical = false } = {}) {
  if (
    typeof raw !== "string" ||
    Buffer.byteLength(raw, "utf8") > MAX_BUILD_OUTPUT_BYTES
  ) {
    refuse();
  }
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    refuse();
  }
  if (canonical && `${JSON.stringify(value)}\n` !== raw) {
    refuse();
  }
  assertObject(value, label);
  return value;
}

function assertObject(value, _label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    refuse();
  }
}

function assertExactKeys(value, expected, _label) {
  const actual = Object.keys(value);
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    refuse();
  }
}

function requireFields(value, expected) {
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (value[key] !== expectedValue) refuse();
  }
}

function assertLowerSha256(value) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    refuse();
  }
}

function isWithin(parent, child) {
  const relation = relative(parent, child);
  return (
    relation !== "" &&
    !relation.startsWith("..") &&
    !isAbsolute(relation)
  );
}

function assertExactRegularFile(path) {
  if (
    !existsSync(path) ||
    !lstatSync(path).isFile() ||
    realpathSync(path) !== path
  ) {
    refuse();
  }
}

function assertMemoryOnlyPrerequisites() {
  for (const [relativePath, expectedHash] of Object.entries(
    MEMORY_ONLY_PREREQUISITES,
  )) {
    const path = join(REPO_ROOT, relativePath);
    assertExactRegularFile(path);
    if (sha256File(path) !== expectedHash) refuse();
  }
}

function assertSealedInvocation() {
  if (
    process.argv.length !== 2 ||
    process.platform !== "darwin" ||
    process.arch !== "arm64" ||
    process.versions.node !== PINNED_NODE_VERSION ||
    process.versions.modules !== PINNED_NODE_ABI ||
    realpathSync(process.execPath) !== PINNED_NODE_EXECUTABLE ||
    realpathSync(REPO_ROOT) !== REPO_ROOT ||
    realpathSync(PINNED_PRIVATE_TEMP_ROOT) !==
      PINNED_PRIVATE_TEMP_ROOT
  ) {
    refuse();
  }
  const actualEnvironmentKeys = Object.keys(process.env).sort();
  const expectedEnvironmentKeys = [...ALLOWED_ENVIRONMENT_KEYS].sort();
  if (
    actualEnvironmentKeys.length !== expectedEnvironmentKeys.length ||
    actualEnvironmentKeys.some(
      (key, index) => key !== expectedEnvironmentKeys[index],
    ) ||
    process.env.LANG !== "C" ||
    process.env.LC_ALL !== "C" ||
    process.env.NODE_ENV !== "test" ||
    process.env.PATH !== "/usr/bin:/bin:/usr/sbin:/sbin" ||
    process.env.TMPDIR === undefined ||
    !/^0x[0-9A-F]+:0x0:0x0$/.test(
      process.env.__CF_USER_TEXT_ENCODING ?? "",
    )
  ) {
    refuse();
  }

  const root = realpathSync(process.cwd());
  const rootStat = lstatSync(root);
  if (
    root !== realpathSync(process.env.TMPDIR) ||
    dirname(root) !== PINNED_PRIVATE_TEMP_ROOT ||
    !basename(root).startsWith(PRIVATE_ROOT_PREFIX) ||
    !rootStat.isDirectory() ||
    (rootStat.mode & 0o7777) !== 0o700 ||
    rootStat.uid !== process.getuid() ||
    readdirSync(root).length !== 0
  ) {
    refuse();
  }
  assertMemoryOnlyPrerequisites();
  assertExactRegularFile(SOURCE_MANIFEST_PATH);
  assertExactRegularFile(BUILD_SCRIPT_PATH);
}

function closedBuildEnvironment() {
  return {
    LANG: "C",
    LC_ALL: "C",
    NODE_ENV: "test",
    PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
    TMPDIR: realpathSync(process.cwd()),
  };
}

function readAndVerifySourceManifest() {
  const text = readFileSync(SOURCE_MANIFEST_PATH, "utf8");
  const manifest = parseJson(text, "source manifest");
  if (
    manifest.format !==
      "brain-s28-disposable-file-factory-source-v1" ||
    manifest.readinessClaim !== "none" ||
    manifest.disposableOnly !== true ||
    manifest.fileBackedFactoryOnly !== true ||
    manifest.productionAuthority !== false ||
    manifest.migration028Authority !== false ||
    manifest.localArtifactReleaseProvenance !== false ||
    manifest.sqliteVersion !== "3.49.2" ||
    manifest.sqliteSourceId !==
      "2025-05-07 10:39:52 " +
      "17144570b0d96ae63cd6f3edca39e27ebd74925252bbaf6723bcb2f6b4861fb1" ||
    manifest.nodeVersion !== PINNED_NODE_VERSION ||
    manifest.nodeAbi !== PINNED_NODE_ABI ||
    manifest.nodeExecutable !== PINNED_NODE_EXECUTABLE
  ) {
    refuse();
  }
  for (const key of [
    "nodeHeaders",
    "toolchain",
    "upstreamFiles",
    "repositoryFiles",
    "immutablePrerequisiteFiles",
  ]) {
    assertObject(manifest[key], `source manifest ${key}`);
  }
  const nativeSourceSha256 = sha256File(NATIVE_SOURCE_PATH);
  const buildScriptSha256 = sha256File(BUILD_SCRIPT_PATH);
  if (
    manifest.repositoryFiles[
      "native/brain-s28-file-factory/src/brain_s28_file_factory.cpp"
    ] !== nativeSourceSha256 ||
    manifest.repositoryFiles[
      "scripts/build-youtube-stage2-file-factory.mjs"
    ] !== buildScriptSha256
  ) {
    refuse();
  }
  return {
    text,
    manifest,
    sha256: sha256Bytes(text),
    nativeSourceSha256,
    buildScriptSha256,
  };
}

function deriveBuildInput(source) {
  const upstreamPackagePath = require.resolve(
    "better-sqlite3/package.json",
  );
  const upstreamRoot = realpathSync(dirname(upstreamPackagePath));
  const definesText = readFileSync(
    join(upstreamRoot, "deps", "defines.gypi"),
    "utf8",
  );
  const sqliteDefines = Array.from(
    definesText.matchAll(/^\s*'([^']+)',?\s*$/gm),
    (match) => `-D${match[1]}`,
  );
  if (sqliteDefines.length < 20) refuse();
  const commonFlags = [
    "-O3",
    "-fPIC",
    "-fvisibility=hidden",
    "-DNDEBUG",
    "-DBUILDING_NODE_EXTENSION",
    "-DNODE_GYP_MODULE_NAME=brain_s28_file_factory",
  ];
  const descriptor = {
    format: "brain-s28-disposable-file-factory-build-input-v1",
    platform: "darwin",
    arch: "arm64",
    nodeVersion: PINNED_NODE_VERSION,
    nodeAbi: PINNED_NODE_ABI,
    sqliteVersion: source.manifest.sqliteVersion,
    sqliteSourceId: source.manifest.sqliteSourceId,
    toolchain: {
      c: "/usr/bin/clang",
      cxx: "/usr/bin/clang++",
      version: EXPECTED_COMPILER_VERSION,
    },
    flags: {
      common: [
        ...commonFlags,
      ],
      sqlite: ["-std=c99", "-w"],
      factory: ["-std=c++20", "-stdlib=libc++"],
      link: [
        "-bundle",
        "-undefined",
        "dynamic_lookup",
        "-stdlib=libc++",
      ],
    },
    sqliteDefines,
    inputs: {
      nativeSourceSha256: source.nativeSourceSha256,
      sqliteSourceSha256:
        source.manifest.upstreamFiles["deps/sqlite3/sqlite3.c"],
      sqliteHeaderSha256:
        source.manifest.upstreamFiles["deps/sqlite3/sqlite3.h"],
      sqliteExtensionHeaderSha256:
        source.manifest.upstreamFiles["deps/sqlite3/sqlite3ext.h"],
      sqliteDefinesFileSha256:
        source.manifest.upstreamFiles["deps/defines.gypi"],
      nodeHeaderSha256:
        source.manifest.nodeHeaders.nodeHeaderSha256,
      nodeVersionHeaderSha256:
        source.manifest.nodeHeaders.nodeVersionHeaderSha256,
    },
  };
  return {
    sha256: sha256Bytes(JSON.stringify(descriptor)),
    upstreamRoot,
    sqliteDefines,
    commonFlags,
  };
}

function runPinnedBuild() {
  const raw = execFileSync(
    PINNED_NODE_EXECUTABLE,
    [BUILD_SCRIPT_PATH],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: closedBuildEnvironment(),
      maxBuffer: MAX_BUILD_OUTPUT_BYTES,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    },
  );
  const result = parseJson(raw, "build result", { canonical: true });
  assertExactKeys(result, BUILD_RESULT_KEYS, "build result");
  requireFields(result, {
    format: BUILD_RESULT_FORMAT,
    readinessClaim: "none",
    disposableOnly: true,
  });
  for (const key of [
    "outputDirectory",
    "bindingPath",
    "buildManifestPath",
  ]) {
    if (typeof result[key] !== "string" || result[key].length === 0) {
      refuse();
    }
  }
  assertLowerSha256(result.moduleSha256);
  assertLowerSha256(result.sourceManifestSha256);
  return result;
}

function mode(statMode) {
  return Number(statMode & 0o7777n);
}

function exactSortedEntries(path, expected) {
  const entries = readdirSync(path).sort();
  return (
    entries.length === expected.length &&
    entries.every((entry, index) => entry === expected[index])
  );
}

function captureBuildCleanupIdentity(root, outputDirectory) {
  let parentDescriptor;
  let directoryDescriptor;
  const leaves = [];
  try {
    parentDescriptor = openSync(
      root,
      fsConstants.O_RDONLY |
        fsConstants.O_DIRECTORY |
        fsConstants.O_NOFOLLOW,
    );
    directoryDescriptor = openSync(
      outputDirectory,
      fsConstants.O_RDONLY |
        fsConstants.O_DIRECTORY |
        fsConstants.O_NOFOLLOW,
    );
    const parentPathStat = lstatSync(root, { bigint: true });
    const parentDescriptorStat = fstatSync(
      parentDescriptor,
      { bigint: true },
    );
    const directoryPathStat = lstatSync(
      outputDirectory,
      { bigint: true },
    );
    const directoryDescriptorStat = fstatSync(
      directoryDescriptor,
      { bigint: true },
    );
    const uid = BigInt(process.getuid());
    if (
      !parentPathStat.isDirectory() ||
      !parentDescriptorStat.isDirectory() ||
      parentPathStat.dev !== parentDescriptorStat.dev ||
      parentPathStat.ino !== parentDescriptorStat.ino ||
      parentDescriptorStat.uid !== uid ||
      mode(parentDescriptorStat.mode) !== 0o700 ||
      !directoryPathStat.isDirectory() ||
      !directoryDescriptorStat.isDirectory() ||
      directoryPathStat.dev !== directoryDescriptorStat.dev ||
      directoryPathStat.ino !== directoryDescriptorStat.ino ||
      directoryDescriptorStat.uid !== uid ||
      mode(directoryDescriptorStat.mode) !== 0o700 ||
      !exactSortedEntries(
        outputDirectory,
        BUILD_OUTPUT_LEAF_NAMES,
      )
    ) {
      refuse();
    }

    for (const name of BUILD_OUTPUT_LEAF_NAMES) {
      const path = join(outputDirectory, name);
      const descriptor = openSync(
        path,
        fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
      );
      try {
        const pathStat = lstatSync(path, { bigint: true });
        const descriptorStat = fstatSync(
          descriptor,
          { bigint: true },
        );
        if (
          !pathStat.isFile() ||
          !descriptorStat.isFile() ||
          pathStat.dev !== descriptorStat.dev ||
          pathStat.ino !== descriptorStat.ino ||
          descriptorStat.uid !== uid ||
          descriptorStat.nlink !== 1n ||
          realpathSync(path) !== path
        ) {
          refuse();
        }
        leaves.push({
          name,
          descriptor,
          device: descriptorStat.dev,
          inode: descriptorStat.ino,
          uid: descriptorStat.uid,
          gid: descriptorStat.gid,
          closed: false,
        });
      } catch (error) {
        closeSync(descriptor);
        throw error;
      }
    }

    return {
      root,
      outputDirectory,
      parentDescriptor,
      parentDevice: parentDescriptorStat.dev,
      parentInode: parentDescriptorStat.ino,
      parentUid: parentDescriptorStat.uid,
      parentGid: parentDescriptorStat.gid,
      directoryDescriptor,
      directoryDevice: directoryDescriptorStat.dev,
      directoryInode: directoryDescriptorStat.ino,
      directoryUid: directoryDescriptorStat.uid,
      directoryGid: directoryDescriptorStat.gid,
      leaves,
    };
  } catch {
    for (const leaf of leaves) {
      try {
        closeSync(leaf.descriptor);
      } catch {
        // The fixed worker refusal remains content-free.
      }
    }
    if (directoryDescriptor !== undefined) {
      try {
        closeSync(directoryDescriptor);
      } catch {
        // The fixed worker refusal remains content-free.
      }
    }
    if (parentDescriptor !== undefined) {
      try {
        closeSync(parentDescriptor);
      } catch {
        // The fixed worker refusal remains content-free.
      }
    }
    refuse();
  }
}

function sameBuildParentIdentity(identity) {
  const pathStat = lstatSync(identity.root, { bigint: true });
  const descriptorStat = fstatSync(
    identity.parentDescriptor,
    { bigint: true },
  );
  return (
    realpathSync(identity.root) === identity.root &&
    pathStat.isDirectory() &&
    descriptorStat.isDirectory() &&
    pathStat.dev === identity.parentDevice &&
    pathStat.ino === identity.parentInode &&
    descriptorStat.dev === identity.parentDevice &&
    descriptorStat.ino === identity.parentInode &&
    descriptorStat.uid === identity.parentUid &&
    descriptorStat.gid === identity.parentGid &&
    mode(descriptorStat.mode) === 0o700
  );
}

function sameBuildDirectoryIdentity(identity) {
  const pathStat = lstatSync(
    identity.outputDirectory,
    { bigint: true },
  );
  const descriptorStat = fstatSync(
    identity.directoryDescriptor,
    { bigint: true },
  );
  return (
    sameBuildParentIdentity(identity) &&
    dirname(identity.outputDirectory) === identity.root &&
    realpathSync(identity.outputDirectory) ===
      identity.outputDirectory &&
    pathStat.isDirectory() &&
    descriptorStat.isDirectory() &&
    pathStat.dev === identity.directoryDevice &&
    pathStat.ino === identity.directoryInode &&
    descriptorStat.dev === identity.directoryDevice &&
    descriptorStat.ino === identity.directoryInode &&
    descriptorStat.uid === identity.directoryUid &&
    descriptorStat.gid === identity.directoryGid &&
    mode(descriptorStat.mode) === 0o700
  );
}

function sameBuildLeafIdentity(identity, leaf) {
  const path = join(identity.outputDirectory, leaf.name);
  const pathStat = lstatSync(path, { bigint: true });
  const descriptorStat = fstatSync(
    leaf.descriptor,
    { bigint: true },
  );
  return (
    sameBuildDirectoryIdentity(identity) &&
    dirname(path) === identity.outputDirectory &&
    realpathSync(path) === path &&
    pathStat.isFile() &&
    descriptorStat.isFile() &&
    pathStat.dev === leaf.device &&
    pathStat.ino === leaf.inode &&
    descriptorStat.dev === leaf.device &&
    descriptorStat.ino === leaf.inode &&
    descriptorStat.uid === leaf.uid &&
    descriptorStat.gid === leaf.gid &&
    descriptorStat.nlink === 1n
  );
}

function verifyBuild(result, source, buildInput) {
  const root = realpathSync(process.cwd());
  if (
    !existsSync(result.outputDirectory) ||
    !lstatSync(result.outputDirectory).isDirectory()
  ) {
    refuse();
  }
  const outputDirectory = realpathSync(result.outputDirectory);
  if (
    dirname(outputDirectory) !== root ||
    !isWithin(root, outputDirectory) ||
    !basename(outputDirectory).startsWith(
      "brain-s28-file-factory-build-",
    )
  ) {
    refuse();
  }

  for (const [path, expectedBasename] of [
    [result.bindingPath, NATIVE_MODULE_FILE],
    [
      result.buildManifestPath,
      "brain_s28_file_factory.build-manifest.json",
    ],
  ]) {
    assertExactRegularFile(path);
    if (
      !isWithin(outputDirectory, realpathSync(path)) ||
      basename(path) !== expectedBasename
    ) {
      refuse();
    }
  }
  if (
    result.sourceManifestSha256 !== source.sha256 ||
    result.moduleSha256 !== sha256File(result.bindingPath)
  ) {
    refuse();
  }

  const manifestText = readFileSync(
    result.buildManifestPath,
    "utf8",
  );
  const manifest = parseJson(manifestText, "build manifest");
  assertExactKeys(
    manifest,
    BUILD_MANIFEST_KEYS,
    "build manifest",
  );
  if (
    manifest.format !==
      "brain-s28-disposable-file-factory-build-v1" ||
    manifest.readinessClaim !== "none" ||
    manifest.disposableOnly !== true ||
    manifest.fileBackedFactoryOnly !== true ||
    manifest.productionAuthority !== false ||
    manifest.migration028Authority !== false ||
    manifest.addonExport !== NATIVE_EXPORT ||
    manifest.nodeVersion !== PINNED_NODE_VERSION ||
    manifest.nodeAbi !== PINNED_NODE_ABI ||
    manifest.sqliteVersion !== "3.49.2" ||
    manifest.sqliteSourceId !==
      "2025-05-07 10:39:52 " +
      "17144570b0d96ae63cd6f3edca39e27ebd74925252bbaf6723bcb2f6b4861fb1" ||
    manifest.platform !== "darwin" ||
    manifest.arch !== "arm64" ||
    manifest.sourceManifestSha256 !== source.sha256 ||
    manifest.nativeSourceSha256 !== source.nativeSourceSha256 ||
    manifest.buildInputSha256 !== buildInput.sha256 ||
    manifest.moduleSha256 !== result.moduleSha256 ||
    manifest.moduleFile !== NATIVE_MODULE_FILE ||
    manifest.localArtifactReleaseProvenance !== false
  ) {
    refuse();
  }
  assertLowerSha256(manifest.moduleSha256);
  assertLowerSha256(manifest.nativeSourceSha256);
  assertLowerSha256(manifest.buildInputSha256);
  assertObject(manifest.compiler, "build compiler");
  assertExactKeys(
    manifest.compiler,
    BUILD_COMPILER_KEYS,
    "build compiler",
  );
  assertObject(manifest.nodeHeaders, "build node headers");
  assertExactKeys(
    manifest.nodeHeaders,
    BUILD_NODE_HEADER_KEYS,
    "build node headers",
  );
  if (
    JSON.stringify(manifest.nodeHeaders) !==
    JSON.stringify(source.manifest.nodeHeaders)
  ) {
    refuse();
  }
  if (
    realpathSync(manifest.compiler.c) !== "/usr/bin/clang" ||
    realpathSync(manifest.compiler.cxx) !== "/usr/bin/clang++" ||
    manifest.compiler.version !== EXPECTED_COMPILER_VERSION
  ) {
    refuse();
  }
  assertObject(manifest.commands, "build commands");
  assertExactKeys(
    manifest.commands,
    BUILD_COMMAND_KEYS,
    "build commands",
  );
  for (const key of BUILD_COMMAND_KEYS) {
    const command = manifest.commands[key];
    assertObject(command, `build command ${key}`);
    assertExactKeys(
      command,
      BUILD_COMMAND_RECORD_KEYS,
      `build command ${key}`,
    );
    if (
      typeof command.command !== "string" ||
      !Array.isArray(command.arguments) ||
      command.arguments.length === 0 ||
      command.arguments.some(
        (argument) => typeof argument !== "string",
      )
    ) {
      refuse();
    }
  }
  const sqliteDirectory = join(
    buildInput.upstreamRoot,
    "deps",
    "sqlite3",
  );
  const expectedCommands = {
    sqliteCompile: {
      command: "/usr/bin/clang",
      arguments: [
        "-c",
        join(sqliteDirectory, "sqlite3.c"),
        "-o",
        join(outputDirectory, "sqlite3.o"),
        "-std=c99",
        "-w",
        ...buildInput.commonFlags,
        ...buildInput.sqliteDefines,
      ],
    },
    factoryCompile: {
      command: "/usr/bin/clang++",
      arguments: [
        "-c",
        NATIVE_SOURCE_PATH,
        "-o",
        join(outputDirectory, "brain_s28_file_factory.o"),
        "-std=c++20",
        ...buildInput.commonFlags,
        "-I",
        source.manifest.nodeHeaders.directory,
        "-I",
        sqliteDirectory,
        "-stdlib=libc++",
      ],
    },
    link: {
      command: "/usr/bin/clang++",
      arguments: [
        "-bundle",
        "-undefined",
        "dynamic_lookup",
        "-stdlib=libc++",
        join(outputDirectory, "brain_s28_file_factory.o"),
        join(outputDirectory, "sqlite3.o"),
        "-o",
        join(outputDirectory, NATIVE_MODULE_FILE),
      ],
    },
  };
  if (
    JSON.stringify(manifest.commands) !==
    JSON.stringify(expectedCommands)
  ) {
    refuse();
  }

  const cleanupIdentity = captureBuildCleanupIdentity(
    root,
    outputDirectory,
  );
  return {
    outputDirectory,
    bindingPath: realpathSync(result.bindingPath),
    moduleSha256: result.moduleSha256,
    sourceManifestSha256: result.sourceManifestSha256,
    nativeSourceSha256: manifest.nativeSourceSha256,
    buildInputSha256: manifest.buildInputSha256,
    cleanupIdentity,
  };
}

function cleanupBuildDirectory(build) {
  if (build === undefined) return;
  const identity = build.cleanupIdentity;
  let failure;
  try {
    if (
      identity === undefined ||
      identity.outputDirectory !== build.outputDirectory ||
      !basename(identity.outputDirectory).startsWith(
        "brain-s28-file-factory-build-",
      ) ||
      !sameBuildDirectoryIdentity(identity) ||
      !exactSortedEntries(
        identity.outputDirectory,
        BUILD_OUTPUT_LEAF_NAMES,
      )
    ) {
      refuse();
    }
    for (const leaf of identity.leaves) {
      const path = join(identity.outputDirectory, leaf.name);
      if (!sameBuildLeafIdentity(identity, leaf)) {
        refuse();
      }
      unlinkSync(path);
      const descriptorStat = fstatSync(
        leaf.descriptor,
        { bigint: true },
      );
      if (
        descriptorStat.dev !== leaf.device ||
        descriptorStat.ino !== leaf.inode ||
        descriptorStat.nlink !== 0n ||
        existsSync(path) ||
        !sameBuildDirectoryIdentity(identity)
      ) {
        refuse();
      }
      closeSync(leaf.descriptor);
      leaf.closed = true;
    }
    fsyncSync(identity.directoryDescriptor);
    if (
      !sameBuildDirectoryIdentity(identity) ||
      readdirSync(identity.outputDirectory).length !== 0
    ) {
      refuse();
    }
    rmdirSync(identity.outputDirectory);
    fsyncSync(identity.parentDescriptor);
    if (
      existsSync(identity.outputDirectory) ||
      !sameBuildParentIdentity(identity)
    ) {
      refuse();
    }
  } catch (error) {
    failure = error;
  }
  for (const leaf of identity?.leaves ?? []) {
    if (!leaf.closed) {
      try {
        closeSync(leaf.descriptor);
        leaf.closed = true;
      } catch (error) {
        failure ??= error;
      }
    }
  }
  for (const descriptor of [
    identity?.directoryDescriptor,
    identity?.parentDescriptor,
  ]) {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch (error) {
        failure ??= error;
      }
    }
  }
  if (failure !== undefined) refuse();
}

function assertNativeEvidence(value) {
  assertObject(value, "native evidence");
  assertExactKeys(value, NATIVE_KEYS, "native evidence");
  requireFields(value, {
    format: NATIVE_FORMAT,
    readinessClaim: "none",
    disposableOnly: true,
    nominalDisposableFileFactoryMatrixSatisfied: true,
    routeSucceeded: true,
    oracleSatisfied: true,
    sqliteVersion: "3.49.2",
    sqliteSourceId:
      "2025-05-07 10:39:52 " +
      "17144570b0d96ae63cd6f3edca39e27ebd74925252bbaf6723bcb2f6b4861fb1",
    rawDatabaseReturned: false,
    artifactPathsReturned: false,
    processIdentifiersReturned: false,
    reusableHandleReturned: false,
    checkpointCoordinatorAuthority: false,
    migration028Authority: false,
    productionAuthority: false,
    s28ReadinessProven: false,
    implementationGoProven: false,
  });

  assertObject(
    value.adversarialCoverage,
    "native adversarial coverage",
  );
  assertExactKeys(
    value.adversarialCoverage,
    NATIVE_ADVERSARIAL_COVERAGE_KEYS,
    "native adversarial coverage",
  );
  requireFields(value.adversarialCoverage, {
    hostileFilesystem: false,
    injectedFilesystemFaults: false,
    injectedSqliteFaults: false,
    abruptExitRestart: false,
  });

  assertObject(value.filesystem, "native filesystem");
  assertExactKeys(
    value.filesystem,
    NATIVE_FILESYSTEM_KEYS,
    "native filesystem",
  );
  requireFields(value.filesystem, {
    rootMode: 448,
    databaseMode: 384,
    ownerUidAttested: true,
    singleLinkAttested: true,
    descriptorRelativeCreate: true,
    sqliteNoFollowOpen: true,
    pathAnchorIdentityStable: true,
    headerAttested: true,
    readOnlyReopenAttested: true,
    sidecarsValidated: true,
    exactOwnedObjectsRemoved: true,
  });

  assertObject(value.pragmas, "native pragmas");
  assertExactKeys(value.pragmas, NATIVE_PRAGMA_KEYS, "native pragmas");
  requireFields(value.pragmas, {
    journalMode: "wal",
    foreignKeys: 1,
    recursiveTriggers: 1,
    trustedSchema: 0,
    secureDelete: 1,
    synchronous: 2,
    ignoreCheckConstraints: 0,
    walAutocheckpoint: 0,
    fullfsync: 1,
    checkpointFullfsync: 1,
  });

  assertObject(value.authorizer, "native authorizer");
  assertExactKeys(
    value.authorizer,
    NATIVE_AUTHORIZER_KEYS,
    "native authorizer",
  );
  requireFields(value.authorizer, {
    installedBeforeFirstPrepare: true,
    bootstrapPragmaCount: 20,
    initialAttestationCount: 20,
    terminalAttestationCount: 20,
    protectedBoundaryCount: 20,
    protectedPragmaReadCount: 100,
    schemaPrepareCode: 23,
    pragmaMutationPrepareCode: 23,
    defaultDenyRestored: true,
  });

  assertObject(value.writerLock, "native writer lock");
  assertExactKeys(
    value.writerLock,
    NATIVE_WRITER_LOCK_KEYS,
    "native writer lock",
  );
  requireFields(value.writerLock, {
    ownerBeginStepCode: 101,
    ownerBeginFinalizeCode: 0,
    rivalBusyStepCode: 5,
    rivalBusyFinalizeCode: 5,
    rivalBusyResetStepCode: 5,
    rivalBusyResetCode: 5,
    rivalBusyResetFinalizeCode: 0,
    ownerRollbackStepCode: 101,
    ownerRollbackFinalizeCode: 0,
    postReleaseBeginStepCode: 101,
    postReleaseBeginFinalizeCode: 0,
    postReleaseRollbackStepCode: 101,
    postReleaseRollbackFinalizeCode: 0,
  });

  assertObject(value.lifecycle, "native lifecycle");
  assertExactKeys(
    value.lifecycle,
    NATIVE_LIFECYCLE_KEYS,
    "native lifecycle",
  );
  requireFields(value.lifecycle, {
    connectionsOpened: 3,
    allStatementsFinalized: true,
    ownerRolledBack: true,
    rivalReleased: true,
    allConnectionsClosed: true,
    autocommitRestored: true,
    transactionStateNone: true,
    cleanupComplete: true,
  });

  assertObject(value.faults, "native faults");
  assertExactKeys(value.faults, NATIVE_FAULT_KEYS, "native faults");
  requireFields(value.faults, {
    activeRebindStepCode: 100,
    activeRebindCode: 21,
    activeRebindFinalizeCode: 0,
    closeBusyCode: 5,
    closeBusyFinalizeCode: 0,
    closeRecoveryCode: 0,
  });

  if (
    !Array.isArray(value.operationTrace) ||
    Object.getPrototypeOf(value.operationTrace) !== Array.prototype ||
    Object.keys(value.operationTrace).length !==
      EXPECTED_OPERATION_TRACE.length ||
    value.operationTrace.length !==
      EXPECTED_OPERATION_TRACE.length ||
    value.operationTrace.some(
      (entry, index) =>
        entry !== EXPECTED_OPERATION_TRACE[index],
    )
  ) {
    refuse();
  }
  return value;
}

function loadAndSealNativeFunction(bindingPath) {
  const addon = require(bindingPath);
  if (
    addon === null ||
    typeof addon !== "object" ||
    Object.getPrototypeOf(addon) !== Object.prototype ||
    !Object.isFrozen(addon) ||
    Reflect.ownKeys(addon).length !== 1 ||
    Reflect.ownKeys(addon)[0] !== NATIVE_EXPORT
  ) {
    refuse();
  }
  const descriptor = Object.getOwnPropertyDescriptor(
    addon,
    NATIVE_EXPORT,
  );
  if (
    descriptor === undefined ||
    descriptor.enumerable !== true ||
    descriptor.configurable !== false ||
    descriptor.writable !== false ||
    typeof descriptor.value !== "function" ||
    !Object.isFrozen(descriptor.value) ||
    descriptor.value.length !== 0 ||
    descriptor.value.name !== NATIVE_EXPORT
  ) {
    refuse();
  }
  return descriptor.value;
}

function runNativeOnce(nativeFunction) {
  const raw = Reflect.apply(nativeFunction, undefined, []);
  if (
    typeof raw !== "string" ||
    Buffer.byteLength(raw, "utf8") > MAX_NATIVE_OUTPUT_BYTES
  ) {
    refuse();
  }
  const native = parseJson(raw, "native evidence");
  if (JSON.stringify(native) !== raw) refuse();
  return assertNativeEvidence(native);
}

function operationTraceSha256(operationTrace) {
  return sha256Bytes(
    `${JSON.stringify(operationTrace)}\n`,
  );
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function runProof() {
  assertSealedInvocation();
  const source = readAndVerifySourceManifest();
  const buildInput = deriveBuildInput(source);
  let firstBuild;
  let secondBuild;
  try {
    const firstResult = runPinnedBuild();
    firstBuild = verifyBuild(
      firstResult,
      source,
      buildInput,
    );
    const first = firstBuild;
    const secondResult = runPinnedBuild();
    secondBuild = verifyBuild(
      secondResult,
      source,
      buildInput,
    );
    const second = secondBuild;
    if (
      first.moduleSha256 !== second.moduleSha256 ||
      first.sourceManifestSha256 !== second.sourceManifestSha256 ||
      first.nativeSourceSha256 !== second.nativeSourceSha256 ||
      first.buildInputSha256 !== second.buildInputSha256
    ) {
      refuse();
    }

    const nativeFunction = loadAndSealNativeFunction(
      first.bindingPath,
    );
    cleanupBuildDirectory(second);
    secondBuild = undefined;
    cleanupBuildDirectory(first);
    firstBuild = undefined;
    if (readdirSync(realpathSync(process.cwd())).length !== 0) {
      refuse();
    }

    const native = runNativeOnce(nativeFunction);
    if (readdirSync(realpathSync(process.cwd())).length !== 0) {
      refuse();
    }
    const provenance = {
      memoryOnlyPrerequisitesAttested: true,
      sourceManifestSha256: source.sha256,
      buildScriptSha256: source.buildScriptSha256,
      proofWorkerSha256: sha256File(WORKER_PATH),
      moduleSha256: first.moduleSha256,
      operationTraceSha256: operationTraceSha256(
        native.operationTrace,
      ),
      independentBuildCount: 2,
      independentModuleHashesEqual: true,
      nativeSourceHashesEqual: true,
      buildManifestInputsEqual: true,
      compilerAttested: true,
    };

    return deepFreeze({
      format: WORKER_FORMAT,
      readinessClaim: "none",
      disposableOnly: true,
      routeSucceeded: true,
      oracleSatisfied: true,
      provenance,
      host: {
        platform: "darwin",
        arch: "arm64",
        nodeVersion: process.versions.node,
        nodeAbi: process.versions.modules,
      },
      isolation: {
        pinnedPrivateRoot: true,
        ambientTempIgnored: true,
        ambientDatabasePathIgnored: true,
        sealedChildProcess: true,
        childReceivedNoRootDescriptor: true,
      },
      native,
      lifecycle: {
        independentBuildOutputsRemovedBeforeResponse: true,
        nativeTargetClosedBeforeResponse: true,
        nativeTargetRemovedBeforeResponse: true,
        workerRootEmptyBeforeResponse: true,
      },
      rawDatabaseReturned: false,
      artifactPathsReturned: false,
      processIdentifiersReturned: false,
      reusableHandleReturned: false,
      checkpointCoordinatorAuthority: false,
      migration028Executed: false,
      migration028Authority: false,
      productionAuthority: false,
      s28ReadinessProven: false,
      implementationGoProven: false,
    });
  } finally {
    cleanupBuildDirectory(secondBuild);
    cleanupBuildDirectory(firstBuild);
  }
}

try {
  const evidence = runProof();
  const output = `${JSON.stringify(evidence)}\n`;
  if (Buffer.byteLength(output, "utf8") > MAX_WORKER_OUTPUT_BYTES) {
    refuse();
  }
  process.stdout.write(output);
} catch {
  process.stderr.write(
    "Disposable file factory proof worker refused.\n",
  );
  process.exitCode = 1;
}
