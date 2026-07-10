#!/usr/bin/env node
import { chmodSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const checkpoint = "2026-06-24T15:54:17.000Z";
const stalePath = "data/private/recall-live-spikes/smoke-key-rotation-stale.env";
const freshPath = "data/private/recall-live-spikes/smoke-key-rotation-fresh.env";
const staleEvidencePath = "data/private/recall-live-spikes/smoke-key-rotation-stale-evidence.json";
const freshEvidencePath = "data/private/recall-live-spikes/smoke-key-rotation-fresh-evidence.json";
const secretEvidencePath = "data/private/recall-live-spikes/smoke-key-rotation-secret-evidence.json";

try {
  writeEnv(stalePath);
  writeEnv(freshPath);
  writeEvidence(staleEvidencePath, stalePath, "2026-06-24T15:00:00.000Z");
  writeEvidence(freshEvidencePath, stalePath, "2026-06-24T16:00:00.000Z");
  writeEvidence(secretEvidencePath, stalePath, "2026-06-24T16:00:00.000Z", {
    diagnosticLeak: "sk_test_key_rotation_evidence_secret_12345",
  });
  const staleDate = new Date("2026-06-24T15:00:00.000Z");
  const freshDate = new Date("2026-06-24T16:00:00.000Z");
  utimesSync(stalePath, staleDate, staleDate);
  utimesSync(freshPath, freshDate, freshDate);
  utimesSync(staleEvidencePath, staleDate, staleDate);
  utimesSync(freshEvidencePath, freshDate, freshDate);
  utimesSync(secretEvidencePath, freshDate, freshDate);

  const stale = runGate(stalePath);
  assert(stale.status === 1, "stale env file should fail key rotation evidence");
  assert(stale.stderr.includes("env_file_not_rotated_after_checkpoint"), "stale failure should name rotation rule");
  assert(!stale.stderr.includes("RECALL_API_KEY="), "failure must not print env file content");

  const fresh = runGate(freshPath);
  if (fresh.status !== 0) {
    throw new Error(`fresh key rotation evidence failed\nSTDOUT:\n${fresh.stdout}\nSTDERR:\n${fresh.stderr}`);
  }
  const parsed = JSON.parse(fresh.stdout);
  assert(parsed.verdict === "PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE", "fresh evidence should pass");
  assert(parsed.evidenceSource === "env_file_mtime", "fresh env mtime should be the evidence source");

  const stalePrivateEvidence = runGate(stalePath, freshEvidencePath);
  if (stalePrivateEvidence.status !== 0) {
    throw new Error(
      `fresh private evidence file should pass with stale env mtime\nSTDOUT:\n${stalePrivateEvidence.stdout}\nSTDERR:\n${stalePrivateEvidence.stderr}`,
    );
  }
  const privateEvidenceParsed = JSON.parse(stalePrivateEvidence.stdout);
  assert(
    privateEvidenceParsed.evidenceSource === "private_evidence_file",
    "fresh private evidence file should be the evidence source",
  );

  const stalePrivateEvidenceFailure = runGate(stalePath, staleEvidencePath);
  assert(stalePrivateEvidenceFailure.status === 1, "stale env plus stale private evidence should fail");
  assert(
    stalePrivateEvidenceFailure.stderr.includes("key_rotation_evidence_file_not_after_checkpoint"),
    "stale private evidence failure should name evidence mtime rule",
  );

  const secretPrivateEvidenceFailure = runGate(stalePath, secretEvidencePath);
  assert(secretPrivateEvidenceFailure.status === 1, "private evidence with secret-shaped content should fail");
  assert(
    secretPrivateEvidenceFailure.stderr.includes("key_rotation_evidence_contains_sk_secret"),
    "secret private evidence failure should name the secret-shape rule",
  );
  assert(
    !secretPrivateEvidenceFailure.stderr.includes("sk_test_key_rotation_evidence_secret_12345"),
    "secret private evidence failure must not print the secret-shaped value",
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "stale private env mtime fails",
          "fresh private env mtime passes",
          "fresh private evidence file passes when env mtime is stale",
          "stale private evidence file fails when env mtime is stale",
          "private evidence file with secret-shaped content fails without echoing the value",
          "failure output does not print env file contents",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(stalePath, { force: true });
  rmSync(freshPath, { force: true });
  rmSync(staleEvidencePath, { force: true });
  rmSync(freshEvidencePath, { force: true });
  rmSync(secretEvidencePath, { force: true });
}

function writeEnv(path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "RECALL_API_KEY=<redacted-test-value>\nBRAIN_RECALL_CONFIRM_LIVE_API=0\n", "utf8");
  chmodSync(path, 0o600);
}

function writeEvidence(path, envFile, createdAtIso, extra = {}) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        createdAtIso,
        envFile,
        minRotatedAfterIso: checkpoint,
        ackPhraseAccepted: true,
        liveAuthProbe: {
          ok: true,
          httpStatus: 200,
          authenticated: true,
          reachable: true,
        },
        ...extra,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  chmodSync(path, 0o600);
}

function runGate(envFile, evidenceFile = null) {
  return spawnSync(
    process.execPath,
    [
      "--",
      "scripts/check-recall-key-rotation-evidence.mjs",
      "--env-file",
      envFile,
      ...(evidenceFile ? ["--evidence-file", evidenceFile] : ["--no-evidence-file"]),
      "--min-rotated-after",
      checkpoint,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
