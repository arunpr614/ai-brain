# Adversarial Review - Web Shell And Navigation Implementation Plan V1

**Created:** 2026-06-15 22:27:00 IST
**Reviewer:** Main Codex using adversarial-review skill
**Subject:** `FEATURE_WEB_SHELL_NAVIGATION_IMPLEMENTATION_PLAN_V1_2026-06-15_22-24-00_IST.md`
**Verdict:** Conditional no-go until V2 tightens fixture/context-route QA and disabled privacy verification.

## Executive Summary

The implementation plan is scoped correctly and proposes the right architectural move: extract route-active helpers into a pure module and test them. That reduces risk.

However, V1 still permits incomplete evidence for context routes by allowing fixture-dependent checks to be marked blocked. This conflicts with the V2 PRD's route-active acceptance criteria. The implementation can and should create a minimal disposable fixture in the local QA database or use route rendering checks that still show the shell, then record exactly what was and was not validated.

The plan also says to attempt the Privacy Controls row only "if it is focusable," but V2 requires it to become non-link, non-focusable informational content. QA must verify that property directly.

## Findings

### P1 - Context Route Browser QA Can Be Skipped Too Easily

**Evidence:** Phase 6 lists `/items/<fixture-id>`, `/items/<fixture-id>/ask`, `/topics/<fixture-slug>`, and `/collections/<fixture-id>` as fixture-dependent, then says to record them as blocked if no synthetic fixtures exist.

**Why this matters:** The main reason for extracting helpers is to fix context-route active states. If browser QA skips those same routes, the feature can pass with tests but no rendered proof that the shell and Next route tree agree.

**Required revision:** V2 must require one of these paths:

1. Create minimal synthetic local fixtures in the disposable QA DB and validate rendered shell states on real routes, or
2. If route content cannot be seeded safely, navigate representative route URLs and confirm the shell still renders with expected active state even when page content is not found, explicitly classifying content as not-found but shell as validated.

Do not mark all context-route shell states blocked unless both strategies fail.

### P1 - Disabled Privacy Controls Verification Is Too Weak

**Evidence:** Phase 6 says "Activate Privacy Controls row attempt only if it is focusable." V2 PRD requires the row to be non-link, non-focusable, and non-navigating.

**Why this matters:** The current production code uses a disabled `Link` with `href="#privacy-coming-soon"`. The plan must prove this exact failure mode is gone.

**Required revision:** V2 must include static and browser checks:

- No source-code `href="#privacy-coming-soon"`.
- DOM check confirms no anchor with text `Privacy Controls`.
- DOM check confirms the informational row has `aria-disabled="true"` or equivalent visible disabled semantics.
- Keyboard tab sequence does not focus the row as an action.
- Activation attempt is unnecessary if it is correctly non-focusable.

### P2 - Dark/Light Shell Visual QA Is Under-Specified

**Evidence:** Phase 6 lists routes and viewports, but does not require both light and dark states for shell controls.

**Why this matters:** The preceding contrast bug was dark-mode specific. Shell active states and top Capture action are part of the same visual risk surface.

**Required revision:** V2 must capture at least desktop Library light/dark and mobile Library light/dark, with contrast spot checks for top Capture, active nav, and Pair Device active state.

### P2 - Active Styling For Top Capture Is Not Concrete Enough

**Evidence:** Phase 3 requires `aria-current` and visible active affordance, but does not state whether active Capture should remain primary or switch to selected-control styling.

**Why this matters:** An implementation could create a subtle or inaccessible active state. The PRD only says Capture is a prominent top action.

**Required revision:** V2 should state: top Capture always uses primary action styling; active route adds `aria-current="page"` and a visible focus/outline/ring affordance that does not reduce contrast.

### P3 - Static Scan Scope Will Produce Documentation Noise

**Evidence:** Phase 5 scans `src UX_v2/features`, while the PRD and review docs necessarily mention prototype routes and fake strings.

**Why this matters:** The plan already says classify source-code matches separately, so this is not blocking. But it will make QA noisier.

**Recommended revision:** Run source-code scans against `src` for release gating, and separately classify documentation-only mentions as expected source/governance text.

## Positive Findings

- Extracting helper functions makes route behavior testable.
- The planned source edit surface is appropriately narrow.
- The plan correctly preserves mobile bottom nav and avoids prototype phone chrome.
- The plan explicitly avoids production deployment claims.

## Required V2 Changes

1. Require context-route browser validation through synthetic fixtures or not-found shell-state validation.
2. Strengthen disabled Privacy Controls static/DOM/keyboard verification.
3. Add light/dark visual evidence for shell controls.
4. Specify top Capture active styling.
5. Split source-code scans from documentation classification.

## Go/No-Go

No-go for implementation from V1. V2 can proceed after addressing the P1 findings and carrying forward the P2 QA improvements.
