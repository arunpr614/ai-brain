# Recall.it + Knowly — Complete Feature Inventory

**Date:** 2026-05-07
**Purpose:** Comprehensive, side-by-side catalog of every feature shipped by Recall.it (getrecall.ai) and Knowly (goknowly.ai) as of May 2026. Built as a reference artifact for the closed `Arun_AI_Recall_App` project — kept in case the decision ever flips back to "build."

**Sources:**
- Landing pages and pricing pages (`goknowly.ai`, `getrecall.ai`, `chromewebstore.google.com`)
- `../Lenny_Export/Knowly_Analysis.md` (3,100-word competitive teardown, May 2026)
- `../Lenny_Export/Knowly_import/FINDINGS.md` (API-level observations from building an importer)
- `../Lenny_Export/Recall_import/FINDINGS.md` (browser-automation-level observations from building an importer)
- `../Lenny_Export/Knowly_import/PROJECT_SUMMARY.md` (operational learnings from importing 1,135 files into Knowly)

Where a claim is observational (from our own import tooling), it's marked ✓ **observed**. Where a claim is from landing-page copy, it's marked 📣 **advertised**. Where inferred, marked ❓ **inferred**.

---

## 1. Top-line positioning

| Dimension | Recall.it | Knowly |
|---|---|---|
| Tagline | *"Recall everything you've saved."* | *"From Saved to Understood."* |
| Primary metaphor | Memory / spaced-repetition layer | Proactive AI companion |
| Differentiator claim | Knowledge graph + SRS | *"Karpathy LLM Wiki + NotebookLM, closed-loop, proactive"* |
| Stage | Mature (years of development) | Very early (v0.0.18, 226 Chrome installs as of 2026-05-06) |
| Team | Not publicly detailed | 2–10 at AINTERACT PTE. LTD., Singapore |
| Stack hints | Firebase Auth + undocumented REST API | Clerk auth + Railway + Next.js + GPT-5 + Gemini ✓ observed |

---

## 2. Capture (getting content in)

### Recall.it

| Feature | Details | Evidence |
|---|---|---|
| Chrome extension | One-click save from any webpage | 📣 advertised; ✓ observed in Recall_import |
| Mobile apps (iOS + Android) | Share-sheet save from mobile browsers | 📣 advertised |
| YouTube video capture | Extracts transcript, summarizes | 📣 advertised |
| Podcast capture | Transcript + summary | 📣 advertised |
| PDF upload | Drag-drop or click to browse; **batch of 10 at once** | ✓ observed |
| Web article extraction | Save URL → clean text, title, author | 📣 advertised |
| Twitter / X thread save | Designated format for social threads | 📣 advertised |
| Reddit post save | Preserves comment chains | 📣 advertised |
| Email forwarding | Forward any email to a magic address | 📣 advertised |
| Book imports | Kindle highlights + Goodreads | 📣 advertised |
| Max PDF size | Not explicitly stated; 100 MB ceiling observed in our tool | ✓ observed |

### Knowly

| Feature | Details | Evidence |
|---|---|---|
| Chrome extension | One-click save from browsing (the most-prompted CTA) | 📣 advertised; CWS listed |
| Web upload dialog | `/info-hub` → "Add Source" button → drag-drop or browse | ✓ observed |
| Supported file types | PDF, DOCX, DOC, RTF, ODT, Pages, EPUB, PPTX, PPT, ODP, Key, XLSX, XLS, ODS, Numbers, CSV, MD, Markdown, TXT | ✓ observed (from `accept` attribute) |
| Single-file uploads only | `multiple=false` on file input — no batch | ✓ observed |
| Max file size | 16 MB confirmed working; no documented ceiling | ✓ observed (uploaded 16.1 MB PDF) |
| YouTube / podcast / transcript | **Not shipped** based on `accept` attribute and landing-page review | ❓ inferred absence |
| Mobile apps | **Not shipped** — web + Chrome extension only | 📣 advertised (recommends Chrome extension for mobile) |
| Auto-categorization | On ingest, assigns content category (Newsletter, Podcast Episode, Blog Post, Tutorial, etc.) | ✓ observed (14 categories seen) |
| Auto-titling | Rewrites filename → semantic title (e.g. `discussion-whats-your-products-primary.pdf` → *"Minimal Substack PDF With Footer Only"*) | ✓ observed |

