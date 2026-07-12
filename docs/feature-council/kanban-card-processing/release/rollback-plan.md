# Kanban Card Processing — rollback plan

**Status:** Transactional rollback tooling and isolated schema-025 compatibility rehearsal complete; installed production rollback pending
**Date:** 2026-07-12
**Release companion:** [release plan](release-plan.md)
**Principle:** contain with flags first, preserve evidence and current data, prefer verified code rollback or forward repair, and treat database restore as destructive last resort.

## 1. Safety model

Migration 025 is additive and leaves its initialization guard, constraints, epochs, and receipts active even when Processing is hidden. There is no schema down-migration or history rewrite. The old known-good runtime must be proven against schema 025 before release (`../technical/technical-plan-v2.md:561-574`).

Rollback has four escalating levels:

| Level | Action | Data impact | Use when |
|---|---|---|---|
| R0 | Set nav/write/read flags to 0 | No intended data loss; capture guard remains active | Any release no-go or while triaging |
| R1 | Forward repair with flags off | Repairs supported invariant/config/code issue without reverting data | Root cause is understood and repair plan/audit can prove safety |
| R2 | Restore checksum-verified known-good code artifact, preserve current data/schema | No intended DB rollback; new Processing UI stays off | New runtime causes failure or cannot be repaired promptly |
| R3 | Restore a verified database snapshot | **Destructive:** loses post-snapshot DB changes/captures/workflow history | DB is unusable/corrupt and R0–R2 plus supported forward repair cannot restore safety |

Do not jump to R3 because feature reads or writes are unhealthy. Do not call a database restore a routine rollback.

## 2. Triggers and decision owner

The incident owner may initiate R0 without waiting for a larger approval when any automatic no-go appears. R1–R3 require the release owner and data owner to record the choice, except that service containment may proceed immediately for active corruption or privacy exposure.

### Immediate flags-off triggers

- readiness red or checkpoint older than 24 hours;
- any missing new-item initialization;
- quick-check, foreign-key, deep-audit, migration-manifest, projection/event/receipt/Undo/job invariant failure;
- private endpoint exposed to bearer-only/no session, cacheability/privacy leakage, or cross-origin write acceptance;
- duplicate receipts/events or a falsely confirmed/unknown mutation;
- three or more DB-busy or unknown-outcome server results in 15 minutes;
- mutation server-failure rate above 5% with at least 20 samples;
- two consecutive performance windows above budget with at least 20 samples each;
- enrollment job no progress for 15 minutes;
- live smoke cleanup failure; or
- service instability, native dependency/ABI failure, or unsafe disk/WAL growth.

Conflict rate above 25% with at least 20 samples is a warning. It blocks rollout advancement and starts triage but does not by itself require code or DB rollback (`../technical/technical-plan-v2.md:532-546`, `../technical/technical-plan-v2.md:643-655`).

## 3. Preparedness gate before release

Rollback is not ready until all items below pass on the exact candidate/known-good artifacts:

- all three flags default off and can be atomically changed/read back without exposing secrets;
- machine-readable gate output shows flag values, schema version, readiness color/code, checkpoint age, app SHA, and migration-manifest hash;
- a new WAL-safe predeploy backup has checksum, restrictive permissions, `quick_check=ok`, no foreign-key rows, isolated-restore proof, and retention protection;
- the current runtime is packaged as an immutable known-good archive with manifest and sibling SHA-256;
- candidate and known-good manifests record Node major/ABI, package-lock checksum, exact `better-sqlite3`/`sqlite-vec` versions, migration compatibility, and file-list hash;
- both artifacts extract/start in staging with native dependency repair;
- old known-good code against schema 025 can create a new item and the raw guard initializes it exactly once;
- rollback replacement preserves the data directory and release store;
- post-rollback health/private-header/capture/deep-audit checks are scripted;
- one checksum mismatch, one ABI mismatch, and one incompatible migration manifest are each rejected in rehearsal;
- alert destinations and incident-owner acknowledgement are drilled; and
- R3 restore rehearsal preserves the failed DB/WAL, identifies the loss interval, and completes every post-restore check.

