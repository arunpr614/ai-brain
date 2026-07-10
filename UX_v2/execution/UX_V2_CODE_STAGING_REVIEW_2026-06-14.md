# UX v2 Code Staging Review

Created: 2026-06-14 13:50 IST
Reviewer: Codex lead integrator
Branch: `codex/ai-brain-ux-v2-execution`
Baseline HEAD: `c33166e4c9b9a3af86165b1b83aaea355174ccd7`

## Verdict

A first approved code tranche is staged alongside the UX v2 evidence bundle. It covers PRD-06 capture result contract/API/share compatibility, PRD-14 informational trust copy, PRD-15 entry/session/offline fallback copy, and PRD-16 APK build-pipeline validation.

A second direct PRD-10 tranche is also staged: the repair transaction helper and `/items/[id]/repair` route/action/form.

A third approved-only PRD-10 tranche is now staged from a clean index reconstruction: Needs Upgrade route, item-detail capture/repair banners and links, DB Needs Upgrade helpers, and repair tests. It intentionally excludes unapproved focus mode, topics schema/UI/helpers, broader library filters, and mark-good-enough behavior.

The staged code is now complete for the approved local PRD-06/10/14/15/16 implementation slices, but it is not release-approved. Production/live remains no-go until Android/live/pairing/APK/version/backup/staging/owner/user-approval gates close.

## Staged Code Tranche

- `src/lib/capture/result.ts`
- `src/lib/capture/result.test.ts`
- `src/app/api/capture/url/route.ts`
- `src/app/api/capture/url/route.test.ts`
- `src/app/api/capture/note/route.ts`
- `src/app/api/capture/note/route.test.ts`
- `src/app/api/capture/pdf/route.ts`
- `src/app/api/capture/pdf/route.test.ts`
- `src/app/capture-actions.ts`
- `src/components/share-handler.tsx`
- `src/lib/capture/quality.ts`
- `src/lib/capture/quality.test.ts`
- `src/lib/settings/trust-copy.ts`
- `src/app/settings/page.tsx`
- `public/offline.html`
- `src/proxy.ts`
- `src/proxy.test.ts`
- `src/app/unlock/page.tsx`
- `src/app/setup/page.tsx`
- `src/app/setup-apk/page.tsx`
- `capacitor.config.ts`
- `android/app/src/main/AndroidManifest.xml`
- `scripts/build-apk.sh`
- `public/ai-memory-logo.png`

## Staged PRD-10 Direct Repair Tranche

- `src/lib/repair/item-repair.ts`
- `src/app/items/[id]/repair/actions.ts`
- `src/app/items/[id]/repair/page.tsx`
- `src/app/items/[id]/repair/repair-form.tsx`

Notes:

- `item-repair.ts` clears `item_topics` only when that table exists, so the direct repair route does not require staging the unapproved topics migration.
- The action keeps expected `RepairItemError` validation copy visible, logs unexpected failures, and returns generic retry copy.

## Staged PRD-10 Needs Upgrade / Item Detail Tranche

- `src/app/needs-upgrade/page.tsx`
- `src/app/items/[id]/page.tsx`
- `src/db/items.ts`
- `src/db/items.test.ts`
- `src/lib/repair/item-repair.test.ts`
- `src/lib/repair/item-repair.test.setup.ts`

Notes:

- These files were staged from approved-only index content instead of whole working-tree files.
- The staged item detail page includes PRD-06 capture-result banners and PRD-10 repair result/weak-source panels, but excludes broader focus-mode and topics UI work.
- The staged DB helper adds only Needs Upgrade query/count helpers; broader library source/quality/tag filters and ordered lookup helpers remain unstaged.
- The staged repair test verifies stale chunks/vectors/retrieval/FTS reset, enrichment job reset, manual tag/collection preservation, short-text rejection, and removal from Needs Upgrade without depending on the unapproved topics migration.

## Still Unstaged / Split Required

| Area | Files | Reason |
| --- | --- | --- |
| Running log working tree | `RUNNING_LOG.md` | Append-only reconstruction is staged with UX v2 entries #81-#107; the working-tree whole-file rewrite remains unstaged and must not be swept into a commit. |
| Roadmap | `ROADMAP_TRACKER.md` | Contains older roadmap/version updates unrelated to the UX v2 release candidate. |
| Working-tree-only unapproved UX files | `src/app/items/[id]/page.tsx`, `src/db/items.ts`, `src/db/items.test.ts`, `src/app/needs-upgrade/page.tsx`, `src/lib/repair/item-repair.test.ts` | The index contains approved-only staged content; the working tree still has broader topics/focus/library-filter deltas that must not be committed accidentally. |
| Android/public branding bundle | `android/app/src/main/res/mipmap-*`, `public/favicon-*`, `public/web-app-icon-*`, `public/manifest.webmanifest` | Needs separate visual/metadata review before staging. |
| APK version metadata | `android/app/build.gradle` | VersionName/versionCode publication path is still blocked. |

## Validation

Run after staging the code tranche:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `node --import tsx --test src/lib/capture/result.test.ts src/proxy.test.ts src/app/api/capture/url/route.test.ts src/app/api/capture/note/route.test.ts src/app/api/capture/pdf/route.test.ts` | Pass: 37 tests, 8 suites |
| `node --import tsx --test src/lib/repair/item-repair.test.ts` | Pass in working tree after `item_topics` guard |
| `bash -n scripts/build-apk.sh` | Pass |
| `git diff --cached --check` | Pass before this report was added |

Additional staged-index validation after the approved-only PRD-10 split:

| Check | Result |
| --- | --- |
| `git diff --cached --check` | Pass |
| Temporary checkout of staged index: `npm run typecheck` | Pass |
| Temporary checkout of staged index: focused PRD-06/10/14/15 capture/proxy/API tests | Pass: 47 tests, 9 suites |
| Temporary checkout of staged index: `bash -n scripts/build-apk.sh` | Pass |
| Temporary checkout of staged index: `npm run lint` | Pass with two existing unused-disable warnings in `src/lib/client/register-sw.ts` and `src/lib/queue/enrichment-batch-cron.ts` |
| Temporary checkout of staged index: `npm run build` | Pass with known `unpdf` warning |
| Temporary checkout of staged index with Git metadata: `npm test` | Pass: 445 tests, 65 suites |

## Release Impact

This closes the PRD-10 code-splitting blocker for the approved local slice, stages an append-only running-log reconstruction, and validates the staged release-candidate index. It does not approve production deploy, create a release commit, stage the non-append root running-log working-tree diff, or resolve Android pairing/live/staging/APK-publication gates.
