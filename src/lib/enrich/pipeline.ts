/**
 * Enrichment pipeline — F-203.
 *
 * Given an item id, runs the locked prompt (prompts.ts) through the Ollama
 * client, parses + validates the JSON, writes summary/category/title +
 * auto-tag rows, records LLM usage, and marks the item as enriched.
 *
 * Pure function over (item_id) — the queue worker wraps state transitions.
 */
import { getDb, type ItemRow } from "@/db/client";
import { attachTagToItem, clearAutoTagsForItem, upsertTag } from "@/db/tags";
import { getEnrichProvider } from "@/lib/llm/factory";
import { LLMError } from "@/lib/llm/errors";
import {
  enrichmentUserPrompt,
  ENRICHMENT_SYSTEM,
  validateEnrichment,
  type EnrichmentOutput,
} from "./prompts";

export type EnrichmentResult =
  | { ok: true; item_id: string; output: EnrichmentOutput; wall_ms: number; attempts: number }
  | { ok: false; item_id: string; error: string; raw?: string };

function loadItem(id: string): ItemRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM items WHERE id = ?")
      .get(id) as ItemRow | undefined) ?? null
  );
}

/**
 * Compose the "Original title" the enrichment LLM sees. For YouTube items,
 * inject channel + duration so the LLM has the high-value context even
 * when the 12,000-char body slice misses most of a long transcript.
 *
 * Not written back to items.title — the stored title column stays clean
 * so the library UI can render title + author separately. This is a
 * read-time concatenation used only for the enrichment prompt input.
 */
export function composeEnrichmentTitle(item: {
  source_type: ItemRow["source_type"];
  title: string;
  author: string | null;
  duration_seconds: number | null;
}): string {
  if (item.source_type !== "youtube") return item.title;
  const parts = [item.title];
  if (item.author) parts.push(`— ${item.author}`);
  if (item.duration_seconds && item.duration_seconds > 0) {
    parts.push(`(${formatDurationForTitle(item.duration_seconds)})`);
  }
  return parts.join(" ");
}

function formatDurationForTitle(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ""}`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

function billingMonth(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * B-301 (v0.3.1): de-hyphenate filename-slug titles without touching
 * legitimate compound-adjective titles.
 *
 * Fires ONLY when the title has zero spaces AND at least two hyphens.
 * Rationale (per self-critique P-1): the earlier "hyphens > spaces"
 * heuristic misfires on inputs like "State-of-the-Art 2026" (3 hyphens,
 * 1 space). The tightened rule preserves every compound-adjective title
 * because they always contain a space somewhere.
 *
 * When the rule fires: replace hyphens with spaces, then title-case each
 * word except small connector words, which lowercase unless they're the
 * first word.
 *
 * Exported for F-051 unit tests (src/lib/enrich/pipeline.test.ts).
 */
const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "or",
  "the",
  "of",
  "in",
  "on",
  "for",
  "to",
  "with",
  "at",
  "by",
  "but",
  "vs",
]);

export function postProcessTitle(raw: string): string {
  const title = raw.trim();
  if (title.length === 0) return raw;
  const hyphens = (title.match(/-/g) || []).length;
  const hasSpace = /\s/.test(title);
  if (hasSpace || hyphens < 2) return raw;

  const words = title.split("-").filter((w) => w.length > 0);
  return words
    .map((word, i) => {
      // Preserve mixed-case tokens that look like acronyms/brand casing
      // ("PMs", "iPhone", "NYTimes") — signalled by ≥1 uppercase AND ≥1
      // lowercase letter. All-caps screamers like "HYPHENATED" don't
      // qualify and still get normalised.
      const upperCount = (word.match(/[A-Z]/g) || []).length;
      const lowerCount = (word.match(/[a-z]/g) || []).length;
      if (upperCount >= 1 && lowerCount >= 1 && upperCount >= 2) return word;

      const lower = word.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function recordLlmUsage(args: {
  provider: "ollama";
  model: string;
  purpose: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}): void {
  getDb()
    .prepare(
      `INSERT INTO llm_usage (provider, model, purpose, input_tokens, output_tokens, cost_usd, billing_month)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      args.provider,
      args.model,
      args.purpose,
      args.input_tokens,
      args.output_tokens,
      args.cost_usd,
      billingMonth(),
    );
}

