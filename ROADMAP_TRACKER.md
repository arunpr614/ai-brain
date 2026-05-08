# AI Brain — Roadmap Tracker

**Document version:** v0.6.0-roadmap
**Date:** 2026-05-08
**Changelog:**
- **v0.6.0-roadmap** — v0.3.1 Polish + Hardening SHIPPED. All 17 work items (F-042..F-056 + F-034 + F-207/F-301/F-302/B-301) closed with commit SHAs. Tag `v0.3.1` on main. Critique A-series + P-series all closed (table in `PROJECT_TRACKER.md` §5). Next lane: v0.4.0 Ask (RAG), blocked by R-VEC.
- v0.5.0-roadmap — v0.3.0 Intelligence SHIPPED (`5d1c390`); inserted **v0.3.1 Polish + Hardening** phase absorbing all actionable findings from [`docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md`](./docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md); promoted F-034 (restore script) from v0.10.0 → v0.3.1; added F-042..F-055 spanning hardening, observability, test infrastructure, and process gates.
- v0.4.0-roadmap — v0.2.0 Capture core SHIPPED; F-101..F-106 all shipped; migrations runner applied `002_fts5.sql` during build.
- v0.3.0-roadmap — v0.1.0 Foundation SHIPPED; Next.js 16 + React 19 + Tailwind 4 runtime live; F-000..F-010 all shipped.
- v0.2.1-roadmap — v0.0.1 Empirical Sanity Morning COMPLETE; all 5 S-* items shipped; added F-041 (cold-start dedup); v0.5.0 plugin corrected to `@capgo/capacitor-share-target`.
- v0.2.0-roadmap — added v0.0.1 Empirical Sanity gate; expanded v0.5.0 scope with mDNS (F-035), CSRF (F-036), token rotation (F-037), QR display (F-038), native file stream (F-039), WebAuthn stretch (F-040); added F-000 migrations runner to v0.1.0. Driven by `docs/research/SELF_CRITIQUE.md`.
- v0.1.0-roadmap — initial roadmap.
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
| v0.0.1 | Empirical sanity | Measure the 4 research spikes on Arun's actual Mac | 0.1 (3h) | 0.1 |
| v0.1.0 | Foundation | App runs on localhost; manual notes in a list | 1.0 | 1.1 |
| v0.2.0 | Capture core | URL + PDF + note all ingest through one pipeline | 1.0 | 2.0 |
| v0.3.0 | Intelligence | Every item auto-summarized, categorized, tagged | 1.5 | 3.5 |
| v0.3.1 ✅ | Polish + hardening | SHIPPED 2026-05-08 — all 17 items closed | 0.6 | 4.1 |
| v0.4.0 | Ask (RAG) | Chat with library; citations; streaming | 2.0 | 6.1 |
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

### v0.0.1 — Empirical Sanity Morning *(3 hours; BLOCKS v0.1.0)*

Gate inserted per `docs/research/SELF_CRITIQUE.md §8 item 1`. Converts desk research into measurements on Arun's Mac.

| ID | Item | Status | Notes |
|---|---|---|---|
| S-001 | Ollama + Qwen 2.5 7B tok/s measurement | **shipped** | Measured: 24 tok/s gen, 141 ms first-token. Self-critique L-1 resolved. |
| S-002 | `unpdf` extraction on 10 real Lenny PDFs | **shipped** | 100ms avg; threshold calibrated to 301 cpp. Self-critique P-1/P-2 resolved. |
| S-003 | Throwaway Capacitor APK + AVD share-intent test | **shipped** | Plugin name corrected: `@capgo/...` not `@capawesome/...`. Self-critique C-2/C-4/C-6 resolved. |
| S-004 | WebAuthn TouchID feasibility check | **shipped** | `@simplewebauthn` v13.3.0 + TouchID validated. Self-critique A-5 resolved. |
| S-005 | Write `docs/research/EMPIRICAL_SANITY.md` | **shipped** | Complete report committed 2026-05-07. |

**Exit:** ✅ `EMPIRICAL_SANITY.md` committed 2026-05-07. Plan bumped to v0.3.0-plan. Two corrections merged into §15 (plugin name, PDF threshold). **v0.1.0 unblocked.**

### v0.1.0 — Foundation ✅ **SHIPPED** 2026-05-07

