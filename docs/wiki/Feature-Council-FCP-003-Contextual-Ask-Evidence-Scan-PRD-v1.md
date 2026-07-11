# PRD FCP-003 Contextual Ask And Evidence Scan v1

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Superseded draft within the 2026-06-28 planning package - do not implement.
Runtime verification: Not provided.
Superseded by: [Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-PRD-v2](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-PRD-v2).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Superseded planning draft - do not implement.** Use the later planning successor: [Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-PRD-v2](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-PRD-v2). Then check the living [Feature Catalog](Feature-Catalog) for present status.

Status: v1 draft  
Decision: Proceed with reduced scope  
Priority: P1

## Goal

Improve Ask so users can control context, prefer high-quality sources, and run a lightweight Evidence Scan that classifies whether selected sources support, contradict, nuance, or do not address a claim.

## User Problem

Ask works, but users cannot easily see or control which sources it uses. Evidence-heavy questions need stronger source selection and claim-level outputs.

## Scope

- Attach selected items/anchors/collections to Ask.
- High-quality-only source filter.
- Source set preview before asking.
- Evidence Scan for one claim over selected sources.
- Citations with verdict labels.

## Non-Goals

- Full Matrix extraction.
- General fact-checking against the internet.
- Legal/medical/financial truth guarantees.

## Acceptance Criteria

- User can ask over explicit source set.
- User can exclude weak sources.
- Evidence Scan produces support, contradicts, nuance, irrelevant, or insufficient evidence labels.
- Result shows citations and source eligibility.
