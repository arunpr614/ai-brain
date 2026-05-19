# AI Brain — Designer Brief

**For:** an AI designer agent (Figma-class output, multi-screen mockups, brand identity, full design-system file).
**From:** AI Brain product owner (Arun Prakash) — single-developer, AI-assisted build.
**Date assembled:** 2026-05-19.
**Project status when brief was compiled:** v0.5.6 shipped on disk; v0.6.0 cloud-migration mid-cutover. Web app, sideloaded Android APK, and Chrome MV3 extension are all functional.

This document is self-contained. It synthesizes the project's vision, requirements, current/planned features, web + mobile experience, and the existing design language so that an AI designer can produce:

1. **A logo / wordmark** for the app.
2. **Web app mockups** (key screens — light + dark).
3. **Mobile app mockups** (Android, Capacitor WebView — key screens).
4. **A complete design-system / Figma library** (tokens, components, motion, IA, accessibility).

If you only have time to read one section, read **§1 (The Problem)** and **§9 (What I Want From You)**.

---

## 1. The problem this product solves

### 1.1 The personal pain (real, observed)

I'm a heavy reader of long-form business and tech content (Substack, podcasts, YouTube essays, PDFs, research reports). Over the last few years I have:

- Saved **1,116+ Lenny's Newsletter PDFs** into a knowledge tool (Recall.it, then later imported into Knowly).
- Paid for **both Recall Pro (~$10/mo) and Knowly Plus (~$20/mo)** simultaneously, because each solves only half the problem.
- Repeatedly **lost track** of what I had saved, where, and why — the act of saving became a substitute for understanding.

The two paid tools that come closest to solving this:

| Tool | Strength | Weakness |
|---|---|---|
| **Recall.it** | Multi-platform capture (web, iOS, Android, extensions). Spaced-repetition review. Knowledge graph. Broad ingest (YouTube, podcasts, Reddit, Twitter, Kindle, email). | Reactive — you ask, it answers. No proactive learning surface. Cloud-only; my data lives on someone else's server. |
| **Knowly** | Proactive AI: GenPage (AI-written multi-section pages from your sources), GenLink (clickable-word AI sub-pages — the most novel primitive in this space), Flow (multi-step learning journeys), Auto-Library (topic clustering). | Web-only as of 2026; no mobile app. Credit-metered pricing creates anxiety. Closed-source, opinionated, can't extend. |

Neither tool is local-first. **Both make my reading life dependent on a vendor staying alive.**

### 1.2 The "save → understood" gap

A hidden assumption in most read-it-later apps: *"if you save it, you'll come back to it."*

In practice the saved corpus becomes a **graveyard of good intentions**. The job-to-be-done is not "store it." It's three jobs in disguise:

1. **Capture** anything I find valuable, from anywhere, in under 2 seconds, without breaking my reading flow.
2. **Make sense of it** — surface what's in my saves, connect it to other things I've saved, summarize, generate, recommend.
3. **Retain it** — bring back the right idea at the right moment, via spaced repetition or proactive recall.

Recall does (1) and (3). Knowly does (2). **Nobody does all three on my own machine, with my data, end-to-end.**

### 1.3 The constraint that shapes everything

**100% local-first, single-user, my data on my Mac, until v1.0.0.**

- No cloud database. SQLite (`better-sqlite3 + sqlite-vec`) holds everything in one file.
- No hosted LLM by default. Ollama runs locally with `qwen2.5:7b-instruct` (24 tok/s on M1 Pro) for general work; Gemini / Anthropic API are opt-in fallbacks for quality ops.
- No multi-tenant plumbing. One user (me). One PIN. One bearer token.
- No Play Store, no App Store. Sideloaded Android APK reaches the Mac via a Cloudflare Named Tunnel (`brain.arunp.in`) — outbound QUIC from my Mac, no inbound port.

**The product is the antidote to vendor-lockin reading apps:** my reading life on my hardware, with the AI features the paid tools have, but mine.

### 1.4 Who this is for

**Audience of one** (initially): a non-technical-but-tool-savvy individual who reads constantly, builds personal libraries, and wants AI-augmented recall and synthesis without renting it from a SaaS.

The aesthetic must reflect that user: **calm, editorial, focused on reading and thinking — not a dashboard, not a CRM, not a productivity tracker.**

---

## 2. Product vision (one paragraph)

**AI Brain is a local-first personal knowledge app that combines Recall.it's capture + spaced-repetition + graph with Knowly's auto-organize + generative (GenPage, GenLink, Flow) layer.** It runs on my Mac (Next.js + SQLite + Ollama), with a sideloaded Android APK and a Chrome MV3 extension that capture content into the same library. Every saved item flows through one pipeline — **CAPTURE → EXTRACT → ENRICH → STORE → SURFACE** — so every feature is either a producer or a consumer of that pipeline. The mood is **Structured Calm**: a reading and thinking app first, a dashboard second.

---

## 3. Core requirements

### 3.1 Functional (what it must do)

