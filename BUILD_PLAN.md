# AI Brain — Build Plan

**App name:** **AI Brain**
**Document version:** v0.2.1-plan
**Date:** 2026-05-07
**Status:** Planning (pre-code). Re-opens the project closed on 2026-05-07 per `PROJECT_CLOSURE.md`.
**Changelog:**
- v0.2.1-plan — self-critique remediations: added 3-hour empirical sanity morning gate before v0.1.0; promoted mDNS (`brain.local`) to v0.5.0 scope; promoted WebAuthn/TouchID unlock to v0.5.0 stretch; added Claude API fallback $10/month default cap with clear cost framing; café-mode documented as known v0.5.0 limitation (Tailscale stays a v0.10.0+ day-2 add); added DB migrations pattern, auth rate-limiting, CSRF/Origin checks, token-rotation script. Companion doc: `docs/research/SELF_CRITIQUE.md`.
- v0.2.0-plan — added §15 Locked-in technical decisions (synthesis of R-LLM, R-PDF, R-CAP, R-AUTH research spikes). Concrete npm deps, Ollama model list, intent filters, env-var contracts, pipeline shapes.
- v0.1.1-plan — name locked to "Brain" (now "AI Brain"); removed Lenny-seed from v0.2.0 scope (deferred to post-v1.0.0 backlog); backup cadence made configurable with a 6-hour default; credit UX explicitly dropped; added reference to `DESIGN_SYSTEM.md` (sibling doc) for all UX decisions.
- v0.1.0-plan — initial plan.

---

## 0. One-sentence goal

Build a **100% local-first, single-user** knowledge app on my Mac that combines Recall.it's capture + SRS + graph strengths with Knowly's auto-organize + generative (GenPage/GenLink/Flow) strengths — shipped alongside a **sideloadable Android APK** that talks to my Mac over LAN. **No cloud deploy until v1.0.0.**

---

## 1. Hard constraints (non-negotiable)

| # | Constraint | Implication |
|---|---|---|
| C1 | 100% local. No Vercel, no Supabase cloud, no public URLs. | SQLite + Ollama on the Mac. No hosted auth. |
| C2 | No external LLM API by default. | Ollama is the default. API-key fallback to Claude is opt-in, behind a toggle, for quality ops only. |
| C3 | Android APK must be sideloadable. | Use Android Studio + `./gradlew assembleDebug` → unsigned/self-signed APK. No Play Store. |
| C4 | All features of Recall + Knowly, thoughtfully combined. | See §4 feature matrix. Phased delivery, not deferred indefinitely. |
| C5 | No deploy until a solid working product. | `v1.0.0` is the *earliest* point we revisit hosting. Everything before that runs on `localhost` / LAN IP. |
| C6 | Personal monorepo on GitHub `arunpr614` (per memory). | Per existing feedback memory — never the work GitHub. |

---

## 2. Architecture (v0.1.0–v0.10.0, pre-hosting)

### 2.1 Topology

```
┌─────────────────────────────── Laptop (Mac) ────────────────────────────────┐
│                                                                              │
│   Next.js 15 app  ◄──── localhost:3000 ────►  Browser (Chrome/Safari)       │
│        │                                                                     │
│        ├─► SQLite (better-sqlite3) ─── items, chunks, collections, cards    │
│        │      + sqlite-vec extension  ─── vector embeddings                 │
│        │                                                                     │
│        ├─► Ollama (localhost:11434) ─── Llama 3.2 / Qwen / nomic-embed      │
│        │                                                                     │
│        ├─► PDF parsing (pdfjs-dist)                                          │
│        ├─► Readability + jsdom       ─── URL → clean text                   │
│        ├─► yt-dlp (child process)    ─── YouTube transcript                 │
│        └─► Chrome extension (MV3)    ─── one-click save to localhost:3000   │
│                                                                              │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │  LAN (Wi-Fi), http://192.168.1.x:3000
                                 ▼
           ┌────────────────── Android phone ─────────────────┐
           │                                                   │
           │  Capacitor WebView → wraps same Next.js frontend │
           │  Plugin: share-target → URL/text/PDF → API       │
           │  Plugin: filesystem → PDF picker                 │
           │                                                   │
           └───────────────────────────────────────────────────┘
```

**Key decisions embedded above (with research flags in §7):**
- Single SQLite file holds *everything*: metadata, full text, embeddings, chunks, SRS cards, collections, chat history. Portable. Backupable with `cp`.
- Ollama is a separate process but on the same box — no network latency, no API cost.
- Android app is a **thin client**, not an embedded runtime. It needs the Mac reachable on LAN. If Mac is off → phone shows a cached read-only library (v0.5+ stretch).

### 2.2 Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 15 (App Router) + React 19 + TypeScript** | Same patterns Recall and Knowly use; SSR + server actions + streaming. |
| Styling | **Tailwind 4 + shadcn/ui** | Fastest path to a decent UI for a solo dev. |
| DB | **SQLite via `better-sqlite3`** | Single-file, zero-server, fast sync API. |
| Vector | **`sqlite-vec` extension** | Stays in the same SQLite file. No separate vector DB. |
| LLM runtime | **Ollama** | Single-binary local inference, hot-swap models, OpenAI-compatible API. |
| Default models | **`llama3.2:3b` (quality), `qwen2.5:7b` (heavier), `nomic-embed-text` (embeddings), `phi3.5:3.8b` (fast fallback)** | See §7 research item R-LLM. Actual choices depend on Mac RAM. |
| URL extraction | **`@mozilla/readability` + `jsdom`** | Battle-tested; runs in Node; no Python dep. |
| PDF extraction | **`pdfjs-dist` (text) + `pdf-parse` (fallback)** | Already used in Knowly/Recall import tooling. |
| YouTube | **`yt-dlp --write-auto-subs --skip-download`** via Node `execFile` | Reliable transcript extraction. |
| Auth | **None for localhost; token gate for LAN** | §3.5. |
| Mobile wrapper | **Capacitor 6** | Mature Android tooling; share-target plugin exists; WebView wrap means the Next.js UI is reused 1:1. |
| Mobile build | **Android Studio + Capacitor CLI** | `npx cap sync && ./gradlew assembleDebug` → unsigned debug APK, sideloadable. |
| Browser ext | **Vanilla MV3 extension** (later phase) | No React; just a popup + context menu → POST to localhost. |

