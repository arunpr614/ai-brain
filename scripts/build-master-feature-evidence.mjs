#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [ledgerArg, masterArg, outputArg] = process.argv.slice(2);
if (!ledgerArg || !masterArg || !outputArg) {
  throw new Error("Usage: node scripts/build-master-feature-evidence.mjs ledger.md master-feature-and-idea-inventory.md output.csv");
}
const ledger = readFileSync(resolve(ledgerArg), "utf8").split(/\r?\n/);
const headerIndex = ledger.findIndex((line) => line.startsWith("| Feature | Product status |"));
if (headerIndex < 0) throw new Error("Feature ledger table not found");
const sourceHeaders = parse(ledger[headerIndex]);
const sourceRows = [];
for (let index = headerIndex + 2; index < ledger.length && ledger[index].startsWith("|"); index += 1) {
  const cells = parse(ledger[index]);
  if (cells.length === sourceHeaders.length) sourceRows.push(Object.fromEntries(sourceHeaders.map((header, cell) => [header, cells[cell]])));
}
const master = readFileSync(resolve(masterArg), "utf8").split(/\r?\n/);
const ideaHeaderIndex = master.findIndex((line) => line.startsWith("| Idea or capability | Status |"));
if (ideaHeaderIndex < 0) throw new Error("Idea inventory table not found");
const ideaHeaders = parse(master[ideaHeaderIndex]);
const ideaRows = [];
for (let index = ideaHeaderIndex + 2; index < master.length && master[index].startsWith("|"); index += 1) {
  const cells = parse(master[index]);
  if (cells.length === ideaHeaders.length) ideaRows.push(Object.fromEntries(ideaHeaders.map((header, cell) => [header, cells[cell]])));
}

const headers = [
  "record_type", "name", "summary", "definitive_status", "status_confidence", "user_problem", "target_users",
  "user_facing_behavior", "functional_coverage", "scope_boundaries", "code_evidence", "test_evidence",
  "documentation_evidence", "routes_components_services", "data_and_schemas", "flags_and_configuration",
  "dependencies_and_integrations", "known_limitations", "related_features", "related_explored_ideas",
  "historical_names_or_aliases", "runtime_status", "runtime_evidence", "last_verified_commit", "last_verified_date",
];
const rows = [...sourceRows.map((row) => enrichFeature(row)), ...ideaRows.map((row) => enrichIdea(row))];
writeFileSync(resolve(outputArg), [headers.join(","), ...rows.map((row) => headers.map((header) => quote(row[header])).join(",")), ""].join("\n"));
console.log(JSON.stringify({ featureRows: sourceRows.length, ideaRows: ideaRows.length, rows: rows.length, output: resolve(outputArg) }, null, 2));

function enrichFeature(row) {
  const name = row.Feature;
  const domain = domainFor(name);
  const operator = /(backup|restore|hosted|status tooling|backfill|diagnostic)/i.test(name);
  const inactive = row["Product status"] === "Inactive";
  return {
    record_type: "feature",
    name,
    summary: `${name} as classified on current main.`,
    definitive_status: row["Product status"],
    status_confidence: confidenceFor(row),
    user_problem: operator
      ? `The maintainer needs safe, observable ${name.toLowerCase()} without exposing private operations.`
      : `The single owner needs ${name.toLowerCase()} as part of the private knowledge workflow.`,
    target_users: operator ? "AI Brain maintainer/operator and authorized AI agent" : "Single AI Brain owner; contributors maintaining the capability",
    user_facing_behavior: inactive
      ? `${row["User surface"]}; current product path is deliberately unavailable.`
      : `${row["User surface"]}; primary entrypoint: ${row["API/action entrypoint"]}.`,
    functional_coverage: `${row["Core modules"]}; jobs/scripts: ${row["Jobs/scripts"]}.`,
    scope_boundaries: row["Known gaps"],
    code_evidence: `${row["API/action entrypoint"]}; ${row["Core modules"]}.`,
    test_evidence: row.Verification,
    documentation_evidence: documentationFor(domain),
    routes_components_services: `${row["User surface"]}; ${row["API/action entrypoint"]}; ${row["Core modules"]}.`,
    data_and_schemas: row["Data touched"],
    flags_and_configuration: configFor(name),
    dependencies_and_integrations: dependenciesFor(name),
    known_limitations: row["Known gaps"],
    related_features: relatedFor(domain),
    related_explored_ideas: ideasFor(domain),
    historical_names_or_aliases: aliasesFor(name),
    runtime_status: row["Runtime status"],
    runtime_evidence: `${row.Verification}; baseline ${row["Baseline SHA"]}.`,
    last_verified_commit: "23868faf13c8e3d0821715e6f5d0e3d2af1e1a34",
    last_verified_date: "2026-07-11",
  };
}