The current deploy flow does not meet the named-artifact requirement because it synchronizes into the active runtime (`scripts/deploy.sh:499-507`; `../discovery/current-state-report.md:205-214`). Do not release until this gap is closed and rehearsed.

## 4. R0 — flags-first containment

### Actions

1. Declare a Processing incident and freeze rollout, legacy enrollment, deploys, repairs, retention pruning, and nonessential jobs that could obscure evidence.
2. Atomically set flags in this order: navigation `0`, write `0`, read `0`.
3. Re-read effective values and checkpoint output; record only content-free codes/timestamps.
4. Verify Processing navigation is absent, reads/writes are private-unavailable as designed, and no cached Processing response remains usable.
5. Verify ordinary capture remains available and the always-on central/raw initialization path still creates Inbox version 1 with exactly one receipt/event. If capture proof risks compounding corruption, stop writers and escalate instead.
6. Preserve the Processing observability rotations, relevant system-journal interval, runtime singleton, service state/restart count, app SHA, migration manifest, flag snapshot, and synthetic fixture IDs. Do not copy source content, notes, URLs, credentials, SQL, stack traces, or private paths into public evidence.
7. Create and verify a fresh pre-repair/pre-code-rollback SQLite backup unless DB corruption makes reading it unsafe. Never overwrite the predeploy backup.

### R0 success criteria

- no Processing navigation or mutation remains exposed;
- application health and non-Processing critical paths are stable;
- new capture initialization is correct or writers are safely stopped;
- evidence and current DB/WAL are preserved; and
- the incident owner can classify the issue for R1, R2, or R3.

R0 may remain the safe state while investigation continues. Flags are never re-enabled merely because liveness is green.

## 5. Triage and route selection

With flags off, answer these in order:

1. **Is the database readable and structurally valid?** Run quick check, foreign-key check, exact migration/schema/index/trigger manifest, and the full Processing deep audit. A liveness endpoint alone is insufficient (`../discovery/current-state-report.md:156-170`).
2. **Is capture initialization safe?** Inspect only content-free counts/IDs; prove central and raw paths initialize exactly once and duplicates/repairs preserve state.
3. **Is the runtime/artifact sound?** Compare served app SHA, release manifest, artifact checksum, Node major/ABI, lockfile checksum, native module versions/load, unit content, and service state.
4. **Is this a supported invariant/configuration fault?** Run the repair tool in plan-only mode and review its content-free proposed changes. Automatic repair is prohibited (`../technical/technical-plan-v2.md:266-279`).
5. **What state exists after the last verified snapshot?** Record the snapshot time and the content-free counts/time interval of captures, notes, workflow mutations, enrollment progress, and other DB writes that R3 would discard.

Choose:

- **R1 forward repair** when the DB is readable, the failure is recognized/supported, and a reviewed plan plus full audit can prove the repaired state.
- **R2 code rollback** when the new runtime, dependency, unit, request path, or performance behavior is causal and schema 025 remains valid.
- **R3 database restore** only for corruption/unrecoverable state that supported repair and known-good code cannot safely operate on.

When causality is unclear but DB checks are green, prefer R2 with flags off over R3.

## 6. R1 — forward repair

Forward repair is the normal data remedy because schema/history do not roll back.

1. Keep `PROCESSING_NAV_ENABLED`, `PROCESSING_WRITE_ENABLED`, and `PROCESSING_READ_ENABLED` at 0.
2. Create/verify a fresh backup and retain the failing DB/WAL evidence.
3. Run `repair-processing-integrity --plan`; record recognized code, affected content-free counts, proposed bounded changes, and expected post-state.
4. Require data-owner review and the tool's explicit typed apply confirmation. Never edit workflow projection/events/receipts manually or delete history to make an audit green.
5. Apply one bounded repair with other Processing writers disabled.
6. Run exact schema manifest, quick check, foreign-key check, full deep audit, old/new capture initialization, duplicate preservation, affected mutation replay/outcome, counts/metrics, private headers, service health, and alert clear.
7. Observe two 15-minute healthy windows with flags still off/read-only as appropriate before considering staged re-enable.

If plan-only reports unsupported corruption, the apply fails/partially applies, the audit remains red, or capture/event coupling cannot be proved, stop and choose R2 or R3. Clearing a readiness latch without resolving its recognized code is prohibited.