### 2.3 Unified mental model (the "thoughtfully connected" part)

Every piece of content flows through the same pipeline:

```
CAPTURE  →  EXTRACT  →  ENRICH  →  STORE  →  SURFACE
  │           │           │          │          │
  ▼           ▼           ▼          ▼          ▼
URL/PDF    clean text   summary   SQLite    Library view
share      + metadata   category  + vec     Chat (RAG)
paste      + chunks     title     + cards   GenPage / Flow
screenshot             tags                 Review queue
note                   embeddings           Graph view
```

Every "feature" is either a **producer** (CAPTURE/ENRICH) or a **consumer** (SURFACE) of this pipeline. This is the single metaphor that keeps Recall's capture breadth + SRS + graph coherent with Knowly's auto-organize + generative features. No feature is added until it plugs into this pipeline.

---

## 3. Versioning scheme

We use **SemVer** with a milestone meaning:
- `v0.x.y` = pre-hosting, local-only. Breaking changes allowed.
- `v1.0.0` = first solid product. At this point we revisit hosting (PROJECT-level decision, not included below).
- Each `v0.x.0` maps to exactly one phase in §5.
- Patch bumps `v0.x.y` are bug-fix only.

The **app version** is stored in `package.json#version` and stamped into the Android APK's `versionName`. The **plan version** is at the top of this file and bumps whenever §5 changes.

---

## 4. Feature parity matrix (Recall ∪ Knowly)

Cross-referenced with `FEATURE_INVENTORY.md`. Column "Phase" = which `v0.x.0` ships it. Features with "—" = deferred past v1.0.0.

### 4.1 Capture

| # | Feature | Source | Phase |
|---|---|---|---|
| CAP-1 | Save URL (paste box) | both | v0.2.0 |
| CAP-2 | Save PDF (drag-drop, batch) | both | v0.2.0 |
| CAP-3 | Manual note (markdown editor) | both | v0.2.0 |
| CAP-4 | Save screenshot/image (OCR) | neither explicit | v0.2.0 (stretch) |
| CAP-5 | Chrome extension: one-click save | both | v0.5.0 |
| CAP-6 | Android share-sheet target | Recall | v0.5.0 |
| CAP-7 | YouTube transcript ingest | Recall | v0.10.0 |
| CAP-8 | Podcast ingest (RSS + Whisper) | Recall | v0.10.0 |
| CAP-9 | Twitter/X thread ingest | Recall | — |
| CAP-10 | Reddit thread ingest | Recall | — |
| CAP-11 | Email forwarding magic address | Recall | — (needs hosted SMTP) |
| CAP-12 | Kindle highlight import | Recall | — |
| CAP-13 | EPUB ingest | Knowly | v0.10.0 |
| CAP-14 | DOCX/RTF/ODT/Pages ingest | Knowly | v0.10.0 |
| CAP-15 | Import 1,131 Lenny PDFs as seed | Arun-specific | deferred (backlog; revisit post-v1.0.0) |

### 4.2 Organize

| # | Feature | Source | Phase |
|---|---|---|---|
| ORG-1 | Library list (chronological) | both | v0.1.0 |
| ORG-2 | Full-text search | both | v0.2.0 |
| ORG-3 | Semantic search | both | v0.4.0 |
| ORG-4 | Auto-category (14 buckets) | Knowly | v0.3.0 |
| ORG-5 | Auto-title (semantic rewrite) | Knowly | v0.3.0 |
| ORG-6 | Auto-tag | both | v0.3.0 |
| ORG-7 | Manual tags + collections | Recall | v0.3.0 |
| ORG-8 | Auto-collection / topic cluster | Knowly | v0.6.0 |
| ORG-9 | Smart filters (dynamic) | Knowly | v0.6.0 |
| ORG-10 | Bulk operations (multi-select) | Recall | v0.3.0 |

### 4.3 Consume (digest)

| # | Feature | Source | Phase |
|---|---|---|---|
| DIG-1 | Auto-summary on ingest | both | v0.3.0 |
| DIG-2 | Key-quote extraction | both | v0.3.0 |
| DIG-3 | Dual-pane original / digest view | Knowly | v0.3.0 |
| DIG-4 | Streaming AI responses | both | v0.4.0 |

### 4.4 Ask (RAG)

| # | Feature | Source | Phase |
|---|---|---|---|
| ASK-1 | Chat over library (RAG) | both | v0.4.0 |
| ASK-2 | Citation-grounded answers | both | v0.4.0 |
| ASK-3 | Per-item chat (scope to one source) | Recall | v0.4.0 |
| ASK-4 | Chat history persistence | both | v0.4.0 |

### 4.5 Generate (Knowly's territory)

| # | Feature | Source | Phase |
|---|---|---|---|
| GEN-1 | GenPage (AI-written page from sources) | Knowly | v0.6.0 |
| GEN-2 | GenLink (clickable-word sub-page) | Knowly — novel | v0.7.0 |
| GEN-3 | Flow (multi-step learning journey) | Knowly | v0.9.0 |
| GEN-4 | Proactive "Suggested for you" cards | Knowly | v0.9.0 |
| GEN-5 | "Summarize my recent saves" | Knowly | v0.6.0 |

### 4.6 Review (Recall's territory)

| # | Feature | Source | Phase |
|---|---|---|---|
| REV-1 | Auto-generate review cards | Recall | v0.8.0 |
| REV-2 | Spaced-repetition queue (SM-2 / FSRS) | Recall | v0.8.0 |
| REV-3 | Review stats / streak | Recall | v0.8.0 |
| REV-4 | Daily review reminder (local notif) | Recall | v0.8.0 |

### 4.7 Explore (graph)

