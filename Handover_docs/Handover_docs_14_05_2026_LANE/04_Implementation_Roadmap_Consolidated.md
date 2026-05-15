# AI Brain: Implementation roadmap (consolidated — 2026-05-14)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 14, 2026 |
| **Previous version** | [Handover_docs_12_05_2026/04_Implementation_Roadmap_Consolidated.md](../Handover_docs_12_05_2026/04_Implementation_Roadmap_Consolidated.md) (v1.0) |
| **Baseline** | [Handover_docs_12_05_2026/](../Handover_docs_12_05_2026/) (**v1**) |

> **For the next agent:** This file is a **pointer hub** — it consolidates links to active program documents, release status, and quality gates. It is not the roadmap itself; it tells you where to find the current roadmap.

## 1. Active program source of truth

| Document | Status | Role |
|----------|--------|------|
| [`docs/plans/v0.6.0-cloud-migration.md`](../../docs/plans/v0.6.0-cloud-migration.md) | **Draft v1.0 — Stage 4 review pending** | Cloud-migration plan; primary post-collapse work |
| [`ROADMAP_TRACKER.md`](../../ROADMAP_TRACKER.md) | **Active** | Feature sequencing by version |
| [`PROJECT_TRACKER.md`](../../PROJECT_TRACKER.md) | **Active** | Tactical board |
| [`BACKLOG.md`](../../BACKLOG.md) | **Active** | Deferred items |
| [`STATE.md`](../../.planning/STATE.md) | **Active** | OWNERSHIP block (must update post-collapse) |
| [`docs/plans/v0.6.x-augmented-browsing.md`](../../docs/plans/v0.6.x-augmented-browsing.md) | **Plan v2 locked** | Augmented Browsing; AUG-1..7 ready to execute post-v0.6.0 |
| [`docs/plans/v0.6.x-graph-view.md`](../../docs/plans/v0.6.x-graph-view.md) | **Plan v1; v2 outstanding** | Graph view; needs research doc + v2 rewrite per Lane L's last log entry |
| [`docs/plans/v0.6.x-offline-mode-apk.md`](../../docs/plans/v0.6.x-offline-mode-apk.md) | **v3 drafted, unreviewed** | Offline mode APK; needs self-critique + user review |
| [`docs/plans/v0.7.x-offline-workmanager-roadmap.md`](../../docs/plans/v0.7.x-offline-workmanager-roadmap.md) | **Roadmap, not plan** | v0.7.x WorkManager direction |

## 2. Release / milestone status matrix

| Release | Theme | Status | Handover note |
|---------|-------|--------|---------------|
| v0.3.0 | Local-first MVP | **Shipped** (historical) | Foundation; SQLite + Ollama + Capture |
| v0.4.0 | Ask | **Shipped** (historical) | SSE streaming Ask via Ollama |
| v0.5.0 | Tunnel pivot | **Shipped** (historical) | Cloudflare Named Tunnel `brain.arunp.in`; LAN/mDNS retired |
| v0.5.1 | YouTube transcript | **Shipped** (historical) | InnerTube capture |
| v0.5.2 | SameSite | **Shipped** (Lane L) | Cookie SameSite hardening |
| v0.5.3 | APK unlock-loop fix | **Shipped** (Lane L) | CapacitorHttp disabled |
| v0.5.4 | Extension polish + APK fixes | **Shipped** (Lane L) | Per Lane L releases |
| v0.5.5 | **Offline mode** | **Shipped** (Lane L) | IndexedDB outbox + sync-worker + share-handler + a11y |
| v0.5.6 | App-shell SW | **Shipped** (Lane L) | Service worker for offline cold-start; DIAG-1..4 follow-up fixes landed |
| v0.6.0 | **Cloud migration** | **Phase A complete; Phase B–F planned** | Plan v1.0 in `docs/plans/v0.6.0-cloud-migration.md` awaiting Stage 4 review |
| v0.6.x AB | Augmented Browsing | **Planned** (Lane L) | Plan v2 locked; AUG-1..7 ready post-v0.6.0 |
| v0.6.x Graph | Graph view | **Planning** (Lane L) | Plan v2 + research doc outstanding |
| v0.6.x Offline+ | Offline mode v0.6.x patches | **Planning** (Lane L) | v3 plan drafted, unreviewed |
| v0.7.0 | WorkManager + offline expansion | **Roadmap only** | `docs/plans/v0.7.x-offline-workmanager-roadmap.md` |

> The lane-collapse merge is NOT a release. It does not bump version numbers. After the merge, the next release is **v0.6.0** (cloud migration).

## 3. Verification and quality gates

