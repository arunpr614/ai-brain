#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const writeMode = args.has("--write");
const checkMode = args.has("--check") || !writeMode;
if (args.has("--help")) {
  console.log(`Feature Council wiki generator

Usage:
  node scripts/build-feature-council-wiki.mjs --write
  node scripts/build-feature-council-wiki.mjs --check`);
  process.exit(0);
}
if (writeMode && args.has("--check")) throw new Error("Choose --write or --check, not both.");

const root = process.cwd();
const manifestPath = resolve(root, "docs/agent-docs/feature-council-wiki-manifest.json");
const manifest = readJson(manifestPath);
const sourceRoot = resolve(root, manifest.sourceRoot);
const destinationRoot = resolve(root, manifest.destinationRoot);
const errors = [];

validateManifest();
const destinationSet = new Set(manifest.documents.map((entry) => entry.destination));
const linkAliases = buildLinkAliases();
const generated = [];

for (const entry of manifest.documents) {
  const sourcePath = resolve(root, entry.source);
  if (!existsSync(sourcePath)) {
    errors.push(`Missing source: ${entry.source}`);
    continue;
  }

  const source = readFileSync(sourcePath, "utf8");
  const output = generatePage(entry, source);
  const sourceSha256 = sha256(source);
  const destinationSha256 = sha256(output);
  const destinationPath = resolve(destinationRoot, entry.destination);
  generated.push(entry.destination);

  if (writeMode) {
    mkdirSync(dirname(destinationPath), { recursive: true });
    writeFileSync(destinationPath, output);
    entry.sourceSha256 = sourceSha256;
    entry.destinationSha256 = destinationSha256;
  } else {
    if (entry.sourceSha256 !== sourceSha256) {
      errors.push(`Source checksum mismatch: ${entry.source}`);
    }
    if (entry.destinationSha256 !== destinationSha256) {
      errors.push(`Generated checksum mismatch: ${entry.destination}`);
    }
    if (!existsSync(destinationPath)) {
      errors.push(`Missing generated page: ${entry.destination}`);
    } else if (readFileSync(destinationPath, "utf8") !== output) {
      errors.push(`Generated page is stale: ${entry.destination}`);
    }
  }
}

const unexpectedGenerated = readdirSync(destinationRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.startsWith("Feature-Council-") && entry.name.endsWith(".md"))
  .map((entry) => entry.name)
  .filter((name) => !destinationSet.has(name));
for (const name of unexpectedGenerated) errors.push(`Unexpected generated page: ${name}`);

if (writeMode && errors.length === 0) {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const result = {
  ok: errors.length === 0,
  mode: writeMode ? "write" : "check",
  sourceDocuments: manifest.documents.length,
  generatedPages: generated.length,
  prototypeSources: manifest.prototypeSources.length,
  errors,
};

if (!result.ok) {
  console.error("[build-feature-council-wiki] failed");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));

function validateManifest() {
  if (!Array.isArray(manifest.documents) || manifest.documents.length !== 44) {
    errors.push(`Expected 44 manifest documents; found ${manifest.documents?.length ?? 0}`);
    return;
  }

  const actualSources = collectMarkdown(sourceRoot).map((path) => relative(root, path));
  const manifestSources = manifest.documents.map((entry) => entry.source).sort();
  if (JSON.stringify(actualSources) !== JSON.stringify(manifestSources)) {
    errors.push("Manifest sources do not exactly match the Feature Council Markdown corpus.");
  }

  const sources = new Set();
  const destinations = new Set();
  const normalizedSlugs = new Set();
  for (const entry of manifest.documents) {
    if (sources.has(entry.source)) errors.push(`Duplicate source: ${entry.source}`);
    sources.add(entry.source);
    if (destinations.has(entry.destination)) errors.push(`Duplicate destination: ${entry.destination}`);
    destinations.add(entry.destination);

    const normalized = normalizeWikiSlug(entry.destination);
    if (normalizedSlugs.has(normalized)) errors.push(`Normalized wiki slug collision: ${entry.destination}`);
    normalizedSlugs.add(normalized);

    if (!entry.source.startsWith(`${manifest.sourceRoot}/`) || !entry.source.endsWith(".md")) {
      errors.push(`Invalid source path: ${entry.source}`);
    }
    if (!/^Feature-Council-[A-Za-z0-9-]+\.md$/.test(entry.destination)) {
      errors.push(`Invalid destination page name: ${entry.destination}`);
    }
    if (!new Set(["current", "historical", "review"]).has(entry.lifecycle)) {
      errors.push(`Invalid lifecycle for ${entry.source}: ${entry.lifecycle}`);
    }
    if (entry.lifecycle === "current" && entry.successors.length > 0) {
      errors.push(`Current page must not have successors: ${entry.source}`);
    }
    if (entry.lifecycle !== "current" && entry.successors.length === 0) {
      errors.push(`Historical/review page requires a successor: ${entry.source}`);
    }
    if (entry.disclosure !== "reviewed-sanitized") {
      errors.push(`Unapproved disclosure state: ${entry.source}`);
    }
  }

  for (const entry of manifest.documents) {
    for (const successor of entry.successors) {
      if (!destinations.has(successor)) errors.push(`Unknown successor ${successor} for ${entry.source}`);
    }
  }
  if (!destinations.has(manifest.landingPage)) errors.push(`Missing landing page: ${manifest.landingPage}`);

  for (const prototype of manifest.prototypeSources) {
    if (!existsSync(resolve(root, prototype))) errors.push(`Missing prototype source: ${prototype}`);
  }
}

