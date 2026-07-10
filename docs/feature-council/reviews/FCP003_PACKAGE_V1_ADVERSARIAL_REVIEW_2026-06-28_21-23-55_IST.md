# FCP-003 Package v1 Adversarial Review

Targets:

- `prd/PRD_FCP003_CONTEXTUAL_ASK_EVIDENCE_SCAN_v1.md`
- `ux/UX_FCP003_CONTEXTUAL_ASK_EVIDENCE_SCAN_v1.md`
- `technical/TECH_FCP003_CONTEXTUAL_ASK_EVIDENCE_SCAN_v1.md`

## Findings

### P1 - Evidence Scan could overclaim truth

v1 says classify support/contradiction, but does not limit the claim to selected local sources. The result must be framed as source support, not universal truth.

### P1 - Source-set snapshots are underspecified

Ask and Evidence Scan need reproducibility. v1 does not define what source set, quality state, retrieval version, or prompt/model state is stored.

### P2 - High-quality filter needs exact policy

"High quality" cannot be vague. It should map to capture quality, extraction warning, chunks, embedding readiness, and repair state.

### P2 - UX needs a no-evidence taxonomy

No eligible sources, no matching evidence, irrelevant evidence, provider failure, and indexing stale are different outcomes.

## Required v2 Changes

- Frame verdicts as local-source evidence labels.
- Define source-set snapshots and quality policy.
- Add no-evidence/failure taxonomy.
- Add privacy requirements for claims, queries, and retrieved excerpts.