**Delta:** Recall captures ~11 source types; Knowly captures ~16 file formats but does **not** capture YouTube / podcasts / social threads / emails. Recall is broader at ingest; Knowly is narrower but processes richer documents.

---

## 3. Organization & library

### Recall.it

| Feature | Details |
|---|---|
| Collections / folders | Manual organization |
| Auto-tags | AI-generated tags on ingest |
| Knowledge graph | Auto-links related items; visual graph view |
| Full-text search | Across all saved content |
| Semantic search | Embedding-based |
| Filters | By source type, date, collection, tag |
| Bulk operations | Multi-select → move / tag / delete |

### Knowly

| Feature | Details | Evidence |
|---|---|---|
| Auto-Library | Automatic topic clustering on save; no manual tagging | 📣 advertised; ✓ observed ("1 item auto-organized into AI Workday Automation") |
| Collections (auto-created) | Knowly names and populates them automatically | ✓ observed |
| Category assignment | AI classifies into Newsletter / Blog Post / Podcast Episode / Tutorial / Case Study / Reference / Announcement / Data Report / Social Post / Forum Discussion / Video Page / Landing Page / General | ✓ observed |
| Smart Filters | Dynamic filter sets the AI creates for your library | 📣 advertised; ❓ content of the /smart-filters/ endpoint not fully audited |
| Organized-by-Knowly view | The auto-organize tab | ✓ observed |
| Recent view | Chronological feed | ✓ observed |
| Category view | Grouped by content_category | ✓ observed |
| Origin view | Grouped by source URL domain | ✓ observed |

**Delta:** Recall's organization is "you can organize if you want, AI helps." Knowly's is "AI organizes, you consume." Knowly has no manual folders; Recall has both manual + auto.

---

## 4. AI generation (the value-add layer)

### Recall.it

| Feature | Details |
|---|---|
| AI summaries on save | Short summary auto-generated |
| Ask questions across library | RAG Q&A over corpus |
| Chatbot | Conversational interface |
| Highlights | Server extracts key quotes |
| Spaced-repetition prompts | SRS-style review cards auto-generated |
| Mind maps (newer) | Auto-generated visual concept maps |

### Knowly

| Feature | Details | Evidence |
|---|---|---|
| **GenPage** | AI-generated multi-section pages written from your saved sources; persistent, viewable, editable | 📣 advertised |
| **GenLink** | Every word on a GenPage is clickable; click generates a sub-page exploring that term | 📣 advertised; the truly novel primitive |
| **Flow** | Multi-page guided learning journey — a mini-curriculum assembled from your library | 📣 advertised; top-right "Start a Flow" CTA on every page |
| Digest (dual-pane view) | Original source + AI digest side-by-side | 📣 advertised |
| Ask Knowly | Chat box: "Ask Knowly anything — explore, learn, or research any topic" | ✓ observed |
| Sources never explored | Prompt / suggestion: "items you saved but haven't explored in a Flow" | ✓ observed |
| Summarize my recent saves | One-click summary of latest additions | ✓ observed |
| Suggested for you | Proactive recommendation cards (Catch-up / Learn / Discover) | ✓ observed |

**Delta:** Recall's AI layer is primarily *reactive* (you ask, it answers) plus SRS for memory. Knowly's is *proactive* (surfaces suggestions) plus generative (GenPage, Flow create persistent structured artifacts from your sources). The "closed-loop, proactive" framing is real.

---

## 5. Review / retention / learning

### Recall.it

| Feature | Details |
|---|---|
| Spaced-repetition review | Daily review queue; forgetting-curve-based scheduling |
| Review cards | Auto-generated from sources |
| Stats | Retention rate, review streak |
| Reminders | Email / push reminders to review |

### Knowly

| Feature | Details | Evidence |
|---|---|---|
| Spaced-repetition | **Not shipped** | ❓ inferred absence |
| Scheduled reviews | Not shipped | ❓ |
| "Catch-up" suggestions | Substitute for SRS: reminders to revisit old collections | ✓ observed (home-page card) |
| Flow re-engagement | Suggest exploring in a Flow | ✓ observed |

**Delta:** SRS is Recall's whole differentiator category. Knowly doesn't compete here. If memory is the job-to-be-done, Recall wins.

---

## 6. Search & retrieval

