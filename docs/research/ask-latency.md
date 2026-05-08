# Ask (RAG) latency — SC-7 validation

| Field | Value |
|-------|-------|
| **Document version** | v1.0-scaffold |
| **Date** | 2026-05-08 (scaffold); results pending first live run |
| **Owner** | Arun (manual run; AI-assisted) |
| **Bench script** | [`scripts/bench-ask.mjs`](../../scripts/bench-ask.mjs) |
| **Raw results** | `tmp/bench-ask-results.json` (gitignored; regenerable) |
| **Verdict** | **PENDING** — run `node --import tsx scripts/bench-ask.mjs` to populate |

---

## 1. Question

Does the Ask (RAG) endpoint meet SC-7 on M1 Pro with a realistic library?

| Metric | Threshold | Rationale |
|---|---|---|
| p95 first-token latency | **< 2 000 ms** (warm model) | UI liveliness target — user sees tokens within ~2 s of pressing Enter. |
| p95 full-answer latency | **< 8 000 ms** | 3-paragraph reply on a ~10k-chunk library. |
| Retrieve latency (reference) | informational | Should dominate-less-than the generate step; R-VEC already validated vec0 p95 < 200 ms at 10k chunks. |

Cold first-request (model load into RAM) may exceed 8 s on first invocation after idle — documented behaviour, not a regression. The bench discards the first run per plan patch P-2.

---

## 2. Method

- 10 representative questions (see `scripts/bench-ask.mjs` `QUESTIONS`).
- Preflight: `isOllamaAlive()` + one-string embed probe. Exits non-zero with remediation commands if daemon down / model missing.
- 1 cold run, result recorded but excluded from p50/p95.
- 10 warm runs, measured per-question:
  - `retrieve_ms`: vec0 retrieval wall time
  - `first_token_ms`: time from generate start to first streamed token
  - `full_answer_ms`: time from generate start to final token
  - `token_count`, `answer_chars`: sanity signals
- Percentiles: straight linear-sorted index (no interpolation).

Environment captured: Node version, CPU model, cores, total memory, OLLAMA_HOST, generate model, embed model, DB path.

---

## 3. Results

_Populate this section from `tmp/bench-ask-results.json` after running the bench._

### Environment

| Field | Value |
|---|---|
| Node.js | `env.node` |
| CPU | `env.cpu` × `env.cores` |
| Memory | `env.totalMemGb` GB |
| Ollama host | `env.ollama_host` |
| Generate model | `env.generate_model` |
| Embed model | `env.embed_model` |
| DB | `env.db_path` |

### Latency (warm model, N=10 questions)

| Metric | p50 | p95 | max | Threshold | Result |
|---|---:|---:|---:|---|---|
| First token | `summary.first_token.p50` | `summary.first_token.p95` | `summary.first_token.max` | < 2 000 ms | `summary.pass.first_token_p95` |
| Full answer | `summary.full_answer.p50` | `summary.full_answer.p95` | `summary.full_answer.max` | < 8 000 ms | `summary.pass.full_answer_p95` |
| Retrieve | `summary.retrieve.p50` | `summary.retrieve.p95` | — | informational | — |

Cold first-token: `cold.first_token_ms` (informational; excluded from p95).

---

## 4. Verdict

_Fill in after results land._

- **PASS** — both p95 thresholds met. SC-7 satisfied; T-19 release guard can proceed.
- **MARGINAL** — one p95 slightly over threshold. Document the gap; decide whether to ship with a caveat or revisit model / top-k tuning.
- **FAIL** — p95 significantly over. Options ranked by cost:
  1. Reduce `top_k` from 8 → 5 or 6 (trades recall for speed).
  2. Reduce `num_predict` cap on the generator (shortens worst-case answers).
  3. Switch to a smaller generate model (qwen2.5:3b) — user-visible quality hit.
  4. Hardware: only viable via user action.

---

## 5. Caveats

- Bench uses the user's real library. Results depend on corpus composition; a library dominated by very short items will produce lower retrieve times than one with 10k+ chunks.
- First-token latency is sensitive to Ollama's `keep_alive` setting. The generator uses `15m` default; if the daemon evicts the model between runs, warm-run numbers degrade.
- `num_ctx=8192` is the default; very long chunk concatenations near the context limit will slow prompt_eval.

---

## 6. Reproduce

```bash
# With nomic-embed-text + qwen2.5 pulled and backfill already done:
node --import tsx scripts/bench-ask.mjs
cat tmp/bench-ask-results.json | jq '.summary'
```

Re-run whenever: the generate model changes, `top_k` default changes, the embedding dimension changes, or macOS / Node is upgraded.
