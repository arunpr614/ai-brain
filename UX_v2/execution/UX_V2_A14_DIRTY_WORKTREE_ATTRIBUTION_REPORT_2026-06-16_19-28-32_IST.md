# UX v2 A14 Dirty Worktree Attribution Report

Created: 2026-06-16 19:28:32 IST
Branch: `codex/ai-brain-ux-v2-execution`
Status: `ownership_map_created_release_ownership_still_open`

## Executive Summary

A14 converts the A13 dirty-worktree blocker into an owner-review map. It does not close final release ownership, stage files, commit changes, publish APKs, or approve a release.

The current worktree has two different inventory scales:

- Compact `git status --short`: 306 entries, because untracked directories collapse.
- Expanded untracked file list: 874 files.

This report gives the release owner a concrete map for deciding what to stage, what to keep as evidence/reference, what to exclude, and what requires further review.

## Freshness Caveat

All counts and path lists below are valid only for the command snapshot at 2026-06-16 19:28 IST. Rerun the listed commands immediately before staging, committing, or publishing anything.

## Inventory Snapshot

| Inventory | Count / result |
| --- | ---: |
| Compact changed/untracked entries from `git status --short` | 306 |
| Tracked modified entries | 97 |
| Compact untracked entries | 209 |
| Expanded untracked files from `git ls-files --others --exclude-standard` | 874 |
| Tracked diff scale | 5,494 insertions / 6,661 deletions |

Tracked top-level categories:

| Category | Count |
| --- | ---: |
| `src` | 70 |
| `android` | 17 |
| `public` | 2 |
| `docs` | 2 |
| `README.md` | 1 |
| `RUNNING_LOG.md` | 1 |
| `ROADMAP_TRACKER.md` | 1 |
| `capacitor.config.ts` | 1 |
| `eslint.config.mjs` | 1 |
| `tsconfig.json` | 1 |

Expanded untracked top-level categories:

| Category | Count |
| --- | ---: |
| `UX_v2` | 641 |
| `UX_UI_DESIGN_PACKAGE` | 95 |
| `src` | 35 |
| `docs` | 29 |
| `scripts` | 27 |
| `public` | 7 |
| `Handover_docs` | 6 |
| `ReviewReport` | 3 |
| Root design/planning one-off files | 31 |

Key expanded untracked sub-buckets:

| Sub-bucket | Count |
| --- | ---: |
| `UX_v2/execution` | 401 |
| `UX_v2/features` | 141 |
| `UX_UI_DESIGN_PACKAGE` | 95 |
| `UX_v2/UX_Final_Plan` | 30 |
| `UX_v2/project_management` | 28 |
| `scripts` | 27 |
| `docs/plans` | 27 |
| `UX_v2/trackers` | 20 |
| `src/app` | 14 |
| `src/lib` | 12 |
| `public` | 7 |
| `UX_v2/lightweight-specs` | 7 |
| `Handover_docs` | 6 |
| `src/db` | 4 |
| `src/components` | 4 |
| `ReviewReport` | 3 |
| `docs/research` | 2 |
| `src/styles` | 1 |

## Reproduce Full Inventory

Use these commands immediately before staging:

```bash
git status --short
git diff --name-only
git ls-files --others --exclude-standard
git diff --numstat
git status --ignored --short data/artifacts android/app/build/outputs/apk/debug
```

## Owner-Review Buckets

