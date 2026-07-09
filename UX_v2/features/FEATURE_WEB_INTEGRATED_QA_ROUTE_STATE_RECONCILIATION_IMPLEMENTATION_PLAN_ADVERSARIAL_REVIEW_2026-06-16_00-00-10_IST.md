# Adversarial Review - Web Integrated QA and Route-State Reconciliation Implementation Plan v1

**Review created:** 2026-06-16 00:00:10 IST
**Reviewed artifact:** `FEATURE_WEB_INTEGRATED_QA_ROUTE_STATE_RECONCILIATION_IMPLEMENTATION_PLAN_V1_2026-06-15_23-59-27_IST.md`
**Product source:** `FEATURE_WEB_INTEGRATED_QA_ROUTE_STATE_RECONCILIATION_PRD_V2_2026-06-15_23-58-23_IST.md`
**Reviewer:** Codex using adversarial-review skill
**Verdict:** No-go for execution until P1 findings are fixed in plan v2.

## Summary

The plan is directionally correct and keeps the work local-only. It also names cleanup and redaction rules. However, it still leaves enough ambiguity that execution could either miss source matrix rows or turn into a broad, slow, unfocused retest. Plan v2 needs a bounded route-state ledger, deterministic empty/no-results setup, a clear `/review` classification, and feasible accessibility tooling choices.

## Findings

| ID | Severity | Finding | Evidence | Required fix |
| --- | --- | --- | --- | --- |
| P1-1 | P1 | The plan omits `/review` even though the source route-state matrix includes it. | Source matrix has `/review` attention list; plan route list does not. | Plan v2 must either test `/review` if route exists, or classify it as `Not applicable`/`Deferred` with evidence from route discovery. |
| P1-2 | P1 | Empty/no-results states are not deterministic. | Plan says use empty-state DB "if needed" but does not define which rows require empty/no-result setup or exact queries to produce no results. | Plan v2 must define deterministic empty/no-results checks: empty DB for library/needs-upgrade where possible, search query with guaranteed no match, missing topic/collection routes. |
| P1-3 | P1 | Evidence inventory could become hand-written and error-prone. | Step 1 says create inventory table but does not require parsing existing browser reports or listing screenshot files. | Plan v2 must require a file-backed evidence inventory: list existing screenshot/report files and map them in a table before assigning `Covered by slice QA`. |
| P1-4 | P1 | Accessibility zoom requirement may be infeasible with the in-app browser and could block unnecessarily. | Plan says set browser/page zoom or CSS zoom if supported, otherwise record blocker. CSS zoom can distort evidence and "blocker" may be too strong if manual release sweep is already pending. | Plan v2 must define a feasible fallback: viewport text-overflow and layout checks plus mark 200 percent zoom as `Needs release follow-up` if tool support is absent, not as local QA failure. |
| P2-1 | P2 | API/public asset checks need an exact auth boundary. | Plan mixes local HTTP checks with temp auth as needed but does not separate protected API checks from public asset checks. | Plan v2 should specify protected APIs use stub/session cookie where route only checks cookie presence; public assets use no cookie. |
| P2-2 | P2 | Combined seed order and duplicate rows are not controlled. | Running all seed scripts can produce overlapping tags/collections/routes if repeated. | Plan v2 should remove the temp DB first, run seed scripts once in a fixed order, save their JSON manifests, and avoid rerunning against the same DB. |
| P2-3 | P2 | Static gates may be unnecessarily expensive after docs-only execution. | The plan always runs full tests/build even if no source changed during integrated QA. This is conservative but costly. | Keep full gates if source/test scripts change; otherwise require at least `git diff --check` and cite prior same-turn full test/build evidence, or explicitly decide to rerun all. |

## Positive Observations

- The plan keeps production data out of QA.
- It includes cleanup for generated backup artifacts and dev servers.
- It explicitly forbids raw token/PIN/session/pairing-code transcription.
- It recognizes live provider, Android, backup/rollback, deploy, and live smoke as expected blockers.

## Required Plan v2 Changes

1. Add `/review` route discovery/classification.
2. Define deterministic empty/no-results route-state checks.
3. Require a file-backed evidence inventory before reused-evidence statuses.
4. Replace infeasible zoom blocking with a clear release-follow-up fallback.
5. Separate protected API checks from public asset checks.
6. Fix seed order and cleanup.
7. Clarify when full tests/build are rerun versus prior evidence cited.

## Re-Review Recommendation

Plan v2 can proceed to execution without another plan adversarial review if it directly addresses all P1 findings and does not expand scope into production deployment or Android implementation.
