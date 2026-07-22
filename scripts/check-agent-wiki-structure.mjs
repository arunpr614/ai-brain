#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const REQUIRED_PAGES = [
  "Home.md",
  "_Sidebar.md",
  "Agent-Onboarding.md",
  "Product-Overview.md",
  "Source-Baselines-and-Status.md",
  "Feature-Catalog.md",
  "System-Architecture.md",
  "Data-Model.md",
  "Capture-and-Ingestion.md",
  "Search-RAG-and-Ask.md",
  "Enrichment-and-AI-Providers.md",
  "Mobile-Extension-and-Pairing.md",
  "Security-Privacy-and-Redaction.md",
  "Command-Safety.md",
  "Deployment-and-Operations.md",
  "Agent-Workflows.md",
  "Troubleshooting.md",
  "Documentation-Maintenance.md",
];

const REQUIRED_METADATA = [
  "Purpose:",
  "Audience:",
  "Verified against:",
  "Runtime evidence through:",
  "Last reviewed:",
  "Owner:",
];

const [wikiArg, baselineArg] = process.argv.slice(2);
if (!wikiArg || !baselineArg || process.argv.includes("--help")) {
  printHelp();
  process.exit(process.argv.includes("--help") ? 0 : 2);
}

const wikiRoot = resolve(wikiArg);
const baselinePath = resolve(baselineArg);
const findings = [];

if (!existsSync(wikiRoot)) findings.push(finding(null, null, "missing_wiki_root", wikiRoot));
if (!existsSync(baselinePath)) findings.push(finding(null, null, "missing_baseline", baselinePath));

let baseline = null;
if (existsSync(baselinePath)) {
  try {
    baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  } catch {
    findings.push(finding(baselinePath, null, "invalid_baseline_json", "Baseline JSON is not parseable."));
  }
}

const approvedShas = new Set(
  [baseline?.defaultBranchSha, baseline?.worktreeSha, baseline?.productionSha].filter(
    (value) => typeof value === "string" && /^[0-9a-f]{40}$/i.test(value),
  ),
);

let actualPages = [];
if (existsSync(wikiRoot)) {
  actualPages = readdirSync(wikiRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
}

for (const page of REQUIRED_PAGES) {
  if (!actualPages.includes(page)) findings.push(finding(page, null, "missing_required_page", page));
}
for (const page of actualPages) {
  if (!REQUIRED_PAGES.includes(page)) findings.push(finding(page, null, "unexpected_page", page));
}
if (actualPages.includes("Codex-Wiki-Write-Test.md")) {
  findings.push(finding("Codex-Wiki-Write-Test.md", null, "temporary_page_present", "Remove test page."));
}

const pageSet = new Set(actualPages);
for (const page of actualPages) {
  const path = join(wikiRoot, page);
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);

  if (page !== "_Sidebar.md") checkMetadata(page, lines);
  checkPlaceholders(page, lines);
  checkMermaid(page, lines);
  checkLinks(page, text);

  if (page === "Feature-Catalog.md") checkFeatureCatalog(page, text);
}

const result = { ok: findings.length === 0, requiredPages: REQUIRED_PAGES.length, actualPages: actualPages.length, findings };
if (!result.ok) {
  console.error("[check-agent-wiki-structure] failed");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));

function checkMetadata(page, lines) {
  const header = lines.slice(0, 20).join("\n");
  for (const label of REQUIRED_METADATA) {
    if (!header.includes(label)) findings.push(finding(page, null, "missing_metadata", label));
  }
}

function checkPlaceholders(page, lines) {
  for (const [index, line] of lines.entries()) {
    if (/\b(?:TODO|TBD|FIXME|PLACEHOLDER)\b/i.test(line)) {
      findings.push(finding(page, index + 1, "placeholder_text", "Unresolved placeholder."));
    }
  }
}

function checkMermaid(page, lines) {
  let openAt = null;
  let contentLines = 0;
  for (const [index, line] of lines.entries()) {
    if (line.trim() === "```mermaid") {
      if (openAt !== null) findings.push(finding(page, index + 1, "nested_mermaid", "Nested Mermaid fence."));
      openAt = index + 1;
      contentLines = 0;
    } else if (openAt !== null && line.trim() === "```") {
      if (contentLines === 0) findings.push(finding(page, openAt, "empty_mermaid", "Mermaid diagram is empty."));
      openAt = null;
    } else if (openAt !== null && line.trim()) {
      contentLines += 1;
    }
  }
  if (openAt !== null) findings.push(finding(page, openAt, "unclosed_mermaid", "Mermaid fence is not closed."));
}

function checkLinks(page, text) {
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of text.matchAll(linkPattern)) {
    const target = match[1].trim().replace(/^<|>$/g, "");
    if (!target || target.startsWith("#") || target.startsWith("mailto:")) continue;

    if (/^https?:\/\//i.test(target)) {
      checkExternalSourceLink(page, target);
      continue;
    }

    const withoutAnchor = target.split("#", 1)[0];
    if (/^(?:\.\.\/|\.\/)?(?:src|scripts|docs|android|extension)\//.test(withoutAnchor)) {
      findings.push(finding(page, null, "repo_relative_source_link", target));
      continue;
    }

    const candidate = basename(withoutAnchor.endsWith(".md") ? withoutAnchor : `${withoutAnchor}.md`);
    if (!pageSet.has(candidate)) findings.push(finding(page, null, "broken_internal_link", target));
  }
}

function checkExternalSourceLink(page, target) {
  const prefix = "https://github.com/arunpr614/ai-brain/blob/";
  if (!target.startsWith(prefix)) return;
  const revision = target.slice(prefix.length).split("/", 1)[0];
  if (!approvedShas.has(revision)) findings.push(finding(page, null, "unapproved_source_revision", revision));
}

function checkFeatureCatalog(page, text) {
  const required = [
    "Feature",
    "Product status",
    "Code status",
    "Runtime status",
    "User surface",
    "API/action entrypoint",
    "Core modules",
    "Data touched",
    "Jobs/scripts",
    "Verification",
    "Baseline SHA",
    "Known gaps",
  ];
  const header = text.split(/\r?\n/).find((line) => line.trim().startsWith("| Feature |"));
  if (!header) {
    findings.push(finding(page, null, "missing_feature_table", "Feature table header not found."));
    return;
  }
  const cells = parseRow(header);
  if (JSON.stringify(cells) !== JSON.stringify(required)) {
    findings.push(finding(page, null, "wrong_feature_columns", cells.join(" | ")));
  }
}

function parseRow(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function finding(file, line, rule, detail) {
  return { file, line, rule, detail };
}

function printHelp() {
  console.log(`Agent wiki structure checker

Usage:
  node scripts/check-agent-wiki-structure.mjs <wiki-directory> <source-baseline.json>`);
}
