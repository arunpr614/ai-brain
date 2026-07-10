# UX FCP-002 Source Workspace And Reading Studio Lite v2

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Current feature-council artifact.
Runtime verification: Not provided.
Superseded by: None.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Current feature-council artifact.** This is planning evidence, not proof of production implementation or current runtime behavior.

Status: v2 final planning package  
Review addressed: [reviews/FCP002_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-FCP-002-v1-Adversarial-Review)

## UX Direction

This is a quiet source-inspection workspace. It should help the user answer: "What did Brain save, where is the important passage, and how do I cite it?"

## Desktop Layout

- Header: item title, source quality, Ask eligibility, source link.
- Left pane: PDF viewer when artifact is available; extracted text fallback otherwise.
- Right pane tabs: Anchors, Metadata, Citation, Health.

## Mobile Layout

- Top segmented control: Content, Anchors, Metadata, Citation.
- Sticky bottom action for the current tab: Add anchor, Save metadata, Copy citation.
- Avoid desktop sidebars on mobile.

## States

| State | UX behavior |
| --- | --- |
| Full source | Normal reader with anchor creation. |
| Extracted text only | Text reader and note that original PDF/page positioning is unavailable. |
| Metadata incomplete | Metadata tab shows missing fields and citation preview warning. |
| Anchor stale | Anchor row keeps note/text but shows source changed and offers reattach/delete. |
| Citation unavailable | Explain missing metadata or unsupported source type. |
| Provider down | Does not block manual anchors or metadata editing. |

## Interaction Notes

- Anchor creation should be possible from selected text or visible chunk.
- Citation preview updates after metadata override.
- Source Health panel links to FCP-001 repair actions when source is weak.

## Accessibility

- Reading pane must preserve text zoom.
- Anchors are list items with stable names.
- Keyboard users can create anchor from selected text or focused passage.

## Prototype

No HTML prototype in this package; first implementation should reuse existing item detail styling and add a route-level wireframe before high-fidelity work.
