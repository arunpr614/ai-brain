# Recall manual sync UX/UI v1 - Adversarial Review

**Created:** 2026-07-11 14:35:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `docs/feature-council/recall-manual-sync/ux-ui-v1.md`
**Report path:** `docs/feature-council/recall-manual-sync/ux-ui-v1-adversarial-review.md`

## Executive Verdict

**Conditional no-go for visual approval.** The state coverage fixes the supplied prototype’s omissions, but the UX remains unapproved until it resolves acknowledgment/race states, stale offline metadata, cooldown actions, narrow-screen gutters, dialog dismissal, and demonstrates the promised revised prototype.

## Evidence Inspected

- `ux-ui-v1.md`, `prd-v1.md`, `source-and-design-assessment.md`
- Rendered desktop/mobile/state evidence under `visual-evidence/`
- UX designer’s rendered inspection and current Settings shell/token evidence

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 finding.

### P1 - High Risk

#### 1. The controller lacks an explicit POST acknowledgment state

**Evidence:** The matrix moves from confirming directly to queued (`ux-ui-v1.md:37-64`), while Start is only described as disabling during POST.
**Why it matters:** A slow or lost response is the most dangerous moment for duplicate manual requests.
**Failure mode:** The dialog closes to Ready, the user retries, or offline copy appears without preserving the idempotency token.
**Recommendation:** Add **Requesting sync…** as a local non-durable state; keep the dialog/action disabled until accepted or definitively rejected. On ambiguous failure, close into status-unknown and GET with the same key before any new POST.

#### 2. Offline cached timestamps can masquerade as current truth

**Evidence:** Offline states retain cached values (`ux-ui-v1.md` state matrix) but do not label when they were last confirmed.
**Why it matters:** A stale last-success or next schedule looks authoritative while disconnected.
**Failure mode:** User believes synchronization is fresh or scheduled based on old data.
**Recommendation:** Add **Last checked … IST** or a clear “Last known status” qualifier whenever network status is unknown; do not show a past next-elapse as future.

#### 3. Cooldown and retry actions are inconsistent

**Evidence:** Failed/partial rows offer **Try again after cooldown**, while the cooldown row separately owns the countdown.
**Why it matters:** The actual visible state is a composition of terminal outcome and cooldown, not one or the other.
**Failure mode:** Enabled Try again receives 429, or terminal details disappear behind a generic cooldown card.
**Recommendation:** Retain terminal title/detail/counts and replace only the action with disabled countdown until eligible.

#### 4. A revised prototype is required but absent

**Evidence:** `ux-ui-v1.md` requires a focused state board, while current evidence is the incomplete supplied prototype.
**Why it matters:** The largest UI expansion—missing states and persistent metadata—has never been rendered together.
**Failure mode:** v2 approves layouts that overflow or bury the action at 320/390px.
**Recommendation:** Revised prototype and inspected 1440/390/320 captures are a no-go gate for UX v2 approval.

### P2 - Medium Risk

#### 1. Fixed 32px mobile gutters are too rigid at 320px

**Evidence:** The plan retains current gutters while requiring dense timestamps/counts at 320px.
**Recommendation:** Use responsive `px-4 sm:px-8`; preserve 32px at 390 where it fits, reduce at the narrowest breakpoint.

#### 2. Backdrop dismissal is unresolved

**Evidence:** Open question 1 defers whether overlay click closes the confirmation.
**Recommendation:** Do not dismiss on overlay in v2. Explicit Cancel/close/Escape provide predictable keyboard/touch behavior and prevent accidental dismissal.

#### 3. Next schedule can become past while a run is active

**Evidence:** Persistent metadata is retained in every state, but no rule covers an elapsed `nextScheduledAt`.
**Recommendation:** If the instant is past, label it as the last known scheduled time/status-stale until a trusted refresh; never render “Next” with a past value.

#### 4. Aggregate copy has no pluralization/overflow rule

**Recommendation:** Use deterministic pluralization, omit zero clauses, bound displayed integers, and test large localized strings without leaking raw counts beyond safe server bounds.

### P3 - Low Risk Or Polish

The semantic rail is optional and should be omitted from Ready unless visual comparison proves it does not over-emphasize Recall.

## What The Original Plan Or Work Gets Wrong

It treats terminal state and cooldown as separate full cards even though the user needs both outcome and availability. It also assumes cached metadata remains trustworthy offline and that a promised prototype can be deferred beyond v2.

## Missing Validation

- Slow/ambiguous POST and same-key recovery.
- Offline stale/past schedule presentation.
- Terminal outcome plus active cooldown.
- 320px revised state board/dialog and 200% zoom.
- Pluralization/large-count wrapping.

## Revised Recommendations

Add Requesting/status-unknown handling, qualify offline values, compose cooldown into terminal states, reduce narrow gutters, forbid overlay dismissal, and render the revised prototype before v2 sign-off.

## Go / No-Go Recommendation

**No-go for UX v2 approval until the four P1 findings are resolved and rendered.**

## Plan Revision Inputs

### Required Deletions

- Remove overlay-click dismissal.
- Remove unqualified cached schedule/freshness labels while offline.

### Required Additions

- Requesting sync local state.
- Last-known/last-checked offline treatment.
- Terminal outcome + cooldown composition rules.
- Responsive 16px narrow gutter and pluralization rules.

### Required Acceptance Criteria Changes

- Add ambiguous POST recovery with one idempotency key.
- Add stale/past schedule protection and revised-prototype evidence.

### Required Validation Changes

- Render/inspect all revised states at 1440, 390, and 320.
- Test slow POST, lost response, offline recovery, cooldown, large counts, zoom, and dialog focus.

### Required No-Go Gates

- No visual approval without revised prototype and interaction evidence.
- No release with an enabled retry that the server will reject.

## Residual Risks

Real screen-reader and physical mobile behavior still require implementation evidence; static HTML cannot prove them.
