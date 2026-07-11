#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { isSensitiveProjectWikiPath } from "./project-wiki-sensitive-path-policy.mjs";

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output");
if (outputIndex < 0 || !args[outputIndex + 1]) {
  throw new Error("Usage: node scripts/build-project-wiki-source-inventory.mjs alias=path [...] --output file.csv");
}
const output = resolve(args[outputIndex + 1]);
const roots = args.slice(0, outputIndex).map((arg) => {
  const split = arg.indexOf("=");
  if (split < 1) throw new Error(`Invalid root argument: ${arg}`);
  return { alias: arg.slice(0, split), path: resolve(arg.slice(split + 1)) };
});
for (const root of roots) if (!existsSync(root.path)) throw new Error(`Missing source root: ${root.alias}`);

const excludedDirs = new Set([
  ".git", "node_modules", ".next", "dist", "build", "out", "coverage", ".cache",
  "vendor", "target", ".turbo", "__pycache__", ".gradle", "DerivedData", ".npm-cache",
]);
const textExts = new Set([
  ".md", ".txt", ".html", ".htm", ".json", ".yaml", ".yml", ".toml", ".csv",
  ".tsv", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".sql", ".sh", ".py", ".xml",
  ".css", ".scss", ".gradle", ".properties", ".conf", ".ini",
]);
const irrelevantPath = /(?:^|\/)\.DS_Store$/;
const sensitiveText = /(?:-----BEGIN .*PRIVATE KEY-----|\b(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|API_KEY)\s*[:=]\s*[^<\s]{8,}|Bearer\s+[A-Za-z0-9._~+/=-]{16,}|\/Users\/[^\s]+)/i;
const featureKeywords = [
  ["manual-notes", /manual note|my notes|item note|note focus/i],
  ["capture", /capture|ingestion|readability|pdf|substack|linkedin/i],
  ["youtube-transcript", /youtube|transcript|caption|speech.to.text/i],
  ["search-ask", /search|retriev|rag|\bask\b|citation|embedding|vector/i],
  ["organization", /tag|topic|collection|taxonomy|category/i],
  ["auth-pairing", /auth|session|bearer|pairing|pin\b/i],
  ["android-extension", /android|capacitor|extension|chrome/i],
  ["telegram", /telegram|webhook/i],
  ["recall", /recall sync|recall import|recall card/i],
  ["operations", /deploy|backup|restore|health|monitor|systemd|scheduler/i],
  ["feature-council", /feature council|fcp-00/i],
  ["offline", /offline|service worker|cache/i],
  ["graph-ideas", /knowledge graph|relationship graph|connection map|neo4j/i],
  ["srs-ideas", /spaced repetition|\bfsrs\b|flashcard/i],
];

const rows = [];
for (const root of roots) walk(root, root.path);
rows.sort((a, b) => a.source_root.localeCompare(b.source_root) || a.relative_source.localeCompare(b.relative_source));

const firstByHash = new Map();
for (const row of rows) {
  if (!row.sha256 || row.sha256 === "<redacted>") continue;
  const first = firstByHash.get(row.sha256);
  if (first) {
    row.duplicate_of = `${first.source_root}:${first.relative_source}`;
    row.conflict_or_overlap = "Byte-identical duplicate; lower-priority copy unless commit-specific history is needed";
  } else firstByHash.set(row.sha256, row);
}

const headers = [
  "source_root", "relative_source", "file_type", "size_bytes", "modified_at", "sha256",
  "purpose", "evidence_role", "reliability", "feature_tags", "duplicate_of",
  "conflict_or_overlap", "publication_safety", "exclusion_or_failure_reason", "inspection_status",
];
const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => quote(row[header] ?? "")).join(",")), ""].join("\n");
writeFileSync(output, csv);
console.log(JSON.stringify({ output, rows: rows.length, duplicates: rows.filter((row) => row.duplicate_of).length, restricted: rows.filter((row) => row.publication_safety !== "publication-candidate").length }, null, 2));

