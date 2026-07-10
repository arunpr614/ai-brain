# AI Memory UX v2 Project

Created: 2026-06-13

This folder is the working project space for the AI Memory UX v2 redesign and implementation pass.

## Source Inputs

- Design package: `../UX_UI_DESIGN_PACKAGE`
- Frozen web prototype export: `../UX_UI_DESIGN_PACKAGE/source-exports/web/magic-patterns-exact`
- Frozen Android prototype export: `../UX_UI_DESIGN_PACKAGE/source-exports/android/magic-patterns-exact`
- Brand and copy rules: `../UX_UI_DESIGN_PACKAGE/docs/BRAND_COPY_MIGRATION.md`
- Implementation checklist: `../UX_UI_DESIGN_PACKAGE/checklists/AI_MEMORY_IMPLEMENTATION_ACCEPTANCE_CHECKLIST.md`
- Earlier UX research and gap analysis: `../UX_DESIGN_REPORT_INDEX.md`

## Working Docs

- `01_MASTER_PLAN.md`: phased implementation plan, milestones, gates, and sequencing.
- `02_REQUIREMENTS_PRD_BACKLOG.md`: missing feature requirements and PRD backlog for the new web and Android UX.
- `03_IMPLEMENTATION_PROGRESS.md`: completed implementation slices, verification, and next slices.
- `04_FEATURE_DELIVERY_PROTOCOL.md`: required PRD, adversarial review, implementation plan, review, execution, and code-review workflow for each missing feature.
- `05_MISSING_FEATURE_TODO.md`: live missing-feature to-do list with evidence and next artifact.
- `06_ROADMAP_AND_EXECUTION_PLAN.md`: planning-only roadmap, milestones, dependencies, risks, acceptance gates, and recommended execution order for the next implementation agent.
- `07_FEATURE_CLASSIFICATION_AND_GAP_ANALYSIS.md`: canonical feature inventory comparing documented requirements, current code, design-implied behavior, and decision gaps.
- `ADVERSARIAL_REVIEW_REMEDIATION_IMPLEMENTATION_PLAN_2026-06-14.md`: plan and execution map for fixing the adversarial-review findings against this package.
- `ADVERSARIAL_REVIEW_REMEDIATION_COMPLETION_AUDIT_2026-06-14.md`: finding-by-finding audit showing how the remediation was addressed.
- `AI_MEMORY_UX_V2_PLANNING_PACKAGE_ADVERSARIAL_REVIEW_2026-06-14_08-03-59_IST.md`: adversarial review that drove the remediation.
- `trackers/`: PM-ready Markdown and CSV trackers for features, milestones, PRDs, implementation plans, risks, decisions, blockers, and QA readiness.
- `features/`: consolidated planning packages for major missing or partial features. Each package contains PRD v1, adversarial PRD review, PRD v2, implementation plan v1, adversarial plan review, and implementation plan v2.
- `lightweight-specs/`: smaller visual, copy, navigation, and ops-adjacent specs that do not yet justify a full feature package.
- `RUNNING_LOG.md`: canonical append-only UX v2 planning log.

## Current Brief

Build AI Memory, not AI Brain, as a private, source-grounded personal memory app.

The redesign target is full working web and Android behavior, using the supplied UX/UI design package, logo, source exports, interaction specs, and acceptance checklist. The web app is the deeper workbench. The Android app is the fast capture, lookup, offline read, repair, and lightweight Ask companion.

## Planning-Only Package Note

The 2026-06-14 planning package stops before implementation. It inventories what exists, what is missing or partial, what is inferred from the design, and what needs Arun's decision before code changes. Another agent should use the package to execute feature work milestone by milestone.

Adversarial-review remediation added decision-aware tracker statuses, baseline-doc precedence, design traceability, source snapshotting, tracker parity, Android device gates, and a design freshness gate. Implementation remains blocked by the no-go gates in `00_PLANNING_PACKAGE_INDEX.md`.