| Bucket | Paths / examples | A14 recommendation | Required owner action |
| --- | --- | --- | --- |
| Candidate app source/test bundle | Tracked `src/**`, untracked `src/app/**`, `src/lib/**`, `src/db/**`, `src/components/**`, `src/styles/**` | Review as the main UX v2 implementation bundle. Do not split randomly; tests, route helpers, schema, and UI changes are coupled. | Release owner reviews diff and accepts exact files before staging. |
| Candidate config/build bundle | `tsconfig.json`, `eslint.config.mjs`, `capacitor.config.ts`, `android/app/build.gradle`, Android strings/resources | Review with app source because build/runtime behavior depends on it. | Verify typecheck/lint/build/APK build before release. |
| Android resources and launcher assets | `android/app/src/main/res/**` tracked binary assets and strings | Review as Android branding/runtime package. | Confirm intended app identity and do not publish without authorization. |
| Public/offline/service worker assets | `public/offline.html`, `public/sw.js`, untracked public icons/manifest | Review with web/Android runtime bundle. | Verify offline fallback and web manifest behavior. |
| Current release governance docs | `UX_v2/features`, `UX_v2/project_management`, `UX_v2/trackers`, current A7-A14 execution reports | Review separately from app source; these are release evidence and process artifacts. | Decide which docs belong in repo release history. |
| QA/evidence artifacts | `UX_v2/execution`, screenshots/source snapshots/evidence folders | Evidence-heavy; useful for audit but can be too large/noisy for normal release commits. | Decide repository policy for evidence retention before staging. |
| Historical/reference packages | Root UX design docs, `UX_UI_DESIGN_PACKAGE`, old handovers, `UX_v2/UX_Final_Plan`, older planning docs | Reference-only unless release owner wants to preserve planning history in repo. | Review for size/noise and avoid staging blindly. |
| Ignored APK identity artifacts | `data/artifacts/**`, `android/app/build/outputs/apk/debug/**` | Identity evidence only; not publication authorization and not normal source staging. | Keep ignored unless release owner intentionally changes artifact policy. |
| Blocked/unknown | Broad root one-off docs, older plans, research docs, generated packages | Not release-owned by A14. | Human owner must accept or exclude before final release ownership can close. |

## Exact Tracked Modified Path Appendix

These 97 tracked paths are modified and must be reviewed path-by-path before any release staging:

```text
README.md
ROADMAP_TRACKER.md
RUNNING_LOG.md
android/app/build.gradle
android/app/src/main/res/mipmap-hdpi/ic_launcher.png
android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png
android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-mdpi/ic_launcher.png
android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png
android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png
android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
android/app/src/main/res/values/strings.xml
capacitor.config.ts
docs/plans/v0.6.5-telegram-capture-PRD.md
docs/plans/v0.6.5-telegram-capture.md
eslint.config.mjs
public/offline.html
public/sw.js
src/app/actions.ts
src/app/api/ask/route.test.ts
src/app/api/ask/route.ts
src/app/api/library/export.zip/route.ts
src/app/api/telegram/webhook/route.test.ts
src/app/ask/ask-client.tsx
src/app/ask/page.tsx
src/app/capture-actions.ts
src/app/capture/page.tsx
src/app/capture/pdf-dropzone.tsx
src/app/capture/tabs.tsx
src/app/collections/[id]/page.tsx
src/app/globals.css
src/app/items/[id]/ask/page.tsx
src/app/items/[id]/page.tsx
src/app/items/[id]/repair/page.tsx
src/app/items/[id]/repair/repair-form.tsx
src/app/layout.tsx
src/app/needs-upgrade/page.tsx
src/app/not-found.tsx
src/app/page.tsx
src/app/search/page.tsx
src/app/settings/collections/page.tsx
src/app/settings/device-pairing/actions-client.tsx
src/app/settings/device-pairing/page.tsx
src/app/settings/page.tsx
src/app/settings/tags/page.tsx
src/app/setup-apk/page.tsx
src/app/setup/form.tsx
src/app/setup/page.tsx
src/app/taxonomy-actions.ts
src/app/unlock/form.tsx
src/app/unlock/page.tsx
src/components/ask-input.tsx
src/components/chat-message.tsx
src/components/citation-chip.tsx
src/components/collection-editor.tsx
src/components/command-palette.tsx
src/components/library-list.tsx
src/components/share-handler.tsx
src/components/sidebar.tsx
src/components/tag-editor.tsx
src/components/theme-toggle.tsx
src/db/items.test.ts
src/db/items.ts
src/lib/ask/generator.ts
src/lib/auth/api-version.test.ts
src/lib/auth/api-version.ts
src/lib/capture/http.ts
src/lib/capture/url.ts
src/lib/capture/youtube.ts
src/lib/client/reachability.ts
src/lib/client/register-sw.ts
src/lib/client/use-ask-stream.ts
src/lib/enrich/pipeline.ts
src/lib/enrich/prompts.ts
src/lib/llm/openrouter.ts
src/lib/providers/status.test.ts
src/lib/queue/enrichment-batch.test.ts
src/lib/queue/enrichment-batch.ts
src/lib/repair/item-repair.test.ts
src/lib/retrieve/index.test.ts
src/lib/retrieve/index.ts
src/lib/settings/trust-copy.ts
src/lib/telegram/dispatch.test.ts
src/lib/telegram/dispatch.ts
src/lib/telegram/webhook-handler.ts
src/proxy.test.ts
src/proxy.ts
src/styles/tokens.css
tsconfig.json
```

