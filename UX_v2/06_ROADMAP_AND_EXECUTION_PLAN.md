# AI Memory UX v2 Roadmap And Execution Plan

Created: 2026-06-14 07:40 IST
Status: Planning-only package for a future implementation agent
Primary design source: `../UX_UI_DESIGN_PACKAGE`

## Scope Boundary

This package is not an implementation claim. It translates the AI Memory UX/UI design package, the two handovers, and the current dirty worktree into an execution roadmap for revamping the web and Android experiences. No app behavior was changed as part of this document.

The current codebase is verified as a Next.js web app with SQLite, retrieval, capture, Ask, and a Capacitor Android shell. The Android app is not a separate native UI implementation; it loads the web app from `https://brain.arunp.in` and uses Capacitor/Android resources for launcher, share intents, pairing, and offline fallback.

## Source Evidence

- `../Handover_docs/AI_MEMORY_UX_V2_HANDOVER_2026-06-14_07-19-18_IST.md`
- `../Handover_docs/AI_BRAIN_HANDOVER_2026-06-11_22-36-37_IST.md`
- `../UX_UI_DESIGN_PACKAGE/README.md`
- `../UX_UI_DESIGN_PACKAGE/docs/*`
- `../UX_UI_DESIGN_PACKAGE/screenshots/SCREENSHOT_EXPORT_INDEX.md`
- `../UX_UI_DESIGN_PACKAGE/source-exports/web/magic-patterns-exact`
- `../UX_UI_DESIGN_PACKAGE/source-exports/android/magic-patterns-exact`
- Current web code under `../src`
- Current Android/Capacitor shell under `../android` and `../capacitor.config.ts`

The local design package is self-contained enough for planning, so the live Magic Patterns URLs were not required in this pass. Keep them as provenance and fallback:

