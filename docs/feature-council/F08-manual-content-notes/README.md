# F08 Manual Content Notes

This folder is the decision, design, implementation, validation, and release record for the private manual note attached to each AI Brain library item.

The requested feature is an **attached note**, distinct from the existing standalone `source_type='note'` capture flow. One canonical Markdown note belongs to one existing item. It never replaces original content or AI-generated material and never creates a second library card or graph node.

## Artifact map

- `council/` — independent Product/AI/PM, UX, and technical council inputs.
- `prd/` — product requirements v1 and adversarially revised v2.
- `ux/` — responsive UX/UI specification v1 and v2.
- `technical/` — implementation plan v1 and v2.
- `prototype/` — high-fidelity HTML prototype, source, screenshots, and visual QA.
- `reviews/` — QA and adversarial reports.
- `validation/` — implementation, migration, security, design, release, and production evidence.
- `PROJECT_TRACKER.md` — milestones, owners, gates, and live state.
- `DECISION_LOG.md` — durable decisions and changes.

The final v2 documents supersede v1 where they differ. Council and v1 artifacts remain immutable review evidence.

## Approved v2 contract

- `prd/PRD_F08_MANUAL_CONTENT_NOTES_v2.md`
- `ux/UX_F08_MANUAL_CONTENT_NOTES_v2.md`
- `technical/TECH_F08_MANUAL_CONTENT_NOTES_v2.md`
- `reviews/V1_REVIEW_DISPOSITION.md`
- `validation/PRODUCTION_SOURCE_BASELINE_ATTESTATION_2026-07-10.md`

Implementation may proceed only after merging attested production snapshot `8178117`. UI, write, and semantic-worker flags remain default off until their respective gates pass.
