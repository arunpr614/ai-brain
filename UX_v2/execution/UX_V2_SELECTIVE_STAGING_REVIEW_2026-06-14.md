# UX v2 Selective Staging Review

Created: 2026-06-14 13:41 IST
Reviewer: Codex lead integrator
Branch: `codex/ai-brain-ux-v2-execution`
Baseline HEAD: `c33166e4c9b9a3af86165b1b83aaea355174ccd7`

## Verdict

Do not create a release commit from the full dirty worktree.

The UX v2 evidence bundle under `UX_v2/execution/` is isolated and safe to stage as release evidence. The approved code bundle is not yet safe to stage as whole files because several required paths contain mixed approved and unapproved changes. A release code commit needs patch-level splitting or a clean reconstruction branch before staging.

## Current State Checked

- Branch: `codex/ai-brain-ux-v2-execution`.
- HEAD: `c33166e4c9b9a3af86165b1b83aaea355174ccd7`.
- Tracked dirty tree remains broad.
- `UX_v2/execution/` currently contains 45 untracked evidence/report files.
- `RUNNING_LOG.md` is not safe to stage whole-file: compared with HEAD it shows 2,239 insertions and 5,318 deletions. That does not satisfy the append-only running-log staging rule even though the current file contains the latest UX v2 entries.

## Safe To Stage Now

These files are isolated UX v2 evidence/handoff artifacts:

- `UX_v2/execution/**`

This group includes baseline, tracker, QA gate, reviews, approval packets, Android evidence, screenshots, completion audit, release manifest, and integration review.

## Do Not Stage Whole-File Yet

| Path | Reason |
| --- | --- |
| `RUNNING_LOG.md` | Diff against HEAD rewrites prior content instead of only appending; needs owner review or a patch-only append reconstruction before staging. |
| `ROADMAP_TRACKER.md` | Contains older v0.7.2/v0.9.8/v0.9.9 roadmap changes unrelated to the current UX v2 candidate. |
| `src/app/items/[id]/page.tsx` | Mixes approved PRD-06 capture banners and PRD-10 repair links with broader focus mode, topics, related-item, and item-detail shell changes. |
| `src/db/items.ts` | Mixes approved Needs Upgrade helpers with broader library source/quality/tag filters and ordered item lookup helpers. |
| `src/db/items.test.ts` | Mixes approved Needs Upgrade coverage with broader library filter/tag/order tests. |
| `android/app/src/main/res/mipmap-*/ic_launcher*.png` | Branding assets need a separate visual/asset review before staging. |
| `public/apple-touch-icon.png`, `public/favicon-*.png`, `public/web-app-icon-*.png`, `public/manifest.webmanifest` | Public web app branding bundle needs separate metadata and browser-manifest review before staging. |
| `android/app/build.gradle` | APK version decision is still blocked; do not stage until versionName/versionCode publication path is approved. |

## Whole-File Candidates After Review

These files appear scoped to approved UX v2 slices or are newly created for those slices, but should still be staged only after the mixed-file blocker is resolved because the candidate would not be build-complete without compatible mixed-path changes:

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
- `src/lib/repair/item-repair.ts`
- `src/lib/repair/item-repair.test.ts`
- `src/lib/repair/item-repair.test.setup.ts`
- `src/app/items/[id]/repair/actions.ts`
- `src/app/items/[id]/repair/page.tsx`
- `src/app/items/[id]/repair/repair-form.tsx`
- `src/app/needs-upgrade/page.tsx`
- `src/lib/settings/trust-copy.ts`
- `src/app/settings/page.tsx`
- `src/app/more/page.tsx`
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

## Recommended Next Commit Path

1. Stage `UX_v2/execution/**` as evidence only.
2. Use the staged append-only `RUNNING_LOG.md` reconstruction; do not stage the working-tree whole-file rewrite unless owner-approved.
3. Split mixed code paths patch-by-patch:
   - capture/repair portions from `src/app/items/[id]/page.tsx`;
   - Needs Upgrade helper portions from `src/db/items.ts`;
   - Needs Upgrade tests from `src/db/items.test.ts`.
4. Leave unapproved focus mode, topics, broader library filters, Android package/version changes, and public branding bundles unstaged unless their decision gates close.
5. After code staging, rerun `npm run typecheck`, `npm run lint`, `npm test`, and targeted APK validation before committing.

## Release Impact

This review reduces the release-commit hygiene blocker by identifying an evidence-only staging path and the exact code-splitting blockers. It does not approve production deploy, shared APK publication, or any decision-gated feature.

## 2026-06-14 13:45 Addendum

`UX_v2/execution/**` was staged as evidence-only after `git diff --check` and `git diff --cached --check -- UX_v2/execution` passed. A first PRD-06/14/15/16 whole-file code tranche was then staged and validated; see `UX_v2/execution/UX_V2_CODE_STAGING_REVIEW_2026-06-14.md`. PRD-10/mixed code files were still pending at this point; `ROADMAP_TRACKER.md`, Android/public branding assets, and `android/app/build.gradle` remain unstaged.

## 2026-06-14 13:55 Addendum

A direct PRD-10 repair tranche was staged after adding a guard so `src/lib/repair/item-repair.ts` only clears `item_topics` when that table exists. This keeps the staged direct repair route independent from the unapproved topics migration.

Staged direct repair files:

- `src/lib/repair/item-repair.ts`
- `src/app/items/[id]/repair/actions.ts`
- `src/app/items/[id]/repair/page.tsx`
- `src/app/items/[id]/repair/repair-form.tsx`

Validation after the guard:

- `node --import tsx --test src/lib/repair/item-repair.test.ts` passed.
- `npm run typecheck` passed.

Still not staged:

- PRD-10 Needs Upgrade page, item-detail repair banners/links, and DB helper/test split work.
- `RUNNING_LOG.md` working-tree whole-file rewrite; append-only reconstruction is staged instead.
- Topics schema/UI/db helpers, broader item-detail focus mode, broader library filters, Android/public branding assets, and APK version metadata.

## 2026-06-14 14:08 Addendum

The approved-only PRD-10 split is now staged in the index without staging the broader working-tree deltas:

- `src/app/needs-upgrade/page.tsx`
- `src/app/items/[id]/page.tsx`
- `src/db/items.ts`
- `src/db/items.test.ts`
- `src/lib/repair/item-repair.test.ts`
- `src/lib/repair/item-repair.test.setup.ts`

Staged-index validation:

- `git diff --cached --check` passed.
- Temporary staged-index checkout `npm run typecheck` passed.
- Temporary staged-index checkout focused PRD-06/10/14/15 capture/proxy/API tests passed: 47 tests, 9 suites.
- Temporary staged-index checkout `npm run lint` passed with two existing unused-disable warnings.
- Temporary staged-index checkout `npm run build` passed with the known `unpdf` warning.
- Temporary staged-index checkout with Git metadata `npm test` passed: 445 tests, 65 suites.
- `bash -n scripts/build-apk.sh` passed in the staged-index checkout.

Still not staged:

- `RUNNING_LOG.md` working-tree whole-file rewrite; append-only reconstruction is staged instead.
- `ROADMAP_TRACKER.md`, Android/public branding assets, and `android/app/build.gradle`.
- Working-tree-only topics schema/UI/db helpers, broader item-detail focus mode, and broader library filters.

## 2026-06-14 14:12 Addendum

`RUNNING_LOG.md` is now staged through an append-only reconstruction: HEAD plus UX v2 entries #81-#107. The staged diff is 1,203 insertions and 0 deletions. The working-tree file still has a non-append rewrite and must not replace the staged log unless the owner explicitly approves that rewrite.