function enrichIdea(row) {
  const name = stripCode(row["Idea or capability"]);
  const status = row.Status;
  const current = row["What exists now"];
  const absent = row["Why it is not Implemented"];
  const evidence = row["Primary evidence"];
  const domain = domainFor(name);
  const target = /multi-user|family|team|collaboration/i.test(name)
    ? "Potential multi-person users; the current product supports one private owner only"
    : status === "Rejected"
      ? "No current target user; the idea is intentionally outside the accepted product contract"
      : "The single AI Brain owner and maintainers evaluating a future capability";
  return {
    record_type: "idea",
    name,
    summary: `${name} is a ${status.toLowerCase()} non-current capability; it must not be presented as available behavior.`,
    definitive_status: status,
    status_confidence: `${row.Confidence}; confidence applies to the classification and absence at the verified baseline, not to an unapproved future design.`,
    user_problem: opportunityFor(name, status),
    target_users: target,
    user_facing_behavior: `No current end-to-end user journey. Adjacent behavior: ${current}. If reconsidered, the exact interaction must be specified before implementation.`,
    functional_coverage: `No committed feature coverage. The known missing contract is: ${absent}.`,
    scope_boundaries: `Not implemented at the verified baseline. ${absent}. No additional recommendation is inferred beyond the cited source.`,
    code_evidence: `Current-main adjacent substrate only: ${current}. No code evidence establishes the complete idea.`,
    test_evidence: "No current end-to-end test for the complete idea; current-main source/test inspection supports the non-current classification.",
    documentation_evidence: `${evidence}; Ideas-and-Exploration-Catalog; relevant dated Feature Council or roadmap source where named.`,
    routes_components_services: "No dedicated current route/component/service for the complete idea; inspect the adjacent substrate named in code_evidence before planning.",
    data_and_schemas: `No committed idea-specific persistence contract. Adjacent current state: ${current}.`,
    flags_and_configuration: "No current flag or configuration activates the complete idea.",
    dependencies_and_integrations: ideaDependencies(name, domain),
    known_limitations: absent,
    related_features: relatedFor(domain),
    related_explored_ideas: ideaRelations(name, domain),
    historical_names_or_aliases: ideaAliases(name),
    runtime_status: "Not deployed",
    runtime_evidence: `No runtime proof for the complete idea; classification evidence: ${evidence}.`,
    last_verified_commit: "23868faf13c8e3d0821715e6f5d0e3d2af1e1a34",
    last_verified_date: "2026-07-11",
  };
}

function domainFor(name) {
  if (/auth|PIN|pairing|bearer/i.test(name)) return "auth";
  if (/capture|YouTube|PDF|transcript|Android|extension|Telegram|Recall/i.test(name)) return "capture";
  if (/search|Ask|chat|related|chunk|embed/i.test(name)) return "retrieval";
  if (/note/i.test(name)) return "notes";
  if (/tag|topic|collection|organization/i.test(name)) return "organization";
  if (/provider|enrich|summary/i.test(name)) return "ai";
  if (/backup|restore|hosted|health|status/i.test(name)) return "operations";
  return "product";
}

function confidenceFor(row) {
  if (row["Code status"] === "Not found") return "High for absence at the verified baseline; future intent confidence follows planning source";
  if (row["Runtime status"] === "Unknown") return "High for code; Medium/Low for runtime as stated";
  return "High for code/status; runtime confidence limited to the cited dated evidence";
}