## 7. R2 — checksum-verified code artifact rollback

Use the reviewed rollback tool with explicit artifact and checksum inputs. The tool must fail closed on any mismatch.

### Replacement sequence

1. Confirm R0 and record prior flag values, but leave all three flags off.
2. Acquire the deployment/runtime lock; verify scheduled writers and service transitions cannot overlap replacement.
3. Create and quick/FK-check a pre-rollback backup; record checksum/size and protect both it and the predeploy backup from pruning.
4. Verify the selected known-good artifact's SHA-256 and release manifest, including git SHA, file-list hash, Node major/ABI, lockfile checksum, native dependency versions, and compatibility with the currently applied migration manifest.
5. Stop the application service. If database integrity is uncertain, stop every writer that can touch the same SQLite database before further checks.
6. Extract the artifact into a clean staging location. Never extract directly over the live runtime and never include/replace the data directory.
7. Atomically replace runtime files while preserving data, backups, release artifacts, observability, and private evidence.
8. Install the matching service/unit files, reload the service manager, and repair `better-sqlite3`/`sqlite-vec` using the same reviewed lockfile-driven deploy function (`scripts/deploy.sh:409-419`).
9. Start the service once. Do not restore old Processing flag values.

### Mandatory post-code-rollback verification

- service is active with stable restart count and expected unprivileged/loopback/filesystem boundaries (`scripts/deploy/brain.service:6-26`);
- served app SHA, Node major/ABI, lockfile checksum, and native module versions/load match the selected manifest;
- authenticated health passes and public/webhook boundaries remain correct;
- Processing flags are `0/0/0`; private endpoints and cache headers behave safely;
- migration manifest is unchanged and compatible;
- quick check and foreign-key check pass;
- Processing deep audit is green/fresh after old code starts, or Processing remains safely unavailable with an understood checkpoint compatibility code;
- one clearly synthetic old-code capture initializes exactly once through the schema-025 guard, duplicate capture preserves lifecycle, and fixture hard-delete cascades cleanly;
- non-Processing Library/detail/search/Ask/capture, notes, workers, scheduled jobs, and backup status pass scoped regression checks; and
- no critical alert or unacceptable error/performance signal appears for two 15-minute windows and the next scheduled deep audit.

If old code cannot operate safely on schema 025, do not improvise a down migration. Keep writers stopped/flags off and choose a reviewed forward fix or R3.

## 8. R3 — destructive database snapshot restore boundary

### Entry conditions

R3 is permitted only when all are true:

- R0 has contained Processing and all SQLite writers are stopped;
- current DB is corrupt/unusable or contains unsupported unsafe state;
- supported forward repair and checksum-verified known-good code cannot restore safe operation;
- the selected backup passed checksum, restrictive-access, `quick_check`, foreign-key, schema/migration compatibility, and isolated-restore validation;
- release and data owners explicitly accept the documented loss interval; and
- the operator has a reconciliation plan for captures and other writes after the snapshot.

### Loss accounting

Before restore, record snapshot creation time and restore cutoff time. Report content-free counts/identifiers, when safely readable, for post-snapshot:

- new captured identities and capture-source classes;
- workflow events/receipts and legacy enrollment progress;
- item-note revisions and other application writes;
- Recall/import/queue work and completed jobs; and
- filesystem artifacts whose DB metadata may diverge after restore.

Database-only backups do not include filesystem capture artifacts (`docs/wiki/Backups-and-Restore.md:14-18`). Restore can therefore create both lost DB writes and artifact/database mismatches. This boundary must be explicit in the go/no-go record.

### Restore sequence

1. Keep all Processing flags off and stop application, workers, importers, timers, and every process able to write the database.
2. Preserve the failed database plus WAL/SHM sidecars as immutable incident evidence; do not delete or overwrite them. The existing restore approach sidelines rather than deletes the current DB (`scripts/restore-from-backup.sh:22-25`, `scripts/restore-from-backup.sh:59-67`).
3. Copy—not move—the selected verified snapshot into the restore staging area and re-verify checksum.
4. Apply the approved operator restore process. Never restore while a listener/writer holds the live WAL (`scripts/restore-from-backup.sh:49-55`).
5. Before starting services, verify file ownership/mode, schema/migration manifest, `quick_check=ok`, and no foreign-key rows.
6. Start the checksum-verified compatible artifact with all Processing flags off.
7. Run the full Processing deep audit after restore; do not rely only on Library loading, which is the current script's limited manual follow-up (`scripts/restore-from-backup.sh:73-82`).
8. Run one synthetic new capture/duplicate/cleanup proof, authenticated health, private-header checks, non-Processing regressions, backup re-baselining, and alert clear.
9. Reconcile the documented lost interval using authorized source systems/evidence. Never silently claim post-snapshot data was preserved.

