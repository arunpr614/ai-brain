# Kanban Card Processing — release plan

**Status:** Release tooling and isolated production-copy rehearsal complete; PR/CI and production execution pending
**Date:** 2026-07-12
**Feature contract:** [PRD v2](../product/prd-v2.md) and [technical plan v2](../technical/technical-plan-v2.md)
**Rollback companion:** [rollback plan](rollback-plan.md)

Implementation evidence: `operator-runbook.md`, `../qa/production-copy-migration-rehearsal.md`, `../qa/verification-report.md`, and `../reviews/implementation-security-adversarial-review.md`. The historical gaps below describe the pre-implementation baseline; the immutable attested release path now resolves them, but no production deployment is claimed.

## 1. Release objective and boundaries

Release **Processing** through independently gated read, write, and navigation stages while preserving every new capture, keeping legacy rows dormant until explicit enrollment, and retaining an executable route back to the currently running application artifact.

This plan governs release sequencing and evidence. It does not authorize bypassing review, required checks, protected branches, host security, or backup safeguards. It contains no credentials, production content, private host commands, or private filesystem paths. Operator-only evidence must remain in the access-controlled release evidence location defined by technical plan v2.

The release is complete only when:

1. schema migration 025 and the always-on initialization guard are proven compatible with the old and new runtimes;
2. the three Processing flags have advanced through the stages in §8 without a no-go signal;
3. the live synthetic journey passes and its fixture is hard-deleted with cascade verification;
4. two consecutive 15-minute observation windows after write enablement and two after navigation enablement are healthy;
5. desktop and mobile live experiences are verified; and
6. repository documentation and the GitHub Wiki describe the actual deployed behavior.

## 2. Evidence-backed starting point

### Verified read-only baseline

The dated production baseline is service active, Node 22, authenticated loopback health `{ok:true}`, a 7,520,256-byte SQLite database, 129 retained items, latest migration `024_recall_manual_sync.sql`, `quick_check=ok`, no foreign-key violations, and ample data-filesystem free space. No production content or configuration was copied and no production state changed (`../qa/baseline-verification.md:41-58`). This is a health baseline, not feature, scale, migration, or release proof (`../qa/baseline-verification.md:60-65`).

### Current release controls that can be reused

- The deploy flow validates Node/tooling and environment, creates a SQLite `.backup`, mode-restricts it, and requires its `quick_check` to return `ok` (`scripts/deploy.sh:159-198`, `scripts/deploy.sh:274-288`).
- It runs typecheck, lint, the repository test suite, environment checks, a production build, and build-artifact checks before replacing the service (`scripts/deploy.sh:469-493`).
- It repairs `better-sqlite3` and `sqlite-vec` from lockfile versions on the target host, then restarts and performs authenticated health/provider/boundary checks (`scripts/deploy.sh:409-419`, `scripts/deploy.sh:547-568`).
- The service is unprivileged, loopback-only, journal-backed, restart-enabled, and writable only in its data area (`scripts/deploy/brain.service:6-26`).
- SQLite-aware local/off-site backups and an operator-controlled restore path exist (`scripts/backup-offsite.sh:51-77`, `scripts/restore-from-backup.sh:22-82`).

### Gaps that are blockers until implemented and rehearsed

- Current artifact synchronization overwrites the active runtime; it does not retain or switch a named prior release (`scripts/deploy.sh:499-507`; `../discovery/current-state-report.md:205-214`).
- The restore script protects the old DB/WAL but performs only manual post-start Library verification; Processing deep audit and capture-guard verification must be added to the runbook (`scripts/restore-from-backup.sh:59-82`).
- `/api/health` is liveness-only and cannot prove Processing schema/data health (`../discovery/current-state-report.md:156-170`).
- GitHub Actions currently validates agent documentation only, not the full product suite (`.github/workflows/agent-docs.yml:42-53`; `../discovery/current-state-report.md:195-203`). A green current CI check is therefore insufficient.
- The Processing audit timer, operational-health timer, flags, artifact packager, rollback script, smoke runner, and SwiftBar Processing state are technical-plan requirements, not baseline capabilities (`../technical/technical-plan-v2.md:490-574`).

