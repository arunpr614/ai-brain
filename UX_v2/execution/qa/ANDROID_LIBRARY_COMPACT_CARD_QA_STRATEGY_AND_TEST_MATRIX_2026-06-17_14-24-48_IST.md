# Android Library Compact Card QA Strategy And Test Matrix

Created: 2026-06-17 14:24:48 IST
Status: QA strategy only. No production code changed.
Project root: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Branch observed: `codex/ai-brain-ux-v2-execution` tracking `origin/codex/ai-brain-ux-v2-execution`

## Source Documents Read

- `Handover_docs/AI_MEMORY_ANDROID_LIBRARY_COMPACT_CARD_HANDOVER_2026-06-17_14-05-19_IST.md`
- `RUNNING_LOG.md`, especially entries #130 through #136
- `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md`
- `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_10-39-34_IST.md`
- `UX_v2/execution/WEB_ANDROID_LIGHT_FIRST_THEME_IMPLEMENTATION_PLAN_2026-06-17_08-31-22_IST.md`
- Relevant prior QA/evidence docs:
  - `UX_v2/execution/ANDROID_A0_EVIDENCE_STRATEGY_2026-06-16_08-32-30_IST.md`
  - `UX_v2/execution/WEB_EXPERIENCE_REVAMP_FIXTURE_PLAN_2026-06-15_21-48-07_IST.md`
  - `UX_v2/execution/WEB_EXPERIENCE_REVAMP_LIBRARY_SEARCH_TOPICS_COLLECTIONS_QA_2026-06-15_23-02-46_IST.md`
  - `UX_v2/execution/UX_V2_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_QA_2026-06-17_00-29-00_IST.md`

## Repo And Tooling Observed

- Test runner: Node built-in test runner via `npm test`, matching `src/**/*.test.ts`.
- Static gates available: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- APK build available: `npm run build:apk`.
- APK build script runs typecheck, Next build, Capgo share-target privacy patch, Capacitor sync, and Gradle `assembleDebug`.
- Current Android version before compact-card implementation: `versionName "1.0.6"`, `versionCode 7`.
- Capacitor APK is a thin WebView shell loading `https://brain.arunp.in`; `public/offline.html` is the fallback bundle.
- Existing browser visual tooling uses Chrome DevTools Protocol through `chrome-remote-interface`; there is no checked-in Playwright config.
- Existing library card code is in `src/components/library-list.tsx`.
- Current `ItemEnrichmentWatch` does not expose `compact`; `EnrichingPill` already supports `compact`.
- Current source labels live in `src/lib/capture/quality.ts`.

## QA Objective

Prove that the Android/mobile Library compact-card fix solves the long-title card-height problem without regressing shared Web desktop Library behavior, mobile selection, source identity, accessibility, offline/degraded behavior, or release safety.

This QA plan is scoped to the compact Library card lane. It must not bless unrelated theme, filter, search, header, bottom-nav, capture, Ask, or data-query changes.

## Evidence Labels

Use the evidence labels from `ANDROID_A0_EVIDENCE_STRATEGY_2026-06-16_08-32-30_IST.md`:

| Label | Meaning | Can close this Android card issue? |
| --- | --- | --- |
| Browser mobile only | Responsive browser route checked at Android viewport | No, pre-check only |
| Android authenticated route validated | APK/WebView checked on protected `/library` with real session | Yes |
| Android unauthenticated route validated | APK/WebView checked for public/offline routes | Only for offline fallback |
| Production live smoke | Live deployed URL checked after deploy | Required only if web deploy happens |

Completion requires `Android authenticated route validated` for `/library`.

## Scope Guardrails

Allowed implementation files from the V2 plan:

- `src/components/library-list.tsx`
- `src/components/item-enrichment-watch.tsx`
- optional `src/components/source-logo.tsx`
- `android/app/build.gradle` only if a fresh shareable APK is requested after validation

Protected files for this compact-card lane:

- `src/app/library/page.tsx`
- `src/components/mobile-library-filters.tsx`
- `src/components/sidebar.tsx`
- `src/app/search/page.tsx`
- filter option definitions and query behavior
- bottom navigation/FAB code
- data fetching, sorting, filtering, counts, and database query logic