| Feature | Recall.it | Knowly |
|---|---|---|
| Full-text search | ✅ | ✅ (Cmd+K) ✓ observed |
| Semantic search | ✅ | ✅ (part of Ask Knowly) |
| Search filters (date / source / tag) | ✅ | ✅ |
| Cross-source citation in answers | ✅ | ✅ (part of Ask Knowly's RAG) |
| Search history | ✅ | Unknown |
| Saved searches | ❓ | ❓ (Smart Filters may cover this) |

Both products have mature search. Parity.

---

## 7. Integration & sharing

### Recall.it

| Feature | Details |
|---|---|
| Public share links | Share a summary or note publicly |
| Export | JSON / Markdown |
| API | Undocumented REST API (`backend.getrecall.ai/api/v1/*`), Bearer key auth ✓ observed |
| Obsidian integration | One-way sync |
| Notion integration | Embed |
| Slack integration | Unclear / experimental |

### Knowly

| Feature | Details | Evidence |
|---|---|---|
| Public share | **Not shipped** (visibility defaults to `private`) | ✓ observed (`access.visibility: "private"` in API response) |
| Export | No documented export pathway | ❓ |
| API | Undocumented REST at `knowly-core-production.up.railway.app`; Clerk JWT Bearer auth | ✓ observed |
| Webhooks / Zapier | **Not shipped** | ❓ |
| Obsidian / Notion / Slack | **Not shipped** | ❓ |

**Delta:** Recall integrates outward; Knowly is self-contained. For a "connect to my existing tools" user, Recall is notably ahead.

---

## 8. Platforms

| Platform | Recall.it | Knowly |
|---|---|---|
| Web app | ✅ | ✅ (`goknowly.ai/my-knowly`) |
| Chrome extension | ✅ | ✅ |
| Firefox extension | ✅ | ❓ unclear |
| Safari extension | ✅ | ❌ |
| iOS app | ✅ | ❌ |
| Android app | ✅ | ❌ |
| Desktop apps | ❌ | ❌ |

**Delta:** Recall has multi-platform maturity. Knowly is **web + Chrome extension only** as of May 2026 — mobile is not shipped.

---

## 9. Pricing

### Recall.it (as of 2026)

| Tier | Price | Allotment |
|---|---|---|
| Free | $0 | Limited AI / limited saves |
| Pro | ~$10/mo | Unlimited basics, standard AI |
| Higher tier | ~$15-20/mo | Priority model access, higher limits |

(Exact numbers drift; the user has both Recall and Knowly paid accounts per context.)

### Knowly

| Tier | Price | Monthly credits (with founding bonus) |
|---|---|---|
| Free | $0 | 1,000 + 1,000 bonus = 2,000 |
| Basic | $9.99 | 10,000 + 10,000 = 20,000 |
| Plus *(most popular)* | $19.99 | 30,000 + 30,000 = 60,000 |
| Pro *(best value)* | $39.99 | 80,000 + 80,000 = **160,000** |

**Pricing model difference:** Recall is flat-rate; Knowly is credit-metered (every GenLink click, Flow step, ask-Knowly query costs credits). Credit model protects margin but creates anxiety at the free-tier door.

✓ **Observed per-file credit burn for bulk PDF ingest** (from our 1,135-file import): **~152 credits/file average** (range 6–400+ depending on content length). A personal knowledge worker actively using Flow + GenPage features would see significantly higher burn.

---

## 10. Auth & data

| Dimension | Recall.it | Knowly |
|---|---|---|
| Auth provider | Firebase Auth | Clerk |
| Session storage | IndexedDB (Firebase tokens) ✓ observed | Cookies + localStorage (Clerk) ✓ observed |
| JWT lifetime | Not measured directly | 5 minutes, auto-refresh via `__client` cookie ✓ observed |
| SSO options | Google | Google (Clerk default), likely more |
| Data residency | Unclear | Unclear |
| Encryption at rest | Advertised | Advertised |
| Public API docs | None | None |

---

## 11. Observed API surface (Knowly)

From `../Lenny_Export/Knowly_import/` — real API calls made during a 1,135-file import. All under `https://knowly-core-production.up.railway.app/`:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/billing/me` | Plan + credit state |
| `GET` | `/usage/monthly/latest?user_email=<email>` | Feature-quota usage |
| `GET` | `/info-units/?limit=100&skip=0` | Paginated library listing |
| `GET` | `/info-units/<id>` | Full item (with processing pipeline details) |
| `GET` | `/info-units/check-duplicate?checksum=<sha256-hex>` | Content-hash dedupe probe |
| `POST` | `/info-units/create/document` | Multipart upload |
| `DELETE` | `/info-units/<id>` | Remove item (returns 200) ✓ observed |
| `GET` | `/info-unit-topology-tree/trees?user_id=<id>&limit=100` | Auto-organize collections |
| `GET` | `/info-unit-topology-tree/notifications?user_id=<id>` | Recent activity feed |
| `GET` | `/smart-filters/` | Dynamic filter definitions |
| `GET` | `/invitation-codes/access-status` | Early-access gate |

## 12. Observed API surface (Recall.it)

From `../Lenny_Export/Recall_import/`:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `backend.getrecall.ai/api/v1/cards?limit=500` | Paginated item listing; pagination params are **ignored**; use `total_count` as ground truth |
| `GET` | `/api/v1/search?q=<terms>&max_chunks=30` | Chunk-level semantic search |

Both APIs are undocumented but usable with user-obtained keys.

---

## 13. Differentiators: what each does that the other doesn't

### Recall.it-only

- Spaced-repetition review queue with forgetting-curve scheduling
- Mobile apps (iOS + Android) + Safari extension
- YouTube / podcast / email / Kindle / Reddit / Twitter capture
- Explicit knowledge-graph visualization
- Batch-of-10 PDF upload (operational win for bulk ingest)
- Obsidian / Notion integrations
- Public share links

### Knowly-only

- **GenLink** (clickable-word → AI sub-page) — the single most novel primitive
- **Flow** (AI assembles a sequenced mini-curriculum from your library)
- **GenPage** (persistent AI-written pages from your sources)
- Proactive "Suggested for you" cards with Catch-up / Learn / Discover framing
- Auto-categorization into 14 distinct content types with automatic titling
- Dual-pane original + AI-digest viewer
- Broader document-format ingest (EPUB, Keynote, Numbers, Pages, etc.)
- Credit-metered pricing (margin-protective for a startup)

---

## 14. Shared feature baseline (parity)

Both ship:

- Chrome extension
- Web app
- Full-text + semantic search
- AI summaries on ingest
- Auto-tags / categories
- Chat / Q&A over your library
- Collections (manual in Recall; auto in Knowly)
- Undocumented REST API with Bearer auth
- Async server-side processing pipelines

---

## 15. Feature count (rough)

| Bucket | Recall.it | Knowly | Shared |
|---|---|---|---|
| Capture sources | 11 | 16 | 4 (Web, PDF, Markdown, Text) |
| Organization | 5 | 4 | 3 |
| AI generation | 5 | 7 | 3 (summary, search, Q&A) |
| Review / SRS | 4 | 0 | 0 |
| Search | 4 | 4 | 3 |
| Integrations | 6 | 1 | 1 (undocumented API) |
| Platforms | 6 | 2 | 2 |
| **Combined distinct features** | **~30** | **~30** | **~15** |

**Building a clone of both = ~45 distinct features** (30+30 minus 15 overlap). At 2-3 days of focused work per feature with AI assistance, that's **3-4 months of full-time work** — consistent with the STRATEGY.md "6-12 months part-time" estimate.

---

## 16. If you ever re-open the build question

Use this inventory to prioritize:

1. **Must-haves for a personal MVP** (from STRATEGY.md §3 Must-have): Save URL/PDF, auto-summarize, library view, RAG chat, basic categorization, single-user auth. **~6 features. ~3-4 weeks.**
2. **Should-haves** (weeks 5-8): Browser extension, streaming responses, citation-grounded answers, PWA mobile capture, proactive recs. **~5 more features. ~4 more weeks.**
3. **The learning-optimal single feature to prototype**: **GenLink** — Knowly's clickable-word AI wiki. Weekend-scale on top of any RAG base. Most novel, most copied-elsewhere, most interviewable.

Skip for v1: spaced repetition, knowledge graph viewer, podcast/YouTube pipeline, Flow multi-step agent orchestration, native mobile — all are rabbit holes for a personal-use tool.

---

## 17. This document's shelf life

Feature claims in this doc are accurate to **2026-05-07**. Both products ship fast, especially Knowly (currently at v0.0.18 — a v0.1.0 could reshape the feature set). If the decision to build ever flips back, **re-audit both landing pages and re-run the spike scripts in `Knowly_import/spikes/`** before acting on this inventory. The API surface may have shifted.

---

**End of inventory. Companion to `STRATEGY.md` and `PROJECT_CLOSURE.md` in this folder.**