- Android: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`
- Web: `https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx`

Design freshness gate: before visual implementation starts, either re-check the live Magic Patterns refs and record whether they changed, or get explicit confirmation that the frozen local design package is authoritative. If the live refs differ materially, update `trackers/design_traceability_matrix.md`, affected PRDs, and the roadmap before code work.

## Current State Summary

Already present or largely present in the dirty worktree:

- AI Memory brand assets, launcher labels, web manifest, favicon assets, and Prism Memory tokens.
- Canonical `/library`, source/quality filters, mobile filter sheet, multi-select, and Ask selected.
- Needs Upgrade queue and weak-source counts.
- Web item detail with source trust strip, included topics, collections, related items, digest, and focus mode.
- Topic and collection destinations with scoped Ask entry points.
- Ask scope banners for library, item, selected, tag, topic, and collection, with weak-source warnings and citation metadata.
- Durable Ask history for library and item threads.
- Mobile bottom navigation and `/more` route are coded but not fully verified.
- Capacitor Android shell, Android share intent filters, launcher branding, and offline fallback page.

Major remaining gaps:

- Capture result contracts are incomplete for duplicate, updated-existing, and error-with-save states across web and Android.
- Attached Ask context, Android add-context sheets, high-quality-only scope, and durable non-library scope history are incomplete.
- Weak-source repair is not a first-class user flow, even though URL API upgrade support exists for one case.
- Android share capture routes straight to item detail or alert flows; it lacks a designed result/repair surface.
- Android item detail tabs and full Android Ask composer are design requirements but not implemented as production behavior.
- Settings, More, privacy, offline, pairing, session-expired, and entry states are partial and need trust-aware finish.
- QA evidence is not release-ready: no complete copied acceptance checklist, screenshot set, brand/privacy search, production web build, or Android APK evidence for UX v2.

## Phased Roadmap

### Phase 0: Planning Freeze And Handoff Readiness

Goal: Give the next implementation agent a clean control room.

Milestones:

- M0.1: Accept this planning package as the active roadmap.
- M0.2: Keep previous `01` through `05` docs as baseline, not as complete release evidence.
- M0.3: Confirm which design-implied items are approved scope versus exploratory prototype states.
- M0.4: Finish PRD-11 mobile shell smoke before changing code.

Dependencies:

- User decision on whether prototype-only states count as implementation scope.
- Current dirty worktree must be preserved.
- Current no-go gates in `00_PLANNING_PACKAGE_INDEX.md` must be reviewed before selecting a feature.

Risks:

- A future agent may treat implemented-but-unverified slices as finished.
- Older prototype source still contains legacy "AI Brain" copy, so literal copying can regress brand.

Acceptance criteria:

- Trackers are reviewed.
- Open decisions are either answered or assigned.
- No implementation begins until the relevant feature package is selected.
- No implementation begins while the selected feature has an open P0/P1 decision or verification blocker.

### Phase 1: Verify And Stabilize Existing UX v2 Work

Goal: Convert already-coded slices into trustworthy baseline evidence.

Milestones:

- M1.1: Verify PRD-11-SHELL mobile Library, Ask, Capture, and More at `390 x 844`.
- M1.2: Verify desktop `/more` and sidebar behavior at desktop width.
- M1.3: Rerun typecheck, lint, and focused tests listed in the handover.
- M1.4: Update `03_IMPLEMENTATION_PROGRESS.md` only after evidence is collected.
- M1.5: Record code-review outcome for already-coded PRD-11-SHELL.

Dependencies:

- Local dev server and Browser/in-app responsive QA.

Risks:

- Service worker cache can hide stale chunks; use `?nosw=1`.
- More route currently raises Capture because it is treated as a content route; decide if that is desired.

Acceptance criteria:

- Mobile nav visible and route-active on Library, Ask, Capture, More.
- Raised Capture appears only on intended routes.
- Ask composer is not overlapped.
- Evidence paths or smoke outputs are logged.

### Phase 2: Close Cross-Platform Capture And Ask Contract Gaps

Goal: Make the two highest-trust flows truthful before more surface polish.

Milestones:

- M2.1: PRD-06-FU capture result states.
- M2.2: PRD-09-FU attached context, high-quality-only scope, and scope-history persistence.
- M2.3: Update Ask/capture APIs and UI copy together so result states are not decorative.

Dependencies:

- Current `src/app/api/capture/*`, `src/app/capture-actions.ts`, `src/app/capture/tabs.tsx`, `src/components/share-handler.tsx`, `src/app/api/ask/route.ts`, `src/lib/retrieve/index.ts`.

Risks:

- Returning more detailed capture outcomes without UI handling can confuse Android share and extension flows.
- High-quality-only scope can silently change answer source sets unless the UI makes it obvious.

Acceptance criteria:

- Duplicate, updated-existing, error-with-save, metadata-only, preview-only, and full-text result states are distinguishable.
- Attached context visibly overrides route scope.
- High-quality-only Ask excludes limited sources and shows source counts.

### Phase 3: Build Weak-Source Repair Workflow

Goal: Turn Needs Upgrade from a queue into an actual repair path.

Milestones:

- M3.1: PRD-10 web repair workflow.
- M3.2: Define derived-state reset behavior for chunks, embeddings, enrichment, topics, related items, warnings, and job queues.
- M3.3: Add repair success states and Needs Upgrade exit criteria.

Dependencies:

- `updateItemCaptureContent` exists but does not by itself prove derived data reset.
- Needs Upgrade queue and capture quality helpers exist.

Risks:

- Data corruption or stale embeddings if repair updates item body without invalidating downstream state.
- "Mark good enough" could hide weak-source warnings if not modeled carefully.

Acceptance criteria:

- Metadata-only item can be upgraded with text/transcript.
- Ask warnings change after repair.
- Needs Upgrade count updates.
- Tests cover derived-state reset.

### Phase 4: Android Companion Core

Goal: Make Android feel intentionally mobile instead of squeezed web.

Milestones:

- M4.1: PRD-11-FU mobile shell select-mode polish.
- M4.2: PRD-12 Android unified Ask composer and add-context sheets.
- M4.3: PRD-13 Android share capture landing and result states.
- M4.4: Decide whether Android item detail tabs are a major follow-up or included inside PRD-11-FU.

Dependencies:

- Shared mobile shell in `src/components/sidebar.tsx`.
- Mobile Library filter sheet in `src/components/mobile-library-filters.tsx`.
- Share handler in `src/components/share-handler.tsx`.
- Capacitor/Android share intent wiring.

Risks:

- Keyboard, bottom nav, and composer collisions on small/tall phones.
- Prototype paste-link and duplicate states are simulated; production scope requires backend decisions.

Acceptance criteria:

- Android Ask has add context, attached chips, history sheet, empty-send nudges, and keyboard-safe composer.
- Share capture result states are visible without relying on browser alerts.
- Long press or explicit control enters mobile select mode.

### Phase 5: Trust, Settings, Entry, Pairing, And Offline States

Goal: Finish the app surfaces that establish user confidence.

Milestones:

- M5.1: PRD-14 Settings, privacy, offline, and trust states.
- M5.2: PRD-15 Login, unlock, pairing, session, and offline entry states.
- M5.3: Brand/copy audit for `AI Brain`, `Brain`, and privacy overclaims.

Dependencies:

- Existing setup/unlock/pairing routes.
- `public/offline.html`, service worker, provider status, Settings, More.

Risks:

- Disabled privacy controls can look active if copy or styling is vague.
- Offline copy can overpromise cached reading if no readable content is available offline.

Acceptance criteria:

- Entry surfaces use AI Memory brand and logo.
- End-to-end encryption is not claimed as active.
- Pairing success/failure and session-expired states are explicit.
- Offline fallback explains what works and what does not.

### Phase 6: Ops-Adjacent Transcript Visibility And Fallback Decisions

Goal: Preserve the v0.8.5 production handover risks without mixing them into the UX revamp by accident.

Milestones:

- M6.1: Decide if `/ops/transcripts` or `/admin/transcripts` belongs in UX v2.
- M6.2: Write separate research PRD before adding transcript fallback providers.
- M6.3: Keep real YouTube backfill guarded.

Dependencies:

- `AI_BRAIN_HANDOVER_2026-06-11_22-36-37_IST.md`.

Risks:

- YouTube transcript anti-bot behavior is not solved by UI polish.
- `yt-dlp`, browser scraping, or ASR create privacy, dependency, and cost changes.

Acceptance criteria:

- Ops features are explicitly in or out of UX v2 scope.
- No real backfill, cooldown bypass, or provider fallback is run without user approval.

### Phase 7: QA Evidence And Release Gates

Goal: Finish only with evidence.

Milestones:

- M7.1: PRD-16 QA evidence and release gates.
- M7.2: Copy or reference the design-package acceptance checklist with evidence.
- M7.3: Run automated checks, browser/mobile screenshots, brand/privacy search, web build, and Android APK build.
- M7.4: Produce final implementation handoff.

Dependencies:

- All behavior features.

Risks:

- "Looks done" without screenshots will hide mobile overlap and trust-copy regressions.
- Android APK build may fail after web changes if Capacitor/offline assets are stale.

Acceptance criteria:

- All checklist rows have pass/fail, evidence, owner, and next step.
- UX v2 final handoff references test outputs and screenshot paths.
- Remaining issues are documented as decisions or blockers, not omitted.

## Recommended Execution Order

1. Finish PRD-11-SHELL verification.
2. PRD-06-FU capture result states.
3. PRD-09-FU attached context and high-quality-only Ask.
4. PRD-10 weak-source repair.
5. PRD-12 Android unified Ask composer.
6. PRD-13 Android share capture.
7. PRD-11-FU mobile select-mode and item-detail mobile polish.
8. PRD-14 settings/privacy/offline trust states.
9. PRD-15 entry, pairing, session, offline states.
10. OPS decisions for transcript visibility/fallback.
11. PRD-16 QA evidence and release gates.

## No-Go Gates

- Do not implement from exact prototype source without applying AI Memory brand migration.
- Do not ship any active privacy or encryption claim that is not implemented.
- Do not mark a feature complete from dirty worktree state alone.
- Do not run production YouTube real backfill, bypass cooldown, or reset transcript jobs without explicit approval.
- Do not mark Android complete without phone viewport and APK evidence.
