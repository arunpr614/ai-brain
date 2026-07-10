# Adversarial Review - Web Integrated QA and Route-State Reconciliation PRD v1

**Review created:** 2026-06-15 23:57:53 IST
**Reviewed artifact:** `FEATURE_WEB_INTEGRATED_QA_ROUTE_STATE_RECONCILIATION_PRD_V1_2026-06-15_23-56-56_IST.md`
**Reviewer:** Codex using adversarial-review skill
**Verdict:** No-go for implementation planning until P1 findings are addressed in PRD v2.

## Summary

The PRD correctly identifies the next gate: reconcile the route-state matrix and prove the completed web slices together. It avoids production deployment and Android overclaims. However, it is still too loose for execution because it allows evidence reuse without a strict mapping rule, does not define an auditable status taxonomy, leaves local auth/fixture setup underspecified, and treats accessibility as a broad spot check rather than measurable release-risk evidence.

## Findings

| ID | Severity | Finding | Evidence | Required fix |
| --- | --- | --- | --- | --- |
| P1-1 | P1 | Evidence reuse can overclaim route-state coverage. | The PRD allows existing slice screenshots to be reused, but does not require exact route, state, viewport, theme, and source report matching. A row could be marked covered by a nearby screenshot that did not actually validate the state. | PRD v2 must require each reused evidence mapping to name the exact QA report and exact screenshot/report row, plus route/state/viewport/theme. If no exact match exists, status must be `Needs follow-up` or `Blocked`. |
| P1-2 | P1 | Matrix status taxonomy is not strict enough for release auditing. | The PRD lists statuses, but does not define when to use `Pass` vs `Covered by slice QA`, or how `Deferred`, `Blocked`, and `Not applicable` affect completion. | PRD v2 must define allowed statuses, completion semantics, and release impact for each status. Only `Pass` and `Covered by slice QA` may count as locally complete. |
| P1-3 | P1 | Local fixture/auth plan is underspecified. | The PRD says use a temporary QA database, but does not say whether to combine all prior seed scripts, how auth setup/unlock states are tested, how empty states are produced, or how temporary mutation cleanup is handled. | PRD v2 must require a single integrated QA DB setup plan, with explicit seed scripts, auth PIN setup, unauth/public tab checks, optional empty-state DB, and cleanup rules. |
| P1-4 | P1 | Accessibility acceptance is too vague. | The PRD asks for keyboard/focus/touch/overflow/zoom/reduced-motion spot checks but does not define minimum routes, controls, pass/fail criteria, or what remains release-blocking. | PRD v2 must define a minimum a11y smoke matrix with target routes, keyboard path, focus-visible checks, touch target sampling, 200 percent zoom routes, and reduced-motion check. |
| P2-1 | P2 | Public asset checks are named but not concretely bounded. | The PRD mentions manifest/icons, but does not list exact URLs or expected status/content-type. | Add exact public asset list and expected local HTTP checks. |
| P2-2 | P2 | Live provider and Android blockers are separated, but not tied to final release gates. | The PRD says no live provider/Android claim, but the acceptance criteria do not force those rows into the final blocker table. | Require the integrated report to include a release blockers table with live provider, Android, accessibility, review, backup/rollback, deploy, and smoke. |
| P2-3 | P2 | Browser report schema is not fully specified. | The PRD names report contents but does not define required top-level fields or token/pairing redaction fields. | Add a minimal report schema so implementation can be reviewed deterministically. |

## Positive Observations

- The PRD correctly does not require production deployment for local web completion.
- It explicitly excludes Android execution and fake prototype controls.
- It recognizes that `failed_without_saved_item` should not be forced into an item-detail screenshot.
- It requires public/auth route coverage, which was missing from earlier feature-slice QA.

## Required PRD v2 Changes

1. Add strict evidence reuse rules and exact mapping requirements.
2. Define route-state reconciliation statuses and completion semantics.
3. Add integrated fixture/auth setup and cleanup requirements.
4. Add a measurable accessibility smoke matrix.
5. Add exact public asset/API check list.
6. Add a required release blockers table.
7. Add a browser report schema with redaction rules.

## Re-Review Recommendation

PRD v2 can proceed to implementation planning without another PRD adversarial review if it directly addresses all P1 findings above and does not expand scope into Android, deployment, or new product features.
