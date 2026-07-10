import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";

export const DEFAULT_MANIFEST_PATH = "data/private/recall-live-spikes/controlled-samples.json";
export const PRIVATE_RECALL_EVIDENCE_ROOT = "data/private/recall-live-spikes";

export const REQUIRED_SAMPLES = [
  { label: "sample-note", contentType: "note", source: "optional" },
  { label: "sample-article", contentType: "article", source: "required" },
  { label: "sample-youtube", contentType: "youtube", source: "required" },
  { label: "sample-pdf", contentType: "pdf", source: "required" },
  { label: "sample-no-url", contentType: "no_url", source: "forbidden" },
  { label: "sample-long", contentType: "long", source: "optional" },
];

export function templateManifest() {
  return {
    dateWindow: {
      dateFrom: "2026-06-24T00:00:00Z",
      dateTo: "2026-06-24T23:59:59Z",
    },
    samples: REQUIRED_SAMPLES.map((sample, index) => ({
      label: sample.label,
      contentType: sample.contentType,
      cardId: `paste-private-card-id-${index + 1}`,
      expectedTitle: `paste private expected title for ${sample.label}`,
      createdAt: "2026-06-24T12:00:00Z",
      sourceUrl: sample.source === "forbidden" ? null : "paste private source URL or null",
      allowTitleInPublicReport: false,
      allowSourceUrlInPublicReport: false,
      notes: "private local-only notes; do not copy into public reports",
    })),
    negativeControl: {
      label: "outside-window",
      cardId: "paste-private-card-id-outside-window",
      createdAt: "2026-06-23T12:00:00Z",
      expectedTitle: "paste private expected title for outside-window card",
    },
  };
}

export function loadControlledSampleManifest(path = DEFAULT_MANIFEST_PATH) {
  const manifestPath = resolve(path);
  if (!existsSync(manifestPath)) {
    const error = new Error(
      `[check:recall-controlled-samples] missing manifest: ${manifestPath}\n` +
        "Create it from: node scripts/check-recall-controlled-samples.mjs --template",
    );
    error.code = "RECALL_CONTROLLED_MANIFEST_MISSING";
    throw error;
  }
  const manifest = readJson(manifestPath);
  const findings = validateControlledSampleManifest(manifest);
  if (findings.length > 0) {
    const error = new Error("[check:recall-controlled-samples] failed");
    error.code = "RECALL_CONTROLLED_MANIFEST_INVALID";
    error.manifestPath = manifestPath;
    error.findings = findings;
    throw error;
  }
  return normalizeControlledSampleManifest(manifest, manifestPath);
}

export function inspectControlledSampleManifestFile(path = DEFAULT_MANIFEST_PATH) {
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
  inspection.safeForPrivateValues =
    inspection.exists === true &&
    inspection.underPrivateRecallEvidencePath === true &&
    inspection.ignored === true &&
    inspection.tracked === false;
  if (inspection.exists) {
    const mode = statSync(absolutePath).mode & 0o777;
    inspection.mode = mode.toString(8).padStart(3, "0");
    inspection.securePermissions = hasSecurePrivateFileMode(mode);
  }
  return inspection;
}

export function validateControlledSampleManifestFileSafety(path = DEFAULT_MANIFEST_PATH) {
  const file = inspectControlledSampleManifestFile(path);
  const findings = [];
  if (!file.exists) return { ok: false, file, findings: [{ path: "$", message: "Manifest file does not exist." }] };
  if (!file.underPrivateRecallEvidencePath) {
    findings.push({
      path: "$.manifestPath",
      message: `Private controlled sample manifest must stay under ${PRIVATE_RECALL_EVIDENCE_ROOT}/.`,
    });
  }
  if (file.ignored !== true) {
    findings.push({
      path: "$.manifestPath",
      message: "Private controlled sample manifest path must be ignored by git.",
    });
  }
  if (file.tracked === true) {
    findings.push({
      path: "$.manifestPath",
      message: "Private controlled sample manifest path must not be tracked by git.",
    });
  }
  if (file.securePermissions !== true) {
    findings.push({
      path: "$.manifestPath",
      message: "Private controlled sample manifest must be owner-readable only, for example mode 0600.",
    });
  }
  return { ok: findings.length === 0, file, findings };
}

export function assertControlledSampleManifestFileSafety(path = DEFAULT_MANIFEST_PATH) {
  const safety = validateControlledSampleManifestFileSafety(path);
  if (!safety.file.exists) {
    const error = new Error(
      `[check:recall-controlled-samples] missing manifest: ${resolve(path)}\n` +
        "Create it from: node scripts/check-recall-controlled-samples.mjs --template",
    );
    error.code = "RECALL_CONTROLLED_MANIFEST_MISSING";
    throw error;
  }
  if (!safety.ok) {
    const error = new Error("[check:recall-controlled-samples] unsafe private manifest file");
    error.code = "RECALL_CONTROLLED_MANIFEST_FILE_UNSAFE";
    error.manifestPath = resolve(path);
    error.fileSafety = safety.file;
    error.findings = safety.findings;
    throw error;
  }
  return safety.file;
}

