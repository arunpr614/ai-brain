# Android Library Compact Card Technical Architecture Assessment

Created: 2026-06-17 14:24:58 IST
Role: Technical Architect sub-agent
Scope: Android Library compact card Option A V2 readiness assessment
Status: Architecture/readiness only. No production feature code implemented.

## 1. Executive Assessment

The V2 compact-card plan is architecturally sound if implemented as a strictly scoped responsive split inside `src/components/library-list.tsx`. The current production card is a single shared Web/Android row, so any implementation that "just tweaks classes" has too much blast radius. The safest target architecture is:

- keep `/library` data loading, filters, counts, search, and bulk action semantics unchanged;
- keep `LibraryList` as the owning client component for card rendering and selection state;
- render two card bodies per item: compact mobile body below `md`, preserved desktop body at `md` and above;
- move mobile source identity into a metadata source mark plus text label, with no source icon beside the title;
- pass `compact` through `ItemEnrichmentWatch` into the already-supported `EnrichingPill` compact mode;
- use only local/bundled source logo assets or local inline SVG components, never remote logo URLs;
- validate in browser first, then validate in the actual Android WebView path before calling the fix complete.

The main architectural caution: the Android APK is a thin Capacitor WebView shell pointed at `https://brain.arunp.in`. Rebuilding an APK does not by itself bundle the changed Next.js UI. Android validation must be done against the server state that contains the card change, or against a deliberately configured local/test WebView path.

## 2. Source Inputs Reviewed

- `Handover_docs/AI_MEMORY_ANDROID_LIBRARY_COMPACT_CARD_HANDOVER_2026-06-17_14-05-19_IST.md`
- `RUNNING_LOG.md`, especially entries #130 through #136
- `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md`
- `UX_v2/execution/WEB_ANDROID_LIGHT_FIRST_THEME_IMPLEMENTATION_PLAN_2026-06-17_08-31-22_IST.md`
- `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_10-39-34_IST.md`
- `UX_v2/execution/ANDROID_LIBRARY_CARD_TITLE_RCA_AND_OPTIONS_2026-06-17_10-19-11_IST.md`
- `UX_v2/execution/ANDROID_LIBRARY_SOURCE_LOGO_DRAW_RECORD_2026-06-17_10-34-59_IST.md`
- Magic Patterns mobile snapshot: `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_2026-06-16_08-32-30_IST/source/pages/MobileLibrary.tsx`
- Relevant implementation files under `src/`, `scripts/`, `android/`, and `capacitor.config.ts`

Current worktree observation: `src/components/library-list.tsx`, `src/components/item-enrichment-watch.tsx`, `src/components/enriching-pill.tsx`, `src/app/library/page.tsx`, `src/components/mobile-library-filters.tsx`, Android build files, and theme files had no local diff at inspection time. The worktree does contain unrelated modified/untracked planning files, including `RUNNING_LOG.md`; those should remain untouched by this card implementation.

## 3. Current Architecture Facts

### Library Route

`src/app/library/page.tsx` is a server component that:

- validates the session and redirects to `/unlock` when needed;
- parses source, quality, and tag filters;
- calls `listItems`, `countItems`, `countNeedsUpgradeItems`, and `listCollections`;
- renders the page header, search, `MobileLibraryFilters`, desktop filter rows, and `LibraryList`.

This file owns page-level behavior and is explicitly protected for this slice. Changing it would violate the card-only contract.

### Card And Selection Owner

`src/components/library-list.tsx` is the card renderer and client-state owner. It currently:

- keeps `selectedIds`, flash messages, and transition state locally;
- renders one shared card body for all breakpoints;
- reserves a `h-11 w-11` checkbox slot on mobile;
- renders a `SourceIcon` beside the title;
- places `ItemEnrichmentWatch` in the title row inside a `shrink-0` span;
- renders title text as `break-words text-[18px] font-medium leading-[1.55]` with no line clamp;
- renders metadata as an unconstrained wrapping row with source label, capture channel, quality, time, character count, and warning.

This matches the reported failure mode: narrow mobile title width plus no clamp plus wrapping metadata creates tall cards.

### Enrichment Status

