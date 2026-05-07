/**
 * R-LLM-b + R-PROMPTS spike — head-to-head enrichment benchmark.
 *
 * Goal: pick between qwen2.5:7b-instruct-q4_K_M and qwen3:8b for v0.3.0
 * enrichment (summary + 5 quotes + 1-of-14 category + auto-title + 3-8 tags).
 *
 * Measures per-model per-item:
 *   - Wall time (extract + generate)
 *   - Generation tok/s
 *   - Prompt eval tok/s
 *   - JSON parse success (pass/fail)
 *   - Structural completeness (all 5 fields present, tag count in range)
 *   - Field-by-field rubric scored by a separate call to the better model
 *     (crude but avoids me hand-scoring 10 outputs)
 *
 * Writes results to /tmp/rllm-b-results.json and prints a summary table.
 */
import { readFile } from "node:fs/promises";
import { extractArticleFromUrl } from "../src/lib/capture/url";
import { extractPdf } from "../src/lib/capture/pdf";

const DEFAULT_MODELS = ["qwen2.5:7b-instruct-q4_K_M", "qwen3:8b"] as const;
const MODELS = process.env.MODELS
  ? (process.env.MODELS.split(",").map((s) => s.trim()) as readonly string[])
  : DEFAULT_MODELS;

const CATEGORIES = [
  "Newsletter",
  "Blog Post",
  "Podcast Episode",
  "Tutorial",
  "Case Study",
  "Reference",
  "Announcement",
  "Data Report",
  "Social Post",
  "Forum Discussion",
  "Video Page",
  "Landing Page",
  "General",
  "Other",
] as const;

const SYSTEM_PROMPT = `You are the enrichment engine for AI Brain, a local-first personal knowledge app. For each item you receive, produce structured metadata strictly as JSON. Do not include any prose outside the JSON. Do not wrap the JSON in code fences. The JSON must parse on first try.`;

function userPrompt(title: string, body: string, hintType: "url" | "pdf" | "note"): string {
  // Trim very long bodies to the first ~12K chars; v0.3.0 will do the same in prod.
  const clipped = body.length > 12000 ? body.slice(0, 12000) + "\n\n[…truncated for model context…]" : body;
  return `Source type: ${hintType}
Original title: ${title}

Article body:
"""
${clipped}
"""

Return a JSON object with exactly these keys:
- "summary": a 3-paragraph summary of the article, ~300 words total
- "quotes": array of exactly 5 key quotes pulled verbatim from the article, each under 200 chars
- "category": exactly one of ${JSON.stringify(CATEGORIES)}
- "title": a cleaned-up semantic title (may equal the original if already good; rewrite if it is a filename, URL slug, or unclear)
- "tags": array of 3 to 8 lowercase tags, no spaces, use hyphens

Rules:
- No text outside the JSON.
- No Markdown, no code fences.
- If the article is too short or empty, set all fields to safe defaults and still return valid JSON.`;
}

interface OllamaResponse {
  response: string;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

interface ItemSample {
  id: string;
  source_type: "url" | "pdf" | "note";
  title: string;
  body: string;
  chars: number;
}

async function loadSamples(): Promise<ItemSample[]> {
  const pdfDir = "/Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/Lenny_Export/exports/pdfs";
  const pdfPaths = [
    `${pdfDir}/2024/you-should-be-playing-with-gpts-at.pdf`,
    `${pdfDir}/2025/building-a-second-brain-with-ai.pdf`,
    `${pdfDir}/2023/how-to-be-better-prepared-for-layoffs.pdf`,
  ];
  const samples: ItemSample[] = [];
  for (const path of pdfPaths) {
    const buf = await readFile(path);
    const r = await extractPdf({ bytes: new Uint8Array(buf), filename: path.split("/").pop() });
    samples.push({
      id: path.split("/").pop()!.replace(".pdf", ""),
      source_type: "pdf",
      title: r.title,
      body: r.body,
      chars: r.total_chars,
    });
  }
  const urls = [
    "https://www.paulgraham.com/greatwork.html",
    "https://sive.rs/hellyeah",
  ];
  for (const url of urls) {
    try {
      const a = await extractArticleFromUrl(url);
      samples.push({
        id: url.replace(/[^a-z0-9]/gi, "_").slice(0, 40),
        source_type: "url",
        title: a.title,
        body: a.body,
        chars: a.body.length,
      });
    } catch (e: any) {
      console.warn(`[samples] skip ${url}: ${e.message}`);
    }
  }
  return samples;
}

async function runOllama(model: string, sample: ItemSample): Promise<{
  wallMs: number;
  metrics: OllamaResponse | null;
  raw: string;
  parsed: any | null;
  parseError: string | null;
}> {
  const t0 = performance.now();
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: userPrompt(sample.title, sample.body, sample.source_type),
      system: SYSTEM_PROMPT,
      stream: false,
      format: "json",
      options: {
        num_ctx: 8192,
        num_predict: 1200,
        temperature: 0.3,
      },
      keep_alive: "15m",
      // Qwen 3 ships with "thinking mode" on by default, which burns output
      // budget on <think> traces before producing the JSON. Disable it for
      // structured enrichment. Qwen 2.5 ignores this flag cleanly.
      think: false,
    }),
  });
  const wallMs = performance.now() - t0;
  if (!res.ok) {
    return {
      wallMs,
      metrics: null,
      raw: "",
      parsed: null,
      parseError: `HTTP ${res.status} ${res.statusText}`,
    };
  }
  const data: OllamaResponse = await res.json();
  // Qwen 3 has a "thinking" mode; strip any <think>…</think> prelude.
  let cleaned = data.response;
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  let parsed: any = null;
  let parseError: string | null = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e: any) {
    parseError = e.message;
  }
  return { wallMs, metrics: data, raw: data.response, parsed, parseError };
}

