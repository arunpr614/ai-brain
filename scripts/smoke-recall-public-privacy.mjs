#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const scratch = mkdtempSync(join(tmpdir(), "recall-public-privacy-smoke-"));
const scanner = resolve("scripts/check-recall-public-privacy.mjs");

try {
  const safeReport = join(scratch, "SPIKE-013-recall-rest-enumeration-safe_IST.md");
  const unsafeReport = join(scratch, "SPIKE-014-recall-content-fidelity-unsafe_IST.md");
  const syntheticApiKey = "sk_live_public_privacy_smoke_should_not_print";
  const syntheticBearer = "publicprivacyBearerShouldNotPrint12345";
  const syntheticCookie = "session=publicprivacycookieshouldnotprint";
  const syntheticTokenUrl = "https://example.com/callback?token=publicprivacytokenshouldnotprint";

  writeFileSync(
    safeReport,
    `# Safe public report

RECALL_API_KEY=<redacted locally>
Authorization: Bearer <redacted:token>
`,
    "utf8",
  );
  writeFileSync(
    unsafeReport,
    `# Unsafe public report

RECALL_API_KEY=${syntheticApiKey}
Authorization: Bearer ${syntheticBearer}
Cookie: ${syntheticCookie}
URL: ${syntheticTokenUrl}
`,
    "utf8",
  );

  const missingDefault = runScan(["--require-files"], { cwd: scratch });
  assert(missingDefault.status === 1, "--require-files should fail when default report scope is empty");
  assert(missingDefault.stderr.includes("no_report_files_found"), "empty required scan should explain missing files");

  const safe = runScan(["--require-files", safeReport]);
  assert(safe.status === 0, "safe report should pass with --require-files");
  assert(JSON.parse(safe.stdout).scannedFiles === 1, "safe report scan should count one file");

  const unsafe = runScan(["--require-files", unsafeReport]);
  assert(unsafe.status === 1, "unsafe report should fail");
  assert(unsafe.stderr.includes("recall_api_key_assignment"), "unsafe report should identify API-key assignment");
  assert(unsafe.stderr.includes("<redacted:recall_api_key>"), "API-key preview should be redacted");
  assert(unsafe.stderr.includes("<redacted:token>"), "bearer preview should be redacted");
  assert(unsafe.stderr.includes("<redacted:cookie>"), "cookie preview should be redacted");
  assert(unsafe.stderr.includes("token=<redacted>"), "tokenized URL preview should be redacted");
  assert(!unsafe.stderr.includes(syntheticApiKey), "failure output must not print synthetic API key");
  assert(!unsafe.stderr.includes(syntheticBearer), "failure output must not print synthetic bearer token");
  assert(!unsafe.stderr.includes(syntheticCookie), "failure output must not print synthetic cookie");
  assert(!unsafe.stderr.includes(syntheticTokenUrl), "failure output must not print synthetic token URL");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "--require-files fails when no report files are scanned from an isolated empty default scope",
          "--require-files passes when a safe explicit report is scanned",
          "synthetic leak is detected",
          "failure previews redact API keys, bearer tokens, cookies, and tokenized URLs",
        ],
        noPersistentPublicReport: true,
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function runScan(args, options = {}) {
  return spawnSync(process.execPath, [scanner, ...args], {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
