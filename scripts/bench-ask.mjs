#!/usr/bin/env node
/**
 * T-18 — Ask end-to-end latency bench (SC-7).
 *
 * Measures first-token + full-answer latency for 10 representative questions
 * against the live Ollama daemon + real nomic-embed-text + real qwen2.5
 * (or whatever OLLAMA_DEFAULT_MODEL is set to).
 *
 * Thresholds (per plan §7 / SC-7):
 *   p95 first-token  < 2 000 ms  (warm model only — cold first request may
 *                                 take up to 8 s due to Ollama model load)
 *   p95 full-answer  < 8 000 ms  on a 10k-chunk library, 3-paragraph reply
 *
 * Protocol (per plan patch P-2):
 *   1. Preflight: isOllamaAlive() + embed probe (exits 2/3 if daemon / model
 *      missing, same shape as T-16 backfill).
 *   2. Discard the first run (cold model-load). Report warm-only stats.
 *
 * Usage:
 *   node --import tsx scripts/bench-ask.mjs
 *   node --import tsx scripts/bench-ask.mjs --db data/brain.sqlite
 *
 * Outputs:
 *   tmp/bench-ask-results.json   — raw machine-readable results
 *   stdout                        — human summary
 *
 * NOT run in CI. Manual verification only. Requires the user's real
 * library already backfilled (T-16). Docs/research/ask-latency.md is
 * updated manually by the operator from the JSON output.
 */

import { mkdirSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const TMP_DIR = resolve(REPO_ROOT, "tmp");

const args = parseArgs(process.argv.slice(2));

const QUESTIONS = [
  "What are the key levers for user activation?",
  "How do growth loops differ from funnels?",
  "Summarise the main ideas about pricing.",
  "What frameworks have I saved for product strategy?",
  "What does the library say about retention?",
  "Which notes discuss hiring principles?",
  "What are common failure modes for early-stage startups?",
  "Give me a summary of what I've captured about AI evals.",
  "What is the difference between north-star and proxy metrics?",
  "How should I think about pricing experimentation?",
];

function parseArgs(argv) {
  const out = { dbPath: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--db") out.dbPath = argv[++i];
    else if (a === "-h" || a === "--help") {
      console.log("Usage: bench-ask.mjs [--db path/to/brain.sqlite]");
      process.exit(0);
    }
  }
  return out;
}

async function preflight() {
  const { isOllamaAlive } = await import("../src/lib/llm/ollama.ts");
  const { embed, EmbedError } = await import("../src/lib/embed/client.ts");
  if (!(await isOllamaAlive())) {
    console.error(
      "[bench] Ollama not reachable at http://localhost:11434. Start it with: ollama serve",
    );
    process.exit(2);
  }
  try {
    await embed(["probe"]);
  } catch (err) {
    if (err instanceof EmbedError && err.code === "EMBED_MODEL_NOT_INSTALLED") {
      console.error(
        `[bench] Embedding model missing. Run: ${err.pullCommand ?? "ollama pull nomic-embed-text"}`,
      );
      process.exit(3);
    }
    console.error("[bench] preflight embed probe failed:", err instanceof Error ? err.message : String(err));
    process.exit(4);
  }
}

function percentile(samples, p) {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

async function runOne(question) {
  const { retrieve } = await import("../src/lib/retrieve/index.ts");
  const { ollamaGenerator } = await import("../src/lib/ask/generator.ts");

  const retrieveStart = Date.now();
  const chunks = await retrieve(question, { topK: 8 });
  const retrieveMs = Date.now() - retrieveStart;

  const gen = ollamaGenerator({ skipUsageRecord: true });
  const genStart = Date.now();
  let firstTokenMs = null;
  let tokenCount = 0;
  let answer = "";
  for await (const delta of gen({ question, chunks })) {
    if (firstTokenMs === null) firstTokenMs = Date.now() - genStart;
    tokenCount++;
    answer += delta;
  }
  const fullAnswerMs = Date.now() - genStart;
  return {
    question,
    retrieve_ms: retrieveMs,
    retrieve_chunks: chunks.length,
    first_token_ms: firstTokenMs,
    full_answer_ms: fullAnswerMs,
    token_count: tokenCount,
    answer_chars: answer.length,
  };
}

async function main() {
  if (args.dbPath) process.env.BRAIN_DB_PATH = args.dbPath;
  await preflight();

  const results = { env: {}, cold: null, warm: [], summary: null };

  // Env snapshot
  const os = await import("node:os");
  results.env = {
    node: process.version,
    cpu: os.cpus()[0].model,
    cores: os.cpus().length,
    totalMemGb: +(os.totalmem() / 1024 ** 3).toFixed(1),
    ollama_host: process.env.OLLAMA_HOST ?? "http://localhost:11434",
    generate_model: process.env.OLLAMA_DEFAULT_MODEL ?? "qwen2.5:7b-instruct-q4_K_M",
    embed_model: process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text",
    db_path: process.env.BRAIN_DB_PATH ?? resolve(REPO_ROOT, "data/brain.sqlite"),
  };

  console.log(`[bench] ${QUESTIONS.length} questions + 1 cold discard`);
  console.log(`[bench] generate_model=${results.env.generate_model}  embed=${results.env.embed_model}`);

  // Cold run — discarded per P-2.
  console.log("\n[bench] cold run (discarded) ...");
  const cold = await runOne(QUESTIONS[0]);
  results.cold = cold;
  console.log(
    `  cold first_token=${cold.first_token_ms}ms  full=${cold.full_answer_ms}ms  retrieve=${cold.retrieve_ms}ms  chunks=${cold.retrieve_chunks}`,
  );

  // Warm runs
  console.log("\n[bench] warm runs:");
  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    const r = await runOne(q);
    results.warm.push(r);
    console.log(
      `  [${i + 1}/${QUESTIONS.length}] first=${r.first_token_ms}ms full=${r.full_answer_ms}ms ret=${r.retrieve_ms}ms chunks=${r.retrieve_chunks}  "${q.slice(0, 48)}…"`,
    );
  }

  const firsts = results.warm.map((r) => r.first_token_ms).filter((v) => v != null);
  const fulls = results.warm.map((r) => r.full_answer_ms);
  const retrieves = results.warm.map((r) => r.retrieve_ms);
  results.summary = {
    first_token: {
      p50: percentile(firsts, 0.5),
      p95: percentile(firsts, 0.95),
      max: Math.max(...firsts),
    },
    full_answer: {
      p50: percentile(fulls, 0.5),
      p95: percentile(fulls, 0.95),
      max: Math.max(...fulls),
    },
    retrieve: {
      p50: percentile(retrieves, 0.5),
      p95: percentile(retrieves, 0.95),
    },
    thresholds: {
      first_token_p95_ms: 2000,
      full_answer_p95_ms: 8000,
    },
    pass: {
      first_token_p95:
        percentile(firsts, 0.95) < 2000 ? "PASS" : "FAIL",
      full_answer_p95:
        percentile(fulls, 0.95) < 8000 ? "PASS" : "FAIL",
    },
  };

  mkdirSync(TMP_DIR, { recursive: true });
  const outPath = resolve(TMP_DIR, "bench-ask-results.json");
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nresults → ${outPath}`);

  console.log("\n=== SC-7 summary (warm-model only) ===");
  console.log(
    `  first-token  p50=${results.summary.first_token.p50}ms  p95=${results.summary.first_token.p95}ms  (threshold 2000)  → ${results.summary.pass.first_token_p95}`,
  );
  console.log(
    `  full-answer  p50=${results.summary.full_answer.p50}ms  p95=${results.summary.full_answer.p95}ms  (threshold 8000)  → ${results.summary.pass.full_answer_p95}`,
  );
  console.log(
    `  retrieve     p50=${results.summary.retrieve.p50}ms  p95=${results.summary.retrieve.p95}ms`,
  );
  console.log(`  cold first-token: ${results.cold.first_token_ms}ms (informational)`);

  const fail =
    results.summary.pass.first_token_p95 === "FAIL" ||
    results.summary.pass.full_answer_p95 === "FAIL";
  if (fail) {
    console.error("\n[bench] SC-7 NOT MET");
    process.exit(5);
  }
  console.log("\n[bench] SC-7 met");
}

await main();
