# Feature Android A1 Shell Library More Offline Implementation Plan v1

Created: 2026-06-16 08:42:00 IST
Owner: Main Codex
Status: Draft for adversarial review. Do not implement until implementation plan v2 exists.
Product source: `FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_PRD_V2_2026-06-16_08-40-24_IST.md`

## Objective

Implement Android A1 locally: mobile shell and bottom-nav cleanup, safe fixed-layer behavior, Library mobile filter/select cleanup, More truth cleanup, public offline fallback truth, browser evidence, project tracking, and running-log updates. Do not deploy and do not claim APK validation.

## Implementation Boundaries

| Boundary | Plan |
| --- | --- |
| APK behavior | No APK build or publication in A1 unless later validation requires a local debug build. Do not claim Android-complete status |
| `/setup-apk` | Do not change route classification or pairing behavior |
| Mobile selected mutations | Remove/hide tag input and add-to-collection select from mobile selected bar. Preserve desktop/tablet controls if existing tests pass |
| More provider status | Use existing provider status helper and visible fallback states only |
| Offline | Keep `public/offline.html` self-contained. Adjust copy only as needed for server-required truth |
| Production | No deploy in A1 |

## Planned Code Changes

| File | Change |
| --- | --- |
| `src/components/sidebar.tsx` | Remove Needs Upgrade badge from the bottom More tab. Keep bottom nav route policy and raised Capture behavior. Do not add fake Android chrome |
| `src/components/sidebar-routing.ts` | Add or preserve explicit route behavior tests through the companion test file. Do not map `/setup-apk` in A1 |
| `src/components/sidebar-routing.test.ts` | Add coverage for `/capture/share-result`, representative query strings, More/settings routes, and explicit no-change documentation for `/setup-apk` if needed |
| `src/components/library-list.tsx` | Split `BulkBar` into mobile and desktop/tablet layouts. Mobile layout shows selected count, Ask selected, and clear only. Desktop/tablet can keep tag and collection controls |
| `src/components/mobile-library-filters.tsx` | Keep or adjust bottom sheet positioning only if browser collision evidence shows overlap |
| `src/app/library/page.tsx` | Keep production-backed source/quality filters only. Do not add offline filter. Adjust layout only if screenshot evidence exposes overflow |
| `src/app/more/page.tsx` | Verify top identity, version, provider status, disabled privacy row, offline access row, and no fake account data. Make minimal copy/layout adjustments only if scans or screenshots fail |
| `src/lib/settings/trust-copy.ts` | Align offline/privacy copy with A1 allow-list if needed |
| `public/offline.html` | Replace any "offline capture queue" or offline-read-like wording with exact server-required A1 copy. Preserve inline script and self-contained behavior |
| `scripts/ux-v2-check-android-a1-offline-fallback.ts` | New QA harness using `jsdom` to validate offline fallback link origins and 200/401/403/timeout/network branches |
| `scripts/ux-v2-browser-android-a1-shell-library-more-offline.ts` | New browser QA helper if useful for deterministic state setup and evidence assertions |

## Execution Phases

### Phase 0 - Baseline And Source Confirmation

1. Confirm `FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_PRD_V2_2026-06-16_08-40-24_IST.md` exists.
2. Re-read A0 truth rows for A0-COV-001 through A0-COV-006 and A0-COV-018 through A0-COV-022.
3. Record current dirty state without reverting unrelated work.
4. Confirm no app source edits begin before this plan is revised after adversarial review.

Exit gate: PRD v2 and implementation plan v2 are the only sources for coding.

### Phase 1 - Shell And Route Tests

1. Update bottom mobile More tab so it has no Needs Upgrade badge.
2. Preserve current raised Capture behavior on Library, Search, Item, Topic, Collection, Needs Upgrade, and More.
3. Preserve standard Capture tab on `/ask` and `/capture*`.
4. Add focused route tests for:
   - `/capture/share-result` -> Capture;
   - `/more` -> More;
   - `/settings` and `/settings/device-pairing` -> More;
   - `/library?source=pdf`, `/search?q=fixture`, `/needs-upgrade`, `/items/<id>` -> Library.
