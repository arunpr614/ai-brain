# AI Memory UX v2 Planning Package - Adversarial Review

**Created:** 2026-06-14 08:03:59 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2` planning package and recent planning-only work
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/AI_MEMORY_UX_V2_PLANNING_PACKAGE_ADVERSARIAL_REVIEW_2026-06-14_08-03-59_IST.md`

## Executive Verdict

Conditional no-go for implementation from this package as-is. The package is directionally useful, but it can still create false confidence because several artifacts say "ready" while decision gates remain open, older baseline docs in the same folder still present completed/verified slices, and there is no design-to-feature traceability matrix proving every frozen design state was classified.

No implementation should start until the package is revised to make readiness language decision-aware, explicitly supersede stale progress claims, add a design coverage matrix, and record a reproducible code/worktree snapshot.

## Evidence Inspected

- `/Users/arun.prakash/.codex/skills/adversarial-review/SKILL.md`
- `/Users/arun.prakash/.codex/skills/adversarial-review/references/report-template.md`
- `/Users/arun.prakash/.codex/skills/adversarial-review/scripts/report_path.py`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/00_PLANNING_PACKAGE_INDEX.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/06_ROADMAP_AND_EXECUTION_PLAN.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/07_FEATURE_CLASSIFICATION_AND_GAP_ANALYSIS.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/03_IMPLEMENTATION_PROGRESS.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/RUNNING_LOG.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/prd_tracker.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/implementation_plan_tracker.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/risks_blockers_decisions_tracker.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/open_questions_decisions.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/testing_qa_readiness_tracker.md`
- Representative feature packages: PRD-09, PRD-10, PRD-13, PRD-14, PRD-16.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_UI_DESIGN_PACKAGE/screenshots/SCREENSHOT_EXPORT_INDEX.md`
- File inventory checks: 9 feature packages, 14 tracker files, 7 lightweight specs.
- Design evidence counts: 17 screenshot files and 63 source-export files under the design package.
- Git status for `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`, showing a heavily dirty worktree on `codex/v0.7.7-deployment-hygiene`.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. "Ready" language conflicts with unresolved product decisions and no-go gates

**Evidence:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/prd_tracker.md:9` through line 17 mark every major package as `PRD v2 ready`, with only some rows saying "decision needed." `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/implementation_plan_tracker.md:9` through line 17 similarly mark every plan as `Plan v2 ready`. At the same time, `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/open_questions_decisions.md:7` through line 14 lists P1/P2 decisions blocking PRD-09, PRD-10, PRD-11, PRD-12, PRD-14, and PRD-15. `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/risks_blockers_decisions_tracker.md:11` also lists PRD-11-SHELL mobile smoke as an open P0 blocker.

**Why it matters:** A future implementation agent may interpret "ready" as authorization to start, even when the package itself still requires Arun/Product decisions and verification gates.

**Failure mode:** The agent begins schema/API work for Ask attachments, offline controls, Android tabs, or repair semantics before the product decisions are closed, causing rework or behavior that violates the user's intended scope.

**Recommendation:** Replace `PRD v2 ready` and `Plan v2 ready` with explicit states such as `Draft v2 - blocked by decision`, `Ready for implementation`, `Ready for QA only`, or `No-go until verification`. Add a single no-go table at the top of the index that blocks implementation when any P0/P1 decision is open.

#### 2. Older baseline docs in the same folder can overpower the new planning package

**Evidence:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/03_IMPLEMENTATION_PROGRESS.md:5` through line 94 lists many "Completed Slices," and lines 95 through 121 list verification evidence. The new index says the next action is to finish PRD-11-SHELL verification at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/00_PLANNING_PACKAGE_INDEX.md:80` through line 89, while the roadmap says previous docs should be kept as baseline rather than complete release evidence at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/06_ROADMAP_AND_EXECUTION_PLAN.md:62` through line 65. The running log also says no tests/builds were run for this planning pass at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/RUNNING_LOG.md:80` through line 84.

**Why it matters:** The package asks agents to read old and new documents side by side, but does not force a precedence rule into every stale file.

**Failure mode:** A future agent cites the old implementation progress file as proof that a feature is verified, skipping the new roadmap's verification-first gates.

**Recommendation:** Add an explicit "superseded by 00/06/07 for planning status" banner to old baseline docs, or create a status reconciliation table that maps each old PRD/slice to one of: verified, coded-unverified, partial, superseded, decision-gated.

#### 3. There is no design-to-feature traceability matrix, so "every feature classified" is not auditable

**Evidence:** The screenshot index lists web and Android design states at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_UI_DESIGN_PACKAGE/screenshots/SCREENSHOT_EXPORT_INDEX.md:7` through line 31 and warns screenshots are references, not production evidence, at line 37. The design package contains 17 screenshot files and 63 source-export files. The feature classification table in `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/07_FEATURE_CLASSIFICATION_AND_GAP_ANALYSIS.md:32` through line 83 is a manual feature list, not a coverage matrix showing which screenshot, component, or design doc section each feature came from.

