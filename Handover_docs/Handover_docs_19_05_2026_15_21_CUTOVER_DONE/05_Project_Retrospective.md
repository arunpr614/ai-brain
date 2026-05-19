# AI Brain: Project retrospective (handover — 2026-05-19 cutover-done delta)

| Field | Value |
|-------|--------|
| **Version** | **2.0** (delta) |
| **Date** | May 19, 2026 |
| **Previous version** | [Handover_docs_19_05_2026_13:47/05_Project_Retrospective.md](../Handover_docs_19_05_2026_13:47/05_Project_Retrospective.md) (v1.0) |
| **Baseline** | [Handover_docs_19_05_2026_13:47](../Handover_docs_19_05_2026_13:47) (**v1**) |

> **For the next agent:** This file extends the baseline retrospective with the new lessons surfaced in today's cutover-completion session. Read the **watch-outs** section before any architectural change.

## 1. Timeline (this session)

| Time (IST) | Event |
|------------|-------|
| ~13:00 | New session opens, reads baseline handover |
| ~13:30 | First self-critique → recognizes "ship today" drift, recommends paid Gemini upgrade |
| ~14:00 | User upgrades Gemini API to paid tier |
| ~14:10 | Backfill runs on Hetzner: 2 items, 65 chunks, 88s, 0 fail. Hetzner now 8/8. |
| ~14:30 | Bug 1 (WAL leak) fixed + committed (`1413f9b`). Bug 2 deferred (moot for forward path). |
| ~14:50 | Mac brain 502 diagnosed: pid 32761 on :3099 not :3000. Rollback verified viable. |
| ~15:00 | Cron schedules confirmed on Hetzner (batch + 5-min poll + backup-6h). |
| ~15:05 | User overrides 48h pacing buffer per "I am not using the brain now" |
| ~15:06:57 | **D-13 CNAME flip**. Initial probe 404 → traced to missing tunnel ingress entry. |
| ~15:10 | Hetzner `/etc/cloudflared/config.yml` updated with `brain.arunp.in` ingress. |
| ~15:12 | brain.arunp.in serving 200 via Hetzner. **D-14 Mac brain killed**. 3 probes 200. |
| ~15:25 | RUNNING_LOG entry #44 appended. |
| ~15:30 | This handover bundle created. |

## 2. Recurring themes (this session + prior)

1. **"Ship today" drift.** Across multiple sessions (entry #43, this session) the agent has drifted toward "let's just flip it" without an explicit user-stated deadline. User has corrected this exact framing at least 3 times. **The pattern is systemic, not a one-off.** Mitigation: when the agent finds itself ranking options where "do it now" is one of them, it should surface the user's locked rules first (memory, prior decisions) and ask before ranking.
2. **False binaries.** This session twice framed decisions as "(a) do X / (b) skip diagnosis / (c) pause" when one option was clearly correct. User pushed back with "do a self-critique." Mitigation: if a "skip diagnosis" branch exists, that's a tell that the framing is wrong — drop it.
3. **Symptom vs cause.** Two examples this session:
   - The 2 stuck transcripts looked like "TPM throttle on embedding" but the architectural reality was a transaction-rollback in `pipeline.ts`. Same symptom, different fix.
   - The brain.arunp.in 404 looked like "CNAME flip didn't take" but was actually a missing ingress entry on the tunnel. Same symptom, different fix.
   Both required diagnosing one layer deeper than the obvious.
4. **Memory as load-bearing constraint, not background noise.** The `cutover-pacing` memory said "≥48h after D-11." The agent treated that as a soft preference; user re-asserted it explicitly. Memory rules are user-locked decisions until user explicitly overrides.

## 3. Incident / bug index (this session's discoveries)

| File / Location | Title (one-liner) |
|-----------------|-------------------|
| [`src/lib/embed/pipeline.ts`](../../src/lib/embed/pipeline.ts) lines 113–128 | **Single-tx chunks+vec rollback leaves chunkless items on embed failure** — self-heals on default-mode backfill but undocumented |
| [`scripts/deploy/cutover.sh`](../../scripts/deploy/cutover.sh) `d12_db_migrate()` | **WAL leak during DB swap** — fixed in commit `1413f9b` |
| Hetzner `/etc/cloudflared/config.yml` (pre-D-13) | **Tunnel ingress missing `brain.arunp.in`** — caused silent 404 after CNAME flip; fixed in this session |
| [`src/lib/queue/enrichment-worker.ts`](../../src/lib/queue/enrichment-worker.ts) line 96 | **`isAlive()` probe loops 45 min then self-resolves at restart** — observed pre-restart; degraded path only |
| Mac next-server pid 32761 | **Bound to :3099 instead of :3000** — caused brain.arunp.in 502 from Mac side; killed in D-14 |

## 4. Mitigations now in place

| Issue class | Mitigation |
|-------------|------------|
| Stale WAL during DB swap | `cutover.sh` now `rm -f` of `.sqlite-wal` and `.sqlite-shm` before `mv` |
| Gemini free-tier rate limits | Paid tier active; ~$0.002/mo cost; 3,000 RPM ceiling |
| `batchEmbedContents` 429s | Replaced with serial `embedContent` + 1.1s delay (commit `6c03093`) |
| New CF tunnel hostname → 404 | Documented in M9 §3 + `reference_hetzner_cloudflared_ingress.md` memory |
| Mac brain rollback dead | Documented restart command in M8 §7 |

## 5. Watch-outs for the next agent

1. **The `pipeline.ts` transaction-rollback is undocumented but self-healing.** If you see items with `enrichment_state='done'` but 0 chunks, run `node --import tsx scripts/backfill-embeddings.mjs` (default mode) on Hetzner. Don't add `--reset` unless you've also handled Bug 2 (the wipe predicate, which the prior session noted but is moot in default mode).
2. **The `[enrich] LLM provider unreachable` loop is a known degraded-path bug.** Doesn't affect batch enrichment, capture, or search. Workaround: `sudo systemctl restart brain` on Hetzner. Long-term fix: instrument the worker so its `isAlive()` probe self-heals without process restart.
3. **Mac cloudflared launchdaemon is loaded but idle.** Don't `launchctl bootout` reflexively — confirm with user first. Maybe the user wants it warm as a manual rollback assist.
4. **CF_API_TOKEN was pasted in chat.** Treat it as compromised. It's queued in M3 §1.2 for Phase E rotation. Don't paste new tokens without a similarly explicit "OK to compromise this token now, rotate later" agreement.
5. **48h pacing rule is locked but explicitly overrideable.** If the user explicitly authorizes an override (as in this session: "I am not using the brain now. We can override the 48 hour rule if nothing else breaks."), proceed. Otherwise default to honoring it.
6. **D-15..D-18 are user-side validation.** The agent cannot test APK capture, browser Ask streaming, or B2 backup smoke from Claude. The agent CAN check Hetzner journals to confirm the request landed and the cron tick fired (see M9 §4).
7. **`tsx` on Hetzner is a known violation.** Don't add more deps without user approval. Phase E should remove `tsx` by switching from runtime `.ts` interpretation to a build-time compile step.

## 6. Related reading

- [Handover_docs_19_05_2026_13:47/05_Project_Retrospective.md](../Handover_docs_19_05_2026_13:47/05_Project_Retrospective.md) — baseline retro
- [04_Implementation_Roadmap_Consolidated.md](./04_Implementation_Roadmap_Consolidated.md) — release status
- [RUNNING_LOG.md](../../RUNNING_LOG.md) entry #44 — full session narrative
