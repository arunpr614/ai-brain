# S-1: Usage-volume baseline

**Estimated effort:** 1 hour (mostly data extraction from the existing SQLite DB + `data/errors.jsonl`)
**Depends on:** nothing — run this FIRST. All other spikes' cost estimates depend on these numbers.
**Produces:** a numeric baseline + usage-pattern profile, written at `docs/research/brain-usage-baseline.md`.

---

## 0. Why this spike

Every cost estimate in the other 8 spikes is a multiplication: "unit cost × usage volume." We have numbers for unit costs from cloud pricing pages. We do NOT have our own usage volume — without it, cost projections are fiction. **Run this spike first.**

Specifically: we need to know whether Brain is a 5-items/day app (hobby) or a 100-items/day app (near-commercial). Those differ by 20× on API cost.

## 1. Questions to answer

### 1.1 Capture volume
- How many items captured per day, week, month? Break down by `source_type` (url, pdf, note, youtube).
- What's the 50th and 95th percentile body size in characters? (Drives API token cost.)
- What's the distribution of captures over hour-of-day? (Batch feasibility: if I only capture evenings, a 3 AM daily batch is fine. If I capture at 9 AM, 11 AM, 3 PM, batching means 6h–18h-delayed summaries.)
- What's the capture rate on weekends vs weekdays?

### 1.2 Ask volume
- How many Ask queries per day, week, month?
- Average tokens per question? Average tokens per answer?
- Retrieved chunk count distribution?
- What's the ratio of library-scope vs per-item chats?
- How does `llm_usage` (v0.4.0) track this? (Table exists; may have data.)

### 1.3 Enrichment load
- How many enrichment runs per day? (Should roughly equal capture volume.)
- What's the failure rate?
- Wall-time per run (from v0.3.0 telemetry)?
- How many tokens per enrichment call (system + user prompt input + JSON output)?

### 1.4 Embedding volume
- How many chunks in the index total?
- New chunks per day (post-capture)?
- Embedding wall-time per batch of 16?

### 1.5 Storage footprint
- Current `data/brain.sqlite` size?
- Projected 1-year, 5-year size at current growth?
- What's the `data/backups/` usage?

### 1.6 Off-hours pattern
- At what hours is the system actively used vs idle?
- How many consecutive idle hours per day? (Drives: "can we sleep the cloud VM at night?")

## 2. Sources to consult

All are inside this repo; no web research needed.

1. **`data/brain.sqlite`** — primary source. Queries:
   - `SELECT source_type, COUNT(*), MIN(captured_at), MAX(captured_at) FROM items GROUP BY source_type;`
   - `SELECT DATE(captured_at/1000, 'unixepoch', 'localtime') AS day, COUNT(*) FROM items GROUP BY day ORDER BY day DESC LIMIT 90;`
   - `SELECT STRFTIME('%H', captured_at/1000, 'unixepoch', 'localtime') AS hr, COUNT(*) FROM items GROUP BY hr;`
   - `SELECT COUNT(*), AVG(LENGTH(body)), MAX(LENGTH(body)) FROM items;`
   - Similar for `chat_messages`, `chunks`, `llm_usage`.

2. **`llm_usage` table** — v0.4.0 tracking. Has token counts per call.

3. **`data/errors.jsonl`** — structured logs. May contain capture failures + retry patterns.

4. **`data/backups/`** — SQLite snapshot directory. Count + total size.

## 3. Output format

A structured markdown file at `docs/research/brain-usage-baseline.md`:

```markdown
# Brain Usage Baseline — <date>

## Snapshot
- DB size: X MB
- Total items: N (urls, pdfs, notes, youtubes)
- Date range: first capture <date> … last capture <date> (Y days)
- Active days (days with ≥1 capture): D

## Daily rates
- Captures per day: mean M, median P50, p95
- Ask queries per day: mean / median / p95
- Most active hour: Xh
- Idle window: Xh–Yh (averages 0 captures)

## Size distributions
- Item body length p50 / p95 / max
- Chunks per item p50 / p95
- Transcript items (v0.5.1) p50 / p95 body length

## Token accounting (llm_usage)
- Enrichment tokens per call: input p50, output p50
- Ask tokens per call: input p50, output p50
- Total tokens in last 30 days: <N>

## Back-of-envelope monthly cost projections
- API option (Claude Haiku): $X.XX
- API option (OpenAI gpt-4o-mini): $X.XX
- API option (Gemini Flash): $X.XX
- Compute-only (Ollama kept): $X.XX electricity

## Notable patterns
- <any bursts, gaps, weekend behavior, etc.>
```

## 4. Success criteria

- [ ] A real number for daily capture rate (not "probably a few")
- [ ] A real p95 for body size in characters
- [ ] A monthly token total from `llm_usage` (not an estimate)
- [ ] An idle-window duration number that's actionable (e.g., "VM can sleep from 1 AM to 7 AM = 6h off")
- [ ] Projected 1-year storage growth with actual trendline, not a guess

## 5. Open questions for the user

Only one — and it's soft: **are you planning to change your capture habits post-migration?** (E.g., if you've been holding back because you thought your Mac needed to be on, the post-migration rate may be 2–5× higher than the baseline.) If yes, we should apply a multiplier in S-9 (cost optimization) sensitivity analysis.

## 6. Execution note

This spike is 100% local — no web, no API calls. An AI agent with SQLite access or you running `sqlite3` queries can produce the output in 30 minutes. Everything else waits on this.
