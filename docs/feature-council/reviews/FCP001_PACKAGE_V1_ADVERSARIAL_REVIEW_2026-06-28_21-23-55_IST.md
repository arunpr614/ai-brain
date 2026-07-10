# FCP-001 Package v1 Adversarial Review

Targets:

- `prd/PRD_FCP001_CAPTURE_QUALITY_REPAIR_CENTER_v1.md`
- `ux/UX_FCP001_CAPTURE_QUALITY_REPAIR_CENTER_v1.md`
- `technical/TECH_FCP001_CAPTURE_QUALITY_REPAIR_CENTER_v1.md`

## Findings

### P1 - v1 does not define the exact capture result taxonomy

The package says "shared taxonomy" but does not name the enums or map them to current API/extension/Android states. This would let channels drift again.

### P1 - Derived-state reset is underspecified

Repair can invalidate summaries, chunks, embeddings, related items, search, transcript jobs, and capture artifacts. v1 does not define transaction order or rollback.

### P1 - Auth and diagnostics are too vague

Repair APIs could expose captured text and source URLs. v1 needs a verified guard requirement and diagnostics allowlist.

### P2 - Android/extension verification needs to be a release gate

The package correctly mentions parity, but not as a hard release gate.

## Required v2 Changes

- Add explicit state taxonomy and channel mapping.
- Add repair data lifecycle and reset rules.
- Add auth, redaction, and diagnostics requirements.
- Add web/API/extension/Android acceptance criteria.
