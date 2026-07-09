# Recall Public Privacy Scan Command Execution Report

Created: 2026-06-24 12:17:56 IST
Author: Codex
Status: Offline implementation complete; live Recall API and production apply remain blocked
Related operating packet: `RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md`
Related runbook: `RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md`

## Summary

Added a reusable public privacy scan for Recall live-spike reports.

New command:

```text
npm run check:recall-public-privacy
```

No live Recall API call was made. No production import was run. No scheduler/timer was enabled.

## Why This Was Needed

The operating packet and runbook required a privacy scan before sharing public Recall reports, but the check was still documented as a manual `rg` command. Manual scans are easy to mistype, and the live SPIKE-013/SPIKE-014 report names are predictable enough to gate with one command.

This change gives future live runs a repeatable public-report safety check before any report is shared, committed, or summarized.

## Behavior Changed

New script:

- `scripts/check-recall-public-privacy.mjs`

New package script:

```text
check:recall-public-privacy
```

Default scope:

- `docs/plans/spikes/SPIKE-013-recall-rest-enumeration-*_IST.md`
- `docs/plans/spikes/SPIKE-014-recall-content-fidelity-*_IST.md`

The script fails on obvious public-report leaks:

- raw `RECALL_API_KEY` assignments;
- bearer tokens;
- `sk_*` secrets;
- cookie headers;
- signed/tokenized URL query values.

It also accepts explicit file or directory arguments so a temp report can be scanned directly.

Follow-up hardening on 2026-06-24 17:51 IST added:

- `--require-files`, for post-report automation that should fail closed when no SPIKE-013/SPIKE-014 Markdown reports are scanned;
- redacted failure previews, so a detected API key, bearer token, cookie, `sk_*` value, or tokenized URL is not echoed back in scanner output;
- `npm run smoke:recall-public-privacy`, now included in pre-live readiness.

## Files Updated

- `scripts/check-recall-public-privacy.mjs`
- `package.json`
- `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md`
- `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md`

## Validation

Default public-report scan:

```text
npm run check:recall-public-privacy
```

Result:

```json
{
  "ok": true,
  "scannedFiles": 0,
  "scope": "docs/plans/spikes/SPIKE-013|014 recall public reports"
}
```

This is expected before live approval because no public SPIKE-013/SPIKE-014 live reports exist yet.

Required-files scan before reports exist:

```text
npm run check:recall-public-privacy -- --require-files
```

Result:

```text
failed as expected; rule: no_report_files_found; scannedFiles: 0
```

Redacted temp report scan:

```text
node scripts/check-recall-public-privacy.mjs <safe-temp-report>
```

Result:

```text
passed
```

Synthetic leak temp report scan:

```text
node scripts/check-recall-public-privacy.mjs <unsafe-temp-report>
```

Result:

```text
failed as expected; detected bearer token, sk_* secret, and tokenized URL query value
```

Live-spike rehearsal smoke:

```text
npm run smoke:recall-live-spikes
```

Result:

```text
passed
```

Typecheck:

```text
npm run typecheck
```

Result:

```text
passed
```

Lint:

```text
npm run lint
```

Result:

```text
passed
```

Focused Recall/security/capture tests:

```text
node --import tsx --test src/lib/recall/fidelity.test.ts src/lib/recall/importer.test.ts src/lib/recall/sync-runner.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/client.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/security/redaction.test.ts src/lib/capture/quality.test.ts
```

Result:

```text
46 pass, 0 fail
```

## Remaining Gates

Still blocked:

- SPIKE-013 live Recall REST enumeration.
- SPIKE-014 live content-fidelity probe.
- User approval for local Recall API-key handling.
- User approval for controlled sample cards and report privacy.
- Production dry-run against live Recall API.
- First capped production apply with backup proof.
- Scheduler/timer enablement.

## Verdict

Recall public live-spike reports now have a repeatable privacy scan command. This strengthens the live evidence workflow without changing any production import behavior.
