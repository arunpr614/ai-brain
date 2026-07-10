#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_ENV_FILE = "data/private/recall-live-spikes/recall.env";
const DEFAULT_EVIDENCE_FILE = "data/private/recall-live-spikes/key-rotation-evidence.json";
const PRIVATE_ROOT = "data/private/recall-live-spikes";
const DEFAULT_MIN_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";
const EVIDENCE_SECRET_PATTERNS = [
  {
    rule: "key_rotation_evidence_contains_recall_api_key_assignment",
    pattern:
      /\bRECALL_API_KEY\s*=\s*(?!<redacted|<stored|<paste|<local|<empty|<RECALL_API_KEY>|sk_\.\.\.)[^\s"'<>]+/i,
  },
  {
    rule: "key_rotation_evidence_contains_authorization_bearer",
    pattern: /\bAuthorization\s*:\s*Bearer\s+(?!<redacted:token>|<key>|<RECALL_API_KEY>|\$\{)[^\s"'<>]+/i,
  },
  {
    rule: "key_rotation_evidence_contains_bare_bearer_token",
    pattern: /\bBearer\s+(?!<redacted:token>|<key>|<RECALL_API_KEY>|\$\{)[A-Za-z0-9._-]{12,}/i,
  },
  {
    rule: "key_rotation_evidence_contains_sk_secret",
    pattern: /\bsk_[A-Za-z0-9._-]{12,}\b/i,
  },
  {
    rule: "key_rotation_evidence_contains_cookie_header",
    pattern: /\bCookie\s*:\s*(?!<redacted:cookie>)[^\s]/i,
  },
  {
    rule: "key_rotation_evidence_contains_signed_or_tokenized_query",
    pattern:
      /[?&](?:access_token|api_key|apikey|key|refresh_token|signature|sig|token|x-amz-credential|x-amz-security-token|x-amz-signature)=(?!<redacted>)[^&#\s"')]+/i,
  },
];

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const findings = [];
const envFilePath = resolve(args.envFilePath);
const minRotatedAfterMs = Date.parse(args.minRotatedAfterIso);

if (Number.isNaN(minRotatedAfterMs)) {
  findings.push({
    rule: "invalid_min_rotated_after",
    message: `Invalid --min-rotated-after value: ${args.minRotatedAfterIso}`,
  });
}

const summary = {
  envFile: args.envFilePath,
  evidenceFile: args.evidenceFilePath,
  systemEnvFile: args.systemEnvFile,
  minRotatedAfterIso: Number.isNaN(minRotatedAfterMs) ? args.minRotatedAfterIso : new Date(minRotatedAfterMs).toISOString(),
  exists: existsSync(envFilePath),
};
let envFileMtimePasses = false;

if (!summary.exists) {
  findings.push({
    rule: "missing_env_file",
    message: "Recall env file does not exist.",
  });
} else {
  const stats = statSync(envFilePath);
  const mode = stats.mode & 0o777;
  Object.assign(summary, {
    mtimeIso: stats.mtime.toISOString(),
    mode: mode.toString(8).padStart(3, "0"),
    underPrivateRecallEvidencePath: isUnderPrivateRoot(envFilePath),
    ignored: args.systemEnvFile ? null : isGitIgnored(args.envFilePath),
    tracked: args.systemEnvFile ? null : isGitTracked(args.envFilePath),
  });

  if (!args.systemEnvFile && !summary.underPrivateRecallEvidencePath) {
    findings.push({
      rule: "env_file_not_private",
      message: `Recall env file must stay under ${PRIVATE_ROOT}/.`,
    });
  }
  if (!args.systemEnvFile && !summary.ignored) {
    findings.push({
      rule: "env_file_not_ignored",
      message: "Recall env file must be ignored by git.",
    });
  }
  if (!args.systemEnvFile && summary.tracked) {
    findings.push({
      rule: "env_file_tracked",
      message: "Recall env file must not be tracked by git.",
    });
  }
  if (args.systemEnvFile ? !hasSecureSystemMode(mode) : !hasSecurePrivateMode(mode)) {
    findings.push({
      rule: "env_file_insecure_permissions",
      message: args.systemEnvFile
        ? "Recall system env file must be owner-readable with no group write/execute and no other permissions, for example mode 0600 or 0640."
        : "Recall env file must be owner-readable only, for example mode 0600.",
    });
  }
  if (!Number.isNaN(minRotatedAfterMs) && stats.mtimeMs < minRotatedAfterMs) {
    findings.push({
      rule: "env_file_not_rotated_after_checkpoint",
      message: "Recall env file mtime is older than the required key rotation checkpoint.",
    });
  } else if (!Number.isNaN(minRotatedAfterMs)) {
    envFileMtimePasses = true;
  }
}

const evidence = args.evidenceFilePath
  ? inspectEvidenceFile(args.evidenceFilePath, {
      envFilePath: args.envFilePath,
      minRotatedAfterMs,
      minRotatedAfterIso: summary.minRotatedAfterIso,
      systemEnvFile: args.systemEnvFile,
    })
  : { ok: false, skipped: true, findings: [] };
summary.privateEvidenceFile = evidence.summary ?? null;

if (!envFileMtimePasses && evidence.ok) {
  removeFinding("env_file_not_rotated_after_checkpoint");
} else if (!envFileMtimePasses) {
  findings.push(...evidence.findings);
}

if (findings.length > 0) {
  console.error("[check:recall-key-rotation-evidence] failed");
  console.error(
    JSON.stringify(
      {
        ok: false,
        summary,
        findings,
        nextGate:
          "Rotate the Recall API key, update only the ignored private Recall env file, then rerun this gate. If env-file mtime remains stale after real rotation, prefer BRAIN_RECALL_KEY_ROTATION_ACK=\"<exact acknowledgement>\" BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation to record ignored private evidence and refresh stale proof before first capped apply; use npm run recall:key-rotation-evidence:record only as the lower-level evidence command.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
      {
        ok: true,
        verdict: "PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE",
        evidenceSource: envFileMtimePasses ? "env_file_mtime" : "private_evidence_file",
        summary,
        nextGate:
          "Local key-rotation evidence passed. Explicit first capped apply approval and key rotation acknowledgement are still required before apply.",
    },
    null,
    2,
  ),
);

function parseArgs(argv) {
  const parsed = {
    envFilePath: DEFAULT_ENV_FILE,
    evidenceFilePath: DEFAULT_EVIDENCE_FILE,
    minRotatedAfterIso: DEFAULT_MIN_ROTATED_AFTER_ISO,
    systemEnvFile: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") {
      parsed.help = true;
    } else if (arg === "--env-file" && next) {
      parsed.envFilePath = next;
      i += 1;
    } else if (arg === "--evidence-file" && next) {
      parsed.evidenceFilePath = next;
      i += 1;
    } else if (arg === "--no-evidence-file") {
      parsed.evidenceFilePath = null;
    } else if (arg === "--min-rotated-after" && next) {
      parsed.minRotatedAfterIso = next;
      i += 1;
    } else if (arg === "--system-env-file") {
      parsed.systemEnvFile = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
}

function removeFinding(rule) {
  for (let index = findings.length - 1; index >= 0; index -= 1) {
    if (findings[index]?.rule === rule) findings.splice(index, 1);
  }
}

function inspectEvidenceFile(evidenceFilePath, options) {
  const evidenceFile = resolve(evidenceFilePath);
  const summary = {
    path: evidenceFilePath,
    exists: existsSync(evidenceFile),
    underPrivateRecallEvidencePath: options.systemEnvFile ? null : isUnderPrivateRoot(evidenceFile),
    ignored: options.systemEnvFile ? null : isGitIgnored(evidenceFilePath),
    tracked: options.systemEnvFile ? null : isGitTracked(evidenceFilePath),
  };
  const evidenceFindings = [];

  if (!summary.exists) {
    evidenceFindings.push({
      rule: "missing_key_rotation_evidence_file",
      message: "Private key rotation evidence file does not exist.",
    });
    return { ok: false, summary, findings: evidenceFindings };
  }

  const stats = statSync(evidenceFile);
  const mode = stats.mode & 0o777;
  Object.assign(summary, {
    mtimeIso: stats.mtime.toISOString(),
    mode: mode.toString(8).padStart(3, "0"),
  });

  if (!options.systemEnvFile && !summary.underPrivateRecallEvidencePath) {
    evidenceFindings.push({
      rule: "key_rotation_evidence_file_not_private",
      message: `Private key rotation evidence file must stay under ${PRIVATE_ROOT}/.`,
    });
  }
  if (!options.systemEnvFile && !summary.ignored) {
    evidenceFindings.push({
      rule: "key_rotation_evidence_file_not_ignored",
      message: "Private key rotation evidence file must be ignored by git.",
    });
  }
  if (!options.systemEnvFile && summary.tracked) {
    evidenceFindings.push({
      rule: "key_rotation_evidence_file_tracked",
      message: "Private key rotation evidence file must not be tracked by git.",
    });
  }
  if (options.systemEnvFile ? !hasSecureSystemMode(mode) : !hasSecurePrivateMode(mode)) {
    evidenceFindings.push({
      rule: "key_rotation_evidence_file_insecure_permissions",
      message: options.systemEnvFile
        ? "Private key rotation evidence file must be owner-readable with no group write/execute and no other permissions, for example mode 0600 or 0640."
        : "Private key rotation evidence file must be owner-readable only, for example mode 0600.",
    });
  }
  if (!Number.isNaN(options.minRotatedAfterMs) && stats.mtimeMs < options.minRotatedAfterMs) {
    evidenceFindings.push({
      rule: "key_rotation_evidence_file_not_after_checkpoint",
      message: "Private key rotation evidence file mtime is older than the required key rotation checkpoint.",
    });
  }

  let parsed = null;
  let evidenceText = "";
  try {
    evidenceText = readFileSync(evidenceFile, "utf8");
    parsed = JSON.parse(evidenceText);
  } catch {
    evidenceFindings.push({
      rule: "invalid_key_rotation_evidence_json",
      message: "Private key rotation evidence file is not valid JSON.",
    });
  }

  for (const secret of EVIDENCE_SECRET_PATTERNS) {
    if (secret.pattern.test(evidenceText)) {
      evidenceFindings.push({
        rule: secret.rule,
        message: "Private key rotation evidence file contains secret-shaped content. Remove the value and record evidence again.",
      });
    }
  }

  if (parsed) {
    const createdAtMs = Date.parse(String(parsed.createdAtIso ?? ""));
    Object.assign(summary, {
      schemaVersion: parsed.schemaVersion ?? null,
      createdAtIso: parsed.createdAtIso ?? null,
      envFile: parsed.envFile ?? null,
      ackPhraseAccepted: parsed.ackPhraseAccepted === true,
      liveAuthProbeOk: parsed.liveAuthProbe?.ok === true,
      liveAuthProbeHttpStatus: parsed.liveAuthProbe?.httpStatus ?? null,
    });
    if (parsed.schemaVersion !== 1) {
      evidenceFindings.push({
        rule: "invalid_key_rotation_evidence_schema_version",
        message: "Private key rotation evidence file schemaVersion must be 1.",
      });
    }
    if (parsed.envFile !== options.envFilePath) {
      evidenceFindings.push({
        rule: "key_rotation_evidence_env_file_mismatch",
        message: "Private key rotation evidence file was recorded for a different env file.",
      });
    }
    if (parsed.minRotatedAfterIso !== options.minRotatedAfterIso) {
      evidenceFindings.push({
        rule: "key_rotation_evidence_checkpoint_mismatch",
        message: "Private key rotation evidence file was recorded against a different rotation checkpoint.",
      });
    }
    if (!Number.isFinite(createdAtMs) || createdAtMs < options.minRotatedAfterMs) {
      evidenceFindings.push({
        rule: "key_rotation_evidence_created_before_checkpoint",
        message: "Private key rotation evidence file createdAtIso is older than the required key rotation checkpoint.",
      });
    }
    if (parsed.ackPhraseAccepted !== true) {
      evidenceFindings.push({
        rule: "key_rotation_evidence_missing_ack",
        message: "Private key rotation evidence file does not record the exact key rotation acknowledgement.",
      });
    }
    if (parsed.liveAuthProbe?.ok !== true || parsed.liveAuthProbe?.httpStatus !== 200) {
      evidenceFindings.push({
        rule: "key_rotation_evidence_missing_live_auth_probe",
        message: "Private key rotation evidence file does not record a successful read-only live auth probe.",
      });
    }
  }

  return { ok: evidenceFindings.length === 0, summary, findings: evidenceFindings };
}

function isUnderPrivateRoot(filePath) {
  const root = resolve(PRIVATE_ROOT);
  return filePath === root || filePath.startsWith(`${root}${sep}`);
}

function hasSecurePrivateMode(mode) {
  return (mode & 0o077) === 0 && (mode & 0o400) !== 0;
}

function hasSecureSystemMode(mode) {
  return (mode & 0o027) === 0 && (mode & 0o400) !== 0;
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

function printHelp() {
  console.log(`Recall key rotation evidence gate

Usage:
  node scripts/check-recall-key-rotation-evidence.mjs
  node scripts/check-recall-key-rotation-evidence.mjs --env-file data/private/recall-live-spikes/recall.env
  node scripts/check-recall-key-rotation-evidence.mjs --evidence-file data/private/recall-live-spikes/key-rotation-evidence.json
  node scripts/check-recall-key-rotation-evidence.mjs --min-rotated-after 2026-06-24T15:54:17.000Z
  node scripts/check-recall-key-rotation-evidence.mjs --env-file /etc/brain/.env --system-env-file

Checks local file metadata plus optional private key-rotation evidence JSON.
It never reads or prints the Recall API key.
`);
}