`src/components/enriching-pill.tsx` already supports `compact?: boolean` and renders smaller text/padding for compact status. `src/components/item-enrichment-watch.tsx` currently does not expose that prop; it wraps `EnrichingPill` only to call `router.refresh()` when enrichment completes.

Architecture implication: the implementation should extend the wrapper, not duplicate enrichment UI.

### Source Identity

`src/lib/capture/quality.ts` owns `platformLabel()` and `qualityLabel()`. `CapturePlatform` in `src/lib/capture/types.ts` includes:

- `youtube`
- `youtube_short`
- `substack`
- `linkedin`
- `generic_article`
- `pdf`
- `note`

`ItemRow.source_platform` is typed as optional `string | null` in `src/db/client.ts`, so the UI helper should tolerate unknown future platform values. Existing fallback labels should be preserved unless a separate source-label cleanup is approved.

### Styling And Theme

The app uses Tailwind v4 through `src/app/globals.css` and design tokens from `src/styles/tokens.css`. `line-clamp-2` is already used in several app components and in the Magic Patterns mobile snapshot, so no new Tailwind dependency is expected.

The light-first theme plan has not yet landed in code: `src/lib/theme.ts` and `src/components/theme-bootstrap.tsx` still model `system` and OS dark preference behavior. The card implementation should stay token-based and must not quietly take on the theme refactor. QA should still inspect light and dark/current-system behavior because tokens affect card contrast and source logo legibility.

### Android Shell

`capacitor.config.ts` configures a thin WebView architecture:

- `server.url` is `https://brain.arunp.in`;
- `webDir: "public"` is only fallback/offline content;
- the APK does not bundle the Next.js UI.

`scripts/build-apk.sh` runs typecheck and Next build, runs Capacitor sync, assembles a debug APK, and blocks publishing an APK artifact if the same version filename already exists. `android/app/build.gradle` currently reports `versionName "1.0.6"` and `versionCode 7`.

Architecture implication: a fresh APK can prove shell/install behavior, but the card UI appears in Android only after the WebView reaches a server containing the updated web build.

## 4. Target Architecture

### Component Shape

Keep a single `LibraryList` component with shared selection state and shared `BulkBar`, but split item body markup by breakpoint:

```tsx
<li key={it.id} className="group/row">
  <div className="md:hidden ...">
    mobile compact card body
  </div>
  <div className="hidden md:flex ...">
    preserved desktop card body
  </div>
</li>
```

This intentionally duplicates a small amount of card markup. That duplication is preferable here because the component is shared by desktop web and Android WebView, and desktop preservation is a release gate.

### Mobile Card Body

The mobile body should own only mobile layout decisions:

- compact visible checkbox slot around 30px-34px wide;
- input checkbox remains visible and usable from zero selected items;
- content area is a `Link` to `/items/${it.id}`;
- title is full-width within the content column and uses two-line clamp;
- title row has no `SourceIcon`;
- metadata row shows source logo plus text, quality badge, compact enrichment status when not done, and relative time;
- lower-priority metadata such as `via Telegram`, character count, and duplicate metadata-only warning is hidden on narrow mobile by default;
- selected-state border/background classes are applied consistently to mobile and desktop bodies.

Recommended mobile title class baseline:

```tsx
line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--text-primary)]
```

### Desktop Card Body

The desktop body should preserve current behavior as closely as possible:

- existing `SourceIcon` may remain desktop-only;
- existing hover checkbox behavior should remain;
- existing desktop metadata richness can remain;
- current desktop source/capture/quality/time/chars/warning row can remain unless a bug is found;
- any desktop visual change must be explicitly documented and reviewed.

### Source Logo Helper

Prefer a small helper in `src/components/source-logo.tsx` if the mapping would make `library-list.tsx` noisy. Acceptable shape:

```tsx
<SourceLogo
  platform={it.source_platform}
  sourceType={it.source_type}
  className="h-3.5 w-3.5 shrink-0"
/>
```

Rules:

- no `<img src="https://...">`;
- no Simple Icons CDN;
- mark decorative logo output with `aria-hidden="true"`;
- keep adjacent text from `platformLabel()` as the accessible source identity;
- document asset provenance if exact brand SVG paths are copied from a source;
- generic icons can use `lucide-react` or local simple SVGs.

