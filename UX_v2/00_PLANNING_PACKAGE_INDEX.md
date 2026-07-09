# AI Memory UX v2 Planning Package Index

Created: 2026-06-14 07:40 IST
Status: Planning-only handoff package
Implementation status: Not started from this package

Remediation status: adversarial-review findings addressed in planning docs on 2026-06-14 08:14 IST. See `ADVERSARIAL_REVIEW_REMEDIATION_IMPLEMENTATION_PLAN_2026-06-14.md`.

Path alias note: `/Users/arun.prakash/Documents/arunvault/arun-cursor/.../phase2/UX_v2` and `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/.../phase2/UX_v2` resolve to the same project content in this workspace. Use the `Documents/arunvault` path in planning docs unless a tool resolves the real CloudStorage path.

## Purpose

This package gives the next implementation agent a complete roadmap for revamping AI Brain into AI Memory across web and Android using the new UX/UI design package, app name, logo, and design system.

It intentionally stops before code implementation.

## Read First

1. `06_ROADMAP_AND_EXECUTION_PLAN.md`
2. `07_FEATURE_CLASSIFICATION_AND_GAP_ANALYSIS.md`
3. `trackers/source_snapshot_2026-06-14.md`
4. `trackers/design_traceability_matrix.md`
5. `trackers/master_feature_inventory.md`
6. `trackers/risks_blockers_decisions_tracker.md`
7. The selected feature package under `features/`

## Current No-Go Gates

Do not start implementation while any applicable gate below is open.

| Gate | Blocks | Status | How to clear |
| --- | --- | --- | --- |
| PRD-11-SHELL verification | Any new feature implementation | Open | Run mobile Library/Ask/Capture/More and desktop `/more` smoke, then record evidence |
| D-001/D-002/D-003 Ask scope decisions | PRD-09-FU, PRD-12 | Open | Decide attachment persistence, high-quality-only UX, and history snapshot behavior |
| D-004 mark-good-enough semantics | PRD-10 mark-good-enough behavior | Open | Arun/Product confirms whether acknowledgment can remove Needs Upgrade |
| D-005 Android item tabs scope | PRD-11-FU mobile item detail | Open | Decide include in PRD-11-FU or split into separate PRD |
| D-007 active offline controls | PRD-14 active download/queue controls | Open | Keep informational offline state unless Arun approves real offline work |
| D-008/D-013 Android pairing/package decisions | PRD-15 Android entry/APK claims | Open | Decide QR scanning and package-id migration posture |
| Android device/emulator evidence | PRD-13, PRD-15, APK/offline claims | Open | Run real device/emulator verification or record exact blocker |
| Design freshness | Visual implementation | Open | Re-check live Magic Patterns refs or confirm frozen local package is authoritative |

## Planning Artifacts

Roadmap and inventory:

- `06_ROADMAP_AND_EXECUTION_PLAN.md`
- `07_FEATURE_CLASSIFICATION_AND_GAP_ANALYSIS.md`
- `ADVERSARIAL_REVIEW_REMEDIATION_IMPLEMENTATION_PLAN_2026-06-14.md`
- `ADVERSARIAL_REVIEW_REMEDIATION_COMPLETION_AUDIT_2026-06-14.md`
- `AI_MEMORY_UX_V2_PLANNING_PACKAGE_ADVERSARIAL_REVIEW_2026-06-14_08-03-59_IST.md`

PM trackers:

- `trackers/master_feature_inventory.md`
- `trackers/master_feature_inventory.csv`
- `trackers/milestone_tracker.md`
- `trackers/milestone_tracker.csv`
- `trackers/prd_tracker.md`
- `trackers/prd_tracker.csv`
- `trackers/implementation_plan_tracker.md`
- `trackers/implementation_plan_tracker.csv`
- `trackers/risks_blockers_decisions_tracker.md`
- `trackers/risks_blockers_decisions_tracker.csv`
- `trackers/testing_qa_readiness_tracker.md`
- `trackers/testing_qa_readiness_tracker.csv`
- `trackers/open_questions_decisions.md`
- `trackers/open_questions_decisions.csv`
- `trackers/baseline_status_reconciliation.md`
- `trackers/baseline_status_reconciliation.csv`
- `trackers/design_traceability_matrix.md`
- `trackers/design_traceability_matrix.csv`
- `trackers/source_snapshot_2026-06-14.md`
- `trackers/TRACKER_PARITY_CHECK.md`

Major feature packages:

- `features/PRD-06-FU-capture-result-states-package.md`
- `features/PRD-09-FU-ask-context-scope-history-package.md`
- `features/PRD-10-weak-source-repair-package.md`
- `features/PRD-11-FU-mobile-shell-select-item-package.md`
- `features/PRD-12-android-unified-ask-composer-package.md`
- `features/PRD-13-android-share-capture-package.md`
- `features/PRD-14-settings-privacy-offline-package.md`
- `features/PRD-15-entry-pairing-session-offline-package.md`
- `features/PRD-16-qa-evidence-release-gates-package.md`

Lightweight specs:

- `lightweight-specs/COPY-01-brand-copy-and-prototype-normalization.md`
- `lightweight-specs/DS-01-design-system-visual-parity.md`
- `lightweight-specs/YT-01-youtube-item-detail-and-media-metadata.md`
- `lightweight-specs/EXT-01-browser-extension-parity.md`
- `lightweight-specs/OPS-01-transcript-operator-visibility.md`
- `lightweight-specs/OPS-02-transcript-fallback-strategy.md`
- `lightweight-specs/ANALYTICS-01-events-and-privacy.md`

Operational log:

- `RUNNING_LOG.md`

## Major Findings

- The web codebase exists and is a real Next.js app under `../src`.
- Android exists as a thin Capacitor WebView shell under `../android`, not a separate native implementation.
- The design package is self-contained locally; live Magic Patterns access was not required for this planning pass.
- Many UX v2 slices are already coded in the dirty worktree, but some lack verification evidence.
- Offline queueing/outbox behavior is not implemented despite older docs suggesting it may exist.
- Exact prototype source contains legacy copy and simulated flows; production must follow AI Memory brand and real backend truth.

## Recommended Next Action

Do not start a new feature immediately. First finish PRD-11-SHELL verification from the handover:

1. Start local dev server.
2. Verify mobile Library, Ask, Capture, More at phone viewport.
3. Verify desktop `/more`.
4. Rerun static checks and focused tests.
5. Update progress and log evidence.

Then implement in this order:

1. PRD-06-FU capture result states.
2. PRD-09-FU Ask attached context/high-quality-only/history.
3. PRD-10 weak-source repair.
4. PRD-12 Android unified Ask composer.
5. PRD-13 Android share capture.
6. PRD-11-FU mobile select/item polish.
7. PRD-14 settings/privacy/offline trust.
8. PRD-15 entry/pairing/session/offline.
9. PRD-16 QA evidence and release gates.

## Guardrails

- Do not reset or clean the dirty worktree.
- Do not treat every prototype visual element as confirmed product scope.
- Do not copy legacy `AI Brain` production copy from exact prototype exports.
- Do not claim active end-to-end encryption.
- Do not claim offline capture/Ask queueing exists.
- Do not run real YouTube backfill or bypass cooldown without explicit approval.
