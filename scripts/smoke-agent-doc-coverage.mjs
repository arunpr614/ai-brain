#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = mkdtempSync(join(tmpdir(), "agent-doc-coverage-"));
const docs = join(root, "docs");
const wiki = join(root, "wiki");
const packagePath = join(root, "package.json");
const checker = resolve("scripts/check-agent-doc-coverage.mjs");
const sha = "a".repeat(40);

try {
  mkdirSync(docs, { recursive: true });
  mkdirSync(wiki, { recursive: true });
  writeFileSync(packagePath, JSON.stringify({ scripts: { typecheck: "tsc --noEmit" } }));
  writeFileSync(join(docs, "source-inventory.md"), table(
    ["Artifact", "Baseline", "Kind", "Domain", "Classification", "Feature row", "Documentation page", "Evidence"],
    [["src/app/page.tsx", "Main", "Page", "Shell", "Documented user feature", "Home", "Product-Overview", sha]],
  ));
  writeFileSync(join(docs, "feature-coverage-ledger.md"), table(
    ["Feature", "Product status", "Code status", "Runtime status", "User surface", "API/action entrypoint", "Core modules", "Data touched", "Jobs/scripts", "Verification", "Baseline SHA", "Known gaps"],
    [["Home", "Shipped", "Main", "Deployed-verified", "/", "None", "src/app/page.tsx", "None", "None", "typecheck", sha, "None"]],
  ));
  writeFileSync(join(docs, "command-safety-registry.md"), table(
    ["Command", "Classification", "Network", "Writes", "Production", "Approval", "Evidence"],
    [["typecheck", "R0 read-only local", "No", "No", "No", "No", "package.json"]],
  ));
  writeFileSync(join(wiki, "Home.md"), "# Home\n\n```bash\nnpm run typecheck\n```\n");

  const valid = run();
  assert.equal(valid.status, 0, valid.stderr);

  writeFileSync(packagePath, JSON.stringify({ scripts: { typecheck: "tsc --noEmit", deploy: "do-not-run" } }));
  const missing = run();
  assert.equal(missing.status, 1, "unclassified package scripts must fail");
  assert.match(missing.stderr, /unclassified_package_script/);

  console.log("[smoke-agent-doc-coverage] ok");
} finally {
  rmSync(root, { recursive: true, force: true });
}

function run() {
  return spawnSync(process.execPath, [checker, docs, "--wiki", wiki, "--package", packagePath], { encoding: "utf8" });
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `|${headers.map(() => "---").join("|")}|`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
  ].join("\n");
}