function documentationFor(domain) {
  return ({
    auth: "Authentication-Sessions-and-Device-Pairing; Security-Privacy-and-Redaction",
    capture: "Capture-and-Ingestion; Capture-Quality-Review-and-Repair; client/integration feature page",
    retrieval: "Search-RAG-and-Ask; Feature-Architecture; Data-Model",
    notes: "Manual-Content-Notes; Configuration-Reference",
    organization: "Organization-Tags-Topics-and-Collections",
    ai: "Enrichment-and-AI-Providers; Technology-Stack",
    operations: "Deployment-and-Operations; Backups-and-Restore; Command-Safety",
    product: "Feature-Catalog; Product-Overview",
  })[domain];
}

function configFor(name) {
  if (/note/i.test(name)) return "Attached-note UI/write/processing/Focus flags and per-note/provider-consent settings where applicable";
  if (/Recall/i.test(name)) return "Private Recall credentials, enable/apply flags, caps, lock/checkpoint/report configuration";
  if (/provider|enrich|search|Ask|embed|related/i.test(name)) return "Generation/embedding provider, endpoint/key/model/dimension and queue configuration as applicable";
  if (/Android|extension|pairing|bearer/i.test(name)) return "Shared bearer, public origin, client storage and optional version/origin policy";
  if (/Telegram/i.test(name)) return "Private webhook/bot/owner policy configuration";
  return "No dedicated feature flag identified; see Configuration Reference for shared settings";
}

function dependenciesFor(name) {
  if (/Android/i.test(name)) return "Capacitor, Android share target, hosted API";
  if (/extension/i.test(name)) return "Chrome MV3 and capture API";
  if (/Telegram/i.test(name)) return "Telegram webhook/API and capture pipeline";
  if (/Recall/i.test(name)) return "Recall API, packaged runner, system timer and capture pipeline";
  if (/provider|enrich|Ask|embed|search|related/i.test(name)) return "Configured generation/embedding provider, SQLite FTS/vector state and queues";
  if (/backup|restore/i.test(name)) return "SQLite snapshot API, filesystem, encrypted off-site service and private operator context";
  return "Next.js application, SQLite repositories and owning feature modules";
}

function relatedFor(domain) {
  return ({
    auth: "Android/extension clients; Telegram; Notes; all protected routes",
    capture: "Quality/Review/Repair; Enrichment; Search/Ask; clients/integrations",
    retrieval: "Chunking/embeddings; Notes AI eligibility; Chat; Organization scopes",
    notes: "Item detail; Search/Ask/Related; Provider consent; Focus",
    organization: "Library; Enrichment; Search/Ask scopes",
    ai: "Capture; Search/Ask; Notes processing; Provider status",
    operations: "Deployment; Health; Recall; Backups; private runbooks",
    product: "Library; Capture; Organization; Retrieval",
  })[domain];
}

function ideasFor(domain) {
  return ({
    auth: "Trust Center; WebAuthn; per-device identity; multi-user",
    capture: "Repair Center; Reading Studio; additional formats/OCR; offline capture",
    retrieval: "Evidence Scan; relationship graph; generated pages/flows",
    notes: "Rich editor/history; backlinks; synthesis; learning; annotations",
    organization: "Smart filters/collections; graph; multi-vault",
    ai: "Trust Center; on-device models; proactive suggestions",
    operations: "Complete artifact backup; centralized observability; stronger CI",
    product: "See Ideas and Exploration Catalog",
  })[domain];
}

function aliasesFor(name) {
  if (/note/i.test(name)) return "Manual content note / My notes / attached note; distinguish standalone note capture";
  if (/Review/i.test(name)) return "Attention Review; distinguish planned spaced repetition Review";
  if (/Related/i.test(name)) return "Connections; not a graph";
  if (/Recall/i.test(name)) return "Recall import/sync; current contract is guarded one-way import";
  return "See Glossary; AI Brain UI may use AI Memory";
}

