# Feature Release A30 Android TalkBack Spoken Order PRD - Adversarial Review

Created: 2026-06-17 00:41:00 IST
Reviewer stance: Brutally honest adversarial review
Reviewed target: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A30_ANDROID_TALKBACK_SPOKEN_ORDER_PRD_V1_2026-06-17_00-40-00_IST.md`
Report path: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A30_ANDROID_TALKBACK_SPOKEN_ORDER_PRD_ADVERSARIAL_REVIEW_2026-06-17_00-41-00_IST.md`

## Executive Verdict

Conditional go after revision. The PRD correctly isolates the remaining accessibility gap, but v1 still leaves too much room for a weak "equivalent" audit that could pass without proving the user-facing TalkBack experience.

## Evidence Inspected

- `FEATURE_RELEASE_A30_ANDROID_TALKBACK_SPOKEN_ORDER_PRD_V1_2026-06-17_00-40-00_IST.md`
- `UX_v2/execution/UX_V2_A12_ANDROID_PUBLICATION_GATE_QA_2026-06-16_18-59-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_PRD_V2_2026-06-16_15-52-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_IMPLEMENTATION_PLAN_V2_2026-06-16_16-04-00_IST.md`
- `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
- A12 TalkBack smoke manifest under `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a12/`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. "Accessibility tree or manual-equivalent" can still overclaim spoken output

**Evidence:** PRD v1 accepts an accessibility tree or manual-equivalent checklist, but does not define what qualifies when actual TalkBack speech/audio cannot be captured.
**Why it matters:** A Chrome/WebView accessibility tree can prove labels and order exposed to the platform, but it does not prove TalkBack actually spoke them, that gestures moved through them correctly, or that focus recovery behaved well.
**Failure mode:** A30 closes the TalkBack gate with only a DOM/AX traversal, and a real user later finds missing announcements or confusing order.
**Recommendation:** PRD v2 must use a stricter status taxonomy: `talkback_spoken_passed`, `platform_ax_equivalent_passed_with_residual_risk`, `blocked`, or `failed`. Only observed TalkBack speech/manual listening can use `talkback_spoken_passed`.

#### 2. The route set misses item detail and repair, which were A12 publication-scope routes

**Evidence:** A12 PRD v2 required `/items/[id]` and `/items/[id]/repair`; A30 v1 minimum screens omit them.
**Why it matters:** Item detail and repair are dense content/action surfaces where screen-reader order matters more than on simple nav pages.
**Failure mode:** Publication accessibility appears closed while two important Android user flows remain unaudited.
**Recommendation:** Add item detail and repair if safe redacted route aliases already exist or can be selected without private evidence leakage; otherwise mark them blocked, not out of scope.

### P2 - Medium Risk

#### 1. Native share result setup can create production pollution

**Evidence:** PRD v1 includes native share saved-result and failure/result states but only says not to mutate production data.
**Why it matters:** The saved-result screen often requires a real share save. A29 already proved URL-share success and cleanup; repeating it without cleanup policy can pollute production.
**Failure mode:** Audit creates duplicate temporary items or captures private URLs.
**Recommendation:** Prefer reusing the existing UI state if available; if a new share fixture is needed, require deterministic fixture naming, production precheck, cleanup with foreign keys enabled, and zero-count verification.

#### 2. Locked-screen privacy must include accessibility content, not only visual text

**Evidence:** PRD v1 names visible/accessibility content but does not require the evidence artifact to separate them.
**Why it matters:** A visually hidden node could still be announced.
**Failure mode:** Visual privacy passes while TalkBack exposes private labels.
**Recommendation:** Require locked-state evidence to report both visible sample and accessible-name sample.

### P3 - Low Risk Or Polish

#### 1. Tracker updates need exact labels

**Evidence:** Existing tracker wording says TalkBack "if required" and "optional full audit." A30 needs to convert that into a deterministic release label.
**Why it matters:** Future agents should not re-open or silently waive the same blocker.
**Failure mode:** Trackers keep stale mixed language even after A30.
**Recommendation:** PRD v2 must require exact tracker labels for the resulting gate status.

## What The Original Plan Or Work Gets Wrong

The PRD v1 treats "stronger than screenshots" as enough. That is not precise enough for a release gate that has already been called out multiple times. It must distinguish true spoken TalkBack proof from platform accessibility-tree proof.

## Missing Validation

- Strict status taxonomy for actual spoken output versus platform AX evidence.
- Item detail and repair audit or explicit blocked status.
- Production mutation cleanup rule for any new share-result setup.
- Separate locked visual and accessibility privacy checks.

## Revised Recommendations

1. Add a status taxonomy that prevents overclaiming.
2. Include item detail and repair if safe route aliases can be used.
3. Use existing A29 share-result evidence where possible; if not, add fixture cleanup rules.
4. Update trackers with exact final labels.

## Go / No-Go Recommendation

Conditional go after PRD v2 incorporates the stricter evidence taxonomy and route coverage.

## Plan Revision Inputs

### Required Deletions

- Remove any implication that platform AX evidence is identical to actual TalkBack speech.

### Required Additions

- Result taxonomy separating spoken TalkBack proof from AX-equivalent proof.
- Item detail and repair routes or explicit blocked records.
- Share fixture cleanup rule if a new native share is required.
- Separate locked visual/accessibility privacy evidence.

### Required Acceptance Criteria Changes

- Closing the publication TalkBack blocker requires either true spoken proof or explicit owner acceptance of AX-equivalent residual risk.

### Required Validation Changes

- Redaction scan over accessibility JSON/markdown.
- Tracker scan for stale TalkBack blocker wording after updates.

### Required No-Go Gates

- No full TalkBack closure from screenshots or AX tree alone.

## Residual Risks

Without a human listening to TalkBack audio, A30 can reduce risk and prove platform accessibility semantics, but it cannot prove the exact synthesized speech experience.