Run this after implementation:

```bash
git diff --name-only
```

No-go if protected files appear in the diff without explicit Arun approval.

## Fixture Matrix

Use deterministic local fixtures where possible. If a seed script is added, it should use synthetic titles and URLs only and document reset/cleanup behavior.

| Fixture ID | Required data | Purpose | Expected compact-card behavior |
| --- | --- | --- | --- |
| `ALC-YT-LONG-ERROR` | YouTube or YouTube Short, very long title, `enrichment_state=error`, `capture_quality=metadata_only` | Original failure shape | Title clamps to 2 lines; compact failed pill does not force metadata beyond 2 lines |
| `ALC-ARTICLE-LONG` | Generic article, very long title, `capture_quality=full_text`, `total_chars` present | Non-YouTube long-title regression | Title clamps to 2 lines; generic icon plus text; chars hidden on mobile |
| `ALC-LINKEDIN` | LinkedIn source, normal title, metadata-only or full text | Brand source mapping | Local decorative LinkedIn mark plus readable `LinkedIn` text |
| `ALC-SUBSTACK` | Substack source, paywall preview or full text | Brand source mapping | Local decorative Substack mark plus readable `Substack` text |
| `ALC-PDF` | PDF source | Fallback source mapping | Local generic document mark plus `PDF` text |
| `ALC-NOTE` | Note source | Fallback source mapping | Local generic note mark plus `Note` text |
| `ALC-WARNING-DUP` | Metadata-only item with `youtube_antibot_metadata_only` or `youtube_transcript_fetch_metadata_only` | Duplicate warning suppression | Do not show duplicative `Metadata only` plus `metadata only` warning on mobile |
| `ALC-WARNING-DISTINCT` | Item with distinct warning such as `no_transcript` or `transcript_truncated_2h` | Useful warning preservation | Show warning only if it adds non-duplicative information |
| `ALC-PENDING` | `enrichment_state=pending` | Compact enrichment matrix | Compact queued state; metadata still within target |
| `ALC-RUNNING` | `enrichment_state=running` | Compact enrichment matrix | Compact enriching state; no title-row pill |
| `ALC-BATCHED` | `enrichment_state=batched` | Compact enrichment matrix | Compact batched state; tooltip preserved if available |
| `ALC-DONE` | `enrichment_state=done` | Compact enrichment matrix | No enrichment pill rendered |
| `ALC-SELECT-1` | Any compact card selected | Selection state | Selected style applies to mobile and desktop branch |
| `ALC-SELECT-2` | Two selected cards | BulkBar and Ask selected | Mobile BulkBar appears; Ask selected route works |

## Test Matrix

