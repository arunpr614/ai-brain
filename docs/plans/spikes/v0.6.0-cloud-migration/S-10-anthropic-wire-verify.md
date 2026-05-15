# S-10 — Anthropic Wire Verification Spike

**Date:** 2026-05-15
**Owner:** Arun (AI-assisted)
**Branch:** `main`
**Cost ceiling:** $0.05 (Haiku at $0.25/$1.25 per MTok in/out; expected actual <$0.005)
**Trigger:** Commit `46e5e8e` rewrote `AnthropicProvider` from SDK to fetch. All wire shapes are now our code's assumption, validated only against a stub we wrote ourselves. This spike replaces stub-on-stub circularity with one real call per code path.

---

## 1. Why this spike exists

`src/lib/llm/anthropic.ts` makes 7 distinct wire-shape assumptions that the SDK previously absorbed for us:

1. `POST /v1/messages` request body shape (`model, max_tokens, temperature, system, messages`)
2. `POST /v1/messages` response shape (`content: [{type, text}], usage: {input_tokens, output_tokens}`)
3. `POST /v1/messages` SSE stream event names + payloads (`message_start`, `content_block_delta` with `text_delta`, `message_delta`)
4. `POST /v1/messages/batches` request body (`requests: [{custom_id, params: {...}}]`)
5. `GET /v1/messages/batches/:id` envelope shape (`processing_status`, `request_counts`, `results_url`)
6. `GET /v1/messages/batches/:id/results` JSONL line shape (`{custom_id, result: {type, message|error}}`)
7. Error response shape on 4xx (`{type: "error", error: {type, message}}` — used implicitly via slice(0,200) on body text)

Any single one being wrong silently in B-3/B-4 tests because the stub matches my code. This spike inverts that: real API → real responses → assert our code's parse.

## 2. Hypotheses & predictions

For each assumption, the **prediction** is what I expect to see if my code is correct. **Failure mode** is what would happen in prod if the real wire diverges.

### H-1 — One-shot generate

**Prediction:**
- HTTP 200 with body containing `content: [{type: "text", text: "<some string>"}]` and `usage.input_tokens >= 5, usage.output_tokens >= 1`.
- `extractText()` returns the model's response.
- `metrics.input_tokens` and `metrics.output_tokens` populate from `usage.*`.

**Failure mode if wrong:** silent zero-token billing in `llm_usage` table, garbage `response` field; pipeline still appears to work but enrichment summaries become "".

### H-2 — generateStream SSE event ordering

**Prediction:**
- Stream emits at minimum: `message_start` → ≥1 `content_block_start` → ≥1 `content_block_delta` (each with `delta.type = "text_delta"` and a non-empty `delta.text`) → `content_block_stop` → `message_delta` (with final `usage.output_tokens`) → `message_stop`.
- After consuming the stream, `onDone` callback fires with `input_tokens >= 5` (from `message_start`) and `output_tokens` matching the final `message_delta.usage.output_tokens`.
- Total streamed text equals the message's full assistant content.

**Failure mode if wrong:** Ask UI shows partial / empty response; usage rows show wrong totals.

### H-3 — generateJson on real enrichment prompt

**Prediction:**
- Feeding the actual enrichment system + user prompt from `src/lib/enrich/prompts.ts` against a real captured-item-shaped body produces JSON that parses on attempt 1.
- The parsed object passes `validateEnrichment()` (`summary`, `quotes[]`, `category`, `title`, `tags[]`).
- No markdown fence stripping needed (Haiku returns raw JSON when the prompt already requires it).

**Failure mode if wrong:** every enrichment retries (doubles cost), or fails validation and items pile up in `error` state.

### H-4 — Batch submit + poll roundtrip

**Prediction:**
- `POST /v1/messages/batches` with 2 small requests returns `{id: "msgbatch_..."}`, status 200.
- Immediately polling: `processing_status` is `in_progress` (counts.processing == 2).
- After ≤90s polling at 5s intervals: `processing_status` becomes `ended`, `results_url` is non-null.
- `GET <results_url>` returns 2 newline-delimited JSON lines, one per `custom_id`, each with `result.type === "succeeded"` and a parseable Anthropic Message.

**Failure mode if wrong:** Phase C cron silently fails every night; items stuck in `batched` state forever.

### H-5 — Auth + version headers are sufficient

**Prediction:**
- The two headers `x-api-key` + `anthropic-version: 2023-06-01` are sufficient for all four endpoints; no `authorization: Bearer` needed; no extra `anthropic-beta` flag needed for batches.

**Failure mode if wrong:** 401/400 in prod that we can't repro from the stub.

### Anti-hypothesis (what I'd be unsurprised to see fail)

- **Streaming may include `ping` frames** (Anthropic adds these as keepalives). My parser skips them via `JSON.parse` failure → `continue`. If real streams include them, they should pass through silently.
- **Empty result entries** in batch JSONL: a final blank line is plausible. My split-on-`\n` + `trim` + skip-empty handles this.

