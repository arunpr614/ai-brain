# Recall.it Feature Audit — 2026-05-12

**Author:** Deep-research agent
**Purpose:** Structured feature breakdown of Recall.it web + Android apps, cross-mapped to AI Brain's existing roadmap so gaps and overlaps are visible.
**Supersedes:** The Recall.it sections of `FEATURE_INVENTORY.md` (2026-05-07 audit) where this document contradicts them — contradictions flagged in §7.

---

## 1. Research method

| Source | URL | Scrape timestamp | Coverage |
|---|---|---|---|
| Recall landing page | https://www.recall.it/ | 2026-05-12 | Feature highlights, platform list, pricing |
| Recall docs root | https://docs.recall.it/ | 2026-05-12 | Navigation map, top-level feature summary |
| Recall docs — Add content | https://docs.recall.it/getting-started/2-add-content | 2026-05-12 | Capture methods, supported types |
| Recall docs — All supported content | https://docs.recall.it/supported-content/all-supported-content | 2026-05-12 | Per-type details, limitations, roadmap items |
| Recall docs — Summarize + chat | https://docs.recall.it/getting-started/3-summarize-and-chat-with-content | 2026-05-12 | AI summary, per-item chat |
| Recall docs — Organize content | https://docs.recall.it/getting-started/4-organizing-content | 2026-05-12 | Tags, bulk actions |
| Recall docs — Linking content | https://docs.recall.it/getting-started/5-linking-content | 2026-05-12 | Auto-links, manual `[[` syntax, graph |
| Recall docs — Review content | https://docs.recall.it/getting-started/6-review-content | 2026-05-12 | SRS system, card types, scheduling |
| Recall docs — Export content | https://docs.recall.it/getting-started/7-exporting-content | 2026-05-12 | Export formats, platform availability |
| Recall docs — Note-taking | https://docs.recall.it/deep-dives/note-taking-in-recall | 2026-05-12 | Block editor, block types, linking |
| Recall docs — Chat with all content | https://docs.recall.it/deep-dives/chat-with-all-your-content | 2026-05-12 | Library-scope chat, citations |
| Recall docs — Augmented browsing | https://docs.recall.it/deep-dives/recall-augmented-browsing | 2026-05-12 | In-browser keyword highlighting |
| Recall docs — Graph overview | https://docs.recall.it/deep-dives/graph/overview | 2026-05-12 | Knowledge graph, node/edge model |
| Recall docs — Tagging | https://docs.recall.it/deep-dives/tagging | 2026-05-12 | Tag hierarchy, auto vs manual |
| Recall docs — Quiz + SRS | https://docs.recall.it/deep-dives/quiz-and-spaced-repetition | 2026-05-12 | 7 question types, 5-stage intervals |
| Recall docs — Bookmark imports | https://docs.recall.it/supported-content/bookmark-imports | 2026-05-12 | Import batch limits, browser support |
| Recall docs — Roadmap | https://docs.recall.it/recall-roadmap | 2026-05-12 | H1 2026 planned features |
| Recall docs — API | https://docs.recall.it/developer/api | 2026-05-12 | Auth, endpoints, rate limits |
| Recall docs — MCP server | https://docs.recall.it/developer/mcp | 2026-05-12 | MCP tools, supported AI clients |
| Recall pricing page | https://www.recall.it/pricing | 2026-05-12 | Tier names, prices, feature gates |
| Recall changelog | https://feedback.recall.it/changelog | 2026-05-12 | **BLOCKED** — WebFetch permission denied |

**Confidence levels used in the table below:**
- `landing-page` — advertised on recall.it homepage; marketing copy, may not reflect exact behavior.
- `docs` — documented at docs.recall.it; most reliable.
- `changelog` — from changelog; indicates shipped date.
- `inferred` — logically derived from other sources; mark "?" in availability columns.