5. Avoid changing `/setup-apk` active-state behavior in A1.

Exit gate: focused sidebar route tests pass.

### Phase 2 - Library Mobile Selected Bar

1. Refactor `BulkBar` to render a mobile-only layout and a desktop/tablet layout.
2. Mobile layout:
   - fixed above the bottom nav and safe area;
   - stable width within `100vw`;
   - selected count;
   - Ask selected button;
   - disabled/clear copy when selected count exceeds 50;
   - clear button.
3. Desktop/tablet layout preserves existing tag and add-to-collection controls.
4. Ensure Escape still clears selection.
5. Keep existing bulk action tests green; do not add mobile mutation behavior.

Exit gate: focused bulk-action tests still pass, route/selection browser evidence later confirms no overlap.

### Phase 3 - More And Offline Truth Cleanup

1. Review More page visible copy against PRD v2 table.
2. Keep top identity as AI Memory/private workspace, version from `pkg.version`, real route links, and existing provider statuses.
3. Keep disabled Privacy Controls copy explicitly nonactive.
4. Keep Offline Access copy server-required.
5. Update `public/offline.html` copy to avoid forbidden phrases and use the approved no-offline-queue wording.
6. Add offline fallback harness:
   - normal web origin link expectations;
   - `https://localhost` and `http://localhost` origin rewrite expectations;
   - 200, 401, 403, timeout, and network failure status text checks.

Exit gate: offline fallback harness passes and copy scan passes.

### Phase 4 - Static Validation

Run:

- `git diff --check`
- `node --import tsx --test src/components/sidebar-routing.test.ts src/app/actions.bulk.test.ts`
- offline fallback harness
- bounded copy scan for A1 target files
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build` if app source or public fallback changed

Known acceptable historical caveat: lint may show the existing unrelated `src/lib/queue/enrichment-batch-cron.ts` warning. Any new A1 warning is a failure.

### Phase 5 - Browser Evidence

Start local dev server with a temporary SQLite database and seeded deterministic data.

Required 390x844 evidence:

- Library default.
- Library filter sheet open.
- Library selected mode.
- Library selected mode over the Ask-selected limit if feasible with fixture data; otherwise document infeasible and assert disabled logic with helper tests.
- More.
- Search route.
- Needs Upgrade route smoke.
- Item detail route smoke.
- Topic route smoke.
- Collection route smoke.
- Offline fallback.

Required 430x932 evidence:

- Library default.
- Library selected mode.
- More.
- Offline fallback.

Each browser state must record:

- screenshot path;
- horizontal overflow status;
- bounding boxes for bottom nav, raised Capture, filter sheet, selected bar, and primary content when present;
- console warnings/errors;
- visible forbidden-copy check.

Exit gate: browser report has zero A1 layout issues and zero relevant console warnings/errors.

### Phase 6 - QA Report, Tracker, Running Logs

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

- Any fixed-layer overlap in required browser states blocks local completion.
- Any horizontal overflow in required A1 states blocks local completion.
- Any mobile selected bar exposing tag input or add-to-collection select blocks local completion.
- Any visible offline item/read/count/sync claim blocks local completion.
- Any fake account/email/version or `AI Brain` copy blocks local completion.
- Any active privacy/telemetry/E2EE/delete-all-data control blocks local completion.
- Any raw token, cookie, URL, note body, PDF name, or private content in evidence blocks release.
- Any production deploy, APK publication, or Android-complete claim from A1 browser-only evidence is forbidden.

## Rollback Strategy

A1 code changes are small and local to shell/library/more/offline surfaces. If validation fails:

- revert only A1 edits made by this execution, never unrelated dirty work;
- keep PRD/plan/review docs and QA failure notes;
- record blocker in tracker and running logs if work cannot complete.

No production rollback is needed because A1 does not deploy.

## Expected Local Completion Artifacts

- PRD v1, PRD adversarial review, PRD v2.
- Implementation plan v1, implementation plan adversarial review, implementation plan v2.
- Offline fallback harness.
- Browser evidence screenshots and JSON report.
- A1 QA report.
- Project tracker update.
- Running-log updates.
