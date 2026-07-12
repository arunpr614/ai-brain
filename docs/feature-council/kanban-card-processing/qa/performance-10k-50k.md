# Kanban Card Processing — deterministic 10k/50k performance evidence

**Date:** 2026-07-12
**Verdict:** **Pass** — every approved p95, readiness, deep-audit, payload, and contention gate passed at both scales after the evidence-backed group-query correction below.
**Production impact:** None. Every run used a newly created temporary SQLite database and removed it after measurement. No production database, service, content, or credentials were read or changed.

## Reproduction

```bash
npm run bench:processing
```

The command runs `scripts/bench-processing.ts`, creates independent 10,000- and 50,000-item databases, applies the real migration chain through `025_item_workflow.sql`, seeds deterministic fixtures in 500-row transactions, runs the real Processing repositories, prints machine-readable JSON, and exits nonzero on any budget failure.

- Fixture seed: `processing-scale-v1`
- Final command exit: `0`
- Warm samples: 20 for every named query; 1,000 for the O(1) readiness lookup
- Cold measurement: first execution after SQLite `PRAGMA shrink_memory`
- Warm measurement: p50/p95/max of the following 20 executions
- Page bounds: 50 normally and 100 for the filtered oldest-captured payload
- Group descriptor bound: 10
- Concurrent probe: a separate Node process performed 20 workflow writes while the primary process performed 40 Inbox reads against the same WAL database
- Payload measurement: UTF-8 bytes of the serialized bounded DTO
- Calendar: `America/New_York`, exercising the Temporal owner-local Today/week and capture-age paths

The synthetic population includes four workflow statuses, archived Done, initialized and owner-driven events/receipts, manual User-tag and AI Topic fan-out, auto-tag negative controls, unassigned facets, every source type/channel/quality, 121 capture-age days, and bounded long titles. Summary measurements include exact Inbox health, Today/week Added/Processed/Completed metrics, oldest Inbox, four-state totals/matches, and archive totals.

## Host and database evidence

| Signal | 10k | 50k |
|---|---:|---:|
| Node | v22.22.3 | v22.22.3 |
| SQLite | 3.49.2 | 3.49.2 |
| Platform | darwin/arm64 | darwin/arm64 |
| CPU | Apple M5 Pro, 18 logical CPUs | Apple M5 Pro, 18 logical CPUs |
| Physical memory | 25,769,803,776 B | 25,769,803,776 B |
| Free memory sampled | 219,529,216 B | 567,558,144 B |
| Seed time | 7,414.140 ms | 207,737.257 ms |
| Items | 10,000 | 50,000 |
| Events | 18,030 | 90,030 |
| Receipts | 18,030 | 90,030 |
| Item–manual/auto tag joins | 9,231 | 46,154 |
| Item–AI Topic joins | 7,667 | 38,334 |
| DB before checkpoint | 4,096 B | 4,096 B |
| Peak WAL before checkpoint | 59,398,072 B | 575,984,272 B |
| SHM before checkpoint | 131,072 B | 1,146,880 B |
| DB after checkpoint | 22,986,752 B | 112,828,416 B |
| WAL after truncate | 0 B | 0 B |
| Deep audit | 151.349 ms | 1,246.743 ms |
| Deep-audit budget | 30,000 ms | 30,000 ms |

The 50k seed WAL peaked at approximately 5.10× the checkpointed DB size. This is seed/rehearsal capacity evidence, not a request-path write pattern; the fixture writer deliberately creates 90,030 receipts and events plus taxonomy fan-out.

## Budget results — 10,000 items

