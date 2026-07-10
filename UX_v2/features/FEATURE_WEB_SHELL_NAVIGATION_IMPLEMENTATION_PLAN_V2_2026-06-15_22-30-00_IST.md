# Feature Implementation Plan V2 - Web Shell And Navigation

**Created:** 2026-06-15 22:30:00 IST
**Supersedes:** `FEATURE_WEB_SHELL_NAVIGATION_IMPLEMENTATION_PLAN_V1_2026-06-15_22-24-00_IST.md`
**Feature PRD:** `FEATURE_WEB_SHELL_NAVIGATION_PRD_V2_2026-06-15_22-21-00_IST.md`
**Review addressed:** `FEATURE_WEB_SHELL_NAVIGATION_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-15_22-27-00_IST.md`
**Status:** Approved for execution

## Scope

Implement only the shell/navigation contract:

- Desktop Capture as a top action, not a regular primary nav item.
- Deterministic route-active helpers for desktop and mobile.
- Pair Device utility active state on `/settings/device-pairing`.
- Privacy Controls as disabled informational content, not a link.
- Mobile bottom nav preserved without Magic Patterns phone chrome.
- Helper tests, static scans, browser visual/route-active/keyboard evidence.

No page-content redesign, Android APK publication, production deploy, or feature-claim expansion is allowed.

## Files Expected To Change

| File | Planned change |
| --- | --- |
| `src/components/sidebar-routing.ts` | New pure route helper module. |
| `src/components/sidebar-routing.test.ts` | New route helper tests. |
| `src/components/sidebar.tsx` | Render desktop Capture top action, remove desktop Capture primary nav row, use route helpers, render disabled privacy row as non-link. |
| `UX_v2/execution/WEB_EXPERIENCE_REVAMP_SHELL_NAVIGATION_QA_2026-06-15_22-30-00_IST.md` | QA report after execution. |
| `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-15_22-30-00_IST.md` | Tracker update after execution. |

If any additional source file changes are needed, document them in the QA report.

## Phase 1 - Pure Route Helpers

Create `src/components/sidebar-routing.ts`.

Required exports:

```ts
export type DesktopShellTarget =
  | "library"
  | "needs-upgrade"
  | "ask"
  | "capture"
  | "settings"
  | "pair-device"
  | null;

export type MobileShellTarget = "library" | "capture" | "ask" | "more";

export function getDesktopShellTarget(pathname: string): DesktopShellTarget;
export function getMobileShellTarget(pathname: string): MobileShellTarget;
export function usesStandardMobileCapture(pathname: string): boolean;
```

Normalize query/hash out of incoming strings even though `usePathname()` normally supplies only pathnames. This keeps tests honest for copied URL examples.

Route rules:

| Path pattern | Desktop target | Mobile target |
| --- | --- | --- |
| `/`, `/library` | `library` | `library` |
| `/items/*/ask` | `ask` | `ask` |
| `/items/*` | `library` | `library` |
| `/topics/*`, `/collections/*`, `/search` | `library` | `library` |
| `/needs-upgrade*` | `needs-upgrade` | `library` |
| `/ask*` | `ask` | `ask` |
| `/capture*` | `capture` | `capture` |
| `/settings/device-pairing*` | `pair-device` | `more` |
| `/settings*` | `settings` | `more` |
| `/more*` | `null` | `more` |
| Unknown | `null` | `library` |

Standard mobile Capture mode:

- True for desktop-like Capture/Ask contexts: `/ask*`, `/items/*/ask`, `/capture*`.
- False for Library/More/Settings contexts.

## Phase 2 - Helper Tests

Add `src/components/sidebar-routing.test.ts`.

Use Node's built-in test runner and `node:assert/strict`.

Test groups:

1. Desktop target matrix.
2. Mobile target matrix.
3. Query/hash normalization.
4. Standard mobile Capture mode.

Include representative examples:

- `/items/fixture-1`
- `/items/fixture-1?mode=focus`
- `/items/fixture-1/ask`
- `/topics/ai`
- `/collections/manual-1`
- `/settings/device-pairing`
- `/settings/tags`
- `/capture?tab=note`

## Phase 3 - Sidebar Rendering

Update `src/components/sidebar.tsx`:

1. Import helpers from `sidebar-routing.ts`.
2. Remove Capture from desktop primary nav items.
3. Add a desktop top Capture `Link` between command search and primary nav.
4. Top Capture always uses primary action styling.
5. Top Capture active route behavior:
   - `aria-current="page"` when desktop target is `capture`.
   - Visible active affordance via ring/outline/border that does not reduce contrast.
6. Primary nav active states compare each row to `getDesktopShellTarget(pathname)`.
7. Pair Device utility row compares to `pair-device`.
8. Settings primary row does not activate for `/settings/device-pairing`.
9. Privacy Controls renders as non-link informational content:
   - no `href`
   - no `tabIndex`
   - `aria-disabled="true"`
   - visible disabled/roadmap styling
   - no URL hash behavior
