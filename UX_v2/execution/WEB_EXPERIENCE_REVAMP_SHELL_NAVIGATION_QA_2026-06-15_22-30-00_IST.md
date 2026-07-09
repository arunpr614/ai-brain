# Web Experience Revamp Shell Navigation QA

**Created:** 2026-06-15 22:30:00 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Feature:** Web shell and navigation
**Status:** Implemented locally. Static checks, helper tests, build, and representative browser shell QA passed. Not deployed.

## Source Documents

| Document | Path |
| --- | --- |
| PRD v1 | `UX_v2/features/FEATURE_WEB_SHELL_NAVIGATION_PRD_V1_2026-06-15_22-16-00_IST.md` |
| PRD adversarial review | `UX_v2/features/FEATURE_WEB_SHELL_NAVIGATION_PRD_ADVERSARIAL_REVIEW_2026-06-15_22-18-00_IST.md` |
| PRD v2 | `UX_v2/features/FEATURE_WEB_SHELL_NAVIGATION_PRD_V2_2026-06-15_22-21-00_IST.md` |
| Implementation plan v1 | `UX_v2/features/FEATURE_WEB_SHELL_NAVIGATION_IMPLEMENTATION_PLAN_V1_2026-06-15_22-24-00_IST.md` |
| Implementation plan adversarial review | `UX_v2/features/FEATURE_WEB_SHELL_NAVIGATION_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-15_22-27-00_IST.md` |
| Implementation plan v2 | `UX_v2/features/FEATURE_WEB_SHELL_NAVIGATION_IMPLEMENTATION_PLAN_V2_2026-06-15_22-30-00_IST.md` |

## Scope Implemented

- Added pure route helpers for desktop/mobile shell active states.
- Added helper tests covering the V2 PRD route matrix.
- Moved desktop Capture out of the primary nav list and into a top action above route nav.
- Made `/capture` mark the top Capture action active.
- Made `/settings/device-pairing` activate Pair Device instead of Settings on desktop.
- Made `/items/[id]/ask` activate Ask.
- Made topics, collections, search, and item detail activate Library.
- Converted Privacy Controls from a disabled hash link into a non-link informational row.
- Preserved mobile bottom nav and route-aware floating/standard Capture behavior.
- Replaced the root theme bootstrap raw script with `next/script` to stop a client-navigation console error surfaced during shell QA.

## Files Changed

| File | Change |
| --- | --- |
| `src/components/sidebar-routing.ts` | New pure shell route-target helpers. |
| `src/components/sidebar-routing.test.ts` | New route helper tests. |
| `src/components/sidebar.tsx` | Shell rendering updates for Capture, route active state, Pair Device, Privacy Controls, and mobile nav helper usage. |
| `src/app/layout.tsx` | Support fix: root theme bootstrap now uses `next/script` after browser QA exposed a client-navigation console error. |

## Validation Results

| Gate | Result | Notes |
| --- | --- | --- |
| Focused helper test | Pass | 46 route/helper cases. |
| `git diff --check` | Pass | No whitespace errors. |
| `npm run typecheck` | Pass | `tsc --noEmit` clean. |
| `npm run lint` | Pass with warning | Existing warning in `src/lib/queue/enrichment-batch-cron.ts`. |
| `npm test` | Pass | 504 tests, 68 suites, 0 failures. |
| `npm run build` | Pass with warning | Existing `unpdf` `import.meta` warning remains. |

## Static Scan Classification

| Scan | Result | Classification |
| --- | --- | --- |
| `AI Brain`, fake profile/email, `/pair`, privacy hash in `src` | One `AI Brain` match in `src/db/migrations/001_initial_schema.sql` | Pre-existing migration comment, not shell/UI copy introduced by this feature. |
| Prototype route aliases / `MobileFrame` / fake phone chrome in `src` | 0 matches | Pass. |
| Documentation scan in `UX_v2/features` | Expected matches in PRD/review/plan text | Governance docs intentionally name forbidden strings/routes. |
| `href="#privacy-coming-soon"` in `src` | 0 matches | Pass. |

## Browser Evidence

