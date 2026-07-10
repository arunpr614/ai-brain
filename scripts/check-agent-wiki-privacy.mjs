#!/usr/bin/env node
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const EXCLUDED_DIRECTORIES = new Set([".git", ".next", "node_modules", "build", "dist"]);
const PLACEHOLDER = String.raw`(?:<[^>]*(?:redacted|placeholder|example|stored|private)[^>]*>|\$\{[^}]+\}|example[_-][A-Za-z0-9_-]+)`;

const RULES = [
  {
    id: "local_user_path",
    pattern: /(?:\/Users\/[A-Za-z0-9._-]+|[A-Za-z]:\\Users\\[A-Za-z0-9._-]+)/i,
  },
  {
    id: "email_address",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  },
  {
    id: "personal_owner_name",
    pattern: /\bArun(?:\s+Prakash)?\b/i,
  },
  {
    id: "live_owner_hostname",
    pattern: /\b(?:brain\.)?arunp\.in\b/i,
  },
  {
    id: "credential_assignment",
    pattern: new RegExp(
      String.raw`\b(?:RECALL_API_KEY|ANTHROPIC_API_KEY|OPENAI_API_KEY|OPENROUTER_API_KEY|GEMINI_API_KEY|TELEGRAM_BOT_TOKEN|TELEGRAM_WEBHOOK_SECRET|BRAIN_API_TOKEN|BRAIN_SESSION_SECRET)\s*[:=]\s*(?!${PLACEHOLDER})[^\s\x60"'<>]{8,}`,
      "i",
    ),
  },
  {
    id: "generic_secret_assignment",
    pattern: new RegExp(
      String.raw`\b[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|API_KEY)[A-Z0-9_]*\s*[:=]\s*(?!${PLACEHOLDER})[A-Za-z0-9._~+/=-]{16,}`,
      "i",
    ),
  },
  {
    id: "bearer_token",
    pattern: /\b(?:Authorization\s*:\s*)?Bearer\s+(?!<redacted|<token|\$\{)[A-Za-z0-9._~+/=-]{16,}/i,
  },
  {
    id: "provider_key_shape",
    pattern: /\b(?:sk|sk-ant|sk-or|AIza|ghp|github_pat)[-_][A-Za-z0-9_-]{16,}/i,
  },
  {
    id: "telegram_bot_token",
    pattern: /\b(?:bot)?\d{7,12}:[A-Za-z0-9_-]{20,}\b/i,
  },
  {
    id: "cookie_or_session",
    pattern: /\b(?:Cookie|Set-Cookie|session|session_id)\s*[:=]\s*(?!<redacted|<cookie|\$\{)[^\s;]{12,}/i,
  },
  {
    id: "signed_or_tokenized_url",
    pattern: /[?&](?:access_token|api_key|apikey|key|refresh_token|signature|sig|token|x-amz-credential|x-amz-security-token|x-amz-signature)=(?!<redacted|<token|\$\{)[^&#\s"')]{8,}/i,
  },
  {
    id: "private_key_block",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  },
  {
    id: "dangerous_approval_text",
    pattern: /\bI approve\b.{0,200}\b(?:production|deploy|scheduler|Recall|apply|checkpoint|key rotation)\b/i,
  },
  {
    id: "live_host_ip",
    pattern: /\b(?:production|prod|remote|server|host|hostname|ssh)\b.{0,80}\b(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-5])(?:\.(?:\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])){3}\b/i,
  },
  {
    id: "tunnel_or_account_identifier",
    pattern: /\b(?:tunnel|account|dns(?:_record)?)\s*(?:id|uuid)?\s*[:=]\s*(?!<redacted|<identifier|\$\{)[0-9a-f]{24,}\b/i,
  },
];

const args = parseArgs(process.argv.slice(2));
if (args.help || args.paths.length === 0) {
  printHelp();
  process.exit(args.help ? 0 : 2);
}

const files = collectMarkdown(args.paths);
const findings = [];

if (args.requireFiles && files.length === 0) {
  findings.push({ file: null, line: null, rule: "no_markdown_files", preview: "<redacted:no files>" });
}

for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        findings.push({
          file,
          line: index + 1,
          rule: rule.id,
          preview: "<redacted:matched-content>",
        });
      }
    }
  }
}

const result = {
  ok: findings.length === 0,
  scannedFiles: files.length,
  requireFiles: args.requireFiles,
  findings,
};

if (!result.ok) {
  console.error("[check-agent-wiki-privacy] failed");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));

function parseArgs(argv) {
  const parsed = { paths: [], requireFiles: false, help: false };
  for (const arg of argv) {
    if (arg === "--require-files") parsed.requireFiles = true;
    else if (arg === "--help") parsed.help = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown argument: ${arg}`);
    else parsed.paths.push(arg);
  }
  return parsed;
}

function collectMarkdown(paths) {
  const found = new Set();
  for (const path of paths) {
    const absolute = resolve(path);
    let stat;
    try {
      stat = lstatSync(absolute);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isFile() && extname(absolute).toLowerCase() === ".md") found.add(absolute);
    if (stat.isDirectory()) walk(absolute, found);
  }
  return [...found].sort();
}

function walk(directory, found) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, found);
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") found.add(path);
  }
}

function printHelp() {
  console.log(`Agent wiki public-safety scanner

Usage:
  node scripts/check-agent-wiki-privacy.mjs --require-files <file-or-directory> [...]

The scanner inspects Markdown only, excludes repository metadata, fails closed
when requested files are absent, and never prints matched secret values.`);
}
