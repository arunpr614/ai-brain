# FCP-002 Package v1 Adversarial Review

Targets:

- `prd/PRD_FCP002_SOURCE_WORKSPACE_READING_STUDIO_LITE_v1.md`
- `ux/UX_FCP002_SOURCE_WORKSPACE_READING_STUDIO_LITE_v1.md`
- `technical/TECH_FCP002_SOURCE_WORKSPACE_READING_STUDIO_LITE_v1.md`

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
