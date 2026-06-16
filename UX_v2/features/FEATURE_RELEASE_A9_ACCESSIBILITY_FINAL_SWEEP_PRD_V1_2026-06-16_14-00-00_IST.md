# A9 Accessibility Final Sweep PRD V1

Created: 2026-06-16 14:00:00 IST
Owner: Main Codex execution agent
Status: Draft for adversarial review
Source blockers: A7 release packet, web accessibility smoke release follow-ups

## Problem

UX v2 has strong local web and Android-responsive evidence, but production release remains blocked by incomplete accessibility release follow-ups:

- Keyboard focus smoke on Library, Device Pairing, Ask, Capture, Settings, and auth routes.
- Touch-target review for compact mobile controls, especially Capture tabs/actions and Device Pairing controls.
- 200 percent zoom/reflow spot checks on core routes.

## Goal

Convert the remaining accessibility follow-ups from partial/manual notes into a repeatable local release sweep with saved evidence. If the sweep finds measurable failures, fix the affected UI and rerun the sweep before updating release status.

## In Scope

- Local browser/CDP accessibility release sweep for core routes.
- Authenticated and unauthenticated route coverage using synthetic fixtures and a temporary database.
- Mobile 390x844 touch-target checks.
- Desktop/compact 200 percent reflow checks.
- Keyboard tab-path checks and visible-focus evidence.
- A concise QA report and tracker update.

## Out Of Scope

- Android TalkBack validation inside a real APK. That remains part of the Android runtime blocker.
- Full WCAG certification.
- Production deploy.
- Live AI-provider Ask response quality.

## Acceptance Criteria

| ID | Requirement | Acceptance |
| --- | --- | --- |
| A9-KEYBOARD | Core pages expose a usable keyboard path. | Script captures at least one meaningful focusable control per route, no BODY-only focus result for protected route after session injection, and active elements have accessible names or semantic inputs. |
| A9-FOCUS | Focus is visible. | Focused controls show an outline, ring, border, or other measurable style change after keyboard tab. |
| A9-TOUCH | Mobile primary controls meet target size. | Visible non-inline buttons/inputs/links on mobile sampled routes are at least 44px high or have an explicit documented exception. |
| A9-ZOOM | 200 percent reflow is usable. | Core desktop routes at compact/zoom-equivalent width show no horizontal overflow, no clipped primary controls, and the main action/form remains visible. |
| A9-EVIDENCE | Evidence is reproducible and redacted. | The sweep writes a JSON report and screenshots under the UX v2 visual-evidence folder without raw session tokens or pairing codes. |

## Routes

- Public/auth: `/setup`, `/unlock`, `/setup-apk`, `/offline.html`.
- Authenticated: `/library`, `/ask`, `/capture`, `/settings`, `/settings/device-pairing`, `/items/[id]`, `/items/[id]/repair`, `/needs-upgrade`.

## Risks

- Browser CDP checks are not a substitute for screen-reader runtime testing.
- Scripted tab paths can miss contextual keyboard problems in menus or dialogs.
- Some icon-only controls may be valid if they have accessible names and sufficient surrounding hit area.
- Running against local synthetic data proves release readiness for layout behavior, not production data volume.
