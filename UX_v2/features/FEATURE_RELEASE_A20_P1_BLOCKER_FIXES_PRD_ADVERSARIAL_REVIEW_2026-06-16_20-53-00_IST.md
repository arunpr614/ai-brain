# Feature Release A20 P1 Blocker Fixes PRD - Adversarial Review

**Created:** 2026-06-16 20:53:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `UX_v2/features/FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_PRD_V1_2026-06-16_20-52-00_IST.md`
**Report path:** `UX_v2/features/FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_PRD_ADVERSARIAL_REVIEW_2026-06-16_20-53-00_IST.md`

## Executive Verdict

Conditional go after revision. V1 correctly targets the two P1 blockers, but its verified-session scope is too narrow if it leaves the advanced token page protected while other private route handlers still expose export/search/Ask data by cookie presence.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Verified-session scope may close only the loudest leak

**Evidence:** V1 names device pairing, `/library`, and `/more`, but A19 evidence also shows the proxy is presence-only and many private API routes do the same downstream check.
**Why it matters:** Fixing only the token endpoint still leaves private data APIs callable with forged cookies.
**Failure mode:** A20 claims the P1 is fixed while `/api/library/export.zip`, `/api/ask`, search, thread, or item APIs still return private data for `brain-session=stub`.
**Recommendation:** PRD v2 should at least introduce a shared verified-session request helper and apply it to staged private API routes touched by the UX v2 release or explicitly record any remaining legacy presence-only routes as follow-up blockers.

### P2 - Medium Risk

#### 1. Ask reset test path is optional

**Evidence:** V1 allows documentation if component-level coverage is not practical.
**Why it matters:** The bug is stateful and easy to regress.
**Failure mode:** A code-only effect is added but later broken without a test.
**Recommendation:** Extract a small pure helper for message/state reset or add a targeted component test if available. Documentation alone should be fallback only.

## Revised Recommendations

1. Add shared verified-session helpers for requests and cookie-store values.
2. Apply them to confirmed device pairing plus staged private API routes where tests can be updated safely.
3. Add invalid-cookie tests for at least device pairing and one private data export/API route.
4. Add pure-helper coverage for Ask prop-change state if full component testing is not available.

## Go / No-Go Recommendation

Go after PRD v2 broadens the session-hardening requirement and makes Ask regression coverage mandatory unless technically blocked with evidence.

## Residual Risks

Some legacy presence-only APIs may remain if A20 does not harden all of them. Any deferral must be explicit before commit consideration.
