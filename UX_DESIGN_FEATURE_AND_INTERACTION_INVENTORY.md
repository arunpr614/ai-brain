# AI Brain Feature And Interaction Inventory

Created: 2026-06-11
Purpose: Current and planned feature inventory from a UI/UX perspective.

## Surface Map

### Web App

Current active screens and routes:

- Library: `/`
- Capture: `/capture`
- Item detail: `/items/[id]`
- Per-item Ask: `/items/[id]/ask`
- Global Ask: `/ask`
- Search: `/search`
- Settings: `/settings`
- Tags and collections settings
- Device pairing: `/settings/device-pairing`
- Setup, unlock, APK setup
- Debug quota page

Current web navigation:

- Sidebar on desktop.
- Bottom nav on mobile.
- Enabled nav items: Library, Ask, Settings.
- Capture is available through Library CTA and command paths.
- GenPages and Review appear as disabled "soon" items in current sidebar code.

Target/nav from design docs:

- Inbox/Home
- Library
- Collections
- Tags
- Ask
- GenPages
- Flows
- Review
- Explore/Graph
- Settings
- Command palette

Design gap:

- The design docs describe a richer IA than the active app exposes. The redesign should decide whether to promote "Needs upgrade" as the real next home/inbox before adding GenPages/Review/Explore as primary nav.

### Android APK

Current model:

- Thin Capacitor WebView pointed at hosted Brain origin.
- Share target and device pairing exist.
- Bottom nav is present on small screens.
- Offline shell and offline/read plans exist; full offline item reads are still a planned track.

Target model:

- Fast capture and reading companion.
- Bottom nav with Home/Library/Capture/Ask/Review.
- Capture sheet for URL/PDF/Note/user-provided text.
- Offline cached library and item reads.
- Clear "Brain is unreachable/resting" state.

Design gap:

- Current mobile IA is simple web-responsive navigation, not yet a fully designed Android-first capture/review experience.

### Browser Extension

Current model:

- Chrome MV3 extension exists historically for popup/context-menu capture.

Next design need:

- Selected-text capture.
- Active-tab explicit user action.
- Capture visible selected text with source URL/title.
- Upgrade existing weak capture when source URL matches.

Design gap:

- Extension should be redesigned as a precision capture tool, not only "save this URL."

### Telegram Capture

Current model:

- Telegram is an important input surface in Phase 2.
- Handles YouTube, Shorts, LinkedIn, Substack, and pasted text paths.
- Current strategy: save reliably, then classify quality and upgrade when user provides text.

Design implication:

- Telegram responses are UX. They need consistent product language:
  - Saved full text.
  - Saved metadata only.
  - Saved preview only.
  - Updated existing item.
  - Here is how to upgrade.

### API / Future MCP

Current model:

- Capture API and provider-status APIs exist.
- Future read-only API/MCP is recommended by competitor research.

Design implication:

- API/MCP should expose source quality, provenance, and weak-capture status from day one.

## Feature Inventory By Domain

## 1. Capture

Current:

- URL capture.
- PDF capture.
- Note capture.
- YouTube video/Short capture with metadata fallback.
- Telegram capture.
- LinkedIn metadata-only and pasted-text path.
- Substack public/preview classification work.
- Platform and quality labels.
- Artifact storage and capture hardening.

Planned/needed:

- Capture Review Inbox.
- Browser selected-text capture.
- Paste article/newsletter capture.
- Substack email-body capture.
- Better web item-page "Add transcript or notes" upgrade action.
- Production-safe capture upgrade smoke.

Design requirements:

- Capture should always tell the user what was saved and how strong it is.
- Weak capture repair should be one clear action.
- Full extraction failure should not feel like a system failure if metadata was saved.

## 2. Library And Organization

Current:

- Chronological Library.
- Search input.
- Card/row list.
- Bulk select with tag, collection, delete.
- Platform and quality labels on rows.
- Tags and collections CRUD.
- Related items on item detail.

Planned/needed:

