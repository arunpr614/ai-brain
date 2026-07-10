# AI Brain High-Fidelity Style Brief

Created: 2026-06-13
Purpose: Compact prompt brief for converting the approved AI Brain wireframes into high-fidelity Magic Patterns designs.

## Source Of Truth

- Wireframe project: https://www.magicpatterns.com/c/ab5mjebwjwf7xvh8veffs2
- Wireframe active artifact at execution start: `accf3e98-6453-4e6a-b097-5c3cee36b9cb`
- Magic Patterns design system: `AI Memory`
- Design system ID: `ds-360d8a8f-1194-4f6b-8365-16ba1e738db7`
- Local visual system: `UX_DESIGN_SYSTEM_PRISM_MEMORY.md`

## Product Feeling

AI Brain should feel like a private prism of knowledge:

- Calm and readable at rest.
- Vivid only when explaining source type, quality, provenance, Ask scope, or repair state.
- Trustworthy, source-aware, and personal.
- More like a private reading and memory workbench than a generic chatbot.

## Color Rules

Use near-white surfaces and deep ink structure by default.

- `#FBFCFE` app background.
- `#FFFFFF` panels and cards.
- `#14213D` primary text and active structure.
- `#D7DFEA` borders and separators.
- `#667085` secondary text.

Use prism colors as semantic accents only:

- Teal: saved, full text, verified.
- Cyan: transcript, reading, web capture.
- Azure: PDF, item detail, this-item scope.
- Violet: Ask, AI state, selected items.
- Magenta: collections and networked knowledge.
- Amber: preview-only and attention.
- Coral: capture issue or metadata-only warning.
- Ruby: needs upgrade or destructive repair state.
- Lime: updated or improved state.

Avoid a rainbow UI. Saturated color should stay below roughly 15 percent of normal operational screens.

## Typography

Use a clean system sans-serif similar to Inter.

- Page title: 24px / 32px.
- Section title: 18px / 28px.
- Body: 14px / 22px.
- Dense list and metadata: 13px / 18px.
- Caption and chips: 12px / 16px.

Keep reading text calm and spacious. Keep operational metadata compact and scannable.

## Shape And Spacing

- Cards and repeated item surfaces: max 8px radius.
- Inputs, chips, and compact controls: 4px to 6px radius.
- Use crisp borders more than shadows.
- Use spacing scale: 4, 8, 12, 16, 24, 32.
- Do not nest cards inside cards.
- Use stable widths for nav rails, right rails, tabs, and buttons.

## Web Direction

The web experience is the deeper workbench.

Web should emphasize:

- Dense but calm Library browsing.
- Collapsible global left navigation.
- Dedicated Needs Upgrade queue.
- Reading-first item detail with right rail.
- Separate right-rail cards for Source and capture, Tags, Included topics, Collections, related items, and actions.
- Ask with a second collapsible left-side history sub-navigation.
- Clear evidence panel, citation chips, source quality warnings, and Ask scope.
- Settings as a trust and control surface.

Web should not feel like a marketing site or decorative dashboard.

## Android Direction

The Android experience is the capture, quick lookup, offline read, and lightweight repair companion.

Android should emphasize:

- Native phone density and tap targets.
- Bottom navigation with floating capture action.
- Search and compact filter rows.
- Item detail as tabs: Original, Digest, Ask, Related, Details.
- Details tab with separate cards for Source and capture, Tags, Included topics, Collections, offline/searchable state, and actions.
- Ask history as a bottom sheet, not a side rail.
- Citation evidence as a bottom sheet.
- Offline and server-unreachable states that still feel useful.

Android should not be a squeezed desktop layout.

## Required Shared Concepts

Both high-fidelity projects must preserve these concepts:

- Source platform.
- Captured via.
- Source quality.
- Capture result.
- Repair state.
- Ask scope.
- Ask history.
- Ask citations.
- Tags as user-managed organization.
- Included topics as AI-detected, clickable topic pills with no Add action.
- Collections as saved groupings.
- Offline/readability states.
- Login, unlock, and device pairing.

## Fake Content Rules

Use realistic fake examples only.

Good sample titles:

- "Designing Memory Systems That People Trust"
- "YouTube: Local-first AI Notes Setup"
- "LinkedIn post: Why source quality matters"
- "Substack: Weekly research briefing"
- "PDF: Retrieval Quality Evaluation"
- "Manual note: Ideas for capture repair"

Good topics:

- source quality
- personal knowledge management
- local-first storage
- capture repair
- retrieval evaluation
- Android offline reading
- citation trust

Do not include private notes, real credentials, internal metrics, implementation secrets, or customer data.

## Interaction Expectations

The prototypes should be clickable enough for design review:

- Navigation routes work.
- Library item opens item detail.
- Item detail tabs switch.
- Web nav collapses and expands.
- Web Ask history collapses and expands independently from global nav.
- Capture result actions route to item or repair states.
- Ask citation chips expose source evidence.
- Android history and citation surfaces open as drawers or sheets.
- Android selected-items mode and Ask selected are represented.

## Review Standard

The finished designs should answer:

- Can a user tell what was saved?
- Can a user tell how it entered AI Brain?
- Can a user tell whether the source is strong enough to trust?
- Can a user repair weak captures without feeling blamed?
- Can a user read first, then use AI second?
- Can a user understand what an Ask answer was grounded in?
- Can a user rediscover work through tags, included topics, collections, and history?
