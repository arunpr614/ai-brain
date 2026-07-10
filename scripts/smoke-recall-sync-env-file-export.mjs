#!/usr/bin/env node
import { spawn } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

const scratch = mkdtempSync(join(tmpdir(), "recall-sync-env-file-export-smoke-"));
const expectedKey = "sk_recall_sync_env_file_export_smoke";
const requests = [];

const server = createServer((req, res) => {
  requests.push({
    url: req.url,
    authorization: req.headers.authorization ?? null,
  });
  res.setHeader("content-type", "application/json");

  if (req.url?.startsWith("/cards/export-smoke-card-001")) {
    res.end(
      JSON.stringify({
        id: "export-smoke-card-001",
        title: "Recall sync env export smoke card",
        created_at: "2026-06-16T12:00:00.000Z",
        source_url: "https://example.com/recall-sync-env-export-smoke",
        chunks: [{ chunk_id: "chunk-001", content: "Recall sync env export smoke content." }],
      }),
    );
    return;
  }

  if (req.url?.startsWith("/cards")) {
    res.end(JSON.stringify({ total_count: 1, results: [{ id: "export-smoke-card-001" }] }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ message: "not found" }));
});

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected local server address.");

  const envFile = join(scratch, "recall.env");
  const reportPath = join(scratch, "dry-run-report.json");
  const dbPath = join(scratch, "brain.sqlite");
  mkdirSync(scratch, { recursive: true });
  writeFileSync(
    envFile,
    `# Private Recall env smoke file\nexport RECALL_API_KEY="${expectedKey}" # inline comments are ignored\nexport BRAIN_RECALL_CONFIRM_LIVE_API=1\n`,
    "utf8",
  );
  chmodSync(envFile, 0o600);

  const env = { ...process.env, BRAIN_DB_PATH: dbPath };
  delete env.RECALL_API_KEY;
  delete env.BRAIN_RECALL_CONFIRM_LIVE_API;

  const result = await runCommand(
    process.execPath,
    [
      "--import",
      "tsx",
      "--",
      "scripts/sync-recall.ts",
      "--dry-run",
      "--confirm-live-api",
      "--env-file",
      envFile,
      "--base-url",
      `http://127.0.0.1:${address.port}`,
      "--date-from",
      "2026-06-16T00:00:00.000Z",
      "--date-to",
      "2026-06-16T23:59:59.999Z",
      "--max-cards",
      "1",
      "--max-imports",
      "1",
      "--allow-unverified-import",
      "--allow-metadata-only-import",
      "--warning-ui-available",
      "--output",
      reportPath,
    ],
    { cwd: process.cwd(), env },
  );

  if (result.status === 2 || result.stderr.includes("RECALL_API_KEY is not set")) {
    throw new Error(`sync-recall env export smoke failed before loading the exported env key\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  assert(requests.length >= 1, "local Recall server should receive at least the list request");
  for (const request of requests) {
    assert(request.authorization === `Bearer ${expectedKey}`, "sync-recall should load exported RECALL_API_KEY from --env-file");
  }
  assert(!result.stdout.includes(expectedKey), "stdout must not print the env-file API key");
  assert(!result.stderr.includes(expectedKey), "stderr must not print the env-file API key");

  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  assert(report.mode === "dry_run", "smoke should produce a dry-run report");
  assert(report.checkpointAdvanced === false, "dry-run smoke must not advance a checkpoint");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "sync-recall loads export-style --env-file entries",
          "sync-recall strips inline comments outside quotes",
          "sync-recall does not print the API key",
          "dry-run does not advance a checkpoint",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
  rmSync(scratch, { recursive: true, force: true });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
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
