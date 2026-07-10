# Tracker Parity Check

Created: 2026-06-14 08:14 IST
Updated: 2026-06-14 08:22 IST after remediation tracker additions

Markdown tracker files are authoritative. CSV files are convenience exports for PM tooling and must be regenerated or manually updated when Markdown rows change.

## Row Counts

| Tracker | Markdown data rows | CSV data rows | Parity |
| --- | ---: | ---: | --- |
| `baseline_status_reconciliation` | 14 | 14 | Pass |
| `design_traceability_matrix` | 52 | 52 | Pass |
| `implementation_plan_tracker` | 9 | 9 | Pass |
| `master_feature_inventory` | 17 | 17 | Pass |
| `milestone_tracker` | 11 | 11 | Pass |
| `open_questions_decisions` | 14 | 14 | Pass |
| `prd_tracker` | 9 | 9 | Pass |
| `risks_blockers_decisions_tracker` | 12 | 12 | Pass |
| `testing_qa_readiness_tracker` | 13 | 13 | Pass |

## Standalone Evidence Files

| File | Row/count note | Reason no CSV pair exists |
| --- | --- | --- |
| `source_snapshot_2026-06-14.md` | 29 table rows across snapshot and source citations | Evidence narrative, not PM tracker |
| `TRACKER_PARITY_CHECK.md` | This report | Meta-validation artifact |

## Known Limitations

- This check verifies row-count parity, not semantic equality of every cell.
- After the remediation edits, any tracker whose statuses changed must keep Markdown and CSV language aligned.
- New remediation trackers added after this check must be included in the next parity pass.