## Key Untracked Source/Test/Schema Paths

These 35 untracked `src` files are high-risk because they affect runtime, tests, routing, DB schema, or styling:

```text
src/app/actions.bulk.test.setup.ts
src/app/actions.bulk.test.ts
src/app/api/library/export.zip/route.test.setup.ts
src/app/api/library/export.zip/route.test.ts
src/app/api/settings/provider-status/route.test.ts
src/app/ask/ask-request.test.ts
src/app/ask/ask-request.ts
src/app/capture/pdf-file-validation.test.ts
src/app/capture/pdf-file-validation.ts
src/app/capture/share-result/page.tsx
src/app/capture/share-result/share-result-client.tsx
src/app/library/page.tsx
src/app/more/page.tsx
src/app/topics/[slug]/page.tsx
src/components/mobile-library-filters.tsx
src/components/sidebar-routing.test.ts
src/components/sidebar-routing.ts
src/components/theme-bootstrap.tsx
src/db/migrations/017_topics.sql
src/db/topics.test.setup.ts
src/db/topics.test.ts
src/db/topics.ts
src/lib/android-share/result.test.ts
src/lib/android-share/result.ts
src/lib/ask/history.ts
src/lib/ask/scope.ts
src/lib/device-pairing/token-display.test.ts
src/lib/device-pairing/token-display.ts
src/lib/library/scope-health.test.ts
src/lib/library/scope-health.ts
src/lib/library/selected-actions.test.ts
src/lib/library/selected-actions.ts
src/lib/shell/private-counts.test.ts
src/lib/shell/private-counts.ts
src/styles/tokens.contrast.test.ts
```

## Ignored APK Identity Artifacts

`git status --ignored --short` shows `data/artifacts/` and `android/app/build/` are ignored. The hashes below are identity evidence only. They do not authorize staging, retention, upload, signing, or publication.

| Artifact | SHA-256 |
| --- | --- |
| `data/artifacts/brain-debug-v1.0.4-code5.apk` | `a4be82c4d8d51de81345e27441af250bc1a8300f4646388dbd50522875c021b7` |
| `android/app/build/outputs/apk/debug/brain-debug-v1.0.4-code5.apk` | `a4be82c4d8d51de81345e27441af250bc1a8300f4646388dbd50522875c021b7` |
| Historical debug APKs under `data/artifacts/` | Present; do not use for publication decisions. |

## Bucket Validation Matrix

| Bucket | Required validation before release-owner acceptance |
| --- | --- |
| Candidate app source/test bundle | Typecheck, lint, focused unit tests for changed domains, full test suite, Next build, source review. |
| New source/test/schema files | Same as app source plus migration review for `src/db/migrations/017_topics.sql`. |
| Android config/resources | APK build, install/launch smoke, package version check, launcher/icon verification, token-log hygiene check if pairing/share is exercised. |
| Public/offline/service worker assets | Web build, offline fallback smoke, service worker registration/update behavior check. |
| Current release governance docs | Markdown whitespace check, stale-claim scan, no-secret scan, link/path sanity check. |
| QA/evidence artifacts | Evidence-retention policy review, privacy redaction check, size/noise review. |
| Historical/reference packages | Owner decision on whether to commit as archive/reference; no release validation implied. |
| Ignored APK artifacts | Hash identity check only; publication requires separate authorization and distribution target. |
| Blocked/unknown files | Human review and explicit include/exclude decision. |

## Remaining No-Go Gates

1. Final release ownership is not closed by this report.
2. No staging or committing is authorized by this report.
3. APK publication remains blocked without explicit user authorization and a named distribution target.
4. Full TalkBack spoken-order status and URL-share success decision remain open from A13.
5. The inventory must be rerun before any release-owner staging action.

## A14 Verdict

A14 reduces the dirty-worktree blocker from an unstructured broad risk to a concrete owner-review map. The next release-owner action is to accept or exclude each bucket, then stage only accepted paths and rerun the bucket-specific validation matrix.
