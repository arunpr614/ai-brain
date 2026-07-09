# AI Memory Agent Handoff Brief

Created: 2026-06-13 21:57 IST

## Product Summary

AI Memory is a private knowledge-capture and retrieval product. It helps users save sources from multiple entry points, understand how strong each saved source is, organize saved knowledge, and ask grounded questions across selected memory.

Supported capture sources:

- Telegram
- Android app
- Web app
- Chrome extension
- Android share sheet
- PDF upload
- Manual notes

Core product promise:

- Capture first.
- Preserve source context.
- Make quality and trust visible.
- Let the user read and organize.
- Let AI answer only with visible grounding.

## Product Name

Use `AI Memory` in the implemented app.

Historical project files and exact prototype exports may say `AI Brain`. Treat that as the older project name. User-facing implementation copy must say `AI Memory`.

Read `BRAND_COPY_MIGRATION.md` before implementing any screen copy.

## Primary Users

- A knowledge worker who saves links, videos, documents, notes, and posts throughout the day.
- A mobile-first user who captures quickly and returns later to repair or read.
- A desktop user who reviews, organizes, asks questions, and manages settings.

## Core Concepts

- Source platform: what the original item is, such as YouTube, LinkedIn, Substack, PDF, Manual note.
- Captured via: how it entered AI Memory, such as Telegram, Android share, Chrome extension, Web capture.
- Source quality: how usable the captured content is for reading and Ask.
- Tags: user-managed labels, sometimes suggested by AI.
- Included topics: AI-detected topics covered by an item. These are clickable but not manually added.
- Collections: user-created groupings.
- Ask scope: the source set used for an answer.
- Citations: visible evidence for an answer.
- Needs Upgrade: items that are too weak for reliable Ask until repaired.

## Major Product Areas

- Login, unlock, pairing, offline fallback.
- Library browse, search, filtering, and multi-select.
- Capture and capture result handling.
- Needs Upgrade queue.
- Item detail and focus/read mode.
- Tags, Included topics, Collections.
- Ask with history, citations, and scoped context.
- Settings and data/privacy controls.

## Non-Negotiable Product Truths

- Do not claim end-to-end encryption exists. It is coming soon.
- Do not claim privacy controls are active if they are not active. Keep them disabled and labeled as coming soon.
- Do not invent Continue Reading unless reading-position tracking exists.
- Do not merge Source platform and Captured via.
- Do not treat all saved items as equally reliable for Ask.
- Do not hide source quality warnings.
- Do not make topics manually addable; topics are AI-detected.

## Implementation Tone

AI Memory should feel private, calm, and source-aware. It should not feel like a generic chatbot, a marketing landing page, or a rainbow dashboard.
