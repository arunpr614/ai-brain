#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { templateManifest } from "./lib/recall-controlled-samples.mjs";

const scratch = mkdtempSync(join(tmpdir(), "recall-public-manifest-privacy-smoke-"));
const checker = resolve("scripts/check-recall-public-manifest-privacy.mjs");

try {
  const manifestPath = join(scratch, "controlled-samples.json");
  const safeReport = join(scratch, "safe-public-report.md");
  const exactLeakReport = join(scratch, "exact-leak-public-report.md");
  const normalizedLeakReport = join(scratch, "normalized-leak-public-report.md");
  const privateTitle = "Manifest Private   Title Alpha";
  const privateSourceUrl = "https://example.com/private/path%20with%20space?q=Research%20Notes&view=full";

  writeFileSync(manifestPath, `${JSON.stringify(controlledManifest(privateTitle, privateSourceUrl), null, 2)}\n`, "utf8");
  writeFileSync(
    safeReport,
    `# Safe report

| Field | Value |
|---|---|
| **Title** | <redacted:sample-note:title> |
| **Source URL** | <redacted:sample-note:source-url> |
`,
    "utf8",
  );
  writeFileSync(
    exactLeakReport,
    `# Exact leak report

Diagnostic title: ${privateTitle}
`,
    "utf8",
  );
  writeFileSync(
    normalizedLeakReport,
    `# Normalized leak report

Diagnostic title: manifest private title alpha
Diagnostic URL: https://example.com/private/path with space?q=research notes&amp;view=full
`,
    "utf8",
  );

  const unsafeManifest = runScanWithoutSmokeBypass(manifestPath, [safeReport]);
  assert(unsafeManifest.status === 1, "temporary manifest should fail without smoke-only bypass");
  assert(unsafeManifest.stderr.includes("unsafe_manifest_file"), "unsafe manifest failure should identify file safety");
  assert(!unsafeManifest.stderr.includes(privateTitle), "unsafe manifest failure must not print the private title");
  assert(!unsafeManifest.stderr.includes(privateSourceUrl), "unsafe manifest failure must not print the private source URL");

  const safe = runScan(manifestPath, [safeReport]);
  assert(safe.status === 0, "safe report should pass manifest-aware privacy scan");

  const exactLeak = runScan(manifestPath, [exactLeakReport]);
  assert(exactLeak.status === 1, "exact private title leak should fail");
  assert(exactLeak.stderr.includes('"match": "exact"'), "exact leak should be labeled as exact");
  assert(exactLeak.stderr.includes("expected_title"), "exact leak should identify expected_title");
  assert(!exactLeak.stderr.includes(privateTitle), "exact leak output must not print the private title");

  const normalizedLeak = runScan(manifestPath, [normalizedLeakReport]);
  assert(normalizedLeak.status === 1, "normalized private value leak should fail");
  assert(normalizedLeak.stderr.includes('"match": "normalized"'), "normalized leak should be labeled as normalized");
  assert(normalizedLeak.stderr.includes("expected_title"), "normalized leak should identify normalized title leak");
  assert(normalizedLeak.stderr.includes("source_url"), "normalized leak should identify normalized source URL leak");
  assert(!normalizedLeak.stderr.includes(privateTitle), "normalized leak output must not print the private title");
  assert(!normalizedLeak.stderr.includes(privateSourceUrl), "normalized leak output must not print the private source URL");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "safe redacted public report passes",
          "temporary manifest fails without explicit smoke-only bypass",
          "exact private manifest value leak fails without printing the private value",
          "normalized private title leak fails",
          "normalized private URL leak fails across percent-decoding and HTML entity decoding",
        ],
        noPersistentPrivateManifest: true,
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function runScan(manifestPath, files) {
  return spawnSync(process.execPath, [checker, "--allow-unsafe-manifest-for-smoke", "--manifest", manifestPath, ...files], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function runScanWithoutSmokeBypass(manifestPath, files) {
  return spawnSync(process.execPath, [checker, "--manifest", manifestPath, ...files], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function controlledManifest(privateTitle, privateSourceUrl) {
  const manifest = templateManifest();
  manifest.samples = manifest.samples.map((sample, index) => ({
    ...sample,
    cardId: `card-public-manifest-smoke-${index + 1}`,
    expectedTitle: index === 0 ? privateTitle : `Public manifest smoke ${sample.label}`,
    createdAt: "2026-06-24T12:00:00Z",
    sourceUrl: sample.contentType === "no_url" ? null : index === 0 ? privateSourceUrl : `https://example.com/public-manifest-smoke/${sample.label}`,
    allowTitleInPublicReport: false,
    allowSourceUrlInPublicReport: false,
  }));
  manifest.negativeControl = {
    label: "outside-window",
    cardId: "card-public-manifest-smoke-outside-window",
    createdAt: "2026-06-23T12:00:00Z",
    expectedTitle: "Public manifest smoke outside-window",
  };
  return manifest;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
