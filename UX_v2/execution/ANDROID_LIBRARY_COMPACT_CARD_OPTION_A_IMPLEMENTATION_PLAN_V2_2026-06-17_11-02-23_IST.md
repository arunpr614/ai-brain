# Android Library Compact Card Option A Implementation Plan V2

Created: 2026-06-17 11:02:23 IST
Status: Revised implementation plan. No production code changed in this step.
Supersedes: `ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_2026-06-17_10-29-08_IST.md`
Revision driver: `ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_10-39-34_IST.md`

## 1. Executive Decision

Implement Option A as a mobile/Android compact Library card, with the following V2 constraints:

- The compact layout is mobile-first and gated to the mobile breakpoint.
- Desktop `/library` card layout is protected and must have before/after evidence.
- Compact mobile cards must not render a source icon beside the title.
- Source identity appears only in the metadata row as tiny logo plus readable text.
- Mobile selection remains visible and usable from zero selected items.
- Production logos must be local or bundled; no runtime CDN/logo network fetches.
- Android WebView/APK evidence is required before the fix is considered complete.

This plan is still card-only. It must not redesign filters, search, header, action buttons, bottom navigation, or page-level Library layout.

## 2. Scope

### Allowed Production Files

Primary:

- `src/components/library-list.tsx`

Allowed only if needed for compact enrichment:

- `src/components/item-enrichment-watch.tsx`

Allowed only if cleaner than inlining tiny logo components:

- `src/components/source-logo.tsx`

Allowed only after implementation is validated and Arun requests a fresh private sideload APK:

- `android/app/build.gradle`

### Protected Production Files

Do not edit:

- `src/app/library/page.tsx`
- `src/components/mobile-library-filters.tsx`
- `src/components/sidebar.tsx`
- `src/app/search/page.tsx`
- filter option definitions or filter query behavior
- bottom navigation/FAB code
- data fetching, sorting, filtering, counts, or item query logic

### Documentation/Evidence Files To Create Later

After implementation, create a QA/evidence note under:

- `UX_v2/execution/`

The QA note must include exact screenshots/observations and the commands run.

## 3. Source Inputs

- RCA: `UX_v2/execution/ANDROID_LIBRARY_CARD_TITLE_RCA_AND_OPTIONS_2026-06-17_10-19-11_IST.md`
- Original Option A plan: `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_2026-06-17_10-29-08_IST.md`
- Adversarial review: `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_10-39-34_IST.md`
- Source-logo draw record: `UX_v2/execution/ANDROID_LIBRARY_SOURCE_LOGO_DRAW_RECORD_2026-06-17_10-34-59_IST.md`
- Current component: `src/components/library-list.tsx`
- Current enrichment wrapper: `src/components/item-enrichment-watch.tsx`
- Current enrichment pill: `src/components/enriching-pill.tsx`
- Source labels: `src/lib/capture/quality.ts`
- Library page usage: `src/app/library/page.tsx`

## 4. Adversarial Review Resolution Matrix

| Review finding | V2 resolution |
| --- | --- |
| Shared web/Android component can regress desktop | Use responsive mobile/desktop branches inside `LibraryList`; desktop branch preserves current layout. Require before/after desktop evidence. |
| Source icon remains in title row while logo is added below | Compact mobile branch removes title-row `SourceIcon`. Source mark appears only beside source text in metadata. |
| Mobile checkbox behavior unresolved | Use a concrete visible compact mobile checkbox slot. Do not hide the only mobile selection entry in this slice. |
| Android bug can be closed without Android evidence | Require Android WebView/APK screenshot evidence before completion. Browser responsive QA is only a pre-check. |
| Metadata can still create tall cards | Add mobile metadata priority and overflow rules; hide lower-priority fields on mobile. |
| Logo asset strategy not locked | Production uses local/bundled assets only, with provenance note. No remote logo fetches. |
| Class assertions are insufficient | Require screenshot evidence, card-height checks, and mobile selection proof. |
| `ItemEnrichmentWatch` misses existing compact mode | Extend wrapper to pass `compact` to `EnrichingPill` if enrichment status is used in mobile metadata. |
| Mobile filter component not named as protected | `src/components/mobile-library-filters.tsx` is explicitly protected. |
| Generic fallback label can be vague | Do not broaden label semantics in this slice; add follow-up note if unknown sources show `Capture`. |

