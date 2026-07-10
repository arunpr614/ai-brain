#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { chmodSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const requests = [];
const privateSmokeDir = join("data/private/recall-live-spikes", `live-auth-probe-smoke-${process.pid}`);
const server = createServer((req, res) => {
  requests.push({
    url: req.url,
    authorization: req.headers.authorization ?? null,
  });

  if (req.url?.includes("2099-01-01T00%3A00%3A00.000Z")) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ detail: { message: "Invalid API key", request_id: "req_probe_401" } }));
    return;
  }

  res.writeHead(200, { "content-type": "application/json" });
  res.end(
    JSON.stringify({
      total_count: 1,
      results: [
        {
          id: "private-card-id-should-not-print",
          title: "Private title should not print",
          source_url: "https://example.com/private?token=secret123",
        },
      ],
    }),
  );
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}/api/v1`;

try {
  const unconfirmed = await runProbe(["--base-url", baseUrl, "--no-env-file"], {
    RECALL_API_KEY: "sk_test_probe_secret_12345",
  });
  assert(unconfirmed.status === 2, "probe should refuse without explicit live confirmation");
  assert(
    unconfirmed.stderr.includes("missing_live_api_confirmation"),
    "unconfirmed failure should name missing confirmation",
  );
  assertNoSecretOutput(unconfirmed, "unconfirmed probe");

  const missingKey = await runProbe(["--base-url", baseUrl, "--no-env-file", "--confirm-live-api"], {});
  assert(missingKey.status === 2, "probe should refuse without API key");
  assert(missingKey.stderr.includes("missing_api_key"), "missing key failure should name missing key");

  const ok = await runProbe(["--base-url", baseUrl, "--no-env-file", "--confirm-live-api"], {
    RECALL_API_KEY: "sk_test_probe_secret_12345",
  });
  assert(ok.status === 0, "probe should exit 0 on successful read-only response");
  const okJson = parseJson(ok.stdout, "ok probe stdout");
  assert(okJson.ok === true, "ok probe JSON should report ok=true");
  assert(okJson.endpoint === "/cards", "ok probe should use /cards");
  assert(okJson.result.httpStatus === 200, "ok probe should report HTTP 200");
  assert(okJson.result.resultCount === 1, "ok probe should report count without card values");
  assert(okJson.result.totalCount === 1, "ok probe should report total_count");
  assert(
    okJson.firstWriteSafety.keyRotationEvidenceGateRun === false,
    "ok probe should report that key evidence gate did not run",
  );
  assert(
    okJson.firstWriteSafety.envFileMtimeAfterCheckpoint === null,
    "no-env probe should report unknown env-file rotation context",
  );
  assert(okJson.firstWriteSafety.applyAllowedByThisProbe === false, "probe should not allow apply");
  assert(okJson.safetyNotes.some((note) => note.includes("did not fetch card details")), "safety notes should name no card details");
  assertNoSecretOutput(ok, "ok probe");
  assertNoPrivateOutput(ok, "ok probe");

  const firstRequestUrl = new URL(requests[0].url, baseUrl);
  assert(firstRequestUrl.pathname === "/api/v1/cards", "probe should request /cards");
  assert(
    firstRequestUrl.searchParams.get("date_from") === "2100-01-01T00:00:00.000Z",
    "probe should default to future date_from",
  );
  assert(
    firstRequestUrl.searchParams.get("date_to") === "2100-01-02T00:00:00.000Z",
    "probe should default to future date_to",
  );
  assert(
    requests[0].authorization === "Bearer sk_test_probe_secret_12345",
    "probe should send bearer authorization",
  );

  const unauthorized = await runProbe(
    [
      "--base-url",
      baseUrl,
      "--no-env-file",
      "--confirm-live-api",
      "--date-from",
      "2099-01-01T00:00:00.000Z",
      "--date-to",
      "2099-01-02T00:00:00.000Z",
    ],
    { RECALL_API_KEY: "sk_test_probe_secret_12345" },
  );
  assert(unauthorized.status === 77, "401 probe should map to auth failure exit code");
  const unauthorizedJson = parseJson(unauthorized.stdout, "unauthorized probe stdout");
  assert(unauthorizedJson.ok === false, "401 probe JSON should report ok=false");
  assert(unauthorizedJson.result.httpStatus === 401, "401 probe should report HTTP status");
  assert(unauthorizedJson.result.authenticated === false, "401 probe should report unauthenticated");
  assert(unauthorizedJson.result.requestId === "req_probe_401", "401 probe should keep request id");
  assertNoSecretOutput(unauthorized, "401 probe");

  mkdirSync(privateSmokeDir, { recursive: true });
  const staleEnvFile = writePrivateEnvFile(
    join(privateSmokeDir, "stale.env"),
    "2026-06-24T13:30:11.000Z",
  );
  const staleEnv = await runProbe(["--base-url", baseUrl, "--env-file", staleEnvFile, "--confirm-live-api"], {});
  assert(staleEnv.status === 0, "stale env-file probe should still be allowed as read-only diagnostic");
  const staleEnvJson = parseJson(staleEnv.stdout, "stale env-file probe stdout");
  assert(staleEnvJson.envFile.loaded === true, "stale env-file probe should load the private env file");
  assert(
    staleEnvJson.firstWriteSafety.envFileMtimeAfterCheckpoint === false,
    "stale env-file probe should report stale key-rotation context",
  );
  assert(
    staleEnvJson.firstWriteSafety.proofRefreshAllowedByThisProbe === false,
    "stale env-file probe should not allow proof refresh",
  );
  assertNoSecretOutput(staleEnv, "stale env-file probe");
  assertNoPrivateOutput(staleEnv, "stale env-file probe");

  const freshEnvFile = writePrivateEnvFile(
    join(privateSmokeDir, "fresh.env"),
    "2026-06-24T16:00:00.000Z",
  );
  const freshEnv = await runProbe(["--base-url", baseUrl, "--env-file", freshEnvFile, "--confirm-live-api"], {});
  assert(freshEnv.status === 0, "fresh env-file probe should pass read-only diagnostic");
  const freshEnvJson = parseJson(freshEnv.stdout, "fresh env-file probe stdout");
  assert(
    freshEnvJson.firstWriteSafety.envFileMtimeAfterCheckpoint === true,
    "fresh env-file probe should report fresh key-rotation context",
  );
  assert(
    freshEnvJson.firstWriteSafety.keyRotationEvidenceGateRun === false,
    "fresh env-file probe should still report that key evidence gate did not run",
  );
  assert(freshEnvJson.firstWriteSafety.applyAllowedByThisProbe === false, "fresh env-file probe should not allow apply");
  assertNoSecretOutput(freshEnv, "fresh env-file probe");
  assertNoPrivateOutput(freshEnv, "fresh env-file probe");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "live auth probe refuses without confirmation",
          "live auth probe refuses without API key",
          "live auth probe calls read-only /cards with future date window",
          "live auth probe prints counts without card IDs, titles, source URLs, chunks, or raw body",
          "live auth probe maps 401 to auth failure without leaking key",
          "live auth probe reports stale/fresh env-file key-rotation context without satisfying write gates",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(privateSmokeDir, { recursive: true, force: true });
  await new Promise((resolve) => server.close(resolve));
}

function writePrivateEnvFile(path, mtimeIso) {
  writeFileSync(path, "RECALL_API_KEY=sk_test_probe_secret_12345\n", { mode: 0o600 });
  chmodSync(path, 0o600);
  const mtime = new Date(mtimeIso);
  utimesSync(path, mtime, mtime);
  return path;
}

function runProbe(args, envOverrides) {
  const env = { ...process.env };
  delete env.RECALL_API_KEY;
  delete env.BRAIN_RECALL_CONFIRM_LIVE_API;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--", "scripts/run-recall-live-auth-probe.mjs", ...args], {
      cwd: process.cwd(),
      env: { ...env, ...envOverrides },
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
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertNoSecretOutput(result, label) {
  const output = `${result.stdout}\n${result.stderr}`;
  assert(!/sk_test_probe_secret/i.test(output), `${label} leaked test API key`);
  assert(!/Bearer sk_/i.test(output), `${label} leaked bearer key`);
}

function assertNoPrivateOutput(result, label) {
  const output = `${result.stdout}\n${result.stderr}`;
  assert(!/private-card-id/i.test(output), `${label} leaked private card id`);
  assert(!/Private title/i.test(output), `${label} leaked private title`);
  assert(!/secret123|example\.com\/private/i.test(output), `${label} leaked private source details`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