Screenshot folder:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/shell-navigation/`

Machine-readable browser reports:

- `shell-navigation-browser-report.json`
- `shell-navigation-console-recheck.json`
- `shell-navigation-focusable-report.json`
- `shell-navigation-keyboard-report.json`

Captured screenshots:

- `shell-library-desktop-light-expanded.png`
- `shell-library-desktop-light-collapsed.png`
- `shell-library-desktop-dark-expanded.png`
- `shell-capture-desktop-light.png`
- `shell-ask-desktop-light.png`
- `shell-settings-desktop-light.png`
- `shell-pair-device-desktop-light.png`
- `shell-pair-device-desktop-dark.png`
- `shell-library-mobile-light.png`
- `shell-library-mobile-dark.png`
- `shell-capture-mobile-light.png`
- `shell-ask-mobile-light.png`
- `shell-settings-mobile-light.png`
- `shell-pair-device-mobile-light.png`
- `shell-pair-device-mobile-dark.png`
- `shell-more-mobile-light.png`

## Route Active State Results

| Route | Result | Evidence |
| --- | --- | --- |
| `/library` | Pass | Desktop Library active; mobile Library active; expanded/collapsed screenshots captured. |
| `/capture` | Pass | Desktop top Capture action active; mobile Capture active. |
| `/ask` | Pass | Desktop Ask active; mobile Ask active. |
| `/settings` | Pass | Desktop Settings active; mobile More active. |
| `/settings/device-pairing` | Pass | Desktop Pair Device active; mobile More active. |
| `/more` | Pass | Mobile More active. |
| `/items/fixture-shell-route` | Pass for shell active state | Route content may be not-found; shell validated Library active. |
| `/items/fixture-shell-route/ask` | Pass for shell active state | Route content may be not-found; shell validated Ask active. |
| `/topics/fixture-shell-topic` | Pass for shell active state | Route content may be not-found; shell validated Library active. |
| `/collections/fixture-shell-collection` | Pass for shell active state | Route content may be not-found; shell validated Library active. |
| `/search` | Pass | Shell validated Library active. |
| `/needs-upgrade` | Pass | Desktop Needs Upgrade active. |

## Privacy Controls Check

| Check | Result |
| --- | --- |
| No source `href="#privacy-coming-soon"` | Pass |
| No visible anchor whose text includes `Privacy Controls` | Pass |
| Visible informational row has `aria-disabled="true"` | Pass |
| Row has no `href` and no explicit `tabindex` | Pass |
| Focusable structure report includes no Privacy Controls action | Pass |

## Keyboard And Focus

Structural focusability check passed: visible shell focusables start with Collapse sidebar, Search, Capture, Library, Needs Upgrade, Ask, Settings, and Pair Device. Privacy Controls is absent from the focusable-action list.

Synthetic Tab traversal through the in-app browser runtime did not move focus and is recorded as tool-limited in `shell-navigation-keyboard-report.json`. Because the DOM focusability structure is correct and all interactive shell controls are native `button`/`a` elements with labels, this is accepted for this local shell slice, but a manual keyboard pass should still be included in the broader integrated release gate.

## Console Check

Initial browser QA surfaced a client-navigation console error from the root layout theme bootstrap script. The supporting fix in `src/app/layout.tsx` replaced the raw script with `next/script`.

Clean recheck evidence:

- Routes checked after fix: `/library`, `/settings/device-pairing`, `/capture`.
- Fresh warning/error count after the recheck start timestamp: 0.
- Older captured log entries: 4, all from before the fix and retained in browser session history.

## Contrast Spot Checks

| Surface | Result |
| --- | ---: |
| Top Capture action, light | 15.97:1 |
| Active Library nav, light | 14.47:1 |
| Pair Device link, light inactive sample | 12.51:1 |

The broader contrast token test and contrast browser evidence remain documented in `WEB_EXPERIENCE_REVAMP_CONTRAST_QA_2026-06-15_22-20-00_IST.md`.

## Release Assessment

The shell/navigation feature is locally implemented and QA-passed for this slice. It is not deployed. Production release still requires integrated route QA, Android WebView pickup if Android parity is claimed, backup/rollback evidence, release packet review, production deploy, and live smoke.
