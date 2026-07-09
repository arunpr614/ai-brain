#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const scratch = mkdtempSync(join(tmpdir(), "recall-public-docs-privacy-smoke-"));
const scanner = resolve("scripts/check-recall-public-docs-privacy.mjs");

try {
  const safeDoc = join(scratch, "safe-current-doc.md");
  const unsafeDoc = join(scratch, "unsafe-current-doc.md");
  const syntheticApiKey = "sk_live_public_docs_privacy_should_not_print_12345";
  const syntheticBearer = "publicDocsBearerShouldNotPrint12345";
  const syntheticCookie = "session=publicdocsprivacyshouldnotprint";
  const syntheticTokenUrl = "https://example.com/callback?token=publicdocsprivacyshouldnotprint";

  writeFileSync(
    safeDoc,
    `# Safe Recall approval doc

RECALL_API_KEY=<redacted locally>
Authorization: Bearer <redacted:token>
Authorization: Bearer <RECALL_API_KEY>
Authorization: Bearer \${RECALL_API_KEY}
Cookie: <redacted:cookie>
URL: https://example.com/callback?token=<redacted>
`,
    "utf8",
  );
  writeFileSync(
    unsafeDoc,
    `# Unsafe Recall approval doc

RECALL_API_KEY=${syntheticApiKey}
Authorization: Bearer ${syntheticBearer}
Cookie: ${syntheticCookie}
URL: ${syntheticTokenUrl}
`,
    "utf8",
  );

  const missingDefault = runDefaultFromScratchCwd();
  assert(missingDefault.status === 1, "default current-doc scan should fail closed when curated docs are missing");
  assert(missingDefault.stderr.includes("missing_current_doc"), "missing default docs should identify missing_current_doc");

  const safe = runScan(["--require-files", safeDoc]);
  assert(safe.status === 0, "safe placeholder doc should pass with --require-files");
  assert(JSON.parse(safe.stdout).scannedFiles === 1, "safe placeholder doc scan should count one file");

  const unsafe = runScan(["--require-files", unsafeDoc]);
  assert(unsafe.status === 1, "unsafe doc should fail");
  assert(unsafe.stderr.includes("recall_api_key_assignment"), "unsafe doc should identify API-key assignment");
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
          "default curated-doc scope fails closed when docs are missing",
          "safe placeholders pass",
          "synthetic public-doc leak is detected",
          "failure previews redact API keys, bearer tokens, cookies, and tokenized URLs",
        ],
        noPersistentPublicDoc: true,
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function runScan(args) {
  return spawnSync(process.execPath, [scanner, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function runDefaultFromScratchCwd() {
  return spawnSync(process.execPath, [scanner], {
    cwd: scratch,
    encoding: "utf8",
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
