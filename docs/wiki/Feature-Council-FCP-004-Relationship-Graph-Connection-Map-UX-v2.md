# UX FCP-004 Relationship Graph And Connection Map v2

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Latest revision within the 2026-06-28 planning package.
Runtime verification: Not provided.
Superseded by: None.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Historical planning record from 2026-06-28.** This is the latest revision within that planning package. It is not proof of current implementation, deployment, or runtime behavior. Use the living [Feature Catalog](Feature-Catalog) for present status.

Status: v2 final planning package  
Review addressed: [reviews/FCP004_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-FCP-004-v1-Adversarial-Review)

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