export function summarizeControlledSampleManifest(manifest) {
  return {
    ok: true,
    manifestPath: manifest.manifestPath,
    dateWindow: manifest.dateWindow,
    sampleCount: manifest.samples.length,
    requiredLabels: REQUIRED_SAMPLES.map((sample) => sample.label),
    negativeControl: {
      label: manifest.negativeControl.label,
      outsideWindow: true,
    },
    publicPrivacy: {
      titleAllowedCount: manifest.samples.filter((sample) => sample.allowTitleInPublicReport)
        .length,
      sourceUrlAllowedCount: manifest.samples.filter((sample) => sample.allowSourceUrlInPublicReport)
        .length,
    },
  };
}

export function validateControlledSampleManifest(manifest) {
  const findings = [];
  if (!isRecord(manifest)) return [{ path: "$", message: "Manifest must be a JSON object." }];

  const dateFrom = stringOrNull(manifest.dateWindow?.dateFrom);
  const dateTo = stringOrNull(manifest.dateWindow?.dateTo);
  const fromMs = parseIso(dateFrom);
  const toMs = parseIso(dateTo);
  if (!dateFrom) findings.push({ path: "$.dateWindow.dateFrom", message: "Required ISO string." });
  if (!dateTo) findings.push({ path: "$.dateWindow.dateTo", message: "Required ISO string." });
  if (dateFrom && fromMs === null) {
    findings.push({ path: "$.dateWindow.dateFrom", message: "Must parse as a date." });
  }
  if (dateTo && toMs === null) {
    findings.push({ path: "$.dateWindow.dateTo", message: "Must parse as a date." });
  }
  if (fromMs !== null && toMs !== null && fromMs >= toMs) {
    findings.push({ path: "$.dateWindow", message: "dateFrom must be before dateTo." });
  }

  if (!Array.isArray(manifest.samples)) {
    findings.push({ path: "$.samples", message: "Required array." });
    return findings;
  }

  const byLabel = new Map();
  const cardIds = new Map();
  manifest.samples.forEach((sample, index) => {
    if (!isRecord(sample)) {
      findings.push({ path: `$.samples[${index}]`, message: "Sample must be an object." });
      return;
    }
    const label = stringOrNull(sample.label);
    const cardId = stringOrNull(sample.cardId);
    const title = stringOrNull(sample.expectedTitle);
    const contentType = stringOrNull(sample.contentType);
    const createdAt = stringOrNull(sample.createdAt);
    const sourceUrl = stringOrNull(sample.sourceUrl);
    const samplePath = `$.samples[${index}]`;

    if (!label) findings.push({ path: `${samplePath}.label`, message: "Required string." });
    if (label && byLabel.has(label)) {
      findings.push({ path: `${samplePath}.label`, message: `Duplicate label ${label}.` });
    }
    if (label) byLabel.set(label, sample);
    if (!cardId) findings.push({ path: `${samplePath}.cardId`, message: "Required string." });
    if (cardId && isTemplatePlaceholder(cardId)) {
      findings.push({
        path: `${samplePath}.cardId`,
        message: "Replace template placeholder with a private Recall card ID.",
      });
    }
    if (cardId && cardIds.has(cardId)) {
      findings.push({
        path: `${samplePath}.cardId`,
        message: `Duplicate cardId also used by ${cardIds.get(cardId)}.`,
      });
    }
    if (cardId) cardIds.set(cardId, label ?? samplePath);
    if (!title) findings.push({ path: `${samplePath}.expectedTitle`, message: "Required string." });
    if (title && isTemplatePlaceholder(title)) {
      findings.push({
        path: `${samplePath}.expectedTitle`,
        message: "Replace template placeholder with the private expected title.",
      });
    }
    if (!createdAt) {
      findings.push({ path: `${samplePath}.createdAt`, message: "Required ISO string." });
    }
    const createdMs = parseIso(createdAt);
    if (createdAt && createdMs === null) {
      findings.push({ path: `${samplePath}.createdAt`, message: "Must parse as a date." });
    }
    if (
      createdMs !== null &&
      fromMs !== null &&
      toMs !== null &&
      !isInside(createdMs, fromMs, toMs)
    ) {
      findings.push({
        path: `${samplePath}.createdAt`,
        message: "Controlled sample must be inside the SPIKE-013 date window.",
      });
    }
    if (typeof sample.allowTitleInPublicReport !== "boolean") {
      findings.push({
        path: `${samplePath}.allowTitleInPublicReport`,
        message: "Required boolean; must be false because public SPIKE reports are redacted-only.",
      });
    } else if (sample.allowTitleInPublicReport !== false) {
      findings.push({
        path: `${samplePath}.allowTitleInPublicReport`,
        message: "Must be false. The combined live SPIKE workflow writes redacted-only public reports.",
      });
    }
    if (typeof sample.allowSourceUrlInPublicReport !== "boolean") {
      findings.push({
        path: `${samplePath}.allowSourceUrlInPublicReport`,
        message: "Required boolean; must be false because public SPIKE reports are redacted-only.",
      });
    } else if (sample.allowSourceUrlInPublicReport !== false) {
      findings.push({
        path: `${samplePath}.allowSourceUrlInPublicReport`,
        message: "Must be false. The combined live SPIKE workflow writes redacted-only public reports.",
      });
    }

    const required = REQUIRED_SAMPLES.find((entry) => entry.label === label);
    if (required) {
      if (contentType !== required.contentType) {
        findings.push({
          path: `${samplePath}.contentType`,
          message: `Expected ${required.contentType} for ${required.label}.`,
        });
      }
      if (required.source === "required" && !sourceUrl) {
        findings.push({ path: `${samplePath}.sourceUrl`, message: "Source URL is required." });
      }
      if (sourceUrl && !isHttpUrl(sourceUrl)) {
        findings.push({
          path: `${samplePath}.sourceUrl`,
          message: "Source URL must be a valid http(s) URL or null.",
        });
      }
      if (required.source === "forbidden" && sourceUrl) {
        findings.push({
          path: `${samplePath}.sourceUrl`,
          message: "No-URL sample must not have a source URL.",
        });
      }
    }
  });

  for (const required of REQUIRED_SAMPLES) {
    if (!byLabel.has(required.label)) {
      findings.push({ path: "$.samples", message: `Missing required sample ${required.label}.` });
    }
  }

  validateNegativeControl(manifest.negativeControl, findings, fromMs, toMs, cardIds);
  return findings;
}