- Needs Upgrade filter.
- Full Text / Metadata Only / Needs Upgrade segmented control.
- Capture Review Inbox or Review surface.
- Auto-collections/smart filters later.

Design requirements:

- Library should remain calm but gain triage affordances.
- Quality filters should not make the Library feel like an operations dashboard.
- Metadata-only should read as a state, not an error.

## 3. Item Detail / Reading

Current:

- Long-form item body.
- Capture quality and diagnostic panel.
- Source URL.
- Extraction warning message.
- Tags and collections editors.
- Summary and key quotes.
- Related items.
- Ask this item.
- Export as Markdown.
- Delete.
- Citation-highlight landing from Ask.

Planned/needed:

- Real upgrade form for weak captures.
- Highlight saved selected passages.
- Citation source preview and passage navigation.
- Reading focus mode.
- Original/Digest/Chat/Related tab collapse on mobile.
- Better thumbnail/media metadata handling for YouTube/Shorts.

Design requirements:

- The item page is the core "truth" screen.
- Capture diagnostics need to be human-readable and action-oriented.
- AI summaries should be visually subordinate to the source, not replace it.

## 4. Ask / RAG

Current:

- Global Ask.
- Per-item Ask.
- Streaming response.
- Retrieved chunk list.
- Citation chips that link back to an item and highlighted chunk.
- Error states for provider failures.

Planned/needed:

- Scoped Ask by selected items.
- Scoped Ask by source type, tag, date, quality.
- "Ask only high-quality captures" mode.
- Warnings when weak captures were used.
- Source quality labels in citations.
- Multi-select chat from Library.

Design requirements:

- Ask should make retrieval scope obvious.
- Answers must show evidence, not only text.
- Citations should convey both source and source quality.

## 5. Settings / Trust / Operations

Current:

- Settings.
- Device pairing.
- Provider status.
- Backup and deployment work exists in docs.
- Token rotation paths exist.

Planned/needed:

- Clear state for connected devices.
- Offline sync status.
- Provider health and fallback state in user language.
- Capture artifact/storage transparency if needed.
- Data export and restore confidence.

Design requirements:

- Settings should serve trust, not expose raw ops jargon.
- Device pairing and tokens must be understandable without developer context.

## 6. Future Generative Features

Planned:

- GenPage.
- GenLink.
- Flow.
- Proactive suggestions / weekly digest.

Design recommendation:

- Do not make these dominant in the next redesign.
- First prototype a smaller "Briefing from selected sources" pattern that builds on scoped Ask and source trust.

## 7. Future Review / Retention

Planned:

- Full SRS with FSRS.
- Review cards.
- Streak/stats.
- Android notifications.

Design recommendation:

- Build lightweight weekly review first:
  - new captures this week
  - weak captures needing upgrade
  - older useful sources
  - "ask about these" action

## Current Interaction Patterns

### Successful Capture

1. User submits URL/PDF/note/Telegram content.
2. Item appears in Library.
3. Enrichment/search/indexing run asynchronously.
4. Library/detail show processing/quality state.

### Weak Capture

1. Platform blocks full extraction or only metadata is available.
2. Item still saves.
3. Library row shows quality label.
4. Item detail shows improvement hint.
5. Needed next: one-click or inline upgrade action.

### Ask With Citation

1. User asks globally or inside one item.
2. System retrieves chunks.
3. Response streams.
4. Citation chips appear inline.
5. Chip links back to item page and highlighted passage.

### Bulk Organization

1. User selects one or more Library rows.
2. Floating bulk bar appears.
3. User tags, adds to collection, or deletes.

## Design Risk Areas

- Some copy still reflects technical implementation rather than user intent.
- Disabled future nav items may create expectation debt.
- The Library has quality labels but not yet enough workflow around them.
- Ask citations are functional but visually minimal; they do not yet explain quality or context.
- Android currently inherits web UX rather than having a fully designed mobile-first capture/read posture.
- Current `package.json` version can lag the deployed/running-log version; user-facing version labels need one source of truth.
