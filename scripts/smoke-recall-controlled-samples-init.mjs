#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, rmSync, statSync } from "node:fs";

const tempManifestPath = `data/private/recall-live-spikes/controlled-samples-init-smoke-${process.pid}-${Date.now()}.json`;

try {
  const stdoutTemplate = run(["scripts/init-recall-controlled-samples.mjs", "--stdout"], {
    expectStatus: 0,
    label: "stdout template",
  });
  const template = parseJson(stdoutTemplate.stdout, "stdout template");
  assert(Array.isArray(template.samples), "template samples must be an array");
  assert(template.samples.length === 6, "template must include six controlled samples");
  assert(
    template.samples.some((sample) => sample.label === "sample-no-url" && sample.sourceUrl === null),
    "template must include no-url sample with null sourceUrl",
  );
  assert(
    template.samples.every(
      (sample) =>
        sample.allowTitleInPublicReport === false &&
        sample.allowSourceUrlInPublicReport === false,
    ),
    "template privacy booleans must default false",
  );
  assert(template.negativeControl?.label === "outside-window", "template must include negative control");

  run(["scripts/init-recall-controlled-samples.mjs", "--path", "/tmp/controlled-samples.json"], {
    expectStatus: 2,
    label: "unsafe path refusal",
  });

  run(
    [
      "scripts/init-recall-controlled-samples.mjs",
      "--path",
      "data/private/recall-live-spikes/../../controlled-samples.json",
    ],
    {
      expectStatus: 2,
      label: "path traversal refusal",
    },
  );

  const firstWrite = run(
    ["scripts/init-recall-controlled-samples.mjs", "--path", tempManifestPath],
    {
      expectStatus: 0,
      label: "private write",
    },
  );
  const firstWriteJson = parseJson(firstWrite.stdout, "private write");
  assert(firstWriteJson.ok === true, "private write must report ok");
  assert(firstWriteJson.privateIgnoreChecked === true, "private write must run private ignore check");
  assert(existsSync(tempManifestPath), "private write must create the temp manifest");

  const mode = statSync(tempManifestPath).mode & 0o777;
  assert(mode === 0o600, `temp manifest must be 0600, got ${mode.toString(8)}`);

  run(["scripts/init-recall-controlled-samples.mjs", "--path", tempManifestPath], {
    expectStatus: 3,
    label: "overwrite refusal",
  });

  const forcedWrite = run(
    ["scripts/init-recall-controlled-samples.mjs", "--path", tempManifestPath, "--force"],
    {
      expectStatus: 0,
      label: "force overwrite",
    },
  );
  const forcedWriteJson = parseJson(forcedWrite.stdout, "force overwrite");
  assert(forcedWriteJson.overwritten === true, "force overwrite must report overwritten=true");
} finally {
  if (existsSync(tempManifestPath)) rmSync(tempManifestPath, { force: true });
}

assert(!existsSync(tempManifestPath), "smoke temp manifest must be removed");

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: [
        "stdout template shape",
        "unsafe path refusal",
        "path traversal refusal",
        "private write after ignore check",
        "0600 private file permission",
        "overwrite refusal",
        "force overwrite",
        "temp file cleanup",
      ],
      noPersistentPrivateManifest: true,
    },
    null,
    2,
  ),
);

function run(args, { expectStatus, label }) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
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