**Could not verify (auth gate / missing docs / blocked fetch):**
- Changelog at `feedback.recall.it/changelog` was blocked by WebFetch permissions. Recent shipped items are drawn from the Recall roadmap doc at `docs.recall.it/recall-roadmap` instead.
- Exact model names available in multi-model selection (GPT, Claude, Gemini variants) — landing page mentions multi-model but doesn't list specific model IDs in scraped content.
- Podcast transcript quality and timestamp availability beyond what's in the docs.
- Audio summary "cloneable voice" feature — mentioned on landing page but not detailed in docs.
- Public quiz leaderboard mechanics — mentioned in the SRS docs but not fully detailed.
- Internet-search scope for chat — landing page implies it; docs suggest library-only. Treated as "?" until confirmed.

---

## 2. Top-line positioning

As of May 12 2026, Recall.it is a multi-platform personal knowledge base (web, iOS, Android, Chrome/Firefox extensions) that saves content from 10+ source types — URLs, PDFs, YouTube, podcasts, TikTok, Google Docs/Slides, and more — and applies AI to every item: auto-summary, auto-tags, knowledge graph auto-linking, and citation-grounded chat over the full corpus. Its primary differentiator is a spaced-repetition review system (7 question types, 5 learning stages) that no direct competitor ships, paired with a visual knowledge graph that reveals connections across all saved content.

---

## 3. Feature inventory

