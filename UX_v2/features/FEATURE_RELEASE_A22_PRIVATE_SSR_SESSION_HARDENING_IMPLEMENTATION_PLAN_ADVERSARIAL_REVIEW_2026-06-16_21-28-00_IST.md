# Adversarial Review - A22 Private SSR Session Hardening Implementation Plan V1

Created: 2026-06-16 21:28:00 IST
Reviewer: Codex adversarial review pass
Target: `FEATURE_RELEASE_A22_PRIVATE_SSR_SESSION_HARDENING_IMPLEMENTATION_PLAN_V1_2026-06-16_21-27-00_IST.md`
Recommendation: Revise before execution

## Findings

| Severity | Finding | Evidence | Revision Input |
| --- | --- | --- | --- |
| P1 | The plan might create a helper in the wrong layer or duplicate redirect behavior. | Server component pages need `cookies()` and `redirect()`; a helper must not hide route-specific `next` construction. | Keep helper minimal: verify cookie store only; build next URLs in pages. |
| P1 | Validation list is not explicit enough. | A22 changes auth/page code after A20 validation. | Require typecheck, lint, full tests, build, env, build-artifacts, and APK packaging. |
| P2 | Staging hygiene after A22 is not explicit. | The staged candidate already has 293 paths. | Require exact A22 pathspec staging, staged count, `git diff --cached --check`, exclusion scan, and root running-log exclusion. |

## Required Revisions

1. Use minimal helper or direct `verifySessionCookie`; do not obscure route-specific `next`.
2. Explicitly run full validation matrix.
3. Explicitly verify staged index after A22.