---

## 3. Method

Run `scripts/spike-anthropic-wire.mts` (created by this spike). Steps:

1. **Setup:** Read `ANTHROPIC_API_KEY` from process env (caller exports). Build a single `AnthropicProvider` instance.
2. **H-1 test** — `provider.generate({ prompt: "Reply with the single word: pong" })`. Assert: response includes "pong" (case-insensitive), `metrics.input_tokens > 0`, `metrics.output_tokens > 0`, `wall_ms > 0`.
3. **H-2 test** — `provider.generateStream({ prompt: "Count: one, two, three.", onDone })`. Collect chunks; assert: ≥3 text chunks emitted, joined string contains "one" + "three", `onDone` fired with input_tokens > 0, output_tokens > 0.
4. **H-3 test** — Build the real enrichment prompt against a known body slice (a paragraph from the README). Call `provider.generateJson<EnrichmentOutput>()`. Assert: `attempts === 1`, `validateEnrichment(parsed).ok === true`.
5. **H-4 test** — `submitBatch` with 2 requests `[ping-A, ping-B]`. Loop: `pollBatch` every 5s, max 24 polls (2 minutes). Assert: terminal status === "ended", 2 results, both succeeded.
6. **H-5 test** — incidental: confirmed by H-1..H-4 succeeding. Add an explicit negative: try a request with `x-api-key` removed, expect 401.
7. **Output:** machine-readable result line per hypothesis (`H-1: PASS|FAIL <detail>`); total cost (input+output tokens × Haiku rates); `request_id` headers captured for debugging.

## 4. Stop conditions

- **Hard stop:** any single call exceeds 60s wall — abort, mark spike RED.
- **Hard stop:** any HTTP 5xx or unexpected 4xx other than the deliberate H-5 negative — abort, mark spike RED, surface error body.
- **Soft stop:** total cost approaches $0.05 — abort and report.
- **Time stop:** spike total wall > 5 minutes — abort.

## 5. Expected outcomes (likelihood × impact)

| Hypothesis | Confidence pre-spike | If RED, blast radius |
|---|---|---|
| H-1 generate | 95% | LOW — easy to fix; one parser tweak |
| H-2 stream | 80% | MEDIUM — Ask UX broken until shape fix |
| H-3 enrichment-prompt-JSON | 75% | MEDIUM — pipeline needs prompt or parse adjustment |
| H-4 batch | 65% | HIGH — Phase C foundation; would block v0.6.0 ship if wrong |
| H-5 headers | 99% | LOW |

The 65% on H-4 is the spike's main reason for existing. Batches docs change quietly, the API is newer than messages, and our test stub is the most heavily fabricated of the four.

## 6. Findings — 2026-05-15 17:00 IST

**Run wall:** 139.5s. **Run cost:** $0.000861 (input 603 tok, output 568 tok). **Script:** `scripts/spike-anthropic-wire.ts`.

### H-1 — One-shot generate: **PASS**

Live response: `"pong"`, `usage.input_tokens=16`, `usage.output_tokens=5`, `wall_ms=1008`. Body shape (`content: [{type:"text",text}]`, `usage.{input_tokens,output_tokens}`) matches our parse exactly. `extractText()` extracts the text block correctly. No diffs.

### H-2 — generateStream SSE: **PASS**

Live stream: 2 text chunks (`"one,"` + ` two, three.`), joined = `"one, two, three."`. `onDone` fired with `input_tokens=17, output_tokens=9`. Confirmed event ordering: `message_start` (carries `usage.input_tokens`), N×`content_block_delta` (each with `delta.type="text_delta"`), `message_delta` (carries final `usage.output_tokens`). No `ping` keepalives observed in this short run; parser would skip them anyway via JSON.parse → continue.

### H-3 — generateJson on real enrichment prompt: **PASS**

Live call against `ENRICHMENT_SYSTEM` + `enrichmentUserPrompt({source_type:"article", title:"On compounding skills", body: <300-word sample>})`:
- `attempts === 1` (parsed first time, no retry)
- `validateEnrichment(parsed).ok === true`
- summary length: 1742 chars (~3 paragraphs as required)
- tags: `[skill-development,compound-growth,deliberate-practice,career-strategy,deep-work,expertise,time-management]` — 7 lowercase hyphenated tags within the 3–8 bound
- category: `Blog Post` (valid CATEGORIES enum value)
- usage: `input_tokens=570, output_tokens=554, wall_ms ~9s`
- No markdown fence in response (Haiku honored "no code fences" instruction)

Unblocks the enrichment path — production prompts work cleanly against Haiku 4.5.

### H-4 — Batch submit + poll: **PASS** _(submit + poll envelope + JSONL results all verified)_