## 5. UX Contract

### Mobile/Android Compact Card

The compact card must show:

- visible compact checkbox;
- title, clamped to two lines;
- metadata row with source logo + source text;
- quality badge;
- enrichment state when not done;
- relative time;
- warning only when it adds information not already shown by quality/enrichment.

The compact card must not show:

- a source icon in the title row;
- both a title-row source icon and a metadata source logo;
- remote logo images;
- duplicated `Metadata only` plus `metadata only` warning when both mean the same thing;
- character count on narrow mobile by default.

### Desktop Card

Desktop must remain visually close to the current implementation:

- checkbox hover behavior remains;
- existing desktop spacing remains;
- existing source icon can remain desktop-only;
- desktop can keep richer metadata including character count;
- desktop must not receive unreviewed compact-card layout changes.

## 6. Responsive Architecture

Implement two card bodies inside `src/components/library-list.tsx`:

1. **Mobile compact body:** visible below `md`, `md:hidden`.
2. **Desktop body:** visible at `md` and above, `hidden md:flex`, preserving current structure as much as possible.

Reasoning:

- `LibraryList` is shared by Android WebView and web.
- A single heavily responsive structure is more likely to create accidental desktop changes.
- A small amount of duplicated card markup is acceptable here because it sharply reduces release risk.

Do not split the parent page or change filters to achieve this.

## 7. Mobile Card Layout Specification

Target mobile structure:

```tsx
<li className="group/row">
  <div className="md:hidden rounded-lg border bg-[var(--surface)] p-3.5 ...">
    <div className="flex items-start gap-2.5">
      <label className="compact-visible-checkbox-slot">
        <input type="checkbox" />
      </label>
      <Link className="min-w-0 flex-1" href={`/items/${it.id}`}>
        <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug ...">
          {it.title}
        </h2>
        <div className="mobile-metadata-row">
          <SourceLogo platform={it.source_platform} type={it.source_type} />
          <span>{platformLabel(it.source_platform, it.source_type)}</span>
          <QualityBadge quality={it.capture_quality} />
          <ItemEnrichmentWatch compact ... />
          <span>{formatRelative(it.captured_at)}</span>
        </div>
      </Link>
    </div>
  </div>

  <div className="hidden md:flex ...">
    existing desktop card structure
  </div>
</li>
```

Important implementation rules:

- No `SourceIcon` in the mobile title row.
- Do not put interactive controls inside `Link` except display-only status pills.
- Checkbox click must still stop propagation.
- Whole content area must remain tappable and navigate to item detail.
- Selected state styling must apply to both mobile and desktop card bodies.

## 8. Mobile Selection Strategy

Decision: keep selection visible on mobile, but reduce the permanent layout width.

Implementation target:

- Use an always-visible compact mobile checkbox slot.
- Do not hide the checkbox in default mobile browsing state.
- Do not introduce long-press selection in this slice.
- Reduce the mobile checkbox layout footprint from the current `w-11` pattern to a compact slot around 30px-34px wide.
- Use a visible checkbox around 18px-20px.
- Preserve `aria-label={`Select ${it.title}`}`.
- Preserve `onClick={(e) => e.stopPropagation()}`.

Acceptance requirement:

- Starting from zero selected items on Android/mobile, the user can select one item, select a second item, see BulkBar, clear selection, and use Ask selected.

Reasoning:

- Hiding the checkbox would break or obscure the only existing mobile selection entry path.
- A real long-press/select-mode model is larger interaction work and should not be smuggled into this card-height fix.

## 9. Source Logo Strategy

### Placement

Source logo appears only in mobile metadata:

```tsx
<span className="inline-flex min-w-0 items-center gap-1.5">
  <SourceLogo platform={it.source_platform} type={it.source_type} />
  <span>{platformLabel(it.source_platform, it.source_type)}</span>
</span>
```

Desktop can keep the current `SourceIcon` in this slice to reduce blast radius.

### Mapping