No rollout stage may treat a planned control as implemented evidence.

## 3. Roles, decision rights, and release record

One person may fill several roles, but each field must be named in the private release record before M1:

| Role | Accountable for |
|---|---|
| Release owner | go/no-go calls, stage timestamps, evidence completeness |
| Implementation owner | release SHA, migrations, flags, artifact contents |
| Data owner | backup verification, migration rehearsal, deep audit, restore boundary |
| QA/accessibility owner | traceability, scale, browser, mobile, AT, smoke cleanup |
| Incident owner | alert receipt, flags-first containment, rollback/repair choice |
| Documentation owner | repository docs and Wiki after live truth is known |

The private release record must contain only content-free operational evidence:

- release SHA and PR/merge identifiers;
- artifact and lockfile checksums, manifest hash, Node version/ABI, native package versions;
- migration manifest hash and pre/post schema version;
- backup identifier, creation time, size, checksum, `quick_check`, foreign-key check, isolated-restore result, and retention protection;
- old/new Processing flag values and machine-readable readiness output;
- stage start/end, alert-window summaries, performance percentiles, and go/no-go decision;
- synthetic fixture item/mutation/event identifiers and cleanup result; and
- post-release documentation/Wiki commit identifiers.

Never record source titles, URLs, bodies, notes, labels, query strings, credentials, environment values, SQL, stack traces, or private paths.

## 4. Release-candidate and PR/CI/merge sequence

### PR construction

1. Rebase or merge the feature branch onto the latest protected `main`; record the resulting candidate SHA.
2. Freeze migration filename and checksum. Migration 025 is additive and immutable; do not rename, edit, or reorder it after rehearsal begins.
3. Produce an acceptance trace from PRD v2 §29 and technical plan v2 §23/§27 to tests/evidence.
4. Split or clearly label review surfaces: schema/invariants; ingestion and archive matrix; private APIs; UI/accessibility; operations/release/docs. Do not merge operations as an unreviewed appendix.
5. Require reviews from implementation, data/migration, security/privacy, accessibility, QA, and release owners for their surfaces.

### Required candidate checks

The candidate SHA—not a predecessor—must pass:

- clean locked install on Node 22;
- typecheck, lint, all repository tests, production standalone build, environment and artifact checks;
- fresh database and 024→025 upgrade tests with exact schema/index/trigger manifest, `quick_check`, and foreign-key check;
- every canonical ingestion new/duplicate/repair path and old-runtime explicit INSERT compatibility;
- route/security tests for session-only access, bearer-negative behavior, same-origin writes, private/no-store headers on every status class, bounds, and content-free logs;
- exact counts/metrics, event/receipt/CAS/outcome/Undo/enrollment/archive-matrix suites;
- 10k/50k cold/warm performance, query plans, contention, and the selected virtualization branch;
- desktop/mobile browser coverage and required keyboard/AT/reflow/contrast/reduced-motion checks;
- deep-audit/hot-gate contention, timer/alert drills, artifact packaging, checksum rejection, native dependency repair, flags-first rollback, old-code capture, isolated restore, and smoke-cleanup tests; and
- public documentation/privacy checks.

PR CI must run the product suite or attach tamper-evident, candidate-SHA-bound results from the approved release runner. Because current CI runs only documentation checks, merge is blocked until either product CI exists or every full local/release-runner gate is independently reviewed and attached. A documentation-only green check is never merge authority.

### Merge and deploy candidate