function walk(root, directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || excludedDirs.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(root, path);
      continue;
    }
    if (!entry.isFile()) continue;
    const stat = lstatSync(path);
    const rawRelative = relative(root.path, path).replaceAll("\\", "/");
    const ext = extname(entry.name).toLowerCase();
    let sample = "";
    let inspectionStatus = "binary-metadata-inspected";
    let failure = "None";
    try {
      if (textExts.has(ext) && stat.size <= 5_000_000) {
        sample = readFileSync(path, "utf8").slice(0, 2_000_000);
        inspectionStatus = stat.size > 2_000_000 ? "text-sampled-first-2MB" : "text-inspected";
      } else if (textExts.has(ext)) inspectionStatus = "large-text-metadata-inspected";
    } catch {
      inspectionStatus = "unreadable";
      failure = "Read failure recorded; contents not inspected";
    }
    const restrictedPath = isSensitiveProjectWikiPath(rawRelative);
    const restrictedText = sample && sensitiveText.test(sample);
    const irrelevant = irrelevantPath.test(rawRelative);
    const relativeSource = restrictedPath || restrictedText
      ? `redacted-path/${shortHash(rawRelative)}${ext || ".file"}`
      : rawRelative;
    const publicationSafety = failure !== "None"
      ? "excluded-unreadable"
      : restrictedPath || restrictedText
        ? "excluded-sensitive"
        : irrelevant
          ? "excluded-irrelevant"
        : "publication-candidate";
    if (failure === "None" && publicationSafety !== "publication-candidate") {
      failure = restrictedPath
        ? "Sensitive path/name; relative location, contents, and metadata excluded"
        : "Sensitive content pattern; path, contents, and metadata excluded";
    } else if (failure === "None" && irrelevant) {
      failure = "Irrelevant generated operating-system metadata";
    }
    const combined = `${rawRelative}\n${sample.slice(0, 100_000)}`;
    rows.push({
      source_root: root.alias,
      relative_source: relativeSource,
      file_type: ext || "no-extension",
      size_bytes: publicationSafety === "excluded-sensitive" ? "<redacted>" : stat.size,
      modified_at: publicationSafety === "excluded-sensitive" ? "<redacted>" : stat.mtime.toISOString(),
      sha256: publicationSafety === "excluded-sensitive" ? "<redacted>" : sha256File(path, stat.size),
      purpose: classifyPurpose(rawRelative),
      evidence_role: classifyRole(rawRelative, ext),
      reliability: reliabilityFor(root.alias, rawRelative),
      feature_tags: featureKeywords.filter(([, pattern]) => pattern.test(combined)).map(([tag]) => tag).join(";") || "unclassified",
      duplicate_of: "",
      conflict_or_overlap: /(?:v1|draft|old|archive|legacy)/i.test(rawRelative) ? "Version/historical marker; check successor before use" : "None recorded",
      publication_safety: publicationSafety,
      exclusion_or_failure_reason: failure,
      inspection_status: inspectionStatus,
    });
  }
}

function classifyPurpose(path) {
  if (/feature-council/i.test(path)) return "Feature Council planning, decision, validation, or history";
  if (/(?:prd|requirements|plan|roadmap|strategy)/i.test(path)) return "Product or implementation planning";
  if (/(?:test|fixture|smoke)/i.test(path)) return "Verification or test evidence";
  if (/(?:release|validation|report|audit|review)/i.test(path)) return "Review, release, or runtime evidence";
  if (/(?:wiki|agent-doc)/i.test(path)) return "Documentation or publication source";
  if (/(?:research|spike|exploration|prototype)/i.test(path)) return "Research, feasibility, or prototype evidence";
  if (/\.(?:ts|tsx|js|mjs|sql|sh|py|gradle)$/.test(path)) return "Implementation, configuration, or operational source";
  if (/\.(?:png|jpg|jpeg|svg|webp|pdf)$/.test(path)) return "Visual or binary evidence";
  return "Project material requiring contextual interpretation";
}

function classifyRole(path, ext) {
  if (/(?:release|production|validation|smoke|execution-report)/i.test(path)) return "Dated verification/runtime evidence";
  if (/(?:test|fixture)/i.test(path)) return "Test evidence";
  if (/(?:prd|requirements|plan|roadmap|research|spike|prototype|brainstorm)/i.test(path)) return "Intention/exploration evidence";
  if (/(?:archive|legacy|handover|closure)/i.test(path)) return "Historical evidence";
  if ([".ts", ".tsx", ".js", ".mjs", ".sql", ".sh", ".py", ".gradle"].includes(ext)) return "Implementation/configuration evidence";
  return "Documentation/context evidence";
}

function reliabilityFor(alias, path) {
  if (alias === "source-5-current-clone") return /(?:prd|plan|research|prototype)/i.test(path) ? "Medium—current clone but intention-only artifact" : "High for snapshot evidence; verify against fetched main";
  if (alias === "source-4-wiki-research") return "Medium—recent documentation snapshot predating later releases";
  if (alias === "source-3-feature-council") return "Medium for decisions; Low for implementation status";
  if (alias === "source-2-research-container") return "Medium/Low—duplicated multi-worktree research container";
  return "Low for current behavior—historical precursor";
}

function sha256File(path, size) {
  try {
    if (size > 25_000_000) return `metadata-only-${size}`;
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    return "";
  }
}

function shortHash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function quote(value) {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
