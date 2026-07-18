import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import Ajv2020, { type AnySchema } from "ajv/dist/2020";
import addFormats from "ajv-formats";

import { parseJsonBytesWithoutDuplicateKeys } from "../verify-lock";

const schemaPath = fileURLToPath(new URL("../../REFERENCE_LEDGER.schema.json", import.meta.url));
const ledgerPath = fileURLToPath(new URL("../../REFERENCE_LEDGER.json", import.meta.url));

type Ledger = {
  items: Array<Record<string, unknown>>;
};

function loadJson(path: string): unknown {
  return parseJsonBytesWithoutDuplicateKeys(readFileSync(path));
}

test("reference-ledger schema enforces exact ordered item semantics independently", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(loadJson(schemaPath) as AnySchema);
  const ledger = loadJson(ledgerPath) as Ledger;
  assert.equal(validate(ledger), true, JSON.stringify(validate.errors));

  const mutations: Array<[string, (value: Ledger) => void]> = [
    ["wrong ordered ID", (value) => { value.items[0].item_id = "YT-02"; }],
    ["duplicate ID", (value) => { value.items[1].item_id = "YT-01"; }],
    [
      "cross-item preparation path",
      (value) => {
        value.items[0].preparation_private_relative_path =
          "references/YT-02.anchors.private.json";
      },
    ],
    ["YT-04 cue-limit mismatch", (value) => { value.items[3].cue_count = 7_200; }],
    [
      "YT-04 class mismatch",
      (value) => { value.items[3].state = "expected_structural_rejection"; },
    ],
    [
      "structural-rejection preflight mismatch",
      (value) => { value.items[2].preflight_state = "passed"; },
    ],
  ];

  for (const [label, mutate] of mutations) {
    const changed = structuredClone(ledger);
    mutate(changed);
    assert.equal(validate(changed), false, `${label} unexpectedly passed standalone schema validation`);
  }
});