**Why it matters:** The user explicitly asked to compare documented features, discoverable capabilities, design-shown/implied features, and ambiguous items. A feature inventory alone does not prove every design artifact was considered.

**Failure mode:** A design-only state such as mobile login nuance, capture microstate, settings row, or Android item detail behavior is accidentally omitted, then discovered during implementation when it is expensive to re-plan.

**Recommendation:** Add `trackers/design_traceability_matrix.md` and `.csv` with one row per design screenshot/source component/doc section. Required columns: design artifact, shown state, implied behavior, classification, corresponding feature/PRD/spec, confidence, user decision needed, and implementation owner.

#### 4. Codebase verification is not reproducible enough for a dirty worktree

**Evidence:** The roadmap cites source areas only at path level in `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/06_ROADMAP_AND_EXECUTION_PLAN.md:22` through line 23. The running log records only branch and dirty-worktree state at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/RUNNING_LOG.md:93` through line 98. Git status shows dozens of modified and untracked app files outside `UX_v2`, including web, Android, service worker, tests, and docs.

**Why it matters:** In a dirty repo, "verified by source evidence" can become stale within minutes. Without a commit hash, dirty file count, and line-level evidence for critical claims, future agents cannot tell whether a classification applies to the current code state.

**Failure mode:** An agent implements against changed files using a stale classification, or trusts that Android/offline/share behavior exists because it was observed in a previous dirty state.

**Recommendation:** Add a reproducibility snapshot to the package: branch, `git rev-parse HEAD`, dirty file count, generated file inventory, and line-level source citations for the top 20 implementation-critical claims.

### P2 - Medium Risk

#### 1. Some "major feature" PRD packages do not visibly contain every requested PRD section

**Evidence:** The requested package format included PRD v1 with user goals, scope, web UX, Android UX, interactions, states, edge cases, data needs, acceptance criteria, analytics/events if relevant, non-goals, and open questions. `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-11-FU-mobile-shell-select-item-package.md` contains User Goals, Scope, Web UX, Android UX, Interactions/States, Edge Cases, Acceptance Criteria, and Open Questions, but not explicit Data Needs, Analytics/Events, or Non-Goals sections in the PRD v1 area. Similar section-depth variation exists across smaller Android-focused packages.

**Why it matters:** Consolidated files are acceptable, but missing explicit sections make the package harder to audit against the user's requested definition of done.

**Failure mode:** A future agent assumes omitted sections mean "not applicable" when the omission was never adjudicated, especially for analytics/privacy or data model impact.

**Recommendation:** Add "Not applicable" sections where a category is intentionally irrelevant. Do this especially for Data Needs, Analytics/Events, Non-Goals, and Web UX in Android-heavy packages.

#### 2. PRD-16 is treated as a future implementation gate, but the planning package itself lacks internal consistency checks

**Evidence:** PRD-16 says evidence folders/checklists should be created during implementation at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-16-qa-evidence-release-gates-package.md:77` through line 89. The running log says validation and Markdown/CSV sanity checks remained to do at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/RUNNING_LOG.md:69` through line 72. The package has duplicate Markdown and CSV trackers, but no generated parity report proving they match.

**Why it matters:** PM tracker drift is a planning failure, not just an implementation failure. CSV files are likely to be consumed by another tool or agent; if they diverge from Markdown, the wrong item may be prioritized.

**Failure mode:** One tracker says a decision is P1 while the CSV imported into a PM workflow says P2 or omits the blocker entirely.

**Recommendation:** Add a `trackers/TRACKER_PARITY_CHECK.md` that records row counts and known intentional differences between Markdown and CSV trackers. If the package remains manual, mark CSV files as convenience exports rather than independent sources of truth.

#### 3. Android-specific confidence is still mostly viewport confidence, not device confidence

**Evidence:** The roadmap correctly states Android is a Capacitor shell loading the hosted web app at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/06_ROADMAP_AND_EXECUTION_PLAN.md:11`. PRD-13 requires Android APK/device smoke "if available" at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-13-android-share-capture-package.md:101` through line 105. PRD-16 requires `npm run build:apk` or an exact blocker at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-16-qa-evidence-release-gates-package.md:81` through line 87.