| Category | Feature | Web | Android | iOS | Chrome ext | Source | Maps to Brain roadmap | Roadmap status |
|---|---|---|---|---|---|---|---|---|
| Capture | Save any URL (article/blog/website) | ✓ | ✓ | ✓ | ✓ | docs | CAP-1 | shipped |
| Capture | Save YouTube video (transcript extraction) | ✓ | ✓ | ✓ | ✓ | docs | CAP-7 (now v0.5.1 shipped) | shipped |
| Capture | Save YouTube Shorts | ✓ | ✓ | ✓ | ✓ | docs | — | **gap** |
| Capture | Save TikTok video | ✓ | ✓ | ✓ | ✓ | docs | — | **gap** |
| Capture | Save Vimeo video | ✓ | ? | ? | ✓ | docs | — | **gap** |
| Capture | Save Apple Podcasts episode (transcript) | ✓ | ✓ | ✓ | ? | docs | CAP-8 | planned (v0.10.0) |
| Capture | Save Spotify Podcasts episode (transcript) | ✓ | ✓ | ✓ | ? | docs | CAP-8 | planned (v0.10.0) |
| Capture | PDF upload (single) | ✓ | ✓ | ✓ | ? | docs | CAP-2 | shipped |
| Capture | PDF upload (multi — up to 10 at once) | ✓ | ? | ? | ✗ | docs / FEATURE_INVENTORY.md | — | **gap** |
| Capture | Google Docs save | ✓ | ? | ? | ✓ | docs | — | **gap** |
| Capture | Google Slides save | ✓ | ? | ? | ✓ | docs | — | **gap** |
| Capture | Manual note creation (in-app) | ✓ | ✓ | ✓ | ✓ | docs | CAP-3 | shipped |
| Capture | Import bookmarks (browser, up to 1,000) | ✓ | ✗ | ✗ | ✓ | docs | — | **gap** |
| Capture | Import Pocket saves | ✓ | ✗ | ✗ | ✓ | docs | — | **gap** |
| Capture | Import Markdown files (Obsidian / Notion exports, up to 10,000) | ✓ | ✗ | ✗ | ✗ | docs | — | **gap** |
| Capture | Twitter / X thread save | ? | ? | ? | ? | docs (roadmap: "in review") | CAP-9 | deferred (FUT future) |
| Capture | LinkedIn posts save | ? | ? | ? | ? | docs (roadmap: "in review") | — | **gap** |
| Capture | Share-sheet capture from mobile browser | ✗ | ✓ | ✓ | ✗ | docs | CAP-6 | shipped |
| Capture | Wikipedia search integration (books, people) | ✓ | ? | ? | ✗ | docs | — | **gap** |
| Organization | Hierarchical tags (nested with "/" notation) | ✓ | ✓ | ✓ | ✗ | docs | ORG-6 | shipped |
| Organization | Auto-tags on ingest (AI-generated) | ✓ | ✓ | ✓ | ✗ | docs | ORG-6 | shipped |
| Organization | Manual tag editing (inline, double-click) | ✓ | ? | ? | ✗ | docs | F-302 | shipped |
| Organization | Tag filtering (click tag → filtered library) | ✓ | ✓ | ✓ | ✗ | docs | ORG-9 | planned (v0.6.0) |
| Organization | Library sorting (manual / last-updated / created / alphabetical) | ✓ | ? | ? | ✗ | docs | — | **gap** |
| Organization | Bulk select + bulk tag / delete / move | ✓ | ✗ | ✗ | ✗ | docs | F-207 | shipped |
| Organization | 14-category auto-classification | ✓ | ✓ | ✓ | ✗ | FEATURE_INVENTORY.md | ORG-4 | shipped |
| AI Generation | Auto-summary on save (concise or detailed) | ✓ | ✓ | ✓ | ✓ | docs | DIG-1 | shipped |
| AI Generation | Audio summary (listen mode) | ✓ | ✓ | ✓ | ✗ | pricing / landing-page | — | **gap** |
| AI Generation | Custom / cloneable voice for audio summary | ✓ | ? | ? | ✗ | landing-page | — | **gap** |
| AI Generation | Multi-model AI selection (GPT / Claude / Gemini) | ✓ | ? | ? | ✗ | landing-page | — | **gap** |
| AI Generation | Key-quote extraction (highlights) | ✓ | ✓ | ✓ | ✗ | FEATURE_INVENTORY.md | DIG-2 | shipped |
| AI Generation | Block-style rich text notebook editor (per item) | ✓ | ? | ? | ✓ | docs | DIG-3 | shipped |
| AI Generation | Per-item chat (Q&A on single content) | ✓ | ✓ | ✓ | ✓ | docs | ASK-3 | shipped |
| AI Generation | Chat over full library (RAG) | ✓ | ✓ | ✓ | ? | docs | ASK-1 | shipped |
| AI Generation | Chat with internet (web-search scope) | ? | ? | ? | ? | landing-page (implied) | — | **gap** |
| AI Generation | Chat scoped to tag or collection | ✓ | ? | ? | ✗ | docs | — | **gap** |
| AI Generation | Citation-grounded answers | ✓ | ? | ? | ✗ | docs | ASK-2 | shipped |
| AI Generation | OCR for images / scanned documents | ? | ? | ? | ? | roadmap doc (H1 2026) | CAP-4 | deferred |
| Review / SRS | Auto-generate review cards per item | ✓ | ✓ | ✓ | ✗ | docs | REV-1 | planned (v0.8.0) |
| Review / SRS | 7 question types (MCQ, T/F, fill-blank, short-answer, matching, ordering, flashcard) | ✓ | ✓ | ✓ | ✗ | docs | F-027 | planned (v0.8.0) |
| Review / SRS | 5-stage SRS scheduling (New → Mastered, interval-based) | ✓ | ✓ | ✓ | ✗ | docs | F-027 | planned (v0.8.0) |
| Review / SRS | Review dashboard (due count, weekly view) | ✓ | ✓ | ✓ | ✗ | docs | REV-2 | planned (v0.8.0) |
| Review / SRS | Memory stats (stage distribution, activity chart, progress, streak calendar) | ✓ | ✓ | ✓ | ✗ | docs | REV-3 | planned (v0.8.0) |
| Review / SRS | Public quiz sharing + leaderboard | ✓ | ? | ? | ✗ | docs | — | **gap** |
| Review / SRS | Push notifications for daily review | ? | ✓ | ✓ | ✗ | docs (email + push implied) | REV-4 | planned (v0.8.0) |
| Review / SRS | Manual card creation | ✓ | ? | ? | ✗ | docs | — | **gap** |
| Search | Full-text search across library | ✓ | ✓ | ✓ | ✗ | docs | F-104 / ORG-2 | shipped |
| Search | Semantic search (embedding-based) | ✓ | ? | ? | ✗ | FEATURE_INVENTORY.md | ORG-3 | shipped |
| Search | Hybrid search (FTS + semantic) | ✓ | ? | ? | ✗ | FEATURE_INVENTORY.md | ORG-3 | shipped |
| Search | Filter by tag, source type, date range | ✓ | ? | ? | ✗ | docs / API | ORG-9 | planned (v0.6.0) |
| Search | Refined search (non-modal, H1 2026 roadmap) | ? | ? | ? | ? | roadmap doc | — | **gap** |
| Integration | Chrome extension (MV3) | ✓ | ✗ | ✗ | ✓ | docs | CAP-5 | shipped |
| Integration | Firefox extension | ✓ | ✗ | ✗ | ✓ | docs | — | **gap** |
| Integration | Safari extension (planned) | ? | ✗ | ? | ? | docs | — | **gap** |
| Integration | Augmented browsing (keyword highlight while browsing) | ✗ | ✗ | ✗ | ✓ | docs | — | **gap** |
| Integration | Export single item as Markdown | ✓ | ✗ | ✗ | ✗ | docs | F-105 / INT-1 | shipped |
| Integration | Export full library as Markdown ZIP | ✓ | ✗ | ✗ | ✗ | docs | INT-2 | shipped |
| Integration | Obsidian import (Markdown files) | ✓ | ✗ | ✗ | ✗ | docs | INT-3 (v0.10.0, outgoing sync) | planned |
| Integration | Notion import (Markdown export) | ✓ | ✗ | ✗ | ✗ | docs | — | **gap** |
| Integration | REST API — read-only (cards, search) | ✓ | ✗ | ✗ | ✗ | docs | — | **gap** |
| Integration | REST API — write (planned) | ? | ✗ | ✗ | ✗ | docs (roadmap) | — | **gap** |
| Integration | MCP server (Claude / ChatGPT / Perplexity / Gemini CLI) | ✓ | ✗ | ✗ | ✗ | docs | — | **gap** |
| Platform | Web app | ✓ | ✗ | ✗ | ✗ | docs | F-001 | shipped |
| Platform | Android app (Google Play) | ✗ | ✓ | ✗ | ✗ | docs | F-014 | shipped |
| Platform | iOS app (App Store) | ✗ | ✗ | ✓ | ✗ | docs | FUT-5 | deferred |
| Auth | Google SSO | ✓ | ✓ | ✓ | ✓ | FEATURE_INVENTORY.md | F-004 | shipped |
| Auth | Email / password | ? | ? | ? | ? | inferred | F-004 | shipped |
| Auth | API key (Bearer `sk_` prefix) | ✓ | ✗ | ✗ | ✗ | docs | — | **gap** |
| Auth | MCP OAuth (browser-based) | ✓ | ✗ | ✗ | ✗ | docs | — | **gap** |
| Pricing | Free tier (10 AI cards/mo, unlimited saves) | ✓ | ✓ | ✓ | ✓ | pricing | — | not-applicable |
| Pricing | Plus tier ($10/mo billed yearly) | ✓ | ✓ | ✓ | ✓ | pricing | — | not-applicable |
| Pricing | Max tier ($38/mo billed yearly, frontier models + bulk AI) | ✓ | ✓ | ✓ | ✓ | pricing | — | not-applicable |

