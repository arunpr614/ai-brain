#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { isSensitiveProjectWikiPath, SENSITIVE_PATH_REGRESSION_FIXTURES } from "./project-wiki-sensitive-path-policy.mjs";

const root = resolve("docs/feature-council/project-wiki");
const wikiRoot = resolve("docs/wiki");
const featureLedger = resolve("docs/agent-docs/feature-coverage-ledger.md");
const localInventorySummary = resolve("docs/feature-council/project-wiki/LOCAL_DOCUMENTATION_INVENTORY.md");
const findings = [];
const EXPECTED_SOURCE_COUNTS = new Map([
  ["source-1-historical-recall-app", 14],
  ["source-2-research-container", 12_584],
  ["source-3-feature-council", 664],
  ["source-4-wiki-research", 2_273],
  ["source-5-current-clone", 2_454],
]);
for (const fixture of SENSITIVE_PATH_REGRESSION_FIXTURES) {
  if (!isSensitiveProjectWikiPath(fixture)) findings.push({ rule: "sensitive_path_policy_regression", fixture });
}

const local = readCsv(join(root, "LOCAL_DOCUMENTATION_FILE_INVENTORY.csv"), [
  "source_root", "relative_source", "file_type", "size_bytes", "modified_at", "sha256",
  "purpose", "evidence_role", "reliability", "feature_tags", "duplicate_of",
  "conflict_or_overlap", "publication_safety", "exclusion_or_failure_reason", "inspection_status",
]);
const pageAudit = readCsv(join(root, "EXISTING_WIKI_PAGE_AUDIT_AND_MIGRATION.csv"), [
  "existing_page", "purpose", "quality_before", "accuracy_before", "duplication_before",
  "completeness_before", "orphan_status_before", "broken_internal_links_before", "preserve_value",
  "migration_action", "destination_page", "reason", "existing_sha256", "current_sha256",
]);
const masterInventoryPath = join(root, "MASTER_FEATURE_AND_IDEA_INVENTORY.md");
const features = readCsv(join(root, "MASTER_FEATURE_AND_IDEA_EVIDENCE_DETAILS.csv"), [
  "record_type", "name", "summary", "definitive_status", "status_confidence", "user_problem", "target_users",
  "user_facing_behavior", "functional_coverage", "scope_boundaries", "code_evidence", "test_evidence",
  "documentation_evidence", "routes_components_services", "data_and_schemas", "flags_and_configuration",
  "dependencies_and_integrations", "known_limitations", "related_features", "related_explored_ideas",
  "historical_names_or_aliases", "runtime_status", "runtime_evidence", "last_verified_commit", "last_verified_date",
]);

expectCount(local, 17_989, "local_inventory_count");
expectCount(pageAudit, 84, "page_audit_count");

const ledgerFeatureCount = tableRowCount(featureLedger, "| Feature | Product status |");
const masterIdeaCount = tableRowCount(masterInventoryPath, "| Idea or capability | Status |");
const masterIdeaNames = tableNames(masterInventoryPath, "| Idea or capability | Status |");
const publicIdeaNames = tableNames(join(wikiRoot, "Ideas-and-Exploration-Catalog.md"), "| Idea | Status |");
if (features.rows.length !== ledgerFeatureCount + masterIdeaCount) {
  findings.push({ rule: "master_evidence_count_drift", expected: ledgerFeatureCount + masterIdeaCount, actual: features.rows.length });
}
if (features.rows.filter((row) => row.record_type === "feature").length !== ledgerFeatureCount) findings.push({ rule: "feature_evidence_count_drift" });
if (features.rows.filter((row) => row.record_type === "idea").length !== masterIdeaCount) findings.push({ rule: "idea_evidence_count_drift" });
compareNames("feature", tableNames(featureLedger, "| Feature | Product status |"));
compareNames("idea", masterIdeaNames);
comparePublicIdeaCatalog(masterIdeaNames, publicIdeaNames);
compareStatuses("feature", tableColumnMap(featureLedger, "| Feature | Product status |", 1));
compareStatuses("idea", tableColumnMap(masterInventoryPath, "| Idea or capability | Status |", 1));
const ideaConfidence = tableColumnMap(masterInventoryPath, "| Idea or capability | Status |", 2);
for (const row of features.rows.filter((item) => item.record_type === "idea")) {
  if (!row.status_confidence.startsWith(ideaConfidence.get(row.name) ?? "<missing>")) findings.push({ rule: "idea_evidence_confidence_drift", name: row.name });
}

