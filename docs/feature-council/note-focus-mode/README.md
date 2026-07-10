# Note Focus Mode

Status: release candidate implemented and locally verified; GitHub integration and guarded production rollout pending.

## Objective

Add a deliberate, distraction-free writing mode to the existing **My notes** editor without changing the default item experience or weakening the note editor's no-loss, privacy, recovery, autosave, and conflict guarantees.

## Artifact map

- `discovery.md` — current-product, code, visual, state, risk, and release evidence.
- `council/product-council.md` — product/growth/platform/power-user council decision.
- `council/ux-direction.md` — UX, responsive, accessibility, and interaction direction.
- `council/technical-architecture.md` — architecture, state, history, reliability, testing, and rollout recommendation.
- `prd/prd-v1.md` and `prd-v2.md` — product contract before and after adversarial review.
- `ux/ux-ui-v1.md` and `ux-ui-v2.md` — interaction and visual contract.
- `technical/technical-plan-v1.md` and `technical-plan-v2.md` — implementation and operations contract.
- `validation/` — acceptance traceability, automated gate results, visual comparisons, release, and production smoke evidence.
- `report/note-focus-mode-detailed-report.md` and `.html` — shareable detailed product, implementation, validation, and roadmap report.
- `PROJECT_TRACKER.md` — milestone and gate state.
- `DECISION_LOG.md` — durable product/UX/technical decisions.

## Recommended product shape

Use an app-level, full-viewport overlay on the already-mounted `ManualNoteEditor`. Reflect the state in browser history with `tab=notes&note_mode=focus`, but do not navigate through Next.js or mount a second editor. Browser Back exits focus. Refresh/direct load reconstructs focus after the normal server snapshot and device-journal reconciliation.

Browser Fullscreen API, a dedicated route, and a conventional modal with a second editor are out of scope for v1.

## Release-candidate result

- One responsive `ManualNoteEditor` stays mounted across Notes/Digest and desktop/mobile layout changes.
- The same section becomes an accessible full-viewport Focus surface; it is not cloned, portalled, or route-rendered.
- Back, Forward, direct load, refresh, invalid markers, source-reading Focus precedence, and the default-off rollout flag are covered.
- The existing **Settings → My notes → Include in AI & connections by default** preference remains the source of truth for new/recreated notes; Focus does not alter it.
- The local gate passes 813 tests, lint, typecheck, optimized build, artifact/env checks, zero-vulnerability production audit, accessibility review, narrow/desktop comparisons, and production-build request tracing.
