# UX v2 A25/A26 Android URL Share and Log Hygiene QA

Created: 2026-06-16 23:40:00 IST
Status: `web_a25_deployed_android_a26_debug_candidate_validated_publication_gated`
Production web source deployed: `c17f07a` (`Fix Android URL share failure result`)
Latest Android candidate commit: `8577751` (`Sanitize Android share target logs`)
APK candidate: `data/artifacts/brain-debug-v1.0.5-code6.apk`

## Scope

A25 and A26 close the URL-share failure-honesty gap discovered after the production hotfix and the native log-hygiene gap discovered during Android runtime proof.

- A25 changes the shared result contract and UI so URL and note capture failures are shown as source-specific failures instead of generic server-unreachable failures.
- A26 patches the Capgo share-target native plugin during APK builds so logcat records only share counts, not raw shared text or file URIs.

## Governance Cycle

| Feature | PRD v1 | PRD review | PRD v2 | Plan v1 | Plan review | Plan v2 |
| --- | --- | --- | --- | --- | --- | --- |
| A25 Android URL-share result honesty | `FEATURE_RELEASE_A25_ANDROID_URL_SHARE_RESULT_HONESTY_PRD_V1_2026-06-16_23-20-00_IST.md` | `FEATURE_RELEASE_A25_ANDROID_URL_SHARE_RESULT_HONESTY_PRD_ADVERSARIAL_REVIEW_2026-06-16_23-21-00_IST.md` | `FEATURE_RELEASE_A25_ANDROID_URL_SHARE_RESULT_HONESTY_PRD_V2_2026-06-16_23-22-00_IST.md` | `FEATURE_RELEASE_A25_ANDROID_URL_SHARE_RESULT_HONESTY_IMPLEMENTATION_PLAN_V1_2026-06-16_23-23-00_IST.md` | `FEATURE_RELEASE_A25_ANDROID_URL_SHARE_RESULT_HONESTY_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_23-24-00_IST.md` | `FEATURE_RELEASE_A25_ANDROID_URL_SHARE_RESULT_HONESTY_IMPLEMENTATION_PLAN_V2_2026-06-16_23-25-00_IST.md` |
| A26 Android share-target log hygiene | `FEATURE_RELEASE_A26_ANDROID_SHARE_TARGET_LOG_HYGIENE_PRD_V1_2026-06-16_23-34-00_IST.md` | `FEATURE_RELEASE_A26_ANDROID_SHARE_TARGET_LOG_HYGIENE_PRD_ADVERSARIAL_REVIEW_2026-06-16_23-35-00_IST.md` | `FEATURE_RELEASE_A26_ANDROID_SHARE_TARGET_LOG_HYGIENE_PRD_V2_2026-06-16_23-36-00_IST.md` | `FEATURE_RELEASE_A26_ANDROID_SHARE_TARGET_LOG_HYGIENE_IMPLEMENTATION_PLAN_V1_2026-06-16_23-37-00_IST.md` | `FEATURE_RELEASE_A26_ANDROID_SHARE_TARGET_LOG_HYGIENE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_23-38-00_IST.md` | `FEATURE_RELEASE_A26_ANDROID_SHARE_TARGET_LOG_HYGIENE_IMPLEMENTATION_PLAN_V2_2026-06-16_23-39-00_IST.md` |

## Implementation Summary

| Area | Result |
| --- | --- |
| Share-result contract | Added `url_capture_failed` and `note_capture_failed` typed result states. |
| Failure mapping | Added `mapNonOkCaptureResponseToShareResult()` so URL/note non-OK capture responses avoid the misleading `server_unreachable` state. |
| User copy | URL failure now renders "Link could not be saved" with `Capture manually` and `Done` actions. |
| Native log hygiene | Added `scripts/patch-capgo-share-target-privacy.mjs` and wired `scripts/build-apk.sh` to run it before Capacitor sync. |
| APK identity | Bumped Android candidate to `versionName "1.0.5"` and `versionCode 6`. |

## Validation Matrix

| Check | Result |
| --- | --- |
| Focused share-result tests | Passed, 14/14. |
| Full tests after A25 | Passed, 564 tests, 78 suites, 0 failures. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm run build` | Passed with the known `unpdf` import-meta warning. |
| A25 production deploy | Passed with `BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh`; remote provider check passed after deploy. |
| A25 live smoke | Passed: `/unlock` 200, protected `/library` 307 to unlock, unauthenticated `/api/ask` 401, remote deployed bundle contains `url_capture_failed` copy/mapping. |
| A25 browser-mobile proof | Passed through DOM snapshot at `WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a25/a25-browser-url-capture-failed-390.snapshot.txt`; in-app browser screenshot timed out. |
| A25 Android runtime proof | Passed for visible UX: screenshot shows "Link could not be saved", explanatory copy, `Capture manually`, and `Done`. |
| A25 log hygiene | Failed: raw shared URL appeared in `CapacitorShareTarget` logcat payload, so A26 was required. |
| A26 APK build | Passed through `npm run build:apk`; produced `brain-debug-v1.0.5-code6.apk`. |
| A26 APK SHA-256 | `e7539f1afb8b730b0c5f5808724d960df20a6db9fadc943b90c73ac9979298b7`. |
| A26 install | Passed; installed package reports `versionCode=6`, `versionName=1.0.5`, `lastUpdateTime=2026-06-16 23:36:43`. |
| A26 Android runtime proof | Passed: screenshot again shows the honest URL failure result for the native share flow. |
| A26 redacted log scan | Passed: no fixture URL, `brain_token`, bearer literal, or focused 64-hex values found; `share_target_count_only=True`, `share_target_raw_payload=False`. |
| Final A26 validation | Passed: `npm run lint`, `npm test` with 564 tests across 78 suites, and `npm run build:apk`. |

## Evidence

Runtime evidence is retained as local proof and intentionally not staged as heavy/raw evidence unless separately approved:

- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a25/a25-url-share-failure-result.png`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a25/a25-url-share-logcat.raw.txt`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a25/a26-url-share-failure-result.png`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a25/a26-share-logcat-scan.redacted.txt`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a25/a26-v105-installed-package.txt`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a25/a26-v105-apk-sha256.txt`

## Production and Publication Status

- Production web is deployed with A25 source commit `c17f07a`.
- A26 is an Android build-pipeline/APK candidate change. It is committed locally as `8577751` and validated in an emulator as `1.0.5/code6`.
- A26 was not separately web-deployed because it does not change the web runtime bundle.
- No APK signing, upload, publication, push, or PR creation was performed.

## Residual Risks / Open Gates

- APK publication remains blocked until Arun authorizes a named signing/distribution target.
- Full TalkBack spoken-order audit is still uncaptured unless Arun explicitly accepts prior bounded TalkBack launch smoke.
- URL-share success remains unresolved. A25/A26 prove honest failure handling and private log hygiene for URL failure, not successful URL capture.
- The `.invalid` URL fixture is expected to fail and should not create a production item.
- Root `RUNNING_LOG.md` remains append-only and intentionally unstaged.

## Verdict

A25 closes the web/source honesty issue for URL and note share failures and is deployed to production. A26 closes the native share-target raw payload log issue in the `1.0.5/code6` debug APK candidate. The overall user goal remains open because APK publication authorization, full TalkBack decision, and URL-share success decision are still not closed.
