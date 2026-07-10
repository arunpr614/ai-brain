# AI Memory UX v2 Requirements And PRD Backlog

> Current-status note: this is a historical baseline backlog. For current feature classification, decision gates, and implementation authorization, use `07_FEATURE_CLASSIFICATION_AND_GAP_ANALYSIS.md`, `trackers/master_feature_inventory.md`, `trackers/prd_tracker.md`, and `trackers/baseline_status_reconciliation.md`.

Created: 2026-06-13
Status: Implementation planning backlog

## PRD-01: AI Memory Rebrand And Launch Assets

Problem:

The production app still exposes AI Brain or Brain in web metadata, sidebar copy, setup/unlock screens, prompts, exports, provider headers, Capacitor config, and Android resources.

Platforms:

- Web
- Android
- Export/API copy where user-facing

Requirements:

- Use `AI Memory` in all user-facing product surfaces.
- Use package logo from `../UX_UI_DESIGN_PACKAGE/assets/logo/ai-memory-logo.png`.
- Wire generated web icons from `../UX_UI_DESIGN_PACKAGE/assets/icons/web`.
- Wire Android launcher icons from `../UX_UI_DESIGN_PACKAGE/assets/icons/android`.
- Preserve `AI Brain` only in historical docs, exact prototype exports, or comments that are not user-facing.
- Update app title, metadata, manifest labels, Android labels, setup, unlock, capture helper copy, Ask composer copy, and export headers.

Acceptance criteria:

- Brand copy migration checklist passes.
- Browser tab, launcher label, sidebar, login/setup/unlock, Ask, Capture, Settings, and exports say AI Memory.
- No user-facing route shows AI Brain.

Dependencies:

- Design package assets.

## PRD-02: Prism Memory Design System

Problem:

Current UI uses older indigo/slate tokens. UX v2 requires calm white work surfaces, deep ink structure, crisp borders, semantic color, and source-quality/status tokens.

Platforms:

- Web
- Android WebView

Requirements:

- Implement tokens for Ink, Surface, Panel, Line, Muted, Ruby, Coral, Amber, Citrine, Lime, Teal, Cyan, Azure, Violet, Magenta.
- Map source quality to semantic colors: full text, transcript, preview only, metadata only, needs upgrade.
- Map Ask scope to semantic colors: all sources, this item, selected, tag/collection, high-quality only.
- Create shared components for buttons, inputs, chips, badges, source rows, panels, warning states, sheets/dialogs, and empty states.
- Keep card radius at 8px or less unless platform sheet convention requires otherwise.
- Avoid nested cards and purely decorative color use.

Acceptance criteria:

- Tokens are centralized and components use tokens instead of random colors.
- Source quality badges include text and do not rely on color alone.
- Tap targets and focus states meet accessibility requirements.

Dependencies:

- PRD-01 for logo and brand.

## PRD-03: Web Shell And Navigation

Problem:

The current web shell exposes only Library, Ask, and Settings, lacks the new Needs Upgrade entry, and has no collapsible UX matching the design package.

Platforms:

- Web desktop

Requirements:

- Add AI Memory web shell with collapsible side navigation.
- Primary destinations: Library, Needs Upgrade, Ask, Capture, Settings.
- Add Pair Device link and privacy coming-soon copy in the lower nav area.
- Preserve keyboard-accessible nav, current route active state, and tooltips in collapsed mode.
- Avoid disabled future features in primary nav unless implemented.

Acceptance criteria:

- Expanded and collapsed nav states work.
- Needs Upgrade badge count reflects weak captures.
- Capture entry is available from the shell.
- Sidebar collapse persists or behaves predictably across item detail if implemented.

Dependencies:

- PRD-02.
- PRD-05 for weak item count.

## PRD-04: Library Filters, Multi-Select, And Ask Selected

Problem:

Library has rows and bulk actions, but lacks the UX v2 filter system and selected-source Ask path.

Platforms:

- Web
- Android variant in PRD-11

Requirements:

- Add canonical `/library` route and keep `/` compatibility.
- Add search, source-type filters, quality filters, and clear/reset affordances.
- Show source platform, captured via, source quality, saved date, offline/searchable status when available.
- Multi-select must show visible selected row state and a toolbar without relying on hover.
- Add bulk actions: Ask selected, Add tags, Add to collection, Delete, Clear.
- Ask selected opens Ask with selected item scope.
- Show Needs Upgrade entry or count from Library.

Acceptance criteria:

- Selecting items enables Ask selected.
- Ask receives selected IDs and displays selected-item scope.
- Filters are keyboard accessible and work with empty states.

Dependencies:

- PRD-03.
- PRD-09 for scoped Ask.

## PRD-05: Needs Upgrade Queue

Problem:

Weak captures are detectable but not workflowed. Users need a calm maintenance queue with clear repair actions.

Platforms:

- Web
- Android entry via Library/More

Requirements:

- Create `/needs-upgrade`.
- Include metadata-only, preview-only, needs-upgrade, extraction-failed, not-searchable, and duplicate-candidate states where data supports them.
- Show why each item needs attention.
- Actions: add text/transcript, retry capture, open source, mark good enough, delete, merge/handle duplicate.
- Copy must be calm and action-oriented.

Acceptance criteria:

- Weak items appear in the queue.
- Full text/transcript items do not appear unless another repair reason exists.
- Each row has a next best action.
- Empty state explains that no sources need attention.

Dependencies:

- Existing capture quality fields.
- PRD-15 for repair actions.

## PRD-06: Capture Result States

Problem:

Capture currently supports URL/PDF/note, but UX v2 requires every result to say what happened, source platform, captured-via, quality outcome, and next action.

Platforms:

- Web
- Android share/capture
- API result contracts

Requirements:

- Add result cards for full text saved, partial/preview saved, metadata only, duplicate candidate, updated existing, needs upgrade, and error-with-save states.
- Preserve source platform and captured-via separately.
- Avoid generic success for weak captures.
- Add paste text as a capture mode if missing.
- Support repair from capture result when weak.

Acceptance criteria:

- Each result state shows status, platform, captured via, quality, and next action.
- Duplicate state offers open existing and keep/save separately where supported.
- Updated existing state is distinct from new save.

Dependencies:

- Existing capture APIs.
- PRD-15 for repair/update behavior.

## PRD-07: Item Detail, Focus Mode, And Mobile Tabs

Problem:

Item detail is useful but not yet structured as the UX v2 trust/read surface. Focus mode and mobile tabs are missing.

Platforms:

- Web
- Android/mobile responsive

Requirements:

- Web item detail: reading area plus right rail cards for Source and Capture, AI Digest, Tags, Included Topics, Collections, Related Items, Item Actions.
- Add source trust strip near readable content.
- Add focus/read mode from item detail expand affordance.
- Focus/read mode hides secondary UI, keeps exit visible, shows trust strip, and does not open empty mode for weak content.
- Android item detail uses tabs: Original, Digest, Ask, Related, Details.
- Weak items show repair CTA instead of empty reading mode.

Acceptance criteria:

- `/items/[id]?mode=focus` or equivalent works and is dismissible.
- Weak item focus path shows repair CTA.
- Tags, topics, and collections are visually separate.

Dependencies:

- PRD-08 for topics.
- PRD-15 for repair.

## PRD-08: Tags, Included Topics, And Collections

Problem:

Tags and collections exist, but Included Topics do not. UX v2 separates user-managed tags, AI-detected topics, and user-created collections.

Platforms:

- Web
- Android

Requirements:

- Keep Tags user-managed and editable.
- Add Included Topics as AI-detected concepts with no manual Add action on item detail.
- Add topic data model and item-topic association.
- Topic click opens topic detail with explanation, evidence, related items, and Ask topic.
- Tag click opens filtered Library.
- Collection click opens collection detail with items and Ask collection.
- Allow creating a tag from a topic where explicitly designed, without making topics manually editable.

Acceptance criteria:

- Item detail shows Tags, Included Topics, and Collections as separate sections.
- Topic pages work.
- Ask topic and Ask collection pass correct scope.
- Topics are not manually addable on item detail.

Dependencies:

- New topic migration/repository.
- PRD-09 for topic/collection Ask scopes.

## PRD-09: Scoped Ask, Citations, And History

Problem:

Ask currently streams answers and citations, but does not make scope, quality, attached context, or history visible enough.

Platforms:

- Web
- Android

Requirements:

- Supported scopes: all saved items, this item, selected items, tag, topic, collection, attached context, high-quality only.
- Attached context overrides route scope visibly.
- Scope banner must always be visible.
- Weak-source warnings must appear when effective scope includes limited sources.
- Citations must come from effective scope and show quality/source metadata.
- Web Ask includes independently collapsible history sub-navigation.
- Android Ask history opens as bottom sheet.
- Empty send and attached-empty send nudges use the exact intent-specific messages.

Acceptance criteria:

- Ask selected answers only from selected items.
- Ask topic and Ask collection preserve correct scope.
- Attached context override is visible.
- Citations link back to source/passages and show quality.
- History restore brings messages, scope, attachments, citations, and warnings back.

Dependencies:

- Existing Ask API and retrieval.
- Potential conversation persistence updates.
- PRD-08.

## PRD-10: Web Capture And Repair Workflow

Problem:

Weak capture repair is not a first-class workflow in web item detail, Needs Upgrade, or capture results.

Platforms:

- Web

Requirements:

- Repair actions: add transcript/text, paste full article/post, retry extraction, mark good enough, open source, delete, merge duplicate where supported.
- Adding text to a weak item upgrades body/content and quality.
- Repair should reset derived state where needed: chunks, embeddings, summaries, related items, and warnings.
- Repair success should explain what changed.

Acceptance criteria:

- Metadata-only item can be upgraded with user-provided text.
- Updated item leaves Needs Upgrade when quality improves.
- Ask warnings change after repair.

Dependencies:

- PRD-05.
- PRD-06.

## PRD-11: Android Library, Filters, And Navigation

Problem:

Android currently inherits responsive web navigation. UX v2 requires mobile-native bottom nav, route-aware Capture, compact filters, and one-handed actions.

Platforms:

- Android WebView/mobile

Requirements:

- Bottom nav: Library, Capture, Ask, More.
- Raised center Capture FAB appears on Library/content routes.
- No raised Capture FAB on Ask or Capture.
- Library has search, compact active filter status, filter button, bottom sheet filters, recent items, select mode, and Needs Upgrade entry.
- Select mode supports Ask selected.
- Bottom sheets are dismissible and safe-area aware.

Acceptance criteria:

- Capture never overlaps Ask composer.
- Filters do not permanently consume phone space.
- Long press or selection control enters select mode.

Dependencies:

- PRD-04.
- PRD-09.

## PRD-12: Android Unified Ask Composer

Problem:

Android Ask must support add-context flows and keyboard-safe composition, not just a basic text box.

Platforms:

- Android/mobile

Requirements:

- Header, history button, scope banner, conversation area, attached source chips, composer label `Ask AI Memory`, plus/add context, text input, send icon.
- Add Context sheet: attach saved item, paste link, write note.
- Attach saved item sheet: search, quality badges, select/deselect, attach selected.
- Paste link sheet: empty, saving, full-text, metadata-only warning, duplicate attach-existing/keep-both.
- Write note sheet: empty disabled state, save and attach.
- Keyboard placeholder state prevents overlap.

Acceptance criteria:

- Empty input shows `Type a question first`.
- Empty input with attachment shows `Ask a question about the attached context`.
- Attachments visibly override route scope for next answer.
- History sheet restores full conversation state.

Dependencies:

- PRD-09.
- PRD-11.

## PRD-13: Android Share Capture

Problem:

Android share intent exists, but UX v2 needs clear share-capture landing and result states.

Platforms:

- Android

Requirements:

- Incoming shared source state.
- Processing state.
- Success state.
- Partial/metadata-only result state.
- Duplicate result state.
- Needs-upgrade state.
- Next actions: open item, add text, ask, dismiss, keep both/open existing where relevant.

Acceptance criteria:

- Shared URL/text/PDF routes to an understandable capture result.
- Weak shared captures suggest repair without blocking capture.
- Result copy shows source platform and captured via Android share.

Dependencies:

- Existing Capgo share target wiring.
- PRD-06.

## PRD-14: Settings, Privacy, Offline, And Trust States

Problem:

Settings has useful operational content, but UX v2 requires clearer account/device, capture, data/privacy, offline/server state, and disabled unavailable controls.

Platforms:

- Web
- Android More/settings

Requirements:

- Settings sections: account/device, capture preferences, providers, backup/export, tags/collections, data/privacy, appearance.
- Data/privacy controls that do not exist are disabled and labeled `Coming soon`.
- Do not claim active end-to-end encryption.
- Android More includes account/device, capture settings, data/privacy, offline/server state.
- Offline/unreachable states explain what still works.

Acceptance criteria:

- No privacy overclaims appear.
- Coming-soon controls are visibly disabled.
- Provider/storage copy is user-readable.

Dependencies:

- Existing settings/provider status APIs.

## PRD-15: Login, Unlock, Pairing, Session, And Offline Entry States

Problem:

Entry states exist in parts, but UX v2 requires brand-normalized, trust-aware login/unlock/pairing/offline states for both web and Android.

Platforms:

- Web
- Android

Requirements:

- Login with AI Memory logo.
- Unlock/PIN with AI Memory copy.
- Setup PIN if needed.
- Pair device, pairing code, pairing success, pairing failure.
- Session expired.
- Server unreachable/offline fallback.
- Trust copy stays sober and avoids encryption overclaims.

Acceptance criteria:

- Entry surfaces use AI Memory brand and logo.
- Android offline fallback is branded and useful.
- Pairing success/failure states are clear.

Dependencies:

- PRD-01.
- Existing pairing APIs.

## PRD-16: QA Evidence And Release Gates

Problem:

The design package requires evidence-based acceptance, not just code completion.

Platforms:

- Web
- Android

Requirements:

- Run lint, typecheck, and relevant tests.
- Add focused tests for new data model, weak queries, Ask scopes, repair, and route helpers.
- Capture screenshots for major web and Android route/state coverage.
- Compare against design package intent.
- Run brand search and privacy overclaim search.
- Build production web app and Android APK.

Acceptance criteria:

- `AI_MEMORY_IMPLEMENTATION_ACCEPTANCE_CHECKLIST.md` is completed or copied into UX_v2 with evidence.
- Any failed check has an owner, reason, and next step.
- Final handoff includes test results and screenshot evidence paths.

Dependencies:

- All implementation PRDs.