**Total rows: 68**

---

## 4. What shipped recently on Recall.it

The public changelog at `feedback.recall.it/changelog` was blocked during scraping. The following items are drawn from the `docs.recall.it/recall-roadmap` page, which lists one confirmed shipped item and planned H1 2026 work:

| Date | Item | Description |
|---|---|---|
| January 2026 | Graph View 2.0 | Visual representation of all saved content; connections between ideas via node/edge map — confirmed shipped per roadmap page |
| H1 2026 (planned) | Quiz 2.0 | Adds open-ended questions, flashcards, topic-based customization, timed rounds |
| H1 2026 (planned) | Chat 2.0 | Context-aware chat with time-range filtering, source-based scope, custom saved prompts |
| H1 2026 (planned) | Text-to-Speech | Audio playback of saved content (listen mode) |
| H1 2026 (planned) | Enhanced Read-It-Later | Better article parsing, highlights, improved mobile sharing |
| H1 2026 (planned) | Refined Search | Non-modal search UI for faster discovery |
| H1 2026 (planned) | Expanded content: OCR, Reddit, X, LinkedIn, Instagram | OCR for images/documents + social platform saves |
| H1 2026 (planned) | Multi-language support | International language expansion |
| H1 2026 (planned) | Upgraded tagging | Better tag extraction quality |

