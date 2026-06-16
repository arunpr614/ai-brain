# Feature Release A28 - Native Android URL Share Success Proof PRD v2

Created: 2026-06-17 00:10:00 IST
Owner: Codex
Status: Approved for implementation-plan drafting
Supersedes: `FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_PRD_V1_2026-06-17_00-08-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_PRD_ADVERSARIAL_REVIEW_2026-06-17_00-09-00_IST.md`

## Revision Summary

PRD v2 incorporates the adversarial review by adding explicit pre-share fixture checks, missing-token remediation rules, duplicate rejection, timestamp correlation, item-id based cleanup verification, raw-log storage rules, and tracker wording to supersede A27's stale tooling-unavailable note.

## Background

A27 proved production server/API URL capture success but did not prove native Android URL-share success. A27 also recorded Android tooling as unavailable. On 2026-06-17, Android tooling was found under Homebrew paths and AVD `Brain_API_36` was listed successfully. A28 exists to use that tooling for a real native URL-share proof.

## Goal

Prove or fail the actual Android native URL-share path for `com.arunprakash.brain` debug APK `1.0.5/code6`, without APK publication.

The final success claim requires one coherent run, or a documented missing-token remediation followed by a clean second run, proving:

1. Correct installed APK identity.
2. Pre-share production exact fixture count is zero.
3. Android receives a real `ACTION_SEND` `text/plain` URL fixture.
4. App reaches production with a paired token.
5. User-facing result screen shows a newly saved URL result, not duplicate or failure.
6. Production has exactly one item for the fixture with expected Android URL capture metadata.
7. Cleanup removes the item and all related rows, verified immediately and after delay.
8. Redacted log scan shows no raw URL payload, token key/value, bearer literal, or focused token-shaped leakage in tracked evidence.

## Scope

Included:

- Android emulator/device readiness.
- APK install verification.
- Optional safe pairing remediation if needed.
- Native Android URL share intent.
- Result screenshot and UI XML.
- Production DB verification and cleanup.
- Redacted log hygiene summary.
- Tracker and running-log milestone update.

Excluded:

- APK signing, upload, distribution, or publication.
- Web source deployment.
- TalkBack spoken-order completion.
- Broad worktree cleanup.
- Root running-log staging.

## Requirements

### A28-R1 Tooling Discovery

Record the exact Android tool paths used. A28 must state that A27's tooling-unavailable note is superseded by the Homebrew tool discovery, not that A27 was globally wrong at the time.

### A28-R2 Device Readiness

Use an already attached device or launch `Brain_API_36`. Device state must be `device`, boot completed, and package manager responsive before proof.

### A28-R3 APK Identity

The installed app must be:

- package: `com.arunprakash.brain`;
- `versionName=1.0.5`;
- `versionCode=6`.

If missing or stale, install `data/artifacts/brain-debug-v1.0.5-code6.apk` and re-verify.

### A28-R4 Unique Fixture And Pre-Share Zero

Use a timestamped fixture:

`https://www.iana.org/help/example-domains?ai_brain_qa=a28-<YYYYMMDD-HHMMSS>`

Before sending the share intent, query production for exact source URL counts and record zero. If a row already exists, use a new fixture.

### A28-R5 Native Intent

Send a real Android share intent:

- action: `android.intent.action.SEND`;
- MIME: `text/plain`;
- extra text: exact fixture URL;
- target: `com.arunprakash.brain/.MainActivity`.

### A28-R6 Pairing Remediation

If the first result is `missing_token`, that run is not a failed product proof. It is a readiness finding. Complete the existing safe pairing flow without printing or tracking tokens, then repeat the native URL-share proof with a new timestamped fixture. Only the second run can close the success gate.

### A28-R7 Success Result Definition

The final UI evidence must show:

- `Saved to AI Memory`;
- quality `full_text` or visible equivalent;
- `Open item`;
- `Ask`.

The following states are explicitly not success for A28:

- `Already saved`;
- `Pair this Android app`;
- `Link could not be saved`;
- `Could not reach AI Memory`;
- `Share not supported`;
- `Share result expired`;
- any result lacking an item id.

### A28-R8 Timestamp Correlation

The QA report must correlate:

- fixture URL timestamp;
- share command time;
- screenshot/XML capture time;
- production item created/updated time if available;
- cleanup time.

### A28-R9 Production Verification

After the final share, verify the exact item row and related rows from production host `brain`. The item row must include:

- exact `source_url`;
- `source_type=url`;
- `capture_source=android`;
- `capture_quality=full_text`;
- `extraction_method=readability`;
- expected title/source platform for the IANA page;
- item id.

Record related row counts by item id before cleanup.

### A28-R10 Cleanup Verification

Run cleanup with `PRAGMA foreign_keys=ON` and exact source URL. Verify by item id and source URL that all related rows are zero immediately and after a delayed recheck.

### A28-R11 Evidence Hygiene

Raw logcat output must be written outside the tracked project tree or to a clearly untracked temporary path. Tracked artifacts may include only redacted JSON or Markdown summaries. Staged scans must confirm no raw log, APK, DB, `.env`, keystore, token, `data/artifacts`, `assets`, or root `RUNNING_LOG.md` is staged.

## Acceptance Criteria

| Gate | Pass condition |
| --- | --- |
| Governance | PRD v1, PRD review, PRD v2, plan v1, plan review, and plan v2 exist before execution. |
| Tooling | AVD/device and absolute tool paths recorded. |
| APK | Installed package is `1.0.5/code6`. |
| Pre-share DB | Exact fixture count is zero before share. |
| Native share | Real Android `ACTION_SEND` sends the fixture to the app. |
| Pairing | Final successful run is paired; missing-token readiness runs are documented separately. |
| UI success | Screenshot/XML show newly saved URL result with Open item and Ask actions. |
| DB success | Production row proves full-text Android URL capture for exact fixture. |
| Cleanup | Source URL and item-id related rows return to zero immediately and after delay. |
| Log hygiene | Redacted scan has no raw fixture URL, `brain_token`, bearer literal, or token-shaped leakage. |
| Trackers | Milestone tracker, delivery gate tracker, release packet, PM update, and running log reflect A28 accurately. |

## No-Go Conditions

- Device cannot boot or is not responsive.
- APK identity cannot be verified or corrected.
- Pairing cannot be completed safely if required.
- Final UI result is duplicate, failure, expired, missing-token, unsupported, or item-id-less.
- Production DB does not prove exact fixture success.
- Cleanup leaves fixture or related rows.
- Raw secrets or token-shaped values appear in tracked evidence.
- Excluded artifacts are staged.

## Expected Remaining Blockers If A28 Passes

1. APK publication authorization and distribution/signing target.
2. Full TalkBack spoken-order audit if required.
3. Optional push/PR decision.
