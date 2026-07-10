# Feature PRD V1 - Web Shell And Navigation

**Created:** 2026-06-15 22:16:00 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Feature owner:** Main Codex
**Status:** Draft for adversarial review
**Parent PRD:** `UX_v2/execution/WEB_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_20-27-04_IST.md`
**Parent implementation plan:** `UX_v2/execution/WEB_EXPERIENCE_REVAMP_IMPLEMENTATION_PLAN_REVISED_2026-06-15_21-07-34_IST.md`

## Summary

Revamp the production web shell and navigation so AI Memory feels stable, route-safe, and aligned with the Magic Patterns desktop/mobile shell direction before deeper page-specific work begins.

This feature is limited to the persistent shell: desktop left navigation, desktop collapse behavior, route-active states, Capture entry placement, lower utility/trust rows, mobile bottom navigation, `/more` route truthfulness, and layout/overflow safety. It must not rewrite Library, Ask, Capture, Settings, Item Detail, Pairing, Topic, or Collection content beyond the minimal shell-aware adjustments required for navigation and responsive frame behavior.

## Source Evidence

| Source | Relevant evidence |
| --- | --- |
| Magic Patterns web `components/DesktopLayout.tsx` | Left rail, AI Memory identity, top Capture action, Library/Needs Upgrade/Ask/Settings nav, weak-source badge, lower Pair Device link, privacy controls coming soon, collapse button, shell-owned overflow. |
| Magic Patterns web `App.tsx` | Prototype route map includes `/library`, `/needs-upgrade`, `/item/:id`, `/topics/:topicSlug`, `/collections/:collectionSlug`, `/ask`, `/capture`, `/settings`, `/login`, `/pair`. |
| Magic Patterns mobile `components/MobileBottomNav.tsx` | Mobile bottom nav includes Library, Capture, Ask, More, with special floating Capture button outside Ask/Capture. |
| Magic Patterns mobile `components/MobileFrame.tsx` | Phone frame/status/nav chrome is prototype-only and must not ship into production responsive web. |
| Current production `src/components/sidebar.tsx` | Existing desktop sidebar, command-palette search, collapse persistence, mobile bottom nav, real Pair Device route, disabled Privacy Controls row. |
| Current production `src/app/layout.tsx` | Shell wraps all routes, provides mobile bottom padding, counts Needs Upgrade items. |
| Current production `src/app/more/page.tsx` | Existing mobile More surface uses truthful AI Memory copy and avoids prototype-only fake user/device copy. |
| Contrast feature QA | `WEB_EXPERIENCE_REVAMP_CONTRAST_QA_2026-06-15_22-20-00_IST.md` passed static/code and representative browser visual QA for shell-adjacent controls. |

## Problem

The broader web revamp cannot safely proceed until the persistent frame is reliable. The shell is the anchor for every protected route and every screenshot matrix. If its active states, route map, responsive nav, or overflow behavior are wrong, all downstream page work will inherit inconsistent evidence and user confusion.

Specific current risks:

- Desktop route-active logic marks item detail as Library, but topic and collection routes also need Library-context active state.
- Desktop Capture is currently a regular primary nav item, while the approved design treats Capture as a top-level action above route nav.
- `/settings/device-pairing` must remain a real Pair Device link, not the prototype `/pair` route.
- Privacy controls must remain disabled/truthful, not presented as active.
- Mobile responsive behavior must retain real production routes and avoid copying the Magic Patterns phone frame.
- Shell screenshots and keyboard checks are required before page-specific work claims visual parity.

## Goals

1. Make desktop navigation match the approved shell hierarchy after production-truth adaptation.
2. Preserve real production routes and avoid adding prototype route aliases.
3. Make active route state predictable across Library, item detail, topic, collection, search, Needs Upgrade, Ask, Capture, Settings, Pair Device, and More.
4. Preserve and polish the mobile bottom nav route model without copying prototype phone chrome.
5. Keep lower utility/trust rows truthful: Pair Device active route, Privacy Controls disabled/roadmap.
6. Ensure shell overflow, focus, keyboard, and contrast behavior are safe across desktop and mobile breakpoints.
7. Produce screenshot and browser evidence for expanded/collapsed desktop shell and mobile bottom nav.