function opportunityFor(name, status) {
  if (status === "Rejected") return `The sources considered whether ${name.toLowerCase()} would help, then intentionally kept it outside the current private, single-owner product contract.`;
  if (status === "Superseded") return `The sources needed an earlier approach to ${name.toLowerCase()}, but current behavior replaced that approach.`;
  if (/reading|highlight|annotation|backlink|writing|note/i.test(name)) return `Potentially deepen reading, annotation, or writing workflows around captured sources without weakening source provenance or note privacy.`;
  if (/ask|search|graph|cluster|filter|matrix|flow|suggest/i.test(name)) return `Potentially improve how the owner discovers, scopes, explains, or connects knowledge beyond current search and Related behavior.`;
  if (/capture|podcast|EPUB|DOCX|OCR|browsing/i.test(name)) return `Potentially capture or use source types and browser context that the current ingestion contract does not fully support.`;
  if (/privacy|WebAuthn|multi-user|share|Slack|Notion|subscription/i.test(name)) return `Potentially change trust, identity, sharing, or service boundaries that are deliberately narrow in the current product.`;
  if (/offline|Kotlin|iOS|Mac|Ollama|Gemma/i.test(name)) return `Potentially change client or model deployment beyond the current hosted web service and private Capacitor Android client.`;
  return `Potential opportunity described by the cited source: ${name}. The source does not establish a committed implementation problem statement.`;
}

function ideaDependencies(name, domain) {
  if (/graph|Neo4j/i.test(name)) return "Would require an approved edge model, rebuild/consistency policy, accessible non-graph view, and possibly an external graph store/export contract.";
  if (/offline/i.test(name)) return "Would require local persistence, queue/conflict/sync policy, client security, and recovery semantics not present today.";
  if (/multi-user|collaboration|share|Slack|Notion|subscription/i.test(name)) return "Would require identity/authorization, privacy, tenancy or sharing policy, abuse/failure handling, and new external-service contracts.";
  if (/Podcast|EPUB|DOCX|RTF|ODT|OCR|browsing/i.test(name)) return "Would require format/source adapters, validation, provenance, quality/repair behavior, tests, and operational dependency review.";
  if (/WebAuthn|Touch ID/i.test(name)) return "Would require credential registration/recovery, platform authenticator support, server persistence, and migration from the current PIN/shared-bearer model.";
  if (/Kotlin|iOS/i.test(name)) return "Would require a separately supported native client stack, release/signing path, API parity, accessibility, and device QA.";
  if (/Gemma|Ollama|local Mac/i.test(name)) return "Would require model/runtime sizing, provider policy, privacy/consent semantics, quality evaluation, and operational support.";
  return `Would require an approved product/architecture contract plus the current ${domain} substrate and its test/operational boundaries.`;
}

function ideaRelations(name, domain) {
  if (/Reading Studio|highlight|annotation|writing|note/i.test(name)) return "Reading Studio, attached notes, source provenance, Evidence Scan, backlinks/synthesis, and export ideas.";
  if (/Ask|search|graph|cluster|filter|matrix|flow|suggest/i.test(name)) return "Evidence Scan, Connection Map, generated pages/clusters, proactive flows, and current Search/Ask/Related capabilities.";
  if (/offline|Kotlin|iOS/i.test(name)) return "Fully offline library, Android outbox/inbox, native-client replacement, iOS, and current honest offline fallback.";
  if (/capture|Podcast|EPUB|DOCX|OCR|browsing/i.test(name)) return "Capture adapters, Reading Studio, repair/quality review, provenance, enrichment, and search.";
  return `See Ideas and Exploration Catalog; related current domain: ${domain}.`;
}

function ideaAliases(name) {
  if (name === "Contextual Ask Evidence Scan") return "Evidence Scan / FCP-003; do not confuse with current citation-backed Ask.";
  if (name === "Relationship Graph/Connection Map") return "Connection Map / relationship graph / FCP-004; do not rename current Related as a graph.";
  if (name === "AI Services/Privacy Trust Center") return "Trust Center / FCP-005; current provider status/settings are adjacent substrate only.";
  if (name === "Reading Studio Lite") return "Source Workspace / Reading Studio Lite / FCP-002.";
  if (name === "`/items/new` note form" || name === "/items/new note form") return "Historical standalone note-entry route; superseded by the Capture note tab.";
  if (/yt-dlp/i.test(name)) return "Initial YouTube downloader design; superseded by the zero-dependency extractor and gated recovery pipeline.";
  return "No additional alias confirmed beyond the inventory name and cited source terminology.";
}

function stripCode(value) {
  return value.replaceAll("`", "");
}

function parse(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function quote(value = "") {
  return `"${String(value).replaceAll('"', '""')}"`;
}
