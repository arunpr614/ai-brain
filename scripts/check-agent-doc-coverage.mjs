#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const INVENTORY_CLASSIFICATIONS = new Set([
  "Documented user feature",
  "Documented internal capability",
  "Supporting implementation",
  "Operational tool",
  "Planned only",
  "Deprecated",
  "Excluded with rationale",
]);
const PRODUCT_STATUSES = new Set([
  "Implemented",
  "Partially implemented",
  "Experimental",
  "Feature-flagged",
  "Inactive",
  "Deprecated",
  "Explored",
  "Planned",
  "Deferred",
  "Rejected",
  "Superseded",
  "Unknown",
]);
const CODE_STATUSES = new Set(["Main", "Branch-only", "Not found"]);
const RUNTIME_STATUSES = new Set(["Deployed-verified", "Deployed-unverified", "Not deployed", "Unknown"]);
const COMMAND_CLASSES = new Set([
  "R0 read-only local",
  "R1 network read",
  "W1 local ephemeral write",
  "W2 local persistent write",
  "W3 external/public write",
  "W4 production write",
  "Unknown",
]);
const PUBLIC_COMMAND_CLASSES = new Set(["R0 read-only local", "R1 network read", "W1 local ephemeral write"]);

const args = parseArgs(process.argv.slice(2));
const docsRoot = resolve(args.docsRoot ?? "docs/agent-docs");
const wikiRoot = resolve(args.wikiRoot ?? "docs/wiki");
const packagePath = resolve(args.packagePath ?? "package.json");
const findings = [];

const inventoryPath = join(docsRoot, "source-inventory.md");
const featurePath = join(docsRoot, "feature-coverage-ledger.md");
const commandPath = join(docsRoot, "command-safety-registry.md");

const inventory = parseNamedTable(inventoryPath, [
  "Artifact", "Baseline", "Kind", "Domain", "Classification", "Feature row", "Documentation page", "Evidence",
]);
const features = parseNamedTable(featurePath, [
  "Feature", "Product status", "Code status", "Runtime status", "User surface", "API/action entrypoint",
  "Core modules", "Data touched", "Jobs/scripts", "Verification", "Baseline SHA", "Known gaps",
]);
const commands = parseNamedTable(commandPath, [
  "Command", "Classification", "Network", "Writes", "Production", "Approval", "Evidence",
]);

for (const [index, row] of inventory.rows.entries()) {
  if (!INVENTORY_CLASSIFICATIONS.has(row.Classification)) {
    findings.push(finding(inventoryPath, index + 3, "invalid_inventory_classification", row.Classification));
  }
  for (const column of inventory.headers) {
    if (!row[column]) findings.push(finding(inventoryPath, index + 3, "blank_inventory_cell", column));
  }
}

for (const [index, row] of features.rows.entries()) {
  if (!PRODUCT_STATUSES.has(row["Product status"])) {
    findings.push(finding(featurePath, index + 3, "invalid_product_status", row["Product status"]));
  }
  if (!CODE_STATUSES.has(row["Code status"])) {
    findings.push(finding(featurePath, index + 3, "invalid_code_status", row["Code status"]));
  }
  if (!RUNTIME_STATUSES.has(row["Runtime status"])) {
    findings.push(finding(featurePath, index + 3, "invalid_runtime_status", row["Runtime status"]));
  }
  if (new Set(["Implemented", "Feature-flagged", "Inactive"]).has(row["Product status"]) && row["Code status"] === "Not found") {
    findings.push(finding(featurePath, index + 3, "implemented_without_code", row.Feature));
  }
  if (row["Runtime status"] === "Deployed-verified" && !/^[0-9a-f]{40}$/i.test(row["Baseline SHA"])) {
    findings.push(finding(featurePath, index + 3, "verified_runtime_without_sha", row.Feature));
  }
  for (const column of features.headers) {
    if (!row[column]) findings.push(finding(featurePath, index + 3, "blank_feature_cell", column));
  }
}