for (const [index, row] of local.rows.entries()) {
  for (const field of local.headers.filter((header) => header !== "duplicate_of")) {
    if (!row[field]) findings.push({ rule: "blank_local_inventory_field", row: index + 2, field });
  }
  if (row.relative_source.startsWith("/") || row.relative_source.includes("/Users/")) {
    findings.push({ rule: "unsafe_local_inventory_path", row: index + 2 });
  }
  if (row.publication_safety === "publication-candidate" && isSensitiveProjectWikiPath(row.relative_source)) {
    findings.push({ rule: "sensitive_inventory_path_marked_public", row: index + 2 });
  }
  if (row.publication_safety === "publication-candidate" && new Set([".log", ".jsonl", ".sqlite", ".sqlite3", ".db", ".keystore", ".jks", ".p12", ".pfx", ".apk"]).has(row.file_type)) {
    findings.push({ rule: "sensitive_inventory_file_type_marked_public", row: index + 2, fileType: row.file_type });
  }
  if (row.publication_safety === "excluded-sensitive") {
    if (!row.relative_source.startsWith("redacted-path/")) findings.push({ rule: "sensitive_inventory_path_not_redacted", row: index + 2 });
    for (const field of ["size_bytes", "modified_at", "sha256"]) {
      if (row[field] !== "<redacted>") findings.push({ rule: "sensitive_inventory_metadata_not_redacted", row: index + 2, field });
    }
  }
}
const sourceCounts = new Map();
for (const row of local.rows) sourceCounts.set(row.source_root, (sourceCounts.get(row.source_root) ?? 0) + 1);
const summaryText = existsSync(localInventorySummary) ? readFileSync(localInventorySummary, "utf8") : "";
for (const [source, expected] of EXPECTED_SOURCE_COUNTS) {
  if (sourceCounts.get(source) !== expected) findings.push({ rule: "source_inventory_count_drift", source, expected, actual: sourceCounts.get(source) ?? 0 });
  if (!summaryText.includes(`${expected.toLocaleString("en-US")} files`) && !(expected === 14 && summaryText.includes("14 Markdown files"))) {
    findings.push({ rule: "source_inventory_summary_count_drift", source, expected });
  }
}

const wikiPages = readdirSync(wikiRoot).filter((name) => name.endsWith(".md")).sort();
const auditedDestinations = new Set();
for (const [index, row] of pageAudit.rows.entries()) {
  for (const field of pageAudit.headers.filter((header) => header !== "existing_sha256")) {
    if (!row[field]) findings.push({ rule: "blank_page_audit_field", row: index + 2, field });
  }
  const destination = basename(row.destination_page);
  if (!wikiPages.includes(destination)) {
    findings.push({ rule: "missing_page_audit_destination", row: index + 2, destination });
    continue;
  }
  auditedDestinations.add(destination);
  const current = sha(readFileSync(join(wikiRoot, destination), "utf8"));
  if (row.current_sha256 !== current) findings.push({ rule: "stale_page_audit_hash", row: index + 2, destination });
}
const existingCoreAudits = pageAudit.rows.filter((row) => row.existing_page !== "<new>" && !row.existing_page.startsWith("Feature-Council-"));
if (existingCoreAudits.length !== 19) findings.push({ rule: "existing_core_page_audit_count", expected: 19, actual: existingCoreAudits.length });
for (const row of existingCoreAudits) {
  if (!/\d+ words, \d+ headings, \d+ Markdown links inspected/.test(row.quality_before)) findings.push({ rule: "core_page_audit_missing_content_metrics", page: row.existing_page });
}
if (new Set(existingCoreAudits.map((row) => row.accuracy_before)).size !== existingCoreAudits.length) findings.push({ rule: "core_page_audit_accuracy_not_page_specific" });
const historicalAudits = pageAudit.rows.filter((row) => row.existing_page.startsWith("Feature-Council-"));
if (historicalAudits.length !== 44) findings.push({ rule: "historical_page_audit_count", expected: 44, actual: historicalAudits.length });
for (const row of historicalAudits) {
  if (!/\d+ words, \d+ headings, \d+ Markdown links inspected/.test(row.quality_before)) findings.push({ rule: "historical_page_audit_missing_content_metrics", page: row.existing_page });
  if (!/dated .* only/.test(row.accuracy_before)) findings.push({ rule: "historical_page_audit_missing_lifecycle_boundary", page: row.existing_page });
}
for (const page of wikiPages) {
  if (!auditedDestinations.has(page)) findings.push({ rule: "unaudited_wiki_page", page });
}

