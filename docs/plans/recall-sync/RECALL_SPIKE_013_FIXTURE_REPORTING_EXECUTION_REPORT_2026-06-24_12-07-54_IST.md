# Recall SPIKE-013 Fixture Reporting Execution Report

Created: 2026-06-24 12:07:54 IST
Author: Codex
Status: Offline implementation complete; live Recall API and production apply remain blocked
Related spike: SPIKE-013 Recall REST enumeration
Related report: `RECALL_LIVE_SPIKE_MARKDOWN_REPORTING_EXECUTION_REPORT_2026-06-24_12-03-21_IST.md`

## Summary

Added offline fixture support to the SPIKE-013 Recall REST enumeration probe.

The probe can now validate report generation, date-window summaries, repeated filtered stability, positive/negative controls, and privacy defaults without a Recall API key.

No live Recall API call was made. No production import was run. No scheduler/timer was enabled.

## Why This Was Needed

SPIKE-014 already had an offline fixture path, so its Markdown report writer could be tested safely. SPIKE-013 could show help and no-key behavior, but the full Markdown report path still required a live Recall API call.

That left a small but meaningful gap before live approval:

- report rendering could not be smoke-tested offline;
- control matching could not be checked without live data;
- source URL redaction could not be validated through the SPIKE-013 public report path;
- a future live run would carry more manual risk.

## Behavior Changed

SPIKE-013 now supports:

```text
--fixture <path>
```

Fixture mode:

- does not require `RECALL_API_KEY`;
- does not call Recall;
- accepts a direct Recall-like list response or an object with `unfiltered`, `filteredFirst`, and `filteredSecond`;
- falls back to the same list for repeated filtered checks when a direct list response is provided;
- still supports `--write-report` and `--report-path`;
- still redacts titles by default;
- still prints source hosts only unless `--allow-source-urls` is explicitly supplied.

## Files Updated

- `scripts/spikes/recall-rest-enumeration.ts`

## Validation

SPIKE-013 fixture report smoke:

```text
env -u RECALL_API_KEY node --import tsx scripts/spikes/recall-rest-enumeration.ts \
  --fixture <synthetic-list-fixture> \
  --date-from 2026-06-24T00:00:00Z \
  --date-to 2026-06-24T23:59:59Z \
  --expect-id card_positive_control_1234567890 \
  --negative-id card_absent_control_1234567890 \
  --expect-title "Private Controlled Recall Title" \
  --write-report \
  --report-path <temp-report>
```

Result:

```text
passed; generated Markdown report with CLEAR verdict
```

Report assertions:

```text
markdownReportPath present
repeatedFilteredStable=true
positive id control present
negative id control absent
positive title control present
```

Privacy check:

```text
rg "Private Controlled Recall Title|Another Private Title|secret123|secret456|private/path|private-id" <stdout> <report>
```

Result:

```text
passed; no private title, token, source path, or private video id found in public outputs
```

SPIKE-013 no-key guard:

```text
env -u RECALL_API_KEY node --import tsx scripts/spikes/recall-rest-enumeration.ts
```

Result:

```text
exit code 2; no Recall API call attempted
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

SPIKE-013 can now be smoke-tested offline end to end for report generation and privacy behavior. This reduces risk for the approved live run, but it does not replace the required live Recall API enumeration gate.