| Operation | Cold ms | Warm p50 | Warm p95 | Warm max | Budget ms | Payload B |
|---|---:|---:|---:|---:|---:|---:|
| Hot readiness | 0.078 | 0.004 | 0.006 | 0.018 | 2 | 73 |
| Summary unfiltered, including Today/week | 13.257 | 6.051 | 6.675 | 6.690 | 100 | 589 |
| Summary filtered | 14.615 | 12.779 | 12.967 | 13.740 | 200 | 576 |
| Filter metadata | 11.647 | 10.207 | 10.476 | 10.572 | 200 | 3,401 |
| Inbox first page | 4.254 | 2.113 | 2.248 | 2.372 | 200 | 30,932 |
| Inbox next page | 3.011 | 2.048 | 2.271 | 2.441 | 200 | 30,978 |
| Status Inbox first page | 3.004 | 2.028 | 2.189 | 2.226 | 200 | 30,932 |
| Status To Do first page | 2.842 | 1.969 | 2.192 | 2.530 | 200 | 28,075 |
| Status In Progress first page | 2.454 | 1.641 | 2.046 | 2.167 | 200 | 29,616 |
| Status Done first page | 3.033 | 1.902 | 2.056 | 2.065 | 200 | 27,052 |
| Oldest captured, filtered, 100 rows | 14.429 | 13.855 | 14.140 | 14.293 | 200 | 51,511 |
| Archived first page | 0.611 | 0.208 | 0.266 | 0.284 | 200 | 27,483 |
| Workflow-status groups | 7.818 | 7.049 | 7.209 | 7.292 | 200 | 403 |
| Workflow-status group items | 4.449 | 4.150 | 4.512 | 4.577 | 200 | 30,946 |
| Workflow-status group items next | 4.678 | 3.711 | 3.910 | 3.986 | 200 | 21,030 |
| User-tag groups | 11.797 | 11.188 | 11.561 | 11.750 | 200 | 187 |
| User-tag group items | 10.353 | 9.805 | 10.508 | 11.212 | 200 | 30,937 |
| User-tag group items next | 11.469 | 10.466 | 10.683 | 10.852 | 200 | 21,029 |
| AI Topic groups | 10.936 | 10.667 | 10.904 | 10.924 | 200 | 188 |
| AI Topic group items | 9.080 | 8.615 | 8.975 | 9.289 | 200 | 30,939 |
| AI Topic group items next | 9.540 | 9.347 | 9.526 | 9.975 | 200 | 21,029 |
| Source-type groups | 9.285 | 8.311 | 8.828 | 8.934 | 200 | 182 |
| Source-type group items | 10.934 | 5.009 | 5.292 | 5.557 | 200 | 30,938 |
| Source-type group items next | 6.576 | 5.355 | 5.526 | 5.722 | 200 | 21,030 |
| Capture-channel groups | 7.508 | 6.690 | 6.970 | 7.098 | 200 | 194 |
| Capture-channel group items | 3.510 | 2.646 | 2.943 | 2.992 | 200 | 30,948 |
| Capture-channel group items next | 2.957 | 2.166 | 2.484 | 3.188 | 200 | 21,030 |
| Capture-quality groups | 9.478 | 8.481 | 9.934 | 11.118 | 200 | 200 |
| Capture-quality group items | 9.002 | 6.169 | 7.442 | 8.780 | 200 | 30,952 |
| Capture-quality group items next | 7.726 | 6.718 | 6.974 | 7.265 | 200 | 21,030 |
| Capture-age groups | 8.219 | 7.925 | 8.237 | 8.993 | 200 | 339 |
| Capture-age group items | 1.469 | 1.091 | 1.185 | 1.197 | 200 | 846 |
| No-group descriptors | 7.709 | 7.465 | 7.572 | 7.581 | 200 | 183 |
| No-group items | 10.671 | 10.115 | 10.397 | 10.473 | 200 | 30,928 |
| No-group items next | 11.512 | 11.300 | 11.621 | 11.631 | 200 | 21,030 |
| Mutation transaction | — | 0.821 | 2.068 | 2.068 | 250 | 0 |

## Budget results — 50,000 items

