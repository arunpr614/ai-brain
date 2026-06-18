# UX v2 Scoped Integration Review

Created: 2026-06-14 13:36 IST
Reviewer: Codex lead integrator
Scope: Approved local UX v2 slices from `UX_v2/UX_Final_Plan`: PRD-06-FU, PRD-10 limited repair, PRD-14 informational trust copy, PRD-15 entry/session/offline fallback, and PRD-16 APK/release-gate evidence.

## Review Verdict

No open P0/P1/P2 findings remain in the approved local slices reviewed here.

One P2 integration finding was found and fixed during this pass: unexpected `/items/[id]/repair` server-action failures could echo raw internal exception text to the user. The action now logs the internal error to `data/errors.jsonl` through `logError()` and returns a generic retry message while preserving expected `RepairItemError` validation copy.

Production/live release remains no-go for non-code gates: stale live Android WebView assets, missing paired-token validation, post-online offline retest, same-version APK publication guard, open product decisions, missing selective release commit, production backup/staging smoke, rollback/release owner confirmation, and explicit user approval.

## Finding Fixed

| Severity | File | Status | Finding | Fix |
| --- | --- | --- | --- | --- |
| P2 | `src/app/items/[id]/repair/actions.ts` | Fixed | Unexpected repair exceptions were returned as `err.message`, which could expose DB/internal details in the repair form. | Imported `logError`, recorded `repair.item.unexpected-failure`, and returned `Repair could not be saved. Try again.` for unexpected failures. |

## Scoped Review Coverage

Reviewed implementation paths:

- Capture result contract and tests: `src/lib/capture/result.ts`, `src/lib/capture/result.test.ts`.
- Capture routes: `src/app/api/capture/url/route.ts`, `src/app/api/capture/note/route.ts`, `src/app/api/capture/pdf/route.ts`.
- Android/share compatibility parser: `src/components/share-handler.tsx`.
- Item detail result/repair banners: `src/app/items/[id]/page.tsx`.
- Limited repair route/action/form/helper: `src/app/items/[id]/repair/*`, `src/lib/repair/item-repair.ts`, `src/lib/repair/item-repair.test.ts`.
- Trust/offline/session copy: `src/lib/settings/trust-copy.ts`, `src/app/settings/page.tsx`, `src/app/more/page.tsx`, `src/app/setup/page.tsx`, `src/app/unlock/page.tsx`, `src/app/setup-apk/page.tsx`, `public/offline.html`, `src/proxy.ts`.
- Android/APK entrypoints: `capacitor.config.ts`, `android/app/src/main/AndroidManifest.xml`, `scripts/build-apk.sh`.

Review notes:

- Capture result payloads keep legacy `id`/`itemId` behavior while adding typed `capture_result` states.
- Failed-without-save states are not routed to an item page; saved-with-issues states route to the saved item with non-raw user copy.
- Limited capture/Needs Upgrade item states link to the approved add-text repair path only; mark-good-enough remains unimplemented and decision-gated.
- Repair preserves manual tags/collections/source metadata and resets stale derived chunks, vectors, auto tags, topics, enrichment, and embedding jobs through the tested transaction helper.
- Entry/session/offline copy does not promise QR pairing, offline queues, active sync, or end-to-end encryption.
- APK build validation path is coherent: typecheck/build/sync/Gradle run before shared artifact publication is blocked by the duplicate version guard.

## Validation Run

Post-fix checks:

| Check | Result |
| --- | --- |
| `node --import tsx --test src/lib/capture/result.test.ts src/lib/repair/item-repair.test.ts src/proxy.test.ts` | Pass: 23 tests, 5 suites |
| `node --import tsx --test src/app/api/capture/url/route.test.ts src/app/api/capture/note/route.test.ts src/app/api/capture/pdf/route.test.ts` | Pass: 16 tests, 3 suites |
| `npm run typecheck` | Pass |
| `bash -n scripts/build-apk.sh` | Pass |

## Residual Release Risks

- This review is scoped to approved local slices, not the entire dirty worktree.
- Android online/share UI is still sourced from stale live assets until staging/live is updated after explicit approval.
- Pairing/token validation still needs an authenticated code/token path.
- Post-online cached offline behavior still needs retest after updated web/offline assets are deployed and cache state is controlled.
- The shared APK artifact remains intentionally unpublished until `versionName`/`versionCode` are bumped or same-version publication is explicitly approved.
- D-001 through D-014 remain open unless accepted as deferrals through the approval packet.
- Production backup, staging smoke, rollback owner/source confirmation, release owner, and post-deploy smoke owner are still required before production/live deploy.
