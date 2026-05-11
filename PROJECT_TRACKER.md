# AI Brain — Project Tracker

**Document version:** v0.9.1-tracker
**Date:** 2026-05-12
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
| v0.4.0 Ask (RAG) | 0.4.0 | ● | 2026-05-08 | 2026-05-09 | All 21 tasks shipped (T-0..T-19). Chunker + embeddings + vec0 retriever + SSE /api/ask + /ask UI + threads + unified search (fts/semantic/hybrid RRF) + related items + backfill + smoke + SC-7 bench scaffold. 107 unit tests + 29 smoke assertions green. Tag `v0.4.0` on `main`. SC-7 live bench pending user run. |
| v0.5.0 APK + extension | 0.5.0 | ● | 2026-05-09 | 2026-05-11 | **SHIPPED via Cloudflare named tunnel pivot.** Tunnel live at `https://brain.arunp.in` (launchd-persistent); APK baked with tunnel URL; Chrome extension (popup + context menu + options) E2E tested in Edge 147. T-CF-* 22/25 tasks landed (T-CF-21 WebAuthn deferred to v0.5.1). Gates: 233 unit tests · 3 smoke suites (v0.3.1 + v0.4.0 + v0.5.0) · typecheck clean. Tag `v0.5.0` on `main`. |
| v0.5.1 YouTube capture | 0.5.1 | ● | 2026-05-11 | 2026-05-12 | **SHIPPED.** Server-side YouTube transcript capture via InnerTube POST + inline XML parser (zero new deps). One new file + one migration; extension/APK untouched — both get YouTube support for free. Body stays pure transcript; enrichment gets channel+duration via composed title. 260 tests (233 → 260, +27); 4 smoke suites; opt-in `smoke:youtube` live-network check. Tag `v0.5.1` on `main`. |
| v0.6.0 GenPage + clusters | 0.6.0 | ○ | — | — | Blocked by R-CLUSTER |
| v0.7.0 GenLink | 0.7.0 | ○ | — | — | — |
| v0.8.0 Review (SRS) | 0.8.0 | ○ | — | — | Blocked by R-FSRS |
| v0.9.0 Flow + proactive | 0.9.0 | ○ | — | — | — |
| v0.10.0 Breadth + graph + Obsidian | 0.10.0 | ○ | — | — | Blocked by R-YT, R-WHISPER |
| v1.0.0 Solid-product gate | 1.0.0 | ○ | — | — | Decision checkpoint, not a build |

---

## 2. Current phase details — v0.4.0 SHIPPED; next v0.5.0 APK + extension

**v0.4.0 closed on 2026-05-09.** All 21 tasks shipped across 7 tracks (T-0..T-19) per [`docs/plans/v0.4.0-ask.md`](./docs/plans/v0.4.0-ask.md) (v1.2). Release commit + tag `v0.4.0` on `main`. Full story in [`RUNNING_LOG.md`](./RUNNING_LOG.md) entries 20–22.

### v0.4.0 final status (all shipped)

| Track | Tasks | Feature refs |
|---|---|---|
| Migrations & queue | T-3 | 005_vector_index.sql · 006_embedding_jobs.sql (with trigger + backfill) |
| Chunker + embeddings | T-4, T-5, T-16 | F-011 semantic chunker · F-013 embeddings pipeline (nomic-embed-text, 768-dim, batch=16) · F-012 backfill script |
| Retriever + search | T-6, T-7, T-14 | vec0 + chunks_rowid bridge (BigInt rowid, L2→cosine) · ORG-3 unified search (fts/semantic/hybrid RRF k=60) |
| Ask orchestration | T-8, T-9, T-10 | ASK-1 SSE /api/ask · [CITE:id] filter + orphan logging · Ollama-offline 503 preflight |
| Ask UI | T-11, T-12 | ASK-1 /ask page + useAskStream + Stop · ASK-2 citation chips + scroll-to-chunk |
| Threads + per-item | T-13 | ASK-3 per-item chat · ASK-4 thread persistence (create/append/list/delete) |
| Related + release | T-15, T-17, T-18, T-19 | EXP-3 related-items panel (mean centroid) · 13-assertion v0.4.0 smoke · SC-7 bench scaffold · version bump + tag |
| Pre-plan housekeeping | T-0, T-1, T-2 | F-057 sqlite-vec@0.1.9 pin · M-3 cross-AI review (4 patches) · P-11 backlog archive rotation |

