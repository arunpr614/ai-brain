#!/usr/bin/env node
import { createServer } from "node:http";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const ACK =
  "I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.";
const SYSTEM_ACK =
  "I confirm the Recall API key in the production Recall system env file was rotated after chat exposure and should be verified by a read-only live auth probe before recording production key-rotation evidence.";
const checkpoint = "2026-06-24T15:54:17.000Z";
const envPath = `data/private/recall-live-spikes/smoke-key-rotation-record-${process.pid}-${Date.now()}.env`;
const evidencePath = `data/private/recall-live-spikes/smoke-key-rotation-record-${process.pid}-${Date.now()}.json`;
const systemEnvPath = `/tmp/smoke-key-rotation-system-record-${process.pid}-${Date.now()}.env`;
const systemEvidencePath = `data/private/recall-live-spikes/smoke-key-rotation-system-record-${process.pid}-${Date.now()}.json`;

const server = createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ total_count: 0, results: [] }));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

try {
  writeEnv(envPath);
  const staleDate = new Date("2026-06-24T15:00:00.000Z");
  utimesSync(envPath, staleDate, staleDate);

  const missingAck = await runRecord({});
  assert(missingAck.status === 2, "recorder should refuse without exact acknowledgement");
  assert(missingAck.stderr.includes("missing_exact_key_rotation_ack"), "missing ack failure should be explicit");
  assert(!existsSync(resolve(evidencePath)), "recorder should not create evidence without ack");

  const recorded = await runRecord({ BRAIN_RECALL_KEY_ROTATION_ACK: ACK });
  assert(recorded.status === 0, `recorder should pass with ack and live probe\n${recorded.stderr}`);
  const recordedJson = JSON.parse(recorded.stdout);
  assert(recordedJson.ok === true, "recorder output should be ok");
  assert(recordedJson.gateVerdict === "PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE", "recorder should verify gate");
  assert(existsSync(resolve(evidencePath)), "recorder should create evidence file");

  const evidence = JSON.parse(readFileSync(resolve(evidencePath), "utf8"));
  assert(evidence.ackPhraseAccepted === true, "evidence should record acknowledgement accepted");
  assert(evidence.liveAuthProbe?.httpStatus === 200, "evidence should record successful live auth probe status");
  assert(
    evidence.liveAuthProbe?.firstWriteSafety?.keyRotationEvidenceGateRun === false,
    "evidence should record that the probe did not run the key-evidence gate",
  );
  assert(
    evidence.liveAuthProbe?.firstWriteSafety?.envFileMtimeAfterCheckpoint === false,
    "evidence should record stale env-file mtime context from the probe",
  );
  assert(
    evidence.liveAuthProbe?.firstWriteSafety?.proofRefreshAllowedByThisProbe === false,
    "evidence should record that the probe did not allow proof refresh",
  );
  assert(
    evidence.liveAuthProbe?.firstWriteSafety?.applyAllowedByThisProbe === false,
    "evidence should record that the probe did not allow apply",
  );
  assert(!JSON.stringify(evidence).includes("sk_test_record_secret"), "evidence file must not store API key");

  const gate = runGate();
  assert(gate.status === 0, `stale env should pass through private evidence file\n${gate.stderr}`);
  const gateJson = JSON.parse(gate.stdout);
  assert(gateJson.evidenceSource === "private_evidence_file", "gate should report private evidence source");

  writeSystemEnv(systemEnvPath);
  utimesSync(systemEnvPath, staleDate, staleDate);

  const missingSystemAck = await runSystemRecord({ BRAIN_RECALL_KEY_ROTATION_ACK: ACK });
  assert(missingSystemAck.status === 2, "system recorder should refuse the private acknowledgement");
  assert(
    missingSystemAck.stderr.includes("BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK"),
    "system recorder should require the system acknowledgement env",
  );
  assert(!existsSync(resolve(systemEvidencePath)), "system recorder should not create evidence without system ack");

  const systemRecorded = await runSystemRecord({ BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK: SYSTEM_ACK });
  assert(systemRecorded.status === 0, `system recorder should pass with system ack and live probe\n${systemRecorded.stderr}`);
  const systemRecordedJson = JSON.parse(systemRecorded.stdout);
  assert(systemRecordedJson.mode === "production_system_env_key_rotation_evidence_recorded", "system recorder mode should be explicit");
  assert(systemRecordedJson.systemEnvFile === true, "system recorder output should mark system env mode");
  assert(existsSync(resolve(systemEvidencePath)), "system recorder should create private evidence file");

  const systemEvidence = JSON.parse(readFileSync(resolve(systemEvidencePath), "utf8"));
  assert(systemEvidence.systemEnvFile === true, "system evidence should record system env mode");
  assert(systemEvidence.envFileKind === "system", "system evidence should record env file kind");
  assert(systemEvidence.envFile === systemEnvPath, "system evidence should record the system env file path");
  assert(systemEvidence.liveAuthProbe?.httpStatus === 200, "system evidence should record successful live auth probe status");
  assert(!JSON.stringify(systemEvidence).includes("sk_test_system_record_secret"), "system evidence file must not store API key");

  const systemGate = runSystemGate();
  assert(systemGate.status === 0, `stale system env should pass through private evidence file\n${systemGate.stderr}`);
  const systemGateJson = JSON.parse(systemGate.stdout);
  assert(systemGateJson.evidenceSource === "private_evidence_file", "system gate should report private evidence source");

  const combinedOutput = [
    missingAck.stdout,
    missingAck.stderr,
    recorded.stdout,
    recorded.stderr,
    missingSystemAck.stdout,
    missingSystemAck.stderr,
    systemRecorded.stdout,
    systemRecorded.stderr,
  ].join("\n");
  assert(!combinedOutput.includes("sk_test_record_secret"), "recorder output must not print private API key");
  assert(!combinedOutput.includes("sk_test_system_record_secret"), "recorder output must not print system API key");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "recorder refuses without exact key rotation acknowledgement",
          "recorder runs read-only live auth probe",
          "recorder preserves probe first-write safety context without unlocking writes",
          "recorder writes owner-only private evidence without storing key material",
          "key rotation evidence gate accepts private evidence file when env mtime is stale",
          "system-env recorder refuses the private acknowledgement",
          "system-env recorder runs read-only live auth probe",
          "system-env recorder verifies evidence with the system env-file gate",
          "recorder output does not print key material",
          "temp private files cleaned up",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
  rmSync(resolve(envPath), { force: true });
  rmSync(resolve(evidencePath), { force: true });
  rmSync(resolve(systemEnvPath), { force: true });
  rmSync(resolve(systemEvidencePath), { force: true });
}