| Artifact | Location | Status |
|----------|----------|--------|
| v0.6.0 plan v1.0 cross-AI review | TBD: `docs/plans/v0.6.0-cloud-migration-REVIEW.md` | **Not started** (Stage 4 gate) |
| v0.6.0 plan v1.0 self-critique | TBD: `docs/plans/v0.6.0-cloud-migration-SELF-CRITIQUE.md` | **Not started** (Stage 4 gate) |
| v0.6.0 plan acceptance criterion #7 | OpenRouter swap test (dev only, before Phase E tag) | **Not started** |
| Phase A smoke (sqlite-vec on glibc 2.39) | Confirmed during Phase A; recorded in commit `fe197af` | **PASS** |
| Lane L test suite | `npm test` on `lane-l/feature-work @ c944387` | **Last passing in commit history**; re-run required after merge |
| Lane L APK build | `npm run build:apk` on `lane-l/feature-work` | **Last shipped as v0.5.6**; re-run required after merge |
| Lane L production build | `npm run build` on `lane-l/feature-work` | **Last passing**; re-run required after merge |
| Post-merge full validation | TBD: see [`07_Deployment_and_Operations.md §5`](./07_Deployment_and_Operations.md) | **Not started** |

## 4. Operator playbooks (cross-links)

| Doc | Use when |
|-----|----------|
| [`07_Deployment_and_Operations.md`](./07_Deployment_and_Operations.md) | Performing the lane-collapse merge |
| [`08_Debugging_and_Incident_Response.md`](./08_Debugging_and_Incident_Response.md) | Merge produces unexpected conflicts or test failures |
| [`HANDOVER.md`](./HANDOVER.md) | Executive summary of the entire collapse mission |
| [`docs/plans/v0.6.0-cloud-migration.md`](../../docs/plans/v0.6.0-cloud-migration.md) | After collapse: Phase B-1 onwards |
| [`docs/plans/spikes/v0.6.0-cloud-migration/S-7-MIGRATION-RUNBOOK.md`](../../docs/plans/spikes/v0.6.0-cloud-migration/S-7-MIGRATION-RUNBOOK.md) | Phase D cutover (Mac → Hetzner) |
| [`Handover_docs_12_05_2026/`](../Handover_docs_12_05_2026/) | Full pre-collapse architecture baseline (still valid) |
| [`Handover_docs_13_05_2026/`](../Handover_docs_13_05_2026/) | Lane L's own snapshot (offline-mode v0.6.x complete) |

## 5. Stage gates pending before Phase B execution starts

The v0.6.0 plan v1.0 is committed but NOT yet locked. The following gates must close before Phase B-1 (`LLMProvider` interface in `src/lib/llm/types.ts`) begins:

1. **Cross-AI review** — spawn `gsd-plan-checker` agent against `docs/plans/v0.6.0-cloud-migration.md`; produces `v0.6.0-cloud-migration-REVIEW.md`.
2. **Self-critique** — spawn fresh agent for adversarial pass; produces `v0.6.0-cloud-migration-SELF-CRITIQUE.md`.
3. **Apply 4 known fixes from prior session's RUNNING_LOG action items** (entry `2026-05-14 21:05`):
   - Cross-check `LLMProvider` interface against actual call sites in `src/lib/enrich/pipeline.ts`, `src/lib/queue/enrichment-worker.ts`, `src/lib/ask/generator.ts`
   - Add Phase C task `C-11`: live Anthropic API smoke ($0.50 spending cap) before Hetzner deploy
   - Add Phase D task `D-12-pre`: tar Mac SQLite + `data/` to local archive before rsync
   - **ASK** user about Anthropic monthly hard cap ($5 vs $3)
4. **User sign-off** on plan v1.1.

## 6. What not to do

- **Do not** start Phase B-1 (`src/lib/llm/types.ts`) before the lane collapse is complete and Stage 4 review is signed off. Phase B refactors `src/lib/llm/ollama.ts` and its callers; Lane L's `src/lib/queue/enrichment-worker.ts` is one of those callers. Touching it during dual-lane = guaranteed merge conflicts.
- **Do not** treat `Handover_docs_11_05_2026/` (untracked, in `stash@{3}`) as current. It's a pre-Lane-L-handover-doc snapshot. Likely stale; review and probably delete after the merge.
- **Do not** treat `Handover_docs_12_05_2026/` as superseded by this package. The 12_05 baseline still describes correct architecture for both pre- and post-v0.6.0 state. This package only adds **lane-collapse mechanics**.
- **Do not** delete `lane-c/v0.6.0-cloud` or `lane-l/feature-work` branches before CI green on `main` AND a tag (`lane-collapse-YYYY-MM-DD`) is pushed. 7-day grace period is the recommended retention.
- **Do not** invent secret values, model ids, or pricing in plans/docs without a citation. The OpenRouter eval ([`docs/research/openrouter-provider-evaluation.md`](../../docs/research/openrouter-provider-evaluation.md)) sets the standard: every claim has a URL with capture date.
- **Do not** swap Anthropic-direct for OpenRouter for enrichment. The Batch API 50% discount is only available via direct API. This is documented in the OR evaluation; ignoring it costs ~$0.07/mo for zero quality gain.