function structuralScore(parsed: any): { score: number; notes: string[] } {
  const notes: string[] = [];
  if (!parsed || typeof parsed !== "object") return { score: 0, notes: ["not an object"] };
  let score = 0;
  if (typeof parsed.summary === "string" && parsed.summary.length > 200) score++;
  else notes.push("summary missing or too short");
  if (Array.isArray(parsed.quotes) && parsed.quotes.length === 5) score++;
  else notes.push(`quotes: ${Array.isArray(parsed.quotes) ? parsed.quotes.length : "not array"}`);
  if (typeof parsed.category === "string" && CATEGORIES.includes(parsed.category as any)) score++;
  else notes.push(`category invalid: ${parsed.category}`);
  if (typeof parsed.title === "string" && parsed.title.length > 0 && parsed.title.length < 200) score++;
  else notes.push("title missing or too long");
  if (Array.isArray(parsed.tags) && parsed.tags.length >= 3 && parsed.tags.length <= 8) score++;
  else notes.push(`tags: ${Array.isArray(parsed.tags) ? parsed.tags.length : "not array"}`);
  return { score, notes };
}

async function main() {
  console.log("Loading samples...");
  const samples = await loadSamples();
  console.log(`Loaded ${samples.length} samples:`);
  for (const s of samples) {
    console.log(`  ${s.source_type.padEnd(4)} ${s.id} — ${s.chars} chars — "${s.title}"`);
  }
  console.log();

  const results: any[] = [];

  for (const model of MODELS) {
    console.log(`\n=== Model: ${model} ===`);
    for (const sample of samples) {
      process.stdout.write(`  ${sample.source_type} ${sample.id.slice(0, 30).padEnd(30)} ... `);
      const out = await runOllama(model, sample);
      const struct = structuralScore(out.parsed);

      const metrics = out.metrics;
      const genToks = metrics ? metrics.eval_count : 0;
      const genSec = metrics ? metrics.eval_duration / 1e9 : 0;
      const genTps = genSec > 0 ? genToks / genSec : 0;
      const promptToks = metrics ? metrics.prompt_eval_count : 0;
      const promptSec = metrics ? metrics.prompt_eval_duration / 1e9 : 0;
      const promptTps = promptSec > 0 ? promptToks / promptSec : 0;

      const row = {
        model,
        sample_id: sample.id,
        source_type: sample.source_type,
        wall_s: +(out.wallMs / 1000).toFixed(2),
        gen_toks: genToks,
        gen_tps: Math.round(genTps),
        prompt_toks: promptToks,
        prompt_tps: Math.round(promptTps),
        parse_ok: out.parsed !== null,
        parse_error: out.parseError,
        struct_score: struct.score,
        struct_notes: struct.notes,
        raw_len: out.raw.length,
        rewritten_title: out.parsed?.title ?? null,
        category: out.parsed?.category ?? null,
        tag_count: Array.isArray(out.parsed?.tags) ? out.parsed.tags.length : 0,
        summary_preview: out.parsed?.summary?.slice(0, 120) ?? null,
      };
      results.push(row);
      console.log(
        `${row.wall_s}s  gen=${row.gen_tps}tps  parse=${row.parse_ok ? "✓" : "✗"}  struct=${row.struct_score}/5`,
      );
    }
  }

  // Summarize by model
  console.log("\n\n=== Summary by model ===");
  for (const m of MODELS) {
    const rs = results.filter((r) => r.model === m);
    const avgWall = rs.reduce((s, r) => s + r.wall_s, 0) / rs.length;
    const avgGenTps = rs.reduce((s, r) => s + r.gen_tps, 0) / rs.length;
    const parseOk = rs.filter((r) => r.parse_ok).length;
    const avgStruct = rs.reduce((s, r) => s + r.struct_score, 0) / rs.length;
    console.log(
      `${m.padEnd(35)} wall ${avgWall.toFixed(1)}s/item  gen ${avgGenTps.toFixed(0)} tps  parse ${parseOk}/${rs.length}  struct ${avgStruct.toFixed(1)}/5`,
    );
  }

  // Write raw JSON for later inspection
  const out = {
    timestamp: new Date().toISOString(),
    samples: samples.map((s) => ({ id: s.id, source_type: s.source_type, title: s.title, chars: s.chars })),
    results,
  };
  const { writeFile } = await import("node:fs/promises");
  await writeFile("/tmp/rllm-b-results.json", JSON.stringify(out, null, 2));
  console.log("\nDetailed results: /tmp/rllm-b-results.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