| Area | Check | Method | Evidence | Release gate |
| --- | --- | --- | --- | --- |
| Preflight | Record branch, dirty files, and implementation diff scope | `git status --short --branch`, `git diff --name-only` | Paste commands and summarized output into QA/evidence report | Block if protected files changed |
| Static | No whitespace or conflict-marker issues | `git diff --check`; `rg -n "<<<<<<<|=======|>>>>>>>" src/components` | Command output | Block on failure |
| Static | Lint passes or only unrelated pre-existing warning remains | `npm run lint` | Command output and exact warning if any | Block on new lint error |
| Static | TypeScript passes | `npm run typecheck` | Command output | Block on failure |
| Static | Unit test suite passes | `npm test` | Command output, total suites/tests | Block on failure unless clearly unrelated and documented |
| Static | Production build passes | `npm run build` | Command output | Block on failure |
| Unit/component | `ItemEnrichmentWatch` passes `compact` to `EnrichingPill` and keeps desktop default unchanged | Focused test if a testable seam is added; otherwise manual code review plus rendered evidence for states | Test output or code-review note with file/line refs | Block if compact prop is not wired |
| Unit/component | Source-logo mapping covers YouTube, YouTube Short, LinkedIn, Substack, PDF, Note, generic Article, unknown fallback | Focused helper test if `source-logo.tsx` exports a pure mapper; otherwise code review plus visual fixture matrix | Test output or code-review note | Block if any required mapping fails |
| Unit/component | Duplicate metadata-only warning is suppressed on mobile but distinct warnings remain | Focused helper test if suppression is a pure helper; otherwise visual/manual fixture check | Test output or screenshot notes | Block if duplicate warning creates extra mobile row |
| Unit/component | Mobile metadata priority hides char count and verbose capture channel | Rendered DOM/screenshot at 390 width; code review for `md` gating | Screenshot and notes | Block if chars or `via Telegram` show on compact mobile by default |
| Browser visual | Desktop `/library` before/after is visually unchanged | Capture current desktop screenshot before implementation and after at 1280x800 and 1440x900 | Screenshot paths and comparison notes | Block on unapproved desktop changes |
| Browser visual | Mobile `/library` long-title cards are compact | Browser at 390x844 and 360x800 | Screenshot paths, measured card height | Block if long cards remain tall |
| Browser visual | Mobile title row contains no source icon and no enrichment pill | DOM inspection and screenshots | Notes with expected absent elements | Block if title row has source icon/pill |
| Browser visual | Mobile metadata shows source logo plus readable text | Screenshot and DOM/text inspection | Screenshot paths | Block if logo-only or text missing |
| Browser visual | Mobile metadata stays within two visual lines | Screenshot, optional DOM measurement | Measured metadata container height/line count | Block if metadata exceeds two lines for required fixtures |
| Browser visual | Card tap opens item detail | Manual click/tap in browser mobile viewport | Route after tap | Block if navigation breaks |
| Browser interaction | From zero selection, user can select one item and then a second | Browser mobile viewport | Screenshot before/after BulkBar | Block if selection entry is hidden or broken |
| Browser interaction | Mobile BulkBar Ask selected navigates correctly | Select 1-2 items, tap Ask selected | `/ask?scope=selected&ids=...` route; no console error | Block if Ask selected breaks |
| Browser interaction | Clear selection works | Tap clear on mobile BulkBar | BulkBar disappears; selected styling cleared | Block if stale selected state remains |
| Android WebView | Fresh APK/WebView authenticated `/library` shows compact long-title cards | Build/install APK or use latest validated build only if it points to deployed code with fix | Device/emulator screenshot | Block if no Android authenticated evidence |
| Android WebView | Source logos/text appear for YouTube, LinkedIn, Substack, generic fallback | APK/WebView screenshot set | Screenshot paths | Block if logos are absent, remote-loaded, or replace text |
| Android WebView | Selection from zero and BulkBar work in APK | Tap checkbox on device/emulator | Screenshot/video notes | Block if mobile selection cannot start from zero |
| Android WebView | Bottom nav/FAB do not overlap card list or BulkBar | Device/emulator screenshot at 390-ish and a shorter/taller viewport if possible | Screenshot paths | Block on overlap |
| Android WebView | Android system font/text rendering does not break clamp/metadata | Device/emulator with default font size; optionally large font as risk check | Screenshot paths | Block if default Android rendering breaks layout |
| Accessibility | Checkbox accessible label remains `Select ${it.title}` | Browser DOM/AX inspection and manual screen-reader/TalkBack spot check | Notes | Block if checkbox has no accessible name |
| Accessibility | Logos are decorative and text label is the accessible source identity | DOM/code review: `aria-hidden` or equivalent on logos; adjacent text present | Notes | Block if logos are announced as noisy or source text missing |
| Accessibility | Touch targets remain usable | Manual touch test; checkbox target roughly 30-34px slot with visible 18-20px checkbox, BulkBar buttons at least practical mobile target | Notes/screenshots | Block if touch target is too small to operate |
| Accessibility | Keyboard and focus remain usable on desktop branch | Tab through desktop Library and BulkBar controls | Notes | Block on lost focus visibility or unreachable controls |
| Accessibility | 200% zoom/reflow has no overlap | Browser at 390x844 and desktop zoom proxy | Screenshot/notes | Block on text/control overlap |
| Performance/layout | List remains scrollable without layout thrash | Scroll 100-item Library on browser mobile and Android; observe no obvious jank | Notes | Block only on severe jank or freezes |
| Performance/layout | Card heights are bounded | Measure first long YouTube and article cards | Target 110px-150px unless documented exception | Block if cards still expand into tall blocks |
| Performance/privacy | Source logos do not trigger network requests | Static scan and browser network inspection | Scan output and Network notes | Block on CDN/remote logo fetch |
| Persistence/offline | Selection is intentionally local-only and clears on reload | Select items, reload | Notes | Informational unless current behavior changes unexpectedly |
| Persistence/offline | Theme remains light-first unless user selected dark | Use existing theme plan matrix for no-cookie/light/dark if theme files are touched by others | Notes | Block only if compact-card work regresses current approved theme behavior |
| Persistence/offline | Offline fallback still opens and does not depend on remote logos | Load `public/offline.html` or trigger APK fallback if feasible | Screenshot/notes | Block if compact-card logo assets affect offline fallback unexpectedly |
| Deployment | If web deploy happens, local release gates and deploy script pass | `BRAIN_DEPLOY_HEALTH_TOKEN_SOURCE=remote scripts/deploy.sh` only when release is approved | Deploy output, health, provider, webhook result | Block on failed deploy gates |
| Deployment | Production `/library` smoke after deploy | Authenticated live browser and Android WebView smoke | Screenshot/notes | Block if live differs from local validated behavior |
| APK publication | If a fresh APK is shared, version is bumped and artifact metadata recorded | Bump only after validation/request, run `npm run build:apk`, record path/checksum/install | APK path, version, checksum, install result | Block if version is reused for shareable artifact |

