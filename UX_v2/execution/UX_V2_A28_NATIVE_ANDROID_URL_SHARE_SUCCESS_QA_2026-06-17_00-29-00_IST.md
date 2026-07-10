# UX v2 A28 Native Android URL Share Success QA

Created: 2026-06-17 00:29:00 IST
Status: `user_success_metadata_blocked_then_cleaned`
Production source at start: `c17f07a` deployed web source with Android debug APK `1.0.5/code6`

## Scope

A28 attempted to close the native Android URL-share success gate using the Homebrew Android tooling discovered after A27. The run proved the user-facing native URL-share path can save a full-text item and show the saved result screen, but it also found a release-blocking metadata attribution gap: production saved the native share with `capture_source=unknown` instead of `android`.

That gap was moved into A29 for a governed fix and rerun.

## Governance Artifacts

| Gate | Artifact |
| --- | --- |
| PRD v1 | `UX_v2/features/FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_PRD_V1_2026-06-17_00-08-00_IST.md` |
| PRD adversarial review | `UX_v2/features/FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_PRD_ADVERSARIAL_REVIEW_2026-06-17_00-09-00_IST.md` |
| PRD v2 | `UX_v2/features/FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_PRD_V2_2026-06-17_00-10-00_IST.md` |
| Implementation plan v1 | `UX_v2/features/FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_IMPLEMENTATION_PLAN_V1_2026-06-17_00-11-00_IST.md` |
| Plan adversarial review | `UX_v2/features/FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_00-12-00_IST.md` |
| Implementation plan v2 | `UX_v2/features/FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_IMPLEMENTATION_PLAN_V2_2026-06-17_00-13-00_IST.md` |

## Android Tooling And APK Identity

- ADB: `/opt/homebrew/share/android-commandlinetools/platform-tools/adb`
- Emulator: `/opt/homebrew/share/android-commandlinetools/emulator/emulator`
- AVD: `Brain_API_36`
- A28 launched the emulator and later shut it down with `adb emu kill`.
- Device state: `emulator-5554 device`
- Boot state: `sys.boot_completed=1`
- Installed package: `com.arunprakash.brain`
- Installed version: `versionName=1.0.5`, `versionCode=6`
- Installed timestamp: `2026-06-16 23:36:43`

This supersedes the A27 environment note that Android tooling was unavailable in that resumed context.

## Fixture

Fixture URL:

`https://www.iana.org/help/example-domains?ai_brain_qa=a28-20260617-001203`

Pre-share production exact-source count: `0`.

## Native Share Execution

Command shape:

```text
ACTION_SEND text/plain -> com.arunprakash.brain/.MainActivity
```

Android launch result:

- Status: `ok`
- Launch state: `COLD`
- Activity: `com.arunprakash.brain/.MainActivity`
- Wait time: `691 ms`

## User-Facing Result

Temporary screenshot: `/tmp/ai-brain-a28-evidence/a28-result.png`

Visible result:

- Surface: `ANDROID SHARE`
- Title: `Saved to AI Memory`
- Body: `This shared item was saved with readable text and is ready for search and Ask.`
- Quality: `full_text`
- Actions: `Open item`, `Ask`, `Done`

UIAutomator XML: `/tmp/ai-brain-a28-evidence/a28-window.xml`

The XML confirms `package="com.arunprakash.brain"` and the focused WebView. WebView text was not exposed in the UIAutomator dump, so the visible text proof comes from the screenshot.

## Production DB Verification

Production DB found exactly one item for the A28 fixture:

| Field | Value |
| --- | --- |
| id | `618222b2cd5c51d47c0560ef` |
| source_url | `https://www.iana.org/help/example-domains?ai_brain_qa=a28-20260617-001203` |
| title | `Reserved Example Domains for Documentation` |
| source_type | `url` |
| capture_source | `unknown` |
| source_platform | `generic_article` |
| capture_quality | `full_text` |
| extraction_method | `readability` |
| total_chars | `757` |
| captured_at | `1781635359752` |

Related rows before cleanup:

| Table | Count |
| --- | ---: |
| items | 1 |
| chunks | 0 |
| embedding_jobs | 1 |
| enrichment_jobs | 1 |
| capture_artifacts | 0 |
| item_tags | 6 |
| item_topics | 6 |
| item_collections | 0 |

## Cleanup

Cleanup used `PRAGMA foreign_keys=ON` and exact source URL deletion.

Immediate cleanup counts by source URL and item id:

| Table | Count |
| --- | ---: |
| items_by_url | 0 |
| items_by_id | 0 |
| chunks | 0 |
| embedding_jobs | 0 |
| enrichment_jobs | 0 |
| capture_artifacts | 0 |
| item_tags | 0 |
| item_topics | 0 |
| item_collections | 0 |

Delayed cleanup recheck:

| Table | Count |
| --- | ---: |
| items_by_url | 0 |
| items_by_id | 0 |
| embedding_jobs | 0 |
| enrichment_jobs | 0 |
| item_tags | 0 |
| item_topics | 0 |

## Log Hygiene

Redacted log summary: `UX_v2/execution/UX_V2_A28_NATIVE_ANDROID_URL_SHARE_LOG_SCAN_REDACTED_2026-06-17_00-29-00_IST.json`

Raw logcat stayed under `/tmp/ai-brain-a28-evidence/a28-logcat-raw.txt` and must not be staged.

Summary:

- exact fixture URL: not found;
- `brain_token`: not found;
- bearer literal: not found;
- Capgo share-target logs: count-only `texts=1 files=0`;
- 64-hex hits: Android launcher/system certificate/debug lines, masked and not tracked as raw logs.

## Verdict

A28 proved native Android user-facing URL-share success but did not close the release gate because the production item was attributed as `capture_source=unknown`. A29 was required to add Android capture-source headers, deploy, and rerun the native proof.
