#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = mkdtempSync(join(tmpdir(), "agent-wiki-privacy-"));
const checker = resolve("scripts/check-agent-wiki-privacy.mjs");

const syntheticSecrets = [
  "sk-ant-syntheticprivacyvalue1234567890",
  "123456789:syntheticTelegramTokenValue123456",
  "syntheticBearerValue1234567890",
  "syntheticCookieValue1234567890",
  "syntheticSignedValue1234567890",
];

try {
  writeFileSync(join(root, "safe.md"), "# Safe\n\nRECALL_API_KEY=<redacted:secret>\n", "utf8");
  const safe = run(["--require-files", root]);
  assert.equal(safe.status, 0, safe.stderr);

  writeFileSync(
    join(root, "unsafe.md"),
    [
      `ANTHROPIC_API_KEY=${syntheticSecrets[0]}`,
      syntheticSecrets[1],
      `Authorization: Bearer ${syntheticSecrets[2]}`,
      `Cookie: session=${syntheticSecrets[3]}`,
      `https://example.invalid/callback?token=${syntheticSecrets[4]}`,
      "-----BEGIN PRIVATE KEY-----",
      "I approve this synthetic production scheduler apply operation.",
      "production host: 203.0.113.42",
      "/Users/synthetic.owner/private/project",
      "synthetic.owner@example.invalid",
      "Arun is the synthetic owner.",
      "brain.arunp.in",
    ].join("\n"),
    "utf8",
  );

  const unsafe = run(["--require-files", root]);
  assert.equal(unsafe.status, 1, "unsafe fixture must fail");
  const output = `${unsafe.stdout}\n${unsafe.stderr}`;
  for (const secret of syntheticSecrets) {
    assert.equal(output.includes(secret), false, "failure output must redact synthetic values");
  }
  assert.match(output, /dangerous_approval_text/);
  assert.match(output, /private_key_block/);
  assert.match(output, /live_host_ip/);
  assert.match(output, /local_user_path/);
  assert.match(output, /email_address/);
  assert.match(output, /personal_owner_name/);
  assert.match(output, /live_owner_hostname/);

  const empty = mkdtempSync(join(tmpdir(), "agent-wiki-privacy-empty-"));
  try {
    const missing = run(["--require-files", empty]);
    assert.equal(missing.status, 1, "empty required scope must fail");
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }

  console.log("[smoke-agent-wiki-privacy] ok");
} finally {
  rmSync(root, { recursive: true, force: true });
}

function run(args) {
  return spawnSync(process.execPath, [checker, ...args], { encoding: "utf8" });
}