function normalizeControlledSampleManifest(manifest, manifestPath) {
  return {
    manifestPath,
    dateWindow: {
      dateFrom: stringOrNull(manifest.dateWindow.dateFrom),
      dateTo: stringOrNull(manifest.dateWindow.dateTo),
    },
    samples: REQUIRED_SAMPLES.map((required) => {
      const sample = manifest.samples.find((entry) => entry.label === required.label);
      return {
        label: stringOrNull(sample.label),
        contentType: stringOrNull(sample.contentType),
        cardId: stringOrNull(sample.cardId),
        expectedTitle: stringOrNull(sample.expectedTitle),
        createdAt: stringOrNull(sample.createdAt),
        sourceUrl: stringOrNull(sample.sourceUrl),
        allowTitleInPublicReport: sample.allowTitleInPublicReport === true,
        allowSourceUrlInPublicReport: sample.allowSourceUrlInPublicReport === true,
      };
    }),
    negativeControl: {
      label: stringOrNull(manifest.negativeControl.label),
      cardId: stringOrNull(manifest.negativeControl.cardId),
      createdAt: stringOrNull(manifest.negativeControl.createdAt),
      expectedTitle: stringOrNull(manifest.negativeControl.expectedTitle),
    },
  };
}

function validateNegativeControl(value, findings, fromMs, toMs, cardIds) {
  const path = "$.negativeControl";
  if (!isRecord(value)) {
    findings.push({ path, message: "Required object." });
    return;
  }
  const label = stringOrNull(value.label);
  const cardId = stringOrNull(value.cardId);
  const createdAt = stringOrNull(value.createdAt);
  if (!label) findings.push({ path: `${path}.label`, message: "Required string." });
  if (!cardId) findings.push({ path: `${path}.cardId`, message: "Required string." });
  if (cardId && isTemplatePlaceholder(cardId)) {
    findings.push({
      path: `${path}.cardId`,
      message: "Replace template placeholder with a private Recall card ID.",
    });
  }
  if (cardId && cardIds.has(cardId)) {
    findings.push({ path: `${path}.cardId`, message: "Negative control cardId must be unique." });
  }
  const title = stringOrNull(value.expectedTitle);
  if (!title) findings.push({ path: `${path}.expectedTitle`, message: "Required string." });
  if (title && isTemplatePlaceholder(title)) {
    findings.push({
      path: `${path}.expectedTitle`,
      message: "Replace template placeholder with the private expected title.",
    });
  }
  if (!createdAt) findings.push({ path: `${path}.createdAt`, message: "Required ISO string." });
  const createdMs = parseIso(createdAt);
  if (createdAt && createdMs === null) {
    findings.push({ path: `${path}.createdAt`, message: "Must parse as a date." });
  }
  if (createdMs !== null && fromMs !== null && toMs !== null && isInside(createdMs, fromMs, toMs)) {
    findings.push({
      path: `${path}.createdAt`,
      message: "Negative control must be outside the SPIKE-013 date window.",
    });
  }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(
      `Could not read JSON manifest at ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function gitCheck(args) {
  const result = spawnSync("git", args, { cwd: process.cwd(), encoding: "utf8" });
  return result.status === 0;
}

function hasSecurePrivateFileMode(mode) {
  const ownerCanRead = (mode & 0o400) !== 0;
  const groupOrOtherHasAccess = (mode & 0o077) !== 0;
  return ownerCanRead && !groupOrOtherHasAccess;
}

function parseIso(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function isInside(valueMs, fromMs, toMs) {
  return valueMs >= fromMs && valueMs <= toMs;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isTemplatePlaceholder(value) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("paste-private-") || normalized.startsWith("paste private");
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
