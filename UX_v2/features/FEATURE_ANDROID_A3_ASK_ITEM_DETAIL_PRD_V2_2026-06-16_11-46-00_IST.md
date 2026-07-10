# Feature PRD V2 - Android A3 Ask Composer And Item Detail

Created: 2026-06-16 11:46:00 IST
Owner: Codex
Supersedes: `FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_PRD_V1_2026-06-16_11-42-00_IST.md`
Adversarial review: `FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_PRD_ADVERSARIAL_REVIEW_2026-06-16_11-44-00_IST.md`
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Status

Revised product source for A3. Implementation may begin only after implementation plan v2 exists and resolves its adversarial review.

## Scope

Android A3 covers local browser-mobile implementation and evidence for:

- `/ask`
- `/items/[id]/ask`
- `/items/[id]`
- `/items/[id]?mode=focus`

This slice must use the completion wording:

`Android A3 Ask composer and Item Detail completed locally with browser evidence; APK evidence and production release still pending.`

## Product Goals

1. Make Ask comfortable and truthful at Android WebView dimensions.
2. Preserve real Ask behavior: library Ask, selected/item/tag/topic/collection scopes, streamed answers, citations, provider-error states, and durable history where already supported.
3. Organize Item Detail into approved mobile WebView tabs without changing data semantics.
4. Preserve Focus mode as a shell-free reading surface.
5. Preserve weak-source repair affordances and source-quality warnings.

## Explicit Non-Goals

- No paste-link attachment, write-note attachment, file attachment, or persistent attached-context semantics.
- No high-quality-only retrieval toggle.
- No new schema for scope-history snapshots.
- No embedded YouTube/media player.
- No offline read/list/sync behavior.
- No new tag/collection mutation behavior. Existing real controls may render only in the Details tab.
- No APK/native validation claim.
- No production deployment.

## Ask Requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| A3-ASK-1 | `/ask` uses a mobile-safe full-height layout with a visible scope banner and composer. | 390 x 844 browser evidence shows the scope banner, prompt region, textarea, and send button without horizontal overflow. |
| A3-ASK-2 | Empty send uses DOM-verifiable disabled behavior. | The send button is disabled when the textarea is empty and becomes enabled when text exists. No empty turn is created. |
| A3-ASK-3 | Provider-error state is visible on mobile. | Browser-mobile evidence shows an Ask error card with `AI services unavailable` and the explanatory retry copy. A test-only/mock path is acceptable if it does not ship user-facing fake data. |
| A3-ASK-4 | Scoped Ask remains real. | Tests or fixture evidence prove item and selected scopes submit real IDs; browser evidence shows at least one scoped Ask page/banner. |
| A3-ASK-5 | Unsupported Ask attachments remain absent. | Scanner finds no paste-link, write-note, file attachment, high-quality-only, or persisted-scope-history claim/action in A3 surfaces. |
| A3-ASK-6 | Composer remains reachable around bottom navigation. | Browser evidence or DOM checks show composer/send button are not covered at the bottom of 390 x 844 viewport. |

## Item Detail Tab Mapping

Mobile Item Detail must expose tabs as actual controls. Desktop/tablet may keep the existing two-column layout unless changing it is simpler and safe.

| Tab | Contents | Rules |
| --- | --- | --- |
| Original | Title, processing/capture status, trust strip, warning/repair panel, source link, original body, focus/ask/export actions. | Must preserve repair affordance for weak items. |
| Digest | Category, summary, quotes, digest placeholder if enrichment is unavailable. | Must not claim AI summary exists when it does not. |
| Ask | Scoped Ask entry for this item plus source-quality warning if weak. | May link to `/items/[id]/ask`; does not need to embed the full chat. |
| Related | Related item rows when available; visible empty state when none. | Absence of panel is not acceptable for no-related state. |
| Details | Capture metadata, included topics, manual tags, and collections using existing controls only. | No new mutation semantics; existing TagEditor/CollectionEditor can render here. |

## Item Detail Requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| A3-ITEM-1 | Mobile item detail has Original, Digest, Ask, Related, and Details tabs. | Browser evidence shows tab controls on a full item. |
| A3-ITEM-2 | Original tab preserves current source content and repair affordance. | Full and weak item evidence show source body; weak item evidence shows reason plus Add text. |
| A3-ITEM-3 | Digest tab is truthful. | Full item evidence shows summary/quotes/category when seeded; no-digest item evidence shows placeholder copy. |
| A3-ITEM-4 | Related tab has visible present and empty states. | Browser evidence covers one item with related rows and one no-related item with visible empty copy. |
| A3-ITEM-5 | Details tab keeps existing real metadata and controls. | Browser evidence shows capture metadata, included topics, tags, and collections without adding new actions beyond existing editors. |
| A3-ITEM-6 | Focus mode remains shell-free. | Browser evidence shows focus route with no bottom navigation and no tab chrome. |
| A3-ITEM-7 | No embedded media or offline-read claim appears. | Scanner passes for A3 surfaces. |

## Data And Fixture Requirements

Use temporary SQLite only:

- Full item with summary, category, quotes, manual tag, collection, included topic, source metadata, and semantic chunks.
- Related item with similar chunks so `Related` has visible rows.
- Weak item with limited quality and repair affordance.
- No-related item with no embedded chunks and no related rows.
- Optional prebuilt Ask error/mock state must be local-only and not reachable as a fake production success path.

## Validation Gates

- A3 copy/action scanner covering Ask, Ask input, item detail, item Ask, and related component files.
- A3 fixture seed script.
- A3 browser QA script with 390 x 844 states:
  - Ask empty disabled.
  - Ask text-enabled composer.
  - Ask provider-error card.
  - Item Ask scoped banner.
  - Item detail Original/Digest/Ask/Related/Details tabs on full item.
  - Weak item detail Original tab.
  - No-related Related tab empty state.
  - Focus mode.
- Focused Ask request/input tests.
- `git diff --check`.
- `npm run typecheck`.
- `npm run lint`.
- `npm test`.
- `npm run build`.

## Release And Claim Rules

- Local completion requires all validation gates and browser reports with issue count 0.
- APK evidence remains pending even if browser-mobile evidence is green.
- Production release remains pending until the overall project release gates are complete.
