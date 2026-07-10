# FCP-002 Package v1 Adversarial Review

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Review record.
Runtime verification: Not provided.
Superseded by: [Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-PRD-v2](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-PRD-v2), [Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-Technical-v2](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-Technical-v2), [Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-UX-v2](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-UX-v2).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Review record.** These findings are preserved for traceability. Use the current successor: [Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-PRD-v2](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-PRD-v2), [Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-Technical-v2](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-Technical-v2), [Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-UX-v2](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-UX-v2).

Targets:

- [prd/PRD_FCP002_SOURCE_WORKSPACE_READING_STUDIO_LITE_v1.md](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-PRD-v1)
- [ux/UX_FCP002_SOURCE_WORKSPACE_READING_STUDIO_LITE_v1.md](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-UX-v1)
- [technical/TECH_FCP002_SOURCE_WORKSPACE_READING_STUDIO_LITE_v1.md](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-Technical-v1)

## Findings

### P1 - "Reading Studio" risks overpromising PDF annotation

v1 includes reading pane and anchors but does not define whether anchors are page-based, text-based, chunk-based, or artifact-based. A high-fidelity PDF annotation layer could explode scope.

### P1 - Citation metadata source of truth is unclear

The current `items` table has limited source metadata. v1 needs a clear override model and citation eligibility rules.

### P2 - Mobile behavior is too thin

The v1 mobile note says tabs "may" be used. This needs a required responsive model.

### P2 - Anchor staleness needs lifecycle rules

Source repair can invalidate extracted text and chunks. Anchors must survive, degrade, or be marked stale predictably.

## Required v2 Changes

- Define Reading Studio Lite as an inspection/anchor/citation workspace, not full annotation.
- Specify anchor model and staleness behavior.
- Define metadata override and citation eligibility.
- Add desktop/mobile UX requirements.