function generatePage(entry, source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const firstContent = lines.findIndex((line) => line.trim());
  if (firstContent < 0 || !lines[firstContent].startsWith("# ")) {
    throw new Error(`Source must start with an H1: ${entry.source}`);
  }

  const sourceTitle = lines[firstContent].slice(2).trim();
  const title = entry.destination === manifest.landingPage ? "AI Brain Feature Council Research" : sourceTitle;
  lines.splice(firstContent, 1);
  let body = sanitizePublicText(lines.join("\n").trim());
  body = convertArtifactReferences(body);

  const successorLinks = entry.successors.length === 0
    ? "None"
    : entry.successors.map((destination) => wikiLink(destination)).join(", ");
  const lifecycleLabel = {
    current: "Current feature-council artifact",
    historical: "Historical draft - do not implement",
    review: "Review record",
  }[entry.lifecycle];
  const notice = {
    current: "> **Current feature-council artifact.** This is planning evidence, not proof of production implementation or current runtime behavior.",
    historical: `> **Historical draft - do not implement.** Use the current successor: ${successorLinks}.`,
    review: `> **Review record.** These findings are preserved for traceability. Use the current successor: ${successorLinks}.`,
  }[entry.lifecycle];

  const metadata = [
    "Purpose: Preserve AI Brain Feature Council research and planning evidence.",
    "Audience: Product, design, engineering, documentation maintainers, and AI agents.",
    `Artifact source commit: \`${manifest.artifactSourceCommit}\``,
    `Audited application baseline: \`${manifest.auditedApplicationBaseline}\``,
    `Research evidence date: ${manifest.researchEvidenceDate}.`,
    `Lifecycle: ${lifecycleLabel}.`,
    "Runtime verification: Not provided.",
    `Superseded by: ${successorLinks}.`,
    "Public disclosure: Reviewed and sanitized.",
    "Owner: AI Brain maintainer.",
  ].join("\n");

  const readingPaths = entry.destination === manifest.landingPage ? `${buildReadingPaths()}\n\n` : "";
  return `# ${title}\n\n${metadata}\n\n${notice}\n\n${readingPaths}${body}\n`;
}

function buildReadingPaths() {
  const prototypeLinks = manifest.prototypeSources.map((source) => {
    const url = immutableArtifactUrl(source);
    return `[${basename(source)}](${url})`;
  }).join(", ");
  return `## Reading Paths

- Product direction: [Final handoff](Feature-Council-Final-Handoff-Summary) and [decision log](Feature-Council-Decision-Log).
- Current implementation packages: [approved feature packages](#approved-feature-packages).
- Evidence and gaps: [live feature audit](Feature-Council-Live-Feature-Audit), [research inventory](Feature-Council-Research-Feature-Inventory), and [gap matrix](Feature-Council-Feature-Gap-Matrix).
- Historical record: [v1 drafts](#v1-drafts) and their linked adversarial reviews.
- Prototype source artifacts: ${prototypeLinks}. The wiki links to immutable source; interactive hosting is outside this publication.`;
}

function sanitizePublicText(text) {
  return text
    .replace(/\/Users\/[^\s`)]+/g, "local research workspace")
    .replace(/\bArun as daily AI Brain user\b/g, "Primary daily AI Brain user")
    .replace(/https?:\/\/brain\.arunp\.in\b/gi, "the configured AI Brain web host")
    .replace(/\bbrain\.arunp\.in\b/gi, "configured AI Brain web host")
    .replace(/\bHetzner\b/g, "the deployment host")
    .replace(/\bCloudflare tunnel\b/gi, "managed tunnel")
    .replace(/\bCloudflare\b/g, "managed edge service")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "redacted email");
}

function convertArtifactReferences(text) {
  let converted = text;
  for (const alias of linkAliases) {
    const code = `\`${alias.label}\``;
    if (!converted.includes(code)) continue;
    converted = converted.split(code).join(`[${alias.label}](${alias.target})`);
  }
  return converted;
}

function buildLinkAliases() {
  const aliases = new Map();
  for (const entry of manifest.documents) {
    const rel = relative(sourceRoot, resolve(root, entry.source));
    for (const label of [entry.source, rel, basename(entry.source)]) {
      aliases.set(label, entry.destination.replace(/\.md$/, ""));
    }
  }
  for (const source of manifest.prototypeSources) {
    const rel = relative(sourceRoot, resolve(root, source));
    for (const label of [source, rel, basename(source)]) {
      aliases.set(label, immutableArtifactUrl(source));
    }
  }
  return [...aliases.entries()]
    .map(([label, target]) => ({ label, target }))
    .sort((a, b) => b.label.length - a.label.length);
}

function immutableArtifactUrl(source) {
  return `https://github.com/arunpr614/ai-brain/blob/${manifest.artifactSourceCommit}/${source}`;
}

function wikiLink(destination) {
  const page = destination.replace(/\.md$/, "");
  return `[${page}](${page})`;
}

function collectMarkdown(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectMarkdown(path));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
  }
  return files.sort();
}

function normalizeWikiSlug(page) {
  return page.toLowerCase().replace(/\.md$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path) {
  if (!existsSync(path)) throw new Error(`Missing JSON file: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}
