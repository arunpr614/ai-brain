# AI Brain: Implementation roadmap (consolidated — 2026-05-19 cutover-done delta)

| Field | Value |
|-------|--------|
| **Version** | **2.0** (delta) |
| **Date** | May 19, 2026 |
| **Previous version** | [Handover_docs_19_05_2026_13:47/04_Implementation_Roadmap_Consolidated.md](../Handover_docs_19_05_2026_13:47/04_Implementation_Roadmap_Consolidated.md) (v1.0) |
| **Baseline** | [Handover_docs_19_05_2026_13:47](../Handover_docs_19_05_2026_13:47) (**v1**) |

> **For the next agent:** Phase D progress jumped from "D-12 partial" to "D-14 complete" in this session. D-15..D-18 are user-side validation items still open.

## 1. Active program source of truth

| Document | Status | Role |
|----------|--------|------|
| [docs/plans/v0.6.0-cloud-migration.md](../../docs/plans/v0.6.0-cloud-migration.md) | **Active** | Phase D primary plan |
| [BUILD_PLAN.md](../../BUILD_PLAN.md) | **Active** | Multi-phase task ledger |
| [ROADMAP_TRACKER.md](../../ROADMAP_TRACKER.md) | **Active** | Feature sequencing |
| [PROJECT_TRACKER.md](../../PROJECT_TRACKER.md) | **Active** | Tactical board |
| [BACKLOG.md](../../BACKLOG.md) | **Active** | Deferred items |
| [RUNNING_LOG.md](../../RUNNING_LOG.md) | **Active** | Append-only journal — entry #44 covers this session |

## 2. Release / milestone status matrix

| Release | Theme | Status | Handover note |
|---------|-------|--------|---------------|
| v0.5.0 | LAN brain + APK + extension | **Shipped** | Pre-cutover state |
| v0.6.0 Phase B | Cloud migration prep | **Shipped** | B-1..B-13 |
| v0.6.0 Phase C | Daily Anthropic batch enrichment | **Shipped** | C-1..C-10 |
| v0.6.0 Phase D-1..D-9 | Hetzner deploy capability | **Shipped** | Standalone build + systemd |
| v0.6.0 Phase D-10 | Cloudflare API token | **Shipped** | Token in Bitwarden |
| v0.6.0 Phase D-11 | E2E wire smoke | **Shipped** | Anthropic + Gemini probes green |
| v0.6.0 Phase D-12 | Mac DB → Hetzner | **Shipped** (today, with re-embed of 2 stuck items) | Hetzner: 8 items, 81 chunks, 81 vec |
| v0.6.0 Phase D-13 | DNS + tunnel flip | **Shipped today 09:36 UTC** | CNAME → Hetzner; ingress map updated |
| v0.6.0 Phase D-14 | Stop Mac brain | **Shipped today** | pid 32761 killed |
| v0.6.0 Phase D-15 | APK capture validation | **Open** — user-side test | See M7 §3 |
| v0.6.0 Phase D-16 | Ask query streaming | **Open** — user-side test | See M7 §3 |
| v0.6.0 Phase D-17 | 01:00 IST batch fires | **Open** — automated, validates overnight | Cron is wired |
| v0.6.0 Phase D-18 | B2 backup smoke | **Blocked** — backup script not yet written | Plan §3.5 |
| v0.6.0 Phase E | Secret rotation (6 secrets + CF_API_TOKEN) | **Planned** | After D-15..D-18 green |
| v0.6.0 tag | Release | **Gated** on D-15..D-18 + Phase E |

## 3. Verification and quality gates

| Artifact | Location | Status |
|----------|----------|--------|
| `npm run typecheck` | repo root | **Passing** (last verified before today's edits — both edits were small) |
| Unit tests (Mac) | `npm test` | **Blocked** — pre-existing better-sqlite3 Node v22→v26 mismatch (carry-over) |
| `npm run smoke:batch` | `scripts/smoke-batch.ts` | **Green at session start** — not re-run after gemini.ts commit |
| `npm run smoke:0.5.1` | `scripts/smoke-0.5.1.mjs` | **Broken** since B-11 added node-cron (carry-over, deferred) |
| Hetzner `/api/health` (bearer) | live | **200** ✅ |
| `brain.arunp.in/api/health` end-to-end | live | **200 in ~720ms** ✅ (3 probes) |
| D-15..D-18 user-side | runbook in M8 | **Pending** |

## 4. Operator playbooks (cross-links)

| Doc | Use when |
|-----|----------|
| [07_Deployment_and_Operations.md](./07_Deployment_and_Operations.md) | Pushing code to Hetzner; rolling back the cutover |
| [08_Debugging_and_Incident_Response.md](./08_Debugging_and_Incident_Response.md) | Silent 404, rate limits, enrich loop |
| [Handover_docs_19_05_2026_13:47/07_Deployment_and_Operations.md](../Handover_docs_19_05_2026_13:47/07_Deployment_and_Operations.md) | Original cutover runbook (Bug 1 was unfixed there; fixed here) |

## 5. What not to do

- Do not treat the baseline ([Handover_docs_19_05_2026_13:47](../Handover_docs_19_05_2026_13:47)) §3 punted decisions as still open — A/B/C are resolved (A2 / B1 / C3).
- Do not run `cutover.sh cutover` again unless rolling forward from a clean rollback. Re-running D-12 destroys the gemini-embedded vectors on Hetzner.
- Do not start a Mac next-server bound to port 3000 unless rolling back. The CNAME no longer points at Mac, so a new Mac brain on :3000 doesn't change anything user-visible — but it'll cause confusion.
- Do not paste secrets in chat. Even though `CF_API_TOKEN` was pasted today (and will be rotated in Phase E), this is a one-off authorized exception, not a pattern.
- Do not add new dev/runtime deps without explicit user approval. The `tsx` runtime dep on Hetzner is already a flagged violation (baseline M5 §3.4).
- Do not auto-flip flags or kill processes that look unfamiliar — the Mac cloudflared launchdaemon being loaded but idle is intentional, not stale state.
