#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

const DEFAULT_ENV_PATH = "data/private/recall-live-spikes/recall.env";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const template = recallEnvTemplate();

if (args.stdout) {
  process.stdout.write(template);
  process.exit(0);
}

if (!isPrivateRecallEnvPath(args.path)) {
  console.error(`[recall:env:init] refusing to write outside data/private/recall-live-spikes/: ${args.path}`);
  process.exit(2);
}

runPrivateIgnoreCheck();

const envPath = resolve(args.path);
if (existsSync(envPath) && !args.force) {
  console.error(
    `[recall:env:init] env template already exists: ${envPath}\n` +
      "Use --force only if you intentionally want to replace the local private template.",
  );
  process.exit(3);
}

mkdirSync(dirname(envPath), { recursive: true, mode: 0o700 });
writeFileSync(envPath, template, { encoding: "utf8", mode: 0o600 });
chmodSync(envPath, 0o600);

console.log(
  JSON.stringify(
    {
      ok: true,
      envPath,
      privateIgnoreChecked: true,
      wroteTemplate: true,
      overwritten: args.force,
      containsApiKeyValue: false,
      liveApiConfirmationDefault: "0",
      nextSteps: [
        "Edit the private file locally only after API-key handling is approved.",
        "Paste the Recall API key into RECALL_API_KEY.",
        "Keep BRAIN_RECALL_CONFIRM_LIVE_API=0 until the exact live command is approved.",
        `Run: source ${args.path}`,
        "Run: npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json",
      ],
    },
    null,
    2,
  ),
);

function recallEnvTemplate() {
  return `# Private Recall API environment for approved live gates.
# This file is intentionally under data/private/recall-live-spikes/.
# Do not commit this file. Keep RECALL_API_KEY empty until API-key handling is approved.

export RECALL_API_KEY=""

# Keep this at 0 until the exact live API command is approved.
# You can also pass --confirm-live-api to the approved command instead.
export BRAIN_RECALL_CONFIRM_LIVE_API=0
`;
}

function parseArgs(argv) {
  const parsed = {
    path: DEFAULT_ENV_PATH,
    force: false,
    stdout: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if ((arg === "--path" || arg === "-p") && next) {
      parsed.path = next;
      i += 1;
    } else if (arg === "--force") {
      parsed.force = true;
    } else if (arg === "--stdout") {
      parsed.stdout = true;
    } else if (arg === "--help") {
      parsed.help = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return parsed;
}

function runPrivateIgnoreCheck() {
  const result = spawnSync(process.execPath, ["scripts/check-recall-private-ignore.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error("[recall:env:init] private ignore check failed; not writing template.");
    if (result.stdout.trim()) console.error(result.stdout.trim());
    if (result.stderr.trim()) console.error(result.stderr.trim());
    process.exit(1);
  }
}

function isPrivateRecallEnvPath(path) {
  const privateRoot = resolve("data/private/recall-live-spikes");
  const target = resolve(path);
  return target.startsWith(`${privateRoot}${sep}`);
}

function printHelp() {
  console.log(`Recall private env template initializer

Usage:
  npm run recall:env:init
  npm run recall:env:init -- --path data/private/recall-live-spikes/recall.env
  node scripts/init-recall-env.mjs --stdout

Options:
  --path <path>   Private env path. Defaults to ${DEFAULT_ENV_PATH}.
  --force         Overwrite an existing private env template.
  --stdout        Print the template instead of writing a file.

The writer refuses paths outside data/private/recall-live-spikes/ and runs the
private ignore guard before creating the template. The template never includes
a real API key and defaults live API confirmation to 0.
`);
}