**Changelog coverage gap:** Full velocity history unavailable due to fetch block. See §8.

---

## 5. Platform-availability matrix

| Platform | Capture | Organization | AI Generation | Review / SRS | Search | Integration | Auth | Feature count (est.) |
|---|---|---|---|---|---|---|---|---|
| Web app | ✓ (all methods) | ✓ (full) | ✓ (full) | ✓ (full) | ✓ (full) | ✓ (export, API, MCP) | ✓ | ~55 of 68 |
| Android app | ✓ (share-sheet, URL, PDF) | ✓ (tags, limited bulk) | ✓ (summary, chat) | ✓ (review queue) | ✓ (FTS) | ✗ (no export, no API) | ✓ | ~30 of 68 |
| iOS app | ✓ (share-sheet, URL, PDF) | ✓ (tags) | ✓ (summary, chat) | ✓ (review queue) | ✓ (FTS) | ✗ | ✓ | ~30 of 68 |
| Chrome extension | ✓ (save page, augmented browsing) | ✗ | ✓ (chat icon) | ✗ | ✗ | ✓ (augmented browsing) | ✓ | ~10 of 68 |
| Firefox extension | ✓ (save page) | ✗ | ? | ✗ | ✗ | ? | ? | ~5 of 68 |
| Desktop app | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 0 |

Web is the most complete platform; mobile covers the capture + review loop well; Chrome extension is capture-only plus augmented browsing.

---

## 6. Gaps vs Brain's current roadmap

The following are Recall.it features where the roadmap status in §3 is **gap** — features Recall ships that Brain has no planned item for. Capped at 15, highest-leverage first.

1. **MCP server** (row: Integration — MCP server) — Exposes the knowledge base to Claude, ChatGPT, Perplexity as a searchable tool. *Add to v0.10.0 or post-v1.0.0?* This is a single endpoint on top of the existing `/api/v1/search` route — low implementation cost, high utility for an AI-first user.

2. **Audio summary / listen mode** (row: AI Generation — Audio summary) — Text-to-speech playback of saved content. *Deferred research spike first:* Brain is local-first with Ollama; TTS requires a separate model or cloud API. Worth a spike before scheduling.

3. **Augmented browsing** (row: Integration — Augmented browsing) — Chrome extension highlights keywords that match your saved content while you browse. *Add to v0.10.0?* Requires keyword extraction in the extension worker; substantial but standalone feature.

4. **Public quiz sharing + leaderboards** (row: Review/SRS) — Share quiz challenges with others. *Skip — out of scope:* Brain is single-user by design through v1.0.0; revisit post-hosting decision.

5. **Bookmark import (up to 1,000)** (row: Capture — bookmark imports) — Import existing browser bookmarks in bulk. *Add to v0.6.0 or v0.10.0?* Useful for onboarding a large existing bookmark collection; low complexity (HTML bookmark file parsing).

6. **Multi-PDF upload** (row: Capture — PDF multi-upload) — Upload up to 10 PDFs at once. *Add to v0.6.0?* Already have single-PDF pipeline; batch queue wrapper is low effort.