## Non-Goals

- No page-content redesign beyond shell-dependent spacing or active-state adjustments.
- No new routes such as `/pair`, `/login`, `/item/:id`, `/topic/:slug`, or `/collection/:slug`.
- No QR pairing, connected-device registry, offline sync, telemetry settings, E2EE, or destructive data controls.
- No fake user profile, fake email, fake synced devices, fake provider metrics, or prototype sample data.
- No Android APK publication in this feature.
- No production deployment in this feature.

## User Stories

| Priority | Story | Acceptance |
| --- | --- | --- |
| P0 | As Arun, I want a stable desktop shell so I can move between core areas without relearning navigation. | Desktop left rail renders AI Memory identity, top Capture action, primary nav, Needs Upgrade badge, Pair Device, disabled Privacy Controls, and collapse control. |
| P0 | As Arun, I want active states to reflect where I am. | Library is active for `/library`, `/`, `/items/[id]`, `/topics/[slug]`, `/collections/[id]`, and `/search`; Ask active for `/ask` and item Ask; Settings active for `/settings/*`; Capture active for `/capture`; Pair Device active for `/settings/device-pairing`. |
| P0 | As Arun, I want Capture to be fast to reach. | Desktop exposes Capture as a prominent top action; mobile exposes Capture in the bottom nav/floating action according to current route context. |
| P0 | As Arun, I want the app to be truthful about unfinished privacy/device capabilities. | Privacy Controls remains disabled/roadmap. Pair Device routes to real `/settings/device-pairing`. No fake connected-device list or fake profile copy appears. |
| P1 | As Arun, I want the shell to work with keyboard and focus. | Collapse, search, nav links, top Capture, Pair Device, mobile nav links, and More links have visible focus and correct labels. |
| P1 | As Arun, I want mobile navigation to feel native without fake chrome. | Mobile bottom nav renders cleanly at 390x844, preserves safe-area padding, and does not include Magic Patterns phone frame/status/navigation bars. |

## Requirements

### Desktop Shell

| ID | Requirement | Notes |
| --- | --- | --- |
| SH-001 | Left rail remains fixed/sticky with full-height navigation. | Use existing production shell structure unless a small layout adjustment is required. |
| SH-002 | AI Memory identity remains visible when expanded and icon-only when collapsed. | Preserve real logo asset if present; do not replace with prototype `AI` block unless explicitly needed. |
| SH-003 | Capture becomes or remains a prominent action above primary route navigation. | If a regular Capture nav row is retained, the implementation plan must justify why it does not conflict with MP hierarchy. |
| SH-004 | Primary desktop nav contains Library, Needs Upgrade, Ask, and Settings as route nav. | Capture may be separate top action. Pair Device stays in lower utilities. |
| SH-005 | Needs Upgrade badge uses real `countNeedsUpgradeItems()`. | Badge hidden when zero. |
| SH-006 | Pair Device points to `/settings/device-pairing`. | No `/pair` route alias. |
| SH-007 | Privacy Controls is disabled/roadmap with noninteractive or prevented navigation behavior. | No active privacy settings claim. |
| SH-008 | Collapse state remains user-controlled and accessible. | Existing localStorage persistence may be preserved. |
| SH-009 | Collapsed shell has tooltips/titles/labels for icon-only controls. | Screen readers still receive labels. |
| SH-010 | Main content must not be clipped by shell or mobile bottom nav. | Preserve mobile bottom padding and desktop overflow behavior. |

### Route Active State

