# Recall Dry-Run Fidelity Breakdown Execution Report

Created: 2026-06-24 11:13:51 IST
Author: Codex
Status: Offline implementation complete; live Recall API and production apply remain blocked
Related report: `RECALL_FIDELITY_POLICY_APPLY_GATE_EXECUTION_REPORT_2026-06-24_11-09-52_IST.md`
Related PRD: `RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V2_2026-06-24_10-16-19_IST.md`

## Summary

Added structured fidelity-policy breakdowns to Recall sync reports so dry-run and blocked apply outputs are reviewable before any production import.

Reports now include:

- `fidelityCounts`
- `policyBlockCounts`
- `policyBlockReasons`

This makes the dry-run report more useful for deciding whether a live Recall batch can proceed, while still keeping raw Recall titles, chunks, and API payloads out of the report object.

No live Recall API call was made. No production import was run. No scheduler/timer was enabled.

## Why This Was Needed

The PRD requires dry-run output to show fidelity states, blocked reasons, and safe counts before writes. The previous report shape had `cardsBlocked`, but that was too coarse to answer:

- how many cards are `api_chunks_unverified`;
- how many are `metadata_only`;
- how many are `possibly_truncated`;
- why each fidelity class is blocked by default.

## Code Changes

Updated:

- `src/lib/recall/sync-runner.ts`
- `src/lib/recall/sync-runner.test.ts`
- `scripts/smoke-recall-cli-bundle.mjs`

Behavior added:

- Dry-run reports include fidelity counts for all planned cards.
- Dry-run reports include policy-block counts and unique policy-block reasons.
- Apply reports include the same fields.
- Detail-fetch partial failure reports include counts for cards already fetched before the failure.
- Cap-blocked reports include fidelity information when details were already fetched.
- Persisted `recall_sync_runs.report_json` stores these structured fields after redaction.
- The packaged CLI smoke now asserts the bundled dry-run JSON includes fidelity and policy-block counts.

## Report Field Semantics

Example shape:

```json
{
  "cardsSeen": 3,
  "cardsBlocked": 3,
  "fidelityCounts": {
    "api_chunks_unverified": 1,
    "metadata_only": 1,
    "possibly_truncated": 1
  },
  "policyBlockCounts": {
    "api_chunks_unverified": 1,
    "metadata_only": 1,
    "possibly_truncated": 1
  },
  "policyBlockReasons": [
    "Recall chunks are unverified; live sample review is required before import.",
    "Recall returned metadata only; block by default.",
    "Recall returned the max chunk count; block by default because content may be truncated."
  ]
}
```

`fidelityCounts` counts what Recall returned.
`policyBlockCounts` counts which classes are blocked by the active policy.
`policyBlockReasons` explains why the active policy blocks those classes.

## Validation

Targeted Recall/security/capture tests:

```text
node --import tsx --test src/lib/recall/fidelity.test.ts src/lib/recall/importer.test.ts src/lib/recall/sync-runner.test.ts src/lib/recall/scheduler.test.ts src/lib/recall/client.test.ts src/db/migrations/020_recall_sync.test.ts src/lib/security/redaction.test.ts src/lib/capture/quality.test.ts
```

Result:

```text
41 pass, 0 fail
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

Offline dry-run reporting is now strong enough to show fidelity-class risk before production writes. The feature remains production-blocked until live Recall API enumeration and content-fidelity gates are approved and completed.