7. **Markdown / Obsidian / Notion import** (row: Capture — import Markdown files) — Import up to 10,000 Markdown files in one batch. *Add to v0.10.0?* Aligns with INT-3 Obsidian sync work; inbound direction is simpler than outbound.

8. **Google Docs / Slides capture** (row: Capture — Google Docs, Google Slides) — Save a Google Doc URL and extract its text. *Research spike first:* requires Google Drive API or Docs export endpoint. Non-trivial auth.

9. **Chat scoped to a tag or collection** (row: AI Generation) — "@tag" or "@collection" scope for chat queries. *Add to v0.6.0 or v0.7.0?* Small UI + filter change on top of existing RAG pipeline; high daily-use value.

10. **Library sorting options** (row: Organization — sorting) — Sort by manual drag-and-drop, last-updated, created, or alphabetical. *Add to v0.6.0?* UI-only feature on top of existing library list; one-day effort.

11. **REST API — public read** (row: Integration — REST API read-only) — Documented public API with Bearer key auth. *Add post-v1.0.0?* Brain already has an internal REST surface; formalizing it into a documented API is a post-hosting concern.

12. **Wikipedia search integration** (row: Capture — Wikipedia) — Search Wikipedia inline to save pages about books, people, etc. *Skip for now:* Wikipedia is freely accessible; adding a search shortcut is cosmetic. Low leverage.

13. **Firefox extension** (row: Integration — Firefox) — Capture and augmented browsing in Firefox. *Skip — out of scope:* Brain ships a Chrome MV3 extension; Firefox parity requires minor manifest changes but is low priority for a single user on Chrome.

14. **Chat with internet scope** (row: AI Generation — chat internet) — Query the web rather than just the local library. *Research spike first:* requires a web-search tool call (Brave Search API, Perplexity, etc.); non-trivial but well-precedented.

15. **Multi-model AI selection** (row: AI Generation — model selection) — Let users pick GPT / Claude / Gemini per query. *Skip — out of scope:* Brain is intentionally local-first (Ollama); external model switching conflicts with the local-only design philosophy through v1.0.0.

---

## 7. Contradictions with FEATURE_INVENTORY.md

| Old claim (FEATURE_INVENTORY.md, 2026-05-07) | New finding (this audit, 2026-05-12) | Evidence |
|---|---|---|
| §2: "Twitter / X thread save — Designated format for social threads" — marked 📣 advertised with no caveat. | X/Twitter save is listed in the **roadmap as "in review" (not yet shipped)**. The docs explicitly place it under "In Review (Coming Soon)". | `docs.recall.it/supported-content/all-supported-content` |
| §2: "Reddit post save — Preserves comment chains" — marked 📣 advertised. | Reddit is listed in the roadmap under "Roadmap (Not Yet Optimized)" — **not shipped**. No evidence it's live. | `docs.recall.it/supported-content/all-supported-content` |
| §7: "Slack integration — Unclear / experimental" | No evidence of Slack integration exists in any current docs or roadmap. Likely **never shipped**; the old inventory flagged it as unclear. Removing this claim is safer. | Absence across all scraped docs |
| §8: "Firefox extension — ✅" (for Recall) | Firefox extension is confirmed in the current docs at `getting-started/2-add-content`. This is **consistent** — not a contradiction, but the table entry was accurate. | `docs.recall.it/getting-started/2-add-content` |
| §9: Recall.it Pro "~$10/mo" and Higher tier "~$15-20/mo" | Pricing is now **Plus at $10/mo (yearly) and Max at $38/mo (yearly)**. The "Higher tier" is $38/mo, not $15-20/mo. | `recall.it/pricing` |
| §4: "Mind maps (newer) — Auto-generated visual concept maps" | The docs and roadmap describe a **Knowledge Graph** (node/edge visual), not mind maps. The "mind map" label appears to be a mischaracterization of the graph view. No auto-generated mind-map feature is documented. | `docs.recall.it/deep-dives/graph/overview` |
| §3: "Collections / folders — Manual organization" | Current docs clarify that Recall uses **tags** as the primary organizational primitive, explicitly noting they are superior to folders. True folder-based collections are not documented as a shipped feature. | `docs.recall.it/getting-started/4-organizing-content` |

