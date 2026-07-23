# UX Spec V1 - Adversarial Review

**Created:** 2026-07-22 16:34:40 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `2026-07-22_ai_brain_item_recovery_manual_enrichment_ux_spec_v1.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-worktrees/youtube-item-recovery-enrichment-plan/docs/plans/youtube-item-recovery-enrichment/2026_07_22_AI_BRAIN_ITEM_RECOVERY_MANUAL_ENRICHMENT_UX_SPEC_V1_ADVERSARIAL_REVIEW_2026-07-22_16-34-40_IST.md`

## Executive Verdict

**Conditional no-go.** The primary journey and consent hierarchy are coherent, but one failure message is unsafe under normal network ambiguity and the required dialog/sheet behavior is not fully specified for long disclosure content.

## Evidence Inspected

- UX spec sections 7-9, 13-19, and V1 caveats.
- V1 prototype at 1280, 430, and 360 px widths.
- PRD idempotency and implementation worker timing.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. “Nothing was sent” is false for an unknown queue response

**Evidence:** The Queue request failed row says “Nothing was sent,” while a valid POST can commit before its response is lost and an interactive worker can start.
**Why it matters:** This is a privacy assurance the UI cannot derive from a transport error.
**Failure mode:** The user is told no provider received data while processing is active.
**Recommendation:** Replace this state with `Checking whether enrichment started` until the same mutation receipt is reconciled. Only show proven-not-started copy after an authoritative rejected/no-effect result.

#### 2. The review surface lacks complete overflow and background-interaction rules

**Evidence:** Sections 8, 15, and 16 require a desktop dialog/mobile sheet, focus start/trap/return, and wrapping, but do not specify max block size, internal scroll ownership, sticky actions, inert background, scroll lock, or safe-area padding.
**Why it matters:** The disclosure is long and the final action must remain reachable without losing context.
**Failure mode:** On a small viewport or 200% zoom, content/action is clipped, background controls remain focusable, or focus escapes.
**Recommendation:** Specify native dialog semantics where supported, inert/aria-hidden fallback, bounded scroll region, visible close, sticky non-overlapping action footer, safe areas, and focus restoration.

### P2 - Medium Risk

#### 1. Required failure states are not all prototype scenarios

**Evidence:** The durable-state table includes queue request failure, provider missing, and session expired, but the scenario requirements list does not require those states.
**Why it matters:** Important recovery copy can remain unreviewed and visually broken.
**Failure mode:** The shipped UI has no trustworthy path for expired session, incomplete provider configuration, or response loss.
**Recommendation:** Add all three as required interactive prototype scenarios on desktop and at least queue uncertainty on mobile.

#### 2. Local one-click visibility must be mechanically testable

**Evidence:** Section 7 says complete local data-scope copy is visible inline and one click authorizes, while section 6 also describes a disclosure control that can be collapsed.
**Why it matters:** A collapsed disclosure would convert the one-click action into consent without visible terms.
**Failure mode:** Local authorization is available while material copy is hidden.
**Recommendation:** Require the local disclosure to be open and non-collapsible while the action is enabled, or require the same review surface as remote.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

It treats a network error as proof of no side effect and leaves long-content dialog/sheet mechanics partially implicit.

## Missing Validation

- 200% zoom and 320/360 px review-sheet tests.
- Keyboard focus-trap/escape/return automation.
- Response-loss reconciliation copy test.
- Provider-missing and session-expired visual review.

## Revised Recommendations

Add a truthful reconciliation state, fully specify the modal surface, and require the missing failure scenarios in V2.

## Go / No-Go Recommendation

**No-go** for final UX approval until queue ambiguity and modal accessibility are fixed and rendered.

## Plan Revision Inputs

### Required Deletions

- Remove unqualified “Nothing was sent” from transport-error copy.

### Required Additions

- Reconciling state and copy.
- Complete dialog/sheet overflow, inertness, safe-area, and focus behavior.
- Queue uncertainty, provider missing, and session expiry scenarios.

### Required Acceptance Criteria Changes

- Require visible/reachable disclosure and final action at 200% zoom and 320 px.

### Required Validation Changes

- Automate tab containment, Escape, focus return, no-overflow, and response-loss copy.

### Required No-Go Gates

- No false “nothing sent” claim during an unresolved mutation.
- No authorization action if material local terms are hidden.

## Residual Risks

Long provider names and localized consent copy can still expand substantially; localization stress testing remains necessary.
