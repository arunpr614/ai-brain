# AI Brain — Project Tracker

**Document version:** v0.5.0-tracker
**Date:** 2026-05-08
**Owner:** Arun
**Update cadence:** at phase start, at phase end, and whenever a blocker appears.

**Purpose:** Living operational view of where Brain stands *today*. `ROADMAP_TRACKER.md` is strategic (what's sequenced); this file is tactical (what's in flight, what's blocked, what's next).

---

## 1. Phase status

Legend: `○` not started · `◐` in progress · `●` complete · `✖` blocked

| Phase | Version | Status | Started | Ended | Notes |
|---|---|---|---|---|---|
| Planning | — | ● | 2026-05-07 | 2026-05-07 | Plan + design + 4 P0 research + self-critique all complete; GitHub repo live |
| v0.0.1 Empirical Sanity | 0.0.1 | ● | 2026-05-07 | 2026-05-07 | All 5 S-* shipped; plan v0.2.1→v0.3.0; two plan corrections (plugin name, PDF threshold) |
| v0.1.0 Foundation | 0.1.0 | ● | 2026-05-07 | 2026-05-07 | F-000..F-010 all shipped (Next.js 16 + SQLite + migrations + PIN auth + theme + library + ⌘K + 6h backup). Smoke-tested end-to-end. |
| v0.2.0 Capture core | 0.2.0 | ● | 2026-05-07 | 2026-05-07 | URL (Readability) + PDF (unpdf, 301 cpp paywall guard) + Note + header/footer strip + FTS5 search + markdown export + unified /capture tabs. Smoke-tested. |
| v0.3.0 Intelligence | 0.3.0 | ● | 2026-05-07 | 2026-05-07 | Ollama client + enrichment queue + pipeline (summary/category/title/tags/quotes) + dual-pane view + enriching pill + tags/collections CRUD + bulk zip export. F-207 bulk-ops UI deferred to v0.3.1. |
| **v0.3.1 Polish + hardening** | 0.3.1 | **◐** | **2026-05-08** | — | **Active.** 19 work items: 4 carried (F-207/F-301/F-302/B-301) + 15 self-critique items (F-042..F-056) + F-034 promoted from v0.10.0. Plan: [`docs/plans/v0.3.1-polish.md`](./docs/plans/v0.3.1-polish.md). Critique: [`docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md`](./docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md). |
| v0.4.0 Ask (RAG) | 0.4.0 | ○ | — | — | Blocked by R-VEC spike ([`docs/plans/R-VEC-spike.md`](./docs/plans/R-VEC-spike.md)) |
| v0.5.0 APK + extension | 0.5.0 | ○ | — | — | Scope expanded: +mDNS, +WebAuthn stretch, +CSRF, +token rotation |
| v0.6.0 GenPage + clusters | 0.6.0 | ○ | — | — | Blocked by R-CLUSTER |
| v0.7.0 GenLink | 0.7.0 | ○ | — | — | — |
| v0.8.0 Review (SRS) | 0.8.0 | ○ | — | — | Blocked by R-FSRS |
| v0.9.0 Flow + proactive | 0.9.0 | ○ | — | — | — |
| v0.10.0 Breadth + graph + Obsidian | 0.10.0 | ○ | — | — | Blocked by R-YT, R-WHISPER |
| v1.0.0 Solid-product gate | 1.0.0 | ○ | — | — | Decision checkpoint, not a build |

---

## 2. Current phase details — v0.3.1 Polish + hardening

**Goal:** Close the four polish items carried from v0.3.0 + absorb all actionable findings from the 2026-05-08 self-critique before starting v0.4.0 Ask/RAG.

