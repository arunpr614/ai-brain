# A9 Accessibility Final Sweep PRD V2

Created: 2026-06-16 14:02:00 IST
Owner: Main Codex execution agent
Status: Product source for A9 execution
Source blockers: A7 release packet, web accessibility smoke release follow-ups

## Problem

UX v2 cannot advance to final release while web accessibility follow-ups remain partial. A9 must produce measurable local evidence for keyboard focus, visible focus, mobile touch targets, and 200 percent reflow behavior without overclaiming Android TalkBack or APK runtime coverage.

## Scope

Run a repeatable local accessibility release sweep against synthetic fixtures and a temporary database. Fix any clear product failures found in web code, rerun the sweep, then update release docs and trackers.

## Acceptance Criteria

| ID | Requirement | Release acceptance |
| --- | --- | --- |
| A9-KEYBOARD | Keyboard tab path works on core routes. | Each protected route after session injection records at least one non-BODY focused control with an accessible name or semantic input. Public auth routes record their primary form/button controls. |
| A9-FOCUS | Focus is visible. | Each sampled focused element has measurable focus styling: outline width/style, box shadow, changed border color, or equivalent visible ring. |
| A9-TOUCH | Primary mobile controls meet target size. | Buttons, inputs, textareas, selects, nav links, tabs, and icon controls are at least 44px high and 44px wide when not inline text. Inline body links and repeated citation chips may be documented exceptions. |
| A9-ZOOM | 200 percent reflow proxy passes. | At 720px desktop/zoom-equivalent width, core routes have no horizontal overflow, no clipped primary controls, and retain the main action/form content. Limitation: this is a browser reflow proxy, not OS-level zoom. |
| A9-SECRET-HYGIENE | Evidence is redacted. | Session and pairing secrets are stored only in `/tmp` during the run; report/screenshots do not contain raw token or pairing-code values. |
| A9-TRACKING | Release docs are updated. | QA report, tracker update, A7 packet, master tracker, and milestone tracker reflect the final A9 result honestly. |

## Route Coverage

- Public/auth: `/setup`, `/unlock`, `/setup-apk`, `/offline.html`.
- Authenticated: `/library`, `/ask`, `/capture`, `/settings`, `/settings/device-pairing`, `/items/[id]`, `/items/[id]/repair`, `/needs-upgrade`.

## Explicit Non-Goals

- Android TalkBack or real APK keyboard proof.
- Production deployment.
- Live AI-provider Ask proof.
- Full WCAG certification.

## Release Decision

A9 can close the local web accessibility release follow-up if all checks pass or if any remaining exceptions are documented as non-blocking. It cannot close Android runtime accessibility or production release gates.
