# UX FCP-004 Relationship Graph And Connection Map v2

Status: v2 final planning package  
Review addressed: `reviews/FCP004_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md`

> **Deferred on 2026-07-13; not active for implementation.** This UX plan is historical evidence. No graph, list, path, or prototype work is authorized by the [current decision](Graphify-Opportunity-Decision).

## UX Direction

The graph is an inspection tool. It should reveal relationships and provenance, not become a decorative constellation.

## Key Views

- Graph canvas for spatial exploration.
- Outline/list fallback grouped by node or relationship type.
- Detail panel for selected node/edge.
- Filter bar for source type, relationship type, quality, recency.

## States

| State | UX behavior |
| --- | --- |
| Empty library | Show source examples and link to Capture. |
| No relationships | Explain which relationships appear after tags/collections/anchors/Ask evidence. |
| Stale graph | Show rebuild status and last generated time. |
| Large graph | Start filtered and provide search. |
| Weak sources hidden | Show hidden count and toggle. |

## Interaction Notes

- Clicking an edge opens provenance details before navigating.
- Node labels can be abbreviated, with full title in detail panel.
- Relationship explanations should use plain language: "same tag", "same collection", "semantically similar", "cites anchor".

## Accessibility

- Outline/list fallback is required.
- Keyboard navigation must work in fallback view.
- Canvas interactions need non-canvas equivalents.

## Prototype

No standalone HTML prototype. First design artifact should be an interactive wireframe using real graph DTO samples.
