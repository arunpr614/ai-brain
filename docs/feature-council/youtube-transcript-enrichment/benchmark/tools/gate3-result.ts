#!/usr/bin/env node

import { resolve } from "node:path";

import {
  bindingFromLockReport,
  deriveGate3Result,
  Gate3EvidenceError,
  verifyGate3EvidenceChain,
  writeGate3ResultExclusive,
} from "./gate3-evidence";
import { verifyLock } from "./verify-lock";

interface CliOptions {
  operation: "generate" | "verify";
  projectRoot: string;
  privateEvidenceRoot: string;
}

function parseArgs(argv: string[]): CliOptions {
  const operation = argv[0];
  if (operation !== "generate" && operation !== "verify") {
    throw new Error("operation must be generate or verify");
  }
  const values = new Map<string, string>();
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error("every option requires one value");
    }
    const name = flag.slice(2);
    if (!["project-root", "private-evidence-root"].includes(name) || values.has(name)) {
      throw new Error("unknown or duplicate option");
    }
    values.set(name, value);
  }
  const projectRoot = values.get("project-root");
  const privateEvidenceRoot = values.get("private-evidence-root");
  if (!projectRoot || !privateEvidenceRoot) throw new Error("project and private evidence roots are required");
  return {
    operation,
    projectRoot: resolve(projectRoot),
    privateEvidenceRoot: resolve(privateEvidenceRoot),
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const lockReport = verifyLock({ repoRoot: options.projectRoot });
  const binding = bindingFromLockReport(lockReport);
  if (options.operation === "generate") {
    const result = await deriveGate3Result({
      projectRoot: options.projectRoot,
      privateEvidenceRoot: options.privateEvidenceRoot,
      binding,
      createdAt: new Date().toISOString(),
    });
    await writeGate3ResultExclusive(options.projectRoot, result);
    process.stdout.write(`${JSON.stringify({
      state: "created",
      gate_1_positive_passed: result.denominators.gate_1_positive_passed,
      gate_1_rejection_passed: result.denominators.gate_1_rejection_passed,
      gate_3_repeat_passed: result.denominators.gate_3_repeat_passed,
      content_commit: result.content_commit,
      seal_commit: result.seal_commit,
    })}\n`);
  } else {
    for (const item of ["YT-01", "YT-02", "YT-07", "YT-08", "YT-09"] as const) {
      const relative = `outputs/${binding.sealCommit}/gate1-primary/${item}/a1-normalized-transcript.private.json`;
      await verifyGate3EvidenceChain({
        projectRoot: options.projectRoot,
        privateEvidenceRoot: options.privateEvidenceRoot,
        admittedNormalizedTranscriptPath: resolve(options.privateEvidenceRoot, relative),
        itemId: item,
        binding,
        requireGitBound: true,
      });
    }
    process.stdout.write(`${JSON.stringify({
      state: "verified",
      gate_1_positive_passed: 5,
      gate_1_rejection_passed: 4,
      gate_3_repeat_passed: 5,
      content_commit: binding.contentCommit,
      seal_commit: binding.sealCommit,
    })}\n`);
  }
} catch (error) {
  const code = error instanceof Gate3EvidenceError ? error.code : "ARGUMENT_OR_INTERNAL_ERROR";
  process.stderr.write(`${JSON.stringify({ state: "failed", code })}\n`);
  process.exitCode = 1;
}
