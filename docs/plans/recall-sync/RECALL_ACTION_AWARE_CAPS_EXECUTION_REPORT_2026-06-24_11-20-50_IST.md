# Recall Action-Aware Caps Execution Report

Created: 2026-06-24 11:20:50 IST
Author: Codex
Status: Offline implementation complete; live Recall API and production apply remain blocked
Related report: `RECALL_DRY_RUN_ACTION_PLANNING_EXECUTION_REPORT_2026-06-24_11-19-17_IST.md`
Related PRD: `RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V2_2026-06-24_10-16-19_IST.md`

## Summary

Made Recall sync `maxImports` caps action-aware. The runner no longer treats every listed or fetched Recall card as an import candidate. It now waits until card details are planned and counts only actions that would create or upgrade AI Brain content.

No live Recall API call was made. No production import was run. No scheduler/timer was enabled.

## Why This Was Needed

The previous cap behavior could falsely block safe dry-runs or apply retries:

- overlap windows often re-see cards that already synced;
- already-synced cards should plan as `skipped_existing`;
- skipped cards should not consume the `maxImports` budget;
- weak-item upgrades should consume the `maxImports` budget because they modify AI Brain content.

This mattered because first production apply is intentionally capped. A cap should protect against too many writes, not block harmless idempotent skips.

## Behavior Changed

List-stage cap:

- still enforces `maxCards`;
- does not enforce `maxImports`, because action planning has not happened yet.

Detail-stage cap:

- enforces `maxImports` using planned write-like actions only:
  - `imported`;
  - `upgraded_existing_weak`.

Actions that do not count against `maxImports`:

- `skipped_existing`;
- `skipped_existing_source_url`;
- `changed_remote`;
- `blocked_by_fidelity_policy`.

`changed_remote` may update sync tracking during apply, but it does not import or upgrade AI Brain content, so it is excluded from the import-write cap.

## Files Updated

- `src/lib/recall/sync-runner.ts`
- `src/lib/recall/sync-runner.test.ts`

## Validation

Targeted Recall/security/capture tests:

```text
node --import tsx --test src/lib/recall/fidelity.test.ts src/lib/recall/importer.test.ts src/lib/recall/sync-runner.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/client.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/security/redaction.test.ts src/lib/capture/quality.test.ts
```

Result:

```text
45 pass, 0 fail
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

## Regression Cases Added

- `maxImports` does not count already-synced skips.
- `maxImports` counts weak-item upgrades.
- `maxImports` still blocks when planned import writes exceed the configured cap.

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

Offline cap enforcement is now aligned with the actual write risk shown by dry-run planning. This makes a future live dry-run safer to review before the first capped apply.