| ID | Item | Status | Notes |
|---|---|---|---|
| F-000 | DB migrations runner + `_migrations` tracking | **shipped** | `src/db/client.ts` runs any unapplied `src/db/migrations/NNN_*.sql` on server start |
| F-001 | Next.js 16.2.5 + React 19.2 + Tailwind 4 scaffold | **shipped** | create-next-app + token-driven globals.css per DESIGN.md |
| F-002 | SQLite + better-sqlite3 + sqlite-vec loaded | **shipped** | Vec extension loads when native binding available; silent no-op otherwise |
| F-003 | Core schema | **shipped** | 13 tables: items, chunks, collections, item_collections, tags, item_tags, cards, chat_threads, chat_messages, settings, llm_usage, _migrations + sqlite_sequence |
| F-004 | Single-user local auth (PIN v1) | **shipped** | PBKDF2-HMAC-SHA256 PIN + HMAC session cookie + proxy middleware gate + /setup /unlock flows |
| F-005 | Library list view (chronological) | **shipped** | `/` — empty-state + card-item rows with source icon, title, metadata, relative time |
| F-006 | "New note" form (title + markdown) | **shipped** | `/items/new` — server action + zod validation + error state |
| F-007 | Item detail view | **shipped** | `/items/[id]` — Charter article typography, kebab delete |
| F-008 | Theme toggle (system / light / dark), SSR-safe | **shipped** | Cookie-persisted; pre-hydration script prevents FOUC; Monitor/Sun/Moon radiogroup in Settings |
| F-009 | Backup scheduler (6h default, configurable) | **shipped** | `VACUUM INTO data/backups/YYYY-MM-DD_HHMM.sqlite`; retention 28; boots via `src/instrumentation.ts` |
| F-010 | Command palette scaffold (`⌘K`) | **shipped** | cmdk-based; Navigate → Library/Settings + Capture → New note |

**Exit:** ✅ Smoke-tested end-to-end: setup PIN → library empty state → new note form → detail view → delete. Theme toggle round-trips. Initial backup snapshot written on dev-server boot. DB migrations applied idempotently on build + dev.

### v0.2.0 — Capture core ✅ **SHIPPED** 2026-05-07

| ID | Item | Status | Notes |
|---|---|---|---|
| F-101 / CAP-1 | Save URL via Readability + jsdom | **shipped** | `src/lib/capture/url.ts`; 15s timeout, 5MB cap, custom UA; duplicate-URL warn flow |
| F-102 / CAP-2 | Save PDF via unpdf pipeline | **shipped** | `src/lib/capture/pdf.ts`; 50MB cap; paywall guard @ 301 cpp; scan signal @ <50 chars/page + >3KB/page |
| CAP-3 | Manual note (markdown editor) | **shipped** | Migrated from v0.1 `/items/new` to `/capture?tab=note` |
| CAP-4 | Save screenshot / image with OCR *(stretch)* | **deferred** | Scoped out of v0.2.0 per MVP alignment — stays deferred until R-OCR phase |
| F-103 | Header/footer stripping utility | **shipped** | `src/lib/capture/strip.ts`; 50% page threshold; self-critique P-4 resolved |
| F-104 / ORG-2 | FTS5 full-text search | **shipped** | Migration `002_fts5.sql` with porter tokenizer + sync triggers; `/search` route; LIKE fallback |
| F-105 / INT-1 | Markdown export endpoint | **shipped** | `GET /api/items/[id]/export.md` with YAML frontmatter; Obsidian-ready |
| F-106 | Unified `/capture` page with tabs | **shipped** | URL / PDF / Note tabs + drag-drop PDF dropzone + ⌘K entries |

**Deferred from v0.2.0 (vs the original plan):**
- CAP-4 image OCR — explicit MVP-scope decision (URL + PDF + Note is the right floor); revisit post-R-OCR
- ORG-1 chip filters polish — library list works chronologically; filters arrive when v0.3.0 adds categories/tags

**Exit:** ✅ Smoke-tested: URL extraction pulls `<title>` + body via Readability; 18-page Lenny PDF extracts in 237 ms with stripped boilerplate; FTS5 returns correct hits for `growth`, `attention`, `velocity` queries; markdown export returns valid frontmatter + body.

### v0.3.0 — Intelligence ✅ **SHIPPED** 2026-05-07 (`5d1c390`)