### Metadata Policy

Mobile metadata should be governed by priority, not by rendering every token:

Always show:

1. source logo plus source text;
2. `QualityBadge`;
3. `ItemEnrichmentWatch compact` if enrichment state is not `done`;
4. relative capture time.

Hide on narrow mobile by default:

- character count;
- capture channel (`via Telegram`, `via Android`, etc.);
- extraction warning when it duplicates `Metadata only` or enrichment failure.

Show only if distinct:

- warning labels such as no transcript or truncated transcript when they add information beyond the quality badge.

## 5. Code Ownership Areas

| Area | File(s) | Ownership for this slice |
| --- | --- | --- |
| Library data/page shell | `src/app/library/page.tsx` | Protected. Do not edit. |
| Mobile filter UI | `src/components/mobile-library-filters.tsx` | Protected. Do not edit. |
| Card rendering and selection | `src/components/library-list.tsx` | Primary implementation file. Owns responsive card split, mobile metadata, checkbox footprint, and desktop preservation. |
| Enrichment wrapper | `src/components/item-enrichment-watch.tsx` | Allowed minimal change: add `compact?: boolean` and pass through. |
| Enrichment pill | `src/components/enriching-pill.tsx` | No change expected. Existing compact prop should be reused. |
| Source logo | `src/components/source-logo.tsx` | Optional new helper. Use only if it keeps card code clearer. |
| Source and quality labels | `src/lib/capture/quality.ts` | Read-only for this slice unless an implementation blocker appears. |
| Theme model | `src/lib/theme.ts`, `src/components/theme-bootstrap.tsx`, `src/app/layout.tsx`, `src/styles/tokens.css` | Neighboring light-first lane. Do not fold into card work. |
| Android shell/version | `capacitor.config.ts`, `android/app/build.gradle`, `scripts/build-apk.sh` | Build/version only after validated implementation and explicit APK need. |

## 6. Integration Points

- `LibraryList` receives `ItemRow[]` and `CollectionRow[]`; no data shape change is needed.
- Selection state is local to `LibraryList`; mobile and desktop card bodies must call the same `toggle(it.id)`.
- `BulkBar` relies only on `selectedIds.size` and existing handlers; card markup changes must not break the zero-selected-to-selected flow.
- `ItemEnrichmentWatch` polls `/api/items/[id]/enrichment-status`; mobile compact layout must not create duplicate pollers for visible desktop and mobile bodies at the same viewport. Because only one branch is displayed by CSS but both bodies would mount in React, do not render `ItemEnrichmentWatch` in both branches without considering duplicate polling.
- If both mobile and desktop branches are mounted simultaneously, desktop and mobile `ItemEnrichmentWatch` instances for the same item can both poll. To avoid duplicated network traffic, either:
  - keep enrichment watch in both branches but accept the small cost for visible list size, documenting it; or
  - isolate the watch into only the visible branch through CSS plus a lightweight status strategy; or
  - factor a shared `CardEnrichmentStatus` placement carefully.

Recommended pragmatic approach: render `ItemEnrichmentWatch` in both branches only if the list size and polling interval remain acceptable, because this keeps desktop preservation simple. Flag this in QA by checking network noise on `/library` with many pending/running items. If duplicate polling looks material, main agent should refactor to avoid mounting hidden-branch pollers before release.

## 7. Critical Risks

1. Hidden desktop regression from a shared component
   `LibraryList` serves desktop web and Android. The responsive split reduces risk, but before/after desktop evidence is mandatory.

2. Duplicate enrichment polling after branch duplication
   CSS-hidden branches still mount React children. If `ItemEnrichmentWatch` exists in both mobile and desktop branch markup, each pending/running item can poll twice.

3. Android validation false positive
   Browser mobile screenshots do not prove Android WebView behavior. Also, a rebuilt APK still loads `https://brain.arunp.in`, so Android evidence must be tied to a deployed or intentionally test-routed web build.

4. Selection regression
   The checkbox is the current only mobile selection entry path. Reducing width is required, but hiding it would break bulk actions unless a select-mode interaction is built, which is out of scope.