| Operation | Cold ms | Warm p50 | Warm p95 | Warm max | Budget ms | Payload B |
|---|---:|---:|---:|---:|---:|---:|
| Hot readiness | 0.157 | 0.004 | 0.006 | 0.393 | 2 | 73 |
| Summary unfiltered, including Today/week | 56.252 | 49.126 | 49.688 | 49.699 | 100 | 605 |
| Summary filtered | 91.463 | 91.537 | 92.112 | 92.408 | 200 | 588 |
| Filter metadata | 77.007 | 75.361 | 80.750 | 85.627 | 200 | 3,446 |
| Inbox first page | 27.638 | 10.462 | 10.750 | 10.910 | 200 | 30,839 |
| Inbox next page | 14.686 | 10.325 | 10.567 | 10.615 | 200 | 31,204 |
| Status Inbox first page | 14.835 | 10.368 | 10.710 | 10.891 | 200 | 30,839 |
| Status To Do first page | 14.172 | 9.708 | 10.082 | 10.338 | 200 | 28,110 |
| Status In Progress first page | 12.478 | 7.997 | 8.227 | 8.409 | 200 | 29,852 |
| Status Done first page | 14.707 | 9.727 | 10.136 | 10.248 | 200 | 27,190 |
| Oldest captured, filtered, 100 rows | 53.318 | 50.935 | 51.448 | 51.516 | 200 | 61,449 |
| Archived first page | 0.679 | 0.315 | 0.398 | 0.645 | 200 | 29,512 |
| Workflow-status groups | 43.511 | 41.784 | 42.283 | 42.306 | 200 | 408 |
| Workflow-status group items | 24.633 | 22.664 | 22.973 | 23.011 | 200 | 30,985 |
| Workflow-status group items next | 54.543 | 28.769 | 29.596 | 30.325 | 200 | 30,993 |
| User-tag groups | 66.949 | 65.512 | 66.214 | 66.387 | 200 | 189 |
| User-tag group items | 48.882 | 47.364 | 82.656 | 84.093 | 200 | 30,976 |
| User-tag group items next | 51.194 | 47.113 | 48.045 | 48.881 | 200 | 30,984 |
| AI Topic groups | 64.927 | 63.080 | 65.949 | 66.197 | 200 | 190 |
| AI Topic group items | 46.792 | 42.364 | 42.671 | 42.782 | 200 | 30,978 |
| AI Topic group items next | 61.155 | 42.419 | 42.820 | 43.049 | 200 | 30,986 |
| Source-type groups | 85.321 | 54.855 | 55.915 | 56.839 | 200 | 183 |
| Source-type group items | 35.667 | 34.523 | 35.253 | 36.233 | 200 | 30,976 |
| Source-type group items next | 36.594 | 34.491 | 35.744 | 36.077 | 200 | 30,984 |
| Capture-channel groups | 73.105 | 40.940 | 50.550 | 57.596 | 200 | 195 |
| Capture-channel group items | 17.990 | 17.013 | 17.774 | 17.797 | 200 | 30,986 |
| Capture-channel group items next | 17.349 | 16.516 | 16.787 | 16.821 | 200 | 30,994 |
| Capture-quality groups | 57.278 | 55.995 | 56.540 | 56.758 | 200 | 202 |
| Capture-quality group items | 40.955 | 39.852 | 40.282 | 40.320 | 200 | 30,991 |
| Capture-quality group items next | 40.721 | 39.470 | 45.734 | 58.581 | 200 | 30,999 |
| Capture-age groups | 55.423 | 47.224 | 47.658 | 48.527 | 200 | 435 |
| Capture-age group items | 6.489 | 5.130 | 5.236 | 5.341 | 200 | 3,154 |
| No-group descriptors | 45.922 | 44.519 | 44.738 | 44.817 | 200 | 185 |
| No-group items | 50.184 | 46.668 | 50.103 | 62.231 | 200 | 30,967 |
| No-group items next | 52.035 | 46.581 | 47.127 | 47.239 | 200 | 30,975 |
| Mutation transaction | — | 2.606 | 20.911 | 20.911 | 250 | 0 |

