# AI Brain Product Model - Design Synthesis

Created: 2026-06-11
Role: Product/design source of truth for redesign exploration.

## One Sentence

AI Brain is a private personal knowledge system that captures what Arun reads or watches, turns it into searchable and source-grounded memory, and helps him recover, repair, understand, and reuse that knowledge later.

## Product Positioning

AI Brain started as a local-first personal alternative to the combined strengths of Recall.it and Knowly:

- Recall contributes the capture, mobile share, search, graph, and retention/review inspiration.
- Knowly contributes the "saved to understood" inspiration: proactive digests, GenPage, GenLink, Flow, and auto-organization.

The current phase has evolved beyond the original local-only Mac plan. The active product is a hosted personal app behind `brain.arunp.in`, with a web app, Android APK, Telegram capture, extension path, SQLite storage, provider guardrails, and production deployment practices.

The product should not look or feel like a generic chatbot. The primary object is the saved source. Chat is one way to work with sources, not the whole product.

## Core Problem

The old habit is "save now, maybe understand later." The failure mode is a graveyard of good intentions: PDFs, YouTube videos, Substack posts, LinkedIn links, notes, and articles saved into a library that becomes too hard to revisit.

AI Brain must solve four jobs:

1. Capture valuable material quickly, from the places where it is discovered.
2. Preserve enough source context to trust it later.
3. Make weak or partial captures easy to find and repair.
4. Let the user retrieve, ask, read, cite, and review the right material later.

## Audience

Primary audience:

- Arun as an audience of one.
- Heavy reader/watcher of business, product, technology, AI, and long-form knowledge material.
- Tool-savvy and comfortable with AI-assisted workflows.
- Wants ownership, portability, and source-grounded recall more than social/productivity polish.

Secondary future audience:

- Other single-user knowledge workers who want private capture and retrieval.
- AI agents or coding assistants that need read-only access to personal context.

## Product Principles

### 1. Source First

Saved items are the atomic unit. Every AI answer, review card, digest, generated page, or recommendation must be traceable back to sources.

Design implication:

- Item detail, citations, highlights, capture diagnostics, and source previews are core surfaces, not secondary metadata.

### 2. Trust Before Magic

Weak captures must be visible and repairable. The UI should never pretend that a metadata-only YouTube or LinkedIn link is equivalent to a full transcript/post.

Design implication:

- Quality labels, improvement hints, "needs upgrade" workflows, and citation confidence should be first-class.

### 3. Calm Default, Power On Demand

The existing "Structured Calm" philosophy remains right: a reading/thinking app first, a dashboard second.

Design implication:

- The Library and item detail screens should feel quiet.
- Power features should live in filters, command palette, contextual actions, and scoped panels.

### 4. Capture Must Not Break Flow

Capture should complete quickly and never punish the user because extraction is imperfect.

Design implication:

- Save first.
- Enrich asynchronously.
- If full text cannot be fetched, save metadata and provide a repair path.

### 5. Reading Is The Center

The app only becomes valuable if Arun wants to open it and read from it.

Design implication:

- Long-form content needs editorial typography, comfortable line length, focus mode, citation/passages, and reduced chrome.

### 6. Cross-Platform Means Same Brain, Different Posture

Web, Android APK, extension, Telegram, and future API/MCP surfaces are not separate products. They are capture or access points into the same memory system.

Design implication:

- Each surface should expose the same source quality model and explain where a capture came from.

## Core Mental Model

The durable product model is:

```text
CAPTURE -> EXTRACT -> ENRICH -> STORE -> SURFACE -> REPAIR/REUSE
```

The original docs stop at `SURFACE`; the current v0.8 direction adds a crucial loop:

```text
SURFACE -> NOTICE WEAKNESS -> UPGRADE -> RESET DERIVED STATE -> SURFACE AGAIN
```

This matters because AI Brain now saves blocked/weak platform content instead of failing. The UX must help the user turn weak saves into useful memory.

## Current Product Baseline

Current shipped or strongly evidenced capabilities include:

- Library list with search and bulk selection.
- URL, PDF, and note capture.
- YouTube capture with transcript attempts and metadata-only fallbacks.
- Telegram capture path for YouTube, Shorts, LinkedIn, Substack, and user-provided text.
- Capture quality labels such as metadata-only and user-provided full text.
- Item detail with original content, capture diagnostics, tags, collections, summary, key quotes, related items, Ask-this-item, export, and delete.
- Global Ask with streaming answers and citation chips.
- Per-item Ask.
- Semantic/FTS/hybrid search and related-items retrieval.
- Settings and device pairing.
- Android APK via Capacitor/WebView and Cloudflare/Hertzner-hosted origin.
- Production backup, provider checks, and deployment hygiene.

## Future Product Tracks

Planned or deferred tracks:

- Capture Review Inbox / Needs Attention surface.
- Browser selected-text capture.
- Substack email/paste capture.
- Quality-aware and scoped Ask.
- Source highlights and passage navigation.
- Android offline item reads from device store.
- Read-only API/MCP.
- Lightweight weekly review.
- Structured Calm Green visual refresh.
- GenPage, GenLink, Flow, SRS, graph, augmented browsing, Obsidian sync.

## Product Boundary

AI Brain should avoid becoming:

- A general AI chatbot.
- A Notion-style block editor.
- A social sharing product.
- A full web-scraping platform.
- A gamified learning app before source quality is solved.
- A graph visualization product before the library is large and trustworthy.

The strongest near-term product wedge is:

> trustworthy capture + repairable source quality + source-grounded retrieval.
