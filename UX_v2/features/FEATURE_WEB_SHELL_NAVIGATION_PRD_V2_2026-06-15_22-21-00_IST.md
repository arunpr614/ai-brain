# Feature PRD V2 - Web Shell And Navigation

**Created:** 2026-06-15 22:21:00 IST
**Supersedes:** `FEATURE_WEB_SHELL_NAVIGATION_PRD_V1_2026-06-15_22-16-00_IST.md`
**Review addressed:** `FEATURE_WEB_SHELL_NAVIGATION_PRD_ADVERSARIAL_REVIEW_2026-06-15_22-18-00_IST.md`
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Feature owner:** Main Codex
**Status:** Approved for implementation-plan drafting

## Summary

Revamp the production web shell and navigation so AI Memory has a stable, route-safe frame for the broader Magic Patterns web revamp.

This feature covers only persistent shell behavior:

- Desktop left rail.
- Desktop Capture action placement.
- Desktop collapsed/expanded behavior.
- Desktop and mobile route-active states.
- Pair Device and disabled Privacy Controls utility rows.
- Mobile bottom navigation and `/more` route truthfulness.
- Shell overflow, focus, contrast, and screenshot evidence.

It does not redesign route content such as Library lists, Ask answers, Capture result panels, Settings categories, Item Detail, Pairing internals, Topic, or Collection pages.

## Decisions From Review

| Decision | V2 contract |
| --- | --- |
| Desktop Capture placement | Capture is a prominent top action above primary route nav. It is not duplicated as a regular desktop primary nav row. On `/capture`, the top action receives active styling. |
| Pair Device active state | `/settings/device-pairing` activates the lower Pair Device utility row. Settings primary nav is active for `/settings`, `/settings/tags`, and `/settings/collections`, not the Pair Device route. |
| Item Ask active state | `/items/[id]/ask` activates Ask because it is a scoped Ask experience. `/items/[id]` and `/items/[id]?mode=focus` activate Library. |
| Disabled Privacy Controls behavior | Privacy Controls is an informational disabled row, not a link to `#`. It is not keyboard-focusable as an action and cannot change the URL. |

## Source Evidence

| Source | Relevant evidence |
| --- | --- |
| Magic Patterns web `components/DesktopLayout.tsx` | Left rail, AI Memory identity, top Capture action, Library/Needs Upgrade/Ask/Settings nav, weak-source badge, lower Pair Device link, privacy controls coming soon, collapse button, shell-owned overflow. |
| Magic Patterns web `App.tsx` | Prototype route map includes desktop shell routes; production must map to existing Next routes and not add prototype aliases. |
| Magic Patterns mobile `components/MobileBottomNav.tsx` | Mobile bottom nav includes Library, Capture, Ask, and More. |
| Magic Patterns mobile `components/MobileFrame.tsx` | Prototype-only phone/status/nav chrome must not ship. |
| Current production `src/components/sidebar.tsx` | Existing shell implementation with desktop sidebar, command-palette search, collapse persistence, mobile bottom nav, Pair Device route, and disabled privacy row. |
| Current production `src/app/layout.tsx` | Root shell, mobile safe-area bottom padding, Needs Upgrade count. |
| Current production `src/app/more/page.tsx` | Truthful mobile More route and production-safe settings/device/privacy rows. |
| Contrast QA | `WEB_EXPERIENCE_REVAMP_CONTRAST_QA_2026-06-15_22-20-00_IST.md` passed code, static, and representative local browser visual checks. |

## Goals

1. Align the desktop shell hierarchy with Magic Patterns after production-truth adaptation.
2. Preserve real routes and avoid prototype route aliases.
3. Make route-active state deterministic and testable across core and context routes.
4. Keep Capture prominent without duplicate desktop navigation.
5. Keep Pair Device truthful and reachable at `/settings/device-pairing`.
6. Keep Privacy Controls truthful, disabled, and non-navigating.
7. Preserve mobile bottom nav behavior without prototype phone chrome.
8. Produce browser evidence for expanded/collapsed desktop shell, mobile shell, route-active states, keyboard behavior, and console cleanliness.

