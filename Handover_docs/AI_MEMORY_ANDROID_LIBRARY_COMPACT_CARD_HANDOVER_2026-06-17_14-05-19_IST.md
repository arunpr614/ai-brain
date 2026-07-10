# AI Memory Android Library Compact Card Handover

Created: 2026-06-17 14:05:19 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Branch observed: `codex/ai-brain-ux-v2-execution` tracking `origin/codex/ai-brain-ux-v2-execution`
Latest observed commit: `da598fd` (`Build private sideload debug APK`)
Current handover scope: Android Library card compact-layout issue, source-logo treatment, and V2 implementation plan.
Production code changed for this issue: **No**
APK rebuilt for this issue: **No**
Web deployed for this issue: **No**

## Executive Summary

Arun reported a severe Android Library UX issue: long Library card titles expand cards into very tall blocks, making the list hard to scan. The issue was analyzed from two Android screenshots, the current `LibraryList` implementation, and the Magic Patterns mobile source. Option A, a compact Magic Patterns-aligned card, was selected. A first implementation plan was created, then expanded with tiny source logos for YouTube, LinkedIn, and Substack. An adversarial review found the first plan unsafe as written. A revised V2 implementation plan now exists and is the only plan the next agent should execute.

No production source code has been changed for the compact-card issue. The next agent should start by reading the V2 plan and implementing it carefully.

The current source-of-truth implementation plan is:

`UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md`

The old V1 plan is superseded and must not be used for execution except as historical context.

## Current User Intent

Arun wants:

- Android Library cards to stop expanding into huge/tall cards when titles are long.
- Option A compact card layout.
- No changes to Library filters, filter visual design, search, header, action buttons, bottom navigation, or broader page design.
- Tiny source logos inside Library cards:
  - YouTube logo plus `YouTube` text.
  - LinkedIn logo plus `LinkedIn` text.
  - Substack logo plus `Substack` text.
  - Generic fallback logo/icon plus existing text for all other sources.
- Text labels must remain; do not use logo-only source identity.
- Implementation must follow the V2 plan and address the adversarial review.
- After implementation and QA, a fresh Android private sideload APK may be needed. If built, version should be bumped before sharing.

## What Is Already Implemented

### Completed Before This Card-Issue Lane

The broader UX v2 work already has a pushed source/docs commit:

- Commit: `da598fd` (`Build private sideload debug APK`)
- Branch: `codex/ai-brain-ux-v2-execution`
- Pushed to `origin/codex/ai-brain-ux-v2-execution`

Current private sideload APK candidate from previous work:

- Local artifact: `data/artifacts/brain-debug-v1.0.6-code7.apk`
- Size: approximately 7.5 MiB
- `android/app/build.gradle` currently reports:
  - `versionName "1.0.6"`
  - `versionCode 7`

This APK predates the compact-card work and does **not** include any fix for the Library card title issue.

### Completed In This Card-Issue Lane

The following artifacts were created. They are planning/prototype/review artifacts only; they do not change app behavior.

1. RCA and option report:

   `UX_v2/execution/ANDROID_LIBRARY_CARD_TITLE_RCA_AND_OPTIONS_2026-06-17_10-19-11_IST.md`

   Key finding: the current mobile card uses a desktop-like row layout. Title width is squeezed by checkbox space, source icon, gaps, and a `shrink-0` enrichment pill. Title typography is `18px` with loose line-height and no clamp, causing long titles to wrap almost word-by-word.

2. Throwaway option prototype:

   `UX_v2/execution/prototypes/android-library-card-options-2026-06-17_10-19-11_IST.html`

   Shows:
   - Option A: compact Magic Patterns-aligned card.
   - Option B: status-first two-tier card.
   - Option C: dense inbox row.

   Arun selected Option A.

3. Initial Option A implementation plan:

   `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_2026-06-17_10-29-08_IST.md`

   This is superseded. Do not execute it directly.

4. Source-logo addendum and visual draw record:

   Markdown:

   `UX_v2/execution/ANDROID_LIBRARY_SOURCE_LOGO_DRAW_RECORD_2026-06-17_10-34-59_IST.md`

   Prototype:

   `UX_v2/execution/prototypes/android-library-source-logo-draw-record-2026-06-17_10-34-59_IST.html`

   Important caveat: the throwaway prototype uses Simple Icons CDN for visual review only. Production must not fetch logos from a CDN or any remote URL.

5. Adversarial review of the initial plan:

   `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_10-39-34_IST.md`

   Verdict: conditional no-go for V1 as written.

6. Revised V2 implementation plan:

   `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md`

   This is the plan to execute next.

