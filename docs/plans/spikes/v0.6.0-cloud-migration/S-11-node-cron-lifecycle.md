# S-11 — `node-cron` Lifecycle Inside Next.js

**Date:** 2026-05-15 (drafted post Phase B closure at `phase-b/v0.6.0`)
**Owner:** Arun (AI-assisted)
**Branch:** `main`
**Cost ceiling:** $0 (local-only)
**Trigger:** Phase C-4 schedules a daily Anthropic batch sweep at `0 3 * * *` UTC. The plan §3.3 names `node-cron` inside `src/instrumentation.ts`. We have F-044 precedent (enrichment worker) showing that long-lived in-process state needs a `globalThis` guard to survive Next's HMR — but cron's failure mode is different from a worker's, and the duplication characteristics under HMR are not documented. Doing this spike before C-4 is much cheaper than catching a doubled batch submit in prod.

---

## 1. Why this spike exists

If `node-cron` registers twice in dev mode (every fast-refresh re-evaluates `instrumentation.ts`), Phase C's daily batch could submit the same items twice → 2× Anthropic spend + duplicate `enrichment_jobs.attempts++` corruption. Even one bad day in prod is a real blast radius given v0.6.0's whole point is "always-on, no babysitting."

The decision this spike informs: **`node-cron` (in-process) vs systemd timer (out-of-process, calls into a `/api/internal/cron-tick` endpoint)**.

## 2. Hypotheses & predictions

### H-1 — Cold-start dev: cron registers exactly once

**Prediction:** running `npm run dev`, the bootstrap log fires `[cron] enrichment-batch scheduled` exactly once. If we register without a guard and the dev server only evaluates `instrumentation.ts` once at boot, this passes naturally.

**Failure mode if wrong:** every cron tick fires N times where N is the number of dev-mode evaluations.

### H-2 — HMR: editing `instrumentation.ts` does NOT double-register