5. Metadata bloat remains
   Title clamp alone will not fix tall cards if source, channel, quality, enrichment, time, chars, and warning all wrap into several lines.

6. Remote logo leakage
   The prototype used a CDN for visual review only. Production logos must be local/bundled and decorative, with text labels intact.

7. Theme lane collision
   The light-first implementation plan is adjacent and not yet reflected in code. Card styling should use existing tokens and should not change theme behavior in this slice.

8. Worktree collision
   The repo has many untracked planning artifacts and modified docs. Main implementation should avoid broad formatting, generated-file churn, or edits outside the allowed files.

## 8. Test Strategy

### Static/Build Gates

Run after implementation:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If a gate fails for a pre-existing reason, record exact failure output in the QA note and assess whether it touches the card path.

### Focused DOM/Behavior Checks

At minimum, manually or with a browser automation harness verify:

- mobile title element has a two-line clamp and does not exceed two rendered lines;
- mobile title row contains no source icon;
- mobile metadata contains logo plus text label;
- mobile metadata does not render a duplicate metadata-only warning beside a `Metadata only` badge;
- mobile checkbox can select from zero selected items;
- selecting two items shows mobile `BulkBar`;
- `Ask selected` route still receives selected ids;
- card tap navigates to item detail;
- clear selection works;
- desktop card retains source icon/title/enrichment layout.

### Fixture Coverage

Use existing UX seed scripts where useful, but add temporary QA data or a narrow fixture if needed to cover all required source/logo cases. Required scenarios:

- very long YouTube title with `enrichment_state = "error"`;
- very long generic article title;
- LinkedIn source;
- Substack source;
- PDF source;
- Note source;
- `metadata_only`;
- `full_text` or `transcript`;
- warning that duplicates metadata-only;
- warning that adds distinct information;
- selected and multi-selected states.

Existing seed coverage is partial:

- `scripts/ux-v2-seed-library-search-topics-collections.ts` covers generic article, note, YouTube, PDF, weak YouTube, and a long-title stress item.
- `scripts/ux-v2-seed-android-a2-capture-repair-needs-upgrade.ts` includes a Substack preview in one scenario.
- A LinkedIn-specific card fixture still appears necessary.

### Visual Evidence

Capture before/after evidence:

- desktop `/library` at a desktop width;
- mobile-width `/library` at Android-like width, such as 390x844 or matching the reported 738x1600 screenshot scale;
- selected mobile card and mobile `BulkBar`;
- Android WebView/APK screenshot showing long title cards and source logo labels.

Recommended measurable gates:

- first long-title mobile card title is two lines maximum;
- long-title mobile card height is roughly 110px-150px unless a documented state justifies exception;
- metadata area is no more than two visual lines;
- no overlap with fixed bottom navigation or the mobile bulk bar.

### Accessibility Checks

- checkbox keeps `aria-label={`Select ${it.title}`}`;
- source logos are decorative and paired with readable text;
- interactive controls are not nested inside `Link`;
- focus ring remains visible;
- mobile checkbox target remains usable despite the narrower visual footprint;
- selected state is visible in light and dark/current-system themes.

## 9. Rollout And Deployment Constraints

1. Browser implementation and QA come first.
2. If the card change needs production Android WebView validation, the web build containing the change must be available at the WebView URL or through a deliberate test routing setup.
3. `npm run build:apk` is useful for shell validation, but the APK points at the live server and does not bundle the Next.js UI.
4. Do not bump `android/app/build.gradle` until a fresh private sideload APK is actually needed.
5. If a shareable APK is produced, current expected next version is `1.0.7/code8` unless another lane advances it first.
6. `scripts/build-apk.sh` blocks publishing over an existing same-version artifact; this is intentional release discipline.
7. If deploying web to production, use the existing deploy path and release gates in `scripts/deploy.sh`; do not bypass provider, health, or Telegram reachability checks if production is touched.

## 10. Likely Implementation Sequence