7. Running log updated:

   `RUNNING_LOG.md`

   Entries #130 through #135 record this lane:
   - #130: RCA and prototype options created.
   - #131: Option A implementation plan created.
   - #132: source-logo addendum added.
   - #133: source-logo draw record created.
   - #134: adversarial review completed.
   - #135: V2 implementation plan created.

## What Is Not Implemented Yet

Nothing from the compact-card V2 plan has been implemented in production code yet.

Pending code work:

- `src/components/library-list.tsx`
  - Add mobile compact card branch.
  - Preserve protected desktop branch.
  - Remove mobile title-row source icon.
  - Clamp mobile title to two lines.
  - Add source logo plus text in mobile metadata.
  - Add compact visible mobile checkbox slot.
  - Add metadata overflow priority rules.

- `src/components/item-enrichment-watch.tsx`
  - Add optional `compact?: boolean`.
  - Pass `compact` through to `EnrichingPill`.

- Optional:
  - `src/components/source-logo.tsx`
  - Use only if cleaner than putting local tiny logo components in `library-list.tsx`.

- Only after implementation and QA, and only if a new APK is requested:
  - `android/app/build.gradle`
  - Expected next private APK version, if no other version has advanced first: `1.0.7/code8`.

Pending documentation/evidence work:

- Create a QA/evidence report in `UX_v2/execution/` after implementation.
- Include desktop/mobile browser evidence and Android WebView/APK evidence.

Pending release work:

- No new web deploy is currently required for this planning handover.
- No APK should be shared until implementation and Android evidence pass.

## Immediate Start Here

The next agent should do this first:

1. Read:

   `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md`

2. Read the adversarial review to understand why V2 exists:

   `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_10-39-34_IST.md`

3. Inspect current implementation:

   `src/components/library-list.tsx`

   Current relevant behavior:
   - Checkbox reserves `h-11 w-11`.
   - `SourceIcon` appears beside the title.
   - Title uses `break-words text-[18px] font-medium leading-[1.55]`.
   - `ItemEnrichmentWatch` is in the title row and wrapped in a `shrink-0` span.
   - Metadata row wraps many tokens.

4. Inspect enrichment wrapper:

   `src/components/item-enrichment-watch.tsx`

   Current issue:
   - It does not accept `compact`.

5. Inspect enrichment pill:

   `src/components/enriching-pill.tsx`

   Important existing capability:
   - `EnrichingPill` already supports `compact`.

6. Implement V2 exactly. Do not revive V1 decisions.

## Critical Implementation Contract

### Allowed Files

Allowed production files:

- `src/components/library-list.tsx`
- `src/components/item-enrichment-watch.tsx`
- optional `src/components/source-logo.tsx`

Allowed only after implementation is validated and a fresh APK is requested:

- `android/app/build.gradle`

### Protected Files

Do not edit:

- `src/app/library/page.tsx`
- `src/components/mobile-library-filters.tsx`
- `src/components/sidebar.tsx`
- `src/app/search/page.tsx`
- filter option definitions
- filter query behavior
- bottom navigation/FAB code
- data fetching, sorting, filtering, item counts, or database query logic

This is important because Arun explicitly said: do not change filters or designs outside the card layout.

## V2 Design Decisions To Preserve

### Responsive Branching

Use two card bodies inside `LibraryList`:

- Mobile compact body: `md:hidden`
- Desktop body: `hidden md:flex`

Reason:

- `LibraryList` is shared by Android WebView and web.
- The adversarial review found desktop blast-radius risk.
- The desktop card must remain visually close to current behavior.

### Mobile Title Row

Mobile title row must not include:

- `SourceIcon`
- `ItemEnrichmentWatch`
- right-side source/status pill

Mobile title should be:

- `line-clamp-2`
- `text-[15px]`
- `font-semibold`
- `leading-snug`

### Source Logo Placement

Mobile source identity appears in metadata only:

```tsx
<span className="inline-flex min-w-0 items-center gap-1.5">
  <SourceLogo platform={it.source_platform} type={it.source_type} />
  <span>{platformLabel(it.source_platform, it.source_type)}</span>
</span>
```

Do not show both:

- title-row `SourceIcon`
- metadata `SourceLogo`

That duplication is a no-go.

### Source Logo Mapping

Use local/bundled production assets only.

Mapping:

- YouTube:
  - `source_platform === "youtube"`
  - `source_platform === "youtube_short"`
  - fallback `source_type === "youtube"`
  - text remains `YouTube` or `YouTube Short`

- LinkedIn:
  - `source_platform === "linkedin"`
  - text remains `LinkedIn`

- Substack:
  - `source_platform === "substack"`
  - text remains `Substack`

- Other URL/article:
  - generic local globe/source icon
  - existing text label