export async function enrichItem(item_id: string): Promise<EnrichmentResult> {
  const item = loadItem(item_id);
  if (!item) {
    return { ok: false, item_id, error: "item not found" };
  }

  // Guard: very short bodies can't produce a meaningful summary. Fail fast
  // so the worker doesn't burn GPU on notes like "todo: call dentist".
  if (item.body.trim().length < 200) {
    const db = getDb();
    db.prepare(
      "UPDATE items SET enrichment_state = 'done', enriched_at = unixepoch() * 1000 WHERE id = ?",
    ).run(item_id);
    return {
      ok: true,
      item_id,
      output: {
        summary: item.body.trim(),
        quotes: [],
        category: "General",
        title: item.title,
        tags: [],
      },
      wall_ms: 0,
      attempts: 0,
    };
  }

  const t0 = Date.now();
  const provider = getEnrichProvider();
  let result: Awaited<ReturnType<typeof provider.generateJson<unknown>>>;
  try {
    result = await provider.generateJson<unknown>({
      system: ENRICHMENT_SYSTEM,
      prompt: enrichmentUserPrompt({
        source_type: item.source_type,
        title: composeEnrichmentTitle(item),
        body: item.body,
      }),
      num_ctx: 8192,
      num_predict: 1200,
      temperature: 0.3,
    });
  } catch (err) {
    const e = err as LLMError;
    const raw =
      typeof (e as unknown as { cause?: { raw?: string } }).cause?.raw === "string"
        ? (e as unknown as { cause: { raw: string } }).cause.raw
        : undefined;
    return { ok: false, item_id, error: `${e.code}: ${e.message}`, raw };
  }

  const validated = validateEnrichment(result.parsed);
  if (!validated.ok) {
    return {
      ok: false,
      item_id,
      error: `validation failed: ${validated.problems.join("; ")}`,
      raw: result.raw,
    };
  }
  const output = validated.value;

  // Write everything in a single transaction so a crash mid-update doesn't
  // leave a half-enriched item.
  const db = getDb();
  const cleanedTitle = postProcessTitle(output.title);
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE items
       SET summary = ?,
           quotes = ?,
           category = ?,
           title = ?,
           enrichment_state = 'done',
           enriched_at = unixepoch() * 1000
       WHERE id = ?`,
    ).run(
      output.summary,
      JSON.stringify(output.quotes),
      output.category,
      cleanedTitle,
      item_id,
    );

    // Auto-tags: clear any previous auto-tags on this item, then attach.
    clearAutoTagsForItem(item_id);
    for (const name of output.tags) {
      const row = upsertTag(name, "auto");
      attachTagToItem(item_id, row.id);
    }
  });
  tx();

  recordLlmUsage({
    provider: "ollama",
    model: result.metrics ? "qwen2.5:7b-instruct-q4_K_M" : "unknown",
    purpose: "enrichment",
    input_tokens: result.metrics.input_tokens,
    output_tokens: result.metrics.output_tokens,
    cost_usd: 0, // local inference
  });

  return {
    ok: true,
    item_id,
    output,
    wall_ms: Date.now() - t0,
    attempts: result.attempts,
  };
}

/**
 * Expose the summary + quotes via a secondary read path — the item `summary`
 * column is the 3-paragraph form; quotes need separate storage only once we
 * care about rendering them on the dual-pane view. v0.3.0 regenerates the
 * quotes on demand from the stored summary + body via a tiny extraction, or
 * we can persist them to a new column. Decided: persist on the items row to
 * avoid re-calling the LLM for viewing. Adds a column in migration 004.
 */
