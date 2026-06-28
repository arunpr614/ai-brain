# Recall Fidelity Policy Apply Gate Execution Report

Created: 2026-06-24 11:09:52 IST
Author: Codex
Status: Offline implementation complete; live Recall API and production apply remain blocked
Related plan: `RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V2_2026-06-24_10-21-46_IST.md`
Related PRD: `RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V2_2026-06-24_10-16-19_IST.md`

## Summary

Implemented the missing Recall content-fidelity apply gate. The Recall daily sync runner now blocks apply-mode imports before any item writes or checkpoint advancement when planned cards have fidelity that is not explicitly approved for import.

Dry-run mode remains non-mutating and now reports how many planned cards would be blocked by the fidelity policy. Apply mode requires explicit policy flags for unverified, possibly truncated, or metadata-only Recall content.

No live Recall API call was made. No production import was run. No scheduler/timer was enabled.

## Why This Was Needed

The PRD requires AI Brain to avoid false completeness claims for Recall cards. Before this change:

- `src/lib/recall/fidelity.ts` could classify content quality;
- `src/lib/recall/importer.ts` had started to support fidelity blocking;
- `src/lib/recall/sync-runner.ts` still applied imports without stopping the whole run on fidelity ambiguity;
- `scripts/sync-recall.ts` had no operator flags for explicit fidelity approvals.

That left a gap where production apply could import `api_chunks_unverified`, `possibly_truncated`, or `metadata_only` Recall content too easily.

## Code Changes

Updated:

- `src/lib/recall/importer.ts`
- `src/lib/recall/importer.test.ts`
- `src/lib/recall/sync-runner.ts`
- `src/lib/recall/sync-runner.test.ts`
- `src/lib/recall/scheduler.ts`
- `scripts/sync-recall.ts`
- `scripts/smoke-recall-cli-bundle.mjs`

Behavior added:

- `runRecallSync()` accepts `fidelityPolicy`.
- Apply mode evaluates every fetched card before import.
- Apply mode returns `state='blocked'` and exit code `79` when fidelity policy blocks any planned card.
- Apply mode does not import items or advance the checkpoint on fidelity-policy block.
- Dry-run mode reports `cardsBlocked` for policy-blocked cards without failing the dry run.
- CLI adds:
  - `--allow-unverified-import`
  - `--allow-truncated-import`
  - `--allow-metadata-only-import`
  - `--warning-ui-available`
- Bundled CLI smoke proves default dry-run reports blocked unverified content, while backup-guarded synthetic apply requires `--allow-unverified-import`.

## Policy Defaults

| Fidelity | Default Apply Behavior | Override |
| --- | --- | --- |
| `complete_enough_for_daily_import` | Import allowed | None needed |
| `api_chunks_unverified` | Blocked | `--allow-unverified-import` |
| `possibly_truncated` | Blocked | `--allow-truncated-import` |
| `metadata_only` | Blocked | `--allow-metadata-only-import` |
| `blocked_unknown` | Blocked | No override |

`--warning-ui-available` only affects retrieval eligibility for allowed unverified chunks. It does not by itself permit import.

## Validation

Targeted Recall/security/capture tests:

```text
node --import tsx --test src/lib/recall/fidelity.test.ts src/lib/recall/importer.test.ts src/lib/recall/sync-runner.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/client.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/security/redaction.test.ts src/lib/capture/quality.test.ts
```

Result:

```text
40 pass, 0 fail
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

Offline fidelity-policy enforcement is now implemented and validated. The feature remains production-blocked until live Recall API enumeration and content-fidelity gates are approved and completed.
