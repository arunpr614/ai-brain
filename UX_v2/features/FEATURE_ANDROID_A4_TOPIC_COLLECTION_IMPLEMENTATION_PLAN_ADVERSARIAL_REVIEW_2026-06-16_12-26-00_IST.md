# Adversarial Review: Android A4 Topic And Collection Implementation Plan v1

Created: 2026-06-16 12:26:00 IST
Reviewed artifact: `UX_v2/features/FEATURE_ANDROID_A4_TOPIC_COLLECTION_IMPLEMENTATION_PLAN_V1_2026-06-16_12-24-00_IST.md`
Reviewer stance: Skeptical implementation and QA review
Verdict: No-go until P1 findings are resolved in implementation plan v2.

## Findings

### P1 - Clipped-control check is under-specified and likely to be ignored

The PRD v2 added bottom-nav clearance, but the plan does not say how the browser script will fail on clipped controls. Without concrete metrics, the harness can still pass routes where buttons sit behind the fixed mobile nav.

Required revision: browser script must compute visible non-fixed controls, exclude fixed nav, and push issues when a control intersects the bottom viewport edge. Any false positive must be fixed by route spacing or explicitly recorded in QA.

### P1 - Mutation absence needs DOM-level checks, not only copy scans

The plan includes a copy scanner but does not define browser assertions for icon-only plus buttons, sheet triggers, or disabled fake mutation controls. This misses truth-matrix rows A0-COV-029 and A0-COV-031.

Required revision: browser metrics must collect visible buttons/links and fail if labels or aria-labels match add/create/plus/sheet patterns on Topic or Collection routes outside the allowed Ask/back/item-row links.

### P1 - Fixture does not prove scoped Ask query correctness

The browser states list topic/collection Ask pages but does not require verification that the fixture item appears in the Ask scope banner. A query typo could still render a generic missing-scope page and pass if the title is weakly asserted.

Required revision: topic and collection Ask states must assert `TOPIC`/`COLLECTION`, the exact fixture scope label, source count, and at least one fixture item title.

### P2 - Row rendering duplication could regress one route

The plan mentions duplicated rows but not a shared helper or symmetric acceptance. If only one route gets row excerpt/quality fixes, the other route can lag behind.

Required revision: use a small local shared row helper inside each route or consciously mirror row behavior and test both populated states.

## Positive Notes

- The scope is well-bounded and follows the A0 truth matrix.
- Empty existing-topic fixture closes the PRD v1 ambiguity.
- Production and APK claims are correctly excluded.