**Why it matters:** The planning package talks about Android UX, share intents, offline fallback, pairing, and APK state. Browser viewport tests cannot catch Android intent delivery, Capacitor plugin timing, token state, file URI permission failures, or launcher metadata.

**Failure mode:** The web-mobile implementation looks correct in screenshots but fails when launched from the Android share sheet or after a cold start/offline transition.

**Recommendation:** Make Android device or emulator verification a hard gate for PRD-13 and PRD-15, not "if available." If unavailable, implementation should stop with a documented blocker rather than downgrade to viewport-only QA.

#### 4. The package defers live Magic Patterns verification without documenting freshness risk

**Evidence:** The roadmap says the local design package is self-contained and live Magic Patterns URLs were not required at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/06_ROADMAP_AND_EXECUTION_PLAN.md:25` through line 28. The screenshot index notes frozen local screenshots were captured from Magic Patterns source exports and are not production evidence at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_UI_DESIGN_PACKAGE/screenshots/SCREENSHOT_EXPORT_INDEX.md:33` through line 38.

**Why it matters:** The user provided Magic Patterns refs as optional, not mandatory, so skipping them is defensible. The risk is that the package does not clearly timebox when live design should be rechecked before pixel-level implementation.

**Failure mode:** Implementation follows frozen local exports even after the designer changed the live Magic Patterns reference.

**Recommendation:** Add a design freshness gate: before visual implementation starts, check whether the live Magic Patterns artifacts have changed or get explicit confirmation that the local frozen package is authoritative.

### P3 - Low Risk Or Polish

#### 1. The running log was not appended after final validation

