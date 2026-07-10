# AI Memory UX v2 Feature Delivery Protocol

> Current-status note: this protocol remains useful, but the 2026-06-14 package uses consolidated feature files under `features/` rather than separate PRD/plan folders for every package. Current readiness and blockers live in `00_PLANNING_PACKAGE_INDEX.md`, `trackers/prd_tracker.md`, `trackers/implementation_plan_tracker.md`, and `trackers/baseline_status_reconciliation.md`.

Created: 2026-06-14

This protocol is the required workflow for every missing feature discovered during the AI Memory UX v2 redesign.

## Source Order

Use these inputs when deciding whether a feature exists, is missing, or needs redesign:

1. Current worktree implementation.
2. `UX_UI_DESIGN_PACKAGE` docs, checklists, assets, and frozen Magic Patterns source exports.
3. `Handover_docs/AI_BRAIN_HANDOVER_2026-06-11_22-36-37_IST.md` for shipped production capabilities and operational warnings.
4. `RUNNING_LOG.md` for historical implementation context.
5. Magic Patterns links or live designs only when the local design package is insufficient or stale.

## Feature Lifecycle

Every newly discovered missing feature must move through these states:

1. `Discovered`
   - Add it to `05_MISSING_FEATURE_TODO.md`.
   - Cite evidence from the current app, design package, handover, or running log.
   - Record web and Android implications separately.
2. `PRD v1`
   - Create a Markdown PRD in `UX_v2/prds/`.
   - Include problem, users, scope, non-goals, data/state needs, web UX, mobile/Android UX, interactions, accessibility, acceptance criteria, telemetry/ops, risks, and test evidence required.
3. `PRD adversarial review`
   - Use the adversarial-review workflow.
   - Write a timestamped review report next to the PRD.
   - Findings must become concrete revision inputs.
4. `PRD v2`
   - Create a second Markdown PRD that incorporates the adversarial findings.
   - Do not overwrite v1 or the review.
5. `Implementation plan v1`
   - Create a technical implementation plan in `UX_v2/implementation-plans/`.
   - Include milestones, files, migrations, component changes, tests, browser/mobile QA, rollback/data-safety, and deployment notes.
6. `Implementation plan adversarial review`
   - Use the adversarial-review workflow against the implementation plan.
   - Write a timestamped Markdown report next to the plan.
7. `Implementation plan v2`
   - Create a revised plan that explicitly addresses review findings.
8. `Execution`
   - Work milestone by milestone.
   - Keep edits scoped to the planned files unless new evidence requires updating the plan.
   - Update `03_IMPLEMENTATION_PROGRESS.md` and `RUNNING_LOG.md` at milestone boundaries.
9. `Code review`
   - Review local changes with a code-review stance: bugs, regressions, missing tests, data risks, security/privacy, and UX mismatches first.
   - Document the review outcome in `UX_v2/reviews/`.
   - Address actionable findings or record why they are deferred.
10. `Verified`
   - Run relevant automated tests and browser/mobile smoke checks.
   - Add evidence to `03_IMPLEMENTATION_PROGRESS.md`.
   - Mark the to-do item as complete only when the feature works on the intended platforms.

## Required Folders

Create these folders as needed:

- `UX_v2/prds/`
- `UX_v2/implementation-plans/`
- `UX_v2/reviews/`
- `UX_v2/screenshots/`

## Running Log Cadence

Append to the phase2 root `RUNNING_LOG.md` at these points:

- after a major discovery or backlog reshuffle;
- after completing a PRD v2;
- after completing an implementation plan v2;
- after finishing an execution milestone;
- after code review and verification;
- before handing off the thread.

The running log is append-only. Do not edit prior entries.

## Current Exception For In-Flight Work

Some UX_v2 slices were implemented before this protocol existed. For those slices:

- preserve the implementation;
- document the current evidence and gaps;
- do not recreate already-completed work just for process compliance;
- use this protocol for the next not-yet-implemented feature or for substantial follow-up work.
