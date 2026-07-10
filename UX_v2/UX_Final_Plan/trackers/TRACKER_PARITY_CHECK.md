# Tracker Parity Check

Created: 2026-06-14 10:18 IST
Status: Final package tracker parity report

Markdown tracker files are authoritative. CSV files are convenience exports for PM tooling and must be regenerated or manually updated when Markdown rows change.

## Row Counts

Markdown row counts below exclude header and separator rows. CSV row counts exclude the header row.

| Tracker | Markdown data rows | CSV data rows | Parity |
| --- | ---: | ---: | --- |
| `design_traceability_matrix` | 100 | 100 | Pass |
| `implementation_plan_tracker` | 9 | 9 | Pass |
| `master_feature_inventory` | 17 | 17 | Pass |
| `milestone_tracker` | 11 | 11 | Pass |
| `open_questions_decisions` | 14 | 14 | Pass |
| `prd_tracker` | 9 | 9 | Pass |
| `risks_blockers_decisions_tracker` | 12 | 12 | Pass |
| `testing_qa_readiness_tracker` | 14 | 14 | Pass |

## Standalone Evidence Files

| File | Reason no CSV pair exists |
| --- | --- |
| `../04_STALE_DOC_RECONCILIATION.md` | Reconciliation narrative plus table; not a PM tracker |
| `../05_REPRODUCIBILITY_SNAPSHOT.md` | Evidence narrative; not a PM tracker |
| `../prd_completeness/PRD_COMPLETENESS_AUDIT.md` | Audit narrative; paired CSV lives beside it |
| `TRACKER_PARITY_CHECK.md` | Meta-validation artifact |

## Known Limitations

- This check verifies row-count parity, not semantic equality of every cell.
- Markdown is authoritative when Markdown and CSV conflict.
- If PM tooling consumes CSVs, regenerate or diff them after any Markdown status change.
