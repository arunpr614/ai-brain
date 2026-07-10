#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_MANIFEST_PATH,
  inspectControlledSampleManifestFile,
  loadControlledSampleManifest,
  PRIVATE_RECALL_EVIDENCE_ROOT,
  summarizeControlledSampleManifest,
  validateControlledSampleManifestFileSafety,
} from "./lib/recall-controlled-samples.mjs";
import {
  DEFAULT_RECALL_ENV_FILE_PATH,
  inspectRecallEnvFile,
  loadRecallEnvFile,
} from "./lib/recall-env-file.mjs";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const privateIgnore = runJsonCheck(["scripts/check-recall-private-ignore.mjs"]);
const manifest = inspectManifest(args.manifestPath);
const credential = inspectCredential(args.envFilePath);
const next = computeNext({ privateIgnore, manifest, credential, manifestPath: args.manifestPath });
const readyForApprovedLiveSpikes = next.status === "ready_for_approved_live_spikes";

const statusReport = {
  ok: readyForApprovedLiveSpikes,
  status: next.status,
  readyForApprovedLiveSpikes,
  privateEvidenceOk: privateIgnore.ok === true,
  privateIgnore,
  manifest,
  credential,
  next,
  safetyNotes: [
    "No live Recall API call was made.",
    "No API key value was printed.",
    "No private Recall title, source URL, or chunk content was printed.",
  ],
};

console.log(JSON.stringify(statusReport, null, 2));

if (args.requireReady && !readyForApprovedLiveSpikes) {
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {
    manifestPath: DEFAULT_MANIFEST_PATH,
    envFilePath: DEFAULT_RECALL_ENV_FILE_PATH,
    requireReady: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--manifest" && next) {
      parsed.manifestPath = next;
      i += 1;
    } else if (arg === "--env-file" && next) {
      parsed.envFilePath = next;
      i += 1;
    } else if (arg === "--require-ready") {
      parsed.requireReady = true;
    } else if (arg === "--help") {
      parsed.help = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return parsed;
}

function inspectManifest(path) {
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) {
    return {
      path,
      exists: false,
      status: "missing",
      valid: false,
      sampleCount: 0,
    };
  }

  const fileSafety = validateControlledSampleManifestFileSafety(path);
  if (!fileSafety.ok) {
    return {
      path,
      exists: true,
      status: "unsafe_file",
      valid: false,
      fileSafety: fileSafety.file,
      findings: fileSafety.findings,
    };
  }

  try {
    const summary = summarizeControlledSampleManifest(loadControlledSampleManifest(path));
    return {
      path,
      exists: true,
      status: "valid",
      valid: true,
      fileSafety: inspectControlledSampleManifestFile(path),
      dateWindow: summary.dateWindow,
      sampleCount: summary.sampleCount,
      requiredLabels: summary.requiredLabels,
      negativeControl: summary.negativeControl,
      publicPrivacy: summary.publicPrivacy,
    };
  } catch (error) {
    return {
      path,
      exists: true,
      status: "invalid",
      valid: false,
      fileSafety: inspectControlledSampleManifestFile(path),
      findings: Array.isArray(error?.findings)
        ? error.findings.map((finding) => ({
            path: finding.path,
            message: finding.message,
          }))
        : [{ path: "$", message: error instanceof Error ? error.message : String(error) }],
    };
  }
}

function inspectCredential(envFilePath) {
  const envFile = inspectRecallEnvFile(envFilePath);
  const loadedEnvFile =
    envFile.safeForSecretHandling === true && envFile.securePermissions === true
      ? loadRecallEnvFile(envFilePath)
      : null;
  return {
    recallApiKeyEnvPresent: Boolean(process.env.RECALL_API_KEY?.trim()),
    liveApiConfirmationPresent: process.env.BRAIN_RECALL_CONFIRM_LIVE_API === "1",
    recallEnvFile: {
      ...envFile,
      loaded: loadedEnvFile?.exists === true,
      loadedKeyCount: loadedEnvFile?.loadedKeyCount ?? 0,
    },
    approvedHandlingStillRequired: true,
  };
}

