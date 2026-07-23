# YouTube Item Recovery and Manual Enrichment Implementation Tracker

**Branch:** `feat/youtube-item-recovery-enrichment`  
**Frozen implementation base:** `f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8`  
**Started:** 2026-07-23 (Asia/Kolkata)  
**Coordinator:** primary implementation agent  
**Scope boundary:** production-safe foundations and true link-only behavior may be released; browser-visible transcript capture and held-transcript processing remain denied in production.

## Milestone status

| Milestone                          | Owner                  | Dependencies             | Completion evidence                                                                          | Status                                                                                                               |
| ---------------------------------- | ---------------------- | ------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| M0 clean worktree and baseline     | Coordinator            | None                     | Phase4 worktree, branch, clean fast-forward to `f905f6a`                                     | Complete                                                                                                             |
| M1 PR reconciliation               | Technical architecture | M0                       | PRs #41, #42, #48, and #50 merged; protected `main` SHA recorded                             | Complete                                                                                                             |
| M2 source/hash reconciliation      | Product + architecture | M1                       | inventory, reconciliation, 140-path hash manifest, duplicate report                          | Complete                                                                                                             |
| M3 migration collision decision    | Data architecture      | M1                       | migration inventory, selected identifiers, compatibility matrix, independent review          | Numbering complete; 027 implementation blocked                                                                       |
| M4 Stage 0 adversarial review      | Independent reviewer   | M2, M3, frozen contracts | Initial NO-GO remediated; focused recheck found no P0/P1 and approved only D-014 Stage 1     | Complete — conditional GO                                                                                            |
| M5 backward-compatible containment | Backend/platform       | M4                       | production-denial, old-schema, worker-exclusion, kill-switch, reservation, and privacy tests | Complete — formal Stage 1 focused recheck GO; non-enabling containment only                                           |
| M6 additive data foundation        | Backend/data           | M5                       | clean/upgrade/mixed-binary migration tests; transactional/fencing tests                      | Pending                                                                                                              |
| M7 Chrome companion foundation     | Extension              | M6                       | manifest, pure extractor, fixture and packaged MV3 evidence                                  | Pending                                                                                                              |
| M8 exact-item recovery             | Backend + extension    | M7                       | intent, two-channel commit, receipt, hold, status, link-only evidence                        | Pending                                                                                                              |
| M9 held manual enrichment          | Processing + backend   | M8                       | plan, consent, authorization, stage jobs, retry/drift/deletion evidence                      | Pending                                                                                                              |
| M10 UX/accessibility parity        | UX + QA                | M8, M9                   | desktop/mobile/keyboard/focus/zoom/reduced-motion report                                     | Pending                                                                                                              |
| M11 full security/QA gates         | Security + release QA  | M5-M10                   | full checks, scans, negative matrix, adversarial reports                                     | Pending                                                                                                              |
| M12 permitted release delivery     | Coordinator/operator   | M11                      | focused commits, PR, CI, merge/deployment evidence where authorized                          | Pending                                                                                                              |
| M13 documentation and handoff      | Project management     | M12                      | Wiki, running log, release/rollback/final reports                                            | Pending                                                                                                              |

### Current Stage 1 branch evidence

- D-018 reserves a fresh batch alias and exact item/job state before provider dispatch. Ambiguous provider outcomes remain quarantined, nonpollable, and nonresubmittable.
- Manual `/enrich`, item upgrade, and repair transactions fail closed rather than clear an unresolved reservation; resolved and legacy batch bindings retain their existing behavior.
- URL duplicate capture and Telegram acknowledgement copy claim transcript recovery was queued only after an applied enqueue outcome. Blocked, incompatible, unchanged, or null outcomes are truthful and no-effect.
- Existing blocked/failure responses are fixed, content-free, and private/no-store where they cross HTTP; D-017 status/UI projections do not expose provider batch identifiers or raw persisted errors.
- Consolidated validation passes 1,251 repository tests across 104 suites, lint, typecheck, the 36-case Stage 1 scope suite, the final live check over 121 exact paths, and the 384-check immutable release-artifact smoke. The stable reviewed tree's final production build and source/standalone capability equality check are green.
- The initial formal Stage 1 gate returned NO-GO on one rollback P1. D-019 now derives reservation awareness from an exact app-owned source/standalone declaration, attests it in both manifests, and checks live state during activation, the stopped-writer recheck, and automatic restoration. A current-tools/historical-app artifact attests unaware and is rejected against a live marker. The separate formal focused final recheck returned GO with zero P0/P1/P3 findings.
- Marker/state drift hardening is complete across manual realtime/queue, batch, and scheduled paths, including a marker inserted during realtime provider execution. Its independent component recheck passed 68 focused tests with no P0-P3 finding. The transcript apply/finalize crash window remains assigned to Stage 2 as R-032.
- M5 is complete as a non-enabling containment milestone. Migration 027, feature work, extension work, live canary, production enablement, and production deployment remain blocked; R-032 remains mandatory for Stage 2.

