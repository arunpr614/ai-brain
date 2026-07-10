#!/usr/bin/env node
import { createServer } from "node:http";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

const ACK =
  "I confirm the rotated Recall API key in the ignored local private Recall env file should be installed into the production Recall system env file and verified with a read-only Recall auth probe.";
const TEST_KEY = "sk_test_production_env_key_install_secret_12345";
const checkpoint = "2026-06-24T15:54:17.000Z";
const scratch = mkdtempSync(join(tmpdir(), "recall-production-env-key-install-"));
const localEnvPath = join("data/private/recall-live-spikes", `smoke-production-env-key-install-${process.pid}.env`);
const remoteRoot = join(scratch, "remote-root");
const remoteEnvPath = join(remoteRoot, "etc/brain/.env");
const fakeSshPath = join(scratch, "fake-ssh.sh");
const requests = [];

const server = createServer((request, response) => {
  requests.push({
    method: request.method,
    url: request.url,
    authorization: request.headers.authorization ?? null,
  });
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ results: [], total_count: 0 }));
});

try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
  setup();

  const missingAck = await runInstall({});
  assert(missingAck.status === 1, "installer should refuse without exact acknowledgement");
  const missingAckJson = parseMaybeJson(missingAck.stderr);
  assert(missingAckJson.productionEnvWriteAttempted === false, "missing ack must not write production env");
  assert(requests.length === 0, "missing ack must not call Recall");
  assert(!readFileSync(remoteEnvPath, "utf8").includes("RECALL_API_KEY"), "missing ack must not add key");

  const approved = await runInstall({ BRAIN_RECALL_PRODUCTION_KEY_INSTALL_ACK: ACK }, baseUrl);
  assert(approved.status === 0, `approved install should pass\n${approved.stderr}`);
  const approvedJson = JSON.parse(approved.stdout);
  assert(approvedJson.ok === true, "approved install output should be ok");
  assert(approvedJson.productionEnvWriteAttempted === true, "approved install should write production env");
  assert(approvedJson.readOnlyRecallAuthProbeAttempted === true, "approved install should attempt read-only probe");
  assert(approvedJson.aiBrainWriteAttempted === false, "approved install must not write AI Brain rows");
  assert(approvedJson.recallImportAttempted === false, "approved install must not import Recall data");
  assert(approvedJson.schedulerEnablementAttempted === false, "approved install must not enable scheduler");
  assert(approvedJson.checkpointMovementAttempted === false, "approved install must not move checkpoint");
  assert(approvedJson.remote.before.hadRecallApiKey === false, "fake production starts without Recall key");
  assert(approvedJson.remote.after.hasRecallApiKey === true, "fake production should have Recall key after install");
  assert(approvedJson.remote.after.liveConfirmDefault === "0", "live confirmation must stay disabled by default");
  assert(approvedJson.remote.liveAuthProbe.ok === true, "read-only live probe should pass");
  assert(approvedJson.remote.keyEvidence.ok === true, "key evidence should pass after system env update");
  assert(approvedJson.remote.keyEvidence.evidenceSource === "env_file_mtime", "key evidence should pass from system env mtime");
  assert(requests.length === 1, "approved install should make exactly one Recall request");
  assert(requests[0].url.startsWith("/api/v1/cards?"), "approved install should call /cards");
  assert(requests[0].authorization === `Bearer ${TEST_KEY}`, "approved install should authenticate with installed key");
  assert((statSync(remoteEnvPath).mode & 0o777) === 0o640, "production env mode should be preserved");
  assert(readFileSync(remoteEnvPath, "utf8").includes(TEST_KEY), "remote env should contain the installed key");
  assert(readFileSync(remoteEnvPath, "utf8").includes("BRAIN_API_TOKEN=redacted-brain-token"), "remote env should preserve existing values");

  const combined = [missingAck.stdout, missingAck.stderr, approved.stdout, approved.stderr].join("\n");
  assertNoSecret(combined, "installer output");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "production env key installer refuses before key read or remote write without exact acknowledgement",
          "production env key installer copies the rotated local private key into fake production without printing it",
          "production env key installer preserves existing production env values and keeps live confirmation disabled",
          "production env key installer runs exactly one read-only Recall auth probe after acknowledgement",
          "production env key installer makes the system env-file key evidence gate pass from env-file mtime",
          "production env key installer does not import Recall data, write AI Brain rows, enable scheduler, or move checkpoint",
        ],
        smokeOnly: true,
      },
      null,
      2,
    ),
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
  rmSync(scratch, { recursive: true, force: true });
  rmSync(localEnvPath, { force: true });
}

function setup() {
  mkdirSync(dirname(localEnvPath), { recursive: true });
  writeFileSync(localEnvPath, `export RECALL_API_KEY="${TEST_KEY}"\nexport BRAIN_RECALL_CONFIRM_LIVE_API=0\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  chmodSync(localEnvPath, 0o600);

  const files = [
    "scripts/run-recall-live-auth-probe.mjs",
    "scripts/check-recall-key-rotation-evidence.mjs",
    "scripts/lib/recall-env-file.mjs",
    "scripts/lib/recall-controlled-samples.mjs",
  ];
  for (const file of files) {
    const target = join(remoteRoot, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(file, "utf8"), "utf8");
  }

  mkdirSync(dirname(remoteEnvPath), { recursive: true });
  writeFileSync(remoteEnvPath, "BRAIN_API_TOKEN=redacted-brain-token\nBRAIN_DB_PATH=/opt/brain/data/brain.db\n", {
    encoding: "utf8",
    mode: 0o640,
  });
  chmodSync(remoteEnvPath, 0o640);

  writeFileSync(
    fakeSshPath,
    `#!/usr/bin/env bash
set -euo pipefail
host="$1"
shift
exec bash -lc "$*"
`,
    "utf8",
  );
  chmodSync(fakeSshPath, 0o755);
}

function runInstall(env, baseUrl = "http://127.0.0.1:1/api/v1") {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      "--",
      "scripts/run-recall-production-env-key-install.mjs",
      "--ssh-command",
      fakeSshPath,
      "--remote-node-command",
      "node",
      "--host",
      "smoke-host",
      "--remote-dir",
      remoteRoot,
      "--local-env-file",
      localEnvPath,
      "--remote-env-file",
      remoteEnvPath,
      "--min-rotated-after",
      checkpoint,
      "--base-url",
      baseUrl,
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BRAIN_RECALL_PRODUCTION_KEY_INSTALL_ACK: "",
        ...env,
      },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function parseMaybeJson(text) {
  const trimmed = String(text ?? "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  return JSON.parse(trimmed.slice(start, end + 1));
}

function assertNoSecret(text, label) {
  assert(!text.includes(TEST_KEY), `${label} should not include the test API key`);
  assert(!/\bsk_(?!test_)[A-Za-z0-9._-]{12,}\b/.test(text), `${label} should not print secret-shaped API keys`);
  assert(!/\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/i.test(text), `${label} should not print bearer tokens`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
