import assert from "node:assert/strict";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const REPOSITORY_ROOT = fileURLToPath(new URL("../../../../../../", import.meta.url));

function collectMarkdown(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? collectMarkdown(absolute) : [absolute];
    })
    .filter((absolute) => absolute.endsWith(".md"))
    .sort();
}

function collectPublicationArtifacts(directory: string): string[] {
  const publicationExtensions = new Set([".json", ".md", ".sb", ".txt"]);
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "fixtures" || entry.name === "tests") return [];
        return collectPublicationArtifacts(absolute);
      }
      return [absolute];
    })
    .filter((absolute) => publicationExtensions.has(path.extname(absolute)))
    .sort();
}

function repositoryRelativeLinks(markdownPath: string, failures?: string[]): string[] {
  const links: string[] = [];
  const text = readFileSync(markdownPath, "utf8").replace(/```[\s\S]*?```/gu, "");
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
    if (/^(?:https?:|mailto:|#)/u.test(target)) continue;
    target = target.split("#", 1)[0].split("?", 1)[0];
    try { target = decodeURIComponent(target); }
    catch {
      failures?.push(`${path.relative(REPOSITORY_ROOT, markdownPath)}: invalid URL encoding ${target}`);
      continue;
    }
    links.push(path.resolve(path.dirname(markdownPath), target));
  }
  return links;
}

test("every repository-relative Markdown link resolves inside the repository", () => {
  const failures: string[] = [];
  for (const markdownPath of collectMarkdown(PROJECT_ROOT)) {
    for (const resolved of repositoryRelativeLinks(markdownPath, failures)) {
      const target = path.relative(path.dirname(markdownPath), resolved);
      const relative = path.relative(REPOSITORY_ROOT, resolved);
      if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        failures.push(`${path.relative(REPOSITORY_ROOT, markdownPath)}: link escapes repository: ${target}`);
      } else if (!existsSync(resolved) || lstatSync(resolved).isSymbolicLink()) {
        failures.push(`${path.relative(REPOSITORY_ROOT, markdownPath)}: missing or symlinked target: ${target}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("the master index reaches every pre-seal evidence-chain authority", () => {
  const required = [
    "benchmark/PRESEAL_READINESS.json",
    "benchmark/PRESEAL_READINESS.schema.json",
    "benchmark/model/A1_ATTEMPT_CLAIM.schema.json",
    "benchmark/model/A1_ATTEMPT_TERMINAL.schema.json",
    "benchmark/model/A1_EXECUTION_CONTRACT.json",
    "benchmark/model/A1_EXECUTION_CONTRACT.schema.json",
    "benchmark/model/A1_OPERATOR_RECEIPT.schema.json",
    "benchmark/model/ADJUDICATOR_SYSTEM_PROMPT.txt",
    "benchmark/model/BLINDED_ADJUDICATION.schema.json",
    "benchmark/model/BLINDED_ADJUDICATION_GENERATION.schema.json",
    "benchmark/model/BLINDED_ADJUDICATION_PACKET.schema.json",
    "benchmark/model/BLINDED_EVALUATION.schema.json",
    "benchmark/model/BLINDED_EVALUATION_GENERATION.schema.json",
    "benchmark/model/BLINDED_PACKET.schema.json",
    "benchmark/model/BLINDED_PACKET_PACKAGE_RECEIPT.schema.json",
    "benchmark/model/EVALUATOR_A_SYSTEM_PROMPT.txt",
    "benchmark/model/EVALUATOR_B_SYSTEM_PROMPT.txt",
    "benchmark/model/EVALUATOR_EXECUTION_CONTRACT.json",
    "benchmark/model/EVALUATOR_EXECUTION_CONTRACT.schema.json",
    "benchmark/model/GATE4_EVALUATION_ATTEMPT_CLAIM.schema.json",
    "benchmark/model/GATE4_EVALUATION_TERMINAL.schema.json",
    "benchmark/model/GATE_3_RESULT.schema.json",
    "benchmark/model/GATE_4_AGGREGATE.schema.json",
    "benchmark/model/LOCAL_EVALUATOR_RUN_REPORT.schema.json",
    "benchmark/model/PUBLIC_RUN_REPORT.schema.json",
    "benchmark/tools/blinded-evaluation-cli.ts",
    "benchmark/tools/blinded-evaluation.ts",
    "benchmark/tools/blinded-packet-operator.ts",
    "benchmark/tools/gate4-evaluation-claims.ts",
    "benchmark/tools/gate4-finalizer.ts",
    "benchmark/tools/gate3-evidence.ts",
    "benchmark/tools/gate3-result.ts",
    "benchmark/tools/local-blinded-evaluator.ts",
    "benchmark/tools/run-sealed-a1-cell.ts",
    "benchmark/tools/validate-a1-database.ts",
    "benchmark/tools/validate-a1-sealed-authority.ts",
    "reviews/YOUTUBE_TRANSCRIPT_ENRICHMENT_PROSPECTIVE_BENCHMARK_PRE_LOCK_PACKAGE_ADVERSARIAL_REVIEW_2026-07-18_12-57-42_IST.md",
  ].map((relative) => path.join(PROJECT_ROOT, ...relative.split("/")));
  const master = path.join(PROJECT_ROOT, "MASTER_EXECUTION_INDEX.md");
  const visitedMarkdown = new Set<string>();
  const reached = new Set<string>([master]);
  const queue = [master];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visitedMarkdown.has(current)) continue;
    visitedMarkdown.add(current);
    for (const target of repositoryRelativeLinks(current)) {
      reached.add(target);
      if (target.endsWith(".md") && existsSync(target) && !lstatSync(target).isSymbolicLink()) {
        queue.push(target);
      }
    }
  }
  assert.deepEqual(
    required.filter((requiredPath) => !reached.has(requiredPath)).map((missing) => path.relative(PROJECT_ROOT, missing)),
    [],
  );

  assert.deepEqual(
    collectPublicationArtifacts(PROJECT_ROOT)
      .filter((artifact) => !reached.has(artifact))
      .map((missing) => path.relative(PROJECT_ROOT, missing)),
    [],
    "every publication artifact outside test/fixture trees must be reachable from the master index",
  );
});
