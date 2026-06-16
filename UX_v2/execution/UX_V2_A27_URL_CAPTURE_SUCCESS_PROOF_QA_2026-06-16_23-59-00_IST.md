# UX v2 A27 URL Capture Success Proof QA

Created: 2026-06-16 23:59:00 IST
Status: `server_url_capture_success_proven_native_android_url_share_pending`
Production source before/after proof: `c17f07a` deployed web source; A26 APK/build commit `8577751` remains latest Android candidate source

## Scope

A27 addresses the remaining URL-share success uncertainty without overstating Android coverage. It proves that production `/api/capture/url` can save a deterministic URL fixture as full text and then clean it from production. It does not prove the native Android share-intent path because Android tooling is unavailable in this resumed environment.

## Governance Artifacts

| Gate | Artifact |
| --- | --- |
| PRD v1 | `UX_v2/features/FEATURE_RELEASE_A27_URL_SHARE_SUCCESS_PROOF_PRD_V1_2026-06-16_23-53-00_IST.md` |
| PRD adversarial review | `UX_v2/features/FEATURE_RELEASE_A27_URL_SHARE_SUCCESS_PROOF_PRD_ADVERSARIAL_REVIEW_2026-06-16_23-54-00_IST.md` |
| PRD v2 | `UX_v2/features/FEATURE_RELEASE_A27_URL_SHARE_SUCCESS_PROOF_PRD_V2_2026-06-16_23-55-00_IST.md` |
| Implementation plan v1 | `UX_v2/features/FEATURE_RELEASE_A27_URL_CAPTURE_SUCCESS_PROOF_IMPLEMENTATION_PLAN_V1_2026-06-16_23-56-00_IST.md` |
| Plan adversarial review | `UX_v2/features/FEATURE_RELEASE_A27_URL_CAPTURE_SUCCESS_PROOF_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_23-57-00_IST.md` |
| Implementation plan v2 | `UX_v2/features/FEATURE_RELEASE_A27_URL_CAPTURE_SUCCESS_PROOF_IMPLEMENTATION_PLAN_V2_2026-06-16_23-58-00_IST.md` |

## Fixture

Fixture URL:

`https://www.iana.org/help/example-domains?ai_brain_qa=a27-20260616-2355`

Local extraction preflight returned `full_text`, title `Example Domains`, and body length `757`.

## Environment Constraint

Android native proof could not run in this resumed environment:

- `adb` was not found in shell PATH.
- `emulator` was not found in shell PATH.
- Common SDK paths under `~/Library/Android/sdk` were absent.
- Spotlight found no local `adb` or `emulator`.
- Homebrew prefixes for `android-platform-tools` and `android-commandlinetools` were absent.

This means A27 can close server/API URL capture success only. It cannot close native Android URL-share success.

## Production Capture Proof

The first local-token attempt returned `401`, confirming local `.env` is not the active production bearer token. The successful proof was run from production host `brain` using `/etc/brain/.env` without printing or persisting the bearer token.

Redacted response:

```json
{
  "fixtureUrl": "https://www.iana.org/help/example-domains?ai_brain_qa=a27-20260616-2355",
  "httpStatus": 201,
  "ok": true,
  "action": "created",
  "duplicate": false,
  "itemId": "9232287b1433c93c3ac4e8cb",
  "captureResultState": "created_full_text",
  "captureResultQuality": "full_text",
  "sourcePlatform": "generic_article",
  "capturedVia": "android",
  "recommendedAction": "open_item",
  "message": "Saved with readable text. This source is ready for search and Ask."
}
```

## Production DB Verification

After capture, production DB showed exactly one item for the fixture:

| Field | Value |
| --- | --- |
| id | `9232287b1433c93c3ac4e8cb` |
| source_url | `https://www.iana.org/help/example-domains?ai_brain_qa=a27-20260616-2355` |
| title | `Reserved Example Domains for Documentation` |
| source_type | `url` |
| capture_source | `android` |
| source_platform | `generic_article` |
| capture_quality | `full_text` |
| extraction_method | `readability` |
| total_chars | `757` |

Related rows immediately after capture:

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

## Cleanup Verification

Cleanup was run with SQLite foreign keys enabled:

```sql
PRAGMA foreign_keys=ON;
DELETE FROM items
WHERE source_url = 'https://www.iana.org/help/example-domains?ai_brain_qa=a27-20260616-2355';
```

Post-cleanup counts:

| Table | Count |
| --- | ---: |
| items | 0 |
| chunks | 0 |
| embedding_jobs | 0 |
| enrichment_jobs | 0 |
| capture_artifacts | 0 |
| item_tags | 0 |
| item_topics | 0 |
| item_collections | 0 |

Delayed recheck after 5 seconds:

| Table | Count |
| --- | ---: |
| items | 0 |
| embedding_jobs | 0 |
| enrichment_jobs | 0 |
| item_tags | 0 |
| item_topics | 0 |

## Evidence Hygiene

- No bearer token was printed or persisted.
- Request headers were not written to tracked artifacts.
- Redacted bounded proof is saved at `UX_v2/execution/UX_V2_A27_URL_CAPTURE_SUCCESS_PROOF_RESPONSE_REDACTED_2026-06-16_23-59-00_IST.json`.
- Root `RUNNING_LOG.md` remains append-only and intentionally unstaged.

## Verdict

`server_url_capture_success` is proven on production and cleaned up. `native_android_url_share_success` remains open because no Android share intent could be run in the current environment. APK publication remains blocked by explicit publication authorization/signing target and the TalkBack spoken-order decision.
