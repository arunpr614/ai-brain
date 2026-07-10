# Feature Release A28 - Native Android URL Share Success Proof Implementation Plan v2

Created: 2026-06-17 00:13:00 IST
Owner: Codex
Status: Ready for execution
PRD: `FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_PRD_V2_2026-06-17_00-10-00_IST.md`
Supersedes: `FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_IMPLEMENTATION_PLAN_V1_2026-06-17_00-11-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_00-12-00_IST.md`

## Revision Summary

Plan v2 adds emulator lifecycle ownership, readiness-versus-final-proof separation, remote secret redaction boundaries, stable UI polling, exact staged forbidden-pattern scans, and execution-time evidence naming.

## Inputs

| Input | Value |
| --- | --- |
| Project | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2` |
| ADB | `/opt/homebrew/share/android-commandlinetools/platform-tools/adb` |
| Emulator | `/opt/homebrew/share/android-commandlinetools/emulator/emulator` |
| AVD | `Brain_API_36` |
| APK | `data/artifacts/brain-debug-v1.0.5-code6.apk` |
| Package | `com.arunprakash.brain` |
| Activity | `com.arunprakash.brain/.MainActivity` |
| Production | `https://brain.arunp.in` |

## Execution Plan

### Phase 1 - Device Readiness

1. Run `adb devices`.
2. If no device is attached, launch `Brain_API_36` with Homebrew command-line tools and record that A28 owns the emulator session.
3. Wait until:
   - device is listed as `device`;
   - `sys.boot_completed` is `1`;
   - package manager responds.
4. If A28 launched the emulator, shut it down before final response unless a later command proves it already exited.

### Phase 2 - APK Identity

1. Query package identity for `com.arunprakash.brain`.
2. If absent or not `versionName=1.0.5` and `versionCode=6`, install `data/artifacts/brain-debug-v1.0.5-code6.apk`.
3. Re-query and record installed identity.
4. No-go if identity cannot be corrected.

### Phase 3 - Fixture And Pre-Share DB Zero

1. Generate fixture:
   - `https://www.iana.org/help/example-domains?ai_brain_qa=a28-<YYYYMMDD-HHMMSS>`
2. Query production from host `brain` for exact fixture count before share.
3. Source production secrets only inside remote shell if needed; do not echo or persist token values.
4. If count is not zero, generate a new fixture and repeat.

### Phase 4 - Native Share Attempt

1. Clear logcat.
2. Record share command timestamp.
3. Send:
   - action `android.intent.action.SEND`;
   - type `text/plain`;
   - extra text exact fixture URL;
   - target `com.arunprakash.brain/.MainActivity`.
4. Wait for final result text to stabilize. Valid terminal text includes saved, missing-token, duplicate, failed, unsupported, or expired result copy.

### Phase 5 - Missing-Token Readiness Branch

If the first terminal result is `Pair this Android app` or equivalent missing-token state:

1. Record it as readiness evidence only.
2. Complete existing safe pairing flow without printing or tracking tokens.
3. Generate a new timestamped fixture.
4. Re-run pre-share zero check.
5. Re-run native share proof from Phase 4.

Only a post-pairing run with a new fixture can close A28.

### Phase 6 - UI Evidence

1. After stable final text, capture screenshot and UIAutomator XML.
2. Inspect screenshot with Codex image view.
3. The final success UI must show:
   - `Saved to AI Memory`;
   - `full text` or `full_text`;
   - `Open item`;
   - `Ask`.
4. No-go if final UI is duplicate, missing-token, failed, expired, unsupported, or item-id-less.

### Phase 7 - Production Verification

1. Query production DB by exact fixture URL.
2. Record:
   - item id;
   - source URL;
   - title;
   - source type;
   - capture source;
   - source platform;
   - capture quality;
   - extraction method;
   - total chars;
   - created/updated timestamps if available.
3. Record related row counts by item id before cleanup.
4. No-go if exact row is absent, duplicate-only, or not full-text Android URL capture.

### Phase 8 - Cleanup

1. Run cleanup with `PRAGMA foreign_keys=ON`.
2. Delete exact fixture URL only.
3. Verify immediate zero counts by source URL and item id for:
   - `items`;
   - `chunks`;
   - `embedding_jobs`;
   - `enrichment_jobs`;
   - `capture_artifacts`;
   - `item_tags`;
   - `item_topics`;
   - `item_collections`.
4. Delay and recheck zero counts.
5. No-go if cleanup fails.

### Phase 9 - Log Hygiene

1. Dump raw logcat to `/tmp` or another untracked non-repo path.
2. Produce only redacted scan summary in tracked docs.
3. Scan for:
   - exact fixture URL;
   - `brain_token`;
   - `Bearer `;
   - focused 64-hex token-like strings;
   - Capgo raw share-target payload text.
4. Delete raw log or leave only in `/tmp`; do not stage it.

### Phase 10 - Documentation, Tracker, And Running Log

Create execution-time artifacts with actual timestamp:

- A28 QA Markdown report.
- A28 redacted log-scan JSON.
- A28 PM tracker update Markdown.

Update:

- `UX_v2/trackers/milestone_tracker.md`
- `UX_v2/trackers/milestone_tracker.csv`
- `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
- root `RUNNING_LOG.md` by append-only milestone entry, then keep it unstaged unless explicitly approved.

Tracker wording must say A27's tooling-unavailable note is superseded by A28 Homebrew Android tool discovery.

### Phase 11 - Staging And Commit

Stage only safe A28 artifacts and tracker updates. Do not stage root `RUNNING_LOG.md`.

Run:

- `git diff --cached --check`;
- staged forbidden-pattern scan.

Forbidden staged patterns:

- `RUNNING_LOG.md`;
- `data/artifacts/`;
- `.apk`;
- `.aab`;
- `.keystore`;
- `.sqlite`;
- `.db`;
- `.env`;
- raw logcat files;
- `assets/`;
- heavy visual/source evidence folders unless explicitly reviewed.

Commit only after staged checks pass.

## Pass / Fail Matrix

| Result | Meaning |
| --- | --- |
| Saved UI + full-text DB + cleanup + clean log scan | A28 passes; native Android URL-share success proven for debug candidate. |
| Missing token first, then saved UI on new fixture after safe pairing | A28 passes with readiness note. |
| Missing token only | A28 fails readiness; native success remains open. |
| Duplicate existing | A28 fails native creation proof; repeat with new fixture. |
| Link could not be saved or server unreachable | A28 fails capture success; blocker remains open. |
| Cleanup leaves rows | A28 fails release hygiene; investigate before commit. |
| Log scan finds token/raw payload leakage | A28 fails privacy gate; create a new governed fix slice before publication. |

## Expected Remaining Gates After Pass

1. APK publication authorization and named signing/distribution target.
2. Full TalkBack spoken-order audit if required.
3. Optional push/PR decision.
