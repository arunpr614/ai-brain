# AI Brain Held Browser Transcript Manual Enrichment

**Date:** 2026-07-22
**Status:** V2 final planning package; implementation and all live flags remain off

## Start Here

This package extends the item-initiated YouTube transcript recovery concept with a third, separate choice after attachment:

1. **Inspect visible transcript** in the extension.
2. **Add transcript to this Brain item** under a processing hold.
3. **Review AI processing** in the Brain item and explicitly authorize the exact digest and search-index plan.

Open the [V2 throwaway prototype](prototype/2026-07-22_ai_brain_item_recovery_manual_enrichment_ux_prototype_v2_final.html) to experience the flow. It is inert, uses synthetic data and local assets, and makes no extension, YouTube, Brain, or external-provider request.

The V2 neural-network visual is an original image generated for this prototype, with no source logo or text. The packaged Lucide v0.468.0 bundle retains its ISC license header.

## Final Authority Order

If two artifacts appear to differ, use this order:

1. [V1 review disposition matrix](2026-07-22_v1_review_disposition_matrix_v2_final.md)
2. [V2 implementation plan](2026-07-22_ai_brain_item_recovery_manual_enrichment_implementation_plan_v2_final.md)
3. [V2 PRD](2026-07-22_ai_brain_item_recovery_manual_enrichment_prd_v2_final.md)
4. [V2 Product Council decision](2026-07-22_ai_brain_item_recovery_manual_enrichment_product_council_v2_final.md)
5. [V2 UX specification](2026-07-22_ai_brain_item_recovery_manual_enrichment_ux_spec_v2_final.md)
6. [V2 current-state audit](2026-07-22_current_state_audit_v2_final.md)
7. [V2 requirement traceability](2026-07-22_manual_enrichment_v2_requirement_traceability.md)

The selected API architecture is a new strict `POST /api/items/:id/enrichment-runs` command plus a contained legacy `/enrich` route. The legacy route cannot release or process an active browser-transcript hold.

The integrated base now owns migration number `026` for NotebookLM export. The upstream YouTube browser-transcript migration must be rebased and frozen at the next free number before manual-enrichment migration numbers are assigned; on baseline `c22b5aa`, the nominal sequence is upstream `027`, expand `028`, and later contract `029`.

## Final Artifacts

| Artifact | Purpose |
| --- | --- |
| [Current-state audit V2 Final](2026-07-22_current_state_audit_v2_final.md) | Pinned code evidence, gaps, scope, and selected direction |
| [Product Council V2 Final](2026-07-22_ai_brain_item_recovery_manual_enrichment_product_council_v2_final.md) | Reconciled Designer, Product, and Architecture decisions |
| [PRD V2 Final](2026-07-22_ai_brain_item_recovery_manual_enrichment_prd_v2_final.md) | Product, consent, state, API, rollout, and acceptance contract |
| [Implementation Plan V2 Final](2026-07-22_ai_brain_item_recovery_manual_enrichment_implementation_plan_v2_final.md) | Schema, services, workers, security, tests, rollout, and rollback |
| [UX Specification V2 Final](2026-07-22_ai_brain_item_recovery_manual_enrichment_ux_spec_v2_final.md) | Desktop/mobile interaction, copy, accessibility, and scenario contract |
| [Requirement traceability](2026-07-22_manual_enrichment_v2_requirement_traceability.md) | `ME-F01` through `ME-F38` implementation, evidence, owner, and no-go mapping |
| [Review disposition matrix](2026-07-22_v1_review_disposition_matrix_v2_final.md) | Every accepted adversarial theme and its V2 destination |
| [Final V2 adversarial review](MANUAL_ENRICHMENT_V2_FINAL_CROSS_ARTIFACT_ADVERSARIAL_REVIEW_2026-07-22_17-47-51_IST.md) | Publication verdict, remaining implementation blockers, and residual risk |
| [Final delivery report](2026-07-22_ai_brain_item_recovery_manual_enrichment_planning_package_final_report.md) | Scope, decisions, validation evidence, Git state, and handoff |
| [Interactive V2 prototype](prototype/2026-07-22_ai_brain_item_recovery_manual_enrichment_ux_prototype_v2_final.html) | Inert experience visualization and direct-state test surface |

## Prototype Views

The toolbar exposes the main journey and failure states. These query forms are useful for direct review:

- `?scenario=ready-enrich`: held remote-provider plan
- `?scenario=ready-enrich&view=enrichment-review`: consent dialog
- `?scenario=local`: all-local inline authorization
- `?scenario=done`: complete digest and search index
- `?scenario=indexing-failure`: digest-preserving partial success
- `?scenario=response-lost`: durable receipt reconciliation
- `?scenario=provider-after-digest`: stage-aware provider drift
- `?scenario=authorization-expired-between-stages`: expiry after digest
- `?scenario=deleting-in-flight`: deletion while a provider call exists
- `?scenario=ready-enrich&viewport=mobile`: compact item tabs and mobile sheet

## Review Evidence

The immutable V1 artifacts remain beside their reviews so the V2 delta is auditable. Inputs include the Designer, Product Manager, and Technical Architect reviews; formal adversarial reports for the audit, Council, PRD, implementation plan, UX specification, and prototype; and the package-wide consistency report.

Formal reports:

- [Current-state audit review](2026_07_22_CURRENT_STATE_AUDIT_ADVERSARIAL_REVIEW_2026-07-22_16-34-40_IST.md)
- [Product Council review](2026_07_22_AI_BRAIN_ITEM_RECOVERY_MANUAL_ENRICHMENT_PRODUCT_COUNCIL_V1_ADVERSARIAL_REVIEW_2026-07-22_16-34-40_IST.md)
- [PRD review](2026_07_22_AI_BRAIN_ITEM_RECOVERY_MANUAL_ENRICHMENT_PRD_V1_ADVERSARIAL_REVIEW_2026-07-22_16-34-40_IST.md)
- [Implementation plan review](2026_07_22_AI_BRAIN_ITEM_RECOVERY_MANUAL_ENRICHMENT_IMPLEMENTATION_PLAN_V1_ADVERSARIAL_REVIEW_2026-07-22_16-34-40_IST.md)
- [UX specification review](2026_07_22_AI_BRAIN_ITEM_RECOVERY_MANUAL_ENRICHMENT_UX_SPEC_V1_ADVERSARIAL_REVIEW_2026-07-22_16-34-40_IST.md)
- [Prototype review](prototype/2026_07_22_AI_BRAIN_ITEM_RECOVERY_MANUAL_ENRICHMENT_UX_PROTOTYPE_V1_ADVERSARIAL_REVIEW_2026-07-22_16-34-40_IST.md)
- [Cross-artifact review](MANUAL_ENRICHMENT_V1_PACKAGE_CROSS_ARTIFACT_CONSISTENCY_ADVERSARIAL_REVIEW_2026-07-22_16-34-40_IST.md)
- [Final V2 cross-artifact review](MANUAL_ENRICHMENT_V2_FINAL_CROSS_ARTIFACT_ADVERSARIAL_REVIEW_2026-07-22_17-47-51_IST.md)

## Boundary

This is a plan and inert research prototype, not production behavior. Browser capture approval does not authorize downstream processing. Live work additionally requires the exact private `manual_transcript_enrichment_manifest_v1`, a current server policy decision, isolated `manual-transcript-lab` worker mode, the full traceability evidence, and a separate production decision.
