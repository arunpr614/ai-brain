# Brain — Roadmap Tracker

**Document version:** v0.1.0-roadmap
**Date:** 2026-05-07
**Purpose:** Sequenced log of every feature, deferred idea, and phase exit criterion for Brain. This is the **strategic** view: what ships in which version, in what order, and why.

Companion docs:
- `BUILD_PLAN.md` — the architecture and phased roadmap (prose).
- `PROJECT_TRACKER.md` — the tactical day-to-day status view.
- `DESIGN_SYSTEM.md` — the visual/UX contract.
- `FEATURE_INVENTORY.md` — the raw Recall+Knowly feature catalog this sequence is drawn from.

**How to read:** items move through the lifecycle **`future → backlog → planned → in-progress → shipped`**. Entries keep their ID for traceability across versions. Moving an item forward is a deliberate act — don't do it silently.

---

## 1. Version lane summary

| Version | Lane theme | Exit criteria (one-liner) | Est. weeks | Cumulative |
|---|---|---|---|---|
| v0.1.0 | Foundation | App runs on localhost; manual notes in a list | 1.0 | 1.0 |
| v0.2.0 | Capture core | URL + PDF + note all ingest through one pipeline | 1.0 | 2.0 |
| v0.3.0 | Intelligence | Every item auto-summarized, categorized, tagged | 1.5 | 3.5 |
| v0.4.0 | Ask (RAG) | Chat with library; citations; streaming | 2.0 | 5.5 |
| v0.5.0 | APK + extension | Sideloaded Android APK + Chrome MV3 extension | 1.5 | 7.0 |
| v0.6.0 | GenPage + auto-clusters | AI-written multi-section pages; auto-topic clusters | 2.0 | 9.0 |
| v0.7.0 | GenLink | Clickable-word AI sub-pages | 1.0 | 10.0 |
| v0.8.0 | Review (SRS) | FSRS queue + daily review + streak | 1.0 | 11.0 |
| v0.9.0 | Flow + proactive | Multi-step journeys + home-page suggestions | 2.0 | 13.0 |
| v0.10.0 | Breadth + graph + Obsidian | YouTube/EPUB/DOCX + graph + Obsidian sync | 2.0 | 15.0 |
| v1.0.0 | Solid-product gate | Decision point: hosting yes/no | — | — |

---

## 2. Feature sequence (by phase)

Each row is an atomic feature that ships with its phase. Cross-reference ID matches `FEATURE_INVENTORY.md`.

### v0.1.0 — Foundation

| ID | Item | Status | Notes |
|---|---|---|---|
| F-001 | Next.js 15 + Tailwind 4 + shadcn/ui scaffold | planned | Per `DESIGN_SYSTEM.md` §5 |
| F-002 | SQLite + better-sqlite3 + sqlite-vec loaded | planned | |
| F-003 | Core schema (items, chunks, collections, tags, cards, chat_messages, settings) | planned | |
| F-004 | Single-user local auth (password on first run, session cookie) | planned | Blocked by R-AUTH |
| F-005 | Library list view (chronological) | planned | |
| F-006 | "New note" form (title + markdown) | planned | |
| F-007 | Item detail view | planned | |
| F-008 | Theme toggle (system / light / dark), SSR-safe | planned | Per `DESIGN_SYSTEM.md` §13 |
| F-009 | Backup scheduler (6h default, configurable) | planned | Per `BUILD_PLAN.md` §13 |
| F-010 | Command palette scaffold (`⌘K`) | planned | Minimal: navigate to Library/Inbox/Settings |

**Exit:** add 3 notes, list shows them, click one, see content. Theme toggle works. Backup snapshot exists on disk after 6h.

### v0.2.0 — Capture core

| ID | Item | Status | Notes |
|---|---|---|---|
| CAP-1 | Save URL (paste box + `⌘N`) | planned | |
| CAP-2 | Save PDF (drag-drop + batch) | planned | Blocked by R-PDF |
| CAP-3 | Manual note (markdown editor) | planned | Already stub in v0.1 |
| CAP-4 | Save screenshot / image with OCR *(stretch)* | planned | Tesseract.js; keep optional |
| ORG-1 | Library list (chronological) + chip filters | planned | Exists in v0.1; polish pass here |
| ORG-2 | Full-text search (FTS5) | planned | |
| INT-1 | Export item as Markdown | planned | |

**Exit:** any URL renders as clean text; dropped PDF parses; FTS finds keywords; markdown export round-trips.

### v0.3.0 — Intelligence

| ID | Item | Status | Notes |
|---|---|---|---|
| DIG-1 | Auto-summary on ingest | planned | Blocked by R-LLM |
| DIG-2 | Key-quote extraction | planned | |
| DIG-3 | Dual-pane original / digest view | planned | Per `DESIGN_SYSTEM.md` §8.3 |
| ORG-4 | Auto-category (14 buckets, Knowly taxonomy) | planned | |
| ORG-5 | Auto-title (semantic rewrite) | planned | |
| ORG-6 | Auto-tag (3–8 tags) | planned | |
| ORG-7 | Manual tags + collections CRUD | planned | |
| ORG-10 | Bulk operations on library | planned | |
| INT-2 | Bulk export JSON / MD | planned | |

