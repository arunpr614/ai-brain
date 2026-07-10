# SPIKE-020 - Recall Deployment Operability

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-020 |
| **Date** | 2026-06-24 09:57 IST |
| **Author** | AI agent (Codex) |
| **Phase** | Phase C - deployment readiness design |
| **Isolation** | Design-only; no deploy, no cron install, no production mutation, no Recall API calls |
| **Triggered by** | Recall daily sync V2 deployment operability gate |
| **Verdict** | PROCEED-WITH-CHANGES for a CLI-first deployment plan; production scheduling remains blocked |

## Question

Can a production Recall import be deployed, disabled, observed, verified, and rolled back safely?

## Evidence Inspected

Local production/deployment references inspected:

- `scripts/deploy.sh`
- `scripts/deploy/brain.service`
- `scripts/deploy/brain-backup.cron`
- `scripts/backup-offsite.sh`
- `scripts/restore-from-backup.sh`
- `src/instrumentation.ts`
- `src/lib/queue/enrichment-batch-cron.ts`
- `src/lib/backup.ts`
- `.env.example`
- `scripts/check-env-gitignored.sh`
- `src/lib/recall/scheduler.ts`
- `src/lib/recall/sync-runner.ts`
- `docs/plans/spikes/SPIKE-018-recall-scheduler-checkpoint-2026-06-24_09-51-39_IST.md`

No production commands were run.

## Current Production Operating Model

AI Brain production runs on Hetzner:

- App directory: `/opt/brain`
- Service: `brain.service`
- Service user/group: `brain:brain`
- Environment file: `/etc/brain/.env`
- Database: `/opt/brain/data/brain.sqlite`
- Local data/write path: `/opt/brain/data`
- App logs: systemd journal under `SyslogIdentifier=brain`
- Backup logs: `/var/log/brain-backup.log`

`brain.service` is hardened:

- `ProtectSystem=strict`
- `ProtectHome=true`
- `ReadWritePaths=/opt/brain/data`
- environment loaded from `/etc/brain/.env`
- standard output/error goes to journald

Deployment currently:

- runs local gates: `typecheck`, `lint`, `test`, env check, provider check;
- builds Next standalone;
- rsyncs `.next/standalone`, `.next/static`, and `public`;
- copies only selected scripts into `/opt/brain/scripts`;
- repairs remote native deps;
- restarts `brain.service`;
- checks authenticated `/api/health`.

## Important Packaging Finding

A future Recall production CLI must not rely on local TypeScript source files or `tsx` being available on Hetzner.

Reason:

- `scripts/deploy.sh` deploys the Next standalone artifact plus selected scripts.
- It does not deploy the full `src/` tree as a runnable TypeScript project.
- Production `node_modules` are installed without dev dependencies.
- A CLI like `node --import tsx scripts/sync-recall.ts` may work locally but is not a safe production command unless deploy packaging is changed.

Implementation implication:

- Prefer a production-ready JS script such as `scripts/sync-recall-prod.mjs`, or
- add an explicit build/copy step that bundles the Recall CLI and its dependencies into the standalone artifact, then prove it on the Hetzner host.

This is a blocker for production cron until resolved.

## Intended Execution Environment

Recommended V1 operating shape:

- Use a CLI-first job, not in-process Next.js cron-first.
- Run as the `brain` user on the Hetzner host.
- Working directory: `/opt/brain`.
- Load secrets from `/etc/brain/.env`.
- Write only under `/opt/brain/data`.
- Log to a dedicated file and/or journald.
- Schedule later via `/etc/cron.d/brain-recall-sync` or a systemd timer only after live API and packaging gates pass.

Do not add Recall sync to `src/instrumentation.ts` for V1. In-process cron is harder to dry-run, harder to disable independently, and coupled to app restarts.

## Required Environment Variables

Add these to `.env.example` only when the implementation plan starts code execution:

| Variable | Required | Purpose |
|---|---:|---|
| `RECALL_API_KEY` | Yes for live dry-run/apply | Recall REST API key. Secret. Never log. |
| `RECALL_API_BASE_URL` | Optional | Override base URL; default `https://backend.getrecall.ai/api/v1`. |
| `BRAIN_RECALL_SYNC_ENABLED` | Yes for cron | Emergency enable/disable flag. Default should be `0`. |
| `BRAIN_RECALL_SYNC_MODE` | Optional | Default mode for scheduled job, likely `dry_run` until first apply is approved. |
| `BRAIN_RECALL_SYNC_MAX_CARDS` | Optional | Safety cap for cards seen. |
| `BRAIN_RECALL_SYNC_MAX_IMPORTS` | Optional | Safety cap for created/imported items. |
| `BRAIN_RECALL_SYNC_MAX_CHARS` | Optional | Safety cap for planned text volume. |
| `BRAIN_RECALL_SYNC_MAX_CHUNKS` | Optional | Safety cap for fetched Recall chunks. |
| `BRAIN_RECALL_SYNC_FIRST_RUN_LOOKBACK_HOURS` | Optional | First-run window cap. |
| `BRAIN_RECALL_SYNC_OVERLAP_MINUTES` | Optional | Checkpoint overlap buffer. |
| `BRAIN_RECALL_SYNC_LOG_PATH` | Optional | Dedicated log path, default `/var/log/brain-recall-sync.log` when cron-owned. |

