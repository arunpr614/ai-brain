# Feature Release A11 Production Deploy And Android Runtime PRD - Adversarial Review

**Created:** 2026-06-16 14:13:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `UX_v2/features/FEATURE_RELEASE_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_PRD_V1_2026-06-16_14-12-00_IST.md`
**Report path:** `UX_v2/features/FEATURE_RELEASE_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_PRD_ADVERSARIAL_REVIEW_2026-06-16_14-13-00_IST.md`

## Executive Verdict

Conditional go only if V2 separates web production release from APK publication. The V1 PRD is directionally useful, but it still risks letting a successful locked-screen Android launch sound like full Android release readiness.

## Evidence Inspected

- A7 release packet showing deploy, live Ask, and Android runtime as open blockers.
- A10 QA report showing local Ollama/provider proof was blocked.
- Fresh production provider check output from the remote host.
- Fresh APK build/install evidence for `brain-debug-v1.0.3-code4.apk`.
- Android screenshots before and after production deploy.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found for web deploy if backup and postdeploy smoke pass.

### P1 - High Risk

#### 1. V1 can overclaim Android readiness

**Evidence:** V1 includes APK build/install/launch in the objective, but the out-of-scope section is the only place that blocks authenticated Android navigation and TalkBack claims.
**Why it matters:** A release packet could convert "APK launches locked screen" into "APK publication ready."
**Failure mode:** User receives an APK that installs but still has untested share, pairing persistence, stale-cache, keyboard, or accessibility failures.
**Recommendation:** V2 must mark APK publication as no-go unless authenticated Android flows, native share, stale-cache recovery, keyboard, and TalkBack have runtime proof.

#### 2. Local provider failure needs explicit deploy rationale

**Evidence:** A10 local provider preflight failed because local Ollama was absent, while remote production providers pass.
**Why it matters:** Running deploy with provider warn-only can hide real provider failures if not justified.
**Failure mode:** Production deploy proceeds while Ask is broken.
**Recommendation:** V2 must require remote provider preflight and live Ask SSE proof after deploy, not merely `--warn-only`.

### P2 - Medium Risk

#### 1. Logs can contain non-blocking but important provider warnings

**Evidence:** Production journal showed enrichment backoff warnings around deployment time.
**Why it matters:** Background workers can be degraded while interactive Ask works.
**Failure mode:** Release is declared clean while enrichment backlog silently grows.
**Recommendation:** V2 must record these as residual observability risk unless current interactive Ask/provider checks fail.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

The PRD bundles web deploy and Android runtime under one "release" heading. They share evidence, but they have different go/no-go outcomes.

## Missing Validation

- Authenticated Android route after PIN/session.
- Android native share intent delivery.
- TalkBack output.
- Stale WebView cache recovery after a prior build.

## Revised Recommendations

- Approve production web release only after backup, deploy, health, provider, live Ask, route smoke, and service log review.
- Keep APK publication blocked after APK install/launch unless the remaining Android runtime checks are executed.

## Go / No-Go Recommendation

Go for web deploy after gates pass. No-go for final APK publication.

## Plan Revision Inputs

### Required Deletions

- Remove any wording that equates locked APK launch with full APK release readiness.

### Required Additions

- Add exact remote provider and live Ask proof requirements.
- Add residual risk tracking for production enrichment warnings.

### Required Acceptance Criteria Changes

- Split web-deploy acceptance from APK-publication acceptance.

### Required Validation Changes

- Require postdeploy Android screenshot after clearing app data to avoid stale shell evidence.

### Required No-Go Gates

- Block APK publication without authenticated Android, native share, stale-cache, keyboard, and TalkBack evidence.

## Residual Risks

Even after web deploy, Android authenticated runtime remains unproven until an unlocked session or known test PIN is available.