## Ordered implementation slices and file ownership

Concurrent agents must not edit the same files. Ownership is reassigned only at an explicit wave boundary.

| Slice                           | Primary ownership                                                                                 | Expected output                                                                            | Evidence requirement                                      | Completion condition                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------- |
| Stage 0 sources                 | `docs/feature-council/youtube-item-recovery-implementation/SOURCE_*` and `source-reconciliation/` | immutable inventory, hashes, conflict dispositions                                         | reproducible file counts and SHA-256 values               | zero missing sources; duplicate groups identified                |
| Stage 0 dependencies/migrations | `DEPENDENCY_GRAPH.md`, `MIGRATION_COLLISION_RESOLUTION.md`, `IMPLEMENTATION_BASELINE.md`          | live PR/base/migration facts                                                               | Git/GitHub and migration commands with exact SHAs         | collision-free sequence independently reviewed                   |
| Containment                     | policy/config/startup and existing claimant paths                                                 | denial-wins mode, old-schema-safe capability detection, worker exclusions                  | focused unit/integration and startup matrix               | ordinary production behavior unchanged and held work unclaimable |
| Data foundation                 | migrations and new DB modules                                                                     | revisions, sources, segments, holds, intents, receipts, runs, attempts, retention/deletion | clean/upgrade/rollback and failure-injection tests        | additive schema and atomic invariants pass                       |
| Chrome companion                | `extension/` manifest, build, side panel, extractor                                               | exact-origin intent state, inspect/review/confirm, bounded isolated extraction             | pure fixtures, storage/network assertions, packaged smoke | existing companion extended; no persistent YouTube access        |
| Exact-item API/UX               | item and capture routes/components                                                                | item-bound intent, honest projection, true link-only                                       | auth/origin/version/race/idempotency/UI tests             | exact item only; held receipt durable                            |
| Manual processing               | plan/authorization/status services and stage workers                                              | revision-bound digest/index, partial success, retry, provider drift                        | provider spies, barrier tests, durable output checks      | production denial and all stale/deletion fences pass             |
| Release QA/docs                 | reports, Wiki source, release tooling                                                             | traceability, negative verification, release/rollback/final report                         | command logs and commit/CI/deployment links               | delivered status is truthful and reproducible                    |

## Frozen release authority

| Capability                                | Research/synthetic | Packaged local            | Isolated live lab                          | Production deploy                                         | Production enable            |
| ----------------------------------------- | ------------------ | ------------------------- | ------------------------------------------ | --------------------------------------------------------- | ---------------------------- |
| Production-safe containment               | Yes                | Yes                       | Yes                                        | Conditional on QA                                         | Yes, denial stays active     |
| True link-only metadata save              | Yes                | Yes                       | Not required                               | Conditional after frozen/reviewed 027 recovery exclusions | May be authorized separately |
| Browser-visible transcript recovery       | Yes                | Yes, fixtures only        | Blocked pending external packet            | Foundations only                                          | **Denied**                   |
| Held browser-transcript manual enrichment | Yes                | Yes, synthetic/local only | Blocked pending separate processing packet | Foundations only                                          | **Denied**                   |

## External gates

The following are not inferred from code or repository access and remain blocking for a live canary:

- written target-specific YouTube/platform-policy determination;
- approved standard watch targets and sample size;
- separate lab deployment identity, extension identity, credentials, database, and data root;
- private capture and processing manifests outside Git with correct ownership/mode;
- retention/deletion owner and cleanup deadline;
- provider handling terms and an explicit processing decision;
- approved monitoring, kill switch, rollback, and cleanup procedure.

Safe synthetic, packaged-local, documentation, PR, and production-negative work continues while these gates remain closed.

## Change-control rules

1. Before 027, only D-014's non-enabling schema-026 containment slice (including D-018's fail-closed enrichment-batch reservation) and D-017's exact non-additive privacy redaction may start after focused review. Feature/schema/extension behavior remains blocked.
2. Every P0 requirement remains `Planned`, `Implemented`, `Verified`, `Blocked`, or `Not applicable`; only test evidence permits `Verified`.
3. Every P0/P1 adversarial finding blocks the dependent milestone until resolved and rechecked.
4. Lower-severity unresolved findings are carried into `RISK_REGISTER.md` with owner and release effect.
5. No live YouTube request is made by CI or fixture tests.
6. No production configuration can enable browser capture or processing.
7. Running-log entries are append-only and are added after every milestone, dependency/migration decision, major test run, review, release event, and handoff.