1. Resolve all required review threads and rerun invalidated checks.
2. Merge through normal branch protection; no direct push or skipped review.
3. Confirm the merged `main` SHA exactly matches the reviewed candidate or rerun all candidate-bound checks on the merge SHA.
4. Build once from that SHA. Promote the same checksum-verified artifact through rehearsal and production; do not rebuild during rollout.
5. Sign off M0/M1 evidence before any production deployment.

## 5. M0/M1 readiness and backup gate

### Contract readiness — M0

Release owner verifies that PRD v2, UX/UI v2, technical plan v2, acceptance traceability, archive matrix, flags, alert codes, and this release/rollback pair agree. Any unresolved P0/P1, source conflict, untraced required acceptance criterion, or implementation divergence is a no-go.

### Verified backup — M1 and immediately pre-deploy

The database backup gate passes only when all of the following are recorded for a newly created WAL-safe snapshot:

1. snapshot completed with writers coordinated per the approved operator workflow;
2. file is non-empty, permissions are restrictive, and it resides outside the runtime replacement set;
3. SHA-256 and byte size are recorded;
4. `PRAGMA quick_check` is exactly `ok`;
5. `PRAGMA foreign_key_check` returns no rows;
6. migration manifest and schema version are recorded;
7. a separate isolated copy opens successfully, has the expected content-free table/count shape, and restores without modifying production;
8. post-restore `quick_check`, foreign-key check, and Processing deep audit pass;
9. the exact backup is protected from normal retention pruning through the release and rollback observation period; and
10. the filesystem-capture-artifact coverage boundary is acknowledged. Processing workflow truth is SQLite-only, but a full DB restore can still lose post-snapshot captures/workflow events and database metadata may reference artifacts not covered by database-only backup (`docs/wiki/Backups-and-Restore.md:14-18`, `docs/wiki/Backups-and-Restore.md:26-32`).

A recent scheduled backup or historical restore proof does not replace this gate. Backup creation or verification failure stops deployment before migration.

### Migration and deep-audit rehearsal

Rehearse on both a sanitized production-size copy and deterministic 10k/50k fixtures:

- fresh schema and exact 024→025 upgrade;
- legacy rows remain dormant with no baseline events;
- central new capture and raw inserts initialize Inbox exactly once;
- duplicate/upgrade/repair paths preserve workflow/archive/version;
- old artifact runs against schema 025 and still creates a correctly guarded capture;
- intentionally injected projection/event/receipt/Undo/job inconsistencies are rejected or make readiness red;
- quick/FK checks pass; migration/apply time, WAL/disk growth, locks, and request impact are within budget;
- deep audit finishes within 30 seconds at 50k, holds no lock over 100 ms, and degrades concurrent p95 by less than 20%; and
- isolated backup restore followed by deep audit/capture/health succeeds.

Migration 025 is additive and is not rolled back. A failed rehearsal, insufficient disk headroom, unexpected data shape, or inability to run the old artifact on schema 025 is a no-go.

## 6. Known-good artifact and deployment safeguards

Before production replacement, prepare and verify both the pre-feature artifact and the new candidate artifact.

### Required artifact manifest

Each immutable archive contains the standalone runtime, static assets, public assets, required scripts/unit files, and `release-manifest.json` with:

- git SHA and build time;
- Node major and module ABI;
- package-lock SHA-256;
- exact `better-sqlite3` and `sqlite-vec` versions/platform expectations;
- migration compatibility floor/ceiling and migration-manifest hash;
- sorted file-list hash; and
- artifact SHA-256 in a separate sibling file.

Record a content-free snapshot of the three Processing flags separately. Store the artifact with restrictive ownership/mode outside files replaced by deployment. Keep current plus two prior verified artifacts, and never prune the only known-good artifact during a deploy (`../technical/technical-plan-v2.md:550-560`).

### Pre-feature known-good proof

Before the first Processing deploy:

1. package the runtime currently serving production, excluding data;
2. verify archive checksum and manifest;
3. extract it into a clean staging directory;
4. use the same native-dependency repair function as deploy;
5. prove it starts on the target host class with the target Node major/ABI;
6. prove authenticated health and an old-runtime capture against schema 025 in an isolated environment; and
7. mark it known-good only after all checks pass.

### Deployment safeguards

- Acquire the existing continuous release/runtime lock and verify scheduled writers cannot cross the runtime switch.
- Abort if worktree, merge SHA, artifact SHA, manifest, lockfile SHA, Node major/ABI, migration manifest, or native package versions differ from reviewed evidence.
- Confirm a verified predeploy backup and known-good artifact before touching the runtime.
- Force all three Processing flags to 0 for the first deploy; output their effective values and readiness as machine-readable, content-free data.
- Preserve the data directory and release store; stage extraction before atomic runtime replacement.
- Apply/install required system units with disabled/default-off semantics, reload systemd, and verify the six-hour audit and five-minute health timers are installed as designed.
- Repair native dependencies from the reviewed lockfile versions and reject ABI/load failures before serving traffic.
- Restart once, then verify service active/restart count stable, Node/ABI, authenticated liveness, provider/boundary checks, private Processing headers, migration manifest, deep readiness, and capture guard.
- Do not enable a flag in the same operation that first installs schema, timers, or the new runtime.

## 7. Readiness, flags, and no-go policy

All flags default to `0`:

| Flag | Effective behavior |
|---|---|
| `PROCESSING_READ_ENABLED` | Processing reads are available only when flag=1 and checkpoint is green/fresh |
| `PROCESSING_WRITE_ENABLED` | Writes are available only when read is effective and write flag=1 |
| `PROCESSING_NAV_ENABLED` | Navigation is visible only when read is effective and nav flag=1 |

Migration constraints, central initialization, raw-insert guard, epoch triggers, and initialization receipts stay active with flags off (`../technical/technical-plan-v2.md:509-517`).

The hot gate performs one primary-key checkpoint read and must remain p95 ≤2 ms at 50k. Checkpoint age over 24 hours makes reads/writes unavailable and hides navigation. No route may run deep checks (`../technical/technical-plan-v2.md:503-507`).

### Automatic flags-off/no-go signals

Immediately set navigation, write, then read to 0 and stop advancement for:

- readiness red or stale;
- missing initialization or projection/event/receipt duplication/mismatch;
- quick-check, foreign-key, migration-manifest, or deep-audit failure;
- Processing endpoint session/bearer/origin/cache/privacy failure;
- smoke fixture cleanup failure;
- three or more DB-busy or unknown-outcome server results in 15 minutes;
- mutation server-failure rate over 5% with at least 20 samples;
- two consecutive measured p95 budget breaches with at least 20 samples per window;
- enrollment running without progress for 15 minutes; or
- service, Node/ABI, native-dependency, disk/WAL, backup, or artifact incompatibility.

Conflict rate over 25% with at least 20 samples is warning/investigation, not automatic code rollback. It blocks stage advancement until explained (`../technical/technical-plan-v2.md:532-546`).

## 8. Staged production rollout

Advance only after the prior row's evidence is complete. Flag edits are atomic and values are re-read after restart/reload. Unless a no-go requires immediate containment, keep each observation window free of unrelated deployment/configuration changes.