| ID | Item | Status | Notes |
|---|---|---|---|
| DIG-1 | Auto-summary on ingest | **shipped** | `src/lib/enrich/pipeline.ts`; Qwen 2.5 7B via Ollama |
| DIG-2 | Key-quote extraction | **shipped** | Stored on `items.quotes`; migration `004` |
| DIG-3 | Dual-pane original / digest view | **shipped** | `src/app/items/[id]/page.tsx` |
| ORG-4 | Auto-category (14 buckets, Knowly taxonomy) | **shipped** | Locked in `src/lib/enrich/prompts.ts` |
| ORG-5 | Auto-title (semantic rewrite) | **shipped** | Quirk: slug-shaped titles from filename sources — fix queued as B-301 in v0.3.1 |
| ORG-6 | Auto-tag (3–8 tags) | **shipped** | Auto-tags land on `item_tags` with `kind='auto'` |
| ORG-7 | Manual tags + collections CRUD | **shipped** | `/settings/tags`, `/settings/collections` + `collection-editor.tsx` (unwired — F-301) |
| ORG-10 | Bulk operations on library | **partial → deferred** | Backend primitives exist; UI ships as F-207 in v0.3.1 |
| INT-2 | Bulk export JSON / MD | **shipped** | `/api/library/export.zip` (JSZip stream, Obsidian-ready) |

**Exit:** ✅ Enrichment worker processes queue end-to-end; dual-pane view renders; tag/collection CRUD functional via settings; bulk zip export works. F-207 multi-select UI + four UX polish items carried to v0.3.1.

### v0.3.1 — Polish + hardening ✅ **SHIPPED** 2026-05-08

All 17 work items closed with commit SHAs. Typecheck + lint + build + 24 unit tests + 16 smoke assertions all green at release. Tag `v0.3.1` on `main`. Only new dev dep: `tsx@^4.19.2`.

| ID | Item | Commit | Severity |
|---|---|---|---|
| F-207 | Library multi-select + bulk tag/collection/delete | `1f38423`, `844e741`, `f158c63` | — |
| F-301 | Wire `CollectionEditor` into item detail | `666cb14` | — |
| F-302 | Inline tag editor on item detail | `f2b0b0e` | — |
| B-301 | Title de-hyphenation post-processor (0 spaces && ≥2 hyphens rule) | `3c4b08c` | — |
| F-042 | Bind Next dev+start to `127.0.0.1` | `54bc92f` | **P0** |
| F-043 | Cookie expiry + `SameSite=Strict` + policy docs + 9 tests | `9431332` | P1 |
| F-044 | `globalThis` worker boot guard (HMR-safe) | `d4ae435` | P1 |
| F-045 | Periodic `sweepStaleClaims()` + `shouldSweep()` helper | `9cffda4` | P1 |
| F-046 | Expose `attempts` on enrichment-status endpoint + pill | `db01434` | P2 |
| F-047 | Log non-nodejs `instrumentation.ts` branch | `6316361` | P2 |
| F-048 | WAL + `synchronous=NORMAL` post-condition assertion | `0da8dcd` | P1 |
| F-034 | DB restore script + runbook (promoted from v0.10.0) | `7d4a259` | P1 |
| F-049 | Exact-pin `sqlite-vec@0.1.6` | `3bbf1a7` | P1 |
| F-050 | `data/errors.jsonl` 5MB-rotation sink in `handleFailure` | `1fd3b08` | P2 |
| F-051 | Adopt `node:test` + `tsx` + first tests for `shouldSweep` | `92e0d0f` | P1 |
| F-052 | `scripts/smoke-v0.3.1.mjs` + `npm run smoke` | `ce6de9c`, `f158c63` | P1 |
| F-053 | Bulk actions revalidate `/collections/[id]` + `/settings/tags` | rolled into `1f38423` | P1 |
| F-054 | Release guard: tree-clean + `git revert` rehearsal | ran as T-B-6 gate | P1 |
| F-055 | Per-task `RUNNING_LOG.md` breadcrumbs | applied throughout phase | P1 |
| F-056 | Refuse PIN overwrite without explicit reset flag | `6580a11` | P2 |

