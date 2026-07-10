# FCP-005 Package v1 Adversarial Review

Targets:

- `prd/PRD_FCP005_AI_SERVICES_PRIVACY_TRUST_CENTER_v1.md`
- `ux/UX_FCP005_AI_SERVICES_PRIVACY_TRUST_CENTER_v1.md`
- `technical/TECH_FCP005_AI_SERVICES_PRIVACY_TRUST_CENTER_v1.md`

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