| Stage | Flags read/write/nav | Required actions and exit evidence |
|---|---|---|
| M2 — deploy dark | `0/0/0` | Deploy schema/runtime/timers with known-good artifact retained. Deep audit green/fresh; private endpoints unavailable as designed; no navigation. |
| M3 — capture proof, UI dark | `0/0/0` | Exercise representative synthetic new capture paths and duplicate/repair preservation. Zero missing initialization; one initialized receipt/event per new identity; old-runtime compatibility proof; service/Node/auth health green. |
| M4 — reads | `1/0/0` | Verify session-only/bearer-negative/private headers, Inbox/List/Board/Archived reads, exact zero-filled four-state total/matching counts, independent cursors/groups, AI Topic semantics, timezone, Today/week values, and dormant legacy absence. Observe one 15-minute healthy window before writes. |
| M5 — writes dogfood | `1/1/0` | Use a small explicit legacy-enrollment preview; exercise CAS, immutable receipts, outcome lookup, conflict/unknown handling, move, 30-second Undo, permanent reversal, Done/archive/restore/reprocess, notes independence, and archive matrix. Observe **two consecutive 15-minute healthy windows**. |
| M6 — navigation | `1/1/1` | Enable discoverability only after scale, accessibility, alerts, rollback, and live write evidence pass. Verify fresh primary navigation resets to Inbox; deep links/back-forward/return/focus work. Drag stays off unless its separate AT/cancel/focus gate passed. Observe **two consecutive 15-minute healthy windows**. |
| M7 — full live verification | `1/1/1` | Run §10 on desktop and mobile; spot-check archive downstream behavior; verify alerts/runtime/checkpoint and fixture cleanup. |
| M8 — documentation | actual production values | Update repository docs and Wiki to shipped truth, including schema/API/flags/readiness/timers/alerts/backup/rollback and dated evidence. |

Do not enable all three flags together. Do not enroll all legacy items as a release smoke. Do not advance while any alert is unacknowledged, an evidence field is missing, or a metric is unavailable and displayed as zero.

## 9. Observability and release watch

### Signals and privacy

Processing writes content-free structured samples to its dedicated rotating JSONL sink. Allowed fields are timestamp, operation/result/reason enums, scope class, version/count, duration, DB-busy flag, and opaque IDs. The sink is 5 MiB × 5 rotations and access-restricted. It must exclude titles, URLs, content, notes, labels/filters, query strings, payloads, SQL, stack traces, credentials, and paths (`../technical/technical-plan-v2.md:532-535`).

Monitor during every stage:

- service active state, restarts, authenticated liveness, Node/ABI, native module loads;
- Processing readiness color/code, checkpoint age, migration-manifest/app SHA match, audit timer outcome;
- missing initialization, projection/event/receipt invariant counters, quick/FK outcome;
- request volume/result codes, DB-busy, unknown outcome, server-failure and conflict rates;
- read/count/group/page and mutation p50/p95/max against budgets;
- enrollment state/progress/retry/cancel and writer-lock time;
- SQLite/WAL size, filesystem free space, backup freshness/status;
- exact counts and owner-visible Processed/Added/Completed values for impossible jumps or unavailable-as-zero regressions; and
- smoke start/completion/cleanup state.

The numeric performance budgets at 50k are: readiness p95 ≤2 ms; unfiltered summary/count p95 ≤100 ms; filtered summary/group metadata and item/group pages p95 ≤200 ms; mutation transaction p95 ≤250 ms excluding network; enrollment lock ≤100 ms; deep audit ≤30 seconds with under 20% concurrent p95 degradation (`../technical/technical-plan-v2.md:576-588`).

### Alert execution and destination

`check-processing-operational-health.mjs --window=15m` runs every five minutes. Thresholds and severities are exactly those in §7. Every alert code routes to:

1. priority-tagged system journal;
2. persistent authenticated Processing/Settings banner from the runtime singleton; and
3. red SwiftBar state.

If owner Telegram alerts are configured, critical codes may also be sent without content; Telegram is optional and release evidence must never expose or require its credentials. Before M2, inject one safe warning and one safe critical condition in rehearsal, prove each destination receives the expected content-free code, acknowledge them, and prove the runbook path. Before M6, repeat a production-safe alert-route test without corrupting production state.

Release owner watches continuously from M2 through at least 30 minutes after M7 and reviews the next scheduled six-hour deep audit. A critical after handoff reopens the release incident and starts [rollback-plan.md](rollback-plan.md).

## 10. Live synthetic smoke and cleanup