| # | Requirement | Phase |
|---|---|---|
| R-1 | Capture URL (paste, or via Chrome extension, or via Android share sheet) → extract clean text via Mozilla Readability | shipped (v0.2.0) |
| R-2 | Capture PDF (drag-drop on web, native upload on Android, with paywall + scan detection) | shipped (v0.2.0) |
| R-3 | Capture YouTube videos → server-side InnerTube transcript | shipped (v0.5.1) |
| R-4 | Capture handwritten notes / markdown notes | shipped (v0.2.0) |
| R-5 | Auto-summarize, auto-categorize (14-bucket Knowly taxonomy), auto-title, auto-tag every item on save | shipped (v0.3.0) |
| R-6 | Full-text search (FTS5) + semantic search (sqlite-vec, hybrid RRF) | shipped (v0.4.0) |
| R-7 | Chat with the library (RAG) — streamed, citation-grounded answers | shipped (v0.4.0) |
| R-8 | Per-item chat — ask questions scoped to one source | shipped (v0.4.0) |
| R-9 | Related-items panel on item view (vector neighbors) | shipped (v0.4.0) |
| R-10 | GenPage — AI writes a persistent multi-section page from my sources for a topic | planned (v0.6.0) |
| R-11 | GenLink — every noun phrase on a GenPage is clickable; click slides in an AI sub-page from my library | planned (v0.7.0) |
| R-12 | Spaced-repetition review (FSRS) over auto-generated cards from items | planned (v0.8.0) |
| R-13 | Flow — multi-step learning journey (5–10 steps, each with a GenPage + sources + review cards) | planned (v0.9.0) |
| R-14 | Proactive home screen — "Suggested for you" cards (Catch-up / Learn / Discover) | planned (v0.9.0) |
| R-15 | Augmented browsing (extension highlights phrases on any web page that match my library) | planned (v0.6.x) |
| R-16 | Knowledge graph (force-directed, click-to-open, accessible parallel table view) | planned (v0.6.x / v0.10.0) |
| R-17 | Obsidian sync — write each item as `.md` in a vault folder | planned (v0.10.0) |
| R-18 | Markdown / JSON export for any item or the whole library | shipped (v0.2.0 / v0.3.0) |
| R-19 | Periodic SQLite backups + restore script | shipped (v0.1.0 / v0.3.1) |

### 3.2 Non-functional (what it must feel like)

| # | Requirement | Why |
|---|---|---|
| NF-1 | **Local-first.** No data leaves the user's box without explicit opt-in. | Trust + ownership are the entire premise. |
| NF-2 | **Same UI 1:1 across web and mobile** (Capacitor WebView renders the Next.js app). | One design system, three surfaces (browser, APK, extension popup). |
| NF-3 | **Capture must be ≤ 2 seconds** from "I want to save this" → "it's in the library." | Friction kills capture; that kills the corpus. |
| NF-4 | **Enrichment is async, never blocking.** Item appears in library immediately with `enriching…` state; summary streams in. | Calm UX. |
| NF-5 | **Streaming AI everywhere** — no spinners on long-running ops. SSE for chat, GenPage section-by-section. | Modern AI UX. |
| NF-6 | **Reading is the centerpiece.** Long-form item view, GenPage, Flow steps must feel **book-like**, not dashboard-like. | The product fails if reading feels like work. |
| NF-7 | **⌘K command palette** is the power layer — every action keyboard-reachable in ≤ 2 keystrokes. | Calm canvas + dense palette. |
| NF-8 | **Dark mode is first-class** (not an afterthought). Every token has a dark counterpart. | Reading at night is a primary use case. |
| NF-9 | **Single accent color** (indigo) used **only** for primary CTAs, links, focus rings, and the active nav item. | Restraint. |
| NF-10 | **Touch targets ≥ 44px on mobile, body floor 16px on every platform.** | Accessibility + Android system font scaling. |
| NF-11 | **`prefers-reduced-motion`** collapses all motion to 0ms. | Accessibility non-negotiable. |
| NF-12 | **No raw hex colors in component code.** Every color reads from a token. | Design-system rigor. |

### 3.3 Hard constraints (non-negotiable)

1. **No cloud DB.** SQLite is the database. Period.
2. **No external LLM by default.** Ollama is the default; cloud APIs (Anthropic, Gemini) are opt-in toggles with a $5/mo hard cap.
3. **Sideloaded APK only.** No Play Store. The APK is a thin Capacitor WebView pointing at `brain.arunp.in` (Cloudflare Named Tunnel to my Mac).
4. **Single user.** No multi-tenancy. PIN + HMAC session cookie + bearer token.
5. **Personal GitHub** (`arunpr614`) — never a work account.

---

## 4. The big metaphor: one pipeline, many surfaces

Every feature in AI Brain is either a **producer** or a **consumer** of one shared pipeline:

```
CAPTURE  →  EXTRACT  →  ENRICH  →  STORE  →  SURFACE
   ↓           ↓          ↓          ↓         ↓
 URL/PDF/    clean       summary/   SQLite    Library
 YouTube/    text +      category/  + vec     Item view
 Note/       metadata    title/     + cards   Ask (RAG)
 share       + chunks    tags +     + edges   GenPage / GenLink / Flow
 sheet                   embeds               Review (SRS)
                                              Graph / Explore
                                              Augmented browsing
```

This is the one mental model that keeps Recall's breadth (capture, SRS, graph) and Knowly's depth (auto-organize, generate) coherent. **No feature is added that doesn't plug into this pipeline.**

The visual language must communicate this: capture surfaces feel like *intake*, surfacing screens feel like *consumption*, generative screens feel like *creation*. Same primitives, different posture.

---

## 5. Feature inventory — current / in progress / planned

### 5.1 Capture (getting content in)

