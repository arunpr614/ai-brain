#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { DEFAULT_MANIFEST_PATH, templateManifest } from "./lib/recall-controlled-samples.mjs";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const template = `${JSON.stringify(templateManifest(), null, 2)}\n`;

if (args.stdout) {
  process.stdout.write(template);
  process.exit(0);
}

if (!isPrivateManifestPath(args.path)) {
  console.error(
    `[recall:controlled-samples:init] refusing to write outside data/private/recall-live-spikes/: ${args.path}`,
  );
  process.exit(2);
}

runPrivateIgnoreCheck();

const manifestPath = resolve(args.path);
if (existsSync(manifestPath) && !args.force) {
  console.error(
    `[recall:controlled-samples:init] manifest already exists: ${manifestPath}\n` +
      "Use --force only if you intentionally want to replace the local private template.",
  );
  process.exit(3);
}

mkdirSync(dirname(manifestPath), { recursive: true, mode: 0o700 });
writeFileSync(manifestPath, template, { encoding: "utf8", mode: 0o600 });
chmodSync(manifestPath, 0o600);

console.log(
  JSON.stringify(
    {
      ok: true,
      manifestPath,
      privateIgnoreChecked: true,
      wroteTemplate: true,
      overwritten: args.force,
      nextSteps: [
        "Open the private manifest locally and replace every placeholder.",
        "Keep allowTitleInPublicReport and allowSourceUrlInPublicReport false; public SPIKE reports are redacted-only.",
        `Run: npm run check:recall-controlled-samples -- ${args.path}`,
        `Run: npm run check:recall-prelive -- --manifest ${args.path}`,
      ],
    },
    null,
    2,
  ),
);

function parseArgs(argv) {
  const parsed = {
    path: DEFAULT_MANIFEST_PATH,
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
    console.error("[recall:controlled-samples:init] private ignore check failed; not writing template.");
    if (result.stdout.trim()) console.error(result.stdout.trim());
    if (result.stderr.trim()) console.error(result.stderr.trim());
    process.exit(1);
  }
}

function isPrivateManifestPath(path) {
  const privateRoot = resolve("data/private/recall-live-spikes");
  const target = resolve(path);
  return target.startsWith(`${privateRoot}${sep}`);
}

function printHelp() {
  console.log(`Recall controlled sample manifest initializer

Usage:
  npm run recall:controlled-samples:init
  npm run recall:controlled-samples:init -- --path data/private/recall-live-spikes/controlled-samples.json
  node scripts/init-recall-controlled-samples.mjs --stdout

Options:
  --path <path>   Private manifest path. Defaults to ${DEFAULT_MANIFEST_PATH}.
  --force         Overwrite an existing private manifest template.
  --stdout        Print the template instead of writing a file.

The writer refuses paths outside data/private/recall-live-spikes/ and runs the
private ignore guard before creating the template.
`);
}
