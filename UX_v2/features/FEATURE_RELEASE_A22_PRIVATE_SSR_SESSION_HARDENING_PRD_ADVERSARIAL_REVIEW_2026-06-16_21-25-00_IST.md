# Adversarial Review - A22 Private SSR Session Hardening PRD V1

Created: 2026-06-16 21:25:00 IST
Reviewer: Codex adversarial review pass
Target: `FEATURE_RELEASE_A22_PRIVATE_SSR_SESSION_HARDENING_PRD_V1_2026-06-16_21-24-00_IST.md`
Recommendation: Revise before implementation planning

## Findings

| Severity | Finding | Evidence | Revision Input |
| --- | --- | --- | --- |
| P1 | `next` handling is underspecified for dynamic routes and query params. | Ask uses query params; item/topic/collection routes need stable fallback next URLs. | Define route-specific `next` construction and preserve important query params where available. |
| P1 | The PRD does not require a second staged review after A22. | A21 found a blocker; A22 source changes must be reviewed again before commit. | Add an explicit post-A22 final review gate. |
| P2 | Page-level tests are not required. | Server components are harder to test directly in this repo. | Require at least static/source scan evidence plus full validation, and add tests only where local patterns make them low-risk. |

## Required Revisions

1. Specify `next` URL policy per target route.
2. Require post-A22 final review.
3. Allow source-scan verification where page component tests would be disproportionate.
