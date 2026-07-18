#!/usr/bin/env node

import {
  assertBootstrapEnvironment,
  parseCliOptions,
} from "./bootstrap";
import { installConsoleQuarantine } from "./console-quarantine";
import { A1HarnessError } from "./errors";
import {
  installFailFastNetworkGuard,
  type InstalledNetworkGuard,
} from "./network-guard";

interface SafeFailureReport {
  schema_version: "1.0";
  harness_version: "1.0.0";
  status: "fail";
  error_code: string;
  detail_code?: string;
  counts: {
    network_attempt_count: number;
    suppressed_console_count: number;
  };
  hashes: {
    suppressed_console_sha256: string;
  };
  network_attempts: InstalledNetworkGuard["attempts"];
}

async function main(): Promise<void> {
  let guard: InstalledNetworkGuard | undefined;
  let quarantine: ReturnType<typeof installConsoleQuarantine> | undefined;
  let emitted: unknown;
  let failed = false;

  try {
    const options = parseCliOptions(process.argv.slice(2));
    const context = assertBootstrapEnvironment(options);
    process.umask(0o077);

    // Installed before harness.ts is loaded. harness.ts, in turn, validates
    // all locked local inputs before its narrow dynamic application imports.
    guard = installFailFastNetworkGuard();
    quarantine = installConsoleQuarantine();
    const { runA1Harness } = await import("./harness");
    const report = await runA1Harness(context, guard);
    emitted = {
      ...report,
      runtime: quarantine.snapshot(),
    };
  } catch (error) {
    failed = true;
    const evidence = quarantine?.snapshot() ?? {
      suppressed_console_count: 0,
      suppressed_console_sha256:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    };
    const known = error instanceof A1HarnessError ? error : undefined;
    const failure: SafeFailureReport = {
      schema_version: "1.0",
      harness_version: "1.0.0",
      status: "fail",
      error_code: known?.code ?? "UNEXPECTED_FAILURE",
      ...(known?.detailCode ? { detail_code: known.detailCode } : {}),
      counts: {
        network_attempt_count: guard?.attempts.length ?? 0,
        suppressed_console_count: evidence.suppressed_console_count,
      },
      hashes: {
        suppressed_console_sha256: evidence.suppressed_console_sha256,
      },
      network_attempts: guard?.attempts ?? [],
    };
    emitted = failure;
  } finally {
    // The CLI is a one-shot process. Keep console quarantine, the egress guard,
    // and the private umask installed through process termination so a stray
    // late callback cannot print raw data, regain a network surface, or create
    // a group/world-readable file.
  }

  process.stdout.write(`${JSON.stringify(emitted)}\n`);
  if (failed) process.exitCode = 1;
}

void main();
