# Android Library Compact Card Option A Implementation Plan

Created: 2026-06-17 10:29:08 IST
Status: Implementation plan only. No production code changed in this step.
Decision: Implement Option A from the Android Library card prototype.
User constraint: Do not change filters, search, page header, action buttons, bottom navigation, or broader Library screen design. Only change the Library item card layout.
Addendum: include a tiny source logo inside each Library card for YouTube, LinkedIn, and Substack, while still showing the readable source text. Use a generic fallback logo/icon for every other source.

## 1. Objective

Fix the Android Library card height problem by converting the repeated item card to a compact, Magic Patterns-aligned layout:

- title is readable but limited to two lines;
- title receives enough horizontal width;
- enrichment/status chips no longer sit in the title row on mobile;
- a tiny source logo helps identify YouTube, LinkedIn, and Substack without replacing the text label;
- checkbox/selection affordance does not permanently steal width in the normal browsing state;
- card remains tappable and visually consistent with the existing light Android design.

The goal is a focused card-layout repair, not a redesign of the Library screen.

## 2. Source Inputs

- RCA report: `UX_v2/execution/ANDROID_LIBRARY_CARD_TITLE_RCA_AND_OPTIONS_2026-06-17_10-19-11_IST.md`
- Throwaway prototype: `UX_v2/execution/prototypes/android-library-card-options-2026-06-17_10-19-11_IST.html`
- Production card source: `src/components/library-list.tsx`
- Magic Patterns mobile reference snapshot: `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_2026-06-16_08-32-30_IST/source/pages/MobileLibrary.tsx`
- Supplied Android screenshots:
  - `/Users/arun.prakash/Downloads/WhatsApp Unknown 2026-06-17 at 10.13.14/WhatsApp Image 2026-06-17 at 10.12.25 (1).jpeg`
  - `/Users/arun.prakash/Downloads/WhatsApp Unknown 2026-06-17 at 10.13.14/WhatsApp Image 2026-06-17 at 10.12.25.jpeg`

## 3. Explicit Non-Goals

Do not change:

- Library page header.
- `13 need upgrade` button.
- Capture button.
- Search input.
- Filter card or filter behavior.
- Source/quality filter chip design.
- Bottom navigation.
- Floating Capture button.
- Filter logos/icons, filter labels, or filter behavior.
- Desktop Library page layout beyond what is needed to keep the shared component stable.
- Data fetching, sorting, filtering, or item counts.
- Enrichment API behavior.
- APK version/build in the implementation-plan step.

## 4. Current Root Cause To Address

The current card in `src/components/library-list.tsx` uses a desktop-like horizontal structure on mobile:

- the card row reserves width for the checkbox;
- the source icon reserves width;
- the title and `ItemEnrichmentWatch` share one row;
- the enrichment pill is `shrink-0`;
- the title uses `break-words text-[18px] font-medium leading-[1.55]`;
- the title has no line clamp.

On a narrow Android viewport, this forces long titles into a narrow column and they wrap almost word-by-word, creating very tall cards.

## 5. Target UX Behavior

### Default Mobile Browsing State

- Each card should remain compact and scannable.
- Title should use `line-clamp-2`.
- Title should use mobile-first typography close to Magic Patterns:
  - `text-[15px]`;
  - `font-semibold`;
  - `leading-snug`.
- Source icon can remain visible but must not force the title into a narrow column.
- Source identity should be shown as tiny logo plus text, for example YouTube logo + `YouTube`.
- YouTube, LinkedIn, and Substack get recognizable tiny brand logos.
- All other sources use one generic source logo/icon, not a new custom logo per platform.
- `enrichment failed` remains visible, but below the title as a compact chip/status row.
- Quality badge, source/capture metadata, relative time, chars, and warning should remain visible but compact.
- Checkbox should not permanently reserve a large 44px column in normal browse mode.

### Selection State

- When any item is selected, selection affordances should become visible and usable.
- Touch target for selection should remain large enough when selection mode is active.
- Selected card visual state should remain clearly visible.
- BulkBar behavior should remain unchanged.

### Desktop / Wider Viewports

- Keep desktop behavior visually close to the current implementation.
- Avoid regressing hover selection visibility on desktop.
- If a single shared card structure is used, ensure it does not make desktop cards look underpowered or cramped.

## 6. Implementation Strategy

### Step 1 - Isolate The Card Change

