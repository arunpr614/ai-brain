# Feature Release A27 URL Capture Success Proof Implementation Plan v2

Created: 2026-06-16 23:58:00 IST
Status: Revised after adversarial review

## Objective

Prove production server/API URL capture success with a deterministic fixture, clean the fixture from production, and update release status honestly. Do not claim native Android URL-share success unless a real Android share intent is captured.

## Execution Steps

1. Confirm Android tool availability and record the limitation if unavailable:
   - shell `adb` and `emulator` path checks
   - common SDK paths
   - Spotlight/Homebrew checks
2. Reconfirm local fixture extraction:
   - URL: `https://www.iana.org/help/example-domains?ai_brain_qa=a27-20260616-2355`
   - require `full_text` and body length greater than 100
3. Run production capture without printing bearer secrets:
   - source `.env` in shell memory only
   - use non-verbose `curl`
   - do not persist request headers
   - POST to `https://brain.arunp.in/api/capture/url`
   - set `Origin: https://brain.arunp.in`
   - set `x-brain-capture-source: android` only as metadata, not native proof
4. Write a bounded redacted evidence file with:
   - fixture URL
   - HTTP status
   - response action
   - item id
   - `capture_result.state`
   - `capture_result.quality`
   - no request headers or token values
5. Query production DB for the exact fixture URL:
   - record fixture item ids
   - record count after capture
6. Cleanup production with SQLite foreign keys enabled:
   - `PRAGMA foreign_keys=ON`
   - delete from `items` where `source_url` equals the fixture URL
7. Verify cleanup:
   - item count is zero for the exact fixture URL
   - related-row counts for captured fixture item ids are zero where the tables exist: `chunks`, `embedding_jobs`, `enrichment_jobs`, `capture_artifacts`, `item_tags`, `item_topics`, and `item_collections`
8. Write A27 QA report and PM tracker update.
9. Update milestone tracker, delivery gate tracker, and A7 release readiness packet:
   - close `server_url_capture_success`
   - keep `native_android_url_share_success` open if Android tooling was unavailable
10. Append root `RUNNING_LOG.md` entry and leave it unstaged.
11. Stage only A27 governance/evidence/tracker docs.
12. Run:
   - doc diff check
   - staged diff check
   - staged exclusion scan
13. Commit the intentional tracked docs.

## Acceptance Criteria

| Gate | Acceptance |
| --- | --- |
| Local fixture | Extraction returns `full_text`, body length greater than 100. |
| Production API capture | Response is success with `capture_result.state=created_full_text`. |
| Redacted artifact | Evidence contains selected fields only and no token-shaped request data. |
| Cleanup | Exact fixture item count is zero after cleanup. |
| Related rows | Related-row counts are zero for captured fixture item ids where tables exist. |
| Tracker honesty | Server/API URL success is proven; native Android URL-share success remains open unless Android proof exists. |

## No-Go Gates

- Stop if production capture fails.
- Stop if cleanup count is not zero.
- Stop if any redacted evidence contains `Bearer`, `brain_token`, `BRAIN_API_TOKEN`, or token-shaped 32+ hex values unrelated to commit hashes/APK hashes.
- Do not stage root `RUNNING_LOG.md`, raw evidence, APK outputs, SQLite DBs, `.env`, keystores, `data/artifacts/`, or `assets/`.

## Expected Outcome

A27 should reduce the URL-share blocker from "URL success unproven" to "server URL capture success proven; native Android URL-share success still needs device/emulator proof."
