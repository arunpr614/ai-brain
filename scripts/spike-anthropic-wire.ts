/**
 * S-10 Anthropic wire verification spike.
 *
 * Reads ANTHROPIC_API_KEY from process env. Runs four hypotheses against
 * the live API. Reports PASS/FAIL per hypothesis and total cost.
 *
 * Stop conditions: see docs/plans/spikes/v0.6.0-cloud-migration/S-10-anthropic-wire-verify.md §4.
 */
import { AnthropicProvider } from "../src/lib/llm/anthropic";
import { LLMError } from "../src/lib/llm/errors";
import {
  ENRICHMENT_SYSTEM,
  enrichmentUserPrompt,
  validateEnrichment,
  type EnrichmentOutput,
} from "../src/lib/enrich/prompts";

const HAIKU = "claude-haiku-4-5-20251001";
// Pricing as of 2026-05; sourced from console.anthropic.com.
// Haiku 4.5: $0.25 / MTok input, $1.25 / MTok output.
const PRICE_IN_PER_MTOK = 0.25;
const PRICE_OUT_PER_MTOK = 1.25;

interface CostAccum {
  input: number;
  output: number;
}

const cost: CostAccum = { input: 0, output: 0 };
const results: Array<{ id: string; verdict: "PASS" | "FAIL"; detail: string }> = [];

function record(id: string, verdict: "PASS" | "FAIL", detail: string) {
  results.push({ id, verdict, detail });
  const tag = verdict === "PASS" ? "✓" : "✗";
  console.log(`${tag} ${id}: ${verdict} — ${detail}`);
}

function bumpCost(input_tokens: number, output_tokens: number) {
  cost.input += input_tokens;
  cost.output += output_tokens;
}

function dollars(): string {
  const usd =
    (cost.input / 1_000_000) * PRICE_IN_PER_MTOK +
    (cost.output / 1_000_000) * PRICE_OUT_PER_MTOK;
  return `$${usd.toFixed(6)} (in=${cost.input} tok, out=${cost.output} tok)`;
}

async function h1OneShot(provider: AnthropicProvider): Promise<void> {
  console.log("\n[H-1] one-shot generate");
  const out = await provider.generate({
    prompt: "Reply with exactly the single word: pong",
    num_predict: 16,
    temperature: 0,
  });
  bumpCost(out.metrics.input_tokens, out.metrics.output_tokens);
  const ok =
    /pong/i.test(out.response) &&
    out.metrics.input_tokens > 0 &&
    out.metrics.output_tokens > 0 &&
    out.metrics.wall_ms > 0;
  if (!ok) {
    record(
      "H-1",
      "FAIL",
      `response=${JSON.stringify(out.response)} metrics=${JSON.stringify(out.metrics)}`,
    );
    throw new Error("H-1 failed; aborting");
  }
  record(
    "H-1",
    "PASS",
    `response="${out.response.trim()}", in=${out.metrics.input_tokens}, out=${out.metrics.output_tokens}, wall=${out.metrics.wall_ms}ms`,
  );
}

async function h2Stream(provider: AnthropicProvider): Promise<void> {
  console.log("\n[H-2] generateStream — SSE event ordering");
  const chunks: string[] = [];
  const usageHolder: { value: { input_tokens: number; output_tokens: number; wall_ms: number } | null } = {
    value: null,
  };
  for await (const piece of provider.generateStream({
    prompt: "Reply with exactly: one, two, three.",
    num_predict: 32,
    temperature: 0,
    onDone: (m) => {
      usageHolder.value = m;
    },
  })) {
    chunks.push(piece);
  }
  const joined = chunks.join("");
  const usage = usageHolder.value;
  if (!usage) {
    record("H-2", "FAIL", "onDone never fired");
    throw new Error("H-2 failed; aborting");
  }
  bumpCost(usage.input_tokens, usage.output_tokens);
  const ok =
    chunks.length >= 1 &&
    /one/i.test(joined) &&
    /three/i.test(joined) &&
    usage.input_tokens > 0 &&
    usage.output_tokens > 0;
  if (!ok) {
    record(
      "H-2",
      "FAIL",
      `chunks=${chunks.length}, joined="${joined}", usage=${JSON.stringify(usage)}`,
    );
    throw new Error("H-2 failed; aborting");
  }
  record(
    "H-2",
    "PASS",
    `chunks=${chunks.length}, joined="${joined.trim()}", in=${usage.input_tokens}, out=${usage.output_tokens}`,
  );
}

const SAMPLE_BODY = `
The compound interest effect, often described as the eighth wonder of the world,
manifests most powerfully in skills that require deliberate practice over years.
A musician who practices scales for 30 minutes a day for ten years will not be
ten times better than someone who has practiced for one — they will be
exponentially better, because each year's practice builds on a foundation
that the previous year did not have. The same is true of writing, of code,
of cooking, of relationships. Compound effects are real but invisible
until enough time has passed to make them legible.

The implication for early-career professionals is uncomfortable: the most
valuable thing you can do is identify which skills compound, and then
defend your time around them ferociously. Email triage, status meetings,
and reactive context-switching do not compound; deep work on a single
domain does. Most career advice underweights this distinction because
short-term optics reward visible motion, not invisible accumulation.

A practical heuristic: if you can imagine yourself doing the same activity
for ten years and being substantially better at it than you are today,
that activity compounds. If the activity feels stable in difficulty over
time, it doesn't.
`.trim();