Target file:

- `src/components/library-list.tsx`

Do not edit the parent Library page unless implementation reveals a card-only blocker. In particular, do not edit:

- `src/app/library/page.tsx` for filters/search/header;
- filter components;
- navigation components;
- bottom navigation components.

### Step 2 - Restructure The Mobile Card Internals

Current high-level structure:

```tsx
<div className="flex items-start gap-3 ... p-4">
  <label className="h-11 w-11 ...">checkbox</label>
  <Link className="flex min-w-0 flex-1 items-start gap-3">
    <SourceIcon />
    <div>
      <div className="flex items-start justify-between gap-3">
        <h2>title</h2>
        <ItemEnrichmentWatch />
      </div>
      <metadata />
    </div>
  </Link>
</div>
```

Target mobile behavior:

```tsx
<div className="rounded-lg border ... p-3.5 sm:p-4">
  <div className="flex items-start gap-3">
    <selection-control-only-when-needed />
    <Link className="min-w-0 flex-1">
      <div className="flex items-start gap-2">
        <SourceIcon />
        <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug ...">
          title
        </h2>
      </div>
      <status-and-metadata-below-title />
    </Link>
  </div>
</div>
```

Important: the enrichment pill must not be in the same row as the title on mobile.

### Step 3 - Update Title Typography And Wrapping

Replace mobile title treatment:

```tsx
break-words text-[18px] font-medium leading-[1.55]
```

with mobile-first compact treatment:

```tsx
line-clamp-2 text-[15px] font-semibold leading-snug
```

Recommended responsive class:

```tsx
line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--text-primary)] sm:text-[18px] sm:font-medium sm:leading-[1.45]
```

If desktop should still show more of the title, use:

```tsx
line-clamp-2 sm:line-clamp-none
```

Decision for implementation: prefer `line-clamp-2` on mobile and keep desktop close to current behavior if visual QA confirms it remains clean.

### Step 4 - Move Enrichment Status Below Title On Mobile

Current issue:

- `ItemEnrichmentWatch` is inside a `justify-between` title row.
- The pill is `shrink-0`.
- This steals title width.

Target:

- On mobile, render `ItemEnrichmentWatch` inside the metadata/status block below the title.
- Use a compact row with wrapping enabled.
- On desktop, either:
  - keep it below title for consistency; or
  - use responsive classes to preserve the existing right-side title-row placement.

Recommended low-risk implementation:

- Move `ItemEnrichmentWatch` below the title for all viewports first.
- Validate desktop. If desktop feels worse, add responsive layout split.

### Step 5 - Adjust Checkbox Width Reservation

Current issue:

- checkbox label uses `h-11 w-11` on mobile even when no item is selected.

Target:

- In default mobile browse mode, avoid reserving a wide checkbox column.
- When `anySelected` is true, show a clear 44px selection target.
- On desktop, preserve current hover-to-reveal behavior.

Possible implementation:

```tsx
className={`${
  anySelected
    ? "inline-flex h-11 w-11 opacity-100"
    : "hidden sm:inline-flex sm:h-11 sm:w-11 sm:opacity-0 sm:group-hover/row:opacity-100"
} ...`}
```

Accessibility note:

- If the checkbox is hidden on mobile default browse mode, selection still needs an entry path.
- Existing tap opens the item, so bulk selection may depend on desktop hover today.
- If no mobile long-press/select mode exists, keep a smaller visible checkbox target on mobile instead of fully hiding it.

Implementation decision gate:

1. Inspect whether mobile currently has a long-press or select-mode affordance for LibraryList.
2. If yes, hide checkbox until select mode/any selected.
3. If no, use a compact always-visible control such as `w-7` visual width with a 44px touch target only around the checkbox, and verify it does not recreate the title squeeze.

### Step 6 - Compact Metadata And Status Hierarchy

Preserve existing information:

- platform label;
- capture source label;
- quality badge;
- relative capture time;
- total chars;
- extraction warning;
- enrichment state.

Change hierarchy only:

- row 1: title;
- row 2: source logo + source text, capture channel, quality, enrichment status;
- row 3 only if needed: warning or overflow metadata.

Avoid equal emphasis for multiple negative labels:

- `enrichment failed` should remain visible;
- `metadata only` quality remains visible;
- extraction warning remains visible if present;
- do not make all three compete with title at the same visual weight.

