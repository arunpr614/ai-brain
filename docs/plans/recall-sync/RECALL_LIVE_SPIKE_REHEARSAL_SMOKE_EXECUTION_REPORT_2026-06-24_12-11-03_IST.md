# Recall Live Spike Rehearsal Smoke Execution Report

Created: 2026-06-24 12:11:03 IST
Author: Codex
Status: Offline implementation complete; live Recall API and production apply remain blocked
Related report: `RECALL_LIVE_SPIKE_MARKDOWN_REPORTING_EXECUTION_REPORT_2026-06-24_12-03-21_IST.md`
Related report: `RECALL_SPIKE_013_FIXTURE_REPORTING_EXECUTION_REPORT_2026-06-24_12-07-54_IST.md`

## Summary

Added a repeatable offline smoke command for the live Recall spike probes.

The smoke rehearses both public spike-report paths without `RECALL_API_KEY`:

- SPIKE-013 fixture-backed Markdown report generation.
- SPIKE-014 fixture-backed Markdown report generation.
- Public-output privacy redaction.
- No live Recall API key required.

No live Recall API call was made. No production import was run. No scheduler/timer was enabled.

## Why This Was Needed

SPIKE-013 and SPIKE-014 could each be exercised manually with synthetic fixtures. This change gives future agents and operators a single command that verifies the same safety path before approved live work.

This reduces drift risk before live execution:

- it catches broken report flags;
- it checks expected Markdown verdicts;
- it verifies positive/negative control handling for SPIKE-013;
- it verifies max-chunk fidelity classification for SPIKE-014;
- it fails if synthetic private titles, tokens, source paths, or private video IDs appear in public stdout or Markdown reports.

## Behavior Changed

New script:

- `scripts/smoke-recall-live-spikes.mjs`

New package script:

```text
npm run smoke:recall-live-spikes
```

The smoke creates temporary synthetic fixtures and temporary Markdown reports. It deletes the temporary directory after the run.

## Files Updated

- `scripts/smoke-recall-live-spikes.mjs`
- `package.json`

## Validation

Live-spike rehearsal smoke:

```text
npm run smoke:recall-live-spikes
```

Result:

```json
{
  "ok": true,
  "checked": [
    "SPIKE-013 fixture-backed Markdown report",
    "SPIKE-014 fixture-backed Markdown report",
    "public-output privacy redaction",
    "no live Recall API key required"
  ],
  "reports": {
    "enumeration": {
      "verdict": "CLEAR"
    },
    "fidelity": {
      "verdict": "PROCEED-WITH-CHANGES"
    }
  }
}
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

The live Recall spike report paths now have one repeatable offline rehearsal command. This improves readiness for approved live work, but it does not replace the required live Recall API gates.
