# AI Brain Design Requirements Document

Created: 2026-06-11
Purpose: Design requirements for Android and web redesign exploration.
Status: Design input, not production implementation scope.

## Design Objective

Redesign AI Brain so it feels like a calm, trustworthy personal memory system for high-value sources. The design must make capture quality, source provenance, repair workflows, reading, and source-grounded Ask feel coherent across web and Android.

## North Star Experience

The user should be able to:

1. Capture something from Telegram, web, Android, extension, or manual paste.
2. Immediately know whether Brain saved full text, transcript, preview, or metadata only.
3. Repair weak captures without creating duplicates.
4. Read the source comfortably.
5. Ask questions with confidence about what evidence was used.
6. Return later through search, filters, related items, review, or export.

## Information Architecture Requirements

### IA-1: Separate Memory From Maintenance

The app needs two primary Library modes:

- Library: the calm archive of saved sources.
- Needs Attention / Capture Review: weak captures, failed enrichments, metadata-only saves, preview-only saves, duplicate candidates, and unindexed items.

Do not force repair work into the main reading flow unless the user opens a weak item.

### IA-2: Keep Ask As A Work Surface, Not The Home

Ask should remain a primary nav item, but the default product should not open as a chat window. The core product object is a saved source.

### IA-3: Treat Future Features As Progressive Layers

GenPages, Review, Flow, Explore, and Augmented Browsing should be visible as future product directions only when their workflows are defined. Avoid permanent disabled nav clutter unless it helps roadmap orientation.

### IA-4: Use A Consistent Quality Vocabulary

Every surface should use the same user-facing language for capture quality:

- Full text
- Transcript
- Transcript plus metadata
- Metadata only
- Preview only
- User-provided text
- Browser capture
- Email body
- Failed

These labels should map to internal values but should not expose internal enums directly.

## Screen Requirements

## 1. Library

Required states:

- Empty
- Populated
- Loading/syncing
- Search results
- Filtered by quality
- Bulk-select active
- Offline/cached
- Error

Required controls:

- Search
- Capture CTA
- Quality segmented control:
  - All
  - Needs upgrade
  - Full text
  - Metadata only
  - Preview only if Substack preview remains common
- Optional source-type filters:
  - YouTube
  - LinkedIn
  - Substack
  - PDF
  - Note
  - Article
- Multi-select actions:
  - Ask selected
  - Add tag
  - Add to collection
  - Delete
  - Export

Row/card requirements:

- Source icon.
- Title.
- Platform.
- Quality label.
- Captured date.
- Processing/indexing status if relevant.
- Summary snippet only if it adds value; do not make rows too tall by default.
- Action affordance for weak captures.

## 2. Capture

Required capture modes:

- URL
- PDF
- Note
- Paste article/newsletter
- Paste transcript or notes for existing item
- Browser selected-text capture in extension prototypes

Capture UX requirements:

- Save-first behavior.
- Clear acknowledgement:
  - captured full text
  - saved preview
  - saved metadata only
  - updated existing item
  - duplicate not overwritten
- If extraction is weak, show the repair action immediately.
- Do not use full-screen spinner; use inline progress and queued/enriching states.

## 3. Capture Review / Needs Attention

This is the highest-priority new UX surface.

Required item types:

- YouTube/Shorts metadata-only.
- LinkedIn metadata-only.
- Substack preview-only.
- Captures with no summary.
- Captures with no embeddings/search index.
- Duplicate candidates.
- Failed artifact writes if user-relevant.

Required row actions:

- Add transcript or notes.
- Paste post/article text.
- Open source.
- Mark as good enough.
- Retry extraction.
- Delete.
- Merge duplicate.

Design tone:

- Calm maintenance queue, not scary error dashboard.
- Plain language: "Needs text to be useful in Ask" rather than "metadata_only."

## 4. Item Detail

Required layout on desktop:

- Left reading column with source body.
- Right panel with:
  - Capture quality/provenance
  - Summary
  - Key quotes
  - Tags
  - Collections
  - Related items
  - Ask this item
  - Upgrade action when eligible

Required layout on mobile:

- Single column.
- Sticky or top tabs:
  - Original
  - Digest
  - Chat
  - Related
  - Capture details if needed

Required interactions:

- Ask this item.
- Export Markdown.
- Open source URL.
- Delete with confirmation.
- Add transcript/notes for weak captures.
- Highlight/citation passage navigation.
- Focus reading mode.

Reading requirements:

