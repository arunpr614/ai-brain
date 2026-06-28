#!/usr/bin/env node
import {
  assertControlledSampleManifestFileSafety,
  DEFAULT_MANIFEST_PATH,
  loadControlledSampleManifest,
  summarizeControlledSampleManifest,
  templateManifest,
} from "./lib/recall-controlled-samples.mjs";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (args.template) {
  console.log(JSON.stringify(templateManifest(), null, 2));
  process.exit(0);
}

try {
  const manifestPath = args.path ?? DEFAULT_MANIFEST_PATH;
  const fileSafety = assertControlledSampleManifestFileSafety(manifestPath);
  const manifest = loadControlledSampleManifest(manifestPath);
  console.log(JSON.stringify({ ...summarizeControlledSampleManifest(manifest), fileSafety }, null, 2));
} catch (error) {
  if (error?.code === "RECALL_CONTROLLED_MANIFEST_MISSING") {
    console.error(error.message);
    process.exit(2);
  }
  if (error?.code === "RECALL_CONTROLLED_MANIFEST_FILE_UNSAFE") {
    console.error(error.message);
    console.error(
      JSON.stringify(
        {
          manifestPath: error.manifestPath,
          fileSafety: error.fileSafety,
          findings: error.findings,
        },
        null,
        2,
      ),
    );
    process.exit(3);
  }
  if (error?.code === "RECALL_CONTROLLED_MANIFEST_INVALID") {
    console.error(error.message);
    console.error(
      JSON.stringify(
        {
          manifestPath: error.manifestPath,
          findings: error.findings,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
  throw error;
}

function parseArgs(argv) {
  const parsed = {
    path: null,
    template: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--template") {
      parsed.template = true;
    } else if (arg === "--help") {
      parsed.help = true;
    } else if ((arg === "--path" || arg === "-p") && next) {
      parsed.path = next;
      i += 1;
    } else if (!arg.startsWith("-") && !parsed.path) {
      parsed.path = arg;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`Recall controlled sample manifest check

Usage:
  npm run recall:controlled-samples:init
  node scripts/check-recall-controlled-samples.mjs --template
  node scripts/check-recall-controlled-samples.mjs data/private/recall-live-spikes/controlled-samples.json
  npm run check:recall-controlled-samples -- data/private/recall-live-spikes/controlled-samples.json

Default path:
  ${DEFAULT_MANIFEST_PATH}

The manifest is private live-spike evidence. Keep it under data/private/recall-live-spikes/.
The validator rejects existing manifest files that are not ignored, are tracked, or are not owner-only.
`);
}