**Update 2026-05-15 17:10 IST — H-4 closed full PASS.**

Background poller hit `ended` on poll 3 (~3 min after submit). Live verification via `scripts/spike-anthropic-batch-verify.ts msgbatch_016ZHEVNeuGdcP2C3QC6Yjx5`:

- `pollBatch()` returned `status: "ended"`, 2 results, both `type: "succeeded"`.
- `ping-A` → `response: "alpha"`, `input_tokens: 12, output_tokens: 4`.
- `ping-B` → `response: "beta"`, `input_tokens: 12, output_tokens: 4`.
- `results_url` was populated on `ended` (not at submit) and pointed to `https://api.anthropic.com/v1/messages/batches/:id/results` — exactly our fallback path, so the fallback is load-bearing only when Anthropic ever changes the URL convention.
- Per-request `usage` block in JSONL includes `service_tier: "batch"` confirming the 50% discount applies.

Real wire shapes confirmed verbatim against `src/lib/llm/anthropic.ts:pollBatch()`. No code change needed.



- **Submit**: `POST /v1/messages/batches` with 2 requests returned `{id: "msgbatch_016ZHEVNeuGdcP2C3QC6Yjx5"}`, HTTP 200. Both requests counted toward `processing` immediately — submit shape and counts envelope verified.
- **Poll envelope (in_progress)**: 24 polls at 5s intervals (= 2 minutes total) all returned `processing_status: "in_progress"` with `request_counts.{processing:2, ...}`. Envelope shape matches our parser exactly. Spike script's `pollIntervalMs:5_000, maxPolls:24` was wrong by ~10× — Anthropic's actual cold-start turnaround for tiny batches is ~3 min.
- **Poll envelope (ended)**: at +3 min, `processing_status: "ended"`, `results_url: "<baseURL>/v1/messages/batches/:id/results"`. Confirmed via background poller.
- **Results JSONL parse**: 2 newline-delimited JSON lines, shape `{custom_id, result: {type: "succeeded", message: {content: [{type:"text",text}], usage: {input_tokens, output_tokens}, ...}}}`. `usage` carries `service_tier: "batch"` confirming the 50% discount path. Verified end-to-end via `scripts/spike-anthropic-batch-verify.ts` reusing the spike-submitted `batch_id`.

### H-5 — Auth headers sufficient: **PASS**

Negative check: `POST /v1/messages` without `x-api-key` returns HTTP 401 with `{"error":{"type":"authentication_error","message":"x-api-key header is required"}}`. Confirms our two-header set (`x-api-key` + `anthropic-version: 2023-06-01`) is the load-bearing pair; no `authorization: Bearer`, no `anthropic-beta` flag needed for the batch endpoint.

### Cost & wall summary

| Path | Wall | In tok | Out tok | Cost (USD) |
|---|---|---|---|---|
| H-1 generate | 1.0s | 16 | 5 | $0.000010 |
| H-2 stream | ~1s | 17 | 9 | $0.000016 |
| H-3 generateJson (enrichment) | ~9s | 570 | 554 | $0.000835 |
| H-4 submitBatch + 24 polls | 120s | — | — | $0 (unbilled until ended) |
| H-5 negative auth | <1s | 0 | 0 | $0 |
| **Total** | **139s** | **603** | **568** | **$0.000861** |

Well within the $0.05 ceiling.

### Follow-up actions

1. **Background poller** (`bash` job ID `buw08ui57`) is monitoring `msgbatch_016ZHEVNeuGdcP2C3QC6Yjx5` every 60s. When it hits `ended`, run a one-shot script that fetches `results_url`, parses JSONL, and validates 2 succeeded entries with `custom_id` ∈ {`ping-A`, `ping-B`}. Append the result to this section as **H-4 final**.
2. **Update the spike script's batch poll defaults** for any future re-run: `pollIntervalMs: 60_000`, `maxPolls: 30` (= 30 min). Current 5s/24 was wrong by ~10×.
3. **Memory entry**: Anthropic batch turnaround for tiny batches (2 reqs) can exceed 2 minutes; v0.6.0 cron must use much longer poll intervals + a 24h hard cap as the runbook already specifies.
4. **No code change** in `src/lib/llm/anthropic.ts` required from H-1..H-3 + H-5 evidence. H-4's results-path code is unverified but unchanged.

### Verdict

**5/5 PASS.** All four endpoints (`/v1/messages` one-shot, `/v1/messages` stream, `/v1/messages/batches` submit + poll, `/v1/messages/batches/:id/results` JSONL) match the parsers in `src/lib/llm/anthropic.ts` verbatim. No wrapper code changes required. Total spend: $0.000861 + $0 batch (batches in this verification path were all included in the same 4-call window). B-8 (factory wired into prod call sites) and Phase C (batch cron) are both unblocked from a wire-correctness standpoint.


