# AI Memory UX v2 Master Plan

> Current-status note: this is a historical baseline document from the first UX v2 planning pass. For implementation readiness, blockers, source snapshot, and current sequencing, use `00_PLANNING_PACKAGE_INDEX.md`, `06_ROADMAP_AND_EXECUTION_PLAN.md`, `07_FEATURE_CLASSIFICATION_AND_GAP_ANALYSIS.md`, and `trackers/baseline_status_reconciliation.md`.

Created: 2026-06-13
Project folder: `UX_v2`
Design package: `../UX_UI_DESIGN_PACKAGE`

## Brief Playback

AI Memory is a private, source-aware knowledge capture and retrieval app. The redesign must move the current AI Brain implementation to the new AI Memory name, logo, design system, and interaction model across web and Android.

The design package is the source of truth for product behavior, brand rules, platform roles, routes, and acceptance criteria. The frozen Magic Patterns source exports are implementation references, not production code to paste wholesale.

Target interactivity: full working implementation for web and Android, not a static mock.

## What Was Inspected

- `UX_UI_DESIGN_PACKAGE/README.md`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_AGENT_HANDOFF_BRIEF.md`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_DESIGN_SYSTEM_IMPLEMENTATION_SPEC.md`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_WEB_APP_SCREEN_AND_INTERACTION_SPEC.md`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_ANDROID_APP_SCREEN_AND_INTERACTION_SPEC.md`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_INTERACTION_AND_STATE_SPEC.md`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_DATA_CONTENT_AND_STATE_MODEL.md`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_FEATURE_PARITY_AND_SCOPE_MATRIX.md`
- `UX_UI_DESIGN_PACKAGE/docs/BRAND_COPY_MIGRATION.md`
- `UX_UI_DESIGN_PACKAGE/checklists/AI_MEMORY_IMPLEMENTATION_ACCEPTANCE_CHECKLIST.md`
- `UX_UI_DESIGN_PACKAGE/source-exports/web/magic-patterns-exact`
- `UX_UI_DESIGN_PACKAGE/source-exports/android/magic-patterns-exact`
- Prior UX reports in the phase2 root, especially gap analysis, product model, requirements, and redesign approach docs.
- Current Next.js app routes, shared components, styles, data repositories, Android manifest, and Capacitor config.

## Current Implementation Baseline

Already present:

- Next.js 16 app with SQLite, capture, enrichment, search, Ask streaming, tags, collections, related items, device pairing, and Capacitor Android shell.
- Library route at `/` with search, item rows, capture quality labels, and bulk tag, collection, delete actions.
- Capture routes for URL, PDF, and notes.
- Item detail with reading column, capture diagnostics, tags, collections, related items, summary, key quotes, export, delete, and per-item Ask.
- Global Ask and per-item Ask backed by existing retrieval and citation behavior.
- Source platform, captured-via, and capture-quality fields in the data model.
- Android share intent wiring and thin WebView app shell.

Major gaps against UX v2:

- User-facing app still says AI Brain in multiple production surfaces and Android still says Brain.
- Existing visual tokens use the older indigo/slate system, not the AI Memory prism-memory tokens.
- Web nav lacks the new AI Memory shell, collapsible state, Capture entry, Needs Upgrade entry, Pair Device affordance, and privacy honesty treatment.
- There is no `/library` canonical route yet, even though the design package uses `/library`.
- Library lacks visible quality/source filters, Needs Upgrade entry, and `Ask selected`.
- Ask lacks scope model, selected-item scope, tag/topic/collection scope, history rail, attached context, weak-source warnings, and citation quality treatment.
- Included Topics are not implemented as a first-class data model or UI concept.
- Needs Upgrade exists as a concept in quality fields, but not as a dedicated queue with repair actions.
- Item detail lacks production focus/read mode, separate Included Topics card, topic destination, and weak-content repair CTA flow.
- Android still behaves like responsive web. It lacks route-aware Capture FAB behavior, mobile filter sheets, mobile item tabs, unified Ask composer, history sheet, add-context sheets, More/settings screen, and offline/unreachable state polish.
- Settings does not yet include the new privacy/data section with disabled coming-soon controls.
- The production app icons and launcher labels need to be wired from the AI Memory asset package.

## Execution Principles

1. Keep user data safe. Schema migrations must be additive and tested.
2. Do not ship user-facing `AI Brain` copy. Historical docs and exact prototype exports may keep it.
3. Preserve source platform and captured-via as separate fields.
4. Show source quality wherever trust matters.
5. Do not claim active end-to-end encryption or inactive privacy features.
6. Build shared semantic components first, then screens.
7. Web and Android should share concepts, not identical layouts.
8. Every milestone ends with tests or screenshot evidence appropriate to the blast radius.

## Phases And Milestones

### Phase 0: UX v2 Control Room

Purpose: turn prior-agent work into a clean execution track.

Milestones:

- M0.1: Create UX_v2 project docs and source map.
- M0.2: Confirm design package completeness and identify source-of-truth files.
- M0.3: Establish a route, feature, and acceptance checklist tracker.
- M0.4: Confirm implementation order before touching production UI.

Exit gate:

- UX_v2 has a master plan and requirements backlog.
- No previous-agent files are overwritten.

### Phase 1: Brand, Assets, And Design System Foundation

Purpose: give the app the AI Memory identity before screen work spreads old styling.

Milestones:

- M1.1: Copy AI Memory logo and web icon assets into production `public/` paths.
- M1.2: Wire favicon, web app manifest metadata, page metadata, and browser title to AI Memory.
- M1.3: Wire Android launcher assets and rename Android app label to AI Memory.
- M1.4: Replace production-facing AI Brain strings in UI, prompts, metadata, export headers, and provider headers where appropriate.
- M1.5: Replace old token set with AI Memory prism-memory semantic tokens.
- M1.6: Create shared UI primitives: source quality badge, scope badge, trust warning, source/capture metadata row, empty state, disabled coming-soon control, sheet/dialog, page header.

Exit gate:

- `rg "AI Brain" src android public` has only allowed non-user-facing leftovers or none.
- Brand assets render on web and Android.
- New tokens cover source quality, Ask scope, panels, borders, text, and focus rings.

### Phase 2: Product Model And Route Foundation

Purpose: add the missing data and routing contracts before feature screens depend on them.

Milestones:

- M2.1: Add canonical `/library` route while preserving `/` redirect or compatibility.
- M2.2: Add Needs Upgrade query helpers for weak items.
- M2.3: Add Included Topics data model: tables, repository, seed/backfill strategy, and item-topic joins.
- M2.4: Add scoped Ask request model: all, item, selected items, tag, topic, collection, attached context, high-quality-only.
- M2.5: Add conversation/history persistence if not already sufficient for the new Ask history UX.
- M2.6: Add route helpers for topic and collection scope URLs.

Exit gate:

- Data tests cover weak-source queries, topic CRUD/listing, and Ask scope resolution.
- Routes exist for `/library`, `/needs-upgrade`, `/topics/[slug]`, `/collections/[id or slug]`, `/ask`, and scoped Ask URLs.

### Phase 3: Web Workbench Redesign

Purpose: implement the desktop web experience as the deep work surface.

Milestones:

- M3.1: Replace global shell with AI Memory web layout: collapsible left nav, Capture entry, Needs Upgrade badge, Ask, Settings, Pair Device, privacy coming-soon copy.
- M3.2: Rebuild Library with search, source filters, quality filters, visible multi-select, Ask selected, add tags, add to collection, delete, and weak-source callouts.
- M3.3: Build Needs Upgrade queue with metadata-only, preview-only, needs-upgrade, extraction-failed states and repair actions.
- M3.4: Redesign Capture with URL, PDF, note, paste text, result states, duplicate handling, updated-existing state, and weak-capture next actions.
- M3.5: Redesign Item Detail with reading area, source trust strip, right rail cards, tags, included topics, collections, related items, item actions, and repair CTA.
- M3.6: Implement Focus/Read mode with normal chrome hidden, source trust strip visible, exit visible, and no empty read mode for weak content.
- M3.7: Implement Topic detail and Collection detail with scoped item lists and `Ask this topic/collection`.
- M3.8: Rebuild Ask with history sub-nav, scope banner, weak-source warnings, scoped citations, source evidence, and selected/tag/topic/collection scopes.
- M3.9: Redesign Settings with account/device, capture preferences, providers, backup/export, tags/collections links, data/privacy, and disabled coming-soon controls.

Exit gate:

- Web route list matches the package index plus production aliases.
- Desktop QA at 1280 x 720 and one wider viewport.
- Screenshot evidence captured for major states.

### Phase 4: Android Companion Redesign

Purpose: make the Android app feel like a mobile capture and reading companion, not squeezed desktop.

Milestones:

- M4.1: Update Capacitor app name, Android string resources, launcher icons, and offline fallback branding.
- M4.2: Implement mobile shell with bottom nav: Library, Capture, Ask, More.
- M4.3: Add route-aware Capture behavior: raised Capture FAB on library/content routes, normal tab on Ask and Capture.
- M4.4: Build Android Library with compact filter status and bottom-sheet filters.
- M4.5: Build Android Needs Upgrade path reachable from Library and More.
- M4.6: Build Android Capture and share-capture result states: processing, success, partial, duplicate, needs upgrade.
- M4.7: Build Android item detail tabs: Original, Digest, Ask, Related, Details.
- M4.8: Build Android focus/read mode with bottom nav and tabs hidden.
- M4.9: Build Android Ask unified composer: plus/add context, attached chips, input, send, history sheet, attach picker, paste link, write note, keyboard placeholder behavior.
- M4.10: Build More/settings mobile surface with account/device, capture settings, data/privacy, offline/server state.

Exit gate:

- Compact phone and tall phone viewport QA pass.
- Ask and Capture do not show raised Capture FAB.
- Composer is not overlapped by nav or keyboard placeholder.
- Android APK build starts with AI Memory branding.

### Phase 5: Repair, Capture Quality, And Trust Behavior

Purpose: make the UX promises real instead of decorative.

Milestones:

- M5.1: Implement repair action for weak sources: add text/transcript, retry capture, open original, mark good enough, delete, duplicate handling.
- M5.2: Reset derived state after repair where needed: body, chunks, embeddings, enrichment state, warnings, quality.
- M5.3: Make capture result states truthful across web, Android share, and APIs.
- M5.4: Add quality-aware Ask warnings when limited sources are in the effective scope.
- M5.5: Add citation quality and source/captured-via metadata to citation UI.
- M5.6: Ensure topics only appear when derived from readable content or are clearly limited.

Exit gate:

- Weak captures never show generic success.
- Ask never hides limited-source warnings.
- Repair tests verify content and derived-state updates.

### Phase 6: Accessibility, QA, And Visual Parity

Purpose: prevent the redesign from becoming visually impressive but fragile.

Milestones:

- M6.1: Run lint, typecheck, and focused tests after each feature cluster.
- M6.2: Add tests for new route helpers, scope resolution, topic model, weak-source queries, repair actions, and Android share result contracts.
- M6.3: Capture web screenshots for Library, Needs Upgrade, Item Detail, Focus, Ask, Capture, Settings, Login/Pair.
- M6.4: Capture mobile screenshots for Library, filters sheet, Capture, share result, Item tabs, Focus, Ask composer, More, Needs Upgrade, Login/Unlock.
- M6.5: Run accessibility pass: labels, focus rings, tap targets, color+text semantics, disabled states.
- M6.6: Run brand search and privacy overclaim search.

Exit gate:

- Acceptance checklist is complete with evidence.
- No visual blockers at target breakpoints.
- No user-facing AI Brain strings.

### Phase 7: Release And Handoff

Purpose: make the work understandable and shippable.

Milestones:

- M7.1: Update UX_v2 implementation tracker with completed files, tests, and screenshots.
- M7.2: Update app docs and runbook names from AI Brain to AI Memory where production-facing.
- M7.3: Build production web artifact.
- M7.4: Build Android APK.
- M7.5: Write final handoff with implemented features, residual risks, and follow-up backlog.

Exit gate:

- Web build succeeds.
- Android build succeeds or any Android blocker is documented with exact error and next action.
- Final handoff points to evidence and remaining decisions.

## Suggested Implementation Order

1. Brand and tokens.
2. Shell and route foundation.
3. Library and Needs Upgrade.
4. Item detail, topics, collections, focus mode.
5. Ask scopes and citations.
6. Capture result and repair flows.
7. Android-specific shell and screens.
8. Settings, privacy, offline states.
9. QA, screenshots, APK build.

## Immediate Next Step

Before implementation starts, confirm this brief:

- Product name: AI Memory.
- Visual source: `UX_UI_DESIGN_PACKAGE`, especially docs and source exports.
- Interactivity: full working web and Android implementation.
- UX_v2 is the planning and tracking folder.