**Evidence:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/RUNNING_LOG.md:69` through line 72 says validation and Markdown/CSV sanity checks remained to do, while the final response said validation passed.

**Why it matters:** The user asked for an append-only running log showing the full planning process. The log stops just before the final validation step.

**Failure mode:** A future agent reads the log and believes validation was never done.

**Recommendation:** Append a short follow-up entry recording the validation commands, counts, and any caveats.

#### 2. Absolute path resolution differs between the requested `Documents/arunvault` path and the resolved CloudStorage path

**Evidence:** The report-path helper resolved the output directory to `/Users/arun.prakash/Library/CloudStorage/.../arun-cursor/.../UX_v2`, while the user-facing requested path is `/Users/arun.prakash/Documents/arunvault/arun-cursor/.../UX_v2`.

**Why it matters:** This is probably a symlink or mirrored folder, not a content issue. It can still confuse agents comparing paths or file links.

**Failure mode:** A future agent believes there are two UX_v2 package locations and edits the wrong one.

**Recommendation:** Add a one-line path alias note in the package index or running log if both paths resolve to the same folder.

## What The Original Plan Or Work Gets Wrong

The package overestimates how much "complete planning" can be proven by producing many artifacts. The file set is broad, but the riskiest handoff problems are not file-count problems: they are status semantics, stale inherited docs, traceability, and reproducibility in a dirty worktree.

The phrase "PRD v2 ready" is especially dangerous. A PRD can be internally reviewed and still not be ready for implementation because product decisions are unresolved. The current package does contain those blockers, but buries them across trackers and individual files.

The package also treats the design package as adequately inspected, but does not produce the artifact that would prove design coverage: a traceability matrix from screenshots/source exports/docs to feature rows.

## Missing Validation

- No design artifact coverage matrix.
- No Markdown-to-CSV tracker parity report.
- No commit hash or dirty-worktree fingerprint attached to the classification.
- No final running-log entry recording the validation that happened after the first log entry.
- No line-level source evidence table for the most important codebase classifications.
- No explicit device/emulator gate for Android share and pairing flows.
- No freshness gate for live Magic Patterns references before visual implementation.

## Revised Recommendations

1. Revise tracker statuses before any implementation agent starts.
2. Add a status precedence note to old baseline docs or create a reconciliation table.
3. Create a design traceability matrix from all screenshots, source-export screens/components, and relevant design docs.
4. Add a reproducible code snapshot: branch, commit, dirty count, and critical source citations.
5. Add explicit "Not applicable" sections to PRD packages where required requested categories are intentionally omitted.
6. Add tracker parity validation for Markdown/CSV files.
7. Make Android device/emulator validation a hard gate for Android share, pairing, APK, and offline-entry claims.
8. Append a validation entry to the running log.

## Go / No-Go Recommendation

No-go for direct implementation from the package until P1 findings are addressed.

Conditional go for planning handoff after:

- All `ready` statuses are made decision-aware.
- Old progress docs cannot be mistaken for current release evidence.
- Design traceability is added.
- Code/worktree snapshot evidence is added.

## Plan Revision Inputs

### Required Deletions

- Delete or replace broad `PRD v2 ready` / `Plan v2 ready` status labels where a user decision, verification blocker, or dependency remains open.
- Remove any implication that file-count validation proves design coverage.

### Required Additions

- `trackers/design_traceability_matrix.md`
- `trackers/design_traceability_matrix.csv`
- `trackers/TRACKER_PARITY_CHECK.md`
- Code/worktree snapshot section in `00_PLANNING_PACKAGE_INDEX.md` or `07_FEATURE_CLASSIFICATION_AND_GAP_ANALYSIS.md`
- Status reconciliation table for `01` through `05` baseline docs.
- Final validation entry in `RUNNING_LOG.md`.

### Required Acceptance Criteria Changes

- A PRD is not implementation-ready while a blocking decision remains open.
- A design-implied feature is not considered inventoried unless it maps to at least one design artifact row or is explicitly marked out of scope.
- Android share/pairing/offline claims require device/emulator evidence or a documented blocker.
- CSV trackers must either match Markdown trackers or be labeled non-authoritative.

### Required Validation Changes

- Run and record tracker row-count/parity checks.
- Record branch, commit, and dirty-state snapshot.
- Record all source/design artifact counts used for planning.
- Add evidence paths or exact blockers for Android device testing.

### Required No-Go Gates

- Do not implement PRD-09 until attachment persistence and history snapshot semantics are decided.
- Do not implement PRD-10 mark-good-enough behavior until Arun approves semantics.
- Do not implement PRD-14 offline controls as active downloads/queues unless offline work is approved.
- Do not mark PRD-11-SHELL complete until mobile and desktop smoke evidence exists.
- Do not claim design coverage until the design traceability matrix exists.

## Residual Risks

Even after these revisions, the package remains vulnerable to drift because the worktree is very dirty and prior agents have modified implementation files outside this planning pass. The safest execution model is one feature package at a time, with a fresh source snapshot and validation entry before and after each implementation slice.
