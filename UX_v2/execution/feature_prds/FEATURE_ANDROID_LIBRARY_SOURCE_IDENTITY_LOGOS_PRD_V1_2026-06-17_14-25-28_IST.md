# Feature PRD v1: Android Library Source Identity Logos

**Created:** 2026-06-17 14:25:28 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch observed:** `codex/ai-brain-ux-v2-execution`
**Feature owner:** PM sub-agent draft for Arun/Main Codex review
**Status:** Draft for adversarial review
**Recommended launch tier:** Tier 4 equivalent - private/internal UX polish; no public GTM motion.
**Related plan:** `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md`

## 1. Purpose

Add tiny source logos to compact Android/mobile Library cards so users can recognize YouTube, LinkedIn, and Substack sources quickly without losing readable source text. The feature keeps source identity in the compact metadata row only and avoids remote logo fetching.

This PRD assumes the compact card layout PRD is implemented or sequenced with it. Logos should not be added to the current tall mobile title-row layout as a standalone visual flourish.

## 2. Source Evidence

| Source | Evidence used |
| --- | --- |
| Handover | Arun requested tiny logos inside Library cards: YouTube + text, LinkedIn + text, Substack + text, generic fallback + existing text for all other sources. |
| Source-logo draw record | `ANDROID_LIBRARY_SOURCE_LOGO_DRAW_RECORD_2026-06-17_10-34-59_IST.md` and prototype show intended visual treatment; prototype CDN icons are explicitly visual-only. |
| V2 implementation plan | Requires logos only in mobile metadata, local/bundled production assets, adjacent text labels, and no title-row source icon duplication. |
| Current code | `src/components/library-list.tsx` uses a generic `SourceIcon` based on `source_type`, plus `platformLabel(...)` in metadata. |
| Source labels | `src/lib/capture/quality.ts` owns platform/source text labels and should remain the source of readable source identity. |

## 3. User Outcomes

| User outcome | Required behavior |
| --- | --- |
| Recognize source at a glance | YouTube, LinkedIn, and Substack cards show familiar tiny marks in the metadata row. |
| Keep labels accessible | Every logo is paired with readable text; logos never replace text labels. |
| Trust app privacy/performance | Logos are local/bundled and never fetched from remote CDNs at runtime. |
| Avoid card clutter | Compact card shows one source identity treatment, not both a title icon and metadata logo. |

## 4. Product Decisions

| Decision ID | Decision | Status |
| --- | --- | --- |
| SIL-001 | Show source logo plus readable text in compact mobile metadata. | Approved. |
| SIL-002 | Keep logos decorative for accessibility. | Required. Adjacent text is the accessible identity. |
| SIL-003 | Use local/bundled assets only. | Required. No Simple Icons CDN, remote brand URLs, or runtime network fetches. |
| SIL-004 | Keep desktop source icon unchanged in this slice. | Required to reduce blast radius. |
| SIL-005 | Generic fallbacks keep existing label semantics. | Required. Do not broaden unknown labels in this slice. |

## 5. Functional Requirements

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| SIL-R1 | Add YouTube logo treatment. | P0 | `source_platform === "youtube"` or `"youtube_short"` or `source_type === "youtube"` maps to a tiny local YouTube mark with text `YouTube` or `YouTube Short`. |
| SIL-R2 | Add LinkedIn logo treatment. | P0 | `source_platform === "linkedin"` maps to a tiny local LinkedIn mark with text `LinkedIn`. |
| SIL-R3 | Add Substack logo treatment. | P0 | `source_platform === "substack"` maps to a tiny local Substack mark with text `Substack`. |
| SIL-R4 | Add generic fallbacks. | P0 | Other URL/article sources show generic local source/globe mark plus current text label; PDF shows generic document mark plus `PDF`; Note shows generic note mark plus `Note`. |
| SIL-R5 | Keep logo plus label together. | P0 | The logo and text render in one inline group with truncation/overflow rules that avoid horizontal overflow. |
| SIL-R6 | Do not duplicate source identity on compact mobile cards. | P0 | Compact mobile card does not render a title-row `SourceIcon` when metadata logo is present. |
| SIL-R7 | Do not change source labels globally. | P1 | `platformLabel(...)` behavior remains unchanged except where existing label is displayed next to a logo. |
| SIL-R8 | Preserve desktop behavior. | P0 | Desktop cards keep existing source icon/label behavior unless a separate review approves desktop logos. |
| SIL-R9 | Document asset provenance. | P0 | Any local SVG/logo component or asset includes a concise provenance/licensing note in code or companion docs. |