Secret injection path:

```text
/etc/brain/.env
```

Expected ownership/mode should match current production practice:

```text
root:brain 0640
```

`RECALL_API_KEY` must not be stored in `.env` inside the repository and must not appear in tracked files.

## Command Contract

Future implementation should expose commands equivalent to:

```text
cd /opt/brain
sudo -u brain bash -lc 'set -a; source /etc/brain/.env; set +a; node scripts/sync-recall-prod.mjs --dry-run'
sudo -u brain bash -lc 'set -a; source /etc/brain/.env; set +a; node scripts/sync-recall-prod.mjs --apply --max-imports 5'
```

Expected modes:

| Mode | Command intent | Production use |
|---|---|---|
| Dry-run | Enumerate/plans only, no writes, no checkpoint advance | Required first smoke |
| First apply | Narrow apply with low caps and manual approval | Required before cron |
| Steady apply | Scheduled daily apply after multiple clean runs | Only after all gates pass |
| Disabled | Exit 0 or documented code without doing work when `BRAIN_RECALL_SYNC_ENABLED=0` | Emergency stop |

Candidate schedule, not approved yet:

```text
15 20 * * * brain cd /opt/brain && bash -lc 'set -a; source /etc/brain/.env; set +a; [[ "${BRAIN_RECALL_SYNC_ENABLED:-0}" = "1" ]] && node scripts/sync-recall-prod.mjs --apply >> /var/log/brain-recall-sync.log 2>&1 || true'
```

20:15 UTC is 01:45 IST. This avoids the existing 01:00 IST enrichment batch submit window and gives imported items time to settle before later processing. This schedule remains a candidate only.

## Log Locations And Redaction Expectations

Recommended logs:

- CLI stdout/stderr appended to `/var/log/brain-recall-sync.log`.
- App-level background errors still go to existing `data/errors.jsonl` only if the CLI uses shared error logging.
- Production service logs remain in `journalctl -u brain`.

Log rules:

- No full Recall chunks.
- No private titles unless explicitly enabled for a controlled sample.
- No `RECALL_API_KEY`.
- No `Authorization: Bearer ...`.
- Redact signed URL query values such as `token`, `signature`, `X-Amz-Signature`.
- Log counts, redacted IDs, fidelity states, status codes, exit code, checkpoint state, and cap decisions.

Pre-live dry-run check:

```text
grep -E 'RECALL_API_KEY|Authorization: Bearer|sk_|token=|signature=' /var/log/brain-recall-sync.log
```

Expected: no unredacted secret or signed URL value.

## Production Smoke Checks

Before first apply:

1. Confirm deploy package includes the Recall CLI:

```text
ssh brain 'test -f /opt/brain/scripts/sync-recall-prod.mjs'
```

2. Confirm `RECALL_API_KEY` exists in `/etc/brain/.env` without printing the value:

```text
ssh brain "sudo grep -q '^RECALL_API_KEY=' /etc/brain/.env"
```

3. Run dry-run:

```text
ssh brain "cd /opt/brain && sudo -u brain bash -lc 'set -a; source /etc/brain/.env; set +a; node scripts/sync-recall-prod.mjs --dry-run --max-cards 20 --max-imports 0'"
```

4. Confirm dry-run did not create items:

```sql
SELECT COUNT(*) FROM items WHERE capture_source = 'recall';
```

5. Confirm dry-run did not advance checkpoint:

```sql
SELECT * FROM recall_sync_state WHERE key = 'checkpoint:last_successful_to';
```

6. Confirm log redaction.

First apply smoke:

1. Backup first:

```text
sqlite3 /opt/brain/data/brain.sqlite ".backup '/opt/brain/data/backups/recall-pre-apply-<timestamp>.sqlite'"
```

2. Apply with narrow caps:

```text
node scripts/sync-recall-prod.mjs --apply --max-cards 10 --max-imports 3
```

3. Validate:

```sql
SELECT COUNT(*) FROM items WHERE capture_source = 'recall';
SELECT sync_status, COUNT(*) FROM recall_sync_items GROUP BY sync_status;
SELECT state, COUNT(*) FROM enrichment_jobs GROUP BY state;
SELECT key, value FROM recall_sync_state WHERE key IN ('checkpoint:last_successful_to', 'lock:recall_sync');
```

Expected:

- imported count is within cap;
- no stale lock remains;
- checkpoint advances only after apply success;
- enrichment queue count remains within cap;
- no duplicate `recall_sync_items.recall_card_id`;
- no private content leaked in logs.

## Emergency Disable

