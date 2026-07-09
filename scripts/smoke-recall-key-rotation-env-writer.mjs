#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, statSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";

const ACK =
  "I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.";
const checkpoint = "2026-06-24T15:54:17.000Z";
const envPath = `data/private/recall-live-spikes/smoke-key-rotation-env-writer-${process.pid}-${Date.now()}.env`;
const evidencePath = `data/private/recall-live-spikes/smoke-key-rotation-env-writer-${process.pid}-${Date.now()}.json`;
const secret = "sk_test_rotated_env_writer_secret_12345";
const replacementSecret = "sk_test_rotated_env_writer_replacement_67890";

try {
  const missingAck = await runWriter({ key: secret, env: {} });
  assert(missingAck.status === 2, "writer should fail before writing without exact acknowledgement");
  assert(missingAck.stderr.includes("missing_exact_key_rotation_ack"), "missing ack should be explicit");
  assert(!existsSync(resolve(envPath)), "missing ack should not create env file");
  assertNoSecret(missingAck, "missing acknowledgement output");

  const unsafePath = await runWriter({
    key: secret,
    env: { BRAIN_RECALL_KEY_ROTATION_ACK: ACK },
    extraArgs: ["--env-file", "/tmp/unsafe-recall.env"],
  });
  assert(unsafePath.status === 2, "writer should refuse unsafe env paths before writing");
  assert(unsafePath.stderr.includes("env_file_not_private"), "unsafe path should be explicit");
  assertNoSecret(unsafePath, "unsafe path output");

  writeExistingEnv(envPath);
  const overwriteRefused = await runWriter({
    key: secret,
    env: { BRAIN_RECALL_KEY_ROTATION_ACK: ACK },
  });
  assert(overwriteRefused.status === 3, "writer should refuse existing env without --replace-existing");
  assert(overwriteRefused.stderr.includes("env_file_exists"), "overwrite refusal should be explicit");
  assert(readFileSync(resolve(envPath), "utf8").includes("sk_existing_private_value_12345"), "refused overwrite should preserve existing env");
  assertNoSecret(overwriteRefused, "overwrite refusal output");

  const written = await runWriter({
    key: secret,
    env: { BRAIN_RECALL_KEY_ROTATION_ACK: ACK },
    extraArgs: ["--replace-existing"],
  });
  assert(written.status === 0, `writer should pass after exact ack and replace flag\n${written.stderr}`);
  const writtenJson = JSON.parse(written.stdout);
  assert(writtenJson.ok === true, "writer output should report ok=true");
  assert(writtenJson.mode === "rotated_recall_private_env_written", "writer output should report mode");
  assert(writtenJson.envFile.path === envPath, "writer output should report env path only");
  assert(writtenJson.envFile.mode === "600", "writer output should report owner-only mode");
  assert(writtenJson.envFile.containsApiKeyValue === true, "writer output should acknowledge private env contains a key");
  assert(writtenJson.envFile.keyPrinted === false, "writer output should report that key was not printed");
  assert(writtenJson.envFile.liveApiConfirmationDefault === "0", "writer should keep live confirmation disabled");
  assert(writtenJson.keyEvidenceGate.verdict === "PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE", "writer should run metadata gate");
  assert(writtenJson.keyEvidenceGate.evidenceSource === "env_file_mtime", "fresh env mtime should satisfy key evidence");
  assert(
    writtenJson.safetyNotes.includes("No Recall API call was made.") &&
      writtenJson.safetyNotes.includes("No proof was refreshed.") &&
      writtenJson.safetyNotes.includes("No first capped apply was run."),
    "writer safety notes should preserve no-live/no-write boundaries",
  );

  const mode = statSync(resolve(envPath)).mode & 0o777;
  assert(mode === 0o600, `written env file must be 0600, got ${mode.toString(8)}`);
  const envText = readFileSync(resolve(envPath), "utf8");
  assert(envText.includes(secret), "private temp env file should contain the supplied key");
  assert(envText.includes("export BRAIN_RECALL_CONFIRM_LIVE_API=0"), "written env should keep live confirmation disabled");
  assert(!envText.includes(replacementSecret), "replacement key should not be present before replacement");
  assertNoSecret(written, "successful writer output");

  const replaced = await runWriter({
    key: replacementSecret,
    env: { BRAIN_RECALL_KEY_ROTATION_ACK: ACK },
    extraArgs: ["--replace-existing"],
  });
  assert(replaced.status === 0, "writer should replace existing env when explicitly requested");
  const replacedText = readFileSync(resolve(envPath), "utf8");
  assert(replacedText.includes(replacementSecret), "replacement env should contain replacement key");
  assert(!replacedText.includes(secret), "replacement env should not retain previous key");
  assertNoSecret(replaced, "replacement writer output");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "writer refuses without exact key rotation acknowledgement before creating env file",
          "writer refuses env paths outside the private Recall evidence root",
          "writer refuses to overwrite existing env file without --replace-existing",
          "writer writes owner-only private env file with live confirmation disabled",
          "writer runs the no-live key-rotation metadata gate and reaches PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE",
          "writer can explicitly replace an existing private env file",
          "writer output does not print env contents or secret-shaped values",
          "smoke uses no live Recall API call",
          "temp private files cleaned up",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(resolve(envPath), { force: true });
  rmSync(resolve(evidencePath), { force: true });
}

function writeExistingEnv(path) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(resolve(path), 'export RECALL_API_KEY="sk_existing_private_value_12345"\n', {
    encoding: "utf8",
    mode: 0o600,
  });
  chmodSync(resolve(path), 0o600);
}

function runWriter({ key, env, extraArgs = [] }) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--",
        "scripts/write-recall-rotated-env.mjs",
        "--read-key-from-stdin",
        "--env-file",
        envPath,
        "--evidence-file",
        evidencePath,
        "--min-rotated-after",
        checkpoint,
        ...extraArgs,
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...env,
          RECALL_API_KEY: "sk_should_not_be_used_from_process_env_12345",
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
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
    child.on("close", (status) => resolveResult({ status, stdout, stderr }));
    child.stdin.on("error", () => {});
    child.stdin.end(`${key}\n`);
  });
}

function assertNoSecret(result, label) {
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  assert(!text.includes(secret), `${label} should not print initial key`);
  assert(!text.includes(replacementSecret), `${label} should not print replacement key`);
  assert(!text.includes("sk_existing_private_value_12345"), `${label} should not print existing key`);
  assert(!text.includes("sk_should_not_be_used_from_process_env_12345"), `${label} should not print process env key`);
  assert(!/\bRECALL_API_KEY\s*=/.test(text), `${label} should not print env assignments`);
  assert(!/\bBearer\s+[A-Za-z0-9._-]{12,}/i.test(text), `${label} should not print bearer tokens`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