## 6. Non-Goals

- No source logos in filters, search results, item detail, desktop cards, topic pages, collection pages, or app navigation.
- No remote logo loading.
- No logo-only source identity.
- No new source taxonomy or relabeling of unknown `Capture` fallbacks.
- No new Telegram-specific, website favicon, or arbitrary-domain logo treatment.
- No brand-heavy visual redesign of cards.

## 7. Dependencies

| Dependency | Why it matters |
| --- | --- |
| Compact card layout PRD | Placement is the compact metadata row; title-row source icon must be removed in that layout. |
| `src/components/library-list.tsx` | Current likely location for mobile metadata and source logo rendering. |
| Optional `src/components/source-logo.tsx` | Allowed by the V2 plan if separating logo mapping from `LibraryList` keeps the card code readable. |
| `src/lib/capture/quality.ts` | Owns readable platform/source labels. |
| Local SVG/icon strategy | Needs code review for licensing/provenance and no network fetches. |

## 8. Edge Cases

- YouTube Shorts should preserve `YouTube Short` text if the existing label emits it.
- `source_type === "youtube"` should get YouTube treatment even if `source_platform` is missing.
- Unknown URL/article source should not show a misleading YouTube/LinkedIn/Substack mark.
- Very long source labels must truncate or wrap without pushing metadata beyond two visual lines.
- Logo SVGs should not inherit accidental text color that makes a brand mark invisible in dark mode.
- Dark mode must keep fallback icons and brand marks visible against compact card surfaces.
- Decorative logos must not be announced redundantly by screen readers.

## 9. Telemetry, Observability, and QA Expectations

No new analytics events are required. QA must prove that the logo implementation is local, accessible, and visually stable.

Required QA:

| Gate | Required evidence |
| --- | --- |
| Static scan | Confirm no `simpleicons`, CDN URL, remote image URL, or third-party logo URL is used by production card code. |
| Fixture coverage | Screenshots include YouTube, YouTube Short if available, LinkedIn, Substack, generic URL/article, PDF, Note, and unknown/fallback. |
| Accessibility | Logos use `aria-hidden="true"` or equivalent; adjacent text remains visible and readable. |
| Light/dark | Logo and fallback icon visibility checked in both supported themes if theme support remains. |
| Mobile metadata | Source logo group does not push metadata beyond two visual lines for required long-title fixtures. |
| Android WebView/APK | Device/emulator screenshots show YouTube, LinkedIn, Substack, and generic fallback treatments. |
| Regression | Desktop cards do not show unapproved duplicate source-logo treatment. |

## 10. Rollout and Release Criteria

This feature should be reviewed and implemented with the compact-card feature because the source-logo placement depends on the compact metadata row.

Local completion requires:

1. PRD review complete and P0/P1 issues resolved or accepted.
2. Local/bundled logo implementation only.
3. Required source mappings render correctly.
4. Logo plus readable text is visible in Android/mobile compact cards.
5. Static scan confirms no remote logo dependencies.
6. Android WebView/APK evidence exists before any APK is shared.

## 11. No-Go Conditions

- Logos replace text labels.
- Production cards fetch logos from a CDN or remote URL.
- Mobile card shows both title-row source icon and metadata source logo.
- Generic fallback mislabels unknown sources as a specific platform.
- Logo treatment causes card metadata to wrap beyond accepted compact-card limits.
- Source-logo changes appear in filters/search/header/bottom nav without separate approval.

## 12. Open Questions for Review

1. Should logo SVGs be inline React components or committed static assets?
2. What exact provenance/license note is acceptable for YouTube, LinkedIn, and Substack marks?
3. Should brand marks use official brand colors or monochrome treatment for dark-mode contrast consistency?
4. Should Telegram receive its own source mark in a future slice?
