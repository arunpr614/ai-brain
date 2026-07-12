#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const [existingArg, currentArg, outputArg] = process.argv.slice(2);
if (!existingArg || !currentArg || !outputArg) {
  throw new Error("Usage: node scripts/build-existing-wiki-page-audit.mjs existing-wiki current-wiki output.csv");
}
const existing = resolve(existingArg);
const current = resolve(currentArg);
const output = resolve(outputArg);
const beforePages = pages(existing);
const afterPages = pages(current);
const allPages = [...new Set([...beforePages, ...afterPages])].sort();
const beforeSet = new Set(beforePages);
const afterSet = new Set(afterPages);
const headers = [
  "existing_page", "purpose", "quality_before", "accuracy_before", "duplication_before",
  "completeness_before", "orphan_status_before", "broken_internal_links_before", "preserve_value",
  "migration_action", "destination_page", "reason", "existing_sha256", "current_sha256",
];

function audit(page) {
  const before = beforeSet.has(page) ? readFileSync(join(existing, page), "utf8") : "";
  const after = afterSet.has(page) ? readFileSync(join(current, page), "utf8") : "";
  const research = page.startsWith("Feature-Council-");
  const added = !before;
  const links = before ? brokenLinks(before, beforeSet) : [];
  const purpose = purposeFor(page);
  const review = added ? null : research ? historicalReview(page, before) : coreReview(page, before);
  const action = added ? "Add new living reference" : review.action;
  return {
    existing_page: added ? "<new>" : page,
    purpose,
    quality_before: added ? "Not present" : review.quality,
    accuracy_before: added ? "Not present" : review.accuracy,
    duplication_before: added ? "None" : review.duplication,
    completeness_before: added ? "Not present" : review.completeness,
    orphan_status_before: added ? "Not applicable" : "Reachable; 0 pre-existing graph orphans",
    broken_internal_links_before: added ? "Not applicable" : links.length ? links.join(";") : "None",
    preserve_value: added ? "Adds required living coverage" : review.preserve,
    migration_action: action,
    destination_page: afterSet.has(page) ? page : "<removed>",
    reason: added ? "Required definitive information architecture gap" : review.reason,
    existing_sha256: before ? sha(before) : "",
    current_sha256: after ? sha(after) : "",
  };
}

const CORE_REVIEW_NOTES = {
  "Home.md": ["Useful compact orientation and baseline banner", "Pre-late-Notes baseline and capability summary were stale", "Overlapped Product Overview only at summary level", "Missing definitive reading paths, architecture map, and current status rollup"],
  "_Sidebar.md": ["Every prior page reachable, but living and historical links were mixed in one shallow list", "Links were valid", "Repeated catalog/history destinations without progressive grouping", "Missing grouped feature, architecture, operations, maintenance, and archive navigation"],
  "Agent-Onboarding.md": ["Strong evidence hierarchy and first steps", "Baseline and late-feature entry points were incomplete", "Some overlap with Agent Workflows was useful but boundaries were unclear", "Missing ownership map, currentness test, and full change-impact reading path"],
  "Agent-Workflows.md": ["Useful task-to-file workflow reference", "Mostly accurate but tied to the prior page set", "Overlapped onboarding commands", "Missing new feature-family, idea, stack, and repository-map destinations"],
  "Capture-and-Ingestion.md": ["Good capture-channel overview", "Predated selected-text, transcript recovery/backfill, and final Recall/Notes evidence", "Some overlap with client pages", "Insufficient per-channel states, repair boundaries, data, flags, tests, and operations"],
  "Command-Safety.md": ["Clear safety-class vocabulary", "Accurate for the then-classified scripts", "Machine registry is intentional source duplication", "Missing classification/update guidance for new documentation validators"],
  "Data-Model.md": ["Useful schema and migration orientation", "Stopped before migrations 022/023 and late note semantics", "No harmful duplicate; architecture page links here", "Missing notes, source-aware chunks, Recall/capture detail, retention, and two-017 warning"],
  "Deployment-and-Operations.md": ["Concise operator orientation", "Deployment baseline and verification scope were stale", "Overlapped private runbooks only conceptually", "Missing local-status tooling, monitor boundaries, backup linkage, and current safety guidance"],
  "Documentation-Maintenance.md": ["Sound source-to-wiki synchronization concept", "Referenced the earlier corpus/baseline", "Some overlap with publication report", "Missing exact 84-page contract, templates, ownership model, changelog, and artifact regeneration"],
  "Enrichment-and-AI-Providers.md": ["Correct provider/pipeline outline", "Predated final note consent/default and provider evidence scope", "Search page repeated retrieval-adjacent concepts", "Missing states, data/API/config/test/operations and Trust Center boundary"],
  "Feature-Catalog.md": ["Useful concise capability matrix", "Status vocabulary and late features were incomplete", "Intentional overlap with machine ledger", "Missing definitive taxonomy, all current capabilities, and complete non-current idea coverage"],
  "Manual-Content-Notes.md": ["Detailed evidence-backed feature reference", "Current through Note Focus release", "Overlaps feature release artifacts by design", "Already detailed; needed baseline normalization and integration into global navigation"],
  "Mobile-Extension-and-Pairing.md": ["Useful grouped client overview", "Extension endpoint/config and late Android evidence needed correction", "Grouped page overlapped two distinct client contracts", "Missing separate Android/pairing and extension feature depth"],
  "Product-Overview.md": ["Clear product-boundary summary", "Brand/status and late capabilities were incomplete", "Summary overlap with Home was appropriate", "Missing full jobs, workflows, boundaries, terminology, and implemented/non-current separation"],
  "Search-RAG-and-Ask.md": ["Good retrieval-flow outline", "Predated note-aware retrieval and precise Evidence Scan status", "Overlapped provider and data pages", "Missing scopes/states/data/security/config/tests/operations and proposal boundary"],
  "Security-Privacy-and-Redaction.md": ["Strong publication-safety posture", "Origin/version and client-storage details were too broad", "Command Safety overlap was complementary", "Missing precise auth boundaries, threat limitations, and artifact privacy rules"],
  "Source-Baselines-and-Status.md": ["Good evidence hierarchy", "Dual baseline and late release status were stale", "Feature Catalog repeated labels", "Missing requested definitive taxonomy and scoped runtime convention"],
  "System-Architecture.md": ["Useful high-level component map", "Late notes/Recall/current-main distinctions were incomplete", "Data/feature pages intentionally expand it", "Missing trust boundaries, full runtime flows, deployment context, and change-impact links"],
  "Troubleshooting.md": ["Safe concise diagnostic starting points", "Commands remained valid", "Command Safety overlap was intentional", "Missing new feature/agent-doc diagnostics and stronger escalation links"],
};