| ID | Feature | Status |
|---|---|---|
| CAP-1 | Save URL (paste box, web + mobile + extension) | ✅ shipped |
| CAP-2 | Save PDF (drag-drop on web, native upload on Android, paywall + scan signal) | ✅ shipped |
| CAP-3 | Manual note with markdown editor | ✅ shipped |
| CAP-5 | Chrome MV3 extension (popup + right-click context menu) | ✅ shipped |
| CAP-6 | Android share-sheet target (`@capgo/capacitor-share-target`) | ✅ shipped |
| CAP-7 | YouTube transcript ingest (server-side InnerTube + XML parser) | ✅ shipped |
| CAP-13 | EPUB ingest | 🟡 planned (v0.10.0) |
| CAP-14 | DOCX / RTF / ODT / Pages ingest | 🟡 planned (v0.10.0) |
| CAP-8 | Podcast ingest (RSS + whisper.cpp local transcription) | 🟡 planned (v0.10.0) |

### 5.2 Organize

| ID | Feature | Status |
|---|---|---|
| ORG-1 | Library list view (chronological, card-based) | ✅ shipped |
| ORG-2 | Full-text search (FTS5 + porter tokenizer) | ✅ shipped |
| ORG-3 | Semantic + hybrid search (sqlite-vec + RRF fusion) | ✅ shipped |
| ORG-4 | Auto-category (14 buckets — Newsletter, Blog Post, Tutorial, Case Study, Podcast Episode, Video, etc.) | ✅ shipped |
| ORG-5 | Auto-title (semantic rewrite from filename / page title) | ✅ shipped |
| ORG-6 | Auto-tag (3–8 tags per item) | ✅ shipped |
| ORG-7 | Manual tags + collections CRUD | ✅ shipped |
| ORG-10 | Bulk multi-select operations (tag / collection / delete) | ✅ shipped |
| ORG-8 | Auto-collections (HDBSCAN / LLM topic clustering) | 🟡 planned (v0.6.0) |
| ORG-9 | Smart filters (dynamic, AI-generated) | 🟡 planned (v0.6.0) |

### 5.3 Consume (item detail / digest)

| ID | Feature | Status |
|---|---|---|
| DIG-1 | Auto-summary (3-paragraph + 5 key quotes) | ✅ shipped |
| DIG-3 | Dual-pane original / digest view | ✅ shipped |
| DIG-4 | Streaming responses everywhere (SSE) | ✅ shipped |

### 5.4 Ask (RAG chat)

| ID | Feature | Status |
|---|---|---|
| ASK-1 | Library-wide chat (`/ask`) — RAG over all chunks | ✅ shipped |
| ASK-2 | Citation-grounded answers (chips link to source items) | ✅ shipped |
| ASK-3 | Per-item chat (`/items/[id]/ask`) — retrieval scoped to one source | ✅ shipped |
| ASK-4 | Chat thread persistence (threads + messages tables, cascade delete) | ✅ shipped |
| EXP-3 | Related-items panel (mean chunk centroid → vector neighbors) | ✅ shipped |

### 5.5 Generate — Knowly's territory (the differentiator)

| ID | Feature | Status |
|---|---|---|
| GEN-1 | **GenPage** — AI-written multi-section pages from your sources, persistent, editable | 🟡 planned (v0.6.0) |
| GEN-5 | "Summarize my recent saves" home card | 🟡 planned (v0.6.0) |
| GEN-2 | **GenLink** — every noun phrase on a GenPage is clickable; click slides in a side-panel sub-page; recursive with breadcrumbs | 🟡 planned (v0.7.0) |
| GEN-3 | **Flow** — multi-step learning journey (5–10 steps, each with GenPage + 2 sources + 3 review cards) | 🟡 planned (v0.9.0) |
| GEN-4 | "Suggested for you" cards (Catch-up / Learn / Discover) | 🟡 planned (v0.9.0) |

### 5.6 Review (SRS)

| ID | Feature | Status |
|---|---|---|
| REV-1 | Auto-generate 3–5 review cards per item on enrichment complete | 🟡 planned (v0.8.0) |
| REV-2 | Daily review queue with FSRS scheduler, keyboard-first (Space / 1–2–3–4) | 🟡 planned (v0.8.0) |
| REV-3 | Stats — streak, retention %, 14-day sparkline | 🟡 planned (v0.8.0) |
| REV-4 | Android local notification (8am default) | 🟡 planned (v0.8.0) |

### 5.7 Explore — graph + augmented browsing

| ID | Feature | Status |
|---|---|---|
| GRAPH-1..8 | Force-directed graph (d3-force on canvas), click-to-open, accessible parallel table view, desktop-only | 🟡 planned (v0.6.x) |
| AUG-1..10 | **Augmented browsing**: extension highlights phrases on any visited webpage that match items in my library; click-through to saved item; per-site suppression list | 🟡 planned (v0.6.x) |

### 5.8 Integrate / export

| ID | Feature | Status |
|---|---|---|
| INT-1 | Markdown export per item (with YAML frontmatter, Obsidian-ready) | ✅ shipped |
| INT-2 | Bulk JSON / Markdown export (zip stream) | ✅ shipped |
| INT-3 | Obsidian sync folder (write each item as `.md`, two-way later) | 🟡 planned (v0.10.0) |

### 5.9 What's deliberately NOT built

- Multi-user accounts, sharing, public links, billing.
- Email forwarding / Kindle sync / Twitter / Reddit / Slack / Notion integrations (require hosted infra).
- Onboarding tour, marketing landing page, analytics, SEO.
- Mobile iOS app (Capacitor on iOS is possible but deferred — Android first).
- Native desktop app (the Mac browser is the desktop client).

---

## 6. The web experience

