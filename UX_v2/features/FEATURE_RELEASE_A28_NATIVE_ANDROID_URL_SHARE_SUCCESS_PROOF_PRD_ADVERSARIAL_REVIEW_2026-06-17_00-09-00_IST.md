# Feature Release A28 Native Android URL Share Success Proof PRD - Adversarial Review

Created: 2026-06-17 00:09:00 IST
Reviewer stance: Brutally honest adversarial review
Reviewed target: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_PRD_V1_2026-06-17_00-08-00_IST.md`
Report path: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_PRD_ADVERSARIAL_REVIEW_2026-06-17_00-09-00_IST.md`

## Executive Verdict

Conditional go after revision. The PRD targets the right unresolved blocker, but v1 still leaves room for false confidence around pairing state, duplicate results, and production cleanup evidence. Those must be tightened before execution.

## Evidence Inspected

- A28 PRD v1 listed above.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/UX_V2_A27_URL_CAPTURE_SUCCESS_PROOF_QA_2026-06-16_23-59-00_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/share-handler.tsx`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/capture/share-result/share-result-client.tsx`
- Current Android tooling check: AVD `Brain_API_36` exists, no device attached.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Pairing state can collapse the proof into a missing-token result

Evidence: `src/components/share-handler.tsx` reads `brain_token` from Capacitor Preferences and returns a `missing_token` result before capture when no token exists. A28 PRD v1 says to verify pairing or rerun pairing, but it does not define how a missing-token first run is handled in evidence.

Why it matters: A missing token would prove the share target opens, not that URL capture succeeds.

Failure mode: The QA report could show Android launched and a result screen appeared, while the real success gate remains untested.

Recommendation: PRD v2 must require separate evidence buckets: first-run readiness, optional pairing remediation, and final successful URL-share proof with a new fixture after pairing.

#### 2. Duplicate results can masquerade as success

Evidence: The Android result client treats `duplicate_existing` as a green check state. A28 v1 requires a unique fixture, but it does not require the final user-facing state and production row to prove a newly created item.

Why it matters: A duplicate result only proves prior capture, not current native URL-share success.

Failure mode: Reusing or partially cleaning a fixture could show `Already saved` or an existing item and falsely close the blocker.

Recommendation: PRD v2 must require a timestamped fixture, no pre-existing exact row before share, final result not `duplicate_existing`, and production response/DB evidence consistent with a newly created item.

#### 3. Cleanup evidence can be too narrow

Evidence: A27 cleanup had related rows in `embedding_jobs`, `enrichment_jobs`, `item_tags`, and `item_topics`. A28 v1 requires cleanup, but it does not require capturing the item id and using that id to verify all related tables after deletion.

Why it matters: URL capture can create background rows. A source URL delete without foreign keys or without related-table checks could leave production residue.

Failure mode: The fixture item disappears but orphaned jobs/tags/topics remain.

Recommendation: PRD v2 must require item-id based related-row counts before and after cleanup, `PRAGMA foreign_keys=ON`, immediate zero counts, and delayed zero counts.

### P2 - Medium Risk

#### 1. Raw logcat handling is under-specified

Evidence: A26 found raw share payloads in native logs before patching. A28 v1 says raw logcat must not be staged, but does not say whether raw logs are deleted or where they may live.

Why it matters: Raw logcat can include URLs, token keys, or bearer-adjacent values. Even if not staged, leaving it in project evidence folders increases accidental staging risk.

Failure mode: A future broad stage accidentally includes raw logs.

Recommendation: Store raw logs outside the repo under `/tmp` or `UX_v2/execution/evidence/raw-untracked/` only if ignored; track only a redacted scan summary.

#### 2. UI screenshot alone is insufficient

Evidence: The result screen is driven from session storage via `storeShareResult()` and `loadShareResult()`. A screenshot can prove visible copy but not which payload state created it.

Why it matters: A stale or expired result could be confused with the just-triggered share.

Failure mode: Screenshot and DB row are from different attempts.

Recommendation: PRD v2 must require timestamp correlation: fixture URL, share command time, screenshot time, DB created time, and result screen state/action text.

### P3 - Low Risk Or Polish

#### 1. A28 should explicitly update the stale A27 tooling note

Evidence: A27 says Android tooling was unavailable. Current evidence found Homebrew command-line tools and `Brain_API_36`.

Why it matters: Future agents may waste time rediscovering this mismatch.

Failure mode: Trackers continue to say tooling is unavailable even after A28 proves it is present.

Recommendation: PRD v2 should require tracker wording that says A27's environment constraint is superseded by A28 tooling discovery.

## What The Original Plan Or Work Gets Wrong

The PRD v1 correctly refuses to count server-only success as native success, but it still assumes the Android environment is ready enough. It must treat missing token, duplicate capture, and cleanup residue as first-class failure states.

## Missing Validation

- No explicit pre-share production exact-row zero check.
- No explicit final state exclusion for `duplicate_existing`.
- No timestamp correlation across share command, UI evidence, and DB evidence.
- No raw-log storage/deletion rule.

## Revised Recommendations

1. Add pre-share exact fixture zero check.
2. Require new item creation, not duplicate.
3. Require item-id based related-row cleanup counts.
4. Keep raw logs outside tracked project scope and track only redacted summaries.
5. Add timestamp correlation to QA evidence.
6. Update trackers to supersede A27's tooling-unavailable note.

## Go / No-Go Recommendation

Conditional go for execution only after PRD v2 includes the required additions above.

## Plan Revision Inputs

### Required Deletions

- Remove any wording that allows a duplicate-only result to close native URL-share success.

### Required Additions

- Pre-share exact fixture zero check.
- Missing-token remediation branch with new fixture after pairing.
- Item-id based cleanup verification.
- Timestamp correlation.
- Raw-log storage rule.

### Required Acceptance Criteria Changes

- Result UI must be a created/saved success, not duplicate.
- Cleanup must include related rows by item id.

### Required Validation Changes

- Add device log redaction scan and staged exclusion scan.
- Add delayed production cleanup recheck.

### Required No-Go Gates

- No-go if pairing cannot be completed safely.
- No-go if the result is duplicate, expired, missing token, unsupported, or failed.
- No-go if cleanup leaves related rows.

## Residual Risks

Even after revision, emulator evidence may not fully match a physical device or distribution build. APK publication still needs explicit authorization and target selection.
