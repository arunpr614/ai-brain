/**
 * Enrichment prompt — LOCKED in R-LLM-b (docs/research/llm-b-qwen3.md §7).
 *
 * One call produces: summary, 5 verbatim quotes, category, cleaned title, 3-8 tags.
 * Output is strict JSON; client parses via generateJson which retries once
 * at lower temperature on parse failure.
 */

export const CATEGORIES = [
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

export type Category = (typeof CATEGORIES)[number];

export interface EnrichmentOutput {
  summary: string;
  quotes: string[];
  category: Category;
  title: string;
  tags: string[];
}

export const ENRICHMENT_SYSTEM = [
  "You are the enrichment engine for AI Brain, a local-first personal knowledge app.",
  "For each item you receive, produce structured metadata strictly as JSON.",
  "Do not include any prose outside the JSON. Do not wrap the JSON in code fences.",
  "The JSON must parse on first try.",
].join(" ");

const MAX_BODY_CHARS = 12000;

/**
 * Build the user-turn prompt. Trims very long bodies so the prompt fits
 * comfortably in num_ctx=8192 alongside the system prompt + output budget.
 */
export function enrichmentUserPrompt(input: {
  source_type: string;
  title: string;
  body: string;
}): string {
  const clipped =
    input.body.length > MAX_BODY_CHARS
      ? input.body.slice(0, MAX_BODY_CHARS) + "\n\n[…truncated for model context…]"
      : input.body;

  return `Source type: ${input.source_type}
Original title: ${input.title}

Article body:
"""
${clipped}
"""

Return a JSON object with exactly these keys:
- "summary": a 3-paragraph summary of the article, ~300 words total
- "quotes": array of exactly 5 key quotes pulled verbatim from the article, each under 200 chars
- "category": exactly one of ${JSON.stringify(CATEGORIES)}
- "title": a cleaned-up semantic title (may equal the original if already good; rewrite if it is a filename, URL slug, or unclear). Do not collapse spaces into hyphens; preserve natural capitalization.
- "tags": array of 3 to 8 lowercase tags, no spaces, use hyphens

Rules:
- No text outside the JSON.
- No Markdown, no code fences.
- If the article is too short or empty, set all fields to safe defaults and still return valid JSON.`;
}

/**
 * Structural validator — returns the list of problems found, empty array
 * if valid. Does not throw. Caller decides whether to retry / accept.
 */
export function validateEnrichment(
  value: unknown,
): { ok: true; value: EnrichmentOutput } | { ok: false; problems: string[] } {
  const problems: string[] = [];
  if (!value || typeof value !== "object") {
    return { ok: false, problems: ["not an object"] };
  }
  const v = value as Record<string, unknown>;

  if (typeof v.summary !== "string" || v.summary.length < 50) {
    problems.push("summary missing or too short");
  }
  if (!Array.isArray(v.quotes) || v.quotes.length === 0 || !v.quotes.every((q) => typeof q === "string")) {
    problems.push("quotes must be an array of strings");
  }
  if (typeof v.category !== "string" || !(CATEGORIES as readonly string[]).includes(v.category)) {
    problems.push(`category invalid: ${String(v.category)}`);
  }
  if (typeof v.title !== "string" || v.title.length === 0 || v.title.length > 200) {
    problems.push("title missing or out of range");
  }
  if (
    !Array.isArray(v.tags) ||
    v.tags.length < 1 ||
    v.tags.length > 12 ||
    !v.tags.every((t) => typeof t === "string")
  ) {
    problems.push("tags must be an array of 1-12 strings");
  }
  if (problems.length > 0) return { ok: false, problems };

  return {
    ok: true,
    value: {
      summary: v.summary as string,
      quotes: (v.quotes as unknown[])
        .filter((q): q is string => typeof q === "string")
        .slice(0, 5),
      category: v.category as Category,
      title: (v.title as string).trim(),
      tags: (v.tags as unknown[])
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.toLowerCase().replace(/\s+/g, "-"))
        .filter((t) => t.length > 0)
        .slice(0, 8),
    },
  };
}