**Green at release:**
- 107 unit tests (52 → 107, +55)
- 29 smoke assertions across v0.3.1 (16) + v0.4.0 (13)
- `npm run typecheck && npm run lint && npm run build` all clean
- New runtime deps: `sqlite-vec@0.1.9` (explicit overrides), `@radix-ui/react-tooltip`, `cmdk` additions
- No new dev deps beyond v0.3.1's `tsx`

### SC-7 live verification (user action, not release-blocking)

Code paths + preflights + bench scaffold are verified; the live first-token/full-answer latency numbers are an M1-Pro-on-user-machine measurement. To populate `docs/research/ask-latency.md`:

```bash
ollama pull nomic-embed-text
npm run backfill:embeddings
npm run bench:ask
```

Thresholds: p95 first-token < 2000 ms (warm), p95 full-answer < 8000 ms. Cold-run is discarded per plan patch P-2.

### Next phase: v0.5.0 APK + extension

No blockers. R-AUTH closed. R-CAP closed (v0.0.1 S-003 validated `@capgo/capacitor-share-target` on AVD). Scope is expanded per self-critique: +mDNS (F-035), +CSRF (F-036), +token rotation (F-037), +QR display (F-038), +native file stream (F-039), +WebAuthn stretch (F-040), +cold-start dedup (F-041).

### Open v0.4.0 questions carried forward

| Ref | Item | Disposition |
|---|---|---|
| SC-7 | Live latency numbers on user's real library | Pending user action above; non-blocking |
| P-4 (new) | Per-chunk token counts use char/4 heuristic, not tiktoken | Revisit if chunk boundaries drift noticeably; monitor via retrieve quality |

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
- **2026-05-09 (release)** — v0.4.0 SHIPPED. All 21 tasks closed (T-0..T-19). 107 unit tests + 29 smoke assertions (v0.3.1 + v0.4.0) green. `package.json` 0.3.1 → 0.4.0; tag `v0.4.0` annotated on `main`; 23 commits + tag pushed to `origin/main`. Next lane: v0.5.0 APK + extension — no blockers. SC-7 live bench (first-token + full-answer p95) is a user-side measurement task pending; code paths + preflights verified.
- **2026-05-11 (pivot execution)** — v0.5.0 Cloudflare-tunnel pivot plan v2.1 shipped + 8 of 15 T-CF-* tasks landed in a single session. Plan v2.0 drafted via gsd-planner agent → cross-AI review produced `v0.5.0-apk-extension-v2-REVIEW.md` with 5 HIGH + 5 MEDIUM findings (bearer vs cookie on `/api/settings/lan-info`, unowned `scripts/smoke-sse.sh` creation, missing `data/test.pdf`, uncoordinated `parseSetupUri` return type, orphan `buildSetupUri` signature change) → all absorbed into v2.1 with inline `(REVIEW ...)` annotations. Executed: T-CF-2 (delete mDNS + bonjour-service dep + simplify share-handler URL to `BRAIN_TUNNEL_URL` constant), T-CF-3 (delete `network_security_config.xml`), T-CF-4..6 (QR schema `url=`+`token=` + single-probe reachability), T-CF-8 (rebuild APK with tunnel URL baked in; 8.9 MB at `data/artifacts/brain-debug-0.4.0.apk`), T-CF-9 (pairing page + API for tunnel), T-CF-10 (README rewrite for cloudflared setup + privacy note), T-CF-12 (grep cleanup + drop `@capacitor/camera` + kill `BRAIN_LAN_MODE`/`dev:lan`/`start:lan`). Tests: 233/233 green throughout. Remaining: T-CF-11 AVD smoke (interactive), T-CF-14 physical Pixel (user-gated), T-CF-15..21 Chrome extension wave, T-CF-22..25 release wave.

**Update rule:** every phase transition appends one row here with date + what changed.
