import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { PRIVATE_RECALL_EVIDENCE_ROOT } from "./recall-controlled-samples.mjs";

export const DEFAULT_RECALL_ENV_FILE_PATH = "data/private/recall-live-spikes/recall.env";

export function inspectRecallEnvFile(path = DEFAULT_RECALL_ENV_FILE_PATH) {
  const absolutePath = resolve(path);
  const privateRoot = resolve(PRIVATE_RECALL_EVIDENCE_ROOT);
  const exists = existsSync(absolutePath);
  const inspection = {
    path,
    exists,
    underPrivateRecallEvidencePath: absolutePath.startsWith(`${privateRoot}${sep}`),
    ignored: gitCheck(["check-ignore", "-q", "--", path]),
    tracked: gitCheck(["ls-files", "--error-unmatch", "--", path]),
  };
  inspection.safeForSecretHandling =
    inspection.exists === true &&
    inspection.underPrivateRecallEvidencePath === true &&
    inspection.ignored === true &&
    inspection.tracked === false;
  if (inspection.exists) {
    const mode = statSync(absolutePath).mode & 0o777;
    inspection.mode = mode.toString(8).padStart(3, "0");
    inspection.securePermissions = hasSecurePrivateEnvFileMode(mode);
  }
  return inspection;
}

export function validateRecallEnvFileSafety(path = DEFAULT_RECALL_ENV_FILE_PATH) {
  const file = inspectRecallEnvFile(path);
  const findings = [];
  if (!file.exists) return { ok: false, file, findings: [{ path: "$", message: "Env file does not exist." }] };
  if (!file.underPrivateRecallEvidencePath) {
    findings.push({
      path: "$.envFilePath",
      message: `Private Recall env file must stay under ${PRIVATE_RECALL_EVIDENCE_ROOT}/.`,
    });
  }
  if (file.ignored !== true) {
    findings.push({
      path: "$.envFilePath",
      message: "Private Recall env file path must be ignored by git.",
    });
  }
  if (file.tracked === true) {
    findings.push({
      path: "$.envFilePath",
      message: "Private Recall env file path must not be tracked by git.",
    });
  }
  if (file.securePermissions !== true) {
    findings.push({
      path: "$.envFilePath",
      message: "Private Recall env file must be owner-readable only, for example mode 0600.",
    });
  }
  return { ok: findings.length === 0, file, findings };
}

export function assertRecallEnvFileSafety(path = DEFAULT_RECALL_ENV_FILE_PATH) {
  const safety = validateRecallEnvFileSafety(path);
  if (!safety.file.exists) {
    const error = new Error(`[recall-env-file] missing private Recall env file: ${resolve(path)}`);
    error.code = "RECALL_ENV_FILE_MISSING";
    error.envFilePath = resolve(path);
    error.findings = safety.findings;
    throw error;
  }
  if (!safety.ok) {
    const error = new Error("[recall-env-file] unsafe private Recall env file");
    error.code = "RECALL_ENV_FILE_UNSAFE";
    error.envFilePath = resolve(path);
    error.fileSafety = safety.file;
    error.findings = safety.findings;
    throw error;
  }
  return safety.file;
}

export function loadRecallEnvFile(path = DEFAULT_RECALL_ENV_FILE_PATH) {
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) {
    return { exists: false, loadedKeyCount: 0, loadedKeys: [] };
  }

  const loadedKeys = [];
  const lines = readFileSync(absolutePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const current = process.env[parsed.key];
    if (current !== undefined && current !== "") continue;
    process.env[parsed.key] = parsed.value;
    loadedKeys.push(parsed.key);
  }
  return { exists: true, loadedKeyCount: loadedKeys.length, loadedKeys };
}

function parseEnvLine(line) {
  const withoutComment = stripUnquotedComment(line).trim();
  if (!withoutComment) return null;
  const match = withoutComment.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) return null;
  return {
    key: match[1],
    value: unquoteEnvValue(match[2].trim()),
  };
}

function stripUnquotedComment(value) {
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if ((char === '"' || char === "'") && value[index - 1] !== "\\") {
      quote = quote === char ? null : quote ?? char;
    }
    if (char === "#" && !quote) return value.slice(0, index);
  }
  return value;
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function gitCheck(args) {
  const result = spawnSync("git", args, { cwd: process.cwd(), encoding: "utf8" });
  return result.status === 0;
}

function hasSecurePrivateEnvFileMode(mode) {
  const ownerCanRead = (mode & 0o400) !== 0;
  const groupOrOtherHasAccess = (mode & 0o077) !== 0;
  return ownerCanRead && !groupOrOtherHasAccess;
}
