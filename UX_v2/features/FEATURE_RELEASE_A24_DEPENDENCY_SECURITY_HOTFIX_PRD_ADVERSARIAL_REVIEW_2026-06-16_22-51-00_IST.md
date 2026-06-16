# Feature Release A24 Dependency Security Hotfix PRD - Adversarial Review

Created: 2026-06-16 22:51:00 IST
Reviewer stance: Brutally honest adversarial review
Reviewed target: `UX_v2/features/FEATURE_RELEASE_A24_DEPENDENCY_SECURITY_HOTFIX_PRD_V1_2026-06-16_22-50-00_IST.md`
Report path: `UX_v2/features/FEATURE_RELEASE_A24_DEPENDENCY_SECURITY_HOTFIX_PRD_ADVERSARIAL_REVIEW_2026-06-16_22-51-00_IST.md`

## Executive Verdict

Conditional go. The PRD correctly treats the Next.js proxy-bypass advisory as release-blocking, but v1 is too optimistic about "clean" status unless it explicitly separates deployed production dependencies from local development dependencies and demands a redeploy of the patched build.

## Evidence Inspected

- `npm audit --omit=dev` before patch: high Next.js proxy-bypass advisory, moderate PostCSS, moderate tar.
- `package.json` before patch: `next: 16.2.5`, `eslint-config-next: 16.2.5`.
- `src/proxy.ts` exists and is release-critical for auth routing.
- A22 evidence indicates server-side signed-session verification exists, but framework bypass still matters.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. PRD v1 does not explicitly require redeploying after dependency patch

**Evidence:** v1 lists redeploy in goals and exit criteria, but requirements mix validation and deploy without naming a no-go if the patch is committed but not deployed.
**Why it matters:** A local clean audit does not remove the production risk if `brain.arunp.in` still runs the old standalone bundle.
**Failure mode:** The tracker could claim A24 is complete while production remains on `next@16.2.5`.
**Recommendation:** Add a hard no-go: A24 is not closed until the patched build is deployed and live-smoked.

### P2 - Medium Risk

#### 1. Development audit findings may distract from production risk

**Evidence:** `npm audit` includes development-only packages such as `tsx` and `esbuild`; production deploy uses the standalone runtime plus production install.
**Why it matters:** The release gate should prioritize production risk but still record development tool fixes when safely available.
**Failure mode:** Over-broad dependency updates could create avoidable build/test churn.
**Recommendation:** Require `npm audit --omit=dev` as the production gate and `npm audit` as a secondary workspace health gate.

#### 2. PostCSS override compatibility must be build-proven

**Evidence:** Next `16.2.9` still declares `postcss: 8.4.31`; audit wants a patched PostCSS.
**Why it matters:** An override is safer than ignoring the advisory only if Next build behavior remains intact.
**Failure mode:** CSS/build output could break after override.
**Recommendation:** Require production build and APK packaging after overrides.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

It underplays that the first A23 production deploy succeeded but was not the final clean release because dependency audit discovered a fresh blocker.

## Missing Validation

- Explicit post-redeploy live smoke.
- Explicit audit-clean evidence after lockfile update.
- Explicit note that Android publication gates remain open.

## Revised Recommendations

Revise the PRD to include hard no-go wording for redeploy, distinguish production audit from full audit, and require build/APK checks for the override compatibility.

## Go / No-Go Recommendation

Conditional go for A24 execution only after v2 adds the no-go gates above.

## Plan Revision Inputs

### Required Deletions

- Remove any wording that implies local validation alone closes production risk.

### Required Additions

- Add `hotfix_not_deployed` as a no-go label.
- Add dependency-version evidence.
- Add production live-smoke acceptance.

### Required Acceptance Criteria Changes

- A24 is closed only when the patched dependency set is both committed and deployed.

### Required Validation Changes

- Run both `npm audit --omit=dev` and full `npm audit`.
- Run full validation and APK packaging after overrides.

### Required No-Go Gates

- Block completion if production still runs the old dependency bundle.
- Block completion if audits are not clean.

## Residual Risks

Even after the hotfix, APK publication remains blocked by non-A24 release gates.
