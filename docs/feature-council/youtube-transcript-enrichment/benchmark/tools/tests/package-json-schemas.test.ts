import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020, { type AnySchema } from "ajv/dist/2020";
import addFormats from "ajv-formats";

import { parseJsonBytesWithoutDuplicateKeys } from "../verify-lock";

const BENCHMARK_ROOT = fileURLToPath(new URL("../../", import.meta.url));

function collectSchemaFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? collectSchemaFiles(absolute) : [absolute];
    })
    .filter((absolute) => absolute.endsWith(".schema.json"))
    .sort();
}

function parseJsonBytes(bytes: Uint8Array): unknown {
  return parseJsonBytesWithoutDuplicateKeys(bytes);
}

function parseJson(absolute: string): unknown {
  return parseJsonBytes(readFileSync(absolute));
}

test("schema-authority loader rejects duplicate JSON keys and malformed UTF-8", () => {
  assert.throws(() => parseJsonBytes(Buffer.from('{"value":1,"value":2}', "utf8")));
  assert.throws(() => parseJsonBytes(Uint8Array.of(0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d)));
});

test("strictly compiles every benchmark schema and validates every present frozen JSON authority", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);

  const schemas = collectSchemaFiles(BENCHMARK_ROOT);
  assert.ok(schemas.length >= 20, "the complete benchmark schema tree must be in scope");
  for (const schemaPath of schemas) ajv.addSchema(parseJson(schemaPath) as AnySchema);
  for (const schemaPath of schemas) {
    const schema = parseJson(schemaPath) as { $id?: string };
    assert.ok(schema.$id, `${path.relative(BENCHMARK_ROOT, schemaPath)} must declare an $id`);
    assert.ok(ajv.getSchema(schema.$id), `${schema.$id} must compile under strict draft-2020-12 validation`);
  }

  const instances: Array<[string, string]> = [
    ["METHOD_ITEM_MATRIX.json", "https://brain.arunp.in/schemas/youtube-method-item-matrix-v1.1.json"],
    ["PRESEAL_READINESS.json", "https://brain.arunp.in/schemas/youtube-preseal-readiness-v1.json"],
    ["REFERENCE_LEDGER.json", "https://brain.arunp.in/schemas/youtube-reference-ledger-v1.2.json"],
    ["model/EVALUATOR_EXECUTION_CONTRACT.json", "https://brain.arunp.in/schemas/youtube-evaluator-execution-contract-v1.1.json"],
    ["model/A1_EXECUTION_CONTRACT.json", "https://brain.arunp.in/schemas/youtube-a1-execution-contract-v1.json"],
    ["model/KEY_POINT_RUBRIC.json", "https://brain.arunp.in/schemas/youtube-public-key-point-rubric-v1.json"],
    ["model/LOCAL_DERIVATION_AUTHORIZATION.json", "https://brain.arunp.in/schemas/youtube-local-derivation-authorization-v1.json"],
    ["model/LOCAL_MODEL_RUNTIME_LEDGER.json", "https://brain.arunp.in/schemas/youtube-local-model-runtime-ledger-v1.json"],
    ...Array.from({ length: 9 }, (_, index): [string, string] => [
      `attestations/YT-${String(index + 1).padStart(2, "0")}.json`,
      "https://brain.arunp.in/schemas/youtube-a1-attestation-v1.2.json",
    ]),
  ];

  for (const [relative, schemaId] of instances) {
    const validate = ajv.getSchema(schemaId);
    assert.ok(validate, `${schemaId} must be registered`);
    const valid = validate(parseJson(path.join(BENCHMARK_ROOT, relative)));
    assert.equal(valid, true, `${relative} must validate: ${ajv.errorsText(validate.errors)}`);
  }

  const claim = {
    schema_version: "1.0",
    operator_version: "1.1.0",
    publication_eligible: false,
    seal: {
      content_commit: "a".repeat(40),
      seal_commit: "b".repeat(40),
      lock_sha256: "c".repeat(64),
    },
    cell: {
      stage: "gate1-primary",
      item_id: "YT-01",
      expected_outcome: "eligible_pass",
    },
    execution_contract: {
      identity_sha256: "7601a0335c32c230ad13311ff88475102db52112a4f13c437742e13173a81f3e",
      execution_boundary: "development_test_only",
      private_evidence_binding:
        "sealed_source_and_anchor_authorities_no_path_device_or_user_identifier",
    },
    scope: {
      uniqueness: "authoritative_worktree_only",
      residual_limitation:
        "copied_repositories_malicious_claim_deletion_or_same_user_forgery_require_procedural_external_audit",
    },
  };
  const claimValidate = ajv.getSchema(
    "https://brain.arunp.in/schemas/youtube-a1-attempt-claim-v1.json",
  );
  assert.ok(claimValidate);
  assert.equal(claimValidate(claim), true, ajv.errorsText(claimValidate.errors));
  assert.equal(claimValidate({ ...claim, raw_path: "/private/source" }), false);

  const contractBytes = readFileSync(path.join(BENCHMARK_ROOT, "model/A1_EXECUTION_CONTRACT.json"));
  assert.equal(
    createHash("sha256").update(contractBytes).digest("hex"),
    claim.execution_contract.identity_sha256,
    "attempt identity must be the exact frozen A1 execution-contract file digest",
  );

  const receiptValidate = ajv.getSchema(
    "https://brain.arunp.in/schemas/youtube-a1-operator-receipt-v1.1.json",
  );
  assert.ok(receiptValidate);
  const receipt = {
    schema_version: "1.1",
    operator_version: "1.1.0",
    seal: claim.seal,
    cell: claim.cell,
    execution_boundary: "development_test_only",
    publication_eligible: false,
    attempt_claim_sha256: "d".repeat(64),
    process: { harness_exit_code: 0, scorer_exit_code: 0 },
    hashes: {
      harness_report_sha256: "e".repeat(64),
      normalized_transcript_sha256: "f".repeat(64),
      scorer_options_sha256: "0".repeat(64),
      scorer_report_sha256: "1".repeat(64),
      database_sha256: "2".repeat(64),
    },
    outcomes: {
      expected_outcome_observed: true,
      rerun_policy: "reject_if_claim_or_fixed_cell_receipt_or_terminal_exists_before_any_attempt_write",
      selection_policy: "fixed_seal_stage_item_paths_no_caller_selected_evidence",
    },
  };
  assert.equal(receiptValidate(receipt), true, ajv.errorsText(receiptValidate.errors));
  assert.equal(receiptValidate({ ...receipt, private_path: "/private/output" }), false);

  const terminalValidate = ajv.getSchema(
    "https://brain.arunp.in/schemas/youtube-a1-attempt-terminal-v1.json",
  );
  assert.ok(terminalValidate);
  const terminal = {
    schema_version: "1.0",
    operator_version: "1.1.0",
    seal: claim.seal,
    cell: claim.cell,
    execution_boundary: "development_test_only",
    publication_eligible: false,
    attempt_claim_sha256: "d".repeat(64),
    terminal: {
      state: "failed",
      error_code: "A1_OPERATOR_CHILD_FAILED",
      harness: {
        exit_code: null,
        signal: "SIGTERM",
        timed_out: false,
        stdout_sha256: "e".repeat(64),
        stdout_byte_count: 1024,
        stdout_truncated: true,
        stderr_sha256: "f".repeat(64),
        stderr_byte_count: 0,
        stderr_truncated: false,
      },
      scorer: null,
    },
    outcomes: {
      rerun_permitted: false,
      raw_child_content_published: false,
      claim_without_terminal_after_hard_termination: "aborted_no_pass",
    },
  };
  assert.equal(terminalValidate(terminal), true, ajv.errorsText(terminalValidate.errors));
  assert.equal(terminalValidate({ ...terminal, stderr: "raw child output" }), false);
});