async function h3EnrichmentJson(provider: AnthropicProvider): Promise<void> {
  console.log("\n[H-3] generateJson on real enrichment prompt");
  const userPrompt = enrichmentUserPrompt({
    source_type: "article",
    title: "On compounding skills",
    body: SAMPLE_BODY,
  });
  const out = await provider.generateJson<EnrichmentOutput>({
    system: ENRICHMENT_SYSTEM,
    prompt: userPrompt,
    num_predict: 1200,
    temperature: 0.3,
  });
  bumpCost(out.metrics.input_tokens, out.metrics.output_tokens);
  const validated = validateEnrichment(out.parsed);
  if (out.attempts !== 1) {
    record("H-3", "FAIL", `expected attempts=1, got ${out.attempts} (raw retry happened)`);
    return;
  }
  if (!validated.ok) {
    record(
      "H-3",
      "FAIL",
      `parsed but validation failed: ${validated.problems.join("; ")}`,
    );
    return;
  }
  record(
    "H-3",
    "PASS",
    `attempts=1, summary[${validated.value.summary.length}ch], tags=[${validated.value.tags.join(",")}], category=${validated.value.category}, in=${out.metrics.input_tokens}, out=${out.metrics.output_tokens}`,
  );
}

async function h4Batch(provider: AnthropicProvider): Promise<void> {
  console.log("\n[H-4] submitBatch + pollBatch");
  const submit = await provider.submitBatch([
    {
      custom_id: "ping-A",
      prompt: "Reply with exactly: alpha",
      num_predict: 16,
      temperature: 0,
    },
    {
      custom_id: "ping-B",
      prompt: "Reply with exactly: beta",
      num_predict: 16,
      temperature: 0,
    },
  ]);
  console.log(`  submitted batch_id=${submit.batch_id}`);

  const pollIntervalMs = 5_000;
  const maxPolls = 24; // 2 minutes
  let lastPoll: Awaited<ReturnType<typeof provider.pollBatch>> | null = null;
  for (let i = 0; i < maxPolls; i++) {
    lastPoll = await provider.pollBatch(submit.batch_id);
    console.log(
      `  poll ${i + 1}/${maxPolls}: status=${lastPoll.status}, counts=${JSON.stringify(lastPoll.request_counts)}`,
    );
    if (lastPoll.status === "ended") break;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  if (!lastPoll || lastPoll.status !== "ended") {
    record(
      "H-4",
      "FAIL",
      `did not reach 'ended' within ${(maxPolls * pollIntervalMs) / 1000}s; last status=${lastPoll?.status ?? "n/a"}`,
    );
    return;
  }
  if (!lastPoll.results || lastPoll.results.length !== 2) {
    record(
      "H-4",
      "FAIL",
      `ended but results count = ${lastPoll.results?.length ?? "null"}, expected 2`,
    );
    return;
  }
  const a = lastPoll.results.find((r) => r.custom_id === "ping-A");
  const b = lastPoll.results.find((r) => r.custom_id === "ping-B");
  if (!a || a.type !== "succeeded" || !b || b.type !== "succeeded") {
    record(
      "H-4",
      "FAIL",
      `expected both succeeded; got A=${a?.type}, B=${b?.type}`,
    );
    return;
  }
  bumpCost(a.metrics.input_tokens + b.metrics.input_tokens, a.metrics.output_tokens + b.metrics.output_tokens);
  record(
    "H-4",
    "PASS",
    `A="${a.response.trim()}" (in=${a.metrics.input_tokens}, out=${a.metrics.output_tokens}), B="${b.response.trim()}" (in=${b.metrics.input_tokens}, out=${b.metrics.output_tokens})`,
  );
}

async function h5HeadersAreSufficient(): Promise<void> {
  console.log("\n[H-5] auth headers — implicit (covered by H-1..H-4 success)");
  // Negative check: a request without x-api-key should 401. This costs $0
  // because Anthropic rejects pre-billing.
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: HAIKU,
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    }),
  });
  if (res.status === 401) {
    record("H-5", "PASS", "missing x-api-key → 401, as expected");
  } else {
    record("H-5", "FAIL", `expected 401, got ${res.status}`);
  }
}

async function main(): Promise<number> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    return 2;
  }
  const provider = new AnthropicProvider({});
  const t0 = Date.now();
  try {
    await h1OneShot(provider);
    await h2Stream(provider);
    await h3EnrichmentJson(provider);
    await h4Batch(provider);
    await h5HeadersAreSufficient();
  } catch (err) {
    if (err instanceof LLMError) {
      console.error(`\n[ABORT] LLMError ${err.code}: ${err.message}`);
    } else {
      console.error(`\n[ABORT] ${(err as Error).message}`);
    }
  }
  const wall_s = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n=== Summary (wall ${wall_s}s, cost ${dollars()}) ===`);
  for (const r of results) {
    console.log(`  ${r.verdict === "PASS" ? "✓" : "✗"} ${r.id}: ${r.verdict}`);
  }
  const failed = results.filter((r) => r.verdict === "FAIL");
  if (failed.length > 0) {
    console.log(`\n${failed.length} hypothesis FAIL — see findings detail above.`);
    return 1;
  }
  console.log("\nAll hypotheses PASS.");
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(2);
  },
);
