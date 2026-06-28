#!/usr/bin/env node
import { createServer } from "node:http";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const SYSTEM_ACK =
  "I confirm the Recall API key in the production Recall system env file was rotated after chat exposure and should be verified by a read-only live auth probe before recording production key-rotation evidence.";
const PRIVATE_ACK =
  "I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.";
const TEST_KEY = "sk_test_production_key_evidence_repair_secret_12345";
const scratch = mkdtempSync(join(tmpdir(), "recall-production-key-evidence-repair-"));
const remoteRoot = join(scratch, "remote-root");
const fakeSshPath = join(scratch, "fake-ssh.sh");
const systemEnvPath = join(remoteRoot, "etc/brain/recall.env");
const evidencePath = "data/private/recall-live-spikes/key-rotation-evidence.json";
const absoluteEvidencePath = join(remoteRoot, evidencePath);
const checkpoint = "2026-06-24T15:54:17.000Z";
const requests = [];

const server = createServer((request, response) => {
  requests.push({
    url: request.url,
    method: request.method,
    authorization: request.headers.authorization ?? null,
  });
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ results: [], total_count: 0 }));
});

try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  setupRemoteRoot();

  const handoffJson = runHandoff(["--json", "--skip-remote-check-for-smoke"]);
  assert(handoffJson.status === 0, `handoff JSON should pass\n${handoffJson.stderr}`);
  const handoffParsed = JSON.parse(handoffJson.stdout);
  assert(handoffParsed.noLiveNoWrite === true, "handoff must be no-live/no-write");
  assert(handoffParsed.acknowledgementTextPrinted === true, "handoff should disclose printed acknowledgement text");
  assert(
    handoffParsed.command.includes("npm run recall:production-key-evidence:repair"),
    "handoff should print the guarded repair runner command",
  );
  assertNoSecret(handoffJson.stdout, "handoff JSON");

  const handoffMarkdown = runHandoff(["--skip-remote-check-for-smoke"]);
  assert(handoffMarkdown.status === 0, `handoff Markdown should pass\n${handoffMarkdown.stderr}`);
  assert(
    handoffMarkdown.stdout.includes("# Recall Production System Key-Evidence Repair Command"),
    "handoff Markdown should include title",
  );
  assert(
    handoffMarkdown.stdout.includes("Printing this command is not acknowledgement"),
    "handoff Markdown should distinguish printing from acknowledgement",
  );
  assertNoSecret(handoffMarkdown.stdout, "handoff Markdown");

  const missingAck = await runRepair({ BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK: "" }, baseUrl);
  assert(missingAck.status === 1, "repair runner should refuse without exact system acknowledgement");
  const missingAckJson = parseMaybeJson(missingAck.stderr);
  assert(missingAckJson.noLiveNoWrite === true, "missing ack must not make live calls");
  assert(missingAckJson.readOnlyRecallAuthProbeAttempted === false, "missing ack must not attempt auth probe");
  assert(missingAckJson.privateEvidenceWriteAttempted === false, "missing ack must not attempt evidence write");
  assert(!existsSync(absoluteEvidencePath), "missing ack must not create evidence");
  assert(requests.length === 0, "missing ack must not reach fake Recall server");

  const privateAck = await runRepair(
    {
      BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK: "",
      BRAIN_RECALL_KEY_ROTATION_ACK: PRIVATE_ACK,
    },
    baseUrl,
  );
  assert(privateAck.status === 1, "repair runner should refuse private acknowledgement on production system gate");
  const privateAckJson = parseMaybeJson(privateAck.stderr);
  assert(
    privateAckJson.findings.some((finding) => finding.id === "private_acknowledgement_wrong_gate"),
    "private acknowledgement should be classified as wrong gate",
  );
  assert(!existsSync(absoluteEvidencePath), "private ack must not create evidence");
  assert(requests.length === 0, "private ack must not reach fake Recall server");

  const approved = await runRepair({ BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK: SYSTEM_ACK }, baseUrl);
  assert(approved.status === 0, `repair runner should pass with exact system acknowledgement\n${approved.stderr}`);
  const approvedJson = JSON.parse(approved.stdout);
  assert(approvedJson.ok === true, "approved repair JSON should be ok");
  assert(approvedJson.noLiveNoWrite === false, "approved repair should no longer be no-live/no-write");
  assert(approvedJson.readOnlyRecallAuthProbeAttempted === true, "approved repair should attempt read-only auth probe");
  assert(approvedJson.privateEvidenceWriteAttempted === true, "approved repair should attempt private evidence write");
  assert(approvedJson.aiBrainWriteAttempted === false, "approved repair must not write AI Brain rows");
  assert(approvedJson.recallImportAttempted === false, "approved repair must not import Recall data");
  assert(approvedJson.schedulerEnablementAttempted === false, "approved repair must not enable scheduler");
  assert(approvedJson.checkpointMovementAttempted === false, "approved repair must not move checkpoint");
  assert(approvedJson.remoteRepair.mode === "production_system_env_key_rotation_evidence_recorded", "remote repair mode should be explicit");
  assert(approvedJson.remoteRepair.gateVerdict === "PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE", "remote repair should pass evidence gate");
  assert(approvedJson.remotePostCheck.gateVerdict === "PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE", "post-check should pass evidence gate");
  assert(requests.length === 1, "approved repair should make exactly one fake Recall request");
  assert(requests[0].url.startsWith("/api/v1/cards?"), "approved repair should call /cards");
  assert(requests[0].authorization === `Bearer ${TEST_KEY}`, "approved repair should authenticate with env-file key");
  assert(existsSync(absoluteEvidencePath), "approved repair should create private evidence file");
  assert((statSync(absoluteEvidencePath).mode & 0o777) === 0o600, "evidence file should be owner-only");
  const evidence = JSON.parse(readFileSync(absoluteEvidencePath, "utf8"));
  assert(evidence.systemEnvFile === true, "evidence should mark system env mode");
  assert(evidence.envFileKind === "system", "evidence should record system env kind");
  assert(evidence.liveAuthProbe.httpStatus === 200, "evidence should record sanitized probe status");

  const combined = [
    handoffJson.stdout,
    handoffJson.stderr,
    handoffMarkdown.stdout,
    handoffMarkdown.stderr,
    missingAck.stdout,
    missingAck.stderr,
    privateAck.stdout,
    privateAck.stderr,
    approved.stdout,
    approved.stderr,
    readFileSync(absoluteEvidencePath, "utf8"),
  ].join("\n");
  assertNoSecret(combined, "combined repair output and evidence");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "production key-evidence handoff prints guarded repair runner command without live calls",
          "production key-evidence repair runner refuses without exact system acknowledgement",
          "production key-evidence repair runner refuses the local private acknowledgement",
          "production key-evidence repair runner runs one read-only auth probe after exact system acknowledgement",
          "production key-evidence repair runner writes no-secret private evidence and passes post-check",
          "production key-evidence repair runner does not import Recall data, write AI Brain rows, enable scheduler, or move checkpoint",
          "production key-evidence repair output and evidence do not print key material",
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
}

function setupRemoteRoot() {
  const files = [
    "scripts/record-recall-key-rotation-evidence.mjs",
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
  mkdirSync(dirname(systemEnvPath), { recursive: true });
  writeFileSync(systemEnvPath, `RECALL_API_KEY="${TEST_KEY}"\nBRAIN_RECALL_CONFIRM_LIVE_API=0\n`, "utf8");
  chmodSync(systemEnvPath, 0o640);
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

function runHandoff(args) {
  return spawnSync(
    process.execPath,
    ["--", "scripts/print-recall-production-key-evidence-repair-command.mjs", ...args],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );
}

function runRepair(env, baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      "--",
      "scripts/run-recall-production-key-evidence-repair.mjs",
      "--ssh-command",
      fakeSshPath,
      "--host",
      "smoke-host",
      "--remote-dir",
      remoteRoot,
      "--env-file",
      systemEnvPath,
      "--evidence-file",
      evidencePath,
      "--min-rotated-after",
      checkpoint,
      "--base-url",
      baseUrl,
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK: "",
        BRAIN_RECALL_KEY_ROTATION_ACK: "",
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
