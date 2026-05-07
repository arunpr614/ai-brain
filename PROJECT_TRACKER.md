# AI Brain — Project Tracker

**Document version:** v0.2.0-tracker
**Date:** 2026-05-07
**Owner:** Arun
**Update cadence:** at phase start, at phase end, and whenever a blocker appears.

**Purpose:** Living operational view of where Brain stands *today*. `ROADMAP_TRACKER.md` is strategic (what's sequenced); this file is tactical (what's in flight, what's blocked, what's next).

---

## 1. Phase status

Legend: `○` not started · `◐` in progress · `●` complete · `✖` blocked

| Phase | Version | Status | Started | Ended | Notes |
|---|---|---|---|---|---|
| Planning | — | ● | 2026-05-07 | 2026-05-07 | Plan + design + 4 P0 research + self-critique all complete; GitHub repo live |
| **v0.0.1 Empirical Sanity** | 0.0.1 | ○ | — | — | **3-hour gate** blocking v0.1.0; converts desk research into measurements |
| v0.1.0 Foundation | 0.1.0 | ○ | — | — | Waiting on v0.0.1 |
| v0.2.0 Capture core | 0.2.0 | ○ | — | — | Ready pending v0.1.0 |
| v0.3.0 Intelligence | 0.3.0 | ○ | — | — | Needs LLM eval harness (critique L-2) |
| v0.4.0 Ask (RAG) | 0.4.0 | ○ | — | — | Blocked by R-VEC |
| v0.5.0 APK + extension | 0.5.0 | ○ | — | — | Scope expanded: +mDNS, +WebAuthn stretch, +CSRF, +token rotation |
| v0.6.0 GenPage + clusters | 0.6.0 | ○ | — | — | Blocked by R-CLUSTER |
| v0.7.0 GenLink | 0.7.0 | ○ | — | — | — |
| v0.8.0 Review (SRS) | 0.8.0 | ○ | — | — | Blocked by R-FSRS |
| v0.9.0 Flow + proactive | 0.9.0 | ○ | — | — | — |
| v0.10.0 Breadth + graph + Obsidian | 0.10.0 | ○ | — | — | Blocked by R-YT, R-WHISPER |
| v1.0.0 Solid-product gate | 1.0.0 | ○ | — | — | Decision checkpoint, not a build |

---

## 2. Current phase details — Planning

**Goal:** Lock plan, design system, and research queue before writing code.

| Deliverable | Status | File |
|---|---|---|
| Strategy doc (existing) | ● | `STRATEGY.md` |
| Feature inventory (existing) | ● | `FEATURE_INVENTORY.md` |
| Project closure marker (existing; now historical) | ● | `PROJECT_CLOSURE.md` |
| Build plan | ● | `BUILD_PLAN.md` v0.1.1-plan |
| Design system | ● | `DESIGN_SYSTEM.md` v0.1.0-design |
| Project tracker (this file) | ● | `PROJECT_TRACKER.md` |
| Roadmap tracker | ● | `ROADMAP_TRACKER.md` |
| Backlog file | ○ | `BACKLOG.md` (create at v0.1.0 kickoff) |
| Research spikes (4 blocking) | ◐ | see §3 |

**Exit criteria for Planning → v0.1.0:**
1. R-LLM, R-CAP, R-PDF, R-AUTH outputs written to `docs/research/`.
2. Mac hardware specs documented.
3. GitHub repo `arunpr614/brain` initialized, private, first commit of planning docs pushed.
4. v0.1.0 kickoff task list created (schema, auth, library page).

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

No blockers active. Research spikes are scheduled but not gating other work yet.

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

**Update rule:** every phase transition appends one row here with date + what changed.
