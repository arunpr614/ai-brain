# FCP-005 Package v1 Adversarial Review

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Review record within the 2026-06-28 planning package.
Runtime verification: Not provided.
Superseded by: [Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-PRD-v2](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-PRD-v2), [Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-Technical-v2](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-Technical-v2), [Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-UX-v2](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-UX-v2).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Historical planning review.** These findings are preserved for traceability. Use the reviewed planning successor: [Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-PRD-v2](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-PRD-v2), [Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-Technical-v2](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-Technical-v2), [Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-UX-v2](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-UX-v2). Then check the living [Feature Catalog](Feature-Catalog) for present status.

Targets:

- [prd/PRD_FCP005_AI_SERVICES_PRIVACY_TRUST_CENTER_v1.md](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-PRD-v1)
- [ux/UX_FCP005_AI_SERVICES_PRIVACY_TRUST_CENTER_v1.md](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-UX-v1)
- [technical/TECH_FCP005_AI_SERVICES_PRIVACY_TRUST_CENTER_v1.md](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-Technical-v1)

## Findings

### P1 - "Privacy Trust Center" can easily become false reassurance

AI Brain uses hosted deployment and configurable cloud AI providers. v1 does not force provider-specific data-flow copy. Generic privacy language would be dangerous.

### P1 - Usage accounting drift is a blocker for cost/readiness claims

Provider status without correct provider usage rows can mislead. v1 mentions risk but not as prerequisite.

### P1 - Diagnostics allowlist is missing

The package must say exactly what diagnostics may include and what is forbidden.

### P2 - Offline/backups need scope boundaries

Offline fallback, backups, and exports are different trust concepts. v1 groups them too loosely.

## Required v2 Changes

- Add provider-specific data-flow matrix.
- Make usage accounting correction a prerequisite for cost UI.
- Add diagnostics allowlist/denylist.
- Separate AI readiness, privacy, offline, backup, and export sections.
