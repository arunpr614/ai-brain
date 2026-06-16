# Feature Release A13 Final Ownership Publication Gate PRD - Adversarial Review

**Created:** 2026-06-16 19:13:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A13_FINAL_OWNERSHIP_PUBLICATION_GATE_PRD_V1_2026-06-16_19-12-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A13_FINAL_OWNERSHIP_PUBLICATION_GATE_PRD_ADVERSARIAL_REVIEW_2026-06-16_19-13-00_IST.md`

## Executive Verdict

Conditional no-go for execution until PRD v2 tightens ownership inventory, human publication authorization, secret-log regression validation, and project-manager integration. PRD v1 points in the right direction, but it still allows A13 to become a paper audit that leaves the next agent with ambiguous ownership and distribution status.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A13_FINAL_OWNERSHIP_PUBLICATION_GATE_PRD_V1_2026-06-16_19-12-00_IST.md`
- `git status --short` output showing a broad dirty worktree with many modified and untracked paths.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/README.md` lines 143-156 and 216-218 still describing QR scanning or re-scanning.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/setup-apk/page.tsx` showing current Android pairing-code entry.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/app/settings/device-pairing/page.tsx` showing current Android short-lived code copy.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/UX_V2_A12_ANDROID_PUBLICATION_GATE_QA_2026-06-16_18-59-00_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
- `shasum -a 256` output showing matching `1.0.4/code5` APK hashes.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Publication authorization is still too easy to self-certify

**Evidence:** PRD v1 says A13 should "decide, with evidence, whether `1.0.4/code5` is a debug validation candidate, a publication candidate, or blocked pending external authorization" at lines 32-33, while non-goals only say not to publish without explicit authorization at line 38.
**Why it matters:** Codex can classify local evidence, but it cannot grant distribution authority. If this is not a hard no-go, A13 could end with wording like "publication candidate" that a future agent mistakes for release approval.
**Failure mode:** The debug APK is copied into a public or semi-public channel because the report says "publication candidate" without a named human owner, target, and authorization artifact.
**Recommendation:** PRD v2 must separate "debug validation candidate" from "externally publishable candidate" and define external publication as blocked until the user names the distribution target and authorizes it in this thread or another traceable artifact.

#### 2. Dirty worktree ownership has no measurable inventory gate

**Evidence:** A13-R1 requires separating A12-authored changes from pre-existing broad dirty changes at line 59, but the acceptance tests do not require `git status --short`, counts, category grouping, or a release-scope changed-file list. Current `git status --short` shows hundreds of modified/untracked paths.
**Why it matters:** A broad dirty worktree is the biggest release ownership risk. A narrative statement is not enough to prevent accidental staging, missing source changes, or claiming full ownership of work done by prior agents.
**Failure mode:** A final tracker says ownership is reviewed, but there is no concrete inventory that a release owner can use to stage, commit, or exclude files.
**Recommendation:** PRD v2 must require a captured changed-file inventory with counts, explicitly owned A12/A13 files, inherited dirty categories, and a no-go if the full worktree cannot be safely attributed.

### P1 - High Risk

#### 1. Secret-log regression validation is weaker than the bug it is closing

**Evidence:** A13-R3 and acceptance test 3 only require static `loggingBehavior` checks in source and synced asset config at lines 61 and 75. A12 found an actual Capacitor bridge log leak and then created `a12-v104-log-token-scan.PASS.txt`.
**Why it matters:** A static config check is necessary but not sufficient to preserve the security finding. A13 should inspect the post-fix log-scan artifact and include it in the final audit, or clearly say no fresh runtime log scan was run.
**Failure mode:** A report says token-log hygiene is verified from config even if the installed APK or evidence trail does not support that conclusion.
**Recommendation:** Require A13 to cite the A12 post-fix log-scan PASS artifact and classify any fresh runtime scan as not rerun unless it is actually rerun.

#### 2. README stale-text validation is ambiguous

**Evidence:** README has current setup lines that mention QR scanning, and there are older runbooks that also mention QR. PRD v1 acceptance test 4 says "README text search for stale QR setup wording" at line 76 without defining the exact section or allowed historical references.
**Why it matters:** A broad `rg QR` can either fail forever because historical docs exist or pass incorrectly because only one phrase was changed.
**Failure mode:** Current Android setup instructions remain misleading even though a loose search was satisfied elsewhere.
**Recommendation:** PRD v2 must target root README current Android first-run pairing and reinstall guidance specifically, while leaving historical runbooks alone unless they are part of the current setup path.

#### 3. Project-manager sidecar output is not integrated

**Evidence:** The user explicitly asked for a project-manager agent. PRD v1 requires a project tracker update at line 67 but does not require incorporating or cross-referencing the sidecar's PM artifact.
**Why it matters:** If the sidecar finds stale or contradictory tracker claims, A13 should not ignore that work.
**Failure mode:** The main A13 audit closes without using the PM agent's milestone/risk table, leaving duplicate or conflicting project-management state.
**Recommendation:** PRD v2 must require waiting for or polling the PM sidecar before final tracker/running-log updates when feasible, and cite its artifact if produced.

#### 4. Release packet update is omitted

**Evidence:** PRD v1 names project tracker and running log updates at lines 67-68 but does not require updating the A7 release-readiness packet that has been used as the release status source.
**Why it matters:** Future agents may read the A7 packet first. If it remains at A12 wording while A13 exists, release state forks again.
**Failure mode:** A next agent trusts stale release-packet status and repeats the wrong gate.
**Recommendation:** Add a requirement to update the A7 release readiness packet or explicitly create an A13 audit that supersedes it and is linked from the tracker.

### P2 - Medium Risk

#### 1. TalkBack decision lacks a no-go wording standard

**Evidence:** A13-R6 says full audit must remain open if not captured at line 64, but the release status definition does not include that as a named no-go for overall completion.
**Why it matters:** Accessibility gaps can be softened into "optional" language under deadline pressure.
**Failure mode:** The final report says "bounded smoke passed" and a reader misses that spoken order remains unverified.
**Recommendation:** Add an explicit status label such as `talkback_spoken_order_not_captured` and include it in no-go conditions for full Android publication if required.

#### 2. URL-share decision lacks a fixture rule

**Evidence:** A13-R7 requires a decision but does not say what evidence would be acceptable if dedicated URL-share proof is attempted.
**Why it matters:** A repeat of the `example.com` fixture could produce another ambiguous failure.
**Failure mode:** A future agent spends time on a bad fixture and overreads the result.
**Recommendation:** Require any future URL-share proof to use a deterministic, cleanable fixture endpoint or explicitly downgrade URL-share to not proven.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

PRD v1 correctly avoids claiming completion, but it still relies on prose where release safety needs hard gates: human authorization, concrete dirty-worktree inventory, and evidence-specific secret-log validation.

## Missing Validation

- No required `git status --short | wc -l` or categorized dirty-worktree snapshot.
- No required citation of the A12 post-fix token-log scan artifact.
- No required PM sidecar artifact integration.
- No release-packet synchronization requirement.
- No deterministic URL-share fixture rule.

## Revised Recommendations

1. Add a non-delegable human authorization gate for external APK publication.
2. Add a dirty-worktree inventory acceptance check with owned/inherited categories.
3. Cite A12 token-log scan PASS evidence and do not imply a fresh runtime scan unless rerun.
4. Scope README QR cleanup to current setup guidance.
5. Integrate PM sidecar findings before final tracker/log updates when available.
6. Link or update the release-readiness packet so A13 supersedes A12 cleanly.

## Go / No-Go Recommendation

No-go for A13 execution on PRD v1. Proceed only after PRD v2 incorporates the findings above.

## Plan Revision Inputs

### Required Deletions

- Delete wording that allows Codex to decide external publication readiness without explicit human distribution authorization.

### Required Additions

- Dirty-worktree inventory gate.
- PM sidecar integration gate.
- A7 release packet synchronization or supersession.
- A12 token-log scan citation.
- Human publication authorization no-go.

### Required Acceptance Criteria Changes

- README acceptance must target the current root README Android setup section.
- Publication acceptance must classify `1.0.4/code5` as debug validation candidate unless human publication authorization exists.

### Required Validation Changes

- Capture changed-file counts and categories.
- Verify A13 docs with secret-pattern scans.
- Verify tracker no longer says A12 is next.

### Required No-Go Gates

- No external publication without explicit user authorization and target.
- No full-goal completion while dirty-worktree ownership remains incomplete.
- No full TalkBack claim without spoken-order evidence.

## Residual Risks

Even after PRD v2, A13 will likely leave full release completion open if human publication authorization and full TalkBack spoken-order audit are not supplied. That is acceptable only if clearly recorded as a no-go, not as a soft follow-up.
