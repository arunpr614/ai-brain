#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const DEFAULT_SCAN_ROOT = "docs/plans/spikes";
const LIVE_REPORT_NAME_PATTERN =
  /^SPIKE-01[34]-recall-(?:rest-enumeration|content-fidelity)-.+_IST\.md$/;

const SECRET_PATTERNS = [
  {
    name: "recall_api_key_assignment",
    pattern: /\bRECALL_API_KEY\s*=\s*(?!<redacted|<stored|<paste|<redacted locally>|sk_\.\.\.)[^\s"'<>]+/i,
  },
  {
    name: "authorization_bearer",
    pattern: /\bAuthorization\s*:\s*Bearer\s+(?!<redacted:token>)[^\s"'<>]+/i,
  },
  {
    name: "bare_bearer_token",
    pattern: /\bBearer\s+(?!<redacted:token>|<key>|\$\{)[A-Za-z0-9._-]{12,}/i,
  },
  {
    name: "sk_secret",
    pattern: /\bsk_[A-Za-z0-9._-]{12,}\b/i,
  },
  {
    name: "cookie_header",
    pattern: /\bCookie\s*:\s*(?!<redacted:cookie>)[^\s]/i,
  },
  {
    name: "signed_or_tokenized_query",
    pattern:
      /[?&](?:access_token|api_key|apikey|key|refresh_token|signature|sig|token|x-amz-credential|x-amz-security-token|x-amz-signature)=(?!<redacted>)[^&#\s"')]+/i,
  },
];

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const targets = collectTargets(args.paths);
const findings = [];

for (const filePath of targets) {
  const text = readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const secret of SECRET_PATTERNS) {
      if (secret.pattern.test(line)) {
        findings.push({
          file: filePath,
          line: index + 1,
          rule: secret.name,
          preview: preview(line),
        });
      }
    }
  });
}

if (targets.length === 0 && args.requireFiles) {
  console.error("[check:recall-public-privacy] failed");
  console.error(
    JSON.stringify(
      {
        ok: false,
        scannedFiles: 0,
        requireFiles: true,
        scope: scopeLabel(args.paths),
        findings: [
          {
            file: null,
            line: null,
            rule: "no_report_files_found",
            preview: "No Markdown files matched the Recall public privacy scan scope.",
          },
        ],
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

if (findings.length > 0) {
  console.error("[check:recall-public-privacy] failed");
  console.error(JSON.stringify({ ok: false, scannedFiles: targets.length, requireFiles: args.requireFiles, findings }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      scannedFiles: targets.length,
      requireFiles: args.requireFiles,
      scope: scopeLabel(args.paths),
    },
    null,
    2,
  ),
);

function parseArgs(argv) {
  const parsed = {
    paths: [],
    requireFiles: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help") {
      parsed.help = true;
    } else if (arg === "--require-files") {
      parsed.requireFiles = true;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    } else {
      parsed.paths.push(arg);
    }
  }

  return parsed;
}

function collectTargets(paths) {
  const explicitMode = paths.length > 0;
  const roots = explicitMode ? paths : [DEFAULT_SCAN_ROOT];
  const files = new Set();
  for (const root of roots) {
    const resolved = resolve(root);
    if (!existsSync(resolved)) continue;
    const stat = statSync(resolved);
    if (stat.isDirectory()) {
      for (const filePath of walk(resolved)) {
        if (isMarkdown(filePath) && shouldScan(filePath, explicitMode)) {
          files.add(filePath);
        }
      }
    } else if (stat.isFile()) {
      files.add(resolved);
    }
  }
  return Array.from(files).sort();
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function shouldScan(filePath, explicitMode) {
  if (explicitMode) return true;
  return LIVE_REPORT_NAME_PATTERN.test(basename(filePath));
}

function isMarkdown(filePath) {
  return filePath.toLowerCase().endsWith(".md");
}

function preview(line) {
  const redacted = redactPreview(line);
  return redacted.length > 180 ? `${redacted.slice(0, 177)}...` : redacted;
}

function redactPreview(line) {
  return line
    .replace(
      /\b(RECALL_API_KEY\s*=\s*)(?!<redacted|<stored|<paste|<redacted locally>|sk_\.\.\.)[^\s"'<>]+/gi,
      "$1<redacted:recall_api_key>",
    )
    .replace(/\b(Authorization\s*:\s*Bearer\s+)(?!<redacted:token>)[^\s"'<>]+/gi, "$1<redacted:token>")
    .replace(/\b(Bearer\s+)(?!<redacted:token>|<key>|\$\{)[A-Za-z0-9._-]{12,}/gi, "$1<redacted:token>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/gi, "sk_<redacted>")
    .replace(/\b(Cookie\s*:\s*)(?!<redacted:cookie>)[^\s]+/gi, "$1<redacted:cookie>")
    .replace(
      /([?&](?:access_token|api_key|apikey|key|refresh_token|signature|sig|token|x-amz-credential|x-amz-security-token|x-amz-signature)=)(?!<redacted>)[^&#\s"')]+/gi,
      "$1<redacted>",
    );
}

function scopeLabel(paths) {
  return paths.length > 0 ? "explicit files/directories" : "docs/plans/spikes/SPIKE-013|014 recall public reports";
}

function printHelp() {
  console.log(`Recall public privacy scan

Usage:
  npm run check:recall-public-privacy
  npm run check:recall-public-privacy -- --require-files
  node scripts/check-recall-public-privacy.mjs <file-or-directory> [...]
  node scripts/check-recall-public-privacy.mjs --require-files <file-or-directory> [...]

Default scope:
  docs/plans/spikes/SPIKE-013-recall-rest-enumeration-*_IST.md
  docs/plans/spikes/SPIKE-014-recall-content-fidelity-*_IST.md

The check fails on obvious public-report leaks such as raw RECALL_API_KEY values,
bearer tokens, sk_* secrets, cookies, and signed/tokenized URL query values.
Use --require-files when the caller expects reports to exist and zero scanned
files should fail closed.
`);
}