for (const [index, row] of features.rows.entries()) {
  for (const field of features.headers) {
    if (!row[field]) findings.push({ rule: "blank_feature_evidence_field", row: index + 2, field });
  }
  if (!/^[0-9a-f]{40}$/.test(row.last_verified_commit)) {
    findings.push({ rule: "invalid_feature_verification_sha", row: index + 2 });
  }
  if (!new Set(["feature", "idea"]).has(row.record_type)) findings.push({ rule: "invalid_evidence_record_type", row: index + 2 });
}

const result = {
  ok: findings.length === 0,
  localInventoryRows: local.rows.length,
  pageAuditRows: pageAudit.rows.length,
  featureEvidenceRows: features.rows.filter((row) => row.record_type === "feature").length,
  ideaEvidenceRows: features.rows.filter((row) => row.record_type === "idea").length,
  wikiPages: wikiPages.length,
  findings,
};
if (!result.ok) {
  console.error("[check-project-wiki-artifacts] failed");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));

function readCsv(path, requiredHeaders) {
  if (!existsSync(path)) {
    findings.push({ rule: "missing_csv", path });
    return { headers: requiredHeaders, rows: [] };
  }
  const records = parseCsv(readFileSync(path, "utf8"));
  const headers = records.shift() ?? [];
  if (JSON.stringify(headers) !== JSON.stringify(requiredHeaders)) {
    findings.push({ rule: "wrong_csv_headers", path, actual: headers });
  }
  const rows = records.filter((record) => record.some(Boolean)).map((record, index) => {
    if (record.length !== headers.length) findings.push({ rule: "wrong_csv_width", path, row: index + 2 });
    return Object.fromEntries(headers.map((header, column) => [header, record[column] ?? ""]));
  });
  return { headers, rows };
}

function parseCsv(text) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else field += char;
  }
  if (field || record.length) {
    record.push(field);
    records.push(record);
  }
  return records;
}

function tableRowCount(path, prefix) {
  if (!existsSync(path)) {
    findings.push({ rule: "missing_ledger", path });
    return 0;
  }
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const header = lines.findIndex((line) => line.startsWith(prefix));
  if (header < 0) {
    findings.push({ rule: "missing_feature_table", path });
    return 0;
  }
  let count = 0;
  for (let index = header + 2; index < lines.length && lines[index].startsWith("|"); index += 1) count += 1;
  return count;
}

function tableNames(path, prefix) {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const header = lines.findIndex((line) => line.startsWith(prefix));
  if (header < 0) return [];
  const names = [];
  for (let index = header + 2; index < lines.length && lines[index].startsWith("|"); index += 1) {
    names.push(lines[index].trim().replace(/^\||\|$/g, "").split("|")[0].trim().replaceAll("`", ""));
  }
  return names;
}

function tableColumnMap(path, prefix, columnIndex) {
  if (!existsSync(path)) return new Map();
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const header = lines.findIndex((line) => line.startsWith(prefix));
  if (header < 0) return new Map();
  const result = new Map();
  for (let index = header + 2; index < lines.length && lines[index].startsWith("|"); index += 1) {
    const cells = lines[index].trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim().replaceAll("`", ""));
    result.set(cells[0], cells[columnIndex]);
  }
  return result;
}

function compareNames(recordType, expectedNames) {
  const actualNames = features.rows.filter((row) => row.record_type === recordType).map((row) => row.name);
  for (const name of expectedNames) {
    if (!actualNames.includes(name)) findings.push({ rule: `missing_${recordType}_evidence_record`, name });
  }
  for (const name of actualNames) {
    if (!expectedNames.includes(name)) findings.push({ rule: `unexpected_${recordType}_evidence_record`, name });
  }
  if (new Set(actualNames).size !== actualNames.length) findings.push({ rule: `duplicate_${recordType}_evidence_record` });
}

function compareStatuses(recordType, expectedStatuses) {
  for (const row of features.rows.filter((item) => item.record_type === recordType)) {
    if (row.definitive_status !== expectedStatuses.get(row.name)) findings.push({ rule: `${recordType}_evidence_status_drift`, name: row.name });
  }
}

function comparePublicIdeaCatalog(expectedNames, actualNames) {
  if (actualNames.length !== expectedNames.length) findings.push({ rule: "public_idea_catalog_count_drift", expected: expectedNames.length, actual: actualNames.length });
  for (const name of expectedNames) {
    if (!actualNames.includes(name)) findings.push({ rule: "public_idea_catalog_missing_record", name });
  }
  for (const name of actualNames) {
    if (!expectedNames.includes(name)) findings.push({ rule: "public_idea_catalog_unexpected_record", name });
  }
}

function expectCount(dataset, expected, rule) {
  if (dataset.rows.length !== expected) findings.push({ rule, expected, actual: dataset.rows.length });
}

function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}
