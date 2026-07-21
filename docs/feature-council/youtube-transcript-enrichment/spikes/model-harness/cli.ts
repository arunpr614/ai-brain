#!/usr/bin/env node
import { HarnessError, runLocalModelHarness, type HarnessOptions } from "./harness";

const optionNames = [
  "execution-class", "project-root", "item-id", "runtime-dir", "model", "authorization-ledger",
  "attestation", "normalized-transcript", "system-prompt", "format-repair-prompt", "output-schema",
  "key-point-rubric", "sandbox-profile", "private-output-dir", "private-evidence-root",
] as const;

function parseArgs(argv: string[]): HarnessOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error("Every option requires one value");
    }
    const name = flag.slice(2);
    if (!optionNames.includes(name as (typeof optionNames)[number]) || values.has(name)) {
      throw new Error(`Unknown or duplicate option: ${flag}`);
    }
    values.set(name, value);
  }
  for (const name of optionNames) if (!values.has(name)) throw new Error(`Missing required option: --${name}`);
  if (values.get("execution-class") !== "SEALED") {
    throw new Error("The command-line harness only permits --execution-class SEALED");
  }
  return {
    executionClass: "SEALED",
    projectRoot: values.get("project-root")!,
    itemId: values.get("item-id")!,
    runtimeDir: values.get("runtime-dir")!,
    modelPath: values.get("model")!,
    authorizationLedgerPath: values.get("authorization-ledger")!,
    attestationPath: values.get("attestation")!,
    normalizedTranscriptPath: values.get("normalized-transcript")!,
    systemPromptPath: values.get("system-prompt")!,
    formatRepairPromptPath: values.get("format-repair-prompt")!,
    outputSchemaPath: values.get("output-schema")!,
    keyPointRubricPath: values.get("key-point-rubric")!,
    sandboxProfilePath: values.get("sandbox-profile")!,
    privateOutputDir: values.get("private-output-dir")!,
    privateEvidenceRoot: values.get("private-evidence-root")!,
  };
}

try {
  const report = await runLocalModelHarness(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify({ run_id: report.run_id, run_state: report.run_state, item_id: report.item_id })}\n`);
  process.exitCode = report.run_state === "succeeded" ? 0 : 1;
} catch (error) {
  const code = error instanceof HarnessError ? error.code : "HARNESS_ARGUMENT_OR_INTERNAL_ERROR";
  process.stderr.write(`${JSON.stringify({ state: "failed", code, truthful_user_state: "enrichment_unavailable_transcript_preserved" })}\n`);
  process.exitCode = 1;
}