Create exactly one clearly synthetic source per smoke run through the normal authenticated capture path. Use a unique release label inside the synthetic content, but store in the private evidence file only:

- release SHA;
- returned item ID;
- mutation IDs and event IDs for each action;
- actor-tab ID;
- status/archive/version transitions;
- timestamps and before/after aggregate counts/metrics; and
- cleanup verification outcome.

The private evidence filename is keyed by release SHA and mode 0600 as required by technical plan v2 (`../technical/technical-plan-v2.md:548-548`). Public documentation references only the evidence checksum and pass/fail, never fixture content, private paths, or IDs.

Exercise in order:

1. create the synthetic identity and prove Inbox/version-1 initialization exactly once;
2. replay/duplicate capture and prove no reset or duplicate initialization;
3. read Inbox/Board/List and exact counts;
4. move Inbox→To Do→In Progress→Done with expected versions and outcome lookup;
5. archive, restore to Done, reprocess to Inbox;
6. perform one reversible move and Undo within the 30-second server window;
7. verify Processed/Completed/Added semantics, current-Done projection, counts, focus/return, and archive badges;
8. open canonical detail and verify note state remains independent;
9. hard-delete the synthetic item through the authorized path; and
10. verify the item, workflow events, known-item receipts, Undo slot, search/index-visible residue, and related synthetic evidence are gone while aggregate counts reconcile.

Run the full journey on desktop and core read/action/return paths on mobile. A cleanup failure, residual fixture, duplicated event/receipt, or ambiguous outcome is a release no-go: flags off, preserve identifiers privately, and repair/rollback before retrying. Never hide cleanup failure by creating another fixture.

## 11. Go/no-go and handoff checklist

### Go to navigation/live verification only if

- candidate SHA/artifact/checksum/manifest/ABI/native versions match reviewed evidence;
- backup and isolated restore are verified and retention-protected;
- 025 rehearsal, old artifact, forward repair, and destructive restore drill passed;
- service, authenticated liveness, deep audit, hot gate, audit/health timers and destinations are green;
- full candidate gates, 10k/50k budgets, accessibility branch, and archive matrix passed;
- read and write stages completed their required healthy windows;
- no P0/P1 or unacknowledged critical/warning remains; and
- rollback owner can execute flags-first containment and artifact rollback immediately.

### Release acceptance after M7

- live desktop/mobile smoke passed and fixture cleanup/cascade was verified;
- no threshold breached during two post-navigation windows;
- next scheduled deep audit is green or the release watch remains open until it runs;
- no private content appears in logs, evidence, API errors, or public documentation;
- repository documentation and GitHub Wiki are updated to actual behavior; and
- the tracker says “released” only after all above evidence exists.

## 12. Evidence index

| Claim | Repository evidence |
|---|---|
| Dated production baseline and its limits | `../qa/baseline-verification.md:41-65` |
| Existing deployment backup/local gates/build/sync/native repair/health | `scripts/deploy.sh:274-288`, `scripts/deploy.sh:469-568` |
| Existing service hardening | `scripts/deploy/brain.service:6-26` |
| Existing backup/restore boundaries | `scripts/backup-offsite.sh:51-77`, `scripts/restore-from-backup.sh:22-82`, `docs/wiki/Backups-and-Restore.md:14-32` |
| Current artifact rollback and product-CI gaps | `../discovery/current-state-report.md:195-214` |
| Migration schema and invariants | `../technical/technical-plan-v2.md:148-279` |
| Deep audit, hot gate, flags | `../technical/technical-plan-v2.md:490-517` |
| Alerts, destinations, smoke | `../technical/technical-plan-v2.md:532-548` |
| Artifact/rollback contract | `../technical/technical-plan-v2.md:550-574` |
| Performance budgets and operations tests | `../technical/technical-plan-v2.md:576-641` |
| Staged rollout/no-go rules | `../technical/technical-plan-v2.md:643-655` |
