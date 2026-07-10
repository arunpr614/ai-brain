# Feature Release A27 URL Capture Success Proof Implementation Plan v1

Created: 2026-06-16 23:56:00 IST
Status: Draft for adversarial review

## Objective

Execute the A27 PRD v2 server/API URL capture success proof, cleanup the fixture, and update release trackers without overstating native Android coverage.

## Steps

1. Reconfirm Android tooling availability:
   - `adb devices`
   - `emulator -list-avds`
   - direct SDK path / Spotlight / Homebrew checks if shell path misses tools
2. Run local extraction preflight for the fixture:
   - `https://www.iana.org/help/example-domains?ai_brain_qa=a27-20260616-2355`
   - require `capture_quality=full_text` and body length greater than 100
3. Run production capture:
   - use `BRAIN_API_TOKEN` from local `.env` or remote env without printing it
   - POST to `https://brain.arunp.in/api/capture/url`
   - body: `{ "url": "<fixture>" }`
   - include `Origin: https://brain.arunp.in` and `x-brain-capture-source: android`
4. Save a redacted proof artifact:
   - HTTP status
   - fixture URL
   - item id
   - response action
   - `capture_result.state`
   - `capture_result.quality`
   - no token
5. Verify production DB count for the exact fixture URL.
6. Cleanup production fixture:
   - run SQLite with `PRAGMA foreign_keys=ON`
   - delete from `items` where `source_url` equals the fixture URL
7. Verify production DB count is zero after cleanup.
8. Write A27 QA doc and PM tracker update.
9. Update milestone tracker, delivery gate tracker, and A7 release readiness packet.
10. Append root `RUNNING_LOG.md` entry and leave it unstaged.
11. Stage only A27 governance/evidence/tracker docs.
12. Run staged diff checks and commit.

## Acceptance Checks

- Production response is successful and redacted proof shows `created_full_text`.
- Post-capture DB count is 1.
- Post-cleanup DB count is 0.
- Trackers do not claim native Android URL-share success unless Android proof exists.
- Staged exclusion scan finds no root running log, raw secrets, APKs, SQLite DBs, raw heavy evidence, `data/artifacts/`, or `assets/`.

## Rollback

If production capture succeeds but cleanup fails, retry cleanup by exact source URL with foreign keys enabled. If cleanup remains unproven, stop and record the item id as a release blocker.