**Deliberately deferred from critique to v0.4.0:**
- A-8 FTS5 LIKE-fallback cleanup
- P-11 BACKLOG §5 archive rotation
- M-3 Cross-AI plan review (run `gsd-review` if available at v0.4.0 plan time)

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

### v0.5.0 — APK + extension *(scope expanded per self-critique)*

| ID | Item | Status | Notes |
|---|---|---|---|
| F-014 | Capacitor **8** integration + Android project (JDK 21) | planned | Validated v0.0.1; Capacitor 8.3.1 |
| F-015 | `capacitor.config.ts` with LAN server URL + `brain.local` mDNS | planned | Blocked by R-AUTH |
| F-016 | LAN token auth middleware + rate limiter (10/min) | planned | Blocked by R-AUTH; self-critique A-2 |
| F-017 | Build pipeline `npm run build:apk` | planned | |
| F-018 | Self-signed debug keystore; docs for `adb install` | planned | |
| F-035 | **mDNS `brain.local`** via `bonjour-service` on Mac | planned | Self-critique A-4; promoted from v0.10.0 (+2h) |
| F-036 | **CSRF / Origin header validation + `SameSite=Strict`** cookies | planned | Self-critique A-3 |
| F-037 | **Token rotation script** `scripts/rotate-token.sh` | planned | Self-critique A-1 |
| F-038 | **First-run token QR display** (`qrcode` + `qrcode-terminal`) | planned | Self-critique A-8 |
| F-039 | **Native file-stream upload path** (CapacitorHttp, avoid WebView heap) | planned | Self-critique C-5 |
| CAP-6 | Android share-sheet target via `@capgo/capacitor-share-target@^8.0.30` | planned | Plugin validated on AVD v0.0.1 |
| **F-041** | **Cold-start dedup window (2s)** on shareReceived | planned | New — discovered in v0.0.1 spike |
| F-019 | Mobile bottom-nav layout | planned | Per `DESIGN_SYSTEM.md` §7.2 |
| F-020 | Mac-unreachable offline screen | planned | Per `DESIGN_SYSTEM.md` §9 |
| CAP-5 | Chrome MV3 extension (popup + context menu) | planned | |
| **F-040** | **WebAuthn / TouchID unlock on web UI (STRETCH)** | stretch | Self-critique A-5; promoted from v0.10.0 (+1h) |

**Exit:** APK installed on Pixel; share URL from Chrome Android via `brain.local` → appears on Mac library in ≤2s. DHCP reassignment does NOT require APK rebuild. First-run token QR scan works. Desktop Chrome extension saves page to localhost. (Stretch: TouchID prompt replaces PIN on web UI.)

**Known v0.5.0 limitation:** Café / public Wi-Fi APK access is NOT supported (see self-critique A-6 / Q5 decision). Home Wi-Fi only in v0.5.0. Tailscale deferred to v0.10.0+ as optional day-2 add.

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
| ~~F-034~~ | ~~DB restore script + runbook~~ | **promoted to v0.3.1** | Self-critique A-7 — can't wait until v0.10.0 |

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

## 4. Lifecycle board (snapshot — 2026-05-08)

```
future (5)  →  backlog (0)  →  planned (70+)  →  in-progress (0)  →  shipped (48, through v0.3.1)
```

v0.3.1 closed 2026-05-08. No active phase until the R-VEC spike starts (blocks v0.4.0 Ask/RAG).

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

- **2026-05-08** — Inserted v0.3.1 Polish + hardening phase driven by [`docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md`](./docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md) (22 findings → 15 actionable work items F-042..F-056). F-034 (restore runbook) promoted from v0.10.0 → v0.3.1 per critique A-7. v0.3.0 Intelligence marked shipped at `5d1c390`. Cumulative estimate shifts from 15.0 → 15.6 weeks.
- **2026-05-08 (release)** — v0.3.1 SHIPPED. All 17 work items closed with commit SHAs. Tag `v0.3.1` on `main`. Lifecycle board: planned 70+ / in-progress 0 / shipped 48. Next lane: v0.4.0 Ask (RAG), blocked by R-VEC spike.
- 2026-05-07 — Created. All features placed in phase lanes. Lenny seed moved to `future` (FUT-1) per user decision.

---

**Rule of this doc:** changes to phase membership are recorded here *and* mirrored in `BUILD_PLAN.md` §4/§5. Drift between the two is a lint error.
