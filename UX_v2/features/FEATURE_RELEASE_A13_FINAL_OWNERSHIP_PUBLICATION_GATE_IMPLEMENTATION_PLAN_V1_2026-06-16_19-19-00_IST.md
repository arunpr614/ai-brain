# Feature Release A13 Final Ownership And Publication Gate Implementation Plan V1

Created: 2026-06-16 19:19 IST
Owner: Codex
Status: Draft for adversarial review
PRD: `FEATURE_RELEASE_A13_FINAL_OWNERSHIP_PUBLICATION_GATE_PRD_V2_2026-06-16_19-16-00_IST.md`

## Execution Principles

- Treat A13 as a release-safety gate, not a feature expansion.
- Prefer honest no-go labels over weak completion language.
- Make only scoped documentation/tracker edits plus evidence checks.
- Do not stage, commit, publish, sign, or distribute APK artifacts.
- Do not reveal tokens, session cookies, pairing codes, or private item content.

## Work Items

### 1. Inventory Current Release Ownership

Collect and record:

- `git status --short` total count.
- Tracked vs untracked status summary.
- Top-level path/category summary.
- A12-owned source/config/artifact/doc files.
- A13-owned docs/tracker/README changes.
- Inherited dirty categories that remain unresolved.

Output: A13 final audit document in `UX_v2/execution/`.

### 2. Verify Android Candidate Identity

Check:

- `shasum -a 256 data/artifacts/brain-debug-v1.0.4-code5.apk android/app/build/outputs/apk/debug/brain-debug-v1.0.4-code5.apk`
- `android/app/build.gradle` contains `versionCode 5` and `versionName "1.0.4"`.
- `capacitor.config.ts` contains `loggingBehavior: "none"`.
- `android/app/src/main/assets/capacitor.config.json` contains `"loggingBehavior": "none"`.
- A12 post-fix log scan artifact exists and is cited by path.

Do not rerun emulator/runtime validation unless a check contradicts A12 evidence.

### 3. Fix Current Root README Android Setup Guidance

Update only root README current setup guidance:

- Replace QR-code first-run pairing copy with short-lived Android pairing code steps.
- Replace "re-scan setup QR" reinstall guidance with generating a new Android code from Device pairing.
- Keep historical runbooks unchanged unless they are referenced as current setup instructions.

### 4. Update Release/Project Trackers

Update:

- `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
  - Replace stale "Create A12" next gate with A13 final ownership/publication closure.
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
  - Add A13 status and link to the A13 final audit.
- `UX_v2/trackers/milestone_tracker.md`
  - Add or update A13/final ownership/publication status if a suitable row exists.
- New A13 project tracker update file under `UX_v2/project_management/`.

Integrate PM sidecar artifact:

- `UX_v2/project_management/AI_BRAIN_UX_V2_PM_STATUS_A13_2026-06-16_19-09-12_IST.md`

### 5. Create Final A13 Audit

Create `UX_v2/execution/UX_V2_A13_FINAL_OWNERSHIP_PUBLICATION_AUDIT_2026-06-16_19-30-00_IST.md` covering:

- Current status labels.
- Ownership inventory.
- Candidate identity verification.
- Publication authorization status.
- TalkBack status.
- URL-share status.
- README/tracker corrections.
- PM sidecar integration.
- Remaining no-go gates.

### 6. Validate And Log

Run:

- `git diff --check` on A13 touched files.
- Hash/config/static checks listed above.
- README/tracker stale-text searches targeted to current guidance.
- Secret-pattern scan over A13 Markdown docs.

Append a root `RUNNING_LOG.md` milestone entry at true EOF after execution.

## Acceptance Matrix

| PRD Requirement | Plan Coverage |
| --- | --- |
| A13-R1 ownership inventory | Work item 1 and final audit |
| A13-R2 publication authorization | Work item 5 |
| A13-R3 Android identity | Work item 2 |
| A13-R4 token-log evidence | Work item 2 |
| A13-R5 README current setup | Work item 3 |
| A13-R6 tracker next gate | Work item 4 |
| A13-R7 release packet | Work item 4 |
| A13-R8 accessibility no-go | Work item 5 |
| A13-R9 native share decision | Work item 5 |
| A13-R10 PM sidecar | Work item 4 |
| A13-R11 evidence hygiene | Work items 5 and 6 |
| A13-R12 project tracker | Work item 4 |
| A13-R13 running log | Work item 6 |
| A13-R14 completion guard | Work item 5 |

## No-Go Conditions

- External APK publication remains blocked without explicit user authorization and a named distribution target.
- Overall goal remains active while broad worktree ownership is unresolved.
- Full Android accessibility remains open while TalkBack spoken-order audit is not captured.
- URL-share success remains unproven unless a deterministic cleanable URL fixture passes.
- A13 must not proceed to final log closure if new docs contain raw secrets.
