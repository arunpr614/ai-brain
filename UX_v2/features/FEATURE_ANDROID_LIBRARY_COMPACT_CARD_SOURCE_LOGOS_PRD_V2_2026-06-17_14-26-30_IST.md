# Feature PRD V2: Android Library Compact Card With Source Logos

Created: 2026-06-17 14:26:30 IST
Owner: Codex Product Manager lane
Status: V2 approved for implementation
V1: `FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_PRD_V1_2026-06-17_14-24-30_IST.md`
Adversarial review: `FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_PRD_ADVERSARIAL_REVIEW_2026-06-17_14-25-30_IST.md`

## Summary

Implement the selected Option A compact Library card for mobile/Android. Long titles must no longer create oversized Android cards. Source identity must move to compact metadata as a tiny local logo plus readable text. Desktop Library and protected page/filter/navigation behavior must remain unchanged.

## Review Resolution

| Review issue | V2 resolution |
| --- | --- |
| Fixture strategy too weak | Require documented fixture IDs or deterministic seeded fixtures in QA. |
| Logo provenance/accessibility underspecified | Require local SVG/provenance comments, `aria-hidden`, and adjacent text as accessible source name. |
| Warning suppression undefined | Require explicit helper that suppresses only known duplicate metadata-only warning codes. |
| Desktop protection too soft | Require desktop before/after evidence and desktop-specific diff review. |
| APK version rule operational gap | Require private sideload notes with version/checksum/install/rollback if APK is shared. |

## Product Contract

- Compact card is mobile-only below `md`.
- Desktop card remains visually close to current layout.
- Mobile title row contains title only, not source icon or enrichment pill.
- Mobile metadata contains source logo plus readable source text.
- Source logos are decorative; source text is the accessible identity.
- Mobile selection remains visible from zero selected items.
- Android WebView/APK evidence is required before completion.

## Functional Requirements

1. Add a mobile compact branch and desktop branch inside `LibraryList`.
2. Clamp compact mobile title to two lines.
3. Use compact title typography aligned to Magic Patterns: about 15px, semibold, snug line-height.
4. Remove mobile title-row `SourceIcon`.
5. Move mobile enrichment status into metadata and use compact pill mode.
6. Add local `SourceLogo` handling for YouTube, LinkedIn, Substack, PDF, Note, and generic URL/article.
7. Preserve readable source text next to every logo.
8. Hide mobile character count and verbose capture channel by default.
9. Suppress only known duplicate metadata-only warnings when quality already says Metadata only.
10. Keep unknown/distinct extraction warnings visible.
11. Preserve item detail navigation from card content.
12. Preserve checkbox propagation handling and `aria-label`.
13. Preserve BulkBar and Ask selected flow.

## Fixture Requirements

QA must identify real item IDs or create deterministic fixtures for:

- long YouTube title with enrichment error;
- long generic article title;
- LinkedIn source;
- Substack source;
- PDF source;
- Note source;
- metadata-only quality;
- full-text quality;
- duplicate metadata-only warning;
- distinct warning that remains visible;
- selected item from zero selected state;
- multiple selected items with BulkBar.

## Acceptance Criteria

- Code changes stay within allowed files.
- `src/app/library/page.tsx`, `src/components/mobile-library-filters.tsx`, filters, search, header, bottom nav, and data/query logic are unchanged.
- Compact mobile title is clamped to two lines.
- Compact mobile metadata stays within two visual lines for required long-title fixtures.
- Compact mobile title row has no source icon.
- Compact mobile card has source logo plus source text in metadata.
- No compact mobile card shows duplicate title icon plus metadata logo.
- Logos are local/bundled, decorative, and do not fetch remote assets.
- YouTube, LinkedIn, Substack, PDF, Note, and generic fallbacks all render.
- Mobile selection can start from zero selected items.
- BulkBar appears for selected items and Ask selected remains usable.
- Card tap opens item detail.
- Desktop before/after evidence shows no unapproved regression.
- Android WebView/APK evidence confirms the fix.

## No-Go Gates

- No completion if Android evidence is missing.
- No completion if browser mobile evidence is substituted for Android proof.
- No completion if protected files change.
- No completion if production logos load remotely.
- No completion if source text labels are removed.
- No shareable APK without version bump, checksum, install proof, and rollback notes.

## QA And Evidence

Use the QA sub-agent matrix:

`UX_v2/execution/qa/ANDROID_LIBRARY_COMPACT_CARD_QA_STRATEGY_AND_TEST_MATRIX_2026-06-17_14-24-48_IST.md`

Create final evidence at:

`UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_QA_<timestamp>.md`

The report must include fixture list, desktop/mobile browser observations, Android screenshots/observations, commands run, failures, residual risks, and APK metadata if built.

## Rollback

Revert the compact-card source files only. Keep planning/review/QA docs. If APK validation fails, do not share it; keep the previous validated `1.0.6/code7` debug APK as fallback.