| # | Feature | Source | Phase |
|---|---|---|---|
| EXP-1 | Knowledge graph data model | Recall | v0.6.0 |
| EXP-2 | Graph viz (d3-force or sigma.js) | Recall | v0.10.0 |
| EXP-3 | Related-items panel on item view | Recall | v0.4.0 |

### 4.8 Integrations / export

| # | Feature | Source | Phase |
|---|---|---|---|
| INT-1 | Export item as Markdown | Recall | v0.2.0 |
| INT-2 | Bulk export JSON / MD | Recall | v0.3.0 |
| INT-3 | Obsidian sync folder (write .md files) | Recall | v0.10.0 |
| INT-4 | Public share links | Recall | — (needs hosting) |
| INT-5 | Notion / Slack | Recall | — |

**Feature totals:** 47 distinct features identified. **v0.1.0–v1.0.0 ships 36** (77%). 11 are deferred past v1.0.0 — mostly integrations that require a hosted HTTPS endpoint or network email.

---

## 5. Phased roadmap (the walk-down)

**Time estimate is optimistic part-time** (Arun-hours assume ~1 focused evening / some weekend). Buffer is 30% — don't budget anyone else's time against these.

### v0.0.1 — Empirical Sanity Morning *(est. 3 hours, blocks v0.1.0)*

**Goal:** Convert the 4 desk-research spikes into measured reality on Arun's actual Mac before any production code lands. Output: `docs/research/EMPIRICAL_SANITY.md` with concrete numbers.

- (15 min) Install Ollama; `ollama pull qwen2.5:7b-instruct-q4_K_M`; run a 4 K-token prompt; record first-token latency and tok/s. (Addresses self-critique finding **L-1**, **X-1**.)
- (30 min) `npm init` a throwaway folder; `npm i unpdf`; run `extractText()` on 10 assorted Lenny PDFs (short, long, paywalled, illustrated); visually diff output against source posts; measure chars-per-page distribution. (Addresses **P-1**, **P-2**.)
- (60 min) Scaffold a throwaway Capacitor 6 project; install `@capawesome/capacitor-android-share-target`; create Pixel 9 API 35 AVD; build debug APK; test `text/plain` share intent (cold + warm start) and `application/pdf` share intent; verify end-to-end payload reaches a dev-server endpoint. (Addresses **C-2**, **C-4**, **C-6**.)
- (15 min) Verify WebAuthn platform authenticator works in local Chrome (quick Next.js hello-world with TouchID prompt). (Addresses **A-5**, unblocks v0.5.0 TouchID stretch.)
- (remainder, ~60 min) Author `docs/research/EMPIRICAL_SANITY.md` with measured numbers, photos of the AVD receiving a share, and a verdict per finding ("holds up" vs "needs remediation").

**Exit criteria:** EMPIRICAL_SANITY.md committed. If any measurement invalidates a §15 locked-in decision, update §15 and bump plan version before proceeding.

### v0.1.0 — Foundation *(est. 1 week)*

**Goal:** Empty app runs on `localhost:3000`, I can add a manual note and see it in a list.

- `scripts/setup.sh` — installs Ollama, pulls default models, installs sqlite-vec
- `next.config.js` — app-router, strict TS, Tailwind 4
- `src/db/schema.sql` — `items`, `chunks`, `item_embeddings` (virtual), `collections`, `tags`, `cards`, `chat_messages`, `settings`
- `src/db/client.ts` — better-sqlite3 singleton with `sqlite-vec` loaded
- `src/app/page.tsx` — library list view (chronological)
- `src/app/items/new/page.tsx` — "Add note" form (title + markdown body)
- `src/app/items/[id]/page.tsx` — item detail view
- Minimal local auth (§3.5): single-user session cookie, password set on first run
- `README.md` — how to run, backup DB, wipe DB

**Exit criteria:** I can add 3 notes, see them listed, click one, see its content.

---

### v0.2.0 — Capture core *(est. 1 week)*

**Goal:** URL + PDF + manual note all flow through the same capture pipeline and land in the library.

- `src/lib/capture/url.ts` — fetch URL, run Readability, extract title/author/text
- `src/lib/capture/pdf.ts` — pdfjs-dist text extraction, page count
- `src/lib/capture/pipeline.ts` — single entry point: `capture({source_type, payload})` → item row + chunks
- `src/app/capture/page.tsx` — unified capture UI: tabs for URL / PDF / Note / Paste
- `src/app/api/capture/route.ts` — POST endpoint (used by UI + later ext/APK)
- Full-text search (FTS5 virtual table) + search bar on library
- Markdown export endpoint `GET /api/items/[id]/export.md`

**Deferred from v0.2.0:** Lenny PDF seed import. Start empty; revisit after v1.0.0. Rationale: want a clean, real-usage baseline rather than a pre-loaded corpus. The importer logic lives in `../Lenny_Export/Knowly_import/` if/when needed.

**Exit criteria:** I paste any web URL, hit save, see it parsed in the library with clean title and full text. I drop a PDF, same. Full-text search finds keywords across items. `/api/items/[id]/export.md` returns valid markdown.

---

### v0.3.0 — Intelligence (summaries, categories, tags) *(est. 1.5 weeks)*

**Goal:** Every captured item is auto-summarized, auto-categorized, and auto-tagged on save. Library becomes browsable.

