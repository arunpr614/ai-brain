# Recall Planned Import Count Reporting Execution Report

Created: 2026-06-24 11:30:10 IST
Author: Codex
Status: Offline implementation complete; live Recall API and production apply remain blocked
Related report: `RECALL_ACTION_AWARE_CAPS_EXECUTION_REPORT_2026-06-24_11-20-50_IST.md`
Related report: `RECALL_CHANGED_REMOTE_APPLY_GATE_EXECUTION_REPORT_2026-06-24_11-23-38_IST.md`

## Summary

Added an explicit `cardsPlannedForImport` field to Recall sync run reports.

The field is report-only. It does not change Recall import behavior, database schema, scheduler enablement, production credentials, or deployment state.

No live Recall API call was made. No production import was run. No scheduler/timer was enabled.

## Why This Was Needed

The prior action-aware cap change made `maxImports` count only write-like planned actions:

- `imported`
- `upgraded_existing_weak`

That made the cap safer, but the report did not expose the exact write-like count directly. Operators could infer it from `plannedActionCounts`, but first-apply approval should show the exact number plainly.

`cardsPlannedForImport` makes the first-apply review easier and less error-prone:

- overlap-window skips do not inflate the count;
- changed-remote blocks do not look like imports;
- policy-blocked cards remain visible as blocked, not planned writes;
- weak-source upgrades count as write-like actions when explicitly allowed.

## Behavior Changed

Recall sync run reports now include:

```json
{
  "cardsPlannedForImport": 0
}
```

The value is computed from the dry-run/apply plan before writes:

- counts `plannedAction="imported"`;
- counts `plannedAction="upgraded_existing_weak"`;
- excludes `already_synced`;
- excludes `skipped_existing_strong_source_url`;
- excludes `changed_remote`;
- excludes `blocked_by_fidelity_policy`.

The field appears in:

- dry-run success reports;
- apply success reports;
- fidelity policy block reports;
- changed-remote block reports;
- detail-fetch failure reports after planning;
- detail-cap block reports;
- persisted redacted `recall_sync_runs.report_json`.

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

Lint:

```text
npm run lint
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

The packaged smoke now checks:

- dry-run report exposes `cardsPlannedForImport=0` for a policy-blocked metadata-only fixture;
- backup-guarded apply report exposes `cardsPlannedForImport=1` for one successful synthetic import.

## Regression Coverage Added

The sync runner tests now assert `cardsPlannedForImport` across:

- policy-blocked dry-runs;
- already-synced skips before policy blocks;
- action-aware cap planning;
- weak-source upgrade planning;
- mixed dry-run action plans;
- policy-blocked apply;
- redacted persisted report JSON;
- successful apply;
- changed-remote apply block;
- weak-source upgrade apply.

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

First-apply and live dry-run reports now show the exact planned AI Brain write count directly. This improves operator review without changing import behavior or weakening any existing safety gate.
