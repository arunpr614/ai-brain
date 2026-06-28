# Recall Live Spike Runbook Command Alignment Execution Report

Created: 2026-06-24 12:13:38 IST
Author: Codex
Status: Offline documentation alignment complete; live Recall API and production apply remain blocked
Related operating packet: `RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md`
Related runbook: `RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md`

## Summary

Updated the Recall live API operating packet and production runbook so their live-spike commands match the current tested scripts.

No live Recall API call was made. No production import was run. No scheduler/timer was enabled.

## Why This Was Needed

The live spike scripts had evolved after the original operating packet/runbook were written:

- SPIKE-013 now supports `--fixture`, `--write-report`, `--report-path`, and host-only source URL redaction by default.
- SPIKE-014 now supports `--write-report`, `--report-path`, fixture-backed report generation, and a short no-key guard.
- `npm run smoke:recall-live-spikes` now rehearses both report paths offline.

The docs still contained older placeholder command shapes such as `--redact` and `--cards-file`. Those placeholders could confuse the approved live run.

## Behavior Changed

Operating packet updates:

- Added `npm run smoke:recall-live-spikes` as the required pre-live rehearsal.
- Updated SPIKE-013 no-key expected output.
- Added SPIKE-013 offline fixture rehearsal command.
- Updated SPIKE-013 live command to use `--expect-id`, `--negative-id`, `--write-report`, and `--report-path`.
- Added SPIKE-014 no-key guard.
- Added SPIKE-014 offline fixture rehearsal command.
- Updated SPIKE-014 live command to use repeated `--card-id`, `--max-chunks 50`, `--write-report`, and `--report-path`.
- Tightened public secret scan to tracked/public report paths while keeping private evidence isolated under `data/private/recall-live-spikes/`.

Production runbook updates:

- Added `npm run smoke:recall-live-spikes` before live access.
- Updated live SPIKE-013 command with controlled IDs, negative control, and Markdown report output.
- Updated live SPIKE-014 command with `--max-chunks 50` and Markdown report output.

## Files Updated

- `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md`
- `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md`

## Validation

Stale live-spike flag scan:

```text
rg -n -- "--max-cards|--redact|--cards-file|RECALL_API_KEY is required" \
  docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md \
  docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md
```

Result:

```text
No stale SPIKE-013/SPIKE-014 command flags remain.

The only remaining --max-cards hits are in the production dry-run/apply sync CLI sections, where --max-cards is a valid sync-recall-prod.mjs option.
```

Positive command scan:

```text
rg -n "smoke:recall-live-spikes|--write-report|--report-path|--fixture|allow-titles" \
  docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md \
  docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md
```

Result:

```text
passed; updated rehearsal and report-writing commands are present
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

The live-spike handoff docs now match the tested script behavior. The next approved live run has a cleaner, safer command path, but the required live gates remain pending.