| Source | Detection | Mobile logo | Text |
| --- | --- | --- | --- |
| YouTube | `source_platform === "youtube"` or `"youtube_short"` or `source_type === "youtube"` | local tiny YouTube mark | `YouTube` / `YouTube Short` |
| LinkedIn | `source_platform === "linkedin"` | local tiny LinkedIn mark | `LinkedIn` |
| Substack | `source_platform === "substack"` | local tiny Substack mark | `Substack` |
| Other URL/article | `generic_article`, `url`, unknown URL | generic local globe/source mark | existing label |
| PDF | `source_type === "pdf"` | generic local document mark | `PDF` |
| Note | `source_type === "note"` or `source_platform === "note"` | generic local note mark | `Note` |

### Asset Rules

Production must not fetch logo assets from:

- Simple Icons CDN;
- third-party image URLs;
- remote brand asset URLs;
- runtime network requests of any kind.

Allowed production approaches:

1. Local tiny React SVG components with provenance comments.
2. Local static SVG assets committed under an appropriate project asset path with provenance notes.
3. A deliberately added icon dependency only if its license/provenance is documented.

For this implementation, prefer local React SVG components because the icons are tiny and card-specific.

Accessibility:

- Logos are decorative: use `aria-hidden="true"` or equivalent.
- The adjacent text label remains the accessible source identity.

## 10. Metadata Priority And Overflow Rules

Mobile metadata must be capped by priority, not by dumping every token into a wrap row.

Always show on mobile:

1. source logo + source text;
2. quality badge;
3. enrichment status if state is not `done`;
4. relative time.

Show only when it adds non-duplicative value:

- extraction warning, but only if it is not the same information as `Metadata only` or `enrichment failed`.

Hide on narrow mobile by default:

- character count;
- verbose capture channel such as `via Telegram`.

Desktop branch may continue showing:

- capture channel;
- character count;
- full metadata row.

No-go condition:

- Mobile metadata wraps beyond two visual lines for the long-title fixtures.

## 11. Enrichment Status

Current `EnrichingPill` already supports `compact`.

Implementation:

- Extend `ItemEnrichmentWatch` to accept `compact?: boolean`.
- Pass `compact` through to `EnrichingPill`.
- Use compact enrichment status in the mobile metadata row.
- Preserve default/non-compact behavior for desktop.

Validation states:

- `done`: renders no pill.
- `error`: compact `enrichment failed`.
- `pending`: compact queued state.
- `running`: compact enriching state.
- `batched`: compact batched state with tooltip preserved.

## 12. Desktop Blast-Radius Contract

Before implementation, capture current desktop `/library` appearance.

After implementation, verify desktop:

- header unchanged;
- search unchanged;
- filter rows unchanged;
- card border/radius/background unchanged;
- desktop checkbox hover/select behavior unchanged;
- desktop source icon/title/enrichment placement unchanged unless intentionally documented;
- desktop metadata still includes source/capture/quality/time/chars/warning as before;
- no duplicate source-logo treatment appears on desktop unless separately approved.

If desktop changes are visible, document them and treat them as a blocker unless they are strictly necessary and approved.

## 13. Implementation Sequence

1. Create no code changes outside allowed files.
2. Add or inline `SourceLogo` local components with provenance comments.
3. Extend `ItemEnrichmentWatch` to accept `compact?: boolean` and pass it through.
4. Refactor `LibraryList` item rendering into mobile and desktop card bodies inside the same file.
5. Keep the desktop body as close to the current implementation as possible.
6. Build the mobile body:
   - compact visible checkbox;
   - two-line title;
   - no title-row source icon;
   - source logo + text in metadata;
   - compact enrichment status;
   - mobile metadata priority rules.
7. Run local code gates.
8. Capture browser desktop and browser mobile evidence.
9. Build/install Android APK only after browser evidence is acceptable.
10. Capture Android WebView/APK evidence.
11. Create QA/evidence markdown.
12. Only after QA passes, ask whether to produce/share the final private sideload APK.

## 14. Test And Verification Plan

### Local Code Gates

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If a script fails for unrelated pre-existing reasons, document the exact failure and whether it blocks this card change.

### Fixture Requirements

Use real or seeded items covering:

- long YouTube title with enrichment error;
- long generic article title;
- LinkedIn source;
- Substack source;
- PDF source;
- Note source;
- metadata-only quality;
- full-text quality;
- extraction warning that duplicates metadata-only;
- extraction warning that adds distinct information;
- total chars present;
- selected item state;
- multiple selected items with BulkBar.

### Browser Visual Evidence

Capture before/after:

- desktop `/library`;
- mobile-width `/library`, Android-like width;
- selected-state mobile card;
- BulkBar visible on mobile.

Required mobile measurements:

- first long-title card title is two lines maximum;
- first long-title card total height is target 110px-150px unless metadata state justifies a documented exception;
- metadata area does not exceed two visual lines;
- no overlap with bottom nav/FAB.

### Android WebView/APK Evidence

Before marking implementation complete:

1. Build Android debug APK.
2. Bump version before sharing if a fresh private sideload artifact is produced.
   - Current known artifact before this work: `1.0.6/code7`.
   - Expected next private APK if built from this work: `1.0.7/code8`, unless the repo has already advanced.
3. Install on emulator or device.
4. Capture Android Library screenshots showing:
   - long YouTube card;
   - long article card;
   - YouTube logo + text;
   - LinkedIn logo + text;
   - Substack logo + text;
   - generic fallback source;
   - selected item state;
   - BulkBar state.

Android evidence is mandatory because the original bug was observed in the Android app.

## 15. Acceptance Criteria

Implementation is complete only when all are true:

- V2 plan has been used, not the superseded V1 plan.
- Production code changes stay within allowed files.
- `src/app/library/page.tsx` remains unchanged.
- `src/components/mobile-library-filters.tsx` remains unchanged.
- Compact mobile card title is clamped to two lines.
- Compact mobile title row has no source icon.
- Compact mobile card has source logo + readable source text in metadata.
- No compact mobile card has duplicate source icon plus source logo.
- YouTube, LinkedIn, and Substack logos use local/bundled production assets.
- No production source logo is loaded from a remote URL/CDN.
- Other sources use generic fallback icon plus readable text.
- Mobile selection can start from zero selected items.
- BulkBar still appears and works.
- Card tap still opens item detail.
- Mobile metadata area stays within two visual lines for required fixtures.
- Desktop `/library` before/after evidence shows no unapproved card/layout regressions.
- Android WebView/APK evidence confirms the fix in the actual Android environment.
- QA/evidence markdown is created with screenshots/observations and command results.

## 16. No-Go Gates

Do not ship or build a shareable APK if:

- filters/search/header/action buttons/bottom nav changed;
- compact mobile title row includes a source icon;
- compact mobile card shows both title-row source icon and metadata source logo;
- source logos replace text labels;
- production logos are fetched remotely;
- mobile checkbox selection cannot be initiated from zero selected items;
- BulkBar is broken;
- card navigation is broken;
- metadata wraps beyond two visual lines in the required long-title fixtures;
- desktop `/library` has unreviewed visual changes;
- validation is browser-only with no Android WebView/APK evidence.

## 17. Rollback Plan

If mobile QA fails:

1. Revert `src/components/library-list.tsx`.
2. Revert `src/components/item-enrichment-watch.tsx` only if changed.
3. Remove any new `src/components/source-logo.tsx` helper only if it was added solely for this work.
4. Keep all planning/review/QA documents.
5. Reassess whether to:
   - reduce metadata further;
   - keep current checkbox width;
   - choose Option B instead;
   - defer logos to a separate slice.

If Android APK validation fails after browser QA passes:

1. Do not share the APK.
2. Keep the previous validated private sideload artifact as the fallback.
3. Document Android-specific failure in the QA note.

## 18. Follow-Up Items Not In This Slice

- Improve unknown source labels that currently fall back to `Capture`.
- Add Telegram-specific logo treatment.
- Add long-press/select-mode interaction.
- Apply logo treatment to desktop cards.
- Apply source logos to filters.

These require separate approval because the current user constraint is card-only and Android-focused.

## 19. Final Implementation Readiness

V2 is ready for execution only after Arun accepts this revised plan. The old V1 plan should not be used for implementation.
