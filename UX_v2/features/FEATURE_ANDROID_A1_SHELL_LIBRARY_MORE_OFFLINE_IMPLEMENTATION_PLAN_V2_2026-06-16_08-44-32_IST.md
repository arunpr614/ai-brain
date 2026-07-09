# Feature Android A1 Shell Library More Offline Implementation Plan v2

Created: 2026-06-16 08:44:32 IST
Owner: Main Codex
Status: Approved execution plan for Android A1 local implementation.
Product source: `FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_PRD_V2_2026-06-16_08-40-24_IST.md`
Supersedes: `FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_IMPLEMENTATION_PLAN_V1_2026-06-16_08-42-00_IST.md`
Adversarial review: `FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_08-44-00_IST.md`

## Revision Summary

| Review issue | V2 resolution |
| --- | --- |
| Browser evidence was not reproducible | Makes browser evidence mandatory, defines evidence folder and JSON schema |
| Copy scan was vague | Adds mandatory copy-scan helper with target files, forbidden patterns, and allow-list |
| Provider fallback validation was manual | Requires provider status tests if More/status code is touched and forbids provider logic changes without tests |
| Over-50 selected state was not deterministic | Adds pure selected-action helper and unit test |
| Offline harness was underspecified | Defines jsdom protocol, fetch mocks, redirect interception, and branch assertions |
| `/setup-apk` deferral unprotected | Adds required route test documenting A1 no-change behavior |
| Build gate was conditional | Makes `npm run build` mandatory |
| Rollback wording was risky | Requires patch-only reversal of A1 hunks; no whole-file revert/reset |
| Evidence path missing | Defines deterministic A1 evidence folder |

## Objective

Implement Android A1 locally: mobile shell and bottom-nav cleanup, safe fixed-layer behavior, Library mobile filter/select cleanup, More truth cleanup, public offline fallback truth, browser evidence, project tracking, and running-log updates. Do not deploy and do not claim APK validation.

## Evidence Folder