- PDF:
  - generic local document/source icon
  - `PDF`

- Note:
  - generic local note/source icon
  - `Note`

No remote logo fetches. Do not copy the CDN behavior from the throwaway prototype.

### Mobile Selection

Decision from V2:

- Keep selection visible on mobile.
- Do not hide the checkbox in default mobile browsing.
- Do not add long-press select mode in this slice.
- Reduce checkbox footprint from current `w-11` to a compact visible slot around 30px-34px wide.
- Preserve:
  - `aria-label={`Select ${it.title}`}`
  - click propagation stop on the checkbox/label.

Acceptance:

- From zero selected items, the user can select one item, select a second item, see BulkBar, clear selection, and use Ask selected.

### Metadata Priority

Always show on compact mobile:

1. source logo + source text;
2. quality badge;
3. enrichment status if not done;
4. relative time.

Show warning only if it adds information not already shown.

Hide on narrow mobile by default:

- character count;
- verbose capture channel such as `via Telegram`.

Desktop can continue showing full metadata.

No-go:

- Mobile metadata wraps beyond two visual lines for the long-title fixtures.

### Enrichment Status

`EnrichingPill` already supports `compact`, but `ItemEnrichmentWatch` does not pass it yet.

Implement:

```tsx
export function ItemEnrichmentWatch({
  itemId,
  initialState,
  compact = false,
}: {
  itemId: string;
  initialState: "pending" | "running" | "batched" | "done" | "error";
  compact?: boolean;
}) {
  ...
  return <EnrichingPill ... compact={compact} />;
}
```

Use compact mode only in mobile metadata. Desktop should keep the current default.

## Suggested Implementation Steps

1. Add local `SourceLogo` handling.
   - Either inline small components in `library-list.tsx` or create `src/components/source-logo.tsx`.
   - Add provenance comments for brand marks.
   - Do not add runtime external URLs.

2. Extend `ItemEnrichmentWatch` to accept `compact?: boolean`.

3. In `LibraryList`, preserve the current desktop markup inside a `hidden md:flex` card body.

4. Add a new mobile compact body with `md:hidden`.

5. Apply selected-state classes to both mobile and desktop bodies.

6. In the mobile branch:
   - use compact visible checkbox slot;
   - render title alone;
   - render metadata with source logo + text;
   - call `ItemEnrichmentWatch compact`;
   - hide char count and verbose capture channel by default;
   - suppress duplicate metadata-only warnings.

7. Run local code gates.

8. Capture evidence.

9. Only after evidence passes, decide whether to bump version and build APK.

## Validation Checklist

Run code gates:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Browser evidence required:

- Desktop `/library` before/after.
- Mobile-width `/library` before/after.
- Mobile selected state.
- Mobile BulkBar state.

Android evidence required before done:

- Build Android debug APK.
- Install on emulator or device.
- Capture Android Library screenshots showing:
  - long YouTube title;
  - long generic article title;
  - YouTube logo + text;
  - LinkedIn logo + text;
  - Substack logo + text;
  - generic fallback source;
  - selected state;
  - BulkBar state.

If a fresh private APK is prepared for Arun, bump version first. Current known version before this work is `1.0.6/code7`; expected next if no other version advances first is `1.0.7/code8`.

## Required Fixtures

Use real or seeded items covering:

- Long YouTube title with enrichment error.
- Long generic article title.
- LinkedIn source.
- Substack source.
- PDF source.
- Note source.
- Metadata-only quality.
- Full-text quality.
- Extraction warning that duplicates metadata-only.
- Extraction warning that adds distinct information.
- Total chars present.
- Selected item state.
- Multiple selected items with BulkBar.

## No-Go Gates

Do not ship or share APK if:

- filters/search/header/action buttons/bottom nav changed;
- `src/components/mobile-library-filters.tsx` changed;
- mobile compact title row includes a source icon;
- mobile card shows both title-row source icon and metadata source logo;
- logos replace text labels;
- production source logos are remote/CDN loaded;
- mobile checkbox selection cannot begin from zero selected items;
- BulkBar breaks;
- card tap navigation breaks;
- metadata wraps beyond two visual lines for required long-title fixtures;
- desktop `/library` has unreviewed visual changes;
- validation is browser-only with no Android WebView/APK evidence.

## Current Worktree State

Observed branch:

```text
codex/ai-brain-ux-v2-execution...origin/codex/ai-brain-ux-v2-execution
```

Tracked dirty files observed:

```text
M RUNNING_LOG.md
M docs/plans/v0.6.5-telegram-capture-PRD.md
M docs/plans/v0.6.5-telegram-capture.md
```

The two Telegram docs are unrelated to this compact-card lane. Do not revert or stage them unless the user explicitly asks.

