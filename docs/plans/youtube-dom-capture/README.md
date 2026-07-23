# YouTube DOM Capture Planning Package

**Status:** Final V2 planning package<br>
**Decision:** Fixture/local implementation go after implementation gates; approved isolated lab canary conditional; production browser capture no-go<br>

## Recommended Reading Order

1. [PRD V2 final](2026-07-22_ai_brain_youtube_dom_capture_prd_v2_final.md)
2. [Implementation plan V2 final](2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v2_final.md)
3. [Review resolution matrix](2026-07-22_youtube_dom_capture_review_resolution_matrix.md)
4. [Interactive UX prototype](prototype/2026-07-22_ai_brain_youtube_dom_capture_ux_prototype.html)
5. [Integrated item recovery prototype](prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_ux_prototype.html)
6. [Item recovery Product Council decision](prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_product_council.md)
7. [Prototype QA records](prototype/README.md)
8. [Final planning report](2026-07-22_youtube_dom_capture_planning_package_final_report.md)

## What V2 Decides

- Extend the existing Brain extension with two explicit actions: local inspect, then confirmed save.
- Read only an already-visible YouTube transcript panel in an isolated top-frame execution.
- Preserve ordered repeated cues through viewport-overlap proof; fail on gaps or identity change.
- Add a true link-only route used by every extension action literally named `Save link`.
- Require bearer auth, exact extension origin, mandatory client/route versions, and a private lab manifest.
- Add one-active-source enforcement, durable request receipts, content-revision fences, recovery CAS, and downstream processing holds.
- Keep optional notes AI-off and conflict instead of overwriting different content.
- Use a separate worker-disabled lab data root/DB for authorized live validation.
- Keep browser-visible transcript capture blocked in production code.
- Start transcript recovery from the exact Brain item, preserve the ordinary extension popup on other tabs, and use a per-tab side panel only after an explicit toolbar click.

## Artifact Inventory

### Final

- `2026-07-22_ai_brain_youtube_dom_capture_prd_v2_final.md`
- `2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v2_final.md`
- `2026-07-22_youtube_dom_capture_review_resolution_matrix.md`
- `2026-07-22_youtube_dom_capture_planning_package_final_report.md`

### V1 And Specialist Inputs

- `2026-07-22_ai_brain_youtube_dom_capture_prd_v1.md`
- `2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v1.md`
- `2026-07-22_product_manager_agent_prd_input.md`
- `2026-07-22_product_manager_agent_v1_review.md`
- `2026-07-22_technical_architect_agent_prd_v1_review.md`
- `2026-07-22_technical_architect_agent_implementation_plan_v1_review.md`

### Adversarial Reviews

- `2026_07_22_AI_BRAIN_YOUTUBE_DOM_CAPTURE_PRD_V1_ADVERSARIAL_REVIEW_2026-07-22_12-22-02_IST.md`
- `2026_07_22_AI_BRAIN_YOUTUBE_DOM_CAPTURE_IMPLEMENTATION_PLAN_V1_ADVERSARIAL_REVIEW_2026-07-22_12-22-02_IST.md`

### Prototype

- `prototype/2026-07-22_ai_brain_youtube_dom_capture_ux_prototype.html`
- `prototype/2026-07-22_ai_brain_youtube_dom_capture_initial.png`
- `prototype/2026-07-22_ai_brain_youtube_dom_capture_review.png`
- `prototype/2026-07-22_ai_brain_youtube_dom_capture_mobile.png`
- `prototype/2026-07-22_ai_brain_youtube_dom_capture_prototype_qa.md`
- `prototype/README.md`
- `prototype/item-initiated-recovery/README.md`
- `prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_ux_prototype.html`
- `prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_product_council.md`
- `prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_prototype_qa.md`
- `prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_{item,ordinary_popup,guide,review,complete,mobile}.png`

## Scope Boundary

This package contains planning, reviews, and a throwaway UX prototype. It does not implement or production-enable DOM capture. The final plan deliberately keeps live canary and production behind separate evidence and approval gates.