Use this folder for screenshots, helper outputs, seed manifests, and browser report:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/android-a1-shell-library-more-offline/`

Required browser report:

`android-a1-shell-library-more-offline-browser-report.json`

Report schema:

```json
{
  "checkedAt": "ISO timestamp",
  "viewportResults": [
    {
      "state": "library-default",
      "viewport": "390x844",
      "url": "http://127.0.0.1:<port>/library",
      "screenshot": "absolute path",
      "horizontalOverflow": false,
      "consoleErrors": [],
      "forbiddenVisibleText": [],
      "boxes": {
        "bottomNav": {"top": 0, "bottom": 0, "left": 0, "right": 0},
        "raisedCapture": {"top": 0, "bottom": 0, "left": 0, "right": 0},
        "selectedBar": null,
        "filterSheet": null,
        "primaryContent": {"top": 0, "bottom": 0, "left": 0, "right": 0}
      },
      "issues": []
    }
  ],
  "issueCount": 0,
  "consoleCount": 0
}
```

## Planned Code Changes

| File | Change |
| --- | --- |
| `src/components/sidebar.tsx` | Remove Needs Upgrade badge from the bottom More tab. Keep bottom nav route policy and raised Capture behavior. Do not add fake Android chrome |
| `src/components/sidebar-routing.test.ts` | Add route coverage for `/capture/share-result`, representative query strings, More/settings routes, and `/setup-apk` A1 no-change behavior |
| `src/lib/library/selected-actions.ts` | New pure helper for selected-count action state and `MAX_ASK_SELECTED_ITEMS = 50` |
| `src/lib/library/selected-actions.test.ts` | Unit tests for zero, valid, and over-limit selected counts |
| `src/components/library-list.tsx` | Split `BulkBar` into mobile and desktop/tablet layouts. Mobile layout shows selected count, Ask selected, and clear only. Desktop/tablet keeps tag and collection controls |
| `src/components/mobile-library-filters.tsx` | Adjust bottom sheet positioning only if browser collision evidence shows overlap |
| `src/app/library/page.tsx` | Keep production-backed source/quality filters only. No offline filter |
| `src/app/more/page.tsx` | Verify top identity, version, provider status, disabled privacy row, offline access row, and no fake account data. Do not change provider logic unless provider tests pass |
| `src/lib/settings/trust-copy.ts` | Align offline/privacy copy with PRD v2 allow-list if needed |
| `public/offline.html` | Replace `offline capture queue` wording with approved no-offline-queue wording. Preserve inline script and self-contained behavior |
| `scripts/ux-v2-check-android-a1-offline-fallback.ts` | New mandatory jsdom QA harness |
| `scripts/ux-v2-check-android-a1-copy.ts` | New mandatory bounded visible-copy scan |

No `scripts/ux-v2-browser-android-a1-shell-library-more-offline.ts` is required unless execution needs an additional route manifest helper. Browser evidence itself will be collected with the in-app Browser automation, using the schema above, because the repo does not include Playwright and the existing project browser harness permits Browser/Chrome tooling.

## Execution Phases

### Phase 0 - Baseline And Source Confirmation

1. Confirm PRD v2 and plan v2 exist.
2. Re-read A0 truth rows for A0-COV-001 through A0-COV-006 and A0-COV-018 through A0-COV-022.
3. Record current dirty state without reverting unrelated work.

Exit gate: no coding starts unless this plan v2 is present.

### Phase 1 - Shell And Route Tests

1. Remove the `needsUpgradeCount` badge prop from the mobile More tab.
2. Preserve standard Capture tab on `/ask` and `/capture*`.
3. Preserve raised Capture on Library, Search, Item, Topic, Collection, Needs Upgrade, and More.
4. Add focused route tests:
   - `/capture/share-result` -> Capture;
   - `/capture/share-result?key=fixture` -> Capture;
   - `/more` -> More;
   - `/settings` and `/settings/device-pairing` -> More;
   - `/library?source=pdf`, `/search?q=fixture`, `/needs-upgrade`, `/items/fixture-1` -> Library;
   - `/setup-apk` remains the current A1-deferred behavior and is not changed by this slice.

Exit gate: `node --import tsx --test src/components/sidebar-routing.test.ts` passes.

### Phase 2 - Selected-Action Helper And Mobile Bulk Bar

1. Add `src/lib/library/selected-actions.ts`.
2. Implement:
   - `MAX_ASK_SELECTED_ITEMS = 50`;
   - `getAskSelectedActionState(count)` returning disabled state, title, and label/copy for count 0, count 1-50, and count > 50.
3. Add `src/lib/library/selected-actions.test.ts`.
4. Refactor `BulkBar`:
   - mobile `md:hidden` layout with count, Ask selected, over-limit disabled copy/title, and clear;
   - desktop/tablet `hidden md:flex` layout preserving tag and collection controls.
5. Ensure mobile selected layout is fixed above bottom nav and safe area.
6. Ensure Escape still clears selection.

Exit gate:

- selected-action helper tests pass;
- existing `src/app/actions.bulk.test.ts` passes;
- browser evidence later proves no mobile tag/add-to-collection controls are visible.

### Phase 3 - More, Copy, And Offline Fallback

1. Review `src/app/more/page.tsx` against PRD v2 status table.
2. Keep More identity as AI Memory/private workspace and version from `pkg.version`.
3. Keep provider status visible copy to existing safe labels: Available, Quota blocked, Not configured, Unreachable.
4. Do not alter provider status logic unless `src/lib/providers/status.test.ts` remains green.
5. Update `src/lib/settings/trust-copy.ts` only if needed to match exact allowed copy.
6. Update `public/offline.html` to use approved no-offline-queue wording and avoid `offline capture queue`.

Exit gate:

- provider status tests pass if More/provider code changes;
- bounded copy scan passes.

### Phase 4 - Mandatory Helper Scripts

#### Copy Scan Helper

Create `scripts/ux-v2-check-android-a1-copy.ts`.

Target files:

- `src/components/sidebar.tsx`
- `src/components/sidebar-routing.ts`
- `src/components/mobile-library-filters.tsx`
- `src/components/library-list.tsx`
- `src/app/library/page.tsx`
- `src/app/more/page.tsx`
- `src/lib/settings/trust-copy.ts`
- `public/offline.html`

Forbidden regexes, case-insensitive unless noted:

- `AI Brain`
- `[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}`
- `available offline`
- `read offline`
- `offline item`
- `offline sync`
- `offline capture queue`
- `QR scan`
- `biometric`
- `fingerprint unlock`
- `package migration|package rename`
- `active telemetry|telemetry toggle`
- `active crash|crash-report toggle`
- `end-to-end encrypted`
- `delete everything|delete all data`

Allowed exact strings:

- `End-to-end encryption is not active yet.`
- `Privacy controls are coming soon.`
- `Ask, capture, export, and sync require the AI Memory server.`
- `There is no offline queue in UX v2.`
- `Server required.`
- `Not active yet.`
- `A verified destructive delete flow is planned.` only if the corresponding button remains disabled and not in A1 production-visible More list. Prefer hiding it from A1.

Output: JSON with `checkedFiles`, `matches`, `allowedMatches`, and `issueCount`. Nonzero `issueCount` exits with code 1.

#### Offline Fallback Harness

Create `scripts/ux-v2-check-android-a1-offline-fallback.ts`.

Protocol:

1. Load `public/offline.html` via `jsdom` with `runScripts: "dangerously"`.
2. Inject `fetch` before script execution through `beforeParse`.
3. Stub `performance.now`, `setTimeout` waits, and `AbortController` enough to make retry branches deterministic.
4. Intercept `window.location.href` or location assignment attempts enough to assert target path/origin without real navigation.
5. For each origin `https://brain.arunp.in`, `https://localhost`, and `http://localhost`, assert Library and Pair Device hrefs after script initialization.
6. For response cases 200, 401, 403, timeout/AbortError, and network TypeError, click Retry and assert status text class/copy.
7. Assert forbidden copy is absent from offline page text.

