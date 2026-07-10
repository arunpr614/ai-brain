#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";

const tempEnvPath = `data/private/recall-live-spikes/recall-env-init-smoke-${process.pid}-${Date.now()}.env`;

try {
  const stdoutTemplate = run(["scripts/init-recall-env.mjs", "--stdout"], {
    expectStatus: 0,
    label: "stdout template",
  });
  assert(stdoutTemplate.stdout.includes('export RECALL_API_KEY=""'), "template must keep API key empty");
  assert(
    stdoutTemplate.stdout.includes("export BRAIN_RECALL_CONFIRM_LIVE_API=0"),
    "template must default live API confirmation to 0",
  );
  assert(!stdoutTemplate.stdout.includes("sk_"), "template must not include an API-key-shaped value");

  run(["scripts/init-recall-env.mjs", "--path", "/tmp/recall.env"], {
    expectStatus: 2,
    label: "unsafe path refusal",
  });

  run(["scripts/init-recall-env.mjs", "--path", "data/private/recall-live-spikes/../../recall.env"], {
    expectStatus: 2,
    label: "path traversal refusal",
  });

  const firstWrite = run(["scripts/init-recall-env.mjs", "--path", tempEnvPath], {
    expectStatus: 0,
    label: "private write",
  });
  const firstWriteJson = parseJson(firstWrite.stdout, "private write");
  assert(firstWriteJson.ok === true, "private write must report ok");
  assert(firstWriteJson.privateIgnoreChecked === true, "private write must run private ignore check");
  assert(firstWriteJson.containsApiKeyValue === false, "private write must report no API key value");
  assert(firstWriteJson.liveApiConfirmationDefault === "0", "private write must report confirmation default");
  assert(existsSync(tempEnvPath), "private write must create the temp env file");

  const mode = statSync(tempEnvPath).mode & 0o777;
  assert(mode === 0o600, `temp env file must be 0600, got ${mode.toString(8)}`);

  const written = readFileSync(tempEnvPath, "utf8");
  assert(written.includes('export RECALL_API_KEY=""'), "written template must keep API key empty");
  assert(written.includes("export BRAIN_RECALL_CONFIRM_LIVE_API=0"), "written template must default confirmation to 0");
  assert(!written.includes("redacted-local-smoke"), "written template must not include smoke secret values");

  run(["scripts/init-recall-env.mjs", "--path", tempEnvPath], {
    expectStatus: 3,
    label: "overwrite refusal",
  });

  const forcedWrite = run(["scripts/init-recall-env.mjs", "--path", tempEnvPath, "--force"], {
    expectStatus: 0,
    label: "force overwrite",
  });
  const forcedWriteJson = parseJson(forcedWrite.stdout, "force overwrite");
  assert(forcedWriteJson.overwritten === true, "force overwrite must report overwritten=true");
} finally {
  if (existsSync(tempEnvPath)) rmSync(tempEnvPath, { force: true });
}

assert(!existsSync(tempEnvPath), "smoke temp env file must be removed");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "stdout template has empty API key",
        "stdout template keeps confirmation disabled",
        "unsafe path refusal",
        "path traversal refusal",
        "private write after ignore check",
        "0600 private file permission",
        "overwrite refusal",
        "force overwrite",
        "temp file cleanup",
      ],
      noPersistentPrivateEnvFile: true,
    },
    null,
    2,
  ),
);

function run(args, { expectStatus, label }) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      RECALL_API_KEY: "redacted-local-smoke",
    },
  });
  if (result.status !== expectStatus) {
    throw new Error(
      `${label} expected exit ${expectStatus}, got ${result.status}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    );
  }
  return result;
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} did not return JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
