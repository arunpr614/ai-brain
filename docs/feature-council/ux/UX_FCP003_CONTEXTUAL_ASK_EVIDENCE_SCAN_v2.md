# UX FCP-003 Contextual Ask And Evidence Scan v2

Status: v2 final planning package  
Review addressed: `reviews/FCP003_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md`

## UX Direction

Ask should become visibly source-aware. Evidence Scan should feel like a careful local-source audit, not an oracle.

## Ask Flow

```mermaid
flowchart LR
  A["Open Ask"] --> B["Attach sources"]
  B --> C["Preview source readiness"]
  C --> D["Ask with high-quality filter"]
  D --> E["Streaming answer"]
  E --> F["Citations and skipped-source note"]
```

## Evidence Scan Flow

```mermaid
flowchart LR
  A["Enter claim"] --> B["Choose source set"]
  B --> C["Run local scan"]
  C --> D["Verdict groups"]
  D --> E["Open citation or source"]
```

## Key Screens

- Ask composer with context chips and source picker.
- Source readiness popover: included, excluded, weak, unindexed.
- Evidence Scan form: claim field, source set, high-quality toggle.
- Evidence result: grouped cards with verdict, cited passage, source, explanation, and action.

## State Taxonomy

| State | User copy direction |
| --- | --- |
| No eligible sources | "None of the selected sources are ready for Ask." |
| Some weak excluded | "3 weak sources were skipped." |
| No matching evidence | "The selected sources did not contain matching evidence." |
| All irrelevant | "Candidates were found, but none addressed the claim." |
| Contradiction | "Some selected sources contradict this claim." |
| Provider down | "AI classification is unavailable; source search may still work." |
| Index stale | "A source changed and needs re-indexing before scan." |

## Mobile Behavior

- Context chips wrap and can open a bottom sheet.
- Source picker is a full-screen sheet on mobile.
- Evidence result groups collapse by default when long.

## Accessibility

- Verdict is text-first, color secondary.
- Citation cards have stable headings.
- Streaming answer and scan progress use polite live regions.

## Prototype

See `prototypes/fcp003-contextual-ask-evidence.html`.