### 6.1 Topology

The web app runs at `https://brain.arunp.in` (Cloudflare Named Tunnel → Mac), or `http://localhost:3000` when developing. Same Next.js app, same React tree, same DB. The Chrome extension popup uses a tiny subset of the same components.

### 6.2 Information architecture (desktop)

**Layout:** left sidebar (240px expanded, 48px collapsed by default) + main pane + optional right panel (chat, related items, GenLink stack).

**Sidebar sections (top → bottom):**

1. Workspace header (app name + settings icon)
2. **Inbox** — newly captured items awaiting review
3. **Library** — all items, with chip filters at top (source type, tag, collection, date)
4. **Collections** — manual + auto-clusters (sparkle icon distinguishes auto)
5. **Tags** — hierarchical (`/` separator), collapsible
6. **Ask** — chat threads (most-recent first)
7. **GenPages** — list of generated pages
8. **Flows** — learning journeys
9. **Review** — with due-count badge (indigo pill)
10. **Explore** — graph view entry (desktop-only)
11. *(divider)*
12. Settings · `⌘K` hint · Theme toggle (System / Light / Dark radiogroup)

**Default sidebar state:** collapsed (icons only). Expand on hover or `⌘/`.

### 6.3 Key web screens (the screens you should design)

For each, light + dark mockups; show empty / loading / populated states where called out.

1. **Setup PIN screen** — first-run only, single field, calm, illustration-free.
2. **Unlock screen** — PIN entry; (stretch: WebAuthn TouchID prompt as the primary, PIN as fallback).
3. **Home / Inbox** — newly-captured items + "Suggested for you" cards (Catch-up / Learn / Discover, GEN-4). Empty state: hero copy + "Add your first item" CTA.
4. **Library list** — card-based, chronological, chip filters at top, multi-select bar appears on first selection. Empty + populated.
5. **Capture page (`/capture`)** — tabbed (URL / PDF / Note), drag-drop dropzone for PDF, paste-URL primary input.
6. **Item detail (dual-pane)** — left: original text in Charter 17px on `bg-light`, max-width 68ch, top progress bar. Right (360px sticky): tabs for **Digest** (summary + key quotes) / **Chat** (per-item RAG) / **Related** (vector neighbors) / **Tags & Collections** (inline editor). Highlight-to-annotate menu floats on text selection.
7. **Ask page (`/ask`)** — full-canvas chat. User bubbles (indigo subtle bg, right-aligned, 75% max width); assistant responses (no bubble, body-md typography, blends into canvas). Citation chips (book-open icon + shorthand id) appear inline; hover/tap expands a 360px source-preview popover. Streaming pulse cursor at the insertion point. Right-side source panel shows top-5 retrieved cards.
8. **Per-item chat (`/items/[id]/ask`)** — same chat UX, but retrieval is scoped to one item; visual hint: tinted top-strip showing the item title.
9. **GenPage viewer** — Charter article-body typography, sections stream in one by one. Each section heading is Charter 22/700; on hover, a **regenerate** icon appears in the right gutter. Inline citation chips after retrieval-grounded sentences. Noun phrases wrapped in **GenLink** (indigo underline at 30% opacity, 1.5px thickness, 3px offset) — the most important novel component.
10. **GenLink panel** — slides in from the right (420px), raised surface, `shadow-md`. Recursive: GenLinks inside the panel open stacked panels with breadcrumb nav. `Esc` or click-outside closes the whole stack.
11. **Flow viewer** — full-screen stepper. Top: `Step N of M` + progress pill. Body: one section at a time (GenPage embedded). Bottom-right: `Continue` button (`Enter` keyboard). End screen: summary + suggested next + "convert to review cards" CTA.
12. **Review page** — centerpiece review card (560×280 min) with top context strip (source title + snippet). Cue in Charter 18–22px; answer hidden until `Space`. Below: 4 rating buttons (Again — danger border / Hard / Good / Easy — success border). Session-end: 14-day retention sparkline + streak.
13. **Explore (graph)** — full-canvas force-directed graph; nodes sized 6px–24px by connection count; edges 1px at 0.5 opacity. Filter rail on the right. Click node opens item in a docked side panel without closing the graph. Toggle: **accessible table view** (parallel data table).
14. **Settings** — sections: Appearance (theme radiogroup) · Account (PIN reset, theme toggle, font size) · LLM providers (Ollama on/off, Anthropic API key field with $cap, Gemini key) · Device pairing (QR code + bearer-token rotation) · Backup (cadence, restore-from-backup) · Obsidian (vault path picker). Calm form layout, no card chrome.
15. **Command palette (⌘K)** — 640px wide, `60vh` max height, raised surface + `shadow-lg`. Single input field, results grouped by type (Items, Collections, Tags, Settings, Actions). Selected item: `primary-subtle` bg.
16. **Empty / loading / error / offline states** — every screen needs all four. Defaults in §10.
17. **Chrome extension popup** (the extension surface) — 360×420px popup. "Save current page" primary CTA + "Add note" secondary. Status pill: "✓ Saved to AI Brain" or "⚠ Mac asleep — retry."

### 6.4 Keyboard shortcuts (must appear in `?` help screen)

