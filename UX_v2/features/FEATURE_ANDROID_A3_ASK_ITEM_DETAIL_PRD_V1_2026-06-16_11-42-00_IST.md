# Feature PRD V1 - Android A3 Ask Composer And Item Detail

Created: 2026-06-16 11:42:00 IST
Owner: Codex
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Parent sources:

- `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
- `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
- `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md`

## Status

Draft for adversarial review. Do not execute until PRD v2 and implementation plan v2 exist.

## Scope

Android A3 covers the mobile browser/WebView experience for:

- `/ask`
- `/items/[id]/ask`
- `/items/[id]`
- `/items/[id]?mode=focus`

This slice is local/browser-mobile evidence only. It must not claim APK parity, native Android validation, or production release.

## Product Goals

1. Make Ask comfortable and truthful on Android-sized screens.
2. Preserve current real Ask behavior: library Ask, selected/item/tag/topic/collection scopes, streamed answers, citations, provider-offline errors, and durable history where it already exists.
3. Adapt Item Detail to the approved WebView tab model: Original, Digest, Ask, Related, Details.
4. Preserve Focus mode as a shell-free reading surface.
5. Keep weak-source repair affordances visible and truthful.

## Non-Goals

- No paste-link attachment, write-note attachment, or persistent attached-context semantics.
- No high-quality-only retrieval toggle.
- No new schema for scope-history snapshots.
- No embedded YouTube player.
- No offline read/list/sync behavior.
- No untested tag or collection mutation introduced by this slice.
- No APK publication or production deployment.

## Requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| A3-R1 | `/ask` uses a mobile-safe full-height layout with a visible scope banner and composer. | Browser evidence at 390 x 844 shows the composer, send button, and scope banner without horizontal overflow. |
| A3-R2 | Empty Ask submit is handled truthfully. | Empty send does not create a turn and provides an observable nudge or stable disabled state. |
| A3-R3 | Provider-offline/error state remains understandable. | Browser evidence or focused test proves `LLM_PROVIDER_OFFLINE` copy is shown as AI service unavailability. |
| A3-R4 | Scoped Ask remains supported for item, selected, topic, collection, and tag scopes. | Tests or route fixtures prove scope request body and scope banner keep using real IDs and labels. |
| A3-R5 | Unsupported Ask attachment actions are absent. | Copy/action scanner finds no paste-link, write-note, attach, high-quality-only, or persisted-scope-history claims. |
| A3-R6 | Item Detail mobile tabs organize existing data without changing data semantics. | Browser evidence shows Original, Digest, Ask, Related, and Details tabs on a full item. |
| A3-R7 | Weak item detail keeps repair affordance and source-quality context. | Browser evidence shows weak-source reason and Add text path. |
| A3-R8 | Focus mode remains shell-free and readable. | Browser evidence shows focus route without bottom navigation or tab chrome. |
| A3-R9 | Related/no-related states are truthful. | Browser evidence covers an item with related results and an item without related results, or a documented fixture proves no-related state. |
| A3-R10 | Tag/collection mutation controls are not made worse on mobile. | Existing real controls may remain, but this slice does not add new untested mutation surfaces. |

## Data And Fixture Requirements

Use isolated temporary SQLite fixtures:

- Full-text item with summary, category, quotes, manual tag, collection, included topics, and related chunks.
- Weak item with `metadata_only` or similar limited quality.
- No-related item with no embedded chunks.
- Existing library/thread history only if deterministic local setup can create it safely.

## UX Rules

- Mobile pages need stable bottom-nav clearance.
- Ask composer must remain reachable at the bottom of the viewport.
- Item Detail tabs must be visible as controls, not only headings.
- Focus mode should remove app shell chrome for reading.
- All text must fit inside controls at 390 x 844.

## Validation Gates

- A3 copy/action scanner.
- A3 fixture seed script.
- Focused Ask request/scope tests.
- Browser-mobile evidence for Ask empty, Ask scoped, Item Detail tabs, weak item detail, focus, related, and no-related.
- `git diff --check`.
- `npm run typecheck`.
- `npm run lint`.
- Focused tests impacted by Ask and item detail.
- `npm test` and `npm run build` before claiming local completion.

## Completion Wording

When complete, use exactly:

`Android A3 Ask composer and Item Detail completed locally with browser evidence; APK evidence and production release still pending.`
