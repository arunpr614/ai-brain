# Feature Release A30 Android TalkBack Spoken Order Implementation Plan - Adversarial Review

Created: 2026-06-17 00:44:00 IST
Reviewer stance: Brutally honest adversarial review
Reviewed target: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A30_ANDROID_TALKBACK_SPOKEN_ORDER_IMPLEMENTATION_PLAN_V1_2026-06-17_00-43-00_IST.md`
Report path: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A30_ANDROID_TALKBACK_SPOKEN_ORDER_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_00-44-00_IST.md`

## Executive Verdict

Conditional go after revision. The plan is pointed at the right gate, but v1 is not yet operationally safe enough: it does not define how to avoid stale WebView state, how to classify unsupported DevTools accessibility APIs, or how to validate stale tracker language.

## Evidence Inspected

- `FEATURE_RELEASE_A30_ANDROID_TALKBACK_SPOKEN_ORDER_IMPLEMENTATION_PLAN_V1_2026-06-17_00-43-00_IST.md`
- `FEATURE_RELEASE_A30_ANDROID_TALKBACK_SPOKEN_ORDER_PRD_V2_2026-06-17_00-42-00_IST.md`
- `UX_v2/execution/UX_V2_A12_ANDROID_PUBLICATION_GATE_QA_2026-06-16_18-59-00_IST.md`
- `UX_v2/execution/UX_V2_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_QA_2026-06-17_00-29-00_IST.md`
- `UX_v2/execution/UX_V2_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_QA_2026-06-17_00-29-00_IST.md`
- Android tooling paths from prior A28/A29 evidence.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. The plan can accidentally audit stale or unauthenticated WebView state

**Evidence:** V1 says to determine whether a session is available but does not force-stop, relaunch, record current URL/state, or classify locked versus authenticated evidence before route audits.
**Why it matters:** Accessibility order from a stale share-result or locked screen could be mistaken for route coverage.
**Failure mode:** A30 reports Library/Ask/Capture labels from the wrong screen or old WebView cache.
**Recommendation:** V2 must force-stop/relaunch before baseline, capture current URL/title/state where tooling allows, and record screen-state classification before each audit row.

#### 2. DevTools AX capture may be unavailable on Android WebView

**Evidence:** V1 assumes WebView DevTools accessibility tree capture may work, but Android WebView often exposes limited CDP domains or only a coarse WebView node through UIAutomator.
**Why it matters:** The plan could spend time failing at tooling and then produce no useful blocked artifact.
**Failure mode:** A30 ends with vague "tooling unavailable" text instead of a reproducible blocker.
**Recommendation:** V2 must define fallback tiers: true TalkBack/manual, CDP Accessibility tree, UIAutomator focused/content-desc tree, DOM accessibility proxy from WebView page with residual risk, then blocked.

### P2 - Medium Risk

#### 1. Item detail/repair target selection is underspecified

**Evidence:** V1 says "for each required screen" but does not explain how item/repair route aliases will be selected without private data leakage.
**Why it matters:** Target selection can leak raw item IDs/titles or fail silently.
**Failure mode:** Evidence contains private IDs, or item detail/repair is skipped without a blocker.
**Recommendation:** Reuse A12 redacted target manifests if present; otherwise select only hashed/aliased targets in `/tmp`, and record blocked if safe target selection fails.

#### 2. Tracker validation is not executable

**Evidence:** V1 says update trackers but does not require a scan for stale `TalkBack` language after edits.
**Why it matters:** Existing docs have several stale variants: "optional full audit", "if required", and "not captured".
**Failure mode:** Final status remains contradictory.
**Recommendation:** Add a targeted tracker scan and manually reconcile stale A30-relevant wording.

### P3 - Low Risk Or Polish

#### 1. Evidence filenames should include A30

**Evidence:** V1 output paths do, but runtime screenshots/XML/JSON are not given an evidence directory.
**Why it matters:** A12/A28/A29 evidence already share folders; A30 files need a clear folder.
**Failure mode:** New evidence lands in `/tmp` only or mixes with A12.
**Recommendation:** Use `.../android-runtime-a30/` for any screenshots/XML/raw summaries, but only stage redacted summaries.

## What The Original Plan Or Work Gets Wrong

The plan treats accessibility capture as a linear task. In practice, it is a tooling ladder with several possible evidence strengths. Without that ladder, A30 could either overclaim or under-document a real blocker.

## Missing Validation

- Stale-state prevention.
- Accessibility tooling fallback ladder.
- Safe target-selection method for item and repair.
- Tracker stale-wording scan.
- Dedicated A30 evidence directory.

## Revised Recommendations

1. Add a preflight that force-stops/relaunches the app and classifies the baseline screen.
2. Add evidence tiers and require the QA report to name the tier used.
3. Add safe target-selection rules.
4. Add tracker text scan for TalkBack-related contradictions.
5. Use a dedicated A30 evidence directory.

## Go / No-Go Recommendation

Conditional go after plan v2 adds the fallback ladder and state/target/tracker safeguards.

## Plan Revision Inputs

### Required Deletions

- Remove any assumption that CDP AX capture will be available.

### Required Additions

- Evidence-tier ladder.
- Force-stop/relaunch/state classification.
- Safe item/repair target selection.
- Tracker stale-wording scan.
- A30 evidence directory.

### Required Acceptance Criteria Changes

- A30 can close only to the strongest proven tier; lower tiers retain residual risk.

### Required Validation Changes

- Run whitespace check and targeted redaction scan over A30 docs/evidence.
- Run targeted TalkBack wording scan over release packet, milestone tracker, delivery tracker, and PM update.

### Required No-Go Gates

- No A30 pass if evidence screen state is unverified.

## Residual Risks

Even a clean platform accessibility-tree audit remains weaker than a human-heard TalkBack walkthrough. Publication still needs owner acceptance if A30 cannot produce true spoken output.