Output: JSON with `originResults`, `branchResults`, and `issueCount`. Nonzero `issueCount` exits with code 1.

### Phase 5 - Static Validation

Run all of these after code changes:

- `git diff --check`
- `node --import tsx --test src/components/sidebar-routing.test.ts src/lib/library/selected-actions.test.ts src/app/actions.bulk.test.ts src/lib/providers/status.test.ts`
- `node --import tsx scripts/ux-v2-check-android-a1-copy.ts`
- `node --import tsx scripts/ux-v2-check-android-a1-offline-fallback.ts`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Known acceptable historical caveat: lint may show the existing unrelated `src/lib/queue/enrichment-batch-cron.ts` warning. Any new A1 warning is a failure.

### Phase 6 - Browser Evidence

Start local dev server with a temporary SQLite database and seeded deterministic data.

Use the in-app Browser automation to capture screenshots and the JSON report in the evidence folder.

Required 390x844 evidence:

- `library-default`
- `library-filter-sheet-open`
- `library-selected`
- `more`
- `search-hit`
- `needs-upgrade-smoke`
- `item-detail-smoke`
- `topic-smoke`
- `collection-smoke`
- `offline-fallback`

Required 430x932 evidence:

- `library-default`
- `library-selected`
- `more`
- `offline-fallback`

For each state:

- screenshot path;
- route URL;
- horizontal overflow boolean using document scroll width vs viewport width;
- console warnings/errors since navigation;
- visible forbidden-copy matches;
- bounding boxes for bottom nav, raised Capture, selected bar, filter sheet, and primary content when present;
- issue list.

Bounding-box failure rules:

- Horizontal overlap is not enough; vertical collision fails when two fixed/interactive layers overlap by more than 2 CSS pixels unless one intentionally covers the other as a modal sheet.
- Filter sheet may cover raised Capture because it is modal, but sheet controls must remain visible and clickable.
- Selected bar must sit above bottom nav and below primary content without covering selected-row controls.
- Raised Capture must not cover page links, form controls, selected bar, or sheet close/apply controls.
- Offline fallback must have no app bottom nav.

Exit gate: browser report `issueCount === 0` and `consoleCount === 0`.

### Phase 7 - QA Report, Tracker, Running Logs

Create:

- `UX_v2/execution/ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_QA_<timestamp>.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>.md`

Update:

- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_2026-06-15_21-46-45_IST.md`
- `RUNNING_LOG.md`
- `UX_v2/RUNNING_LOG.md`

Required wording:

`Android A1 shell/library/more/offline completed locally with browser evidence; APK evidence and production release still pending.`

## No-Go Gates

- Missing browser JSON report blocks local completion.
- Any fixed-layer overlap in required browser states blocks local completion.
- Any horizontal overflow in required A1 states blocks local completion.
- Any mobile selected bar exposing tag input or add-to-collection select blocks local completion.
- Any visible offline item/read/count/sync claim blocks local completion.
- Any fake account/email/version or `AI Brain` copy blocks local completion.
- Any active privacy/telemetry/E2EE/delete-all-data control blocks local completion.
- Missing copy scan blocks local completion.
- Missing offline fallback harness blocks local completion if `public/offline.html` changes.
- Missing `/setup-apk` deferral route test blocks shell route completion.
- Any raw token, cookie, URL, note body, PDF name, or private content in evidence blocks release.
- Any production deploy, APK publication, or Android-complete claim from A1 browser-only evidence is forbidden.

## Rollback Strategy

A1 does not deploy, so no production rollback is needed.

If local validation fails:

- use `apply_patch` to reverse only A1 hunks made in this execution;
- do not run `git checkout`, `git reset`, or whole-file revert commands;
- do not revert unrelated dirty work;
- keep PRD/plan/review docs and QA failure notes;
- record blockers in tracker/running logs if the slice cannot complete.

## Expected Local Completion Artifacts

- PRD v1, PRD adversarial review, PRD v2.
- Implementation plan v1, implementation plan adversarial review, implementation plan v2.
- Selected-action helper/tests.
- Copy scan helper output.
- Offline fallback harness output.
- Browser evidence screenshots and JSON report.
- A1 QA report.
- Project tracker update.
- Running-log updates.
