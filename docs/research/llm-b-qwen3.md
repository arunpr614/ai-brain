# R-LLM-b: Qwen 3 8B vs Qwen 2.5 7B — Enrichment Head-to-Head

**Research ID:** R-LLM-b | **Status:** complete | **Date:** 2026-05-07 | **Author:** AI agent

**Hardware:** MacBook Pro 16" 2021 · Apple M1 Pro · 32 GB · macOS 26.4.1

**Scope:** Pick the default model for v0.3.0 enrichment (summary + 5 quotes + 14-category classifier + auto-title + 3-8 tags as JSON). Validate the unified prompt design before wiring it into production.

---

## 1. TL;DR

**Keep `qwen2.5:7b-instruct-q4_K_M` as v0.3.0 primary.** It's 9% faster than Qwen 3 8B on identical workload, uses less disk + RAM, and matches on structural reliability. Qwen 3 has better title + tag quality but the speed delta matters more on a workload that runs on every capture.

**Adopt Qwen 3 8B as a quality upgrade path for v0.6.0 GenPage** where latency budget is 2 min instead of 30 s. Pull it now (already on disk), use it when quality > speed.

**Critical implementation gotcha:** Qwen 3 requests MUST include `"think": false` in the Ollama payload. Qwen 3's default thinking mode burns output tokens on `<think>…</think>` traces, which (a) slows inference, (b) exhausts `num_predict` budget before producing the actual JSON, producing mid-object syntax errors that look like model failures but are actually client misconfiguration.

---

## 2. Benchmark methodology

Same 5 items fed to both models:

| # | id | source | chars | why chosen |
|---|---|---|---|---|
| 1 | `you-should-be-playing-with-gpts-at` | Lenny PDF | 16,593 | long article, existing paywall-style doc |
| 2 | `building-a-second-brain-with-ai` | Lenny PDF | 5,404 | interview transcript, easy layout |
| 3 | `how-to-be-better-prepared-for-layoffs` | Lenny PDF | 10,876 | mid-length listicle |
| 4 | `paulgraham.com/greatwork` | URL via Readability | 66,529 | very long essay (trimmed to 12K in prompt) |
| 5 | `sive.rs/hellyeah` | URL via Readability | 637 | very short — tests edge behavior |

Prompt: unified JSON output with keys `summary, quotes, category, title, tags`. Body clipped to 12K chars before prompting. `num_ctx: 8192`, `num_predict: 1200`, `temperature: 0.3`, `format: "json"`, `keep_alive: "15m"`.

Two passes on Qwen 3: initial pass with default settings (2/5 failed with mid-JSON syntax errors); second pass with `think: false` (5/5 passed).

---

## 3. Results matrix

| Metric | Qwen 2.5 7B (q4_K_M) | Qwen 3 8B (default quant) | Delta |
|---|---|---|---|
| Wall time — avg | **26.7 s/item** | 29.0 s/item | 2.5 faster by 9% |
| Wall time — min | 14.9 s (short article) | 19.6 s | 2.5 faster |
| Wall time — max | 36.9 s (long PDF) | 34.3 s | **3 faster** |
| Gen tok/s — avg | **23 tps** | 18 tps | 2.5 faster by 28% |
| Prompt eval tok/s — avg | ~16,000 tps | ~15,000 tps | tie |
| JSON parse success | 5/5 ✓ | 5/5 ✓ *(with `think:false`)* | tie |
| Structural completeness | 5.0/5 | 5.0/5 | tie |
| Disk size | 4.7 GB | 5.2 GB | 2.5 smaller |
| RAM under load | ~6 GB | ~7 GB | 2.5 smaller |

---

## 4. Qualitative comparison

Both models produced valid JSON with the right keys every time. Differences showed up in copywriting:

| Sample | Qwen 2.5 title | Qwen 3 title | Verdict |
|---|---|---|---|
| GPTs at work | `You-Should-Be-Playing-With-Gpts-At-Work` | `You Should Be Playing With GPTs At Work` | **Qwen 3** (2.5 over-hyphenates) |
| Second brain | `Building a Second Brain with AI` | `Building a Second Brain with AI` | tie |
| Layoffs | `How to be prepared for layoffs` | `How to Be Better Prepared for Layoffs` | **Qwen 3** (closer to original) |
| Paul Graham | `How-to-Do-Great-Work` | `How to Do Great Work` | **Qwen 3** (no slug) |
| Sivers | `No-Yes Rule: Say No for More Yes!` | `Say No to Everything Except 'HELL YEAH!'` | **Qwen 3** (preserves voice) |

**Tag counts** (target range 3-8):
- Qwen 2.5: 3-5 tags, skews low
- Qwen 3: 7-8 tags, skews high, richer coverage

**Categories:** both picked from the approved 14-item taxonomy every time. Qwen 2.5 mis-classified the "building a second brain" PDF as `Podcast Episode` (it's a written interview). Qwen 3 did the same — not a differentiator.

---

## 5. Why the speed difference

Qwen 3 8B has ~14% more parameters than Qwen 2.5 7B (8.2B vs 7.6B). On M1 Pro's bandwidth-limited inference the generation throughput scales roughly linearly with parameter count, predicting ~20 tok/s for Qwen 3 — measured at 18 tok/s. Matches theory.

Qwen 3's hybrid thinking feature is the other factor: even with `think: false`, the model's training biases toward longer, more thorough outputs. Average output tokens per item: Qwen 2.5 = 395, Qwen 3 = 520. More tokens × slower tok/s = longer walls.

---

## 6. The thinking-mode gotcha, documented

When the first Qwen 3 pass shipped with default settings, two of five items failed JSON parsing with errors like:

```
Expected ',' or '}' after property value in JSON at position 2935
```

Raw length of the failed responses was ~3500 chars — suspicious because `num_predict: 1200` tokens × ~4 chars/token ≈ 4800 chars max, so responses were being cut off mid-JSON.

Root cause: Qwen 3 emits a `<think>…</think>` block before the actual answer by default. With `format: "json"` Ollama strips only the model's raw output; it does NOT know about the thinking convention, so the thinking text counted against `num_predict`. The model reached the limit mid-structure.

Fix: pass `"think": false` at the top level of the Ollama generate payload. Measured: same samples went from 2/5 failures to 5/5 successes, output length dropped from ~3500 chars to ~1900 chars.

**Implementation requirement for v0.3.0:** every Ollama call that targets a Qwen-3-family model must pass `think: false`. Add this to the LLM client wrapper (`src/lib/llm/ollama.ts`) as a per-model policy, not per-call. Qwen 2.5 ignores the flag cleanly, so setting it unconditionally is safe.

---

## 7. v0.3.0 prompt design (locked)

This is the prompt the enrichment pipeline will ship. Store as a template in `src/lib/enrich/prompts.ts`.

**System:**
```
You are the enrichment engine for AI Brain, a local-first personal knowledge app.
For each item you receive, produce structured metadata strictly as JSON.
Do not include any prose outside the JSON. Do not wrap the JSON in code fences.
The JSON must parse on first try.
```

**User (interpolated):**
```
Source type: {source_type}
Original title: {title}

Article body:
"""
{body clipped to 12000 chars}
"""

Return a JSON object with exactly these keys:
- "summary": a 3-paragraph summary of the article, ~300 words total
- "quotes": array of exactly 5 key quotes pulled verbatim from the article, each under 200 chars
- "category": exactly one of ["Newsletter", "Blog Post", "Podcast Episode", "Tutorial",
               "Case Study", "Reference", "Announcement", "Data Report", "Social Post",
               "Forum Discussion", "Video Page", "Landing Page", "General", "Other"]
- "title": a cleaned-up semantic title (may equal the original if already good; rewrite if it is a filename, URL slug, or unclear)
- "tags": array of 3 to 8 lowercase tags, no spaces, use hyphens

Rules:
- No text outside the JSON.
- No Markdown, no code fences.
- If the article is too short or empty, set all fields to safe defaults and still return valid JSON.
```

**Ollama payload:**
```json
{
  "model": "qwen2.5:7b-instruct-q4_K_M",
  "system": "...",
  "prompt": "...",
  "stream": false,
  "format": "json",
  "think": false,
  "options": {
    "num_ctx": 8192,
    "num_predict": 1200,
    "temperature": 0.3
  },
  "keep_alive": "15m"
}
```

**Budget per item:** 30 s wall time ceiling, 1200 output tokens max. Fits the v0.3.0 exit target ("10 items enriched in ≤30 s/item").

**Response handling:** strip any surrounding whitespace. If JSON.parse fails once, **retry once** with the same payload + `temperature: 0.1`. If second attempt fails, store the raw response in `extraction_warning` and mark enrichment_state = 'error'. Don't third-try.

---

## 8. Open questions not resolved

- **"Building a second brain" was mis-categorized as Podcast by both models.** Written interviews are a blind spot. Consider adding `Interview` as a 15th category, or improving the category description prose in the prompt with disambiguation cues. Low priority — doesn't block v0.3.0.
- **Titles occasionally lose punctuation** (exclamation marks, quotes). Minor cosmetic issue.
- **Quotes are sometimes paraphrased rather than verbatim** — didn't empirically verify; eyeball check said "close but not always exact." Consider a post-processing step that confirms each quoted string appears as a substring in the original body and drops ones that don't. Low priority for v0.3.0; nice for v0.3.1.

---

## 9. Model stack decision

**v0.3.0 primary (enrichment):** `qwen2.5:7b-instruct-q4_K_M` — unchanged from v0.0.1.

**v0.3.0 fast-fallback (noun extraction, SRS card generation):** `phi3.5:3.8b-instruct-q4_K_M` — pull when that phase needs it (per `BUILD_PLAN §15.1`).

**v0.6.0 GenPage quality model:** `qwen3:8b` (with `think: false`) — already on disk. Supplants the earlier `qwen2.5:14b` plan. **Net benefit:** 8B model fits in ~7 GB RAM vs 14B's ~10 GB, freeing headroom for embeddings + browser during GenPage generation. Quality ceiling is comparable (Qwen 3 8B reportedly matches Qwen 2.5 14B on many benchmarks). Re-verify with a v0.6.0-time head-to-head on GenPage-specific workloads before committing.

**Embeddings:** `nomic-embed-text` — unchanged.

**Model-choice override path:** `SETTINGS.llm.enrichment_model` env or SQLite-stored setting, so swapping during a v0.3.x is a one-line flip without code changes.

---

## 10. Updates required in BUILD_PLAN and roadmap

When the next commit touches the plan (next time `BUILD_PLAN.md` is edited):

- **§15.1 LLM stack:** add a "thinking-mode handling" subsection citing this memo
- **§15.1 heavy ops model:** change from `qwen2.5:14b-instruct-q4_K_M` → `qwen3:8b` for v0.6.0. Update disk footprint accordingly (was +8.7 GB, now +0 GB since it's already pulled)
- **SELF_CRITIQUE.md L-6:** mark RESOLVED 2026-05-07 (Qwen 3 evaluated; quality gains do not justify enrichment-path swap; quality path adopts Qwen 3 for v0.6.0)

---

## 11. Artifacts

- Harness: `scripts/rllm-b-bench.ts` (committed)
- Raw results: `/tmp/rllm-b-results.json` (not committed — throwaway)
- Both models remain installed: `ollama list` → `qwen2.5:7b-instruct-q4_K_M`, `qwen3:8b`
- Total time from start to this memo: ~45 min (30 min model pull + 15 min run + write)
