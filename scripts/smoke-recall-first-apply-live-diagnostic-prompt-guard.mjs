#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const PROMPT_WRAPPER = resolve("scripts/run-recall-first-apply-live-diagnostic-prompt.mjs");
const TEST_KEY = "sk_test_prompt_guard_should_not_be_read_12345";

const selfTest = spawnSync(process.execPath, ["--", PROMPT_WRAPPER, "--prompt-guard-self-test"], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: scrubEnv(process.env),
});
assert(selfTest.status === 0, `prompt guard self-test should pass; status=${selfTest.status}`);
const selfTestJson = parseJson(selfTest.stdout, "prompt guard self-test stdout");
assert(
  selfTestJson.mode === "first_apply_live_read_diagnostic_prompt_guard_self_test",
  "prompt guard self-test should report the guard self-test mode",
);
assert(
  selfTestJson.checked?.includes("internal no-live preflight runs before any key prompt or stdin read"),
  "prompt guard self-test should prove internal preflight before key entry",
);
assert(selfTestJson.preflight?.controlledArgCases >= 8, "prompt guard self-test should cover controlled arg cases");
assert(selfTestJson.preflight?.allowedArgCases >= 6, "prompt guard self-test should cover allowed wrapper args");
assertNoSecret(selfTest.stdout, "prompt guard self-test");

const cases = [
  ["--probe-api-key-env=RECALL_API_KEY"],
  ["--probe-api-key-env", "RECALL_API_KEY"],
  ["--probe-env-file=data/private/recall-live-spikes/recall.env"],
  ["--probe-env-file", "data/private/recall-live-spikes/recall.env"],
  ["--probe-no-env-file"],
  ["--api-key-env=RECALL_API_KEY"],
  ["--api-key-env", "RECALL_API_KEY"],
  ["--no-env-file"],
];

for (const args of cases) {
  const result = spawnSync(
    process.execPath,
    ["--", PROMPT_WRAPPER, "--read-key-from-stdin", "--confirm-live-api", ...args],
    {
      cwd: process.cwd(),
      input: `${TEST_KEY}\n`,
      encoding: "utf8",
      env: scrubEnv(process.env),
    },
  );

  assert(result.status === 2, `${args.join(" ")} should fail before prompting; status=${result.status}`);
  const output = `${result.stdout}\n${result.stderr}`;
  assert(output.includes("controlled_probe_argument"), `${args.join(" ")} should name controlled_probe_argument`);
  assertNoSecret(output, args.join(" "));
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "prompt guard self-test proves internal no-live preflight before key entry",
        "prompt guard rejects controlled probe flags before reading stdin",
        "prompt guard covers exact and equals-form probe credential flags",
        "prompt guard prints no secret-shaped values",
      ],
      cases: cases.length,
    },
    null,
    2,
  ),
);

function scrubEnv(env) {
  const next = { ...env };
  delete next.RECALL_API_KEY;
  delete next.RECALL_EPHEMERAL_API_KEY;
  delete next.RECALL_PROMPT_LIVE_DIAGNOSTIC_API_KEY;
  delete next.BRAIN_RECALL_CONFIRM_LIVE_API;
  return next;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertNoSecret(output, label) {
  assert(!String(output).includes(TEST_KEY), `${label} leaked the supplied test key`);
  assert(!/sk_test_[A-Za-z0-9_]+/i.test(String(output)), `${label} leaked a secret-shaped value`);
  assert(!/Bearer\s+sk_/i.test(String(output)), `${label} leaked a bearer token`);
  assert(!String(output).includes("RECALL_API_KEY="), `${label} printed env contents`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
