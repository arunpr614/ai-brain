# Android A2 Capture / Repair / Needs Upgrade PRD V2

Created: 2026-06-16 11:04:00 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: Revised product source for A2 implementation.

## Revision Notes

This PRD v2 resolves the no-go findings in `FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_PRD_ADVERSARIAL_REVIEW_2026-06-16_11-02-00_IST.md` by:

- splitting action-backed validation from fixture-rendered route-state evidence;
- requiring isolated fixture databases/manifests for queue, empty, duplicate, and repair-success states;
- requiring repair data-state proof that the item leaves Needs Upgrade;
- naming bottom-nav overlap controls;
- requiring an A2-specific forbidden copy/action scanner.

## Source Inputs

- Android revised PRD: `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
- Android revised implementation plan: `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
- Android A0 truth matrix: `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md`
- Magic Patterns source snapshot:
  - `pages/MobileCapture.tsx`
  - `pages/MobileRepair.tsx`
  - `pages/MobileNeedsUpgrade.tsx`
- Completed prerequisite slices:
  - `UX_v2/execution/ANDROID_SHARE_RESULT_QA_2026-06-16_08-16-53_IST.md`
  - `UX_v2/execution/ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_QA_2026-06-16_10-53-45_IST.md`

## Problem

Capture, Repair, and Needs Upgrade are Android trust surfaces. A2 must make them mobile-usable without turning Magic Patterns simulated outcomes into fake shipped capability.

## Goals

1. Make `/capture` comfortable on Android for URL, PDF, and Note capture.
2. Make `/needs-upgrade` easy to scan, grouped by reason, and honest about weak-source repair.
3. Make `/items/[id]/repair` small-screen safe with clear item context, validation, and success proof.
4. Preserve production truth: no mark-good-enough, no fake duplicate merge, no standalone unsupported Paste Text capture mode, no offline queue/read/sync, no APK completion claim.

## In Scope

### Capture

- Mobile header, compact spacing, safe bottom-nav clearance, and touch-sized controls.
- URL, PDF, and Note tabs only.
- URL duplicate confirmation remains action-backed by existing duplicate detection.
- PDF upload/dropzone is touch-friendly and clearly limited to PDF.
- Note capture preserves title/body validation and save behavior.
- Result proof uses existing item-detail route states and action responses. A2 does not add inline simulated result cards or a new non-share capture-result route.

### Needs Upgrade

- Mobile-friendly header, reason grouping, count, weak-source explanation, row layout, quality badges, Add text action, Source action where available, and empty state.
- Long titles wrap without clipping.
- No weak-source dismissal, "mark good enough", offline availability, or fake completion.

### Repair

- Mobile-friendly header, item context, weak-source explanation, text/transcript selector, large textarea, validation error, Save repair, Cancel, and Open source when available.
- Successful repair redirects to item detail with existing `repair=queued` feedback and must remove the item from Needs Upgrade.
- Existing tags and collections remain attached.

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
| Paste Text in Magic Patterns Capture | Do not add as a standalone capture mode. Existing Note capture and Repair source-text paste are the production-truth paths. |
| Duplicate URL | Keep existing "Open existing" and "Save again anyway" behavior. Do not add Merge/Keep both semantics. |
| Capture result cards | Do not add simulated inline result cards. Use real route/action states. |
| Needs Upgrade dismissal | Not allowed. Add text/repair is the only primary path. |
| Offline language | Do not mention offline availability, offline reads, offline sync, or offline queues. |
| Evidence label | Browser mobile only for local A2 unless APK evidence is explicitly captured later. |

## Validation Labels

| Label | Meaning | Required A2 use |
| --- | --- | --- |
| Action-backed | A real action, API, or server action produced the state. | Required for duplicate URL, note save coverage, PDF type error, repair validation, and repair success. |
| Fixture-rendered | Deterministic seeded data renders a route state without mutating production data. | Allowed for queue, empty, and route visual states. |
| Browser mobile only | Responsive browser evidence only. | Required local evidence label unless APK/device evidence is later added. |

## Fixture Requirements

- Use isolated temporary SQLite databases or explicit reset steps for:
  - A2 queue state with at least two weak items in different reason groups.
  - A2 empty state with no weak items.
  - A2 duplicate URL state with one pre-existing URL item.
  - A2 repair-success state with one weak item, one tag, and one collection.
- Write a seed manifest containing DB path, item IDs, collection/tag IDs, route paths, and cleanup notes.
- Never use production data for browser screenshots.

## Acceptance Criteria

### Capture

- `/capture` at 390 x 844 and 430 x 932 shows a mobile-appropriate header, tabs, touch-friendly form controls, and no horizontal overflow.
- URL, PDF, and Note tabs are reachable and visibly selected.
- Critical controls remain visible/tappable above bottom nav: Save URL, duplicate Open existing, duplicate Save again anyway, PDF browse/dropzone, PDF error, Note title/body, Save note, Cancel.
- URL duplicate state is action-backed.
- PDF non-PDF error is action-backed from the dropzone input path.
- Note save is covered by focused action test or browser action and does not regress.

### Needs Upgrade

- `/needs-upgrade` at 390 x 844 and 430 x 932 shows grouped weak items with reason/count and Add text actions.
- Empty state is validated in an isolated no-weak-items DB.
- No mark-good-enough, dismissal, offline, sync, Merge, Keep both, or fake completion control appears.
- Rows wrap long titles without clipping.

### Repair

- `/items/[id]/repair` at 390 x 844 and 430 x 932 shows weak-source explanation, item context, repair type selector, textarea, Save repair, Cancel, and Open source when a source URL exists.
- Critical controls remain visible/tappable above bottom nav: text/transcript selector, textarea, Save repair, Cancel, Open source.
- Short text validation is action-backed.
- Successful repair is action-backed and proves:
  - item body/source text is updated;
  - capture quality no longer matches Needs Upgrade criteria;
  - item no longer appears in `/needs-upgrade`;
  - existing tag and collection links remain attached.
- No mark-good-enough or fake success path appears.

## Required Validation

- A2 forbidden copy/action scan over Capture, Needs Upgrade, Repair, and item-detail result surfaces.
- Focused tests or action harness coverage for:
  - URL duplicate state;
  - note save state;
  - PDF type error;
  - repair short-text validation;
  - repair success and weak-source removal.
- Browser evidence for:
  - capture URL tab;
  - capture PDF tab;
  - capture Note tab;
  - URL duplicate state;
  - PDF non-PDF error;
  - Needs Upgrade grouped queue;
  - Needs Upgrade empty state;
  - Repair default;
  - Repair validation error;
  - Repair success path and post-success Needs Upgrade absence.
- `git diff --check` after implementation and docs.
- QA doc must state exactly which heavy gates were rerun for A2 and which earlier green gates are only inherited context.

## No-Go Gates

- No A2 completion claim if repair does not remove the item from Needs Upgrade.
- No A2 completion claim if screenshots show prototype-only unsupported controls.
- No A2 completion claim if duplicate URL, repair validation, and repair success are not action-backed.
- No APK or production completion claim from browser-only evidence.

## Release Claim

Completion wording must be:

`Android A2 capture/repair/needs-upgrade completed locally with browser evidence; APK evidence and production release still pending.`