| Shortcut | Action |
|---|---|
| `⌘K` | Command palette |
| `⌘/` | Toggle sidebar |
| `⌘J` | Jump to Ask |
| `⌘N` | New capture |
| `⌘\` | Toggle right panel |
| `1` / `2` / `3` / `4` | Rate review card |
| `Space` | Show answer in Review |
| `g i` / `g l` / `g r` / `g e` | Go to Inbox / Library / Review / Explore |
| `?` | Show keyboard shortcuts overlay |

### 6.5 Reading mode (focus mode)

`F` key collapses sidebar + right pane. The reading column becomes 72ch centered, Charter 17px, top progress bar 2px in indigo. **This screen is the soul of the app.** It must feel like Readwise Reader / iA Writer — not a CMS.

---

## 7. The mobile experience (Android, Capacitor WebView)

### 7.1 Topology

The Android APK is a thin **Capacitor 8 WebView** that points at `https://brain.arunp.in`. It's not a separate codebase — same Next.js, same React, same tokens. The APK adds three things:

1. **Share-sheet target** (`@capgo/capacitor-share-target`) — accepts `text/plain` (URLs), `text/*` (notes), `application/pdf` (file uploads).
2. **CapacitorHttp upload path** for large PDFs — bypasses the WebView 256 MB heap.
3. **Compile-time tunnel URL** — the APK has `brain.arunp.in` baked in.

### 7.2 Information architecture (mobile)

**Layout:** top app bar (48px) + main pane + bottom nav (56px tall, 5 items, plus FAB).

**Bottom nav (left → right):**

1. **Home** (inbox + suggested cards)
2. **Library**
3. **+ Capture** (centered FAB, 48px circle, indigo bg, plus icon — opens capture sheet)
4. **Ask**
5. **Review**

Explore (graph), GenPages, Flows, Settings live behind the top-bar overflow menu (`⋮`).

### 7.3 Mobile-specific rules

- **Body floor 16px on every screen** — never scale down for mobile.
- **Tap targets ≥ 44px** everywhere.
- `safe-area-inset-top/bottom` for notch + gesture bar.
- `viewport-fit=cover`, `overscroll-behavior: none` globally.
- **Long-press = bulk-select** (standard Android convention).
- System back gesture maps to `router.back()`; command palette closes on first back.
- Respect Android system font-size scaling (use `rem` units throughout).

### 7.4 Key mobile screens (the screens you should design)

1. **Onboarding** — single screen: "Pair this device" → QR scanner. After scan, the bearer token lands in Capacitor Preferences.
2. **Home (mobile)** — vertical scroll, top: latest items horizontal carousel, then "Suggested for you" cards (Catch-up / Learn / Discover) stacked.
3. **Library (mobile)** — full-bleed list of `card-item`s. Filter chips at top horizontally scrollable. Pull-to-refresh.
4. **Capture sheet (FAB-triggered)** — bottom-sheet, 80% height, tabs (URL / PDF / Note), single primary "Add to Brain" button.
5. **Share-sheet landing** — single screen pre-filled with shared URL/text. One field, one button. Dismiss returns to originating app.
6. **Item detail (mobile)** — single column. Charter 17px body. Tabs at top: **Original / Digest / Chat / Related**. Tap-to-reveal full summary.
7. **Ask (mobile)** — full-screen chat. Message list scrolls; chat input is sticky-bottom with `env(safe-area-inset-bottom)` padding.
8. **Review (mobile)** — single card. **Swipe-right = Good**, **swipe-left = Again**. Tap to reveal answer. Spring physics on swipe (Framer Motion `{stiffness: 300, damping: 28}` — the only place springs are allowed). Fall back to 4 rating buttons if user prefers.
9. **Settings (mobile)** — list of sections with chevrons, native-feeling.
10. **Mac-asleep / offline state** — the most common error. Calm message: *"Brain is resting on your Mac. We'll reconnect when it's awake."* + retry + "Open cached library" (read-only, v0.5+ stretch).
11. **Command palette on mobile** — full-screen overlay (not a modal). Same content, mobile-friendly tap targets.

### 7.5 Surfaces explicitly excluded from mobile

- **Graph view** — replaced by a "Related items" list on item detail.
- **Augmented browsing** — desktop extension only.
- **GenLink stack** — collapses to in-page navigation (panel becomes a full-screen route on mobile).
- **Dual-pane item view** — collapses to tabbed single-pane (Original / Digest / Chat / Related).

---

## 8. Existing design language (for your reference; treat as starting point, propose improvements)

There is already a working design system. The app currently runs in production with this language. **You may critique and propose evolution, but the app's character must remain "Structured Calm — editorial, single-accent, restrained."**

### 8.1 Mood

**Structured Calm.** A reading and thinking app first, a dashboard second. Generous whitespace, one indigo accent (used only for primary CTAs / links / focus rings / active nav), editorial typography for long-form content (Charter), Inter for UI chrome. ⌘K is the power layer; it's the dense surface. The default canvas is quiet.

### 8.2 Reference apps by mode

| Mode | Aspirational reference |
|---|---|
| Capture / Inbox | Things 3, Readwise Reader |
| Consume (read an item) | iA Writer, Readwise Reader dual-pane |
| Organize | Notion sidebar (collapsed), Obsidian tag pane |
| Ask (chat over library) | NotebookLM, Perplexity |
| Generate (GenPage / GenLink / Flow) | NotebookLM audio-overview structure; iBooks dictionary pop-over for GenLink |
| Review (SRS) | Anki keyboard-first, Mochi stats |
| Explore (graph) | Obsidian local graph |
| Settings / command surface | Linear, Raycast |

### 8.3 Color tokens (Radix-derived: Slate + Indigo)

#### Accent — Indigo (used **only** for CTAs / links / focus / active nav)