**Exit:** 10 items enriched in ≤30s total; dual-pane renders cleanly; tags + collections CRUD works.

### v0.4.0 — Ask (RAG)

| ID | Item | Status | Notes |
|---|---|---|---|
| F-011 | Semantic chunker (markdown-aware, 400–800 tok, 10% overlap) | planned | |
| F-012 | Re-chunk migration for existing items | planned | |
| F-013 | Embeddings pipeline (Ollama `nomic-embed-text`, batched) | planned | Blocked by R-VEC |
| ASK-1 | Chat over library (RAG) | planned | |
| ASK-2 | Citation-grounded answers | planned | |
| ASK-3 | Per-item chat | planned | |
| ASK-4 | Chat history persistence | planned | |
| DIG-4 | Streaming responses (SSE) | planned | |
| ORG-3 | Semantic search | planned | |
| EXP-3 | Related-items panel on item view | planned | Earliest graph-adjacent feature |

**Exit:** "What did I save about growth loops?" → streamed answer with 3 citation chips linking to items.

### v0.5.0 — APK + extension

| ID | Item | Status | Notes |
|---|---|---|---|
| F-014 | Capacitor 6 integration + Android project | planned | Blocked by R-CAP |
| F-015 | `capacitor.config.ts` with LAN server URL | planned | Blocked by R-AUTH |
| F-016 | LAN token auth middleware | planned | Blocked by R-AUTH |
| F-017 | Build pipeline `npm run build:apk` | planned | |
| F-018 | Self-signed debug keystore; docs for `adb install` | planned | |
| CAP-6 | Android share-sheet target (URL, text, PDF) | planned | Blocked by R-CAP |
| F-019 | Mobile bottom-nav layout | planned | Per `DESIGN_SYSTEM.md` §7.2 |
| F-020 | Mac-unreachable offline screen | planned | Per `DESIGN_SYSTEM.md` §9 |
| CAP-5 | Chrome MV3 extension (popup + context menu) | planned | |

**Exit:** APK installed on Pixel; share URL from Chrome Android → appears on Mac library in ≤2s. Desktop Chrome extension saves page to localhost.

### v0.6.0 — GenPage + auto-clusters

| ID | Item | Status | Notes |
|---|---|---|---|
| GEN-1 | GenPage generator (outline → sections → polish) | planned | |
| F-021 | GenPage viewer (outline-first skeleton, streaming sections) | planned | Per `DESIGN_SYSTEM.md` §8.5 |
| F-022 | Section regenerate / expand-collapse | planned | |
| ORG-8 | Topic clustering (auto-collections) | planned | Blocked by R-CLUSTER |
| ORG-9 | Smart filters (dynamic) | planned | |
| GEN-5 | "Summarize my recent saves" home card | planned | |
| EXP-1 | Knowledge graph data model (edges table) | planned | Not viz yet |

**Exit:** `product-led growth` → GenPage with 4 sections + 12 citations in ≤2 min. Auto-clusters group items sensibly.

### v0.7.0 — GenLink

| ID | Item | Status | Notes |
|---|---|---|---|
| GEN-2 | Noun-phrase extraction per GenPage (cached) | planned | |
| F-023 | `<GenLink>` component + side-card panel | planned | Per `DESIGN_SYSTEM.md` §8.5 |
| F-024 | Sub-page generator (retrieve from library; LLM fallback) | planned | |
| F-025 | Panel cache by `(genpage_id, phrase)` | planned | |
| F-026 | Recursive GenLinks (breadcrumb stack) | planned | |

**Exit:** clicking a noun in a GenPage slides in a 3-para sub-page with library citations.

### v0.8.0 — Review (SRS)

| ID | Item | Status | Notes |
|---|---|---|---|
| REV-1 | Auto-generate review cards (3–5 per item) | planned | Runs on enrichment complete |
| F-027 | FSRS scheduler | planned | Blocked by R-FSRS |
| REV-2 | Daily review queue UI (keyboard-first) | planned | Per `DESIGN_SYSTEM.md` §8.6 |
| REV-3 | Stats — streak, retention %, 14-day sparkline | planned | |
| REV-4 | Android local notification (8am default) | planned | Capacitor LocalNotifications |
| F-028 | Due-count badge in sidebar | planned | |
| F-029 | Mobile swipe-to-rate | planned | |

**Exit:** 20 cards reviewed over 5 days; FSRS schedules correctly; streak = 5.

### v0.9.0 — Flow + proactive

| ID | Item | Status | Notes |
|---|---|---|---|
| GEN-3 | Flow planner agent (5–10 step curriculum) | planned | |
| F-030 | Flow viewer (full-screen stepper, progress persists) | planned | |
| F-031 | Flow end screen (summary + suggested next + "convert to cards") | planned | |
| GEN-4 | "Suggested for you" home-page cards | planned | Catch-up / Learn / Discover |
| F-032 | Cross-cluster bridge detection | planned | For "Discover" cards |