## Recommended Automated/Static Commands

Run from the project root.

```bash
git status --short --branch
git diff --name-only
git diff --check
rg -n "<<<<<<<|=======|>>>>>>>" src/components
npm run lint
npm run typecheck
npm test
npm run build
```

Remote-logo and asset hygiene scans:

```bash
rg -n "simpleicons|cdn\\.jsdelivr|unpkg|https?://|<img|next/image|fetch\\(" src/components/library-list.tsx src/components/item-enrichment-watch.tsx src/components/source-logo.tsx
rg -n "SourceIcon|SourceLogo|line-clamp-2|metadata only|total_chars|captureSourceLabel|via " src/components/library-list.tsx src/components/source-logo.tsx
```

Protected-scope check:

```bash
git diff --name-only -- src/app/library/page.tsx src/components/mobile-library-filters.tsx src/components/sidebar.tsx src/app/search/page.tsx
```

If a fresh APK is requested after browser QA passes:

```bash
# Only after versionName/versionCode are intentionally bumped for a shareable artifact.
npm run build:apk
shasum -a 256 data/artifacts/brain-debug-v1.0.7-code8.apk
adb install -r data/artifacts/brain-debug-v1.0.7-code8.apk
adb shell dumpsys package com.arunprakash.brain | rg "versionName|versionCode"
```

If the agent needs a local-only APK build that will not be shared and the artifact path already exists, use the build script's documented escape hatch:

```bash
ALLOW_REBUILD_SAME_APK_VERSION=1 npm run build:apk
```

Do not share that local-only artifact as a new APK.

## Recommended Manual Browser Checks

1. Start local app:

```bash
npm run dev -- -p 3048
```

2. Authenticate locally using the normal PIN/session path.
3. Open `/library` at desktop widths: 1280x800 and 1440x900.
4. Open `/library` at Android-like widths: 390x844, 360x800, and 412x915 if possible.
5. For the first long YouTube card and first long article card, record:
   - total card height;
   - title line count;
   - metadata line count;
   - visible source text;
   - visible source logo type;
   - whether the title row has no source icon and no enrichment pill.
6. Select one card from zero selected, select a second, tap Ask selected, then return and clear.
7. Tap a card body, confirm item detail opens.
8. Compare desktop before/after screenshots for header, search, filters, card row density, checkbox hover behavior, source icon placement, enrichment placement, and metadata richness.

## Recommended Android Manual Checks

Use the Android tooling pattern already documented in the A28 QA note:

- ADB: `/opt/homebrew/share/android-commandlinetools/platform-tools/adb`
- Emulator: `/opt/homebrew/share/android-commandlinetools/emulator/emulator`
- Known AVD: `Brain_API_36`
- Package: `com.arunprakash.brain`

Minimum Android checklist:

1. Install the validated APK.
2. Ensure the WebView points at a deployed or otherwise reachable web source that includes the compact-card fix.
3. Authenticate to the protected `/library` route.
4. Capture screenshots for:
   - long YouTube title card;
   - long generic article title card;
   - YouTube logo plus text;
   - LinkedIn logo plus text;
   - Substack logo plus text;
   - generic fallback;
   - selected one item;
   - selected multiple items with BulkBar;
   - Ask selected route after tapping BulkBar.
5. Check no bottom nav/FAB/BulkBar overlap.
6. Optionally capture a short logcat window and scan for WebView console errors or resource failures; do not stage raw logs with private data.

## Deployment Verification

Deployment is not automatically required for this QA strategy. If the main agent deploys web code or shares an APK, require a release evidence note.

For web deploy:

- run local gates first;
- run `scripts/deploy.sh` with `BRAIN_DEPLOY_HEALTH_TOKEN_SOURCE=remote`;
- record health check, provider check, webhook reachability, and live `/library` smoke;
- capture live desktop and Android WebView screenshots after deployment.

For APK publication:

- ask for explicit approval before sharing;
- bump `android/app/build.gradle` versionName/versionCode first;
- expected next version if no other build advanced is `1.0.7/code8`;
- record artifact path, SHA-256, install command, installed version, rollback artifact, and whether the old `1.0.6/code7` APK remains available.

## No-Go Gates

Do not mark the compact-card implementation complete if any of these are true:

- protected files changed without explicit approval;
- mobile compact title row includes a source icon;
- mobile compact title row includes the enrichment pill;
- mobile card shows both title-row source icon and metadata source logo;
- source logos replace text labels;
- production source logos are fetched from a remote URL/CDN;
- mobile selection cannot start from zero selected items;
- BulkBar, Clear, or Ask selected breaks;
- card tap navigation breaks;
- mobile title exceeds two lines for required long-title fixtures;
- mobile metadata exceeds two visual lines for required fixtures;
- desktop `/library` has unreviewed visual changes;
- browser responsive evidence is the only evidence for an Android-reported issue;
- a shareable APK is built without a version bump;
- private data, tokens, raw URLs, pairing codes, or raw logcat with sensitive text are staged or copied into shareable evidence.

## Highest-Risk Scenarios

1. Shared-component desktop regression: `LibraryList` powers Web and Android, so a mobile fix can quietly alter desktop row density, hover selection, metadata, or enrichment placement.
2. False Android closure: browser mobile screenshots can pass while the authenticated APK/WebView still renders tall cards or overlaps the bottom nav.
3. Width starvation remains: keeping `SourceIcon`, a wide checkbox slot, or non-compact enrichment in the mobile title row can preserve the original long-title wrapping.
4. Metadata bloat moves the problem: title clamp can pass while source, capture channel, quality, enrichment, time, chars, and warning wrap into multiple metadata rows.
5. Mobile selection regression: hiding or shrinking the checkbox too aggressively can make bulk actions undiscoverable or hard to use.
6. Logo privacy/offline regression: copying CDN logos from the throwaway prototype would create third-party network calls and offline failures.
7. Version/artifact confusion: rebuilding the same APK version can produce an installable file that looks new locally but is unsafe to share as a new private sideload candidate.

## QA Evidence Report Template

After implementation, create a separate QA/evidence report under `UX_v2/execution/` or `UX_v2/execution/qa/` with:

- branch, commit, dirty-worktree summary;
- exact files changed;
- command results for static gates;
- fixture setup and cleanup notes;
- browser desktop before/after screenshot paths;
- browser mobile screenshot paths and card measurements;
- Android APK/WebView screenshot paths and evidence label;
- source-logo asset/provenance note;
- accessibility notes;
- performance/layout notes;
- deployment/APK publication notes if applicable;
- final pass/fail and unresolved risks.