const commandMap = new Map();
for (const [index, row] of commands.rows.entries()) {
  const name = stripCode(row.Command);
  if (!COMMAND_CLASSES.has(row.Classification)) {
    findings.push(finding(commandPath, index + 3, "invalid_command_classification", row.Classification));
  }
  if (commandMap.has(name)) findings.push(finding(commandPath, index + 3, "duplicate_command", name));
  commandMap.set(name, row);
  for (const column of commands.headers) {
    if (!row[column]) findings.push(finding(commandPath, index + 3, "blank_command_cell", column));
  }
}

let packageJson = null;
if (!existsSync(packagePath)) {
  findings.push(finding(packagePath, null, "missing_package_json", packagePath));
} else {
  try {
    packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  } catch {
    findings.push(finding(packagePath, null, "invalid_package_json", packagePath));
  }
}

for (const script of Object.keys(packageJson?.scripts ?? {})) {
  if (!commandMap.has(script)) findings.push(finding(commandPath, null, "unclassified_package_script", script));
}

for (const invocation of collectPublicNpmInvocations(wikiRoot)) {
  const row = commandMap.get(invocation.script);
  if (!row) {
    findings.push(finding(invocation.file, invocation.line, "public_command_unclassified", invocation.script));
  } else if (!PUBLIC_COMMAND_CLASSES.has(row.Classification)) {
    findings.push(finding(invocation.file, invocation.line, "unsafe_public_command", invocation.script));
  }
}

const result = {
  ok: findings.length === 0,
  inventoryRows: inventory.rows.length,
  featureRows: features.rows.length,
  commandRows: commands.rows.length,
  packageScripts: Object.keys(packageJson?.scripts ?? {}).length,
  findings,
};

if (!result.ok) {
  console.error("[check-agent-doc-coverage] failed");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--wiki") parsed.wikiRoot = argv[++index];
    else if (arg === "--package") parsed.packagePath = argv[++index];
    else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("--")) throw new Error(`Unknown argument: ${arg}`);
    else if (!parsed.docsRoot) parsed.docsRoot = arg;
    else throw new Error(`Unexpected positional argument: ${arg}`);
  }
  return parsed;
}

function parseNamedTable(path, requiredHeaders) {
  if (!existsSync(path)) {
    findings.push(finding(path, null, "missing_table_file", path));
    return { headers: requiredHeaders, rows: [] };
  }
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => {
    const cells = parseRow(line);
    return cells.length > 0 && cells[0] === requiredHeaders[0];
  });
  if (headerIndex < 0) {
    findings.push(finding(path, null, "missing_table_header", requiredHeaders.join(" | ")));
    return { headers: requiredHeaders, rows: [] };
  }
  const headers = parseRow(lines[headerIndex]);
  if (JSON.stringify(headers) !== JSON.stringify(requiredHeaders)) {
    findings.push(finding(path, headerIndex + 1, "wrong_table_headers", headers.join(" | ")));
  }
  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith("|")) break;
    const cells = parseRow(lines[index]);
    if (cells.length !== headers.length) {
      findings.push(finding(path, index + 1, "wrong_table_cell_count", String(cells.length)));
      continue;
    }
    rows.push(Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex]])));
  }
  if (rows.length === 0) findings.push(finding(path, null, "empty_table", requiredHeaders[0]));
  return { headers, rows };
}

function collectPublicNpmInvocations(root) {
  if (!existsSync(root)) return [];
  const invocations = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const file = join(root, entry.name);
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    let executableFence = false;
    for (const [index, line] of lines.entries()) {
      if (/^```(?:bash|sh|shell)\s*$/.test(line.trim())) executableFence = true;
      else if (line.trim() === "```") executableFence = false;
      else if (executableFence) {
        for (const match of line.matchAll(/\bnpm run (?:-s )?([A-Za-z0-9:_-]+)/g)) {
          invocations.push({ file, line: index + 1, script: match[1] });
        }
      }
    }
  }
  return invocations;
}

function parseRow(line) {
  if (!line.trim().startsWith("|")) return [];
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function stripCode(value) {
  return value.replace(/^`|`$/g, "");
}

function finding(file, line, rule, detail) {
  return { file, line, rule, detail };
}

function printHelp() {
  console.log(`Agent documentation coverage checker

Usage:
  node scripts/check-agent-doc-coverage.mjs [docs/agent-docs] [--wiki docs/wiki] [--package package.json]`);
}