**Exit:** "Flow on retention marketing" → 7-step journey using 14 items. Home shows 3 relevant cards.

### v0.10.0 — Breadth + graph + Obsidian

| ID | Item | Status | Notes |
|---|---|---|---|
| CAP-7 | YouTube transcript ingest via `yt-dlp` | planned | Blocked by R-YT |
| CAP-8 | Podcast ingest (RSS + whisper.cpp) | planned | Blocked by R-WHISPER |
| CAP-13 | EPUB ingest | planned | |
| CAP-14 | DOCX / RTF / ODT ingest (`mammoth` / pandoc sidecar) | planned | |
| EXP-2 | Graph viz (d3-force, local-graph mode, accessible-table) | planned | |
| INT-3 | Obsidian sync folder (frontmatter, wikilinks, conflicts) | planned | |
| F-033 | Hardening pass: error boundaries, queue rate limits | planned | |
| F-034 | DB restore script + runbook | planned | |

**Exit:** YouTube URL → transcript item. Graph renders ~1200 nodes. Obsidian vault reflects library 1:1.

### v1.0.0 — Solid-product gate *(decision, not a build)*

| ID | Item | Status | Notes |
|---|---|---|---|
| DEC-1 | Daily-use confirmation (4 consecutive weeks) | deferred | |
| DEC-2 | Feature-completeness audit (36/47 shipped) | deferred | |
| DEC-3 | Data-integrity audit (no losses; backup/restore tested) | deferred | |
| DEC-4 | Hosting decision (spin up new planning initiative or stay local) | deferred | |

---

## 3. Deferred / future-only items

Moved out of v0.1.0–v1.0.0 scope. Each has a "reopen trigger" — a concrete signal that makes it worth re-scheduling.

| ID | Item | Source | Reopen trigger |
|---|---|---|---|
| FUT-1 | Import 1,116 Lenny PDFs as seed corpus | Arun-specific | After v1.0.0, once personal usage is established and we want to back-populate history |
| CAP-9 | Twitter / X thread ingest | Recall | When/if X offers a stable save API; otherwise depends on screenshot+OCR path |
| CAP-10 | Reddit thread ingest | Recall | Post-v1.0 if personal usage patterns call for it |
| CAP-11 | Email forwarding magic address | Recall | Needs hosted SMTP → post-hosting decision (v1.0+) |
| CAP-12 | Kindle highlight import | Recall | Post-v1.0 if Kindle export flow still exists |
| INT-4 | Public share links | Recall | Post-hosting only (needs HTTPS) |
| INT-5 | Notion / Slack integrations | Recall | Post-v1.0 only if specific personal need |
| FUT-2 | Knowly-style credit meter | Knowly | Only if moving to paid hosted LLMs (unlikely) |
| FUT-3 | Multi-user auth + sharing | neither | Only if v1.0.0 hosting decision includes family/team use |
| FUT-4 | Native Android (Kotlin) replacement for Capacitor | — | Only if Capacitor perf becomes a blocker |
| FUT-5 | iOS sideload / TestFlight | — | Post-v1.0 if personal iOS use case emerges |

---

## 4. Lifecycle board (snapshot)

```
future (5)  →  backlog (0)  →  planned (90+)  →  in-progress (0)  →  shipped (0)
```

All features are `planned` but none `in-progress` yet. Planning-phase docs count as in-progress at the project level, not the feature level.

---

## 5. Item lifecycle rules

1. **future** — deferred past v1.0.0 with a reopen trigger defined.
2. **backlog** — ideas that haven't been placed in a version lane yet. Must be promoted to `planned` before a phase containing them starts.
3. **planned** — assigned to a version lane and has a clear exit contribution.
4. **in-progress** — actively being built in the current phase.
5. **shipped** — merged to main with exit criteria met.

When moving a feature **backwards** (e.g., `planned → backlog`), record why and date in §7.

---

## 6. Dependencies & sequencing rationale

Ordering decisions worth recording so future-me doesn't second-guess:

- **v0.3.0 before v0.4.0** — RAG without embeddings is silly; embeddings need chunks; chunks need clean text which comes from the enrichment pipeline.
- **v0.5.0 mid-roadmap** (not last) — deliberately placed to deliver a "woohoo" moment (APK in hand) around week 7 so motivation survives the GenPage/Flow grind.
- **v0.6.0 before v0.7.0** — GenLink is literally a sub-feature of a GenPage; can't ship without it.
- **v0.8.0 after v0.4.0 but before v0.9.0** — review cards benefit from embedding similarity (to avoid near-dupe cards) but Flow benefits from having review in place so Flow endings can generate cards.
- **v0.10.0 last** — YouTube/podcast/EPUB/graph are all additive, independently useful, and none block the v1.0.0 decision.

---

## 7. Changelog

- 2026-05-07 — Created. All features placed in phase lanes. Lenny seed moved to `future` (FUT-1) per user decision.

---

**Rule of this doc:** changes to phase membership are recorded here *and* mirrored in `BUILD_PLAN.md` §4/§5. Drift between the two is a lint error.
