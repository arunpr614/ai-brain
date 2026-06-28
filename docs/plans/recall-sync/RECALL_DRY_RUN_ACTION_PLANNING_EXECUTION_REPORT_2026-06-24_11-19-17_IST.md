# Recall Dry-Run Action Planning Execution Report

Created: 2026-06-24 11:19:17 IST
Author: Codex
Status: Offline implementation complete; live Recall API and production apply remain blocked
Related report: `RECALL_DRY_RUN_FIDELITY_BREAKDOWN_EXECUTION_REPORT_2026-06-24_11-13-51_IST.md`
Related PRD: `RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V2_2026-06-24_10-16-19_IST.md`

## Summary

Added non-mutating planned-action counts to Recall sync reports. Dry-run output can now show whether each planned card would import, skip, upgrade a weak existing item, skip a strong exact-source match, be marked changed remotely, or be blocked by fidelity policy.

Reports now include:

- `plannedActionCounts`

This closes a dry-run trust gap: before this change, dry-run could show fidelity risk but could not accurately distinguish new imports from existing idempotent skips or optional weak-item upgrade candidates.

No live Recall API call was made. No production import was run. No scheduler/timer was enabled.

## Behavior Added

`runRecallSync()` now plans each fetched Recall card with importer-compatible ordering:

1. If `recall_sync_items` already has the Recall card ID and content hash is unchanged, plan `skipped_existing`.
2. If `recall_sync_items` already has the Recall card ID and content hash changed, plan `changed_remote`.
3. If the card is not already synced and fidelity policy blocks it, plan `blocked_by_fidelity_policy`.
4. If exact source-URL weak upgrade is enabled and an existing weak AI Brain item matches the source URL, plan `upgraded_existing_weak`.
5. If exact source-URL weak upgrade is enabled and an existing strong AI Brain item matches the source URL, plan `skipped_existing_source_url`.
6. Otherwise, plan `imported`.

This also fixes an important overlap/retry nuance: already-synced Recall cards can be planned as skips before fidelity policy blocking. That prevents an overlap-window retry from being falsely blocked only because the fresh Recall detail is still `api_chunks_unverified`.

## Report Field Semantics

Example:

```json
{
  "plannedActionCounts": {
    "skipped_existing": 1,
    "changed_remote": 1,
    "upgraded_existing_weak": 1,
    "skipped_existing_source_url": 1,
    "imported": 1
  }
}
```

The field is count-only. It intentionally does not include raw titles, source URLs, chunks, item IDs, or Recall card IDs.

## Files Updated

- `src/lib/recall/sync-runner.ts`
- `src/lib/recall/sync-runner.test.ts`
- `scripts/smoke-recall-cli-bundle.mjs`

## Validation

Targeted Recall/security/capture tests:

```text
node --import tsx --test src/lib/recall/fidelity.test.ts src/lib/recall/importer.test.ts src/lib/recall/sync-runner.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/client.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/security/redaction.test.ts src/lib/capture/quality.test.ts
```

Result:

```text
43 pass, 0 fail
```

Typecheck:

```text
npm run typecheck
```

Result:

```text
passed
```

Packaged CLI build:

```text
npm run build:recall-cli
```

Result:

```text
passed
```

Packaged CLI smoke:

```text
npm run smoke:recall-cli:bundle
```

Result:

```text
passed
```

Scheduler artifact check:

```text
npm run check:recall-scheduler
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

Offline dry-run reporting is now more production-reviewable: it reports fidelity risk and planned actions without mutating the database or exposing raw private content. The feature remains production-blocked until live Recall API enumeration and content-fidelity gates are approved and completed.