10. Mobile nav uses `getMobileShellTarget(pathname)` and `usesStandardMobileCapture(pathname)`.

## Phase 4 - Static Validation

Run focused tests first:

```bash
node --import tsx --test src/components/sidebar-routing.test.ts
```

Then full checks:

```bash
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
```

Source-code release scans:

```bash
rg -n "AI Brain|Alex|alex@example|href=\"/pair\"|href=\"#privacy-coming-soon\"|to=\"/pair\"" src || true
rg -n "/item/:id|/topic/:topicSlug|/collection/:collectionSlug|MobileFrame|gesture pill|status bar" src || true
```

Documentation classification scan:

```bash
rg -n "AI Brain|Alex|alex@example|href=\"/pair\"|href=\"#privacy-coming-soon\"|/item/:id|/topic/:topicSlug|/collection/:collectionSlug" UX_v2/features || true
```

Only unclassified source-code matches block this feature. Documentation mentions in PRDs/reviews are expected if they are explaining forbidden prototype content.

## Phase 5 - Browser QA

Use local disposable QA DB/session. Continue using `/tmp/ai-memory-contrast-qa.sqlite` if the dev server is still running and safe; otherwise start a new disposable DB.

Save screenshots under:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/shell-navigation/`

### Visual Matrix

| Route | Desktop light | Desktop dark | Mobile light 390x844 | Mobile dark 390x844 | Expected active |
| --- | --- | --- | --- | --- | --- |
| `/library` | Required expanded + collapsed | Required expanded | Required | Required | Library |
| `/capture` | Required | Optional if Library dark covers shell | Required | Optional | Capture |
| `/ask` | Required | Optional | Required | Optional | Ask |
| `/settings` | Required | Optional | Required | Optional | Settings desktop, More mobile |
| `/settings/device-pairing` | Required | Required if feasible | Required | Required if feasible | Pair Device desktop, More mobile |
| `/more` | Optional desktop | Optional | Required | Optional | More mobile |

### Context Route Shell-State Validation

Validate context active states through one of these strategies:

1. If synthetic fixture data is readily available in the disposable DB, use real fixture routes.
2. If seeding would require broad non-shell work, navigate representative route URLs and validate that the shell active state is correct even if page content is not-found.

Required URLs:

- `/items/fixture-shell-route`
- `/items/fixture-shell-route/ask`
- `/topics/fixture-shell-topic`
- `/collections/fixture-shell-collection`
- `/search`
- `/needs-upgrade`

The QA report must separate `shell active state validated` from `page content validated`. Not-found content is acceptable only for this shell slice and only if the shell remains visible and active state is measurable.

### DOM And Keyboard Checks

Privacy Controls:

- Source scan has no `href="#privacy-coming-soon"`.
- DOM has no anchor whose text includes `Privacy Controls`.
- Informational row has `aria-disabled="true"` or equivalent disabled semantics.
- Keyboard tab order does not focus it as an action.
- URL does not gain a `#privacy-coming-soon` hash.

Shell controls:

- Collapse button toggles collapsed state and remains labeled.
- Top Capture is focusable and has `aria-current="page"` on `/capture`.
- Pair Device link is focusable and active on `/settings/device-pairing`.
- Mobile nav links have accessible labels.

Console:

- Read warning/error logs after QA.

Contrast spot checks:

- Top Capture action light/dark.
- Active desktop nav light/dark.
- Pair Device active light/dark.
- Mobile active nav light/dark.

## Phase 6 - QA Report And Tracker

Create:

- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_SHELL_NAVIGATION_QA_2026-06-15_22-30-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-15_22-30-00_IST.md`

QA report must include:

- PRD and implementation plan paths.
- Changed files.
- Static validation results.
- Source scan classification.
- Route-active matrix.
- Screenshot paths.
- DOM/keyboard checks.
- Console checks.
- Contrast spot checks.
- Release status: not deployed.

## No-Go Gates

- Capture remains duplicated in desktop primary nav.
- Pair Device route shows only Settings active on desktop.
- `/items/*/ask` does not show Ask active.
- Privacy Controls remains a hash link or focusable fake action.
- Any new prototype route alias is added.
- Any source-code `AI Brain`, fake profile/email, or fake active device/privacy/offline claim is introduced.
- Helper tests fail.
- Typecheck, lint, tests, or build fail, except documented existing warnings.

## Definition Of Done

- Helper module and tests added.
- Sidebar implements V2 PRD contract.
- Static and full validation pass.
- Browser QA evidence captured.
- QA report and tracker update created.
- Feature remains local/unreleased until integrated release gates complete.
