# AI Memory UX v2 Planning Coverage - Adversarial Review

**Created:** 2026-06-14 10:03:22 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2` planning package coverage, PRD coverage, implementation-plan coverage, and UI/UX execution path
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/AI_MEMORY_UX_V2_PLANNING_COVERAGE_ADVERSARIAL_REVIEW_2026-06-14_10-03-22_IST.md`

## Executive Verdict

Conditional go for planning handoff. No-go for direct implementation until the open gates and decision blockers are closed.

The package is broad and substantially improved after remediation: it identifies the real web and Android codebases, maps design artifacts to product slices, classifies features, creates nine major PRD packages, creates seven lightweight specs, and defines a milestone path. It does not yet give an implementing agent permission to start coding immediately. The highest-risk gaps are unresolved product decisions, Android/device evidence gates, untracked handoff artifacts, and several thinner implementation plans that do not fully satisfy the original "architecture, affected modules, data/API, migration risk, tests, rollout, dependencies, milestones" standard.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/00_PLANNING_PACKAGE_INDEX.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/06_ROADMAP_AND_EXECUTION_PLAN.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/07_FEATURE_CLASSIFICATION_AND_GAP_ANALYSIS.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/README.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/RUNNING_LOG.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/*.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/lightweight-specs/*.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/*.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_UI_DESIGN_PACKAGE`
- `git status --short --branch` and `git status --short -- UX_v2`
- File inventory checks: 49 UX_v2 files, 9 major PRD package files, 7 lightweight spec files

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. The package has a clear roadmap, but it is not an executable implementation path until multiple gates close

**Evidence:** The package index says "Do not start implementation while any applicable gate below is open" and lists open gates for PRD-11-SHELL, Ask decisions, mark-good-enough, Android tabs, offline controls, pairing/package decisions, Android device/emulator evidence, and design freshness in `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/00_PLANNING_PACKAGE_INDEX.md:27` through `:40`. The PRD tracker marks PRD-09-FU through PRD-15 as blocked by decisions, dependencies, or device/emulator gates in `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/prd_tracker.md:9` through `:17`.
**Why it matters:** The implementing agent can follow the sequence, but cannot safely execute most product behavior yet. If "clear path" is interpreted as "start coding now," the package will create false confidence.
**Failure mode:** Agent skips PRD-11-SHELL verification, invents Ask attachment semantics, implements privacy/offline controls that overpromise, or claims Android completion from viewport screenshots.
**Recommendation:** Treat the current package as a gated planning handoff. Before implementation, close the relevant decision rows or explicitly narrow the first slice to PRD-11-SHELL verification and PRD-06-FU capture contract work.

#### 2. Not every product piece is documented as a full PRD package

**Evidence:** The master tracker has 17 rows, but only 9 major PRD packages and 7 lightweight specs. Several product-relevant pieces remain lightweight or decision-level: OPS-01, OPS-02, YT-01, EXT-01, and ANALYTICS-01 in `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/master_feature_inventory.md:19` through `:25`. Android item tabs are missing/decision-gated in the design traceability matrix at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/design_traceability_matrix.md:24` and `:59`, while PRD-11-FU says tabs should be split unless Arun explicitly folds them in at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-11-FU-mobile-shell-select-item-package.md:128` and `:185`.
**Why it matters:** The package satisfies "major missing/partial features" for the main web/Android behavior slices, but it does not satisfy a stricter interpretation of "every product piece has a PRD."
**Failure mode:** Android item detail tabs, YouTube media treatment, browser extension parity, or analytics/privacy decisions get treated as minor polish and are implemented without PRD-level product review.
**Recommendation:** If the expected standard is "every product piece has a PRD," add PRD packages or explicit out-of-scope decisions for Android item tabs, YouTube item detail/media, extension parity, and analytics/events. If lightweight handling is intentional, state that these are not approved implementation scope.

#### 3. Several implementation plan v2 sections are too thin for a clean handoff

**Evidence:** PRD-06, PRD-09, and PRD-10 have strong implementation plans with affected modules, data/API needs, tests, rollout notes, and milestones. By contrast, PRD-13 implementation plan v2 is mostly six steps plus QA at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-13-android-share-capture-package.md:161` through `:186`; PRD-14 plan v2 is copy/content oriented at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-14-settings-privacy-offline-package.md:154` through `:176`; PRD-15 plan v2 is six steps plus acceptance at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-15-entry-pairing-session-offline-package.md:170` through `:187`; PRD-16 plan v2 gives the QA matrix but not the concrete checklist artifact schema/path at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-16-qa-evidence-release-gates-package.md:149` through `:179`.
**Why it matters:** These are real implementation areas, not just copy edits. Android share, entry/pairing, offline fallback, and QA gates touch state, routing, storage, and verification. Thin plans push too much design and sequencing back onto the next agent.
**Failure mode:** The next agent creates ad hoc state stores, misses module ownership, forgets rollback/compatibility, or produces QA evidence in an inconsistent format.
**Recommendation:** Before executing PRD-13 through PRD-16, expand each plan v2 with the same structure used by PRD-06/09/10: affected modules/files, data/API needs, migration/compatibility risks, dependencies, milestones, rollout notes, and exact evidence artifacts.

#### 4. The planning package is currently untracked, which makes the handoff fragile

**Evidence:** `git status --short -- UX_v2` returns `?? UX_v2/`. The source snapshot also records a heavily dirty worktree with 174 dirty entries in `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/source_snapshot_2026-06-14.md:6` through `:17`.
**Why it matters:** A future agent in this exact workspace can read the package, but a branch checkout, PR, clone, or cleanup operation may omit the whole planning package.
**Failure mode:** The implementation agent works from stale root docs or handovers because the UX_v2 package is absent from the transferred repo state.
**Recommendation:** Preserve the package deliberately before relying on it as a handoff artifact: stage/commit it, archive it, or otherwise mark it as durable. Do not mix it with unrelated dirty app changes.

### P2 - Medium Risk

#### 1. Design freshness is acknowledged but not resolved

**Evidence:** The roadmap says the local design package was enough for planning and live Magic Patterns URLs were not required at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/06_ROADMAP_AND_EXECUTION_PLAN.md:25` through `:30`. The design traceability matrix repeats the freshness gate at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/design_traceability_matrix.md:64` through `:71`.
**Why it matters:** The package maps frozen assets well, but it does not prove the live Magic Patterns references are still identical.
**Failure mode:** Implementation matches a stale local export while the live design has since changed.
**Recommendation:** Before visual implementation, either re-open the live Magic Patterns refs and record drift, or get explicit confirmation that the local UX_UI_DESIGN_PACKAGE is authoritative.

#### 2. Tracker parity is row-count parity, not semantic parity

**Evidence:** The tracker parity file says Markdown files are authoritative and CSVs are convenience exports at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/TRACKER_PARITY_CHECK.md:6`, and notes the limitation that it does not compare every cell at `:29` through `:32`.
**Why it matters:** PMs may use CSV trackers, while agents may use Markdown trackers. A row count match does not guarantee statuses, blockers, or next actions match.
**Failure mode:** A CSV consumer sees outdated readiness language or misses a blocker even though Markdown is correct.
**Recommendation:** Before handoff, either regenerate CSVs from Markdown or run a semantic diff for tracker rows that carry readiness/blocker language.

#### 3. PRD-11-SHELL is a blocker but not a full package

**Evidence:** The package index blocks all new feature implementation on PRD-11-SHELL verification at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/00_PLANNING_PACKAGE_INDEX.md:33`. The master inventory points PRD-11-SHELL to "Existing handover plus tracker," not a feature package, at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/trackers/master_feature_inventory.md:12`.
**Why it matters:** It is acceptable if PRD-11-SHELL is verification-only. It becomes a gap if verification reveals behavior changes are needed, because there is no full PRD/plan package for fixes to the shell itself.
**Failure mode:** The next agent folds shell bug fixes into PRD-11-FU or another feature slice without a clear acceptance boundary.
**Recommendation:** Keep PRD-11-SHELL verification-only. If smoke fails and code changes are needed, create a small PRD-11-SHELL-FIX plan before modifying navigation behavior.

### P3 - Low Risk Or Polish

#### 1. The package has two absolute path identities

**Evidence:** The package index documents that the `Documents/arunvault` path and the CloudStorage-resolved path refer to the same content at `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/00_PLANNING_PACKAGE_INDEX.md:9`.
**Why it matters:** This is handled, but future reports may still mix both paths and make review output look duplicated.
**Failure mode:** A reviewer thinks there are two different packages or writes a report into the wrong folder.
**Recommendation:** Keep using the `Documents/arunvault` path in planning docs and only use CloudStorage-resolved paths when tools resolve them.

## What The Original Plan Or Work Gets Wrong

- It is directionally correct to say the product pieces have been inventoried, but too strong to say every product piece has a full PRD. The main missing/partial product behavior has PRD packages; several partial or decision-gated pieces remain lightweight specs or unresolved decisions.
- It is directionally correct to say implementation plans exist, but too strong to say every implementation plan is equally executable. PRD-06/09/10 are much more implementation-ready than PRD-13/14/15/16.
- It is directionally correct to say there is a clear execution order. It is wrong to interpret that order as permission to start feature implementation before PRD-11-SHELL verification and relevant user decisions are closed.
- It is correct to model Android as a Capacitor/WebView shell rather than native Android screens. It is wrong to claim Android readiness without real emulator/device or APK evidence.

## Missing Validation

- No PRD-11-SHELL smoke evidence yet.
- No Android emulator/device or APK evidence for share, pairing/token, offline fallback, launcher label/icon, or install/open.
- No live Magic Patterns freshness check after the local package was frozen.
- No semantic Markdown/CSV tracker parity check.
- No durability action for the untracked UX_v2 handoff folder.
- No full implementation-plan completeness pass for PRD-13 through PRD-16.

## Revised Recommendations

1. Accept the package as the planning authority, not as implementation authorization.
2. Start implementation work only with PRD-11-SHELL verification.
3. Treat PRD-06 as the first real feature candidate after shell verification because it has the strongest and most foundational plan.
4. Close D-001, D-002, and D-003 before PRD-09/12; D-004 before mark-good-enough; D-005 before Android item tabs; D-007 before active offline controls; D-008/D-013 before Android pairing/package claims.
5. Expand PRD-13 through PRD-16 implementation plan v2 sections before executing those slices.
6. Decide whether Android item tabs, YouTube media detail, extension parity, analytics/events, and ops transcript surfaces should remain lightweight/deferred or become full PRD packages.
7. Preserve the untracked UX_v2 package before handing it to another environment.

## Go / No-Go Recommendation

Conditional go for coverage review and planning handoff.

No-go for broad implementation. The only safe immediate execution path is:

1. Preserve the planning package.
2. Recreate a fresh source snapshot.
3. Finish PRD-11-SHELL verification.
4. Re-check design freshness or confirm the local package is frozen authority.
5. Pick one gated feature package.
6. Close its decisions.
7. Execute only that package's implementation plan v2, after expanding it if it is one of the thinner plans.

## Plan Revision Inputs

### Required Deletions

- Remove or avoid any verbal claim that "all product pieces have full PRDs" unless lightweight/deferred pieces are explicitly excluded.
- Remove or avoid any verbal claim that the whole package is "ready to implement."

### Required Additions

- Add full PRD packages or explicit deferral decisions for Android item tabs, YouTube item detail/media, extension parity, analytics/events, and ops transcript surfaces if they are expected in the implementation pass.
- Add stronger implementation plan sections for PRD-13 through PRD-16.
- Add a handoff durability step for the untracked UX_v2 folder.
- Add a semantic tracker parity check if CSVs will be used by PMs.

### Required Acceptance Criteria Changes

- Feature completion must require evidence paths, not status text.
- Android completion must require emulator/device or APK evidence, not only responsive web screenshots.
- PRD-13 through PRD-16 must include module/data/dependency/rollout acceptance criteria before execution.

### Required Validation Changes

- Run PRD-11-SHELL smoke before any new code.
- Run live design freshness check or record local-design authority before visual implementation.
- Recreate source snapshot before implementation because the repo is dirty.
- Reconcile Markdown and CSV tracker content, not only row counts, before PM handoff.

### Required No-Go Gates

- No feature implementation while PRD-11-SHELL verification is open.
- No PRD-09/12 implementation while Ask attachment/history decisions are open.
- No Android share/pairing/offline/APK claims without device/emulator evidence or exact blocker.
- No active offline queue, privacy, or encryption claims unless the underlying behavior exists.
- No handoff outside this workspace until UX_v2 is preserved in a durable form.

## Residual Risks

- The dirty worktree can invalidate source citations before implementation begins.
- Some design-implied behavior may remain ambiguous until Arun decides whether prototype-only states are real scope.
- Lightweight specs may grow into real product behavior during implementation unless scope is actively controlled.
- Android WebView-specific behavior can still differ from Browser viewport behavior even after responsive QA.