## Non-Goals

- No new route aliases: `/pair`, `/login`, `/item/:id`, `/topic/:slug`, `/collection/:slug`, `/share-capture`, or `/offline`.
- No Library list redesign, selection toolbar redesign, Ask redesign, Capture result redesign, Settings capability redesign, Pair Device flow redesign, Item Detail redesign, Topic redesign, or Collection redesign.
- No fake profile, fake email, fake connected devices, fake offline sync, fake E2EE, fake telemetry controls, fake destructive controls, or fake provider metrics.
- No Android APK publication.
- No production deployment.

## Functional Requirements

### Desktop Shell

| ID | Requirement |
| --- | --- |
| SH-001 | Desktop shell uses a left rail with AI Memory identity, command search, top Capture action, primary route nav, lower utility/trust rows, and collapse control. |
| SH-002 | Primary desktop route nav contains Library, Needs Upgrade, Ask, and Settings only. |
| SH-003 | Capture appears as a prominent top action above primary route nav and receives active styling on `/capture`. |
| SH-004 | Needs Upgrade badge is sourced from real `countNeedsUpgradeItems()` and is hidden when zero. |
| SH-005 | Pair Device utility row links to `/settings/device-pairing` and is active on that route. |
| SH-006 | Privacy Controls is an informational disabled roadmap row, not a navigable link. |
| SH-007 | Collapse state remains user-controlled and may preserve the existing localStorage behavior. |
| SH-008 | Collapsed icon-only controls have accessible names/titles where interactive. |
| SH-009 | Main content is not clipped by the left rail or bottom nav. |
| SH-010 | No shell copy touched by this feature uses `AI Brain`. |

### Route Active State Contract

| Route/state | Desktop active state | Mobile active state |
| --- | --- | --- |
| `/`, `/library` | Library | Library |
| `/items/[id]`, `/items/[id]?mode=focus` | Library | Library |
| `/items/[id]/ask` | Ask | Ask |
| `/topics/[slug]` | Library | Library |
| `/collections/[id]` | Library | Library |
| `/search` | Library | Library |
| `/needs-upgrade` | Needs Upgrade | Library with More badge if present |
| `/ask` | Ask | Ask |
| `/capture` and capture tab query states | Capture top action | Capture |
| `/settings`, `/settings/tags`, `/settings/collections` | Settings | More |
| `/settings/device-pairing` | Pair Device utility row | More |
| `/more` | N/A on desktop unless directly visited | More |

### Mobile Shell

| ID | Requirement |
| --- | --- |
| MS-001 | Bottom nav contains Library, Capture, Ask, and More. |
| MS-002 | Floating Capture appears on Library/More-style routes; standard Capture tab appears on Ask/Capture routes. |
| MS-003 | Bottom nav preserves safe-area padding and does not overlap content. |
| MS-004 | Mobile shell must not include `MobileFrame`, fake status bar, fake gesture pill, fake phone border, or prototype outer background. |
| MS-005 | More route remains truthful and uses AI Memory copy, real links, disabled/informational roadmap rows, and no fake user identity. |

## User Stories

| Priority | Story | Acceptance |
| --- | --- | --- |
| P0 | As Arun, I want the desktop shell to be predictable. | Left rail has identity, command search, top Capture action, route nav, utility rows, and collapse control; no duplicate desktop Capture nav row. |
| P0 | As Arun, I want active route state to reflect product context. | Route-active table above passes in browser QA. |
| P0 | As Arun, I want pairing and privacy areas to be truthful. | Pair Device goes to `/settings/device-pairing`; Privacy Controls is disabled/informational and cannot navigate. |
| P1 | As Arun, I want keyboard navigation to work. | Interactive shell controls are focusable, labeled, and visibly focused; disabled privacy row does not create a focus trap or URL change. |
| P1 | As Arun, I want mobile navigation to stay reliable. | 390x844 screenshots show bottom nav, safe-area spacing, active states, and no prototype phone frame. |