- `src/lib/llm/ollama.ts` — typed Ollama client (chat, embeddings, streaming)
- `src/lib/enrich/summarize.ts` — 3-paragraph summary + 5 key quotes
- `src/lib/enrich/classify.ts` — assigns one of 14 categories (reusing Knowly's taxonomy)
- `src/lib/enrich/title.ts` — semantic title rewrite
- `src/lib/enrich/tag.ts` — 3–8 tags
- Enrichment runs **async via a local queue** (`src/lib/queue.ts`, SQLite-backed) — capture returns fast, UI shows `enriching…` state, SSE updates when done
- Dual-pane view on item detail: original text | AI digest
- Manual tag editor; collections CRUD; bulk-tag multi-select on library

**Exit criteria:** 10 captured items each have summary + category + title + tags in ≤30 s total enrichment time. I can create a "AI safety" collection and assign items to it.

---

### v0.4.0 — Ask (RAG) *(est. 2 weeks)*

**Goal:** I can chat with my library. Answers cite which items they came from. Streams.

- `src/lib/chunking.ts` — semantic chunker (Markdown-aware, 400–800 tokens, 10% overlap)
- Re-chunk existing items via one-time migration
- `src/lib/embed.ts` — Ollama `nomic-embed-text`; batched; writes to `item_embeddings` (sqlite-vec)
- `src/lib/retrieve.ts` — hybrid: BM25 (FTS5) + vector; RRF fusion; top-k chunks
- `src/app/chat/page.tsx` — chat UI with streaming, citation chips
- `src/app/api/chat/route.ts` — SSE stream; sends retrieved context to Ollama
- Per-item chat mode: `/items/[id]/chat` restricts retrieval to one item's chunks
- `src/components/related-items.tsx` — on item view, show 5 nearest neighbors
- Chat history persists to `chat_messages` table

**Exit criteria:** "What did I save about growth loops?" returns a streamed answer with 3 citation chips, each linking to the item. Per-item chat mode works on one Lenny post. Related-items panel returns sensible neighbors.

---

### v0.5.0 — Android APK (sideload) + Chrome extension *(est. 1.5 weeks)*

**Goal:** I install a debug APK on my Pixel, share a URL from Chrome → it lands in my Mac library within 2 seconds.

- Add Capacitor: `npm i @capacitor/core @capacitor/android`, `npx cap init`, `npx cap add android`
- `capacitor.config.ts` — `server.url` resolves at build time: prefer `http://brain.local:3000` (mDNS), fall back to baked LAN IP
- **mDNS advertising** (scope promoted from v0.10.0 per self-critique A-4): `bonjour-service` npm pkg on the Mac advertises `brain.local` → survives DHCP IP changes without APK rebuild
- Plugin: `@capawesome/capacitor-android-share-target` — register intent filters for `text/plain` and `application/pdf`
- On share intent: open `/capture` with prefilled URL or uploaded PDF → POST to Mac
- **Large-PDF path (per self-critique C-5):** native Capacitor `Filesystem` + `CapacitorHttp` stream file directly to Mac's `/api/capture` — avoid WebView 256 MB heap limit
- Build: `npm run build:apk` → runs `next build` + `npx cap sync` + `./gradlew assembleDebug`
- Self-sign debug keystore; commit `keystore.debug.gpg` encrypted with passphrase; docs for `adb install`
- **LAN auth:** bearer token middleware + `BRAIN_BIND` env toggle (home/café); auto-generate + QR-display token on first `npm run dev` via `qrcode-terminal`
- **Auth rate limiter** (per self-critique A-2): 10 failed auth attempts per IP per minute → 429
- **CSRF / Origin validation** (per self-critique A-3): `SameSite=Strict` cookies; reject state-changing requests with missing or non-allowlisted `Origin` header
- **Token rotation script** (per self-critique A-1): `scripts/rotate-token.sh` regenerates token + stamps version into APK filename (`ai-brain-apk-v{token-id}.apk`)
- **LAN connectivity guards:** show "cannot reach Mac" screen with retry; don't crash; offline fallback HTML bundled in APK
- **Chrome extension (MV3)** — tiny popup + context menu "Save to AI Brain" → POSTs to `http://brain.local:3000/api/capture`; handles PDF page by downloading then uploading

**v0.5.0 stretch (per self-critique A-5):** WebAuthn / TouchID unlock on the web UI — platform authenticator; no password page on subsequent sessions. Estimated +1 day.

**Known v0.5.0 limitation (per self-critique A-6 / Q5 decision):** café / public Wi-Fi access for the APK is **not supported** in v0.5.0. Café mode = bind `127.0.0.1` only; phone loses access. For now Arun accesses AI Brain only on home Wi-Fi. Tailscale is the v0.10.0+ day-2 add that unlocks café access (30-min setup per device) — kept out of v0.5.0 to preserve scope and the "no third-party auth" posture.

**Exit criteria:** APK installed on phone, on same Wi-Fi as Mac. In Chrome Android I hit Share → "AI Brain" → URL appears on Mac library within 2 s using `brain.local`. DHCP reassignment doesn't require APK rebuild. In Desktop Chrome I hit the extension's pinned icon → current page is saved. First-run token QR scan works end-to-end.

---

### v0.6.0 — Generate: GenPage + auto-collections *(est. 2 weeks)*

**Goal:** AI writes persistent multi-section pages from my saved sources. Library starts auto-clustering into topics.

- `src/lib/generate/genpage.ts` — given a topic (user-typed or cluster name), retrieves top-N items, runs multi-step LLM prompt (outline → sections → polish), writes to `gen_pages` table
- `src/app/gen/page.tsx` — "New GenPage" UI: topic input, source preview, generate, edit
- GenPage viewer: sections, inline source citations, "regenerate section" button
- `src/lib/cluster/topics.ts` — embed items → HDBSCAN (via simple JS port or Python sidecar) → auto-name clusters via LLM
- Collections tab shows auto-clusters alongside manual ones
- **Home-page card:** "Summarize my recent saves" → generates a weekly digest GenPage

**Exit criteria:** I type "product-led growth" → GenPage with 4 sections and 12 citations renders in ≤2 min. Auto-clusters group my 1,116 Lenny posts into ~30 topics with sensible names.

---

### v0.7.0 — Generate: GenLink *(est. 1 week)*

**Goal:** Every word on a GenPage is clickable. Click → inline AI sub-page about that concept. This is Knowly's most novel primitive.

- Tokenize GenPage rendered output; wrap meaningful noun phrases in `<GenLink>` components (use spaCy-like noun-phrase extraction via LLM, cached per page)
- On click → slide-in panel → async-generate a mini-page scoped to that phrase, retrieving from *my* library (prefer local knowledge) with fallback to LLM parametric knowledge
- Cache sub-pages by `(genpage_id, phrase)` to avoid regeneration
- Recursive: GenLinks inside sub-pages also clickable

**Exit criteria:** On a rendered GenPage, clicking "activation energy" slides in a 3-paragraph sub-page citing the 2 Lenny posts where I saved that concept.

---

### v0.8.0 — Review (SRS) *(est. 1 week)*

**Goal:** Every new item spawns review cards. A daily queue surfaces the next 10 cards to review.

- `src/lib/srs/generate.ts` — on enrichment completion, LLM produces 3–5 Q&A cards per item
- `cards` table: `id, item_id, question, answer, ease, interval, due_at, state`
- **FSRS** (Free Spaced Repetition Scheduler) algorithm — modern successor to SM-2
- `src/app/review/page.tsx` — daily review UI with keyboard shortcuts (1/2/3/4)
- Stats: streak, retention %, due-today count
- Android local notification at 8am (via Capacitor LocalNotifications)

**Exit criteria:** Review 20 cards across 5 days; FSRS schedules intervals correctly; streak shows "5 days."

---

### v0.9.0 — Generate: Flow + Proactive *(est. 2 weeks)*

**Goal:** Multi-step learning journeys. Home page proactively surfaces what to explore.

- `src/lib/generate/flow.ts` — agent that plans a 5–10 step curriculum from library for a topic: each step has a title, a GenPage, 2 source items, 3 review cards
- `flows` + `flow_steps` tables; progress tracked per step
- `src/app/flow/[id]/page.tsx` — stepper UI, "next step" unlocks after reading
- Proactive "Suggested for you" home-page cards:
  - **Catch-up** — items saved >30 days ago, never opened
  - **Learn** — topics with 5+ items → suggest a Flow
  - **Discover** — auto-detect cross-cluster bridges (items that cite both cluster A and B)

**Exit criteria:** "Create a Flow on retention marketing" produces a 7-step journey using 14 of my items. Home page shows 3 relevant suggestion cards based on my library.

---

### v0.10.0 — Capture breadth + graph + Obsidian *(est. 2 weeks)*

**Goal:** Expand capture to YouTube/podcast/EPUB/DOCX. Knowledge graph viz. Obsidian sync.

- YouTube: `yt-dlp` transcript → summary pipeline → stored as item with `source_type=youtube`
- Podcast: RSS URL → download → whisper.cpp local transcription → ingest
- EPUB: `epub.js` → section-by-section import
- DOCX/RTF/ODT: `mammoth` / `pandoc` sidecar
- Graph viz: d3-force or sigma.js; nodes = items; edges = shared tags + semantic similarity > 0.8
- **Obsidian sync:** background job writes each item as `./vault/<category>/<slug>.md` with frontmatter (tags, source_url, created_at); two-way sync later
- **Hardening pass:** error boundaries, rate-limiting the queue, DB backup script (see §13 Backup policy)

**Exit criteria:** I paste a YouTube URL → transcript item lands + summary + cards. Graph shows ~1,200 items clustering visually. Obsidian vault in `./vault/` opens in Obsidian and reflects library 1:1.

---

### v1.0.0 — Solid-product gate (plan-level, not a phase) *(decision point, not a build)*

**Goal:** Decide whether to move off localhost.

This is **not** a dev phase — it's a checkpoint where we open a separate planning doc:
1. Daily-use check: have I used the app every day for the last 4 weeks?
2. Feature completeness: are 36/47 features live and stable?
3. Data confidence: has any item been lost? Has backup/restore been tested?
4. Hosting question: do I actually want this online? If yes, the hosting plan is a separate initiative (Vercel + Supabase, or Fly.io + Postgres, or self-hosted VPS). The app's architecture is built to migrate — SQLite → Postgres is mechanical.

**Until v1.0.0 passes all four, we do not deploy.**

---

## 6. Cumulative timeline

| Phase | Est. weeks | Cumulative |
|---|---|---|
| v0.1.0 Foundation | 1.0 | 1.0 |
| v0.2.0 Capture core | 1.0 | 2.0 |
| v0.3.0 Intelligence | 1.5 | 3.5 |
| v0.4.0 Ask (RAG) | 2.0 | 5.5 |
| v0.5.0 APK + extension | 1.5 | 7.0 |
| v0.6.0 GenPage + clusters | 2.0 | 9.0 |
| v0.7.0 GenLink | 1.0 | 10.0 |
| v0.8.0 Review (SRS) | 1.0 | 11.0 |
| v0.9.0 Flow + proactive | 2.0 | 13.0 |
| v0.10.0 Breadth + graph + Obsidian | 2.0 | 15.0 |
| **Total to v0.10.0 → v1.0.0 gate** | **15 weeks (~4 months part-time)** | |

Compare: STRATEGY.md predicted "6–12 months part-time for full Recall+Knowly clone." This plan delivers ~77% of that at 4 months because we skip cloud infrastructure, auth hardening, billing, and multi-user. All three were the slow parts.

---

## 7. Research tasks (what we must resolve *before* v0.1.0 ships)

These are real unknowns; each has a deliverable. None blocks v0.1.0 itself but several block phases 0.4–0.10.

| ID | Research question | Blocks phase | Expected output |
|---|---|---|---|
| **R-LLM** | What Ollama models will run well on my Mac? (Need RAM/chip.) | v0.3.0 | `docs/research/llm-sizing.md` — benchmark of 3–4 candidate models on my machine: tokens/sec, summary quality score, embedding quality. |
| **R-CAP** | Does `@capawesome/capacitor-android-share-target` still work on Android 14? Alternatives? | v0.5.0 | `docs/research/android-share.md` — small spike APK that receives a share intent and logs the URL. |
| **R-VEC** | Is sqlite-vec performant enough at 10k+ chunks? | v0.4.0 | `docs/research/vector-bench.md` — insert 10k dummy embeddings, measure top-10 query p50. |
| **R-PDF** | pdfjs-dist vs pdf-parse vs pdfplumber on messy Substack PDFs (since some Lenny PDFs are truncated/paywalled per existing memory). | v0.2.0 | `docs/research/pdf-extraction.md` — 10-file comparison, pick winner. |
| **R-FSRS** | Pick SRS: SM-2 vs FSRS vs custom. | v0.8.0 | `docs/research/srs-algorithm.md` — short decision memo + library pick. |
| **R-CLUSTER** | Topic clustering: HDBSCAN in JS vs Python sidecar vs pure-LLM labeling. | v0.6.0 | `docs/research/clustering.md` — prototype run on 100 items, quality eval. |
| **R-AUTH** | Local auth: what stops someone on my LAN from hitting localhost:3000? | v0.5.0 | `docs/research/lan-auth.md` — choose between device-bound token, Tailscale, or localhost-only-with-SSH-tunnel. |
| **R-YT** | yt-dlp reliability + legal framing for personal use. | v0.10.0 | `docs/research/youtube.md` — does yt-dlp still work on auto-subs in 2026? Fallback? |
| **R-WHISPER** | whisper.cpp vs faster-whisper for podcast transcription on my Mac. | v0.10.0 | `docs/research/whisper.md` — 30-min podcast benchmark. |

**Recommendation:** spend **3–5 focused days on R-LLM + R-CAP + R-PDF + R-AUTH before touching v0.1.0**. These four can kill the architecture if answered badly.

---

## 8. Auth model (the "no deploy" loophole)

The single hardest constraint interaction: *"100% local"* vs *"Android APK on LAN."* LAN is not the public internet but it is *not* just me. Risk model:

| Threat | Mitigation (v0.5.0) |
|---|---|
| Roommate on same Wi-Fi hits `http://my-mac.local:3000` | `DEVICE_TOKEN` env set on Mac; APK bakes same token; every request sends `Authorization: Bearer <token>`. 401 without it. |
| Mac taken to café on public Wi-Fi | Default bind to `127.0.0.1` + a single `LAN_MODE=true` env toggle that binds `0.0.0.0`. Toggle off when not at home. |
| APK reverse-engineered, token leaked | Rotate token; APK must be rebuilt; acceptable for a personal tool. |
| MITM on LAN (unlikely but possible) | v0.5.0: accept plain HTTP. v0.10.0 hardening: self-signed cert + APK pinned. |

Not fortress-grade. Fine for a personal tool. Documented honestly.

---

## 9. Risks & kill-switches

| Risk | Kill-switch |
|---|---|
| Local LLM quality too poor for RAG | Opt-in Claude API toggle in settings; ASK pipeline swaps provider behind an interface. |
| Capacitor share-target plugin abandoned | Fallback: write 50 lines of native Kotlin in the generated `android/` project. Capacitor lets us edit native code. |
| sqlite-vec can't hit 10k chunks performantly | Swap to LanceDB (still file-based, no server); retrieval code is isolated behind `src/lib/retrieve.ts`. |
| 1,116 Lenny PDF seed floods the queue | Seed script has a `--limit N` flag; enrichment runs idle-priority. |
| Scope creep → never shipping v0.4.0 | Strict rule: no feature added to a phase once that phase's exit criteria are written. New ideas → `BACKLOG.md`. |
| Side project fatigue at week 8 | v0.5.0 (APK + share) is deliberately placed mid-roadmap so there's a "woohoo I'm using it on my phone" motivational win before the grind of GenLink/Flow. |

---

## 10. Directory layout (target, v0.1.0)

```
Arun_AI_Recall_App/
├── BUILD_PLAN.md              ← this file
├── STRATEGY.md                ← existing research (keep)
├── FEATURE_INVENTORY.md       ← existing (keep)
├── PROJECT_CLOSURE.md         ← existing (keep; note: re-opened as of BUILD_PLAN v0.1.0)
├── BACKLOG.md                 ← ideas deferred past current phase
├── README.md                  ← run instructions
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── src/
│   ├── app/                   ← Next.js routes
│   ├── components/
│   ├── db/
│   │   ├── schema.sql
│   │   ├── client.ts
│   │   └── migrations/
│   ├── lib/
│   │   ├── capture/
│   │   ├── enrich/
│   │   ├── llm/
│   │   ├── generate/
│   │   ├── retrieve.ts
│   │   ├── srs/
│   │   └── queue.ts
│   └── types/
├── scripts/
│   ├── setup.sh
│   ├── import-lenny.ts
│   ├── backup.sh
│   └── build-apk.sh
├── android/                   ← Capacitor-generated (v0.5.0)
├── extension/                 ← Chrome MV3 (v0.5.0)
├── docs/
│   └── research/              ← R-* outputs
├── vault/                     ← Obsidian sync target (v0.10.0)
└── data/
    ├── mnemos.sqlite          ← .gitignored
    └── backups/               ← .gitignored
```

---

## 15. Locked-in technical decisions (post-research, 2026-05-07)

These are the concrete, committed choices synthesized from the 4 P0 research spikes (`docs/research/`). Each block cites its research ID. **Do not change without re-running the linked spike.**

### 15.1 Local LLM stack *(source: R-LLM)*

**`ollama pull` list for v0.1.0 setup:**
```
ollama pull qwen2.5:7b-instruct-q4_K_M        # primary: summarize, classify, RAG chat
ollama pull qwen2.5:14b-instruct-q4_K_M       # heavy ops: GenPage, Flow (load on demand)
ollama pull phi3.5:3.8b-instruct-q4_K_M       # fast fallback: noun-phrase extraction, SRS cards
ollama pull nomic-embed-text                  # embeddings (768-dim, 8K ctx)
```

**Disk footprint:** ~17.7 GB (3.9% of 455 GB free). **Ruled out:** `llama3.3:70b` — needs ~44 GB RAM, exceeds the 32 GB envelope.

**Expected throughput (M1 Pro, Metal):** 7B Q4_K_M ≈ 32–38 tok/s generation, 200+ tok/s prompt processing. First token in RAG chat: ~1.5–2 s. Summarize-on-ingest: ≤15 s per item.

**Ollama env defaults** (set in `~/.ollama/config` or launch env):
```
OLLAMA_MAX_LOADED_MODELS=1        # swap models; 32 GB can't hold 7B + 14B + embed simultaneously
OLLAMA_FLASH_ATTENTION=1
OLLAMA_KV_CACHE_TYPE=q8_0         # halves KV cache memory with negligible quality loss
OLLAMA_KEEP_ALIVE=10m             # active chat keeps model hot; idle unload after 10 min
```

**Per-workload `num_ctx` / `num_predict`:**
| Workload | Model | num_ctx | num_predict | keep_alive |
|---|---|---|---|---|
| Summarize on ingest | qwen2.5:7b | 8192 | 800 | 5m |
| RAG chat | qwen2.5:7b | 8192 | 1500 (streaming) | 10m (while chat open) |
| Noun-phrase (GenLink) | phi3.5 | 2048 | 200 | 2m |
| GenPage generate | qwen2.5:14b | 16384 | 2500 | 5m (unload after) |
| Flow plan | qwen2.5:14b | 16384 | 3000 | 5m (unload after) |
| Embed chunks | nomic-embed-text | 8192 | — | 30m |

**API fallback toggle:** `settings.llm.api_fallback.enabled = false` by default. When enabled, heavy ops swap to `claude-haiku-4-5` (fast/cheap) or `claude-sonnet-4-5` (quality). Requires `ANTHROPIC_API_KEY` in `.env`. Never used for embeddings (cost compounds with corpus size).

**API cost cap (per self-critique X-3):**
- `settings.llm.api_fallback.monthly_cap_usd` — default **$10.00**
- Usage tracked in SQLite table `llm_usage` (per-call tokens + cost); tallied per calendar month
- Soft cap: at 80% of budget, Settings badge goes amber; at 100%, fallback disables automatically until next month
- Hard cap: a single request cannot exceed 5% of the monthly cap (prevents a stuck loop)
- **What $10 buys (Anthropic published pricing):** ~1,000 Haiku chat queries (33/day), OR ~125 Sonnet GenPage regenerations (4/day), OR any mix. Default path stays local Ollama (free) — the cap exists so a bug can't silently run up a bill.
- Live "Spent $X.YZ this month" indicator in `/settings/ai-provider`

### 15.2 PDF extraction *(source: R-PDF)*

**Dependencies (npm):**
```json
{
  "unpdf": "^1.6.2"
}
```

**Optional system dep** (for column-heavy PDFs like arxiv): `brew install poppler` — detected at runtime; when present and primary extractor returns `<200 chars/page`, fall back to `pdftotext` via `child_process`.

**Extraction pipeline (v0.2.0, in `src/lib/capture/pdf.ts`):**
```
PDF file → unpdf.extractText({ mergePages: false })
        → capture { totalPages, text[] }
        → if totalPages > 3 && avg chars/page < 500
            → flag extraction_warning = "possible_paywall_truncation_or_scan"
            → if poppler available: retry via pdftotext
        → unpdf.getMeta({ parseDates: true }) → {title, author, creationDate}
        → chunks
```

**Deferred to future R-OCR spike:** scanned-PDF OCR via `tesseract.js` v7. Don't block v0.2.0.

### 15.3 Android share-sheet + APK *(source: R-CAP)*

**Plugin choice (v0.5.0):**
```json
{
  "@capacitor/core": "^6.x",
  "@capacitor/android": "^6.x",
  "@capawesome/capacitor-android-share-target": "^6.x"
}
```

**Intent filters** registered in `android/app/src/main/AndroidManifest.xml`:
- `ACTION_SEND` + `text/plain` → URLs and shared text
- `ACTION_SEND` + `application/pdf` → PDF share
- `ACTION_SEND` + `image/*` → screenshot capture (v0.2.0 stretch)
- `ACTION_SEND_MULTIPLE` + `application/pdf` → bulk PDF share

**Cold-start gotcha (must implement):** on app mount in `app/layout.tsx`, call `ShareTarget.getLastShareData()` once — the plugin queues the intent before the JS listener is attached; the listener alone misses cold-start shares.

**Build pipeline** (`scripts/build-apk.sh`):
```
npm run build                            # Next.js static export
npx cap sync android
cd android && ./gradlew assembleDebug    # unsigned debug APK
# output: android/app/build/outputs/apk/debug/app-debug.apk
```
Install via `adb install` on Pixel with "Install unknown apps" toggled on for the file manager or adb source.

**Fallback plan:** if plugin breaks, ~50 lines of Kotlin in `android/app/src/main/java/.../ShareTargetActivity.kt` + a thin custom Capacitor plugin bridge. Sketched in `docs/research/android-share.md` §8.

**LAN URL at build time:** `capacitor.config.ts` reads `BRAIN_LAN_URL` env var (e.g., `http://192.168.1.47:3000`). Mac's LAN IP is auto-detected by a pre-build script and stamped into the APK.

### 15.4 LAN auth + binding *(source: R-AUTH)*

**v0.5.0 implementation:**
- On first `npm run dev`: if `BRAIN_TOKEN` missing from `.env`, generate 32-byte random hex, write to `.env`, print **and display as QR** in terminal.
- Middleware (`src/middleware.ts`): every non-static route requires `Authorization: Bearer <token>` header OR valid session cookie. Missing → redirect to `/unlock` PIN page (web) or 401 (API).
- APK bakes token at build time from `BRAIN_TOKEN` env var (read by the Capacitor build script).
- Web UI session: first-run unlock page accepts the token (scan QR or paste); issues an HMAC-signed session cookie valid 30 days.
- **Binding toggle:**
  - `.env` `BRAIN_BIND=0.0.0.0` → LAN reachable (default at home)
  - `.env` `BRAIN_BIND=127.0.0.1` → localhost only (café mode)
  - Script `scripts/toggle-bind.sh home|cafe` flips it + restarts dev server.

**v0.5.0 stretch (per self-critique A-5):** WebAuthn / TouchID platform-authenticator unlock on the web UI. Fallback to PIN when no platform authenticator is present. Credential stored in macOS keychain via WebAuthn.

**v0.5.0 scope (per self-critique A-4):** mDNS hostname — `bonjour-service` npm pkg on the Mac advertises `brain.local`. APK and Chrome extension prefer `brain.local`, fall back to baked LAN IP. This removes the DHCP-reassignment rebuild problem.

**v0.5.0 additions (per self-critique A-1, A-2, A-3, A-8):**
- `scripts/rotate-token.sh` — regenerate `.env` token + stamp token-id into `ai-brain-apk-v{id}.apk` filename so Arun knows which APK pairs with which token
- Auth middleware rate-limit: 10 failed attempts per IP per minute → 429 (simple in-memory map; no external dep)
- Cookie policy: `SameSite=Strict; HttpOnly`; Origin-header allowlist on state-changing requests; CSRF token in a non-cookie header for any form POST
- `qrcode` + `qrcode-terminal` npm deps — first-run token display in terminal

**v0.10.0 hardening** (still deferred):
- QR-pairing flow replacing manual token paste — per-device revocable tokens stored in device keychain
- Tailscale integration for café mode (replaces binding toggle)

### 15.5 Data & vector stack *(source: architectural decision, not spiked)*

Confirmed ahead of R-VEC (benchmark deferred to v0.4.0):
```json
{
  "better-sqlite3": "^11.x",
  "sqlite-vec": "^0.1.x"
}
```
Single SQLite file at `data/brain.sqlite` carries all state: items, chunks, embeddings (sqlite-vec virtual table), collections, tags, cards, chat_messages, settings, `llm_usage`, `_migrations`. Backup = `VACUUM INTO data/backups/<ts>.sqlite`.

**Migrations pattern (per self-critique X-4):**
- Directory: `src/db/migrations/NNN_description.sql` (e.g., `001_initial_schema.sql`, `002_add_llm_usage.sql`)
- Runner: `src/db/client.ts` tracks applied migrations in a `_migrations` table (`id INTEGER PK, name TEXT, applied_at INTEGER`)
- Applied automatically on server start in order; refuses to start if a migration fails
- Never edit an applied migration — always add a new one
- Enables schema evolution v0.1.0 → v0.4.0+ without losing captured items

### 15.5 Data & vector stack *(source: architectural decision, not spiked)*

Confirmed ahead of R-VEC (benchmark deferred to v0.4.0):
```json
{
  "better-sqlite3": "^11.x",
  "sqlite-vec": "^0.1.x"
}
```
Single SQLite file at `data/brain.sqlite` carries all state: items, chunks, embeddings (sqlite-vec virtual table), collections, tags, cards, chat_messages, settings. Backup = `cp data/brain.sqlite data/backups/<ts>.sqlite` (via `VACUUM INTO` for consistency while running).

### 15.6 Framework + UI stack *(source: architectural decision + DESIGN.md)*

```json
{
  "next": "^15.x",
  "react": "^19.x",
  "typescript": "^5.x",
  "tailwindcss": "^4.x",
  "@radix-ui/react-*": "latest",
  "lucide-react": "latest",
  "zod": "^3.x"
}
```
shadcn/ui components copy-owned into `src/components/ui/`. All token values come from `DESIGN.md` frontmatter mirrored to `src/styles/tokens.css` CSS variables.

### 15.7 Update cadence

This section is rewritten when any R-* spike re-runs. Version bumps trigger a corresponding `BUILD_PLAN.md` minor version in §0 changelog.

---

## 13. Backup policy (configurable)

**Default:** automatic SQLite snapshot every **6 hours** to `./data/backups/YYYY-MM-DD_HHMM.sqlite`. Retention: last 28 snapshots (≈1 week). Configurable in Settings UI and via `settings.backup.interval_hours`, `settings.backup.retention_count`.

- Snapshot method: `VACUUM INTO` (creates a consistent copy while Brain keeps running)
- Scheduler: in-process `setInterval` backed by `node-cron` when Next.js server is running; no backup runs when server is off (acceptable for personal tool)
- Manual "Back up now" button in Settings
- Restore: `scripts/restore.sh <path>` stops server, swaps DB, restarts
- Off-machine copy (stretch, v0.10.0): optional rsync target (`settings.backup.rsync_target`) to iCloud Drive path or external disk

**Configurable dimensions:**
- `interval_hours` (default 6, min 1, max 168)
- `retention_count` (default 28, min 3, max 500)
- `enabled` (default true)
- `rsync_target` (default null)

## 14. Design system reference

All UX, color tokens, typography, component library choices, motion rules, and accessibility baselines live in **`DESIGN_SYSTEM.md`** (sibling document). Build phases must conform to it. Any new screen or component starts from tokens and components defined there — not ad-hoc styling in feature code.

---

## 11. Immediate next actions (ordered)

1. **Confirm this plan.** Edits to §4/§5 scope land here before any code.
2. **Capture Mac specs** for R-LLM sizing (chip, RAM, free disk).
3. **Run R-LLM, R-CAP, R-PDF, R-AUTH spikes** — 3–5 days. Output lands in `docs/research/`.
4. **Init repo** on `github.com/arunpr614/mnemos` (private). Push BUILD_PLAN.md + research outputs as commit 1.
5. **v0.1.0 phase 1 kickoff** — scaffolding, schema, library list, single-user auth.

---

## 12. Open questions for the author (me, Arun)

Resolved (v0.1.1-plan):
- ✅ **App name:** Brain.
- ✅ **Seed corpus:** Deferred — start empty. Lenny import moves to future backlog.
- ✅ **Credit UX:** Dropped. Local has no inference cost to ration.
- ✅ **Backup cadence:** Configurable, default every 6 hours (see §13).

Still open before v0.2.0:
1. **How much do I want to write myself vs. full AI-assisted codegen?** (Affects pairing style and review cadence.)
2. **Mac hardware details** (chip + RAM) — needed for R-LLM model sizing.

---

**End of plan. Version: v0.1.0-plan. Next doc rev bumps when §5 scope changes.**
