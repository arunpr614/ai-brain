# Feature PRD v1: Android A4 Topic And Collection Mobile Parity

Created: 2026-06-16 12:18:00 IST
Owner: Main Codex
Status: Draft for adversarial review
Source PRD: `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
Source plan: `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
Truth matrix: `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md`

## Problem

Android A1 smoke-tested Topic and Collection route reachability, but those routes have not received a dedicated mobile parity pass. The revised Android PRD requires Topic and Collection screens to match the mobile design direction with read-only layouts, scoped Ask entry points, item rows, empty states, and truthful badges while hiding untested mutation sheets.

## Scope

Included:

- `/topics/[slug]` mobile layout for populated and empty topics.
- `/collections/[id]` mobile layout for populated and empty collections.
- Scoped Ask entry points to `/ask?scope=topic&topic=...` and `/ask?scope=collection&collection=...`.
- Mobile item rows with platform, quality, relative time, limited-quality indicators, and safe wrapping.
- Scope health summary for source count, readable count, and weak count.
- Browser-mobile evidence at `390x844`.

Excluded:

- Creating tags from topics.
- Adding items to collections from the collection page.
- Offline-read or offline-sync claims.
- QR pairing, biometric unlock, telemetry, E2EE, destructive data controls, embedded media players, and fake account/device content.
- APK/device evidence and production deployment.

## Requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| A4-R1 | Topic route is mobile-safe | Populated topic renders without horizontal overflow at 390 x 844 and has readable heading, scope health, Ask topic action, and item rows. |
| A4-R2 | Topic empty state is explicit | Empty topic renders an explanatory empty state without broken cards or mutation controls. |
| A4-R3 | Collection route is mobile-safe | Populated collection renders without horizontal overflow at 390 x 844 and has readable heading, description, scope health, Ask collection action, and item rows. |
| A4-R4 | Collection empty state is explicit | Empty collection renders an explanatory empty state without add-items sheet or fake actions. |
| A4-R5 | Scoped Ask links use existing semantics | Topic Ask and Collection Ask route to existing scoped Ask query parameters and render the existing Ask scope banner. |
| A4-R6 | No unsupported prototype capabilities leak | Static copy/action scan finds no create-tag/add-items/offline-sync/offline-read/QR/biometric/telemetry/E2EE/delete-all-data/fake brand copy in A4 targets. |

## Completion Wording

Android A4 Topic and Collection completed locally with browser evidence; APK evidence and production release still pending.

## Evidence Required

- A4 seed script with populated and empty Topic/Collection fixtures.
- A4 static copy/action scanner.
- A4 CDP browser report covering populated/empty routes and scoped Ask routes.
- `git diff --check`, typecheck, lint, tests, build.

## Risks

- Empty topics may be impossible if the route only exposes topics attached to items.
- Scoped Ask proof could be faked by only checking links rather than rendering `/ask`.
- Existing route layouts may be desktop-first and allow bottom-nav overlap or clipped actions.
