# Card Processing Workflow feature-council package

**Status:** **Explored — not implemented**
**Recommended direction:** Direction B — Processing, Inbox-first
**Baseline:** `1cb5d36f37611e60442b4f2c4433b45455273500`
**Purpose:** discovery, product definition, architecture planning, and throwaway prototype validation only.
**Current package location:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs`

This complete package was relocated here on 2026-07-12. Historical review paths remain unchanged as evidence of where those reviews were originally performed; use this folder as the current local source of truth.

No production application code, schema, migration, API, feature flag, or deployment behavior is changed by this package.

## Start here

- [PRD v2](product/prd-v2.md)
- [UX/UI v2](ux/ux-ui-v2.md)
- [Technical plan v2](technical/technical-plan-v2.md)
- [Decision log](decisions/decision-log.md)
- [Prototype gallery](prototypes/index.html)
- [Prototype design QA](prototypes/design-qa.md)
- [QA review](reviews/qa-review.md)
- [Accessibility review](reviews/accessibility-review.md)
- [Traceability v2](reviews/traceability-matrix-v2.md)

## Product directions

| Direction | Thesis | Artifact |
|---|---|---|
| A — Workflow | Board-first spatial operations | [Interactive page](prototypes/direction-a.html) · [concept](ux/concepts/direction-a-workflow-board-first.png) |
| B — Processing | Inbox-first deliberate decision | [Interactive page](prototypes/direction-b.html) · [concept](ux/concepts/direction-b-processing-inbox-first.png) |
| C — Queue | Library-integrated dense workflow lens | [Interactive page](prototypes/direction-c.html) · [concept](ux/concepts/direction-c-queue-library-integrated.png) |

The weighted matrix in [product directions](product/product-directions.md) scores A 70, B 94, and C 79.

## V1 → review → V2

| Lane | V1 | Adversarial review | V2 |
|---|---|---|---|
| Product | [PRD v1](product/prd-v1.md) | [review](reviews/prd-v1-adversarial-review.md) | [PRD v2](product/prd-v2.md) |
| UX/UI | [UX/UI v1](ux/ux-ui-v1.md) | [review](reviews/ux-ui-v1-adversarial-review.md) | [UX/UI v2](ux/ux-ui-v2.md) |
| Technical | [technical v1](technical/technical-plan-v1.md) | [review](reviews/technical-plan-v1-adversarial-review.md) | [technical v2](technical/technical-plan-v2.md) |

Independent review: [QA](reviews/qa-review.md), [accessibility](reviews/accessibility-review.md), and [v2 consistency](reviews/v2-consistency-review.md).

## Research

- [Current state](research/current-state-report.md)
- [Relevant code map](research/relevant-code-map.md)
- [Existing data model](research/existing-data-model-summary.md)
- [Design system](research/design-system-inventory.md)
- [Constraints and opportunities](research/constraints-and-opportunities.md)
- [Source reconciliation](research/source-reconciliation.md)
- [Platform/data PM](research/platform-data-workflow-assessment.md)
- [Growth/engagement PM](research/growth-engagement-assessment.md)
- [Power-user PM](research/power-user-workflow-assessment.md)
- [Metrics framework](product/metrics-framework.md)
- [Architecture options](technical/architecture-options.md)

## Prototype evidence

- Clean gallery viewport: `prototypes/screenshots/prototype-gallery-viewport-1440x1024.png`
- Direction A desktop Board: `prototypes/screenshots/direction-a-board-desktop-1440x1024.png`
- Direction B desktop Inbox: `prototypes/screenshots/direction-b-inbox-desktop-1440x1024.png`
- Direction B mobile Inbox: `prototypes/screenshots/direction-b-inbox-mobile-390x844.png`
- Direction C desktop List: `prototypes/screenshots/direction-c-list-desktop-1440x1024.png`
- Route-based detail: `prototypes/screenshots/direction-b-detail-route-main-1164x1024.png`
- Reference comparison: `prototypes/screenshots/direction-b-reference-vs-prototype-1487x1058.png`
- Failure/conflict/offline/loading/empty/filtered-empty captures in `prototypes/screenshots/`.

Run locally from `prototypes/` with `npm install` and `npm run dev`; the package is independent of the production application build and uses fictional in-memory data.

## What changed after review

- Fixed count scopes and truthful loading/empty metrics.
- Replaced cosmetic Process next 3 with Process next and working Leave/advance behavior.
- Replaced modal-as-canonical detail with isolated route simulation and note-draft protection.
- Added move-failure and 409 conflict fixtures.
- Added deterministic mutation/10-second Undo/return focus, safe Save-and-return, skip link, list semantics, contextual names, stronger control borders, and 44px mobile targets.
- Removed batch mutation from recommended first-release scope.
- Added current Inbox-entry projection, capture-only Added semantics, current-truth replay, typed content-free event fields, no Undo-of-Undo, fail-closed degraded mode, and resumable legacy baseline plan.

## Remaining gates before any implementation authorization

- Stakeholder approval of naming, mobile entry, quick preview, archive matrix, recent-enrollment cap, and metric pressure.
- Production-size migration/query/50k performance rehearsal.
- Every-ingestion-path, CAS/idempotency/unknown-outcome, hard-delete, and archive-matrix tests.
- Multi-value filter UI/URL proof.
- Keyboard, NVDA, VoiceOver, TalkBack, switch, contrast, reduced-motion, 200%/400% zoom, fixed-nav, and virtualized-focus gates.

## Wiki

The canonical wiki page is [Card Processing Workflow Exploration](../../wiki/Card-Processing-Workflow-Exploration.md). It and every catalog entry classify the feature as **Explored — not implemented**.
