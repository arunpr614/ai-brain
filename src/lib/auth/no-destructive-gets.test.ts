/**
 * Regression guard (v0.5.0 T-5 / D-v0.5.0-7): no GET route handler performs a
 * state-mutating operation.
 *
 * With SameSite=Strict session cookies AND token-gated bearer routes, the
 * remaining CSRF vector is a malicious page doing:
 *   location = "http://brain.local:3000/api/foo-destructive-get"
 * The browser DOES send the Strict cookie on top-level navigation, so if any
 * GET handler writes, an attacker can trigger it without touching POST.
 *
 * This test statically scans every `src/app/api/**\/route.ts` for:
 *   1. `export async function GET` (or `export function GET`)
 *   2. Inside that function body, any of: `.run(`, `insertCaptured`, `INSERT`,
 *      `UPDATE`, `DELETE` (SQL or function names), `writeFileSync`,
 *      `appendFileSync`, `unlinkSync`, `rmSync`, `renameSync`, `mkdirSync`.
 *
 * A match fails the test with the file path + matched line. If the flagged
 * call is intentionally non-mutating (e.g., an idempotent read-through cache
 * miss that writes a cache entry), update this test to add an explicit
 * allow-list entry with justification.
 *
 * Known-safe reads that this test does NOT flag (read-only helpers):
 *   getThread, getItem, listMessages, searchItems, retrieve, listChunks*, etc.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, relative } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");

const MUTATION_PATTERNS = [
  /\.run\(/, // better-sqlite3 prepared-statement execute
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bDELETE\s+FROM\b/i, // avoid matching `export async function DELETE`
  /writeFileSync/,
  /appendFileSync/,
  /unlinkSync/,
  /rmSync/,
  /renameSync/,
  /mkdirSync/,
  /\binsertCaptured\b/,
  /\binsertChunk/,
  /\bdeleteThread\b/,
  /\brenameThread\b/,
  /\bappendMessage\b/,
  /\bembedItem\b/,
  /\blogError\b/, // logError writes to disk; reads should never log errors
];

function listRouteFiles(): string[] {
  // `git ls-files` is simpler than walking the tree manually and respects
  // .gitignore (so we skip node_modules, .next, etc. automatically).
  const out = execSync("git ls-files src/app/api", { cwd: REPO_ROOT }).toString();
  return out
    .split("\n")
    .filter((p) => p.endsWith("/route.ts"))
    .map((p) => resolve(REPO_ROOT, p));
}

interface GetBody {
  file: string;
  startLine: number;
  bodyLines: string[];
}

/** Extracts the function body of every `export (async )?function GET(...)` in a file. */
function extractGetBodies(file: string, source: string): GetBody[] {
  const lines = source.split("\n");
  const getStart = /^\s*export\s+(async\s+)?function\s+GET\s*[(<]/;
  const results: GetBody[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!getStart.test(lines[i])) continue;
    // Naively find the matching closing brace by depth counting.
    let depth = 0;
    let started = false;
    const body: string[] = [];
    for (let j = i; j < lines.length; j++) {
      const line = lines[j];
      for (const ch of line) {
        if (ch === "{") {
          depth++;
          started = true;
        } else if (ch === "}") {
          depth--;
        }
      }
      body.push(line);
      if (started && depth === 0) {
        results.push({ file, startLine: i + 1, bodyLines: body });
        break;
      }
    }
  }
  return results;
}

test("no GET route handler performs a state-mutating operation", () => {
  const files = listRouteFiles();
  assert.ok(files.length > 0, "found at least one route.ts file");

  const violations: string[] = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const bodies = extractGetBodies(file, src);
    for (const { startLine, bodyLines } of bodies) {
      bodyLines.forEach((line, idx) => {
        for (const pat of MUTATION_PATTERNS) {
          if (pat.test(line)) {
            violations.push(
              `${relative(REPO_ROOT, file)}:${startLine + idx}  (GET body)  ${line.trim()}  matches ${pat}`,
            );
          }
        }
      });
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Found destructive operation(s) inside GET handler(s):\n${violations.join("\n")}\n\n` +
      `If intentional, update src/lib/auth/no-destructive-gets.test.ts with an allow-list entry.`,
  );
});