---

## 8. Open questions

- **Changelog velocity** — `feedback.recall.it/changelog` was blocked by WebFetch permissions during this session. The full 6-month changelog was not retrieved. A manual review or re-authorized fetch would reveal exact ship dates for Graph View 2.0, any undocumented shipped features, and the current H1 2026 progress.
- **Internet-scope chat** — The landing page implies chat can query the web ("Chat with your knowledge, the internet, or both" from the pricing page), but the deep-dive chat docs describe library-only RAG. It is unclear whether web-search chat is a paid-tier feature or simply not yet documented. Verify in the app UI.
- **Multi-model selection specifics** — The landing page claims "multi-model AI selection (GPT, Claude, Gemini, others)" and "model switching mid-conversation." No docs page details which specific model variants are available or whether this is a Max-tier-only feature.
- **Android export** — No evidence of export on mobile. Unconfirmed whether the Android app has any Markdown export path or if it's web-only.
- **Audio summary / cloneable voice** — The landing page describes "cloneable voice for audio summaries" but no docs page details this. Unclear if shipped or still roadmap.
- **Podcast timestamps** — Docs state "timestamps are not included" for Apple Podcasts and Spotify. Unclear if this means no transcript timestamps or no playback position tracking.
- **Local file uploads** — The roadmap mentions "local file uploads (.mp4, audio, text paste)" as "not yet optimized." Brain's PDF pipeline handles local files; the video/audio path remains uncharted for Recall and Brain alike.
- **Collections vs tags** — Old inventory referenced "Collections / folders." Docs now emphasize tags only. It's unclear whether the "Collections" feature referenced in earlier research still exists as a first-class concept or was merged into tags.

---

## 9. Sources

- https://www.recall.it/ — scraped 2026-05-12
- https://docs.recall.it/ — scraped 2026-05-12
- https://docs.recall.it/getting-started/2-add-content — scraped 2026-05-12
- https://docs.recall.it/getting-started/3-summarize-and-chat-with-content — scraped 2026-05-12
- https://docs.recall.it/getting-started/4-organizing-content — scraped 2026-05-12
- https://docs.recall.it/getting-started/5-linking-content — scraped 2026-05-12
- https://docs.recall.it/getting-started/6-review-content — scraped 2026-05-12
- https://docs.recall.it/getting-started/7-exporting-content — scraped 2026-05-12
- https://docs.recall.it/deep-dives/note-taking-in-recall — scraped 2026-05-12
- https://docs.recall.it/deep-dives/chat-with-all-your-content — scraped 2026-05-12
- https://docs.recall.it/deep-dives/recall-augmented-browsing — scraped 2026-05-12
- https://docs.recall.it/deep-dives/graph/overview — scraped 2026-05-12
- https://docs.recall.it/deep-dives/tagging — scraped 2026-05-12
- https://docs.recall.it/deep-dives/quiz-and-spaced-repetition — scraped 2026-05-12
- https://docs.recall.it/supported-content/all-supported-content — scraped 2026-05-12
- https://docs.recall.it/supported-content/bookmark-imports — scraped 2026-05-12
- https://docs.recall.it/recall-roadmap — scraped 2026-05-12
- https://docs.recall.it/developer/api — scraped 2026-05-12
- https://docs.recall.it/developer/mcp — scraped 2026-05-12
- https://www.recall.it/pricing — scraped 2026-05-12
- https://feedback.recall.it/changelog — **BLOCKED** (WebFetch permission denied 2026-05-12)
- `/Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/FEATURE_INVENTORY.md` — read 2026-05-12 (cross-reference source)
- `/Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/ROADMAP_TRACKER.md` — read 2026-05-12 (roadmap ID cross-reference)
- `/Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/STRATEGY.md` — read 2026-05-12 (context)
