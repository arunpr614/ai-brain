#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

const PRIVATE_ROOT = "data/private/recall-live-spikes";
const DEFAULT_ENV_FILE = "data/private/recall-live-spikes/recall.env";
const DEFAULT_EVIDENCE_FILE = "data/private/recall-live-spikes/key-rotation-evidence.json";
const DEFAULT_MIN_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";
const REQUIRED_KEY_ROTATION_ACK =
  "I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

preflightBeforeKeyRead();

let apiKey = "";
try {
  apiKey = args.readKeyFromStdin ? readKeyFromStdin() : await readHiddenLine("Rotated Recall API key: ");
  const normalizedKey = normalizeKey(apiKey);
  writePrivateEnv(normalizedKey);
  apiKey = "";

  const gate = runKeyEvidenceGate();
  if (!gate.ok) {
    fail("key_rotation_evidence_gate_failed", "Rotated env file was written, but key-rotation evidence still failed.", 1, {
      envFile: summarizeEnvFile(),
      keyEvidenceGate: gate.summary,
      nextCommands: [
        "npm run check:recall-key-rotation-evidence",
        `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation`,
      ],
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: "rotated_recall_private_env_written",
        envFile: summarizeEnvFile(),
        keyEvidenceGate: gate.summary,
        nextCommands: [
          "npm run recall:first-apply:prepare-plan",
          `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation`,
          "npm run recall:first-apply:status",
        ],
        safetyNotes: [
          "The Recall API key was written only to the ignored private env file.",
          "The Recall API key was not printed.",
          "Live API confirmation remains disabled in the env file.",
          "No Recall API call was made.",
          "No key-rotation evidence file was recorded.",
          "No proof was refreshed.",
          "No first capped apply was run.",
          "No production deploy was run.",
          "No scheduler was enabled.",
          "No checkpoint was advanced.",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  apiKey = "";
}

function preflightBeforeKeyRead() {
  if (process.env.BRAIN_RECALL_KEY_ROTATION_ACK !== REQUIRED_KEY_ROTATION_ACK) {
    fail(
      "missing_exact_key_rotation_ack",
      "Exact BRAIN_RECALL_KEY_ROTATION_ACK text is required before writing a rotated Recall key to the private env file.",
      2,
    );
  }

  if (!isUnderPrivateRoot(resolve(args.envFilePath))) {
    fail("env_file_not_private", `Recall env file must stay under ${PRIVATE_ROOT}/.`, 2);
  }

  runPrivateIgnoreCheck();

  if (existsSync(resolve(args.envFilePath)) && !args.replaceExisting) {
    fail("env_file_exists", "Private Recall env file already exists. Use --replace-existing after external key rotation.", 3, {
      envFile: args.envFilePath,
      nextCommand:
        `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" npm run recall:key-rotation:write-env -- --replace-existing`,
    });
  }
}

function normalizeKey(value) {
  const key = String(value ?? "").trim();
  if (!key) {
    fail("missing_recall_api_key", "No Recall API key was entered.", 2);
  }
  if (/[\r\n\0]/.test(key)) {
    fail("invalid_recall_api_key", "Recall API key must be a single-line value.", 2);
  }
  if (!/^sk_[A-Za-z0-9._-]{12,}$/.test(key)) {
    fail("invalid_recall_api_key_shape", "Recall API key must look like a Recall sk_ key.", 2);
  }
  return key;
}

function writePrivateEnv(key) {
  const resolved = resolve(args.envFilePath);
  mkdirSync(dirname(resolved), { recursive: true, mode: 0o700 });
  writeFileSync(resolved, privateEnvTemplate(key), { encoding: "utf8", mode: 0o600 });
  chmodSync(resolved, 0o600);
}

function privateEnvTemplate(key) {
  return `# Private Recall API environment for approved live gates.
# This file is intentionally under ${PRIVATE_ROOT}/.
# The key was rotated outside chat and written locally by recall:key-rotation:write-env.
# Do not commit this file.

export RECALL_API_KEY=${JSON.stringify(key)}

# Keep this at 0 until an exact live command is approved.
# You can also pass --confirm-live-api to the approved command instead.
export BRAIN_RECALL_CONFIRM_LIVE_API=0
`;
}

function runKeyEvidenceGate() {
  const result = spawnSync(
    process.execPath,
    [
      "--",
      "scripts/check-recall-key-rotation-evidence.mjs",
      "--env-file",
      args.envFilePath,
      "--evidence-file",
      args.evidenceFilePath,
      "--min-rotated-after",
      args.minRotatedAfterIso,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
  const parsed = parseMaybeJson(result.status === 0 ? result.stdout : result.stderr || result.stdout);
  return {
    ok: result.status === 0 && parsed?.ok === true,
    summary: parsed
      ? {
          ok: parsed.ok === true,
          verdict: parsed.verdict ?? null,
          evidenceSource: parsed.evidenceSource ?? null,
          envFile: parsed.summary?.envFile ?? args.envFilePath,
          evidenceFile: parsed.summary?.evidenceFile ?? args.evidenceFilePath,
          mtimeIso: parsed.summary?.mtimeIso ?? null,
          mode: parsed.summary?.mode ?? null,
          findings: Array.isArray(parsed.findings)
            ? parsed.findings.map((finding) => ({ rule: finding.rule ?? null, message: redact(finding.message ?? "") }))
            : [],
        }
      : { ok: false, exitCode: result.status },
  };
}

function summarizeEnvFile() {
  const stats = statSync(resolve(args.envFilePath));
  return {
    path: args.envFilePath,
    mode: (stats.mode & 0o777).toString(8).padStart(3, "0"),
    mtimeIso: stats.mtime.toISOString(),
    underPrivateRecallEvidencePath: isUnderPrivateRoot(resolve(args.envFilePath)),
    ignored: isGitIgnored(args.envFilePath),
    tracked: isGitTracked(args.envFilePath),
    containsApiKeyValue: true,
    keyPrinted: false,
    liveApiConfirmationDefault: "0",
  };
}

function runPrivateIgnoreCheck() {
  const result = spawnSync(process.execPath, ["scripts/check-recall-private-ignore.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    fail("private_ignore_check_failed", "Private ignore check failed; not reading or writing a Recall key.", 1);
  }
}

function readKeyFromStdin() {
  return readFileSync(0, "utf8").trim();
}

function readHiddenLine(prompt) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    fail("non_tty_prompt_requires_stdin_flag", "Use --read-key-from-stdin when stdin is not an interactive terminal.", 2);
  }

  return new Promise((resolvePromise, reject) => {
    const input = process.stdin;
    const output = process.stderr;
    let value = "";
    const wasRaw = input.isRaw;

    function cleanup() {
      input.removeListener("data", onData);
      if (!wasRaw) input.setRawMode(false);
      input.pause();
      output.write("\n");
    }

    function onData(chunk) {
      const text = chunk.toString("utf8");
      for (const char of text) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("cancelled"));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          resolvePromise(value);
          return;
        }
        if (char === "\u007f") {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    }

    output.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

function parseArgs(argv) {
  const parsed = {
    envFilePath: DEFAULT_ENV_FILE,
    evidenceFilePath: DEFAULT_EVIDENCE_FILE,
    minRotatedAfterIso: DEFAULT_MIN_ROTATED_AFTER_ISO,
    replaceExisting: false,
    readKeyFromStdin: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--read-key-from-stdin") parsed.readKeyFromStdin = true;
    else if (arg === "--replace-existing") parsed.replaceExisting = true;
    else if (arg === "--env-file" && next) parsed.envFilePath = consume(argv, ++i);
    else if (arg === "--evidence-file" && next) parsed.evidenceFilePath = consume(argv, ++i);
    else if (arg === "--min-rotated-after" && next) parsed.minRotatedAfterIso = consume(argv, ++i);
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  if (!Number.isFinite(Date.parse(parsed.minRotatedAfterIso))) {
    throw new Error("--min-rotated-after must be a valid ISO timestamp.");
  }
  return parsed;
}

function consume(argv, index) {
  return argv[index];
}

function isUnderPrivateRoot(filePath) {
  const root = resolve(PRIVATE_ROOT);
  return filePath === root || filePath.startsWith(`${root}${sep}`);
}

function isGitIgnored(filePath) {
  const result = spawnSync("git", ["check-ignore", "-q", "--", filePath], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return result.status === 0;
}

function isGitTracked(filePath) {
  const result = spawnSync("git", ["ls-files", "--error-unmatch", "--", filePath], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return result.status === 0;
}

function parseMaybeJson(text) {
  const trimmed = String(text ?? "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function redact(value) {
  return String(value)
    .replace(/\bAuthorization\s*:\s*Bearer\s+[^\s"'<>]+/gi, "Authorization: Bearer <redacted:token>")
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer <redacted:token>")
    .replace(/\b(RECALL_API_KEY\s*=\s*)[^\s"'<>]+/gi, "$1<redacted:secret>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>");
}

function fail(code, message, exitCode, extra = {}) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        code,
        message: redact(message),
        ...extra,
        safetyNotes: [
          "No Recall API key was printed.",
          "No Recall API call was made.",
          "No key-rotation evidence file was recorded.",
          "No proof was refreshed.",
          "No first capped apply was run.",
          "No production deploy was run.",
          "No scheduler was enabled.",
          "No checkpoint was advanced.",
        ],
      },
      null,
      2,
    ),
  );
  process.exit(exitCode);
}

function printHelp() {
  console.log(`Write a rotated Recall API key to the ignored private env file

Usage:
  BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" npm run recall:key-rotation:write-env -- --replace-existing
  BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" npm run recall:key-rotation:write-env -- --env-file data/private/recall-live-spikes/recall.env --replace-existing

Options:
  --env-file <path>          Private Recall env file. Defaults to ${DEFAULT_ENV_FILE}.
  --evidence-file <path>     Private evidence path used by the metadata gate. Defaults to ${DEFAULT_EVIDENCE_FILE}.
  --min-rotated-after <iso>  Required post-chat rotation checkpoint. Defaults to ${DEFAULT_MIN_ROTATED_AFTER_ISO}.
  --replace-existing         Required when the env file already exists.
  --read-key-from-stdin      Read the key from stdin instead of a hidden TTY prompt.

This command writes the key only to ${PRIVATE_ROOT}/, keeps live confirmation
disabled, runs the no-live key-rotation metadata gate, and stops. It does not
call Recall, record evidence, refresh proof, apply, deploy, schedule, or move
checkpoints.
`);
}