| Token | Light | Dark |
|---|---|---|
| `primary` (solid) | `#3E63DD` | `#5472E4` |
| `primary-hover` | `#3A5CCC` | `#6983EB` |
| `primary-pressed` | `#3A5BC7` | `#9EB1FF` |
| `primary-subtle` (selected-row, badge bg) | `#F0F4FF` | `#182449` |
| `on-primary` | `#FFFFFF` | `#FFFFFF` |

#### Neutral — Slate

| Token | Light | Dark |
|---|---|---|
| `bg` | `#FBFCFD` | `#111113` |
| `surface` (cards, sidebar) | `#F8F9FA` | `#18191B` |
| `surface-raised` (popovers, modals, inputs) | `#FFFFFF` | `#1D1E20` |
| `border` | `#D7DBDF` | `#2B2D30` |
| `border-strong` (hover, dragger) | `#B9BBC6` | `#43484E` |
| `text-primary` | `#1C2024` | `#EDEEF0` |
| `text-secondary` | `#60646C` | `#9BA1A6` |
| `text-muted` | `#8B8D98` | `#60646C` |

#### Semantic (sparingly)

| Token | Light | Dark | Use |
|---|---|---|---|
| `success` | `#2A7E3B` | `#63C174` | Sync done, enrichment complete |
| `warning` | `#AB6400` | `#F1A10D` | Stale, needs attention |
| `danger` | `#CE2C31` | `#FF6369` | Destructive, conflict |
| `info` | `#00749E` | `#7CE2FE` | Informational |
| `highlight` (article body) | `#FFF3B0` | `#4A3F10` | User highlights |

**Rule:** semantic colors **never** decorate; they only encode their meaning. Color alone is never the only signal — always paired with a Lucide icon.

### 8.4 Typography

- **Inter** (variable, self-hosted, latin subset) — UI chrome, headings, lists.
- **Charter** (system on Apple, fallback `Iowan Old Style, Cambria, Georgia, serif` elsewhere) — long-form reading: item body, GenPage, Flow, SRS card cue.
- **JetBrains Mono** (self-hosted) — `<kbd>`, code, item IDs.

Type scale:

| Token | Size | Weight | Line-height | Use |
|---|---|---|---|---|
| `hero-display` | 48 | 600 | 1.10 | Empty-state hero |
| `page-title` | 30 | 600 | 1.20 | Library, Ask, Review titles |
| `section-title` | 24 | 600 | 1.33 | Home section openers |
| `heading-3` | 20 | 600 | 1.40 | Card titles, modal titles |
| `heading-4` | 18 | 500 | 1.55 | Item titles in lists |
| `body-md` | 16 | 400 | 1.50 | UI body — **floor for readable text** |
| `body-sm` | 14 | 400 | 1.43 | Dense UI, sidebar items |
| `caption` | 12 | 400 | 1.33 | Metadata, tag chips |
| `button-md` | 14 | 500 | 1.00 | Buttons |
| `article-body` | 17 (Charter) | 400 | 1.60 | Item body, GenPage body |
| `article-heading-1` | 28 (Charter) | 700 | 1.30 | Reading-mode H1 |
| `article-heading-2` | 22 (Charter) | 700 | 1.35 | GenPage section heading |
| `article-quote` | 18 (Charter, italic) | 400 | 1.55 | Pull quotes |
| `mono-kbd` | 12 (JetBrains) | 500 | 1.00 | `<kbd>` shortcuts |

Tracking: `-0.01em` for ≥18px, `0` below. Negative tracking on display sizes (`-0.02em`). Never uppercase UI labels.

### 8.5 Geometry

- `rounded-sm` 4px (chips, inputs)
- `rounded-md` **8px (buttons, default)**
- `rounded-lg` **12px (cards, modals, sheets)**
- `rounded-full` 9999px (pills — status dots, due badges, FAB only)

Buttons are **rectangles, not pills**. Pills are reserved for status badges, due-count, flow-progress.

### 8.6 Spacing (4px base)

`xxs` 4 · `xs` 8 · `sm` 12 · `md` 16 · `lg` 20 · `xl` 24 · `xxl` 32 · `xxxl` 48 · `section` 64 · `section-lg` 96.

### 8.7 Elevation (3 tiers, restrained)

| Level | Light | Dark | Use |
|---|---|---|---|
| 0 (flat) | none + 1px border | none + 1px border | Cards, item rows, sidebar, bottom nav |
| 1 (subtle) | `0 1px 2px rgba(15,18,25,.06)` | `0 1px 2px rgba(0,0,0,.4)` | Review card, FAB |
| 2 (floating) | `0 6px 24px rgba(15,18,25,.08)` | `0 6px 24px rgba(0,0,0,.5)` | Popovers, GenLink panel, toasts |
| 3 (modal) | `0 16px 48px rgba(15,18,25,.12)` | `0 16px 48px rgba(0,0,0,.6)` | Command palette, modals, dialogs |

Shadows are for **floating** layers only. Flat surfaces get a 1px border, never a shadow.

### 8.8 Motion

| Token | ms | Use |
|---|---|---|
| `duration-fast` | 80 | Hover state |
| `duration-base` | 120 | State change |
| `duration-med` | 150 | Sidebar expand, panel slide |
| `duration-slow` | 300 | Sheet, modal |

Easing: `cubic-bezier(0, 0, 0.2, 1)` enter; `cubic-bezier(0.4, 0, 1, 1)` exit; `cubic-bezier(0.4, 0, 0.2, 1)` symmetric. Mobile swipe-to-rate is the only place springs are allowed (Framer Motion `{stiffness: 300, damping: 28}`).

