#!/usr/bin/env node
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { TextDecoder } from "node:util";

import {
  BlindedEvaluationError,
  validateConsentAttestation,
  type ConsentAttestation,
} from "./blinded-evaluation";
import { generateSealedBlindedPacketPackage } from "./blinded-packet-operator";
import { finalizeSealedBlindedEvaluation } from "./gate4-finalizer";
import { runLocalBlindedEvaluator, type LocalEvaluatorRole } from "./local-blinded-evaluator";
import { parseJsonWithoutDuplicateKeys } from "./verify-lock";

const PACKAGE_OPTIONS = [
  "project-root", "private-evidence-root", "gate4-private-root", "runtime-dir", "model", "consent-attestation",
] as const;
const RUN_OPTIONS = ["project-root", "private-evidence-root", "role", "runtime-dir", "model"] as const;
const FINALIZE_OPTIONS = ["project-root", "private-evidence-root"] as const;

function parseOptions(argv: string[], allowed: readonly string[]): Map<string, string> {
  const result = new Map<string, string>();
  if (argv.length !== allowed.length * 2) throw new Error("Every fixed option must be supplied exactly once");
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) throw new Error("Every option requires one value");
    const key = flag.slice(2);
    if (!allowed.includes(key) || result.has(key)) throw new Error(`Unknown or duplicate option: ${flag}`);
    result.set(key, value);
  }
  for (const key of allowed) if (!result.has(key)) throw new Error(`Missing option: --${key}`);
  return result;
}

async function readConsent(filePath: string): Promise<ConsentAttestation> {
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) {
    throw new BlindedEvaluationError("CONSENT_UNAVAILABLE", "consent attestation is missing or linked");
  }
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size < 1 || before.size > 64 * 1024 || before.nlink !== 1) {
      throw new BlindedEvaluationError(
        "CONSENT_UNAVAILABLE",
        "consent attestation must be one bounded regular file",
      );
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      bytes.byteLength !== before.size
      || after.dev !== before.dev
      || after.ino !== before.ino
      || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs
    ) {
      throw new BlindedEvaluationError("CONSENT_UNAVAILABLE", "consent attestation changed while read");
    }
    let value: unknown;
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      value = parseJsonWithoutDuplicateKeys(text);
    } catch {
      throw new BlindedEvaluationError(
        "CONSENT_UNAVAILABLE",
        "consent attestation must be fatal-UTF-8 duplicate-key-free JSON",
      );
    }
    return validateConsentAttestation(value, new Date());
  } finally {
    await handle.close();
  }
}

async function main(argv: string[]): Promise<void> {
  const command = argv[0];
  if (command === "package") {
    const values = parseOptions(argv.slice(1), PACKAGE_OPTIONS);
    const result = await generateSealedBlindedPacketPackage({
      projectRoot: values.get("project-root")!,
      privateEvidenceRoot: values.get("private-evidence-root")!,
      gate4PrivateRoot: values.get("gate4-private-root")!,
      runtimeDir: values.get("runtime-dir")!,
      modelPath: values.get("model")!,
      consent: await readConsent(values.get("consent-attestation")!),
    });
    process.stdout.write(`${JSON.stringify({ state: "written_exclusively", seal_commit: result.bundle.seal_commit, bundle_sha256: result.receipt.bundle_sha256 })}\n`);
    return;
  }
  if (command === "run") {
    const values = parseOptions(argv.slice(1), RUN_OPTIONS);
    const role = values.get("role") as LocalEvaluatorRole;
    if (!["evaluator_a", "evaluator_b", "adjudicator"].includes(role)) throw new Error("--role must be evaluator_a, evaluator_b, or adjudicator");
    const result = await runLocalBlindedEvaluator({
      executionClass: "SEALED",
      projectRoot: values.get("project-root")!,
      privateEvidenceRoot: values.get("private-evidence-root")!,
      role,
      runtimeDir: values.get("runtime-dir")!,
      modelPath: values.get("model")!,
    });
    process.stdout.write(`${JSON.stringify({ state: result.report.state, role, packet_id: result.report.packet_id, result_sha256: result.report.result_sha256 })}\n`);
    process.exitCode = result.report.state === "succeeded" ? 0 : 1;
    return;
  }
  if (command === "finalize") {
    const values = parseOptions(argv.slice(1), FINALIZE_OPTIONS);
    const result = await finalizeSealedBlindedEvaluation({
      projectRoot: values.get("project-root")!,
      privateEvidenceRoot: values.get("private-evidence-root")!,
    });
    process.stdout.write(`${JSON.stringify({ state: "written_exclusively", seal_commit: result.aggregate.seal_commit, aggregate_sha256: result.sha256 })}\n`);
    return;
  }
  throw new Error("Usage: blinded-evaluation-cli.ts <package|run|finalize> with the fixed documented options");
}

void main(process.argv.slice(2)).catch((error: unknown) => {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "BLINDED_EVALUATION_CLI_FAILED";
  process.stderr.write(`${JSON.stringify({ state: "failed", code, external_provider_calls: 0, external_content_transfer: false })}\n`);
  process.exitCode = 1;
});