- Comfortable line length around 65-72ch on desktop.
- Body text floor 16px; article body 17-18px.
- Editorial typography for long-form content.
- Source body remains central; AI digest should not visually overpower it.

## 5. Ask

Required modes:

- Ask all.
- Ask this item.
- Ask selected items.
- Ask by source type.
- Ask by tag/collection.
- Ask high-quality only.
- Ask date range.

Answer requirements:

- Show retrieval scope before or during answer.
- Stream answer.
- Inline citation chips.
- Source panel with top retrieved sources.
- Citation quality label.
- Warning if answer used metadata-only or preview-only sources.
- Jump to cited passage.
- Stop generation control.
- Error states in plain language.

Design principle:

- Assistant answer should feel like an evidence-backed reading note, not an isolated chat bubble.

## 6. Settings And Pairing

Required sections:

- Appearance.
- Device pairing.
- Connected devices / token rotation.
- Provider health and fallback.
- Backup/restore/export.
- Offline library sync.
- Tags and collections.
- Data/privacy/trust.

Copy requirements:

- Avoid false local-only claims now that the app uses hosted/cloud-tunnel infrastructure.
- Explain Cloudflare/Hetzner/provider behavior honestly in user-level language.

## 7. Android APK

Required mobile experiences:

- Bottom nav.
- Capture FAB or obvious capture entry.
- Share-sheet landing.
- Offline library state.
- Offline item read state.
- Mac/server unreachable state.
- Device pairing.
- Safe area handling.

Mobile interaction requirements:

- Tap targets at least 44px.
- Body floor 16px.
- Long press for multi-select if used.
- Back gesture closes overlays before navigating away.
- No hover-only actions.

## 8. Browser Extension

Required redesign direction:

- Capture selected text with source URL.
- Capture current page URL.
- Upgrade existing weak item if URL matches.
- Optional note field.
- Clear success/weak/upgrade state.

Permission posture:

- Prefer explicit user gesture with `activeTab`.
- Avoid broad always-on scraping in MVP.

## Component Requirements

### Capture Quality Badge

Must communicate platform + quality without alarm.

Examples:

- YouTube - metadata only
- YouTube - transcript
- LinkedIn - pasted text
- Substack - preview only
- Article - full text

### Improvement Hint

Must be platform-specific:

- YouTube metadata only: "Add transcript or notes to make this useful in Ask."
- LinkedIn metadata only: "Paste the post text to upgrade this capture."
- Substack preview only: "Paste the newsletter or article body if you have it."

### Citation Chip

Must show:

- Citation index.
- Source title on hover/tap.
- Source quality when expanded.
- Link to exact passage if available.

### Upgrade Form

Must support:

- Textarea.
- Source URL preserved.
- Minimum meaningful text validation.
- Success state that says the existing item was updated.
- Note that summaries/search will refresh.

### Empty State

Must include:

- One icon.
- One plain-language sentence.
- One primary action.
- No decorative illustration unless a future brand direction explicitly adds one.

## Visual Requirements

Current approved foundation:

- Structured Calm.
- Editorial, restrained, source-first.
- Inter for UI.
- Charter or equivalent editorial serif for reading.
- Lucide icons.
- Single accent.
- Light and dark parity.

Open visual decision:

- Keep current indigo/Charter direction, adopt Structured Calm Green/Newsreader, or create a refined third direction.

Design constraints:

- Avoid generic AI/neural/brain visuals.
- Avoid flashy gradients and AI-glow styling.
- Avoid making the app look like a CRM/dashboard.
- Avoid multiple accent colors.
- Avoid one-note monochrome surfaces.

## Accessibility Requirements

- Text contrast 4.5:1 for normal text.
- Visible focus ring on all controls.
- Keyboard access to command palette and major actions.
- `aria-live="polite"` for streaming Ask.
- No color-only status.
- Reduced motion support.
- Mobile font scaling support.
- Graph must have accessible table alternative if built.

## State Requirements

Every major screen must define:

- Empty.
- Loading.
- Enriching/indexing.
- Success.
- Weak/needs upgrade.
- Error.
- Offline/unreachable.
- Permission/auth expired.
- Duplicate.

## Prototype Requirements

For the next design phase, prototype in this order:

1. Library + Needs Upgrade filter.
2. Capture Review Inbox.
3. Item detail with upgrade form and source-grounded citation/passages.
4. Quality-aware Ask with scoped controls.
5. Android share/capture/offline item read.
6. Browser selected-text capture extension popup.

GenPage, GenLink, Flow, graph, and full SRS should be explored after the capture-to-trust loop is redesigned.