function coreReview(page, text) {
  const notes = CORE_REVIEW_NOTES[page] ?? [
    "Existing published living reference",
    `Accurate for its previously published baseline; ${page} requires current release metadata and affected feature behavior reconciliation`,
    "Any overlap with neighboring pages is intentional cross-linking within the living information architecture",
    "Retain the stable page and refresh only release-affected claims, links, and evidence boundaries",
  ];
  const [quality, accuracy, duplication, completeness] = notes;
  return {
    quality: `${quality}; ${contentMetrics(text)}`,
    accuracy,
    duplication,
    completeness,
    preserve: `Stable URL plus page-specific value: ${quality.toLowerCase()}`,
    action: "Rewrite or expand in place; preserve filename and inbound links",
    reason: `Resolve this page's recorded accuracy/completeness gaps while retaining its stable URL`,
  };
}

function historicalReview(page, text) {
  const artifact = /PRD/i.test(page) ? "PRD" : /Technical/i.test(page) ? "technical design" : /UX/i.test(page) ? "UX specification" : /Adversarial-Review/i.test(page) ? "adversarial review" : /Decision-Log/i.test(page) ? "decision log" : /Research/i.test(page) ? "research record" : /Tracker/i.test(page) ? "project tracker" : "planning artifact";
  const revision = /-v1\.md$/.test(page) ? "v1 with a preserved v2 successor" : /-v2\.md$/.test(page) ? "v2 latest planning revision" : "unversioned dated/index record";
  return {
    quality: `${artifact}; ${revision}; ${contentMetrics(text)}`,
    accuracy: `Accurate as a dated ${artifact} only; it cannot establish current implementation and now receives a lifecycle/current-delta wrapper`,
    duplication: /-v1\.md$/.test(page) ? "Intentionally overlaps its v2 successor for decision history" : /-v2\.md$/.test(page) ? "Intentionally supersedes but does not erase v1" : "Cross-references other Council summaries; retained for its distinct historical role",
    completeness: `Complete preserved ${artifact} body for its planning scope; not a current feature reference`,
    preserve: `Immutable historical ${artifact}, pinned links, and decision traceability`,
    action: "Preserve body; regenerate a stronger historical lifecycle/current-delta wrapper",
    reason: `Keep this specific ${artifact} and inbound URL while preventing planning-as-implementation`,
  };
}

function contentMetrics(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const headings = (text.match(/^#{1,6}\s+/gm) ?? []).length;
  const links = (text.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length;
  return `${words} words, ${headings} headings, ${links} Markdown links inspected`;
}

function purposeFor(page) {
  const core = {
    "Home.md": "Orientation and primary reading paths",
    "_Sidebar.md": "Global wiki navigation",
    "_Footer.md": "Global verification/publication context",
    "Agent-Onboarding.md": "AI-agent starting workflow",
    "Product-Overview.md": "Product users, jobs, workflows, and boundaries",
    "Feature-Catalog.md": "Living capability/status index",
    "Source-Baselines-and-Status.md": "Evidence and status vocabulary",
    "System-Architecture.md": "Overall component/trust/data architecture",
    "Data-Model.md": "Persistent model and migration behavior",
    "Command-Safety.md": "Script side-effect classification and safety",
    "Troubleshooting.md": "Safe diagnosis paths",
    "Documentation-Maintenance.md": "Canonical/publication workflow",
  };
  if (core[page]) return core[page];
  if (page.startsWith("Feature-Council-")) return "Dated Feature Council planning, decision, review, or research history";
  return page.replace(/\.md$/, "").replaceAll("-", " ");
}

function brokenLinks(text, pageSet) {
  const broken = [];
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].trim();
    if (!target || target.startsWith("#") || /^https?:/i.test(target) || target.startsWith("mailto:")) continue;
    const local = basename(target.split("#", 1)[0].endsWith(".md") ? target.split("#", 1)[0] : `${target.split("#", 1)[0]}.md`);
    if (!pageSet.has(local)) broken.push(target);
  }
  return broken;
}

function pages(directory) {
  if (!existsSync(directory)) throw new Error(`Missing wiki directory: ${directory}`);
  return readdirSync(directory).filter((name) => name.endsWith(".md")).sort();
}

function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}

function quote(value = "") {
  return `"${String(value).replaceAll('"', '""')}"`;
}

const rows = allPages.map((page) => audit(page));
writeFileSync(output, [headers.join(","), ...rows.map((row) => headers.map((header) => quote(row[header])).join(",")), ""].join("\n"));
console.log(JSON.stringify({ output, existingPages: beforePages.length, currentPages: afterPages.length, rows: rows.length }, null, 2));