| Route/state | Required active nav |
| --- | --- |
| `/`, `/library` | Library |
| `/items/[id]`, `/items/[id]/ask`, `/items/[id]?mode=focus` | Library for desktop primary nav; Ask may be indicated only within page-level scoped Ask UI in later slice |
| `/topics/[slug]`, `/collections/[id]`, `/search` | Library |
| `/needs-upgrade` and repair subroutes if present | Needs Upgrade |
| `/ask` | Ask |
| `/capture` and capture tab states | Capture top action/mobile Capture |
| `/settings`, `/settings/tags`, `/settings/collections` | Settings |
| `/settings/device-pairing` | Pair Device utility active; Settings context may also be visually related if implementation supports only one active state |
| `/more` | More in mobile nav |

### Mobile Shell

| ID | Requirement | Notes |
| --- | --- | --- |
| MS-001 | Bottom nav contains Library, Capture, Ask, and More. | Preserve production route paths. |
| MS-002 | Floating Capture behavior is allowed on Library/More-style routes and standard Capture tab is allowed on Ask/Capture routes. | Mirrors current production and Magic Patterns mobile intent. |
| MS-003 | Mobile nav active state must cover Library-context routes and Settings-context routes. | Preserve `/more` as mobile responsive route. |
| MS-004 | Mobile shell must not copy `MobileFrame`, status bar, gesture pill, fake phone border, or prototype outer background. | Production responsive web and Android WebView supply real chrome. |
| MS-005 | Bottom nav must not overlap main content. | Maintain safe-area-aware bottom padding. |

### Copy And Truthfulness

| ID | Requirement |
| --- | --- |
| CT-001 | Use `AI Memory`, never `AI Brain`, in shell and More route copy touched by this slice. |
| CT-002 | Do not ship prototype fake profile names, emails, or app versions. |
| CT-003 | Disabled privacy/offline/device rows must be visibly disabled or clearly informational roadmap/trust copy. |
| CT-004 | No shell copy may imply offline sync, connected-device registry, E2EE, telemetry controls, or destructive delete controls are active. |

## Acceptance Criteria

| Gate | Acceptance |
| --- | --- |
| Static scans | No new prototype routes, no new `AI Brain`, no fake `Alex`, no fake email, no active `/pair` link. |
| Route active states | Browser QA proves required active states on representative routes. |
| Desktop visual | Expanded and collapsed desktop shell screenshots captured for Library, Capture, Settings, and Pair Device. |
| Mobile visual | 390x844 screenshots captured for Library, Capture, Ask, More, and Settings-context route. |
| Keyboard | Tab sequence reaches collapse/search/nav/Capture/Pair Device/privacy disabled row without traps; Enter activates real links; disabled privacy does not navigate. |
| Contrast | Primary shell actions and selected nav states remain above 4.5:1 text contrast in light/dark. |
| Regression | Typecheck, lint, tests, build pass with only known existing warnings. |

## QA Evidence Required

Create a QA report after execution:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_SHELL_NAVIGATION_QA_<timestamp>.md`

It must include:

- PRD and implementation plan paths.
- Changed files.
- Static scan results.
- Browser screenshots and viewports.
- Route-active state table.
- Keyboard/focus notes.
- Console warning/error check.
- Remaining risks and release/deploy status.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Shell scope expands into page redesign. | High | Implementation plan must limit file edits to shell and More route only unless a direct compile issue requires support. |
| Pair Device active state conflicts with Settings active state. | Medium | V2 PRD/plan should choose the exact visual contract. |
| Removing regular Capture nav row could surprise users used to current nav. | Medium | Preserve prominent Capture action and verify active state; only remove duplicate if top action is clearly visible. |
| Mobile bottom nav overlaps content at safe-area sizes. | High | Browser mobile viewport screenshot and layout check. |
| Prototype fake copy leaks into production. | High | Forbidden-copy scans. |

## Open Questions For Review

1. Should desktop Capture be removed from the primary nav and represented only as a top action, or should it remain in both places for continuity?
2. Should `/settings/device-pairing` show only Pair Device active, only Settings active, or both visual contexts?
3. Should item detail remain Library active even when `/items/[id]/ask` is open, or should Ask become active for the scoped Ask subroute?