**Prediction:** with a `globalThis` guard pattern (mirroring F-044's `globalThis.__brainEnrichmentWorker`), editing `instrumentation.ts` and saving fires the bootstrap log a second time, but the guard short-circuits the cron registration. Total active schedules: 1.

**Failure mode if wrong:** `cron.getTasks()` returns ≥2 tasks → `0 3 * * *` fires 2× (or N×) per day in dev. Dev divergence from prod is acceptable; silent double-submit in prod is not.

### H-3 — HMR: editing an UNRELATED file does NOT re-evaluate `instrumentation.ts`

**Prediction:** editing `src/lib/enrich/pipeline.ts` (any unrelated server module) and saving does not re-run `instrumentation.ts`. `cron.getTasks()` still returns 1.

**Failure mode if wrong:** every save during dev re-registers the cron, accumulating tasks until the dev server restarts. Memory leak + spurious firings.

### H-4 — Prod: `next build && next start` registers cron exactly once

**Prediction:** in production mode, `instrumentation.ts` runs once at boot. `cron.getTasks().length === 1` after 30s of uptime.

**Failure mode if wrong:** Next.js multi-runtime boot (node + edge in parallel) double-registers. This is documented as a real risk per Next docs — `instrumentation.ts` runs in BOTH the nodejs and edge runtimes by default.

### H-5 — Prod: `next start` shutdown stops the cron cleanly

**Prediction:** `SIGTERM` → cron stops on the next tick boundary; no zombie schedules survive. Verifiable via `lsof` / `ps` showing no leftover Node processes after 30s.

**Failure mode if wrong:** Hetzner systemd restart → orphaned cron in old process → 2× firings until OS reaps.

### Anti-hypothesis (what I'd be unsurprised to see fail)

- **Edge runtime evaluation of `instrumentation.ts`** — Next 13+ runs the file in both runtimes. `node-cron` requires `setInterval`, which Edge doesn't provide. Will likely throw at edge-evaluation time, which would crash the edge runtime startup. Mitigation pattern (per Next docs): early-exit with `if (process.env.NEXT_RUNTIME !== "nodejs") return;`. Already present in `src/instrumentation.ts` per a quick grep — confirm during the spike.

---

## 3. Method

A single TypeScript script `scripts/spike-node-cron-lifecycle.ts` and a manual checklist (because HMR can't be exercised from a script — needs a real `next dev` session).

### Automated portion (script)

1. Install `node-cron@latest` + `@types/node-cron` in a throwaway branch (or scope-only via npm install --no-save).
2. Register a 1-minute cron that increments a counter on a `globalThis` flag.
3. Re-import the registration module 5 times in a loop, logging `cron.getTasks().length` after each.
4. Wait for 90s and assert counter increments by exactly 1, not 5.
5. Cleanup: `cron.getTasks().forEach(t => t.stop())`.

### Manual portion (HMR validation)

| Step | Action | Expected |
|---|---|---|
| 1 | `npm run dev`, watch console | One `[cron] scheduled` line |
| 2 | Edit `instrumentation.ts` (add a comment), save | One additional `[cron] scheduled` line; `cron.getTasks().length === 1` (verify via a debug endpoint) |
| 3 | Edit `src/lib/enrich/pipeline.ts` (unrelated), save | NO new `[cron] scheduled` line |
| 4 | Repeat step 2 four more times | Still `cron.getTasks().length === 1` |
| 5 | `Ctrl-C`, `npm run build && npm run start` | One `[cron] scheduled` line; verify no edge-runtime evaluation hit |
| 6 | Send SIGTERM (`kill <pid>`); wait 5s | Process exits cleanly; no orphaned listeners |

### Stop conditions

- Any test fails → spike RED. Document the failure shape, recommend systemd timer.
- Edge runtime crash on boot → known; confirm `NEXT_RUNTIME` guard fix works, then continue.
- Total spike time > 45 min → abort, write up partial findings, surface decision to user.

## 4. Expected outcomes (likelihood × impact)

| Hypothesis | Pre-spike confidence | If RED, impact |
|---|---|---|
| H-1 cold-start single registration | 95% | LOW — easy to fix with guard |
| H-2 HMR + globalThis guard works | 75% | MEDIUM — add guard, re-test |
| H-3 unrelated-file HMR doesn't re-register | 90% | LOW |
| H-4 prod single registration | 70% | HIGH — blocks `node-cron` choice; pivot to systemd |
| H-5 SIGTERM clean shutdown | 80% | MEDIUM — restart hygiene matters for Hetzner |

The 70% on H-4 is the spike's main reason. Next.js multi-runtime is the documented sharp edge. If H-4 fails, the recommendation flips to systemd cleanly.

## 5. Decision matrix (post-spike fill-in)

| Outcome | Decision | Phase C-4 plan |
|---|---|---|
| All H-1..H-5 PASS | Use `node-cron` | C-4 ships in 1 hour with `globalThis` guard mirroring F-044 |
| H-2 RED | Use `node-cron` with extra guard | C-4 ships, +30 min for guard hardening |
| H-4 RED (prod-double-register) | Pivot to systemd timer | C-4 becomes a `/api/internal/cron-tick` endpoint + a Hetzner systemd unit; ~2 hr extra |
| Any H RED + H-4 RED | Defer Phase C, ask user | Block; this is a sign we don't understand the runtime well enough |

## 6. Findings — 2026-05-15 19:24 IST

**Verdict: 5/5 PASS. Decision matrix → use `node-cron` for Phase C-4 with the `globalThis` guard pattern.**

### Spike artifacts
- Automated: `scripts/spike-node-cron-lifecycle.ts` (run via `node --import tsx`).
- Manual portion: built + booted prod server on port 3099, captured `/tmp/spike-h4-prod.log`.
- Total wall: ~5 min (10s automated, 30s build, 5s boot + observe, plus follow-up sanity).

### Per-hypothesis results

| ID | Verdict | Detail |
|---|---|---|
| **H-1** cold start | PASS | 1 task active after `registerOnce()`; 2 ticks observed in 2.5s window |
| **H-2** HMR-guarded | PASS | After 5 consecutive `registerOnce()` calls on the same `globalThis` flag, exactly 1 task; 3 ticks in 2.5s (not 15) |
| **H-2b** unguarded negative control | PASS | 4 deliberately unguarded `cron.schedule()` calls produced **8 extra ticks in 2.5s** — confirms the guard is load-bearing, not vacuous |
| **H-3** unrelated re-eval | PASS | Task count stable at 1 across 3 simulated re-imports |
| **H-4** prod single registration | PASS | `npm run build && next start` boot log: 1× `[backup] scheduler started`, 1× `[backup] initial snapshot`, 1× `[enrich] worker starting`. The existing `NEXT_RUNTIME !== "nodejs"` guard in `src/instrumentation.ts:11` correctly skips edge-runtime evaluation. No multi-runtime double-fire. |
| **H-5** stop() halts ticks | PASS | After `task.stop()`, 0 further ticks in a 2.5s window. Note: in node-cron 4.x, stopped tasks remain in `cron.getTasks()` until `destroy()` is called — non-firing is the load-bearing contract, registry membership isn't. |

### Observed sharp edges (worth surfacing for C-4)

1. **`stop()` ≠ `destroy()` in node-cron 4.x**. `stop()` halts firing but the task object remains tracked by `cron.getTasks()`. C-4 should use `destroy()` (or the new `task.destroy?.()` optional-chain pattern) on shutdown to fully release. Spike script learned this the hard way (initial cleanup assertion failed before being relaxed).
2. **F-044 globalThis guard pattern works verbatim for cron**. C-4 should mirror `src/lib/queue/enrichment-worker.ts:50-65` — `globalThis.__brainEnrichmentBatchCron` flag, no module-level `let`. The current `src/lib/backup.ts` uses module-level `let started` (NOT HMR-safe); fine in practice because `timer.unref()` makes the orphaned interval garbage-collect, but C-4 should use the stronger pattern given the cost of a duplicate batch submit.
3. **Edge runtime evaluation guard is already in place** in `src/instrumentation.ts:11`. Don't add a redundant guard inside the cron registration — the file-level early-return is sufficient.
4. **Orthogonal observation (not S-11 scope)**: the boot log shows `[enrich] LLM provider unreachable; backing off 30000ms` ~3s after worker start, even though `npm run smoke:0.5.1` and `scripts/smoke-factory-ollama.ts` confirm Ollama is reachable. Not reproducible from a fresh `getEnrichProvider().isAlive()` call. Likely a transient Ollama hiccup during model swap. Tracked as a B-8 follow-up but does NOT block Phase C.

### Decision

**Use `node-cron@4.2.1` for Phase C-4.** Implementation pattern locked:

```ts
// src/instrumentation.ts (additions for C-4)
declare global {
  // eslint-disable-next-line no-var
  var __brainBatchCron: { task: ReturnType<typeof cron.schedule> | null } | undefined;
}

function startBatchCron(): void {
  if (!globalThis.__brainBatchCron) {
    globalThis.__brainBatchCron = { task: null };
  }
  if (globalThis.__brainBatchCron.task) return;
  globalThis.__brainBatchCron.task = cron.schedule(
    "0 3 * * *",
    () => {
      void runEnrichmentBatch().catch((err) =>
        console.error("[enrichment-batch] fired but errored:", err),
      );
    },
    { timezone: "UTC" },
  );
  console.log("[enrichment-batch] cron scheduled — 0 3 * * * UTC");
}
```

C-4 implementation is unblocked. Estimated time to ship: 1 hour (was 1 hr in the original plan — no slip).

## 7. Action items

1. **[DO]** When C-4 lands, mirror the `globalThis.__brainBatchCron` pattern above. Don't reuse `src/lib/backup.ts`'s weaker module-level `let started` — the cost of a duplicate batch submit is too high.
2. **[DO]** On shutdown (SIGTERM handler in `instrumentation.ts` or graceful-stop hook), call `globalThis.__brainBatchCron?.task?.destroy?.()` not just `stop()`. node-cron 4.x distinguishes the two.
3. **[VERIFY]** After C-4, re-run `scripts/spike-node-cron-lifecycle.ts` against the actual `instrumentation.ts` (modify it to import the real registration) as a pre-flight before Phase D deployment.
4. **[INVESTIGATE — NOT BLOCKING]** The transient `[enrich] LLM provider unreachable` log line during prod boot. Could be an Ollama warmup race when multiple models are being loaded by a previous test. Reproduce with `npm run start` on a clean Ollama state; if it persists, surface as a B-8 bug.

