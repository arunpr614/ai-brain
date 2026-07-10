# UX v2 Release Candidate Change Manifest

Created: 2026-06-14 13:28 IST
Owner: Codex lead integrator
Branch: `codex/ai-brain-ux-v2-execution`
Baseline HEAD: `c33166e4c9b9a3af86165b1b83aaea355174ccd7`
Release verdict: **NO-GO; manifest only**

## Purpose

This manifest reduces the release-commit hygiene blocker. The current worktree is too dirty to safely stage with `git add .`; this file separates approved UX v2 candidate work, evidence, mixed-risk files, and unrelated or decision-gated changes that require separate review.

No files were staged or committed while creating this manifest.

## Current Git Surface

Snapshot commands:

- `git diff --name-only | wc -l` -> 92 tracked modified paths.
- `git ls-files --others --exclude-standard | wc -l` -> 318 untracked paths.
- `git ls-files --others --exclude-standard UX_v2/execution | wc -l` -> 43 untracked UX v2 execution evidence/report paths.

Interpretation:

- The dirty tree predates this execution. Baseline docs recorded 174 dirty entries before UX v2 execution docs/code work.
- Some tracked files contain approved local UX v2 work plus broader pre-existing changes.
- Release staging must be file-by-file or patch-by-patch after review.
- Do not use `git add .`, `git add -A`, or a broad directory add at repo root.

## Release Candidate Evidence Bundle

These are UX v2 execution artifacts created to prove or gate the current candidate. They are safe to include as evidence if a release/handoff commit is made.

Primary docs:

- `UX_v2/execution/UX_V2_BASELINE_AND_AUDIT.md`
- `UX_v2/execution/UX_V2_EXECUTION_TRACKER.md`
- `UX_v2/execution/UX_V2_FINAL_QA_RELEASE_GATE_2026-06-14.md`
- `UX_v2/execution/UX_V2_COMPLETION_AUDIT_2026-06-14.md`
- `UX_v2/execution/UX_V2_RELEASE_APPROVAL_PACKET_2026-06-14.md`
- `UX_v2/execution/UX_V2_OPEN_DECISIONS_APPROVAL_PACKET_2026-06-14.md`
- `UX_v2/execution/UX_V2_INTEGRATION_REVIEW_2026-06-14.md`
- `UX_v2/execution/UX_V2_SELECTIVE_STAGING_REVIEW_2026-06-14.md`
- `UX_v2/execution/UX_V2_CODE_STAGING_REVIEW_2026-06-14.md`
- `UX_v2/execution/ANDROID_APK_STATIC_CHECK_2026-06-14.md`
- `UX_v2/execution/ANDROID_RUNTIME_CHECK_2026-06-14.md`

Review and smoke reports:

- `UX_v2/execution/PRD_06_CODE_REVIEW_2026-06-14.md`
- `UX_v2/execution/PRD_10_CODE_REVIEW_2026-06-14.md`
- `UX_v2/execution/PRD_10_REPAIR_SMOKE_2026-06-14.md`
- `UX_v2/execution/PRD_11_SHELL_SMOKE_2026-06-14.md`
- `UX_v2/execution/PRD_14_CODE_REVIEW_2026-06-14.md`
- `UX_v2/execution/PRD_14_TRUST_COPY_SMOKE_2026-06-14.md`
- `UX_v2/execution/PRD_15_ENTRY_OFFLINE_CODE_REVIEW_2026-06-14.md`
- `UX_v2/execution/PRD_15_ENTRY_SESSION_COPY_REVIEW_2026-06-14.md`
- `UX_v2/execution/PRD_16_BUILD_APK_PIPELINE_REVIEW_2026-06-14.md`
- `UX_v2/execution/UX_V2_INTEGRATION_REVIEW_2026-06-14.md`
- `UX_v2/execution/UX_V2_SELECTIVE_STAGING_REVIEW_2026-06-14.md`
- `UX_v2/execution/UX_V2_CODE_STAGING_REVIEW_2026-06-14.md`

Evidence folders:

- `UX_v2/execution/evidence/screenshots/`
- `UX_v2/execution/evidence/android/`

Log:

- `RUNNING_LOG.md` contains UX v2 entries through #103 in the current worktree, but relative to HEAD it shows thousands of deletions as well as additions. Do not stage the whole file unless the owner explicitly approves that rewrite or an append-only patch is reconstructed.

## 2026-06-14 13:41 Addendum: Staging Review

`UX_v2/execution/UX_V2_SELECTIVE_STAGING_REVIEW_2026-06-14.md` now records the current staging decision:

- `UX_v2/execution/**` is safe to stage as evidence-only.
- Approved-only index staging is complete for the mixed PRD-10 files. The working tree still contains broader unapproved deltas in those paths, so future commits must use the staged index or a clean reconstruction, not whole-file working-tree staging.
- `RUNNING_LOG.md` is staged through an append-only reconstruction of UX v2 entries #81-#107. The working-tree whole-file rewrite is still not safe to stage.
- Local release-candidate commit `ef0b2e2` contains the approved staged bundle. Production release still requires live/staging Android validation, pairing/token validation, APK artifact/version decision, backup/staging/rollback/owner checks, product decision deferrals/approvals, and explicit user approval.

`UX_v2/execution/**` was staged as evidence after staged whitespace checks passed. PRD-06/10/14/15/16 approved local code and an append-only `RUNNING_LOG.md` reconstruction were then staged and validated from a staged-index checkout; see `UX_v2/execution/UX_V2_CODE_STAGING_REVIEW_2026-06-14.md`. Roadmap, versioning, broader asset files, the non-append running-log working-tree rewrite, and working-tree-only unapproved topics/focus/library-filter deltas remain unstaged.

## Approved Local Code Bundle

These files contain work tied to approved local slices. They still need final patch review before staging because some files also had pre-existing changes.

### PRD-06-FU Capture Result Contract

Primary:

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

Mixed and review-required:

- `src/app/items/[id]/page.tsx` also contains PRD-10 item/repair links and wider item-detail changes.

### PRD-10 Limited Weak-Source Repair

Primary:

- `src/lib/repair/item-repair.ts`
- `src/lib/repair/item-repair.test.ts`
- `src/lib/repair/item-repair.test.setup.ts`
- `src/app/items/[id]/repair/actions.ts`
- `src/app/items/[id]/repair/page.tsx`
- `src/app/items/[id]/repair/repair-form.tsx`
- `src/app/needs-upgrade/page.tsx`

Mixed and review-required:

- `src/db/items.ts`
- `src/db/items.test.ts`
- `src/app/items/[id]/page.tsx`

### PRD-14 Informational Trust Copy

Primary:

- `src/lib/settings/trust-copy.ts`
- `src/app/settings/page.tsx`
- `src/app/more/page.tsx`
- `public/offline.html`

Mixed and review-required:

- `public/sw.js` if service-worker/offline cache copy is included.
- `src/app/settings/device-pairing/page.tsx` if pairing copy is included.

### PRD-15 Entry, Session, Pairing Copy, Offline Fallback

Primary:

- `src/proxy.ts`
- `src/proxy.test.ts`
- `src/app/unlock/page.tsx`
- `src/app/setup/page.tsx`
- `src/app/setup-apk/page.tsx`
- `capacitor.config.ts`
- `android/app/src/main/AndroidManifest.xml`
- `public/offline.html`
- `public/ai-memory-logo.png`

Review-required Android asset files:

- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/mipmap-*/ic_launcher*.png`

These icon/resource files appear consistent with AI Memory branding but should be reviewed as asset changes before staging.

### PRD-16 QA And APK Pipeline

Primary:

- `scripts/build-apk.sh`
- all `UX_v2/execution/*` reports and evidence listed above.

## Decision-Gated Or Unapproved For This Release

Do not include these as part of the current approved UX v2 candidate unless Arun/Product explicitly approves the matching decision packet or follow-up PRD.

Ask scope/history/composer related:

- `src/app/ask/ask-client.tsx`
- `src/app/ask/page.tsx`
- `src/app/api/ask/route.ts`
- `src/app/api/ask/route.test.ts`
- `src/app/items/[id]/ask/page.tsx`
- `src/lib/ask/history.ts`
- `src/lib/ask/scope.ts`
- `src/lib/client/use-ask-stream.ts`
- `src/lib/retrieve/index.ts`
- `src/lib/retrieve/index.test.ts`

Taxonomy/topics/collections expansion:

- `src/app/collections/[id]/page.tsx`
- `src/app/topics/[slug]/page.tsx`
- `src/app/taxonomy-actions.ts`
- `src/components/collection-editor.tsx`
- `src/components/tag-editor.tsx`
- `src/db/migrations/017_topics.sql`
- `src/db/topics.ts`
- `src/db/topics.test.ts`
- `src/db/topics.test.setup.ts`

Broader design-system/shell work requiring separate scope review:

- `src/app/actions.ts`
- `src/app/capture/page.tsx`
- `src/app/capture/pdf-dropzone.tsx`
- `src/app/capture/tabs.tsx`
- `src/app/layout.tsx`
- `src/app/not-found.tsx`
- `src/app/page.tsx`
- `src/app/search/page.tsx`
- `src/components/chat-message.tsx`
- `src/components/citation-chip.tsx`
- `src/components/command-palette.tsx`
- `src/components/library-list.tsx`
- `src/components/mobile-library-filters.tsx`
- `src/components/sidebar.tsx`
- `src/styles/tokens.css`

Ops/provider/Telegram/YouTube/backfill work:

- `docs/plans/v0.6.5-telegram-capture-PRD.md`
- `docs/plans/v0.6.5-telegram-capture.md`
- `src/app/api/telegram/webhook/route.test.ts`
- `src/lib/telegram/dispatch.ts`
- `src/lib/telegram/dispatch.test.ts`
- `src/lib/telegram/webhook-handler.ts`
- `src/lib/enrich/pipeline.ts`
- `src/lib/enrich/prompts.ts`
- `src/lib/llm/openrouter.ts`
- `src/lib/capture/http.ts`
- `src/lib/capture/url.ts`
- `src/lib/capture/youtube.ts`
- `scripts/spikes/*.mjs`

Config-level files requiring separate review:

- `eslint.config.mjs`
- `tsconfig.json`
- `ROADMAP_TRACKER.md`
- `android/app/build.gradle`

`android/app/build.gradle` is especially release-sensitive because APK publication is still blocked by the versionName/versionCode decision.

## Public Asset Bundle

Potentially UX v2 related:

- `public/ai-memory-logo.png`
- `public/apple-touch-icon.png`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/favicon-48x48.png`
- `public/manifest.webmanifest`
- `public/web-app-icon-192.png`
- `public/web-app-icon-512.png`

Staging guidance:

- Include if the release explicitly includes AI Memory web icon/manifest branding.
- Verify browser metadata, web manifest, Android label, and launcher assets after staging.
- Do not assume these are covered by PRD-14/15 copy tests alone.

## Suggested Review Sequence Before Any Commit

1. Review and stage the evidence bundle first:
   - `UX_v2/execution/**`
   - append-only `RUNNING_LOG.md` only after confirming no prior-entry rewrites.
2. Review approved local code slice by slice:
   - PRD-06 files.
   - PRD-10 limited repair files.
   - PRD-14 trust copy files.
   - PRD-15 entry/session/offline files.
   - PRD-16 `scripts/build-apk.sh`.
3. For each mixed file, use patch review instead of whole-file staging:
   - `git diff -- <path>`
   - `git add -p -- <path>`
4. Leave decision-gated files unstaged unless their decision is explicitly approved.
5. After staging, rerun:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `npm run build:apk` after APK version/publication decision
6. Recreate Android emulator evidence if the staged set differs from the latest tested APK output.

## Release-Hygiene Blockers Remaining

- Local release-candidate commit `ef0b2e2` exists; no push, PR, or deploy has been performed.
- No staging target or production deploy approval exists.
- No product decision deferral/approval has been granted.
- No APK version bump or same-version publication approval exists.
- Several files in the dirty worktree are outside the implemented approved slices and must not be swept into a release by accident.

## Manifest Verdict

The current worktree can support a release candidate only after selective staging and review. A broad commit from the current state would mix approved UX v2 work with unrelated, pre-existing, and decision-gated changes.
