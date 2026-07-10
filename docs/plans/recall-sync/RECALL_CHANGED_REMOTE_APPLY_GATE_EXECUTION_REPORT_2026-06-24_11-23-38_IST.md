# Recall Changed-Remote Apply Gate Execution Report

Created: 2026-06-24 11:23:38 IST
Author: Codex
Status: Offline implementation complete; live Recall API and production apply remain blocked
Related PRD: `RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V2_2026-06-24_10-16-19_IST.md`
Related report: `RECALL_DRY_RUN_ACTION_PLANNING_EXECUTION_REPORT_2026-06-24_11-19-17_IST.md`

## Summary

Added an apply-mode gate for changed remote Recall cards. If a previously synced Recall card returns a different content hash, apply now stops before importer mutation and before checkpoint advancement.

No live Recall API call was made. No production import was run. No scheduler/timer was enabled.

## Why This Was Needed

The PRD says changed remote content is not a successful V1 apply outcome. It requires review because overwriting AI Brain content silently would be unsafe, and advancing the checkpoint could hide the changed card from normal follow-up.

Before this change:

- dry-run could show `plannedActionCounts.changed_remote`;
- importer could mark a row as `changed_remote`;
- apply could still proceed through the import loop and advance the checkpoint.

After this change:

- dry-run still reports `changed_remote` for review;
- apply returns `state='blocked'`;
- apply uses exit code `80` with `errorName='remote_changed'`;
- apply does not call the importer for the changed card;
- apply does not mutate the existing `recall_sync_items` row;
- apply does not advance the checkpoint.

## Behavior Changed

New exit code:

```text
remote_changed = 80
```

Apply block report includes:

- `cardsChangedRemote`;
- `cardsBlocked`;
- `plannedActionCounts.changed_remote`;
- `checkpointAdvanced=false`;
- a redacted `lastError` that says review is required.

## Files Updated

- `src/lib/recall/scheduler.ts`
- `src/lib/recall/scheduler.test.ts`
- `src/lib/recall/sync-runner.ts`
- `src/lib/recall/sync-runner.test.ts`

## Validation

Targeted Recall/security/capture tests:

```text
node --import tsx --test src/lib/recall/fidelity.test.ts src/lib/recall/importer.test.ts src/lib/recall/sync-runner.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/client.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/security/redaction.test.ts src/lib/capture/quality.test.ts
```

Result:

```text
46 pass, 0 fail
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

## Regression Case Added

`apply blocks changed-remote cards before sync mutation or checkpoint`

This proves:

- apply returns blocked;
- exit code is `80`;
- error name is `remote_changed`;
- checkpoint is unchanged;
- no new item is created;
- the existing sync item remains in its prior `imported` state;
- the stored content hash is not overwritten by the changed remote hash.

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

Changed remote Recall content now blocks apply safely instead of being treated as a successful run. This keeps checkpoint semantics aligned with the PRD and preserves changed cards for explicit review.
