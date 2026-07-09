# Recall Live Spike Markdown Reporting Execution Report

Created: 2026-06-24 12:03:21 IST
Author: Codex
Status: Offline implementation complete; live Recall API and production apply remain blocked
Related spike requirements: `RECALL_DAILY_SYNC_SPIKE_REQUIREMENTS_V2_2026-06-24_09-13-12_IST.md`
Related operating packet: `RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md`

## Summary

Added opt-in Markdown report generation to the live Recall spike probes.

The scripts still print redacted JSON to stdout. When run with `--write-report` or `--report-path`, they now also write the required dated Markdown spike report format for:

- SPIKE-013 Recall REST enumeration.
- SPIKE-014 Recall content fidelity.

No live Recall API call was made. No production import was run. No scheduler/timer was enabled.

## Why This Was Needed

The live spike scripts were ready to query Recall, but the spike requirements require dated Markdown reports under `docs/plans/spikes/`. Without report generation in the scripts, a live run would depend on manual copy/paste from JSON output into Markdown, which is fragile and increases privacy risk.

This change makes the live gate more repeatable:

- the public report is generated from the already-redacted probe object;
- titles remain redacted by default;
- source URLs are host-only by default;
- reports include a verdict and implementation recommendation;
- operators can still write to an explicit private or public path with `--report-path`.

## Behavior Changed

New shared helper:

- `scripts/spikes/recall-spike-report.ts`

SPIKE-013 script now supports:

```text
--write-report
--report-path <path>
--allow-source-urls
```

SPIKE-014 script now supports:

```text
--write-report
--report-path <path>
```

SPIKE-014 also now handles a missing `RECALL_API_KEY` for live card-id mode with a short no-key message and exit code `2`, instead of printing a stack trace for that expected operator error.

## Files Updated

- `scripts/spikes/recall-spike-report.ts`
- `scripts/spikes/recall-rest-enumeration.ts`
- `scripts/spikes/recall-content-fidelity.ts`

## Validation

SPIKE-013 help output:

```text
node --import tsx scripts/spikes/recall-rest-enumeration.ts --help
```

Result:

```text
passed; help includes --write-report, --report-path, and --allow-source-urls
```

SPIKE-014 help output:

```text
node --import tsx scripts/spikes/recall-content-fidelity.ts --help
```

Result:

```text
passed; help includes --write-report and --report-path
```

SPIKE-013 no-key guard:

```text
env -u RECALL_API_KEY node --import tsx scripts/spikes/recall-rest-enumeration.ts
```

Result:

```text
exit code 2; no Recall API call attempted
```

SPIKE-014 no-key guard:

```text
env -u RECALL_API_KEY node --import tsx scripts/spikes/recall-content-fidelity.ts --card-id fake-card-id
```

Result:

```text
exit code 2; no Recall API call attempted; no stack trace printed
```

SPIKE-014 offline report writer:

```text
node --import tsx scripts/spikes/recall-content-fidelity.ts --fixture <synthetic-fixture> --write-report --report-path <temp-report>
```

Result:

```text
passed; generated Markdown report with PROCEED-WITH-CHANGES verdict
```

Privacy check on generated stdout and Markdown report:

```text
rg "Synthetic private fixture title|secret123|private/path" <stdout> <report>
```

Result:

```text
passed; no private title, token, or source path found in public outputs
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

The live Recall spike probes are now better prepared for approved live execution. They can generate privacy-safe Markdown reports directly, reducing manual handling of live Recall evidence while preserving the production no-go gates.
