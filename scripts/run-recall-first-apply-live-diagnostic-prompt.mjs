#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

const PROMPT_API_KEY_ENV = "RECALL_PROMPT_LIVE_DIAGNOSTIC_API_KEY";
const PRIVATE_ROOT = "data/private/recall-live-spikes";
const CONTROLLED_PROBE_ARGS = new Set([
  "--api-key-env",
  "--no-env-file",
  "--probe-api-key-env",
  "--probe-env-file",
  "--probe-no-env-file",
]);
const PROMPT_GUARD_CONTROLLED_ARG_CASES = [
  "--api-key-env",
  "--api-key-env=RECALL_API_KEY",
  "--no-env-file",
  "--probe-api-key-env",
  "--probe-api-key-env=RECALL_API_KEY",
  "--probe-env-file",
  "--probe-env-file=data/private/recall-live-spikes/recall.env",
  "--probe-no-env-file",
];
const PROMPT_GUARD_ALLOWED_ARG_CASES = [
  "--base-url",
  "--confirm-live-api",
  "--env-file",
  "--manifest",
  "--output-file",
  "--prompt-guard-self-test",
  "--read-key-from-stdin",
];

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const promptGuardPreflight = runPromptGuardPreflight();

if (args.promptGuardSelfTest) {
  printPromptGuardSelfTest(promptGuardPreflight);
  process.exit(0);
}

if (args.outputFilePath && !isUnderPrivateRoot(resolve(args.outputFilePath))) {
  fail(
    "output_file_not_private",
    `Prompt diagnostic output file must stay under ${PRIVATE_ROOT}/.`,
    2,
  );
}

if (!args.confirmLiveApi && process.env.BRAIN_RECALL_CONFIRM_LIVE_API !== "1") {
  fail(
    "missing_live_api_confirmation",
    "Set --confirm-live-api or BRAIN_RECALL_CONFIRM_LIVE_API=1 before entering a key for the read-only live diagnostic.",
    2,
  );
}

let apiKey = "";
try {
  apiKey = args.readKeyFromStdin ? readKeyFromStdin() : await readHiddenLine("Recall API key: ");
  if (!apiKey.trim()) {
    fail("missing_prompt_api_key", "No Recall API key was entered.", 2);
  }

  const childEnv = {
    ...process.env,
    [PROMPT_API_KEY_ENV]: apiKey.trim(),
  };
  delete childEnv.RECALL_API_KEY;

  const childArgs = [
    "--",
    script("run-recall-first-apply-live-diagnostic.mjs"),
    ...(args.confirmLiveApi ? ["--confirm-live-api"] : []),
    "--probe-no-env-file",
    "--probe-api-key-env",
    PROMPT_API_KEY_ENV,
    ...args.passThrough,
  ];

  const result = spawnSync(process.execPath, childArgs, {
    cwd: process.cwd(),
    env: childEnv,
    encoding: "utf8",
  });

  const enrichedStdout = result.stdout ? enrichChildJsonOutput(result.stdout, promptGuardPreflight, args) : "";
  const enrichedStderr = result.stderr ? enrichChildJsonOutput(result.stderr, promptGuardPreflight, args) : "";
  if (args.outputFilePath) {
    writeOutputFile(args.outputFilePath, firstJsonOutput(enrichedStdout, enrichedStderr));
  }
  if (enrichedStdout) process.stdout.write(enrichedStdout);
  if (enrichedStderr) process.stderr.write(enrichedStderr);
  process.exit(result.status ?? 1);
} finally {
  apiKey = "";
}

function parseArgs(argv) {
  const parsed = {
    confirmLiveApi: false,
    help: false,
    outputFilePath: null,
    promptGuardSelfTest: false,
    readKeyFromStdin: false,
    passThrough: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help") {
      parsed.help = true;
    } else if (arg === "--confirm-live-api") {
      parsed.confirmLiveApi = true;
    } else if (arg === "--prompt-guard-self-test") {
      parsed.promptGuardSelfTest = true;
    } else if (arg === "--read-key-from-stdin") {
      parsed.readKeyFromStdin = true;
    } else if (arg === "--output-file" && argv[i + 1]) {
      parsed.outputFilePath = argv[i + 1];
      i += 1;
    } else if (isControlledProbeArg(arg)) {
      fail(
        "controlled_probe_argument",
        "Probe credential and env-file flags are controlled by this prompt wrapper.",
        2,
      );
    } else {
      parsed.passThrough.push(arg);
    }
  }

  return parsed;
}

function runPromptGuardPreflight() {
  const failures = [];
  for (const arg of PROMPT_GUARD_CONTROLLED_ARG_CASES) {
    if (!isControlledProbeArg(arg)) {
      failures.push(`controlled argument was not rejected by guard: ${arg}`);
    }
  }
  for (const arg of PROMPT_GUARD_ALLOWED_ARG_CASES) {
    if (isControlledProbeArg(arg)) {
      failures.push(`allowed wrapper argument was incorrectly treated as controlled: ${arg}`);
    }
  }
  if (failures.length > 0) {
    fail(
      "prompt_guard_preflight_failed",
      `Internal no-live prompt guard preflight failed before key entry: ${failures.join("; ")}`,
      1,
    );
  }
  return {
    controlledArgCases: PROMPT_GUARD_CONTROLLED_ARG_CASES.length,
    allowedArgCases: PROMPT_GUARD_ALLOWED_ARG_CASES.length,
  };
}

