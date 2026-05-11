# S-3: Enrichment flow redesign — daily batch + manual trigger

**Estimated effort:** 1.5 hours (code audit + design; no web research)
**Depends on:** S-1 (usage volume); should follow S-6 (host choice drives cron mechanism)
**Produces:** a concrete implementation design for daily batch enrichment + per-item "Enrich now" button, including schema changes, cron wiring, and UI states.

---

## 0. Why this spike

Timing decision is already made (user-locked 2026-05-12): **default = daily batch; escape hatch = manual per-item button.** This spike is no longer "should we batch?" — it's "how do we build it cleanly, and what does it cost to operate?"

## 1. Questions to answer

### 1.1 Schema / queue changes

- Current: `enrichment_jobs` table populated by trigger on `items.enrichment_state = 'pending'`; worker drains queue immediately.
- New: items still enter the queue, but the worker runs on a cron schedule, not a continuous loop.

Key design questions:
- Does the `enrichment_jobs` table need a new column (e.g., `scheduled_for INTEGER`, `triggered_by TEXT`) or does the existing schema cover it?
- How do we represent "manually triggered" vs "auto-batched"?
- What's the transactional story if the batch is interrupted mid-run?
- Retry behavior: does a failed batch job go back into the queue for tomorrow's run, or retry within the same batch with backoff?

### 1.2 Cron mechanism on the cloud host

This depends on S-6's host choice but we can sketch options:
- **Systemd timer** — works on any Linux VM (Hetzner, DO, Lightsail, Oracle). Most reliable.
- **Host's built-in scheduler** — Fly.io has machines; Railway has cron jobs; Render has cron jobs. Sometimes free, sometimes extra.
- **Node-internal scheduler** — using something like `node-cron` in the Next.js server. Runs when the server is up (it will be, 24/7 on the cloud). **Simplest** — no new infrastructure.
- **Cloudflare Workers Cron Triggers** — could hit an `/api/enrich/run-batch` endpoint on a schedule. Interesting but adds CF Workers dependency.

Pick one; recommend: node-internal scheduler (simplest), with systemd-timer fallback documented.

### 1.3 Batch window selection

- What hour of day should the batch run?
- Criterion: minimize cost (some hosts bill by active CPU hours) + minimize UX collision (user isn't using Brain at the moment the fan spins up).
- For an always-on cloud VM, this is almost cosmetic — the host is running anyway.

### 1.4 "Enrich now" button design

- Where does the button live? Probably on the item-detail page, near the current `⏳ Enriching…` pill area.
- What happens on click:
  1. POST `/api/items/[id]/enrich` (new route)
  2. Server runs `enrichItem(id)` synchronously OR pushes to an immediate-mode inner queue
  3. UI polls the existing `enrichment-status` endpoint until done
  4. Page re-renders with the summary / tags / quotes / rewritten title
- Rate-limit the endpoint (bearer-auth'd already); 5 manual triggers/hour should be plenty.
- What if the item is already enriched? The button should either not appear OR offer "Re-enrich" (regenerate).

### 1.5 UI copy for the new state

Current state: `⏳ Enriching…` pill shown while a worker is actively on the item.

New states:
- `⌛ Queued for tonight's batch` — for items waiting in the batch
- `⏳ Enriching…` — the worker is actively on this one (batch or manual)
- `✓ Enriched` — done
- `⚠ Enrichment failed` — retryable error; button to retry manually

Copy audit: the library list renders (via `warningLabel()` in v0.5.1) but not the enrichment state pill. That rendering happens somewhere else — find it, update it.

### 1.6 Cost impact

From S-1: `N_enrich` = enrichments per month. Batch API (Anthropic / OpenAI) is 50% off; daily-batch strategy maps 1:1 to the batch API if we route enrichments through it.

**Daily batch + batch API = 50% cost reduction on enrichment.** Manual-trigger calls go through the regular synchronous API (fast, full price) — fine since those are rare.

Estimate the monthly savings given S-1 volume.

### 1.7 Failure modes

- Batch run kicks off at 3 AM; at 3:15 AM the host runs out of memory and crashes. What happens?
- Batch API submission succeeds but retrieval fails. Who retries?
- User clicks "Enrich now" at 3:05 AM — does it collide with the running batch? (Lock semantics.)
- Clock skew / timezone: cloud VM is probably UTC; user is in local time zone. Does "3 AM" mean user-local or UTC? Decide + document.

## 2. Sources to consult

1. `src/lib/enrich/pipeline.ts` — `enrichItem(item_id)` already exists; the public interface can stay unchanged
2. `src/lib/queue/enrichment-worker.ts` — current worker loop; likely becomes `runEnrichmentBatch()` + shuts off continuous polling
3. `src/db/migrations/003_enrichment_queue.sql` + `006_embedding_jobs.sql` — queue schema
4. `src/app/api/items/[id]/enrichment-status/route.ts` — existing polling endpoint
5. Anthropic Batches API docs — https://docs.claude.com/en/api/claude-api-batch-processing (verify current in S-4)
6. OpenAI Batch API — https://platform.openai.com/docs/guides/batch
7. The `⏳ Enriching…` pill render site — probably in the item detail page or library list

## 3. Output format

`docs/plans/spikes/v0.6.0-cloud-migration/S-3-ENRICHMENT-DESIGN.md`:

```markdown
# Enrichment Flow v2 — Design

## Scheduler choice: <node-internal | systemd | host-provider>
Rationale: ...

## Schema changes
- enrichment_jobs: <added columns / or none>
- items: <no change>
- Migration number: 008_<name>

## Server code changes
- src/lib/queue/enrichment-worker.ts — continuous loop → scheduled
- src/lib/queue/enrichment-batch.ts — NEW: batch-API submission + polling
- src/app/api/items/[id]/enrich/route.ts — NEW: manual-trigger endpoint
- src/app/api/enrich/run-batch/route.ts — NEW (if using CF cron): webhook for scheduled run

## Client / UI changes
- src/components/enrichment-pill.tsx — new states
- src/app/items/[id]/page.tsx — "Enrich now" button + re-enrich affordance
- Copy: (table)

## Cost impact
- Current monthly: $X
- Post-change (daily batch at batch API prices): $Y
- Saving: $Z

## Rollout
- Task breakdown: T-ENR-01 ... T-ENR-06
- Manual trigger ships before batch? Or after?
- Rollback: revert flag BRAIN_ENRICH_BATCH_MODE=false → falls back to immediate
```

## 4. Success criteria

- [ ] Concrete scheduler choice with rationale
- [ ] Clear code-module additions + responsibilities
- [ ] UI copy for every state mapped to component
- [ ] Cost delta quantified with S-1 data
- [ ] Rollback path identified (one env flag toggle)

## 5. Open questions for the user

1. **Batch timing:** do you want 3 AM local or 3 AM UTC? (Local is more intuitive; UTC is simpler.)
2. **Re-enrich** — on manual click for an already-enriched item, regenerate? Or skip?
3. **Failure visibility** — do you want a notification surface (Slack / email / browser notification) for failed batches, or is the `⚠ Enrichment failed` pill enough?

## 6. Execution note

This spike produces a design, not code. Implementation lands in the v0.6.0 plan. Keep it concise — one markdown file, ~400 lines max, focused on decisions + shape, not code samples.
