# AI Memory UX/UI Asset Package Implementation Plan

Created: 2026-06-13 21:57 IST
Package folder: `UX_UI_DESIGN_PACKAGE`
Product name: AI Memory
Logo asset: `assets/logo/ai-memory-logo.png`

Revision note: Updated after the 2026-06-13 22:08 IST adversarial review. Source exports, screenshots, generated icons, brand-copy rules, and package integrity manifests are now required assets, not optional follow-ups.

## Objective

Create a complete UX/UI handoff package that lets a new AI agent implement the approved AI Memory web app and Android app without needing to rediscover product requirements, feature behavior, design-system rules, Magic Patterns source links, or interaction decisions.

The package must transfer:

- High-fidelity UI/UX source references for web and Android.
- Complete design-system guidance.
- Logo and brand usage.
- Screen-by-screen implementation requirements.
- Interaction and state behavior.
- Feature parity expectations across platforms.
- Data/content model expectations.
- Acceptance checklist for implementation review.

## Format Decision

HTML alone is not the best transfer format.

HTML is useful for:

- Visual review.
- Color, typography, spacing, and component examples.
- A fast local reference that can be opened in a browser.
- Showing the design system without needing Magic Patterns access.

HTML is weak for:

- Native Android implementation.
- Product logic and state rules.
- Accessibility requirements.
- Route behavior.
- Data contracts.
- Explaining why a design works a certain way.
- Ensuring a new AI agent understands what is real versus prototype-only.

Recommended package format:

- Markdown as the primary source for implementation instructions.
- Local HTML as the visual design-system reference.
- PNG logo asset as the master brand image.
- Frozen screenshot exports as the local visual screen reference.
- Frozen Magic Patterns source exports as local prototype-code reference.
- Magic Patterns URLs and artifact IDs as provenance and collaboration references.
- Acceptance checklists to prevent missing interactions.

The package is designed to be usable without Magic Patterns access. Magic Patterns access is helpful for collaboration, but not a hard dependency for initial implementation.

## Package Structure

```text
UX_UI_DESIGN_PACKAGE/
  README.md
  UX_UI_DESIGN_ASSET_PACKAGE_IMPLEMENTATION_PLAN_2026-06-13_21-57-46_IST.md
  assets/
    logo/
      ai-memory-logo.png
    icons/
      web/
      android/
    reference/
      AI_MEMORY_DESIGN_SYSTEM_REFERENCE.html
  screenshots/
    SCREENSHOT_EXPORT_INDEX.md
    web/
    android/
  source-exports/
    README.md
    SOURCE_EXPORT_MANIFEST.json
    web/magic-patterns-exact/
    android/magic-patterns-exact/
  source-references/
    MAGIC_PATTERNS_SOURCE_OF_TRUTH.md
    AI_MEMORY_DESIGN_SYSTEM_PRISM_MEMORY_SOURCE.md
    HIGH_FIDELITY_MAGIC_PATTERNS_REVIEW_PACKAGE_SOURCE.md
  docs/
    AI_MEMORY_AGENT_HANDOFF_BRIEF.md
    AI_MEMORY_DESIGN_SYSTEM_IMPLEMENTATION_SPEC.md
    AI_MEMORY_WEB_APP_SCREEN_AND_INTERACTION_SPEC.md
    AI_MEMORY_ANDROID_APP_SCREEN_AND_INTERACTION_SPEC.md
    AI_MEMORY_INTERACTION_AND_STATE_SPEC.md
    AI_MEMORY_FEATURE_PARITY_AND_SCOPE_MATRIX.md
    AI_MEMORY_DATA_CONTENT_AND_STATE_MODEL.md
    AI_MEMORY_ASSET_MANIFEST.md
    BRAND_COPY_MIGRATION.md
  checklists/
    AI_MEMORY_IMPLEMENTATION_ACCEPTANCE_CHECKLIST.md
  package-manifest.json
```

## Source Artifacts

Use these source references when implementing:

- Design system: `AI Memory`, ID `ds-360d8a8f-1194-4f6b-8365-16ba1e738db7`
- Web high-fidelity project: https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx
- Web current artifact at package creation: `f3312489-9172-4c3f-bcf8-2352ece9d417`
- Android high-fidelity project: https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r
- Android current artifact at package creation: `d7eeaec6-0272-40fa-a7ca-4de7871182e7`
- Android published version for unified Ask composer: `v15`
- Logo asset: `assets/logo/ai-memory-logo.png`
- Local design-system reference: `assets/reference/AI_MEMORY_DESIGN_SYSTEM_REFERENCE.html`
- Web exact source export: `source-exports/web/magic-patterns-exact/`
- Android exact source export: `source-exports/android/magic-patterns-exact/`
- Frozen screenshot index: `screenshots/SCREENSHOT_EXPORT_INDEX.md`

Web source decision:

- Use artifact `f3312489-9172-4c3f-bcf8-2352ece9d417` as the intended web implementation reference.
- Earlier docs may call it a draft because it was not Magic Patterns-published at that moment.
- The implementation package intentionally freezes this active artifact locally, so the next agent should not fall back to the older published web artifact unless Arun explicitly asks.

## Packaging Rules

1. Treat Magic Patterns designs as the visual source of truth.
2. Treat Markdown docs in this package as the behavioral and implementation source of truth.
3. Use the app name `AI Memory` everywhere in production UI.
4. Preserve the logo as the master brand image; do not redraw it from scratch.
5. Keep the UI calm and source-aware. Color is semantic, not decorative.
6. Do not claim privacy/security features that do not exist. End-to-end encryption is not active.
7. Do not implement `Continue reading` unless reading position tracking is actually designed and built.
8. Preserve source platform and captured-via as separate fields.
9. Preserve Tags, Included topics, and Collections as separate sections.
10. Preserve parity between web and Android where the same product capability exists, while allowing platform-native navigation patterns.

## Implementation Phases For The Next Agent

### Phase 1: Orientation

Read these files in order:

1. `README.md`
2. `source-references/MAGIC_PATTERNS_SOURCE_OF_TRUTH.md`
3. `docs/AI_MEMORY_AGENT_HANDOFF_BRIEF.md`
4. `docs/AI_MEMORY_DESIGN_SYSTEM_IMPLEMENTATION_SPEC.md`
5. Platform-specific spec for the target app.

Exit criteria:

- Agent can explain what AI Memory does.
- Agent can identify the source-of-truth Magic Patterns project.
- Agent can name all major product surfaces.
- Agent can state the semantic design-system rules.

### Phase 2: Design System Implementation

Implement tokens and reusable components before screens:

- Color tokens.
- Typography scale.
- Spacing scale.
- Border radius.
- Buttons.
- Inputs.
- Chips and badges.
- Cards and rows.
- Bottom sheets and modals.
- Navigation shells.
- Empty, loading, warning, and disabled states.

Exit criteria:

- Screens do not hardcode random colors.
- Source quality and Ask scope use semantic tokens.
- Mobile and web share meaning even when layouts differ.

### Phase 3: Web Shell And Screens

Build web as the deeper workbench:

- Login and pairing.
- Collapsible left navigation.
- Library.
- Needs Upgrade.
- Item detail with right rail.
- Focus/read mode.
- Ask with collapsible history sub-navigation.
- Capture.
- Settings.
- Topic and collection destination pages.

Exit criteria:

- Web navigation supports repeated work.
- Bulk selection and Ask selected work.
- Tags, topics, and collections are navigable.
- Ask history is independently collapsible from global nav.

### Phase 4: Android Shell And Screens

Build Android as the quick capture, lookup, read, and repair companion:

- Login, unlock, and pairing states.
- Bottom navigation.
- Route-aware Capture FAB behavior.
- Library with compact filter status and bottom sheet.
- Capture and share-capture results.
- Item detail tabs.
- Focus/read mode.
- Ask with unified composer.
- More/settings/privacy.
- Offline and repair states.

Exit criteria:

- Ask and Capture never show the raised Capture FAB.
- Library/content routes retain capture access.
- Android Ask composer has add context, send, history, and keyboard-placeholder behavior.
- Filters do not permanently consume excessive phone space.

### Phase 5: Behavior And State QA

Use:

- `docs/AI_MEMORY_INTERACTION_AND_STATE_SPEC.md`
- `docs/AI_MEMORY_FEATURE_PARITY_AND_SCOPE_MATRIX.md`
- `checklists/AI_MEMORY_IMPLEMENTATION_ACCEPTANCE_CHECKLIST.md`

Exit criteria:

- Source quality warnings match actual source scope.
- Citations match active Ask scope.
- Disabled privacy controls cannot be mistaken for completed features.
- Prototype-only ideas are either implemented for real or removed from production UI.

## Required Transfer Assets

The following assets must stay in the package:

- Web screenshot set for each major screen/state.
- Android screenshot set for each major screen/state.
- Source-code snapshot from each active Magic Patterns artifact.
- Web favicon/icon derivatives.
- Android launcher/adaptive icon derivatives.
- Machine-readable package manifest with byte sizes and hashes.

Optional later export:

- Figma import/export only if the implementation team standardizes on Figma.

## Completion Definition

The package is complete when another agent can:

- Identify the latest web and Android design sources.
- Use the AI Memory logo.
- Recreate the visual system.
- Build every major screen.
- Implement core interaction states.
- Avoid known product inaccuracies.
- Use local frozen screenshots and source exports without Magic Patterns access.
- Confirm no implementation-facing copy permits `AI Brain` as a product name.
- Review parity and acceptance criteria without asking for missing UX decisions.