function writeEnv(path) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(resolve(path), 'RECALL_API_KEY="sk_test_record_secret_12345"\nBRAIN_RECALL_CONFIRM_LIVE_API=1\n', {
    encoding: "utf8",
    mode: 0o600,
  });
  chmodSync(resolve(path), 0o600);
}

function writeSystemEnv(path) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(resolve(path), 'RECALL_API_KEY="sk_test_system_record_secret_12345"\nBRAIN_RECALL_CONFIRM_LIVE_API=1\n', {
    encoding: "utf8",
    mode: 0o640,
  });
  chmodSync(resolve(path), 0o640);
}

function runRecord(envOverrides) {
  return runNode(
    [
      "scripts/record-recall-key-rotation-evidence.mjs",
      "--env-file",
      envPath,
      "--evidence-file",
      evidencePath,
      "--base-url",
      `http://127.0.0.1:${port}/api/v1`,
      "--min-rotated-after",
      checkpoint,
    ],
    envOverrides,
  );
}

function runSystemRecord(envOverrides) {
  return runNode(
    [
      "scripts/record-recall-key-rotation-evidence.mjs",
      "--system-env-file",
      "--env-file",
      systemEnvPath,
      "--evidence-file",
      systemEvidencePath,
      "--base-url",
      `http://127.0.0.1:${port}/api/v1`,
      "--min-rotated-after",
      checkpoint,
    ],
    envOverrides,
  );
}

function runGate() {
  return spawnSyncCompat(
    [
      "scripts/check-recall-key-rotation-evidence.mjs",
      "--env-file",
      envPath,
      "--evidence-file",
      evidencePath,
      "--min-rotated-after",
      checkpoint,
    ],
    {},
  );
}

function runSystemGate() {
  return spawnSyncCompat(
    [
      "scripts/check-recall-key-rotation-evidence.mjs",
      "--system-env-file",
      "--env-file",
      systemEnvPath,
      "--evidence-file",
      systemEvidencePath,
      "--min-rotated-after",
      checkpoint,
    ],
    {},
  );
}

function runNode(args, envOverrides) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--", ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...envOverrides },
      stdio: ["ignore", "pipe", "pipe"],
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
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

function spawnSyncCompat(args, envOverrides) {
  const result = spawnSync(process.execPath, ["--", ...args], {
    cwd: process.cwd(),
    env: { ...process.env, ...envOverrides },
    encoding: "utf8",
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
