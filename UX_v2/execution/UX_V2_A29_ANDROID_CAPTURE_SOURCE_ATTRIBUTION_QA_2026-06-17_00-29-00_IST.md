# UX v2 A29 Android Capture Source Attribution QA

Created: 2026-06-17 00:29:00 IST
Status: `passed_deployed_native_url_share_source_android_proven`
Production source before A29 deploy: `c17f07a`
Android candidate: debug APK `1.0.5/code6`

## Scope

A29 fixed the attribution gap found by A28. The Android share handler now sends the existing trusted `x-brain-capture-source: android` header for native URL/note JSON captures and PDF uploads. A29 was validated locally, deployed to production, and rerun through a real native Android URL-share fixture.

## Governance Artifacts

| Gate | Artifact |
| --- | --- |
| PRD v1 | `UX_v2/features/FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_PRD_V1_2026-06-17_00-18-00_IST.md` |
| PRD adversarial review | `UX_v2/features/FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_PRD_ADVERSARIAL_REVIEW_2026-06-17_00-19-00_IST.md` |
| PRD v2 | `UX_v2/features/FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_PRD_V2_2026-06-17_00-20-00_IST.md` |
| Implementation plan v1 | `UX_v2/features/FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_IMPLEMENTATION_PLAN_V1_2026-06-17_00-21-00_IST.md` |
| Plan adversarial review | `UX_v2/features/FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_00-22-00_IST.md` |
| Implementation plan v2 | `UX_v2/features/FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_IMPLEMENTATION_PLAN_V2_2026-06-17_00-23-00_IST.md` |

## Source Changes

Created:

- `src/lib/android-share/request.ts` - pure Android capture request header helpers.
- `src/lib/android-share/request.test.ts` - focused coverage for Android capture-source, JSON, and PDF headers.

Updated:

- `src/components/share-handler.tsx` - URL/note JSON requests now use `androidJsonCaptureHeaders()`, and PDF upload requests now use `androidPdfCaptureHeaders()`.

## Local Validation

| Check | Result |
| --- | --- |
| Focused test: `node --import tsx --test src/lib/android-share/request.test.ts` | Passed, 3 tests |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | Passed, 567 tests, 79 suites |
| `npm run build` | Passed with known `unpdf` warning |
| `npm run check:env` | Passed |
| `npm run check:build-artifacts` | Passed |

## Production Deploy

Command:

```text
BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh
```

Deploy result:

- local deploy gates passed, including 567 tests across 79 suites;
- local provider preflight continued under warn-only because local Ollama is unavailable;
- production build passed with the known `unpdf` warning;
- remote native dependencies rebuilt;
- remote install reported `found 0 vulnerabilities`;
- service restarted;
- authenticated health passed;
- remote provider check passed for enrichment, Ask, and embedding;
- Telegram webhook reachability passed;
- Telegram live smoke was skipped because release secret flags were not set.

## Native Android Rerun

A29 force-stopped the app before the rerun to avoid stale WebView state.

Fixture URL:

`https://www.iana.org/help/example-domains?ai_brain_qa=a29-20260617-002458`

Pre-share production exact-source count: `0`.

Android launch result:

- Status: `ok`
- Launch state: `COLD`
- Activity: `com.arunprakash.brain/.MainActivity`
- Wait time: `522 ms`

Temporary screenshot: `/tmp/ai-brain-a28-evidence/a29-result.png`

Visible result:

- Surface: `ANDROID SHARE`
- Title: `Saved to AI Memory`
- Body: `This shared item was saved with readable text and is ready for search and Ask.`
- Quality: `full_text`
- Actions: `Open item`, `Ask`, `Done`

UIAutomator XML: `/tmp/ai-brain-a28-evidence/a29-window.xml`

The XML confirms the active `com.arunprakash.brain` WebView; visible web text is proven by screenshot.

## Production DB Verification

Production DB found exactly one item for the A29 fixture:

| Field | Value |
| --- | --- |
| id | `c7a996504be7fe05d6d61259` |
| source_url | `https://www.iana.org/help/example-domains?ai_brain_qa=a29-20260617-002458` |
| title | `Example Domains for Documentation and Illustration` |
| source_type | `url` |
| capture_source | `android` |
| source_platform | `generic_article` |
| capture_quality | `full_text` |
| extraction_method | `readability` |
| total_chars | `757` |
| captured_at | `1781636135036` |

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

Immediate cleanup counts:

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

Redacted log summary: `UX_v2/execution/UX_V2_A29_ANDROID_CAPTURE_SOURCE_LOG_SCAN_REDACTED_2026-06-17_00-29-00_IST.json`

Raw logcat stayed under `/tmp/ai-brain-a28-evidence/a29-logcat-raw.txt` and must not be staged.

Summary:

- exact fixture URL: not found;
- `brain_token`: not found;
- bearer literal: not found;
- Capgo share-target logs: count-only `texts=1 files=0`;
- 64-hex hits: Android launcher debug lines, masked and not tracked as raw logs.

## Verdict

A29 closes the native Android URL-share success gate for the debug APK candidate: a real Android `ACTION_SEND` URL share produced the saved-result UI, production stored the exact fixture as `capture_source=android`, full-text capture metadata was correct, cleanup returned fixture rows to zero, and log hygiene passed.

APK publication remains blocked until explicit publication authorization/signing/distribution target and the TalkBack spoken-order decision are resolved.
