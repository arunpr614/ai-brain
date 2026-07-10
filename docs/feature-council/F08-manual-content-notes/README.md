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
- `brainstorm/` — post-release tightening, future-feature, and annotation-tool opportunity reports in Markdown and standalone HTML.
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

## Implementation and release evidence

- `reviews/F08_MANUAL_CONTENT_NOTES_IMPLEMENTATION_ADVERSARIAL_REVIEW_2026-07-10_18-44-33_IST.md`
- `reviews/IMPLEMENTATION_REVIEW_DISPOSITION.md`
- `reviews/GLOBAL_NOTE_AI_DEFAULT_ADVERSARIAL_REVIEW_DISPOSITION_2026-07-10.md`
- `validation/IMPLEMENTATION_VALIDATION_2026-07-10.md`
- `validation/IMPLEMENTATION_DESIGN_QA_2026-07-10.md`
- `validation/PRODUCTION_SNAPSHOT_REHEARSAL_2026-07-10.md`
- `validation/PRODUCTION_RELEASE_2026-07-10.md`
- `validation/GLOBAL_NOTE_AI_DEFAULT_SETTING_VALIDATION_2026-07-10.md`

The release is production-verified at `8654f293d0f8615617df883e4703c0ca098a6029`: 785 tests, typecheck, lint, production build, dependency audit, interactive desktop/mobile validation, adversarial closure, snapshot rehearsal, verified live backup, migrations through 023, exact content-free audit/repair, and a fully cleaned synthetic save/search/index/Related/Ask/opt-out/delete lifecycle all pass. UI, write, and worker flags are enabled; remote note AI remains consent-blocked until the owner acknowledges the effective providers in-product.

## Global AI inclusion default follow-on

The post-release Settings > My notes preference makes `Include in AI & connections` an owner-controlled default for first save and explicit recreation. It is not retroactive: every existing note keeps its current per-note choice. The setting defaults off, cannot be enabled until all active remote providers are acknowledged by name, and is cleared when provider consent is revoked. Exact note search is unchanged.

The follow-on is production-released through PR #12 / merge `01721d1c`: 796 tests, full type/lint/build gates, client consent-flow coverage, adversarial closure, documentation/privacy validation, and a zero-vulnerability dependency audit pass. The guarded deploy verified backup, service health, strict production Anthropic/Gemini connectivity, Settings/API presence, and Recall timer preservation. The global default remains off; the deployment preserved the owner's two existing provider approvals without changing them.
