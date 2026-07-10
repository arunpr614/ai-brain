# Android A2 Capture / Repair / Needs Upgrade PRD V1

Created: 2026-06-16 11:00:00 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: Draft for adversarial review. Do not implement from this file until revised.

## Source Inputs

- Android revised PRD: `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
- Android revised implementation plan: `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
- Android A0 truth matrix: `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md`
- Magic Patterns source snapshot:
  - `pages/MobileCapture.tsx`
  - `pages/MobileRepair.tsx`
  - `pages/MobileNeedsUpgrade.tsx`
- Completed prerequisite slices:
  - Android share-result web surface QA: `UX_v2/execution/ANDROID_SHARE_RESULT_QA_2026-06-16_08-16-53_IST.md`
  - Android A1 shell/library/more/offline QA: `UX_v2/execution/ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_QA_2026-06-16_10-53-45_IST.md`

## Problem

Capture, Repair, and Needs Upgrade are key Android trust surfaces. They currently work, but the layout and state handling still read as responsive web. A2 should make these screens easier to use on Android while preserving production truth and avoiding prototype-only behavior.

## Goals

1. Make `/capture` feel mobile-native for URL, PDF, and Note capture.
2. Make `/needs-upgrade` easy to scan and act on from Android.
3. Make `/items/[id]/repair` usable on small screens with clear weak-source explanation, validation, and success path.
4. Preserve truthful capability boundaries: no mark-good-enough, no offline queue/read, no fake save/sync state, and no native share or APK completion claim.

## In Scope

### Capture

- Mobile header, compact spacing, safe bottom-nav clearance, and touch-sized controls.
- URL, PDF, and Note tabs remain the only first-party capture modes.
- URL duplicate/error states must remain reachable and understandable.
- PDF upload/dropzone must be touch-friendly and clearly limited to PDF.
- Note capture must preserve title/body validation and save behavior.
- Result handling may continue to land on item detail with `capture_state`; this slice does not create a new non-share capture result route.

### Needs Upgrade

- Mobile-friendly header, reason grouping, count, weak-source explanation, row layout, quality badges, Add text action, Source action where available, and empty state.
- No weak-source dismissal or "mark good enough."
- No fake offline availability, sync, or upgrade completion.

### Repair

- Mobile-friendly repair header, item context, weak-source explanation, text/transcript selector, large textarea, validation error, Save repair, Open source when available, and Cancel.
- Successful repair continues to redirect to item detail with existing `repair=queued` feedback.
- Existing tags and collections must remain attached.

## Out Of Scope

- Native Android share invocation evidence.
- New APK publication.
- QR pairing, offline queue/read/sync, biometric unlock, telemetry, account controls, destructive delete, mark-good-enough, and package migration.
- New capture persistence schema or a new capture-result database table.
- New provider/extraction strategy or transcript fallback work.
- Topic, Collection, Ask composer, and Item Detail tab redesign; those remain later slices.

## Product Decisions

| Decision | A2 rule |
| --- | --- |
| Paste Text in Magic Patterns Capture | Do not add as a standalone capture mode. Existing Note capture and Repair source-text paste cover the production-truth behavior. |
| Duplicate URL | Keep existing duplicate confirmation path. Do not add Merge/Keep both semantics beyond the current "Save again anyway" behavior. |
| Capture result cards | Use existing real item-detail result banners and route state. Do not add simulated inline result cards unless backed by existing action responses. |
| Needs Upgrade dismissal | Not allowed. Add text/repair is the only primary path. |
| Offline language | Do not mention offline availability, offline reads, or offline queues. |
| Evidence label | Browser mobile only for local A2 unless APK evidence is later captured. |

## Acceptance Criteria

### Capture

- `/capture` at 390 x 844 and 430 x 932 shows a mobile-appropriate header, tabs, touch-friendly form controls, and no horizontal overflow.
- URL, PDF, and Note tabs are reachable and visibly selected.
- URL duplicate state remains accessible.
- PDF non-PDF error remains visible and understandable.
- Note validation and save affordance remain visible.
- Bottom nav does not cover critical form controls.

### Needs Upgrade

- `/needs-upgrade` at 390 x 844 and 430 x 932 shows grouped weak items with reason/count and Add text actions.
- Empty state is validated with a fixture database that has no weak items.
- No mark-good-enough, dismissal, offline, sync, or fake completion control appears.
- Rows wrap long titles without clipping.

### Repair

- `/items/[id]/repair` at 390 x 844 and 430 x 932 shows weak-source explanation, item context, repair type selector, textarea, Save repair, Cancel, and Open source when a source URL exists.
- Short text validation remains visible.
- Successful repair still redirects to item detail and removes the item from Needs Upgrade.
- No mark-good-enough or fake success path appears.

## Required Validation

- Focused tests for any changed capture/repair/needs-upgrade helpers.
- Copy/forbidden behavior scan for A2 surfaces.
- Browser evidence for:
  - capture URL tab
  - capture PDF tab
  - capture Note tab
  - URL duplicate state
  - PDF non-PDF error
  - Needs Upgrade grouped queue
  - Needs Upgrade empty state
  - Repair default
  - Repair validation error
  - Repair success path
- `git diff --check`.
- Typecheck, lint, tests, and build before release claim.

## Release Claim

Completion wording must be:

`Android A2 capture/repair/needs-upgrade completed locally with browser evidence; APK evidence and production release still pending.`