| Deliverable | Status | File / pointer |
|---|---|---|
| Backlog file | ● | [`BACKLOG.md`](./BACKLOG.md) (created 2026-05-08) |
| v0.3.1 execution plan | ● | [`docs/plans/v0.3.1-polish.md`](./docs/plans/v0.3.1-polish.md) |
| Self-critique document | ● | [`docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md`](./docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md) |
| R-VEC spike plan (parallel, blocks v0.4.0) | ● | [`docs/plans/R-VEC-spike.md`](./docs/plans/R-VEC-spike.md) |
| F-207 Library bulk-ops UI | ○ | planned — T-5 in the v0.3.1 plan |
| F-301 Wire `CollectionEditor` | ○ | planned — T-2 (smallest visible win, start here) |
| F-302 Inline tag editor | ○ | planned — T-3 |
| B-301 Title de-hyphenation | ○ | planned — T-4 (heuristic needs tightening per critique P-1 before implementation) |
| F-042 Bind dev server to `127.0.0.1` | ○ | **P0** — critique A-1; do before any further code lands |
| F-043 Session cookie expiry + SameSite | ○ | P1 — critique A-5 |
| F-044 HMR-safe worker boot guard | ○ | P1 — critique A-2 |
| F-045 Periodic stale-claim sweep | ○ | P1 — critique A-3 |
| F-046 Expose `attempts` on status endpoint | ○ | P2 — critique A-4 |
| F-047 Log non-nodejs instrumentation branch | ○ | P2 — critique A-11 |
| F-048 WAL + synchronous=NORMAL pragmas | ○ | P1 — critique A-6; load-bearing for F-207 bulk writes |
| F-034 DB restore script + runbook | ○ | P1 — critique A-7; promoted from v0.10.0 |
| F-049 Exact-pin `sqlite-vec@0.1.6` | ○ | P1 — critique A-9 |
| F-050 `data/errors.jsonl` rotation | ○ | P2 — critique A-10 |
| F-051 `node:test` precedent + `npm test` | ○ | P1 — critique P-2 |
| F-052 `scripts/smoke-v0.3.1.mjs` | ○ | P1 — critique P-4 |
| F-053 Bulk actions revalidate more paths | ○ | P1 — critique P-6 |
| F-054 Release guard (clean tree + revert rehearsal) | ○ | P1 — critique P-12 + M-4 |
| F-055 Per-task `RUNNING_LOG.md` breadcrumbs | ○ | P1 — critique M-1 |
| F-056 Refuse PIN overwrite without reset flag | ○ | P2 — critique A-12 |

**Phase exit criteria (mirrored in `ROADMAP_TRACKER.md` §2 v0.3.1):**
1. All four carried items (F-207, F-301, F-302, B-301) shipped with commit SHAs in `BACKLOG.md` §5.
2. All P0 and P1 items closed; P2 items closed or explicitly carried to v0.4.0.
3. `npm run typecheck && npm run lint && npm run build && npm test` green.
4. `scripts/smoke-v0.3.1.mjs` runs clean.
5. `package.json` at `0.3.1`; tag `v0.3.1`.
6. RUNNING_LOG.md per-task breadcrumbs + phase-close entry.

---

## 3. Research spikes

Blocking spikes must land before the phase they block. Non-blocking can run in parallel with their phase.

| ID | Question | Blocks | Priority | Status | Output file |
|---|---|---|---|---|---|
| R-LLM | Which Ollama models run well on my Mac? | v0.3.0 | **P0** | ● | `docs/research/llm-sizing.md` (empirical verification in v0.0.1 per critique L-1) |
| R-CAP | Does `@capawesome/capacitor-android-share-target` work on Android 14+? | v0.5.0 | **P0** | ● | `docs/research/android-share.md` (empirical verification in v0.0.1 per critique C-2) |
| R-PDF | Best PDF extractor for messy Substack PDFs | v0.2.0 | **P0** | ● | `docs/research/pdf-extraction.md` (empirical verification in v0.0.1 per critique P-1) |
| R-AUTH | LAN auth model: token / Tailscale / SSH tunnel | v0.5.0 | **P0** | ● | `docs/research/lan-auth.md` |
| R-SELF-CRITIQUE | Adversarial review of own research | — | retrospective | ● | `docs/research/SELF_CRITIQUE.md` (35 findings, 25 open; drives remediations above) |
| R-VEC | sqlite-vec perf at 10k+ chunks | v0.4.0 | P1 | ○ | `docs/research/vector-bench.md` |
| R-FSRS | SRS algorithm choice (SM-2 / FSRS) | v0.8.0 | P1 | ○ | `docs/research/srs-algorithm.md` |
| R-CLUSTER | Topic clustering: JS vs Python sidecar vs LLM-only | v0.6.0 | P2 | ○ | `docs/research/clustering.md` |
| R-YT | yt-dlp reliability on YouTube auto-subs in 2026 | v0.10.0 | P2 | ○ | `docs/research/youtube.md` |
| R-WHISPER | whisper.cpp vs faster-whisper on my Mac | v0.10.0 | P2 | ○ | `docs/research/whisper.md` |