Preferred disable:

```text
sudo sed -i 's/^BRAIN_RECALL_SYNC_ENABLED=.*/BRAIN_RECALL_SYNC_ENABLED=0/' /etc/brain/.env
```

If using cron:

```text
sudo mv /etc/cron.d/brain-recall-sync /etc/cron.d/brain-recall-sync.disabled
sudo systemctl reload cron || true
```

If using systemd timer later:

```text
sudo systemctl disable --now brain-recall-sync.timer
```

The job must also self-check `BRAIN_RECALL_SYNC_ENABLED` so disabling the env flag is enough for the next run even if cron remains installed.

## Stale Lock Recovery

Inspect lock:

```sql
SELECT key, value, updated_at FROM recall_sync_state WHERE key = 'lock:recall_sync';
```

Recover only after confirming no `sync-recall` process is running:

```text
pgrep -af sync-recall
```

Recovery command should be implemented as:

```text
node scripts/sync-recall-prod.mjs --recover-stale-lock --dry-run
```

Until that command exists, use direct SQL only from a reviewed runbook and only after backup:

```sql
DELETE FROM recall_sync_state WHERE key = 'lock:recall_sync';
```

## Rollback And Quarantine

Rollback depends on blast radius.

### Small Bad Import

If only a few Recall items were imported incorrectly:

1. Disable sync.
2. Preserve evidence:

```sql
SELECT * FROM recall_sync_items WHERE imported_at >= <bad_run_started_at>;
```

3. Quarantine affected items rather than immediately deleting:

```sql
UPDATE recall_sync_items
SET sync_status = 'blocked',
    last_error = 'quarantined after bad import'
WHERE imported_at >= <bad_run_started_at>;
```

4. Decide whether to delete AI Brain items by `item_id` after reviewing summaries/chunks/enrichment side effects.

### Broad Bad Import

If many bad rows were created or semantic queues were polluted:

1. Stop app:

```text
sudo systemctl stop brain
```

2. Restore known-good backup using the existing restore pattern:

```text
sudo -u brain /opt/brain/scripts/restore-from-backup.sh /opt/brain/data/backups/<snapshot>.sqlite
sudo systemctl start brain
```

3. Verify health:

```text
curl -H "Authorization: Bearer <remote-token>" https://brain.arunp.in/api/health
```

4. Keep Recall sync disabled until root cause is fixed.

## User-Visible Success

Success should mean:

- New Recall content appears in AI Brain after the daily job.
- Imported rows show `via Recall`.
- Items have Recall provenance in their body/details.
- Duplicate runs do not create duplicate Library rows.
- Weak or partial content is labeled honestly with fidelity state.
- Existing AI Brain content is not overwritten unless a later weak-item upgrade feature is explicitly enabled.

## User-Visible Failure

Failure should be visible and recoverable:

- Dry-run reports blocked state and no imports.
- Apply failures leave checkpoint unchanged.
- Imported-but-not-checkpointed cards are skipped safely on retry.
- The user does not see partial Recall sync represented as complete.
- Operator can disable the job without redeploying code.

## Pass Criteria Assessment

| Criterion | Result | Evidence |
|---|---|---|
| Concrete execution environment identified | Passed | Hetzner `/opt/brain`, `brain` user, `/etc/brain/.env`, `/opt/brain/data` |
| Secrets documented | Passed with change required | `RECALL_API_KEY` must be added to `.env.example` during implementation |
| Dry-run/apply/disable commands defined | Passed | Commands above |
| Logs and redaction expectations documented | Passed | Dedicated log path and grep checks above |
| Production smoke checks defined | Passed | SQL and command checks above |
| Rollback behavior defined | Passed | Quarantine and restore paths above |
| First-run caps/manual approval defined | Passed as recommended defaults | Exact values still need final approval |
| Success/failure observable | Passed | User and operator outcomes above |
| Production deployment remains blocked | Passed | Packaging/live API gates remain open |

## Required Changes Before Production

1. Implement a production-packaged Recall CLI, not a local-only TypeScript script.
2. Update `scripts/deploy.sh` to copy the Recall CLI and any required helper files.
3. Add Recall env vars to `.env.example`.
4. Extend `scripts/check-env-gitignored.sh` to catch committed `RECALL_API_KEY` and bearer token leaks.
5. Add a `--dry-run` command that produces redacted JSON/markdown report output.
6. Add `--apply`, `--recover-stale-lock`, and cap flags.
7. Validate the CLI on a restored production-like DB before enabling cron.
8. Complete SPIKE-013 and SPIKE-014 before any scheduled apply.

## Final Verdict

SPIKE-020 passes as a deployment operability design artifact. It gives the future implementation plan a concrete execution model, command contract, secret path, logging strategy, smoke checks, disable path, and rollback plan.

It does not approve production deployment. Production remains blocked until live Recall enumeration/content fidelity pass, the CLI packaging gap is fixed, and a reviewed implementation plan/runbook exists.
