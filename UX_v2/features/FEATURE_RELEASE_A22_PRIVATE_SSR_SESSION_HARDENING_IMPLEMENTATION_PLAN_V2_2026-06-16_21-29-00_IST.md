# Feature Release A22 Private SSR Session Hardening Implementation Plan V2

Created: 2026-06-16 21:29:00 IST
Owner: Codex
Status: Approved for scoped execution
PRD: `FEATURE_RELEASE_A22_PRIVATE_SSR_SESSION_HARDENING_PRD_V2_2026-06-16_21-26-00_IST.md`
Supersedes: `FEATURE_RELEASE_A22_PRIVATE_SSR_SESSION_HARDENING_IMPLEMENTATION_PLAN_V1_2026-06-16_21-27-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A22_PRIVATE_SSR_SESSION_HARDENING_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_21-28-00_IST.md`

## Step Plan

1. Use direct `cookies()`, `redirect()`, and `verifySessionCookie` in target pages so route-specific `next` construction remains visible.
2. Guard every private SSR page found in the A21/A22 scan before private DB/provider calls, including Ask, item detail, item Ask, item repair, collection, topic, settings, settings taxonomy, capture duplicate detection, search, and needs-upgrade.
3. Preserve route context in `next` for Ask, capture, search, item detail, and item Ask with `URLSearchParams` or equivalent route-specific construction.
4. Upgrade `src/proxy.ts` from cookie presence to signed-session verification so forged cookies cannot bypass private HTML, private APIs, or bearer-route auth.
5. Harden `/api/capture/pdf` to verify signed-session cookies and re-validate bearer tokens without double-consuming rate-limit budget.
6. Add/update focused proxy and PDF route tests for signed sessions, forged-cookie rejection, and bearer compatibility.
7. Run static source scan for target page guard placement and staged cookie-presence patterns.
8. Run full validation: typecheck, lint, focused auth tests, full tests, build, env, build-artifacts, and APK packaging.
9. Create A22 QA report and PM update.
10. Stage exact A21/A22 source/test/governance/tracker files only.
11. Verify final staged count, `git diff --cached --check`, exclusion scan, and root `RUNNING_LOG.md` exclusion.
12. Append running log and keep it unstaged.

## No-Go Conditions

- Any A21-identified page still loads private data before verification.
- Any scanned private SSR page still loads private data before verification.
- Forged cookie strings still pass proxy or PDF upload auth.
- Valid bearer clients regress on bearer routes.
- Redirect breaks dynamic route not-found behavior after successful auth.
- Validation fails.
- Staged index includes root `RUNNING_LOG.md`, APK artifacts, heavy evidence, or broad forbidden paths.
