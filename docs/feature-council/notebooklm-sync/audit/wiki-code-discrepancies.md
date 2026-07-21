# Wiki and Code Discrepancy Audit

**Audit date:** 2026-07-21
**Code baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`
**Repository Wiki baseline:** `docs/wiki/` at the code baseline
**Live GitHub Wiki baseline:** `317e40e8de08fc492e0e2662b5f45b8bb7e48fcd` (2026-07-19)

## Publication rule

The repository Wiki directory is not the latest complete Wiki. The live Wiki contains 89 Markdown pages versus 86 in `docs/wiki/`, including live-only Graphify and YouTube research pages. Final publication must begin from a fresh clone of live Wiki `master`, preserve remote-only pages, apply narrowly reconciled edits, and verify the pushed commit. Replacing the live Wiki with the repository directory would lose current documentation.

## Confirmed discrepancies

### 1. Recall POST body is described incorrectly

Both repository and live `Recall-Synchronization.md:37-39` say POST accepts an empty JSON body, and `APIs-and-Integrations.md:45-47` describes an empty bounded body plus a key. Code strictly requires a JSON object containing `idempotencyKey`; missing, extra, or invalid fields fail validation (`src/app/api/settings/recall-sync/route.ts:17-24,41-52`; route tests `src/app/api/settings/recall-sync/route.test.ts:39-62`).

**Correction:** Document the exact `{ "idempotencyKey": "…" }` request shape and current length/validation contract without showing a real key.

### 2. Nonexistent Recall storage is documented

Both baselines name `recall_sync_schedule_state` and `recall_sync_state.last_successful_apply_at` (`Recall-Synchronization.md:44-48`). Code stores the schedule under generic `recall_sync_state` key `schedule:next_elapse` and derives last success from the latest validated execution’s `wrapper_validated_at` (`src/db/recall-manual-sync.ts:485-516`). `Data-Model.md:30` likewise implies a separately persisted last-success marker.

**Correction:** Describe the generic schedule snapshot key and derived validated-success query.

### 3. Repository pages incorrectly call manual Recall unmerged

The repository versions of `Recall-Synchronization.md`, `Deployment-and-Operations.md`, `Feature-Catalog.md`, and `Source-Baselines-and-Status.md` contain review-candidate/unmerged wording. Feature commit `fdd7406` was merged through PR #22 at `4e917c7`, followed by rollout fixes through PR #23 at `5b92e68`.

The live Wiki corrected much of this on 2026-07-13, but `Source-Baselines-and-Status.md:15-24` still calls the feature unmerged and `Deployment-and-Operations.md:20` still ends with “This review candidate.” Runtime installation and feature enablement remain unknown; merge must not be promoted to runtime proof.

**Correction:** State “merged into current main; host installation and enablement not freshly verified.”

### 4. Capture page omits the manual Recall path

Both baselines describe Recall only as a guarded scheduled import (`Capture-and-Ingestion.md:19`). Current code also contains the durable, default-off Settings request path.

**Correction:** Add the manual path while retaining host-dependent/default-off and runtime-unknown qualifications.

### 5. Lock ownership wording is imprecise

`Recall-Synchronization.md:48` says the worker holds the private `flock`. The worker launches the shared wrapper; the wrapper obtains and holds the lock. The worker probes the lock during stale recovery (`scripts/recall-manual-sync-worker.ts:65-100`; `scripts/recall-scheduled-apply.sh:126-152`).

**Correction:** Attribute ownership to the wrapper and the stale-recovery probe to the worker.

### 6. Repository CI statement is stale; live wording is stronger but scoped

Repository `Deployment-and-Operations.md:30` says GitHub CI validates documentation but not the full product suite. Product CI runs static checks, the product test suite, documentation checks, a build, and release smokes (`.github/workflows/product-ci.yml:30-41`). The live Wiki already corrects this.

The live Recall page’s broader claim that all shell/process gates pass (`Recall-Synchronization.md:60`) should still be scoped: several Recall-specific process/systemd smoke commands are not explicit Product CI steps.

**Correction:** Distinguish protected CI coverage from separately run feature evidence and from unverified production-host behavior.

### 7. Several recorded baselines predate current main

The live Wiki uses older baselines such as `8c134110`, `23868faf`, and the former Recall feature commit. This is not automatically a behavior defect, but pages must not say they were verified against current main `ad78d774` unless a new audit actually covered them.

**Correction:** Preserve historical baselines and add the narrow 2026-07-21 audit scope; do not rewrite historical runtime evidence as current verification.

## NotebookLM publication additions required later

After the final decision, the live Wiki should receive publication-safe pages or sections covering:

- research status and explicit “not implemented” boundary;
- supported edition distinctions;
- selected/rejected strategies and rationale;
- privacy and credential boundary;
- capacity and lifecycle limits;
- manual/daily UX truthfulness;
- validation evidence and remaining account/runtime blockers;
- links to the repository research package and final review PR.

No Wiki page should disclose local paths, notebook IDs, project numbers, account identifiers, tokens, cookies, source IDs, or private test evidence.