**What does NOT animate:** command palette open/close (instant), list reorder, theme switch (instant repaint via `color-scheme`), streaming tokens (single pulsing 8×18px cursor at 900ms; no per-token animation).

`prefers-reduced-motion: reduce` collapses all motion to 0ms; pulsing cursor becomes a static underscore.

### 8.9 Iconography

- **Lucide** at 16 (UI), 20 (nav), 24 (empty-state). 2px stroke. Tree-shakable. **Never mix icon libraries.**

### 8.10 Component primitives (shadcn/ui + Radix + Tailwind 4)

- `Button` (primary / secondary / ghost / destructive / link / icon)
- `Input`, `Textarea`, `Select` (Radix Select — never native), `Combobox`
- `Card`, `CardItem` (88px min height; library list row)
- `Dialog`, `Sheet` (right / bottom), `Popover`, `Tooltip`
- `Sidebar` + `SidebarItem` (32px row, 16px icon + label, active = `primary-subtle` bg)
- `BottomNav` + `BottomNavItem` + `BottomNavFAB` (mobile)
- `CommandPalette` (Radix Command primitive — 640px wide, 60vh max)
- `Toast` (top-right, 360px, one at a time, 4s auto-dismiss)
- `Badge`, `Chip` (`tag-chip`, `citation-chip`, `due-badge`, `enriching-pill`, `status-dot-{synced/pending/conflict}`)
- `Kbd` (JetBrains 12px, 2px bottom border)
- `Skeleton` (shimmer using `surface-raised`, 1200ms)
- `EmptyState` (single Lucide icon 32px in `text-muted`, one-line hint, one CTA — illustration-free)

### 8.11 Novel component: GenLink

The most important visual primitive in the app. Specification:

```
genlink-underline:
  textColor: text-primary
  textDecoration: underline
  textDecorationColor: primary at 30% opacity
  textDecorationThickness: 1.5px
  textUnderlineOffset: 3px
  cursor: pointer

genlink-panel (slides in from right):
  backgroundColor: surface-raised
  borderLeft: 1px border
  shadow: shadow-md
  width: 420px
  padding: spacing.xl (24px)
  transition: transform 150ms cubic-bezier(0,0,0.2,1)
```

Recursive: GenLinks inside the panel open *stacked* panels with breadcrumb navigation at the top of each new layer. `Esc` or click-outside closes the entire stack.

---

## 9. What I want from you (the designer)

Produce **four deliverables**, in this order, in a single response:

### 9.1 Logo + brand identity (Deliverable 1)

A logo / wordmark that captures **"local-first, calm, brain-as-knowledge-substrate."**

- **Mood references:** Linear, Things 3, Readwise, iA Writer. Modern, minimal, editorial.
- **Avoid:** generic AI/neural-network glyphs, cliché brain illustrations, gradients, glow effects, the color purple, the color cyan, anything that screams "ChatGPT clone."
- **Show:** mark variants (icon-only square 1024px, horizontal lockup, vertical lockup), light + dark variants, favicon (32px, 16px), Android adaptive icon (foreground + background layers, 108×108dp).
- **Single accent:** indigo `#3E63DD` (light) / `#5472E4` (dark). No second color.
- **Wordmark:** Inter or a hand-tuned variant. Tight letter-spacing on display sizes.
- **Concept brief:** the logo should evoke **a quiet container for thought** — not a CRM, not a chatbot, not a graph. Imagine the Apple Notes icon's restraint × Things 3's craft × Obsidian's local-first ethos. A subtle architectural cue (a folded sheet, a stacked card, a small constellation, an open book glyph) is welcome but not required.

### 9.2 Web app mockups (Deliverable 2)

Full mockups (light + dark) for these screens, in this order of priority:

**P0 (must have):**
1. Library list — populated state, sidebar collapsed, theme toggle in upper-right.
2. Library list — populated state, sidebar expanded, multi-select bar visible.
3. Item detail (dual-pane) — original on left (Charter 17px, 68ch column), digest tabs on right (360px sticky).
4. Ask page — chat with streaming response in flight, citation chips inline, source-preview popover open.
5. GenPage viewer with **GenLinks visible** (indigo underlines on noun phrases) and a **GenLink panel** sliding in from the right showing a recursive sub-page.
6. Command palette (`⌘K`) overlay on a Library backdrop.

**P1 (should have):**
7. Capture page (tabbed URL / PDF / Note) with PDF drag-drop dropzone in active state.
8. Review (SRS) — centerpiece review card mid-rating with all 4 rating buttons visible.
9. Home / Inbox — "Suggested for you" cards (Catch-up / Learn / Discover) stacked.
10. Settings — full settings page with sections, theme radiogroup highlighted.
11. Explore (graph view) — force-directed graph with filter rail and a side-panel showing a clicked node.
12. Empty state for Library (first-run) + Mac-asleep error state.

**P2 (nice to have):**
13. Flow viewer (full-screen stepper at step 3 of 7).
14. Per-item chat (showing tinted top-strip with item title).
15. Chrome extension popup (360×420).

For each screen: **light + dark side by side, with tokens labeled** (`bg`, `surface`, `surface-raised`, `border`, `primary`, etc.) so the system stays traceable.

### 9.3 Mobile app mockups (Deliverable 3)

Full mockups (light + dark) for these screens, framed in a Pixel 8 / Pixel 9 device frame:

