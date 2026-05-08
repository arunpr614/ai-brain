# AI Brain — Project Tracker

**Document version:** v0.6.0-tracker
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
| v0.3.1 Polish + hardening | 0.3.1 | ● | 2026-05-08 | 2026-05-08 | All 17 work items shipped: 4 polish (F-207, F-301, F-302, B-301) + 13 hardening (F-042..F-056 minus duplicates + F-034 promoted from v0.10.0). 24 unit tests + 16 smoke assertions green. `tsx@^4.19.2` added as only new dev dep. Tag `v0.3.1`. |
| v0.4.0 Ask (RAG) | 0.4.0 | ○ | — | — | Plan drafted 2026-05-08 ([`docs/plans/v0.4.0-ask.md`](./docs/plans/v0.4.0-ask.md)) — 21 tasks, absorbs all 6 R-VEC action items + A-8 + P-11 + M-3 |
| v0.5.0 APK + extension | 0.5.0 | ○ | — | — | Scope expanded: +mDNS, +WebAuthn stretch, +CSRF, +token rotation |
| v0.6.0 GenPage + clusters | 0.6.0 | ○ | — | — | Blocked by R-CLUSTER |
| v0.7.0 GenLink | 0.7.0 | ○ | — | — | — |
| v0.8.0 Review (SRS) | 0.8.0 | ○ | — | — | Blocked by R-FSRS |
| v0.9.0 Flow + proactive | 0.9.0 | ○ | — | — | — |
| v0.10.0 Breadth + graph + Obsidian | 0.10.0 | ○ | — | — | Blocked by R-YT, R-WHISPER |
| v1.0.0 Solid-product gate | 1.0.0 | ○ | — | — | Decision checkpoint, not a build |

---

## 2. Current phase details — v0.3.1 SHIPPED; next v0.4.0 Ask (RAG) (blocked by R-VEC)

**v0.3.1 closed on 2026-05-08.** All 17 work items landed across the hardening (§4A, 13 items) and polish (§4B, 4 items) tracks. Release commit + tag on `main` at HEAD. Full story in [`RUNNING_LOG.md`](./RUNNING_LOG.md) entries dated 2026-05-08.

### v0.3.1 final status (all shipped)

| Track | Count | Items |
|---|---|---|
| §4A hardening | 13 | F-042 (P0) · F-043 · F-044 · F-045 · F-046 · F-047 · F-048 · F-049 · F-050 · F-051 · F-052 · F-034 (promoted) · F-056 |
| §4B polish | 4 | F-301 · F-302 · B-301 · F-207 |
| Cross-cutting | 2 | F-053 (revalidate paths, rolled into F-207b) · F-054/F-055 (release guard + breadcrumbs, rolled into T-B-6) |

**Green at release:**
- 24 unit tests
- 16 smoke assertions (`npm run smoke`)
- `npm run typecheck && npm run lint && npm run build` all clean
- Only new dev dep: `tsx@^4.19.2`

### Next phase: v0.4.0 Ask (RAG)

**Blocker:** R-VEC spike per [`docs/plans/R-VEC-spike.md`](./docs/plans/R-VEC-spike.md). Must land a GREEN/YELLOW/RED verdict before v0.4.0 planning starts. Three thresholds on M1 Pro:
- p50 top-k=8 cosine < 80ms
- p95 < 200ms
- index build < 30s cold / < 5s warm-reopen at 10k chunks

If RED, escalate to a FAISS sidecar (Python) or LanceDB (single-binary Rust) — preferred escalation is LanceDB per critique P-10.

### Pending items from v0.3.1 critique carried to v0.4.0

| Critique ref | Item | Why deferred |
|---|---|---|
| A-8 | FTS5 LIKE-fallback cleanup | Revisit when v0.4.0 hybrid search stresses FTS5 |
| P-11 | BACKLOG.md §5 archive rotation | Not urgent until §5 >~20 closed items |
| M-3 | Cross-AI plan review | Run `gsd-review` at v0.4.0 plan time if available |

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
| R-VEC | sqlite-vec perf at 10k+ chunks | v0.4.0 | P1 | ● GREEN | `docs/research/vector-bench.md` |
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

- **None.** R-VEC cleared GREEN on 2026-05-08; v0.4.0 Ask (RAG) is ready to plan. Findings: [`docs/research/vector-bench.md`](./docs/research/vector-bench.md).

### Critique-derived risks — all closed as of v0.3.1 release

| Ref | Risk | Closed by |
|---|---|---|
| A-1 | Dev server reachable on LAN without CSRF | ✅ F-042 `54bc92f` |
| A-2 | HMR double-boots enrichment worker | ✅ F-044 `d4ae435` |
| A-3 | Stale claims never re-swept after initial boot | ✅ F-045 `9cffda4` |
| A-4 | Retry count invisible to user | ✅ F-046 `db01434` |
| A-5 | Session cookies: expiry + rotation undocumented; untested | ✅ F-043 `9431332` |
| A-6 | WAL pragma stickiness unverified | ✅ F-048 `0da8dcd` |
| A-7 | No documented DB restore procedure | ✅ F-034 `7d4a259` |
| A-9 | `sqlite-vec` caret-pin drifts before R-VEC | ✅ F-049 `3bbf1a7` |
| A-10 | No observability beyond `console.log` | ✅ F-050 `1fd3b08` |
| A-11 | Non-nodejs instrumentation skip is silent | ✅ F-047 `6316361` |
| A-12 | PIN overwrite path unguarded | ✅ F-056 `6580a11` |
| P-1 | Title de-hyphenation heuristic over-fires | ✅ B-301 `3c4b08c` |
| P-2 | Test-framework choice punted | ✅ F-051 `92e0d0f` |
| P-4 | All success criteria say "manual smoke" | ✅ F-052 `ce6de9c` |
| P-6 | Bulk actions miss revalidate paths | ✅ F-053 rolled into F-207b `1f38423` |
| P-8 | R-VEC plan measures latency but not memory | Absorbed into R-VEC plan (no code yet) |
| P-12 | Release step lacks tree-clean + revert rehearsal | ✅ F-054 ran as part of T-B-6 |
| M-1 | No mid-phase breadcrumb cadence | ✅ F-055 applied throughout phase |

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
- **2026-05-08 (release)** — v0.3.1 SHIPPED. All 17 items closed. 24 unit tests + 16 smoke assertions green. §2 rewritten to v0.3.1 final status; §5 blockers + critique risks table marked all-closed. `package.json` 0.3.0 → 0.3.1; tag `v0.3.1` on `main`. Next phase v0.4.0 Ask (RAG) blocked on R-VEC spike.
- **2026-05-08 (R-VEC)** — R-VEC spike completed GREEN. All four thresholds pass with ≥ 10× headroom at 10k chunks (p50=6.25 ms vs 80 ms, p95=6.88 ms vs 200 ms, build=294 ms vs 30 s, reopen=6.47 ms vs 5 s). 50k tier also healthy (p50=30 ms, p95=36 ms). Caveat: `sqlite-vec` resolved to 0.1.9 despite lockfile pin of 0.1.6 — follow-up F-057 logged. v0.4.0 unblocked; next step = draft `docs/plans/v0.4.0-ask.md`.

**Update rule:** every phase transition appends one row here with date + what changed.