---

## 4. Open decisions

| # | Decision | Options | Owner | Due | Status |
|---|---|---|---|---|---|
| D-1 | Pair-coding style | ✅ Full AI-assisted (Claude writes all code; Arun reviews behavior) | Arun | — | **closed 2026-05-07** |
| D-2 | GitHub repo name + visibility | ✅ `arunpr614/ai-brain`, **public** | Arun | — | **closed 2026-05-07** |
| D-3 | Mac hardware specs | ✅ MacBook Pro 16" 2021, M1 Pro, 32 GB RAM, macOS 26.4.1, 455 GB free | Arun | — | **closed 2026-05-07** |
| D-4 | Obsidian vault path | New vault / existing vault / none | Arun | before v0.10.0 | open |

---

## 5. Blockers

- **v0.4.0 Ask (RAG)** is blocked by **R-VEC spike** ([plan](./docs/plans/R-VEC-spike.md)). R-VEC runs as a parallel lane to v0.3.1 and does not block v0.3.1 closure.
- **v0.3.1 F-042 (P0)** blocks any further network-exposed code changes. Landing it in T-1 or T-2 of execution is non-negotiable per critique A-1.

### Known risks flagged by 2026-05-08 self-critique (not yet blockers)

| Ref | Risk | Mitigation owner |
|---|---|---|
| A-1 | Dev server reachable on LAN without CSRF | F-042 |
| A-2 | HMR double-boots enrichment worker | F-044 |
| A-3 | Stale claims never re-swept after initial boot | F-045 |
| A-5 | Session cookies have no expiry | F-043 |
| A-6 | WAL pragma unverified; bulk writes could serialize | F-048 |
| A-7 | No documented DB restore procedure | F-034 |
| A-9 | `sqlite-vec` caret-pin drifts before R-VEC | F-049 |
| P-1 | Title de-hyphenation heuristic over-fires on `State-of-the-Art 2026` | B-301 (tighten before implementation) |
| P-4 | All success criteria say "manual smoke" | F-052 |

---

## 6. Risks being watched

| Risk | Indicator | Trigger point |
|---|---|---|
| Local LLM quality insufficient | Manual review of 10 summaries gives <6/10 | v0.3.0 mid-phase |
| sqlite-vec perf collapses at scale | p50 query > 200ms on 10k chunks | R-VEC outcome |
| Capacitor share plugin broken on Android 14 | Spike APK fails to receive intent | R-CAP outcome |
| Motivation lull at week 8 | Two consecutive weeks of zero commits | monitor commit frequency |
| Scope creep | Features land outside the phase's feature list | PR review time |

---

## 7. Metrics (tracked post-v0.1.0)

These aren't measured yet — added to remind future-me:

- Commit velocity per week
- Items captured (the real proxy for "am I using this")
- LLM cost (should stay $0 by design — nonzero means fallback API is leaking)
- Bug count per phase
- Time from capture → enriched
- SRS retention % (post v0.8.0)

---

## 8. Changelog of this tracker

- 2026-05-07 — Created. All phases `○`. Planning `◐`.
- 2026-05-07 — Decisions D-1, D-2, D-3 closed. Repo name set to `arunpr614/ai-brain` (public). Mac specs captured (M1 Pro / 32 GB / 455 GB free). Full AI-assisted coding confirmed. P0 research spikes kicked off in parallel.
- **2026-05-08** — v0.3.1 Polish + hardening opened as active phase. Absorbed 22 findings from [`docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md`](./docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md) into 15 work items (F-042..F-056). F-034 promoted from v0.10.0. §2 rewritten from "Planning" to "v0.3.1 Polish + hardening" view. Blockers section updated with per-finding risk table.

**Update rule:** every phase transition appends one row here with date + what changed.