### Restore success criteria

- checksums, schema, quick/FK/deep audit, capture guard, service health, private boundaries, and cleanup all pass;
- loss interval and reconciliation status are recorded;
- a new post-restore backup is created, verified, and protected;
- flags remain off through two 15-minute windows and the next scheduled six-hour audit; and
- the incident record clearly labels the destructive restore and any unrecovered data.

## 9. Post-rollback validation matrix

Run the matrix for R1, R2, and R3; mark nonapplicable rows explicitly rather than omitting them.

| Area | Required proof |
|---|---|
| Artifact/runtime | Served SHA, manifest/file-list/artifact checksums, Node major/ABI, native dependency load, matching unit |
| Flags/readiness | Effective `0/0/0`, green/fresh checkpoint or safely unavailable understood state, machine-readable output |
| Database | Migration manifest, schema/index/trigger manifest, `quick_check=ok`, no FK rows, full deep audit |
| Capture guard | New synthetic identity initializes once; duplicate/repair preserves; cleanup/cascade passes |
| Processing privacy | Session-only/bearer-negative/origin policy/private-no-store headers; no cached route/nav |
| Non-Processing | Library/detail/search/Ask/capture/notes/export/Review and critical workers remain available within scoped smoke |
| Archive/history | No history rewrite; archive remains Processing-only; projections/events/receipts consistent |
| Metrics/counts | Exact four-state/current-Inbox and event-derived metrics reconcile or are unavailable—not false zero |
| Operations | Service/restart, timer state, backup status, disk/WAL, journal/error rates, alert destinations |
| Performance | Two 15-minute windows below applicable failure/p95 thresholds; next deep audit outcome |
| Evidence/privacy | Content-free record complete; no source content, secret, payload, SQL, stack, or private path published |

## 10. Re-enable and closeout

Rollback success does not authorize immediate feature re-enable.

1. Keep all flags off while root cause and corrective PR are reviewed.
2. Update the release/incident record with trigger, containment time, route selected, artifact/backup identifiers and checksums, loss interval (if any), verification, and outstanding reconciliation.
3. Add regression coverage for the failure and rerun the full candidate release gate, including artifact rollback and alert drill.
4. Deploy any fix as a new immutable artifact/SHA; never mutate or relabel the failed artifact.
5. Re-enter the staged release at M2 dark deploy. Reads, writes, and navigation advance independently with their normal observation windows.
6. Update repository docs and Wiki to the actual deployed state and any changed recovery boundary.

The goal remains incomplete if the feature is merely hidden or rolled back. Completion requires a later successful staged release, live verification, cleanup, and current documentation.

## 11. Evidence index

| Claim | Repository evidence |
|---|---|
| Flags, readiness, always-on guards | `../technical/technical-plan-v2.md:490-517` |
| Alert thresholds and flags-off policy | `../technical/technical-plan-v2.md:532-546`, `../technical/technical-plan-v2.md:643-655` |
| Known-good artifact and executable rollback | `../technical/technical-plan-v2.md:550-574` |
| Repair is explicit and never automatic | `../technical/technical-plan-v2.md:266-279` |
| Existing deploy native repair | `scripts/deploy.sh:409-419` |
| Existing active-runtime overwrite gap | `scripts/deploy.sh:499-507`, `../discovery/current-state-report.md:205-214` |
| Existing restore protections and limited verification | `scripts/restore-from-backup.sh:22-82` |
| Database-only artifact gap | `docs/wiki/Backups-and-Restore.md:14-18`, `docs/wiki/Backups-and-Restore.md:26-32` |
| Current service security boundary | `scripts/deploy/brain.service:6-26` |