1. Reconfirm git status and verify allowed source files are clean or understand any new user edits.
2. Capture desktop and mobile browser baseline screenshots/notes for `/library`.
3. Add `compact?: boolean` to `ItemEnrichmentWatch` and pass it to `EnrichingPill`.
4. Add `SourceLogo` locally, either inline in `library-list.tsx` or as `src/components/source-logo.tsx`.
5. In `LibraryList`, keep shared selection helpers and `BulkBar`, then split item body into `md:hidden` mobile and `hidden md:flex` desktop bodies.
6. Keep desktop body structurally close to the current card.
7. Build mobile body:
   - compact checkbox slot;
   - two-line clamped title;
   - no title-row source icon;
   - source logo plus source text;
   - quality, compact enrichment, time;
   - metadata warning only when distinct.
8. Check hidden-branch enrichment polling impact; adjust if duplicate polling is more than a minor cost.
9. Run local gates.
10. Capture browser desktop/mobile evidence and update a QA evidence note.
11. Only after browser evidence passes, perform Android WebView validation against a server containing the change.
12. Only after Android validation and explicit need, bump APK version and build a private sideload artifact.

## 11. Recommended Implementation Slices

Slice 1: Wrapper and logo foundation
Files: `src/components/item-enrichment-watch.tsx`, optional `src/components/source-logo.tsx`.
Goal: compact prop pass-through and production-safe local source logo mapping. Low blast radius.

Slice 2: Responsive card split with desktop preservation
File: `src/components/library-list.tsx`.
Goal: duplicate the current body into a desktop branch, then add a mobile branch without changing page data or filters. Commit/checkpoint should show desktop branch is intentionally preserved.

Slice 3: Mobile compact metadata and selection behavior
File: `src/components/library-list.tsx`.
Goal: reduce checkbox slot, clamp title, move source identity/status below title, and enforce metadata priority rules.

Slice 4: QA/evidence and Android validation
Files: documentation/evidence only at first.
Goal: screenshot/measurement report, browser gates, Android WebView proof. Build/version APK only if requested.

## 12. First Code Paths For Main Agent To Inspect

1. `src/components/library-list.tsx`
   Primary implementation surface. Inspect current card body, checkbox slot, title/enrichment row, metadata row, and `BulkBar`.

2. `src/components/item-enrichment-watch.tsx`
   Small wrapper that needs `compact?: boolean`.

3. `src/components/enriching-pill.tsx`
   Confirm compact behavior before changing anything; no edit expected.

4. `src/lib/capture/quality.ts`
   Source and quality label behavior. Use `platformLabel()` rather than inventing new labels in the card.

5. `src/db/client.ts` and `src/lib/capture/types.ts`
   Confirm source/platform and enrichment state shapes.

6. `src/app/library/page.tsx` and `src/components/mobile-library-filters.tsx`
   Inspect only to respect boundaries. Do not edit.

7. `capacitor.config.ts`, `scripts/build-apk.sh`, `android/app/build.gradle`
   Inspect before Android validation or APK build/version decisions.

8. `src/lib/theme.ts`, `src/components/theme-bootstrap.tsx`, `src/styles/tokens.css`
   Inspect only for theme context. Do not implement light-first theme in the card slice.

## 13. No-Go Gates

Do not mark the implementation complete if any of the following are true:

- `src/app/library/page.tsx` or `src/components/mobile-library-filters.tsx` changed without explicit new approval;
- mobile title row still includes a source icon;
- mobile card shows both title-row source icon and metadata source logo;
- source logos are remote/CDN-loaded;
- logo replaces text label instead of accompanying it;
- mobile selection cannot start from zero selected items;
- mobile `BulkBar` or `Ask selected` breaks;
- hidden desktop branch creates unacceptable duplicate enrichment polling;
- mobile metadata wraps beyond two visual lines for required fixtures;
- desktop `/library` has unreviewed visual changes;
- validation stops at browser responsive screenshots and lacks Android WebView/APK evidence for the Android-reported issue.

## 14. Readiness Verdict

Ready for main-agent implementation after this architecture assessment, provided the main agent respects the V2 allowed-files contract and treats Android evidence as mandatory. The highest-risk implementation detail is not the title clamp; it is preserving shared-component behavior while changing only mobile card anatomy and avoiding hidden duplicate pollers.