**P0:**
1. Library (mobile) — populated, bottom nav visible, FAB centered.
2. Capture sheet — bottom-sheet 80% height with tabs.
3. Item detail (mobile) — tabbed (Original / Digest / Chat / Related), Charter body.
4. Ask (mobile) — chat with streaming + sticky-bottom input + safe-area padding.
5. Review (mobile) — review card in mid-swipe (with spring trail) or 4 rating buttons.
6. Share-sheet landing — pre-filled URL, one field, one button.

**P1:**
7. Home (mobile) — top carousel + suggested cards stacked.
8. Onboarding QR-pair screen.
9. Mac-asleep / offline error.
10. Settings (mobile, list-style with chevrons).

### 9.4 Design system file (Deliverable 4)

A complete, organized design-system Figma file (or equivalent) containing:

1. **Cover page** — logo, version, last-updated, philosophy statement ("Structured Calm").
2. **Foundations** — color tokens (light + dark, with hex + semantic role), typography scale (with Charter / Inter / JetBrains samples), spacing scale, radius scale, elevation scale, motion table.
3. **Components library** — every primitive listed in §8.10 + every composed component in §8.11. Each with default / hover / pressed / focused / disabled / loading states. Light + dark variants. Auto-layout, variants, properties.
4. **Patterns** — empty / loading / error / offline state defaults. Full keyboard-shortcut reference. Citation chip + source-preview popover composition. GenLink panel stacking pattern.
5. **Information architecture** — desktop sidebar layout, mobile bottom nav, command palette IA.
6. **Accessibility checklist** — contrast pairs, focus ring spec, ARIA conventions for streaming + graph + GenLink.
7. **Cross-platform notes** — what changes between web (desktop / tablet) and mobile (Capacitor WebView). Safe-area insets. Touch targets. Gesture conventions.

The file should be usable as a **handoff artifact**: a developer (or another AI agent) can open it and implement any screen without ambiguity. Every token names itself; every component declares its variants; every state is a frame, not a description.

---

## 10. Non-negotiable design rules (read these before drawing anything)

### Do

- Use `primary` (indigo) **only** for: primary CTA backgrounds, link text, focus rings, active nav-item bg. Nothing else.
- Apply `rounded-md` (8px) to buttons, `rounded-lg` (12px) to cards / modals / sheets, `rounded-full` to status dots, due badges, the FAB, flow-progress pills.
- Use **Charter** for article bodies, GenPage sections, Flow step content, SRS card cue. **Inter** for everything else UI.
- Use **Lucide** at 16/20/24px. 2px stroke. Never mix icon libraries.
- `body-md` (16px) is the **floor** on every platform — never scale text below.
- Light + dark are first-class peers. Every screen shipped in both.
- Pair every semantic color (success / warning / danger / info) with a Lucide icon. Color alone is never the only signal.
- Honor `prefers-reduced-motion: reduce` — collapse to 0ms.
- Map every interactive element to a keyboard shortcut surfaced in `⌘K` and the `?` overlay.

### Don't

- No second accent color. No indigo washes on the canvas.
- No pill-shaped rectangles for regular buttons. (Pills are reserved.)
- No per-token animation on streaming AI output — single pulsing cursor only.
- No full-screen spinners. Skeletons matching final layout, every time.
- No shadows on flat surfaces — shadows are for floating layers only.
- No gradients on UI chrome. (Background gradients in marketing-only screens are OK.)
- No emoji in UI surfaces; only in user-authored content.
- No raw hex in components — every color is a token.
- No fade on theme switch — instant repaint via `color-scheme`.
- No more than three modal layers stacked.

---

## 11. Project state (what you're designing for, today)

**Built and running:**
- Next.js 16 + React 19 + Tailwind 4 web app, deployed via Cloudflare Named Tunnel at `brain.arunp.in`.
- SQLite + sqlite-vec single-file DB on the Mac (currently transitioning to a Hetzner CX23 VM at v0.6.0 cutover).
- Capacitor 8 Android APK (`brain-debug-0.5.1.apk`, ~8 MB), sideloaded on a Pixel.
- Chrome MV3 extension (popup + right-click context menu).
- 260+ unit tests, 4+ smoke suites, all passing.
- Auth: PIN (PBKDF2-HMAC-SHA256) + HMAC session cookie + bearer token for the APK + extension.
- Local LLM: Ollama with `qwen2.5:7b-instruct-q4_K_M` (24 tok/s on M1 Pro). Cloud fallback: Anthropic Claude Haiku 4.5 + Sonnet 4.6, Google Gemini for embeddings (`gemini-embedding-001 @ 768-dim`).

**In flight (May 2026):**
- v0.6.0 cloud migration to a Hetzner VM (Phase D mid-cutover).
- v0.6.x Augmented Browsing (extension highlights matching phrases on any page).
- v0.6.x Knowledge Graph view (desktop-only).

**Next big features to design for:**
- v0.6.0 GenPage + GenLink (the marquee novel features).
- v0.8.0 Review (SRS) with FSRS scheduler.
- v0.9.0 Flow + proactive home cards.

**The designer's job is to give this product a visual identity strong enough to make the 4-month build feel like a real product, not a clone, and to set the design language for everything that ships next.**

---

## 12. One sentence for the designer

> AI Brain is **a calm, editorial, local-first home for everything I read** — give it a logo, web mockups, mobile mockups, and a design system that make it feel like a tool I'd want to open every morning at 6am with coffee.