Many historical UX v2 files are untracked in this worktree. Do not clean or reset the tree. Treat unrelated untracked files as existing project artifacts unless the user explicitly asks for cleanup.

New local artifacts from this compact-card lane include:

```text
UX_v2/execution/ANDROID_LIBRARY_CARD_TITLE_RCA_AND_OPTIONS_2026-06-17_10-19-11_IST.md
UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_2026-06-17_10-29-08_IST.md
UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_10-39-34_IST.md
UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md
UX_v2/execution/ANDROID_LIBRARY_SOURCE_LOGO_DRAW_RECORD_2026-06-17_10-34-59_IST.md
UX_v2/execution/prototypes/android-library-card-options-2026-06-17_10-19-11_IST.html
UX_v2/execution/prototypes/android-library-source-logo-draw-record-2026-06-17_10-34-59_IST.html
```

This handover file is also new:

```text
Handover_docs/AI_MEMORY_ANDROID_LIBRARY_COMPACT_CARD_HANDOVER_2026-06-17_14-05-19_IST.md
```

## Repository And Commit Guidance

Do not stage everything.

When eventually committing this lane, likely safe staged set after implementation will include only:

- V2 plan and review/prototype docs if the user wants planning artifacts committed.
- `src/components/library-list.tsx`
- `src/components/item-enrichment-watch.tsx`
- optional `src/components/source-logo.tsx`
- QA/evidence markdown created after implementation.
- `android/app/build.gradle` only if a new APK version is built.

Do not stage:

- unrelated Telegram docs;
- ignored APK binaries under `data/artifacts/`;
- keystores;
- databases;
- `.env` files;
- broad historical untracked UX package folders unless explicitly requested.

## Broader Project State To Preserve

From prior running-log entries:

- Web UX v2 was production deployed and smoke-tested earlier.
- Android private sideload debug APK `1.0.6/code7` was built and validated for fresh install.
- Public/store distribution remains not authorized.
- Current card lane is not deployed and not included in `1.0.6/code7`.

Do not claim the overall project goal is complete. The current lane still needs implementation and QA.

## Process Notes

The original user asked for a rigorous project process:

- PRD creation.
- Adversarial review.
- Revised PRD v2.
- Implementation plan.
- Adversarial review.
- Revised implementation plan v2.
- Execution.
- QA.
- Production or APK release as appropriate.
- Running-log updates at milestones.

For this compact-card lane, the completed artifacts are:

- RCA/options report.
- Throwaway prototypes.
- Implementation plan V1.
- Adversarial review.
- Implementation plan V2.

There is no dedicated PRD v1/v2 for this specific micro-feature yet. If strict governance is required before code, create a lightweight PRD and adversarial review before implementation. If Arun accepts V2 as sufficient, proceed with implementation from V2.

## Recommended Next Agent First Message To Arun

Suggested concise status:

```text
I have the V2 compact-card plan and handover. I will implement only the Library card changes: mobile compact branch, source logos in metadata, visible compact selection, protected desktop, and Android evidence before completion. I will not touch filters/search/header/bottom nav.
```

Then proceed to implementation if Arun confirms or if the thread context clearly authorizes execution.

## Final Pickup Checklist

Before touching code:

- [ ] Read this handover.
- [ ] Read the V2 plan.
- [ ] Read the adversarial review.
- [ ] Inspect `src/components/library-list.tsx`.
- [ ] Inspect `src/components/item-enrichment-watch.tsx`.
- [ ] Confirm no latest user message changed scope.
- [ ] Keep filters and desktop protected.

During implementation:

- [ ] Use mobile/desktop branches.
- [ ] Remove mobile title-row source icon.
- [ ] Keep mobile checkbox visible.
- [ ] Add local source logos only.
- [ ] Add compact enrichment pass-through.
- [ ] Apply metadata priority rules.

Before claiming done:

- [ ] Run lint/typecheck/test/build.
- [ ] Capture desktop before/after evidence.
- [ ] Capture mobile browser evidence.
- [ ] Build/install Android APK or otherwise capture Android WebView evidence as required by V2.
- [ ] Create QA/evidence markdown.
- [ ] Update running log.

## End State Expected After The Next Implementation Agent

The next agent should leave the project in this state:

- Android Library compact cards no longer explode vertically with long titles.
- YouTube/LinkedIn/Substack source logos appear in compact mobile cards with readable text.
- Generic source fallback appears for other sources.
- Desktop Library is unchanged or any changes are explicitly documented and accepted.
- Filters/search/header/bottom nav are unchanged.
- Android WebView/APK screenshots prove the fix.
- If a new APK is produced, version is bumped and install notes/checksum are documented.