## Contention result

| Scale | Baseline Inbox p95 | Concurrent read p95 | Degradation | Concurrent read max | Writer p95 | Writer max | DB busy |
|---|---:|---:|---:|---:|---:|---:|---:|
| 10k | 2.248 ms | 2.519 ms | 12.1% | 2.724 ms | 2.609 ms | 80.667 ms | 0 |
| 50k | 10.750 ms | 11.994 ms | 11.6% | 19.263 ms | 5.603 ms | 385.765 ms | 0 |

The writer maximum includes process startup/cache acquisition; the contract is p95 ≤250 ms, which passed. Both read degradation values are below the approved 20% contention bound, and neither process observed a database-busy result.

## Evidence-backed correction and before/after result

The first 50k run used 12 warm samples and failed two descriptor p95s:

| Operation | Before p50 | Before p95 | Budget | After p50 | After p95 | Disposition |
|---|---:|---:|---:|---:|---:|---|
| Capture-channel descriptors | 70.010 ms | 230.733 ms | 200 ms | 40.940 ms | 50.550 ms | Pass |
| Capture-age descriptors | 117.319 ms | 274.741 ms | 200 ms | 47.224 ms | 47.658 ms | Pass |

The correction was intentionally narrow:

1. replace one unfiltered full-table count per visible group with one grouped total-count pass;
2. add partial active `capture_source,id` and `captured_at,id` indexes, justified by the failed group modes;
3. use the required 20 warm samples while retaining the same 200 ms budget.

No other production query or budget was relaxed.

## Query-plan evidence after correction

Representative `EXPLAIN QUERY PLAN` details:

| Query | Plan evidence |
|---|---|
| Inbox | `SEARCH items USING INDEX items_processing_active_status (workflow_status=?)`; bounded temporary order by |
| Status page | `SEARCH items USING INDEX items_processing_active_status (workflow_status=?)` |
| Archived page | `SEARCH items USING INDEX items_processing_archived (workflow_archived_at>?)` |
| Exact status counts | `SCAN items USING INDEX items_processing_active_status` |
| Capture-channel descriptors | `SCAN items USING INDEX items_processing_active_capture_channel` |
| Capture-age descriptors | `SCAN items USING INDEX items_processing_active_captured_at`; four-bin group temporary B-tree |
| Manual User-tag filter | bounded active item scan with correlated probe using `sqlite_autoindex_item_tags_1 (item_id,tag_id)` and tag PK |
| AI Topic filter | bounded active item scan with correlated probe using `sqlite_autoindex_item_topics_1 (item_id,topic_id)` |

The remaining Inbox temporary order does not threaten its budget: 50k cold was 27.638 ms and warm p95 was 10.750 ms against 200 ms. The capture-age temporary four-bin group likewise passed at 47.658 ms p95.

## Final gate matrix

| Gate | 10k | 50k |
|---|---|---|
| Hot readiness p95 ≤2 ms | Pass, 0.006 | Pass, 0.006 |
| Unfiltered summary p95 ≤100 ms | Pass, 6.675 | Pass, 49.688 |
| Filtered summary/group p95 ≤200 ms | Pass, max 12.967 | Pass, max 92.112 |
| First/next item or group page p95 ≤200 ms | Pass, max 14.140 | Pass, max 82.656 |
| Mutation p95 ≤250 ms | Pass, 2.068 | Pass, 20.911 |
| Deep audit ≤30 s | Pass, 0.151 s | Pass, 1.247 s |
| Concurrent read degradation <20% | Pass, 12.1% | Pass, 11.6% |
| DB-busy outcomes | Pass, zero | Pass, zero |
| Bounded page/group payloads | Pass | Pass; largest measured 61,449 B |
| Integrity/readiness audit | Pass | Pass |

This evidence closes the synthetic 10k/50k Processing performance gate on the measured host class. Production-copy rehearsal, deployment, live accessibility, and live rollback evidence remain separate release gates.