function computeNext({ privateIgnore, manifest, credential, manifestPath }) {
  if (privateIgnore.ok !== true) {
    return {
      status: "blocked_private_ignore",
      human: "Private Recall evidence paths are not safe yet.",
      command: "npm run check:recall-private-ignore",
    };
  }
  if (!manifest.exists) {
    return {
      status: "needs_manifest_template",
      human: "Create and fill the private controlled sample manifest.",
      command: "npm run recall:controlled-samples:init",
      then: [`npm run check:recall-prelive -- --manifest ${manifestPath}`],
    };
  }
  if (manifest.status === "unsafe_file") {
    const locationUnsafe = manifest.fileSafety?.safeForPrivateValues !== true;
    return locationUnsafe
      ? {
          status: "needs_manifest_file_safety_fix",
          human: "Move the private controlled sample manifest to an ignored, untracked private path before live Recall API work.",
          command: `npm run recall:controlled-samples:init -- --path ${DEFAULT_MANIFEST_PATH}`,
          then: [`npm run recall:live-gate:status -- --manifest ${DEFAULT_MANIFEST_PATH}`],
        }
      : {
          status: "needs_manifest_permission_fix",
          human: "Fix the private controlled sample manifest permissions before live Recall API work.",
          command: `chmod 600 ${manifest.fileSafety.path}`,
          then: [`npm run recall:live-gate:status -- --manifest ${manifestPath}`],
        };
  }
  if (!manifest.valid) {
    return {
      status: "needs_manifest_fix",
      human: "Fix the private controlled sample manifest.",
      command: `npm run check:recall-controlled-samples -- ${manifestPath}`,
    };
  }
  if (credential.recallEnvFile.exists && credential.recallEnvFile.safeForSecretHandling !== true) {
    return {
      status: "needs_env_file_safety_fix",
      human: "Move the local Recall env file to an ignored, untracked private path before live Recall API work.",
      command: `npm run recall:env:init -- --path ${DEFAULT_RECALL_ENV_FILE_PATH}`,
      then: [`npm run recall:live-gate:status -- --manifest ${manifestPath} --env-file ${DEFAULT_RECALL_ENV_FILE_PATH}`],
    };
  }
  if (credential.recallEnvFile.exists && credential.recallEnvFile.securePermissions !== true) {
    return {
      status: "needs_env_permission_fix",
      human: "Fix the ignored local Recall env file permissions before live Recall API work.",
      command: `chmod 600 ${credential.recallEnvFile.path}`,
      then: [`npm run recall:live-gate:status -- --manifest ${manifestPath} --env-file ${credential.recallEnvFile.path}`],
    };
  }
  if (!credential.recallApiKeyEnvPresent) {
    const suggestedEnvFilePath =
      credential.recallEnvFile.safeForSecretHandling === true
        ? credential.recallEnvFile.path
        : DEFAULT_RECALL_ENV_FILE_PATH;
    return {
      status: credential.recallEnvFile.exists ? "needs_env_key_or_approval" : "needs_api_key_approval",
      human: credential.recallEnvFile.exists
        ? "Add RECALL_API_KEY to the ignored local Recall env file after approval, then run the live gates."
        : "Choose an approved local API-key handling method before live Recall API work.",
      command: `npm run check:recall-prelive -- --manifest ${manifestPath}`,
      then: credential.recallEnvFile.exists
        ? [
            `npm run recall:live-gate:status -- --manifest ${manifestPath} --env-file ${credential.recallEnvFile.path} --require-ready`,
            `npm run recall:live-spikes -- --manifest ${manifestPath} --env-file ${credential.recallEnvFile.path} --confirm-live-api`,
          ]
        : [
            "npm run recall:env:init",
            `Edit ${suggestedEnvFilePath} locally after API-key handling approval`,
            `npm run recall:live-gate:status -- --manifest ${manifestPath} --env-file ${suggestedEnvFilePath} --require-ready`,
            `npm run recall:live-spikes -- --manifest ${manifestPath} --env-file ${suggestedEnvFilePath} --confirm-live-api`,
          ],
    };
  }
  if (!credential.liveApiConfirmationPresent) {
    return {
      status: "needs_live_api_confirmation",
      human: "Set explicit live API confirmation only after approval, then run live spikes.",
      command: `npm run check:recall-prelive -- --manifest ${manifestPath}`,
      then: [
        `npm run recall:live-spikes -- --manifest ${manifestPath} --env-file ${credential.recallEnvFile.path} --confirm-live-api`,
      ],
    };
  }
  return {
    status: "ready_for_approved_live_spikes",
    human: "Offline gates, manifest, API-key presence, and live confirmation are ready; run live spikes only if API-key handling and controlled samples are approved.",
    command: `npm run check:recall-prelive -- --manifest ${manifestPath}`,
    then: [
      `npm run recall:live-spikes -- --manifest ${manifestPath} --env-file ${credential.recallEnvFile.path} --confirm-live-api`,
    ],
  };
}

function runJsonCheck(args) {
  const result = spawnSync(process.execPath, ["--", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return {
      ok: false,
      exitCode: result.status,
      stderrPreview: preview(result.stderr),
    };
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return {
      ok: false,
      exitCode: result.status,
      stdoutPreview: preview(result.stdout),
    };
  }
}

function preview(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length > 300 ? `${trimmed.slice(0, 297)}...` : trimmed;
}

function printHelp() {
  console.log(`Recall live gate status

Usage:
  npm run recall:live-gate:status
  npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json
  npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json --env-file data/private/recall-live-spikes/recall.env
  npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json

This command does not call the live Recall API and does not print API keys,
private Recall titles, source URLs, chunks, or raw live payloads.
It exits successfully as a status report, but JSON \`ok\` is true only when
\`readyForApprovedLiveSpikes\` is true and status is \`ready_for_approved_live_spikes\`.
\`--require-ready\` prints the same JSON but exits nonzero unless the ready
state is reached.
\`privateEvidenceOk\` reports the private-ignore guard separately.

Private controlled sample manifests must stay under ${PRIVATE_RECALL_EVIDENCE_ROOT}/,
remain ignored/untracked, and be owner-readable only.
`);
}
