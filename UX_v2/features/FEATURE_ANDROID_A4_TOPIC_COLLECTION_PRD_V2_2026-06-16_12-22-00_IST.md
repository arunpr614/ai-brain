# Feature PRD v2: Android A4 Topic And Collection Mobile Parity

Created: 2026-06-16 12:22:00 IST
Owner: Main Codex
Status: Revised product source after adversarial review
Source PRD: `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
Source plan: `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
Truth matrix: `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md`

## Problem

Android A1 verified Topic and Collection route reachability but did not complete the revised Android PRD requirement for mobile Topic and Collection parity. A4 closes that local browser-mobile gap for read-only route layout, scoped Ask entry points, row readability, and empty states without shipping untested mutation semantics.

## Scope

Included:

- `/topics/[slug]` populated topic route.
- `/topics/[slug]` empty existing-topic route where the topic row exists but has zero attached items.
- `/collections/[id]` populated collection route.
- `/collections/[id]` empty collection route.
- `/ask?scope=topic&topic=<slug>` scoped Ask rendering.
- `/ask?scope=collection&collection=<id>` scoped Ask rendering.
- Scope health summaries, mobile-safe rows, weak-source notice, and safe wrapping at `390x844`.

Excluded:

- Topic create-tag, create-collection, or mutation sheets.
- Collection add-items sheets or untested collection mutation controls on the detail route.
- Offline-read/offline-sync claims, QR pairing, biometric unlock, telemetry, E2EE, destructive data controls, embedded media players, fake device/account copy, or stale AI Brain/Your Brain naming.
- APK/device evidence and production deployment.

## Requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| A4-R1 | Populated Topic route is mobile-safe | Browser evidence at 390 x 844 shows heading, derived-topic badge, source count, readable/weak health, Ask topic action, and item rows with no horizontal overflow. |
| A4-R2 | Empty existing Topic route is truthful | Seed creates a persisted topic with zero item attachments; browser evidence shows the route and an empty state, not a 404 and not a fake mutation prompt. |
| A4-R3 | Populated Collection route is mobile-safe | Browser evidence at 390 x 844 shows heading, optional description, item count, readable/weak health, Ask collection action, and item rows with no horizontal overflow. |
| A4-R4 | Empty Collection route is truthful | Seed creates an empty persisted collection; browser evidence shows an empty state with no add-items sheet or fake action. |
| A4-R5 | Scoped Ask pages render real scope banners | Browser evidence navigates to topic-scoped Ask and collection-scoped Ask and asserts `TOPIC` or `COLLECTION`, the scope label, source count, and fixture item title. |
| A4-R6 | Unsupported prototype actions are absent | Static scan and browser metrics find no create-tag, add-items, plus-sheet, offline-read/offline-sync, QR, biometric, telemetry, E2EE, delete-all-data, fake brand, or embedded-player controls. |
| A4-R7 | Bottom-nav clearance is checked | Browser report records clipped controls for each state and fails if any non-fixed visible control is clipped by the viewport bottom or fixed nav. |

## Completion Wording

Android A4 Topic and Collection completed locally with browser evidence; APK evidence and production release still pending.

## Evidence Required

- A4 seed script that prints populated topic slug, empty topic slug, populated collection id, and empty collection id.
- A4 copy/action scanner targeting Topic, Collection, Ask scope, and shared row copy.
- A4 CDP browser report with at least six states: populated topic, empty topic, topic Ask scope, populated collection, empty collection, collection Ask scope.
- Static and build gates: `git diff --check`, typecheck, lint, tests, build.

## Non-Goals And Deferrals

- APK/device proof is a later Android release gate.
- Production release is out of A4 local completion.
- Live provider Ask quality is out of A4; scoped Ask rendering is enough for this slice.
