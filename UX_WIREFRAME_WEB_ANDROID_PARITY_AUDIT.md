# AI Brain Wireframe Web / Android Parity Audit

Created: 2026-06-11
Magic Patterns editor: https://www.magicpatterns.com/c/ab5mjebwjwf7xvh8veffs2
Initial active artifact audited: `1dba28c1-9f20-4f83-94be-264220f8807d`
Parity-aligned active artifact: `39e222e9-0c17-4d71-bd31-49153b5f8af8`

## Summary

The current wireframes are conceptually aligned, but not fully feature-parity aligned.

This is partly intentional. Web and Android should not be identical. Web is the deeper workbench; Android is the capture, lookup, offline-read, and lightweight repair companion.

However, there are a few real parity gaps that should be fixed before the wireframes are treated as complete.

## Parity Principle

The goal is not identical screens.

The goal is:

- Same product concepts.
- Same labels.
- Same trust model.
- Same source quality model.
- Same provenance model.
- Same Ask scope/history model.
- Different layout density and interaction patterns by platform.

## Current Shared Concepts

These are now represented on both web and Android:

- Library
- Search
- Capture entry
- Source quality labels
- Source platform
- Captured via / provenance
- Item detail
- Weak item repair
- Ask
- Ask scope
- Ask history
- Login / unlock
- Device pairing concept
- Offline availability

## Web / Android Matrix

| Feature | Web wireframe | Android wireframe | Status |
|---|---|---|---|
| Library browse | Yes | Yes | Aligned |
| Search library | Yes | Yes | Aligned |
| Source quality filters | Yes | Yes, simpler | Aligned enough |
| Source type filters | Yes | Not fully | Gap |
| Quick capture | Yes, header form | Yes, via FAB + capture page | Intentional difference |
| Capture page | Yes, basic | Yes, basic | Needs more detail on both |
| Share capture result | Not explicit | Yes | Gap if web capture needs result states |
| Needs Upgrade | Dedicated screen | Filter/card + item repair | Intentional difference, but maybe needs stronger mobile surface |
| Weak item repair | Yes | Yes | Aligned |
| Item detail | Yes | Yes | Aligned |
| PDF-specific detail | Not clearly represented | Yes | Gap |
| Manual-note detail | Not clearly represented | Yes | Gap |
| Source provenance | Yes | Yes | Aligned |
| Ask all | Yes | Yes | Aligned |
| Ask selected | Yes | Not clearly represented | Gap |
| Ask this item | Yes | Yes | Aligned |
| Ask history | Yes, rail | Yes, drawer | Aligned |
| Citation/source evidence | Yes | Yes | Aligned |
| Login/unlock | Yes | Yes | Aligned |
| Device pairing | Yes | Yes | Aligned |
| Settings | Placeholder | Placeholder in More | Gap |
| Offline read state | Mostly Android | Android explicit | Intentional Android emphasis, but web cache state is underdesigned |
| Collapsible nav | Yes | Not applicable | Intentional difference |
| Bottom nav / FAB | Not applicable | Yes | Intentional difference |

## Intentional Differences

These should remain different unless the product direction changes:

1. Web has a full left navigation; Android has bottom navigation.
2. Web has collapsible nav; Android does not need it.
3. Web can support dense Library rows and bulk selection; Android should stay scan-first.
4. Web can expose a dedicated Needs Upgrade page; Android can start with a filter/summary plus repair from item detail.
5. Web Ask can have a persistent history rail; Android Ask should use a drawer/sheet.
6. Android has stronger offline and share-capture emphasis.

## Real Parity Gaps

## Gap 1: Source Type Filters

Web has source type filters such as YouTube, PDF, Articles.

Android currently has simpler filters:

- All
- Needs Upgrade
- Offline
- Full text

Recommendation:

- Add a compact source-type filter row or filter sheet on Android:
  - All
  - YouTube
  - LinkedIn
  - Substack
  - PDF
  - Notes

## Gap 2: Ask Selected On Android

Web supports multi-select and Ask selected.

Android does not clearly represent selecting multiple items and asking across them.

Recommendation:

- Do not add heavy multi-select by default.
- Add long-press or overflow pattern as a future Android state:
  - Select items
  - Ask selected
  - Add to collection
  - Delete

If Android is meant to stay lightweight, this can be deferred.

## Gap 3: Desktop Item Detail Needs PDF And Note States

Android item detail now includes PDF-specific and manual-note-specific original views.

Web item detail is still mostly generic article/transcript/metadata.

Recommendation:

- Add desktop item-detail variants:
  - PDF item detail
  - Manual note detail
  - Article/Substack detail
  - YouTube transcript detail

## Gap 4: Settings / More Are Still Placeholders

Both web Settings and Android More are too thin.

Required sections should be represented consistently:

- Appearance
- Device pairing
- Connected devices
- Offline sync
- Backup/export
- Data/privacy
- Tags and collections
- Provider/model health if user-facing

Recommendation:

- Add web Settings detail.
- Add Android More detail with the same categories, simplified for phone.

## Gap 5: Capture Result States

Android has share capture result screens.

Web capture is mostly a basic form and placeholder.

Recommendation:

- Add web capture result states:
  - Saved full text
  - Saved metadata only
  - Saved preview only
  - Updated existing item
  - Duplicate candidate
  - Needs upgrade action

Android capture should keep FAB/share-centered behavior.

## Gap 6: Mobile Needs Upgrade Surface

Android has Needs Upgrade as a filter/summary and item-level repair.

This may be enough, but if repair is a common mobile task, Android needs a richer Needs Upgrade list.

Recommendation:

- Add a lightweight Android Needs Upgrade view reachable from:
  - Library summary card
  - More
  - Needs Upgrade filter

Do not make it a primary bottom-nav item unless mobile repair becomes a daily workflow.

## Recommended Alignment Pass

Ask Magic Patterns for one broad consistency pass:

1. Add Android source-type filter sheet or row.
2. Add desktop PDF/manual-note item detail variants.
3. Flesh out Settings and Android More with matching categories.
4. Add web capture result states.
5. Add optional Android selected-items / Ask selected state.
6. Add optional Android Needs Upgrade list if we want mobile repair parity.

## Current Verdict

The wireframes are ready for design review at the concept level.

After the Magic Patterns parity pass on 2026-06-11, the wireframes are materially closer to parity-complete.

The largest previously identified gaps have been addressed in the active Magic Patterns artifact:

- Android Library now includes source-type and state filters.
- Android Ask now includes history access and a lightweight selected-items state.
- Desktop item detail now includes PDF and Manual note variants.
- Web and Android Capture now show equivalent result states, including Needs upgrade.
- Web Settings and Android More now share the same major categories.
- Android now has a lightweight Needs Upgrade view reachable from Library and More.

Remaining design judgment:

- The parity is now good enough for design review.
- The next review should focus on whether the mobile patterns feel light enough, especially selected-items Ask and the compact source filter row.
- Settings / More categories are now represented, but the individual settings detail screens are still not designed.
