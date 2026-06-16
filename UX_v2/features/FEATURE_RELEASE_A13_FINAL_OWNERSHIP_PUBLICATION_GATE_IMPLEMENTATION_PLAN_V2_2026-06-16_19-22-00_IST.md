# Feature Release A13 Final Ownership And Publication Gate Implementation Plan V2

Created: 2026-06-16 19:22 IST
Owner: Codex
Status: Approved for scoped execution
PRD: `FEATURE_RELEASE_A13_FINAL_OWNERSHIP_PUBLICATION_GATE_PRD_V2_2026-06-16_19-16-00_IST.md`
Supersedes: `FEATURE_RELEASE_A13_FINAL_OWNERSHIP_PUBLICATION_GATE_IMPLEMENTATION_PLAN_V1_2026-06-16_19-19-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A13_FINAL_OWNERSHIP_PUBLICATION_GATE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_19-20-00_IST.md`

## Execution Principles

- Treat A13 as a release-safety gate, not a feature expansion.
- Prefer honest no-go labels over weak completion language.
- Make only scoped README, documentation, tracker, and evidence-report edits.
- Do not stage, commit, publish, sign, or distribute APK artifacts.
- Do not reveal tokens, session cookies, pairing codes, or private item content.
- Classify the APK as a debug validation candidate unless Arun provides explicit external distribution authorization and a named target.

## Work Items

### 1. Inventory Current Release Ownership

Collect and record:

- `git status --short` total count.
- Status-code summary for tracked/untracked files.
- Top-level path/category summary.
- A12-owned source/config/artifact/doc files.
- A13-owned docs/tracker/README changes.
- Inherited dirty categories that remain unresolved.

Output: A13 final audit document in `UX_v2/execution/` with a filename using actual creation time.

### 2. Verify Android Candidate Identity

Check:

- `shasum -a 256 data/artifacts/brain-debug-v1.0.4-code5.apk android/app/build/outputs/apk/debug/brain-debug-v1.0.4-code5.apk`
- `android/app/build.gradle` contains `versionCode 5` and `versionName "1.0.4"`.
- `capacitor.config.ts` contains `loggingBehavior: "none"`.
- `android/app/src/main/assets/capacitor.config.json` contains `"loggingBehavior": "none"`.
- A12 post-fix log scan artifact exists and is cited by path.

Do not rerun emulator/runtime validation unless a check contradicts A12 evidence. If no fresh runtime log scan is rerun, say that directly.

### 3. Read PM Sidecar Artifact

Confirm and read:

- `UX_v2/project_management/AI_BRAIN_UX_V2_PM_STATUS_A13_2026-06-16_19-09-12_IST.md`

Integrate its milestone/risk findings into the A13 audit and project tracker update. If it is missing, mark PM integration blocked instead of claiming integration.

### 4. Fix Current Root README Android Setup Guidance

Update only root README current setup guidance:

- First-run pairing section: replace QR-code setup copy with short-lived Android pairing code steps.
- Reinstall/recovery section: replace "re-scan setup QR" guidance with generating a new Android code from Device pairing.
- Leave historical runbooks unchanged.

Validation targets:

- Root README Android first-run pairing block.
- Root README reinstall/recovery guidance.
- Root README may still mention QR only if historical or extension-specific context justifies it; current Android setup must not instruct QR scanning.

### 5. Update Release/Project Trackers

Update:

- `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
  - Replace stale "Create A12" next gate with A13 final ownership/publication closure and remaining no-go gates.
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
  - Add A13 status and link to the A13 final audit.
- `UX_v2/trackers/milestone_tracker.md`
  - Add A13 final ownership/publication status if no suitable row exists.
- New A13 project tracker update file under `UX_v2/project_management/` with actual creation timestamp.

### 6. Create Final A13 Audit

Create `UX_v2/execution/UX_V2_A13_FINAL_OWNERSHIP_PUBLICATION_AUDIT_<actual_timestamp>_IST.md` covering:

- Current status labels.
- Ownership inventory.
- Candidate identity verification.
- A12 token-log evidence citation.
- Publication authorization status.
- TalkBack status.
- URL-share status.
- README/tracker corrections.
- PM sidecar integration.
- Remaining no-go gates.

### 7. Validate And Log

Run:

- `git diff --check` on A13 touched files.
- Hash/config/static checks listed above.
- Targeted README stale-copy checks for QR scanner and setup-QR re-scan language.
- Targeted tracker stale-copy check that "Create an A12" is absent from the next-gate section.
- Secret-pattern scan over A13 Markdown docs using at least:
  - `brain_token`
  - `Bearer`
  - `SESSION_COOKIE`
  - `pairing code`
  - 64-character hex token patterns
  - common secret keywords: `TOKEN=`, `SECRET=`, `PASSWORD=`, `PRIVATE_KEY=`, `api_key`

Append a root `RUNNING_LOG.md` milestone entry at true EOF only after validation passes or clearly records any validation blocker.

## Acceptance Matrix

| PRD Requirement | Plan Coverage |
| --- | --- |
| A13-R1 ownership inventory | Work item 1 and final audit |
| A13-R2 publication authorization | Work items 1, 6, and status labels |
| A13-R3 Android identity | Work item 2 |
| A13-R4 token-log evidence | Work item 2 |
| A13-R5 README current setup | Work item 4 |
| A13-R6 tracker next gate | Work item 5 |
| A13-R7 release packet | Work item 5 |
| A13-R8 accessibility no-go | Work item 6 |
| A13-R9 native share decision | Work item 6 |
| A13-R10 PM sidecar | Work item 3 |
| A13-R11 evidence hygiene | Work items 6 and 7 |
| A13-R12 project tracker | Work item 5 |
| A13-R13 running log | Work item 7 |
| A13-R14 completion guard | Work item 6 |

## No-Go Conditions

- External APK publication remains blocked without explicit user authorization and a named distribution target.
- Overall goal remains active while broad worktree ownership is unresolved.
- Full Android accessibility remains open while TalkBack spoken-order audit is not captured.
- URL-share success remains unproven unless a deterministic cleanable URL fixture passes.
- A13 must not append final running-log closure if new docs contain raw secrets.
