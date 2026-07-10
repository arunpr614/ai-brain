# Android Library Source Logo Draw Record

Created: 2026-06-17 10:34:59 IST
Status: Throwaway visual review artifact. No production code changed.
Scope: Library item cards only.

## Prototype

Open this file in the browser:

`/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/prototypes/android-library-source-logo-draw-record-2026-06-17_10-34-59_IST.html`

## What This Shows

The card keeps the compact Option A layout:

- title is clamped to two lines;
- enrichment and quality status stay below the title;
- source identity appears in the metadata row as logo plus text;
- filter/search/header/bottom navigation remain unchanged.

## Source Logo Pattern

| Source | Card treatment |
| --- | --- |
| YouTube | tiny YouTube logo + `YouTube` text |
| LinkedIn | tiny LinkedIn logo + `LinkedIn` text |
| Substack | tiny Substack logo + `Substack` text |
| Other URL/article | generic source icon + existing source text |
| PDF | generic document/source icon + `PDF` text |
| Note | generic note/source icon + `Note` text |

## Card Anatomy

```text
[ ]  Long title clamped to two lines max
     [tiny logo] YouTube / via Telegram / Metadata only / enrichment failed / 8h ago
```

## Design Guardrails

- Keep the text label beside every logo.
- Do not use logo-only cards.
- Do not add logos to filters in this slice.
- Keep logo size around 14px-16px.
- Mark logos as decorative for accessibility because the text label carries meaning.
- Use local or bundled assets for production if possible; the throwaway mock uses Simple Icons CDN for visual review only.

## Decision Needed

Confirm whether the logo location and size feel right before implementation.