function printPromptGuardSelfTest(preflight) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: "first_apply_live_read_diagnostic_prompt_guard_self_test",
        checked: [
          "internal no-live preflight runs before any key prompt or stdin read",
          "controlled probe credential and env-file flags are rejected by the prompt wrapper",
          "normal wrapper arguments remain allowed",
        ],
        preflight,
        safetyNotes: [
          "No Recall API key was requested or read.",
          "No Recall API call was made.",
          "No env file was loaded.",
          "No proof refresh, production apply, deploy, scheduler enablement, or checkpoint advancement was performed.",
        ],
      },
      null,
      2,
    ),
  );
}

function enrichChildJsonOutput(text, preflight, parsedArgs) {
  const parsed = parseMaybeJson(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return text;
  }
  return `${JSON.stringify({ ...parsed, promptWrapper: promptWrapperSummary(preflight, parsedArgs) }, null, 2)}\n`;
}

function firstJsonOutput(...outputs) {
  for (const output of outputs) {
    if (parseMaybeJson(output)) return output;
  }
  return null;
}

function writeOutputFile(outputFilePath, output) {
  if (!output) {
    fail("no_json_output_for_output_file", "Child diagnostic did not produce parseable JSON for --output-file.", 1);
  }
  const resolved = resolve(outputFilePath);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, output.endsWith("\n") ? output : `${output}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  chmodSync(resolved, 0o600);
}

function promptWrapperSummary(preflight, parsedArgs) {
  return {
    preKeyGuarded: true,
    preflight,
    keyEntryMode: parsedArgs.readKeyFromStdin ? "stdin" : "hidden_tty_prompt",
    credentialMode: "local_prompt_env_file_disabled",
    childApiKeyEnv: PROMPT_API_KEY_ENV,
    envFileDisabledForProbe: true,
    controlledProbeArgsRejectedBeforeKeyEntry: true,
    secretPrinted: false,
    safetyNotes: [
      "The prompt wrapper ran its internal no-live guard before reading the Recall API key.",
      "The prompted key was passed only to the child process environment variable named by childApiKeyEnv.",
      "The child diagnostic was forced to ignore Recall env files for the read-only probe.",
      "The wrapper did not write the prompted key to disk.",
    ],
  };
}

function readKeyFromStdin() {
  return readFileSync(0, "utf8").trim();
}

function readHiddenLine(prompt) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    fail(
      "non_tty_prompt_requires_stdin_flag",
      "Use --read-key-from-stdin when stdin is not an interactive terminal.",
      2,
    );
  }

  return new Promise((resolvePromise, reject) => {
    const input = process.stdin;
    const output = process.stderr;
    let value = "";
    const wasRaw = input.isRaw;

    function cleanup() {
      input.removeListener("data", onData);
      input.setRawMode(Boolean(wasRaw));
      input.pause();
      output.write("\n");
    }

    function onData(chunk) {
      const text = chunk.toString("utf8");
      for (const char of text) {
        const code = char.charCodeAt(0);
        if (char === "\r" || char === "\n") {
          cleanup();
          resolvePromise(value);
          return;
        }
        if (code === 3) {
          cleanup();
          reject(new Error("Prompt cancelled."));
          return;
        }
        if (code === 8 || code === 127) {
          value = value.slice(0, -1);
          continue;
        }
        value += char;
      }
    }

    output.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

function script(name) {
  return resolve("scripts", name);
}

function fail(code, message, exitCode) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        mode: "first_apply_live_read_diagnostic_prompt",
        code,
        message: redact(message),
        safetyNotes: [
          "No Recall API key was printed.",
          "No Recall API key was written to disk by this wrapper.",
          "The child diagnostic is forced to ignore Recall env files for the live-read probe.",
          "No proof refresh, production apply, deploy, scheduler enablement, or checkpoint advancement was performed by this wrapper.",
        ],
      },
      null,
      2,
    ),
  );
  process.exit(exitCode);
}

function isControlledProbeArg(arg) {
  if (CONTROLLED_PROBE_ARGS.has(arg)) return true;
  return Array.from(CONTROLLED_PROBE_ARGS).some((flag) => arg.startsWith(`${flag}=`));
}

function redact(value) {
  return String(value)
    .replace(/\bAuthorization\s*:\s*Bearer\s+[^\s"'<>]+/gi, "Authorization: Bearer <redacted:token>")
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer <redacted:token>")
    .replace(/\b(RECALL_API_KEY\s*=\s*)[^\s"'<>]+/gi, "$1<redacted:secret>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>");
}

function parseMaybeJson(text) {
  try {
    return JSON.parse(String(text).trim());
  } catch {
    return null;
  }
}

function isUnderPrivateRoot(filePath) {
  const root = resolve(PRIVATE_ROOT);
  return filePath === root || filePath.startsWith(`${root}${sep}`);
}

function printHelp() {
  console.log(`Recall first-apply live diagnostic prompt

Prompts locally for a Recall API key, then runs the status-preserving read-only
live diagnostic with env-file loading disabled for the probe.

Usage:
  npm run recall:first-apply:live-diagnostic:prompt -- --confirm-live-api
  npm run recall:first-apply:live-diagnostic:prompt -- --confirm-live-api --base-url http://127.0.0.1:3000/api/v1
  npm run recall:first-apply:live-diagnostic:prompt -- --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json

Smoke/non-interactive usage:
  printf '%s\\n' '<key>' | npm run recall:first-apply:live-diagnostic:prompt -- --read-key-from-stdin --confirm-live-api
  npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test

Safety:
  - The key is passed only as a child process environment variable named ${PROMPT_API_KEY_ENV}.
  - The child diagnostic is forced to use --probe-no-env-file.
  - Probe credential and env-file flags are controlled by this wrapper and are rejected before prompting.
  - An internal no-live prompt guard preflight runs before any key prompt or stdin read.
  - No proof refresh, apply, deploy, scheduler enablement, or checkpoint change occurs.
`);
}