## Acceptance Criteria

| Gate | Acceptance |
| --- | --- |
| Static scans | No new prototype route aliases; no `AI Brain`; no fake `Alex`; no fake email; no `href="#privacy-coming-soon"`; no active `/pair` link. |
| Active states | Browser route-active table passes for each representative route listed below. |
| Desktop visual | Expanded/collapsed screenshots captured for Library, Capture, Settings, Pair Device, and an item-context route if a fixture exists. |
| Mobile visual | 390x844 screenshots captured for Library, Capture, Ask, More, and Settings-context route. |
| Keyboard/focus | Collapse, search, Capture, primary nav, Pair Device, and mobile nav are reachable and visibly focused; Privacy Controls does not navigate. |
| Contrast | Primary shell actions and selected nav states remain above 4.5:1 in light/dark. |
| Regression | Typecheck, lint, tests, and build pass with only documented existing warnings. |

## Route-Active QA Matrix

| Representative URL | Expected active state | Fixture requirement |
| --- | --- | --- |
| `/library` | Desktop Library; mobile Library | None |
| `/capture` | Desktop Capture top action; mobile Capture | None |
| `/ask` | Desktop Ask; mobile Ask | None |
| `/settings` | Desktop Settings; mobile More | None |
| `/settings/device-pairing` | Desktop Pair Device; mobile More | Authenticated session |
| `/more` | Mobile More | Mobile viewport |
| `/search` | Desktop/mobile Library | None |
| `/needs-upgrade` | Desktop Needs Upgrade; mobile Library with More badge if count exists | None |
| `/items/<fixture-id>` | Desktop/mobile Library | Use synthetic fixture item if available; otherwise record blocked for this slice. |
| `/items/<fixture-id>/ask` | Desktop/mobile Ask | Use synthetic fixture item if available; otherwise record blocked for this slice. |
| `/topics/<fixture-slug>` | Desktop/mobile Library | Use synthetic fixture topic if available; otherwise record blocked for this slice. |
| `/collections/<fixture-id>` | Desktop/mobile Library | Use synthetic fixture collection if available; otherwise record blocked for this slice. |

## QA Evidence Required

After implementation, create:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_SHELL_NAVIGATION_QA_<timestamp>.md`

Required contents:

- PRD and implementation plan paths.
- Changed files.
- Static scan results.
- Route-active QA table with pass/fail/blocked status.
- Browser screenshots and viewport list.
- Keyboard/focus notes.
- Console warning/error check.
- Contrast spot checks for shell controls.
- Remaining risks and release/deploy status.

## Risks And Mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Duplicate Capture affordance survives desktop shell. | High | Implementation plan must remove Capture from desktop primary nav and style top action active on `/capture`. |
| Pair Device remains swallowed by Settings active state. | High | Exact `/settings/device-pairing` branch in active-state helper. |
| Context routes are untested due missing fixtures. | Medium | Use synthetic disposable DB fixtures where possible; otherwise record blocked rather than claiming pass. |
| Disabled Privacy Controls remains a hash link. | Medium | Convert to non-link informational row and scan for `#privacy-coming-soon`. |
| Mobile nav overlaps content. | High | 390x844 screenshot and safe-area padding check. |
| Shell edits bleed into page redesign. | High | Implementation plan must limit source edits to shell/More support and tests. |

## Definition Of Done

- V2 PRD exists after adversarial review.
- Implementation plan V1 is created and adversarially reviewed.
- Implementation plan V2 resolves review findings.
- Code changes implement this PRD only.
- Static checks pass.
- Browser route-active, visual, keyboard, and console evidence is captured.
- Project tracker is updated.
- Feature remains unreleased until integrated QA, Android WebView pickup if applicable, backup/rollback, deploy, and live smoke gates complete.