### Step 6A - Add Tiny Source Logo Treatment

Current state:

- `SourceIcon` maps only `source_type` to generic lucide icons:
  - `youtube` -> video icon;
  - `url` -> globe;
  - `pdf` -> file;
  - fallback -> note.
- `platformLabel(it.source_platform, it.source_type)` already provides readable source text such as `YouTube`, `LinkedIn`, and `Substack`.

Target:

- Add a tiny logo next to the existing source text in the card metadata row.
- Keep the text label. Do not replace text with logo-only UI.
- Use logo size around `14px` to `16px`, aligned to the text baseline.
- Keep the logo visually secondary; it should help scanning, not dominate the title.

Suggested component:

```tsx
function SourceLogo({
  platform,
  type,
}: {
  platform: string | null | undefined;
  type: string;
}) {
  const key = platform ?? type;
  if (key === "youtube" || key === "youtube_short") return <YouTubeTinyLogo />;
  if (key === "linkedin") return <LinkedInTinyLogo />;
  if (key === "substack") return <SubstackTinyLogo />;
  return <GenericSourceLogo type={type} />;
}
```

Preferred placement:

```tsx
<span className="inline-flex min-w-0 items-center gap-1.5">
  <SourceLogo platform={it.source_platform} type={it.source_type} />
  <span>{platformLabel(it.source_platform, it.source_type)}</span>
</span>
```

Logo mapping:

| Source | Detection key | Logo treatment | Text still shown |
| --- | --- | --- | --- |
| YouTube | `source_platform = youtube` or `youtube_short`; fallback `source_type = youtube` | tiny red play mark | Yes, `YouTube` or `YouTube Short` |
| LinkedIn | `source_platform = linkedin` | tiny blue LinkedIn mark | Yes, `LinkedIn` |
| Substack | `source_platform = substack` | tiny orange Substack mark | Yes, `Substack` |
| Other URL/article | `generic_article`, `url`, unknown URL platform | generic source/globe mark | Yes, existing platform/type label |
| PDF | `source_type = pdf` | generic document/source mark | Yes, `PDF` |
| Note | `source_type = note` or `source_platform = note` | generic note/source mark | Yes, `Note` |

Implementation guidance:

- Prefer local inline SVG or existing local icon assets; do not fetch logos from remote URLs at runtime.
- If no brand-logo package exists in the repo, add tiny inline SVG components in `src/components/library-list.tsx` or a nearby small helper file.
- Keep these icons `aria-hidden="true"` because the adjacent text label already provides the accessible name.
- Do not add Telegram-specific logo in this slice unless explicitly requested; user asked for YouTube, LinkedIn, Substack, and generic fallback.
- Do not alter filter chips or filter labels to add logos.

### Step 7 - Preserve Tappable Area

The card should still open the item when tapping the main card area.

Guardrails:

- Checkbox click must still call `stopPropagation`.
- `Link` should still wrap the content area.
- Do not place interactive controls inside the `Link` if React/Next warns or if nested interaction causes tap issues.
- If enrichment pill is purely display, it can sit inside the link area. If it later becomes actionable, move it outside the link.

### Step 8 - Add Focused Regression Coverage

Potential test files to inspect before adding tests:

- `src/components/__tests__/`
- `src/app/library/`
- existing Playwright or component tests under the repo.

Minimum coverage target:

- render a Library card with a very long title;
- assert title element has two-line clamp class;
- assert enrichment status is not in the same flex row as the title on mobile;
- assert checkbox behavior changes when `selectedIds.size > 0`;
- assert the metadata/status labels still render.

If the repo does not have a suitable component-test pattern, add a manual QA checklist instead of introducing a new test framework.

## 7. Manual QA Plan

Run local app and inspect the Android/mobile Library viewport.

### Required Fixtures

Use real or seeded items covering:

- long YouTube title with `enrichment failed`;
- long article title with `Full text`;
- LinkedIn item with tiny LinkedIn logo plus `LinkedIn` text;
- Substack item with tiny Substack logo plus `Substack` text;
- generic article item with fallback source logo plus source text;
- `Metadata only` item;
- item with extraction warning;
- item with high char count;
- selected item state;
- multiple selected items with BulkBar visible.

### Mobile Visual Checks

Pass conditions:

- long card title displays in two lines maximum;
- card height remains compact, target roughly 110px-150px depending on metadata;
- `enrichment failed` is visible below the title;
- `metadata only` remains visible but does not dominate the title;
- YouTube, LinkedIn, and Substack cards show tiny logos plus readable source text;
- other cards show a generic source logo plus readable source text;
- source icon and title align cleanly;
- no text overlaps the pill, card border, bottom nav, or FAB;
- second card is not swallowed by a single oversized first card;
- card remains readable at Android screenshot width similar to 738x1600 capture.

### Interaction Checks

Pass conditions:

- tapping the card opens the item detail page;
- checkbox/selection still works;
- selected card visual state remains visible;
- BulkBar still appears for selected items;
- Ask-selected flow still receives selected IDs;
- keyboard/focus behavior remains acceptable for desktop.

### Desktop Smoke Checks

Pass conditions:

- desktop Library still looks intentional;
- hover state still works;
- selected state still works;
- card title and status do not look oddly spaced after moving enrichment status.

## 8. Build And Verification Commands

Run after code implementation:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If the repo uses different available scripts, inspect `package.json` and run the closest matching local gates.

For Android private sideload validation after implementation is approved:

```bash
npm run build:apk
```

Do not rebuild or share a new APK until the card implementation has passed visual QA.

## 9. Acceptance Criteria

Implementation is complete only when:

- only the Library item card layout changed;
- filters/search/header/actions remain visually unchanged;
- Option A compact card is implemented;
- title is clamped to two lines on Android/mobile Library cards;
- title uses mobile compact typography close to Magic Patterns;
- enrichment status no longer steals title-row width on mobile;
- selection still works;
- card tap still opens item detail;
- metadata remains visible and readable;
- YouTube, LinkedIn, and Substack source logos appear in cards with adjacent text labels;
- all other sources use a generic fallback logo/icon with adjacent text labels;
- source logos are added only to cards, not filters or page-level controls;
- no overlapping text or controls are visible in Android/mobile screenshots;
- desktop Library smoke does not reveal a major regression;
- validation evidence is captured in a QA note or implementation report.

## 10. No-Go Gates

Do not ship if:

- filters or filter card changed visually;
- search/header/action buttons changed visually;
- title still wraps into more than two lines on mobile;
- `enrichment failed` disappears entirely;
- source logos replace text labels instead of sitting beside them;
- filter/source filter designs are changed while adding card logos;
- checkbox selection no longer works;
- card click navigation breaks;
- long metadata causes overlap with the bottom nav/FAB;
- desktop Library becomes visibly broken;
- validation is based only on desktop width.

## 11. Rollback Plan

Rollback should be simple because the change is isolated.

If QA fails:

1. Revert the `src/components/library-list.tsx` card-layout change only.
2. Leave analysis/plan documents intact.
3. Re-open the prototype and choose whether to:
   - adjust Option A;
   - switch to Option B;
   - preserve the current checkbox model and only move title/status hierarchy.

## 12. Implementation Sequence

1. Create a focused implementation branch or continue on the active UX v2 branch if that is the current repo convention.
2. Edit only `src/components/library-list.tsx` initially.
3. Implement title clamp and compact typography.
4. Move enrichment status below title.
5. Add tiny source logo plus text label inside the card metadata row.
6. Adjust checkbox width reservation carefully.
7. Compact metadata/status row without removing information.
8. Run local checks.
9. Perform mobile visual QA.
10. Fix any overlap or selection regressions.
11. Create implementation/QA evidence markdown with screenshots or precise observations.
12. Only after approval, rebuild Android APK and bump version if a fresh sideload artifact is requested.

## 13. Recommended First Code Change

Start with the smallest meaningful change:

- remove enrichment pill from the title row;
- clamp title to two lines;
- tighten mobile title typography;
- add the tiny source logo beside the existing source text in the metadata row;
- keep the checkbox behavior unchanged for the first local screenshot.

Then inspect Android/mobile width. If card height is still too large, proceed to checkbox width reduction. This reduces the chance of breaking selection while still attacking the largest visual cause first.

## 14. Decision Summary

Approved direction: Option A compact card.
Implementation scope: Library item cards only.
Source identity update: tiny YouTube, LinkedIn, and Substack logos in cards, with readable text retained; generic fallback logo for every other source.
Protected areas: filters, search, header, action buttons, bottom navigation, and broader Library screen design.
Next step: implement the plan after approval to move from planning into code execution.
