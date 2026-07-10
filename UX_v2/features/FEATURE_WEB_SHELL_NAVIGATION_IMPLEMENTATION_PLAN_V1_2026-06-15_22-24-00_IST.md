# Feature Implementation Plan V1 - Web Shell And Navigation

**Created:** 2026-06-15 22:24:00 IST
**Feature PRD:** `FEATURE_WEB_SHELL_NAVIGATION_PRD_V2_2026-06-15_22-21-00_IST.md`
**Status:** Draft for adversarial review

## Scope

Implement only the shell/navigation contract defined in the V2 PRD:

- Desktop Capture top action, not duplicated in primary nav.
- Deterministic desktop/mobile route-active states.
- Pair Device utility active state.
- Privacy Controls as non-navigating informational disabled row.
- Mobile bottom nav preserved.
- Small pure helper tests.
- Browser QA evidence after implementation.

No route page content redesign is allowed.

## Files Expected To Change

| File | Planned change |
| --- | --- |
| `src/components/sidebar-routing.ts` | New pure helper module for route-active targets and mobile Capture mode. |
| `src/components/sidebar-routing.test.ts` | New tests for desktop active target, mobile active target, and standard mobile Capture behavior. |
| `src/components/sidebar.tsx` | Use helper module; remove desktop Capture from primary nav; add top Capture action; make Pair Device active exact; render Privacy Controls as disabled informational row. |
| `UX_v2/execution/WEB_EXPERIENCE_REVAMP_SHELL_NAVIGATION_QA_<timestamp>.md` | New QA report after implementation. |
| `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>.md` or existing update file | Mark shell feature progress. |

If additional files are needed, the implementation must explain why in the QA report.

## Phase 1 - Extract Route Helpers

Create `src/components/sidebar-routing.ts` with:

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
```

Functions:

- `getDesktopShellTarget(pathname: string): DesktopShellTarget`
- `getMobileShellTarget(pathname: string): MobileShellTarget`
- `usesStandardMobileCapture(pathname: string): boolean`

Rules:

- `/items/.../ask` returns desktop/mobile Ask.
- `/items/...` returns Library.
- `/topics/...`, `/collections/...`, `/search`, `/`, `/library` return Library.
- `/settings/device-pairing` returns desktop Pair Device and mobile More.
- `/settings`, `/settings/tags`, `/settings/collections` return desktop Settings and mobile More.
- `/capture` and capture subpaths return Capture.
- `/needs-upgrade` returns desktop Needs Upgrade and mobile Library.

## Phase 2 - Add Route Helper Tests

Add `src/components/sidebar-routing.test.ts` with table-driven tests:

- Desktop route target matrix from the PRD.
- Mobile route target matrix from the PRD.
- Standard mobile Capture mode: true for `/ask`, `/items/1/ask`, `/capture`, `/capture?tab=note` if represented as pathname `/capture`; false for `/library`, `/more`, `/settings`.

The tests should use Node's built-in test runner and `node:assert/strict`, matching existing project tests.

## Phase 3 - Update Desktop Sidebar

In `src/components/sidebar.tsx`:

1. Import helper functions and target types from `sidebar-routing.ts`.
2. Remove Capture from the desktop primary nav items.
3. Add a top Capture `Link` above the primary route nav, after command search.
4. Give top Capture:
   - `href="/capture"`
   - `aria-label`/`title` that work in expanded and collapsed modes.
   - primary action styling using `--action-primary-*`.
   - `aria-current="page"` and a visible active affordance when `getDesktopShellTarget(pathname) === "capture"`.
5. Primary nav active states compare each item to `getDesktopShellTarget(pathname)`.
6. Pair Device active state compares to `pair-device`.
7. Settings active state does not activate on `/settings/device-pairing`.
8. Privacy Controls row becomes a `div` or equivalent non-link informational row:
   - no `href`
   - no `tabIndex=0`
   - `aria-disabled="true"` or visible disabled semantics
   - visible `soon` text when expanded
   - icon-only disabled visual when collapsed

## Phase 4 - Preserve Mobile Bottom Nav

Update mobile nav active checks to use `getMobileShellTarget(pathname)`.

Keep:

- Library, Capture, Ask, More route paths.
- Floating Capture on Library/More-style routes.
- Standard Capture nav item on Ask/Capture routes.
- Needs Upgrade badge on More if current production behavior uses that.

Do not add Magic Patterns phone frame/status/gesture chrome.

## Phase 5 - Static Validation

Run:

```bash
node --import tsx --test src/components/sidebar-routing.test.ts
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
```

Static scans:

```bash
rg -n "AI Brain|Alex|alex@example|href=\"/pair\"|href=\"#privacy-coming-soon\"|to=\"/pair\"|/item/:id|/topic/:topicSlug|/collection/:collectionSlug" src UX_v2/features
```

The scan may report historical PRD text under `UX_v2/features`; the QA report must classify source-code matches separately from documentation matches.

## Phase 6 - Browser QA

Use the local disposable QA database if possible. Capture screenshots under:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/shell-navigation/`

Minimum browser checks:

| Route | Desktop | Mobile 390x844 | Expected |
| --- | --- | --- | --- |
| `/library` | Screenshot expanded and collapsed | Screenshot | Library active |
| `/capture` | Screenshot | Screenshot | Capture active |
| `/ask` | Screenshot | Screenshot | Ask active |
| `/settings` | Screenshot | Screenshot | Settings desktop, More mobile |
| `/settings/device-pairing` | Screenshot | Screenshot | Pair Device desktop, More mobile |
| `/more` | Optional desktop, required mobile | Screenshot | More mobile |
| `/search` | DOM/visual check | DOM/visual check | Library active |
| `/needs-upgrade` | DOM/visual check | DOM/visual check | Needs Upgrade desktop, Library mobile |

Fixture-dependent route checks:

- `/items/<fixture-id>`
- `/items/<fixture-id>/ask`
- `/topics/<fixture-slug>`
- `/collections/<fixture-id>`

If no synthetic fixtures exist for this slice, record these as blocked in the QA report and do not claim full route-active completion for context routes.

Keyboard checks:

- Tab through shell controls on desktop Library.
- Activate Collapse and confirm state toggles.
- Activate Privacy Controls row attempt only if it is focusable; expected behavior is no navigation and no hash.
- Mobile nav link labels present via DOM snapshot.

Console check:

- Read browser warning/error logs after QA.

## Definition Of Done

- V2 implementation plan exists after adversarial review.
- Helper tests pass.
- Sidebar implements V2 route contract.
- Static scans have no unclassified source-code matches.
- Browser QA report exists.
- Project tracker records shell feature state.
- No production deployment is claimed.
