# Recall sync production incident: backup directory permissions

Date: 2026-07-21
Status: Production permission repair and one controlled manual recovery verified; next automatic occurrence pending
Affected release: `8c1341100b174fe4ca518e6a745c30b9078df21c`
Root-cause fix: PR `#37`, merged to `main` as `077cf7382a706218864554a149b12b4e1cfa6081`
Cleanup follow-up: PR `#38`, merged to `main` as `2564474e37ca6dc6794bfea07df4474f8f03e527`

## Impact

- The last fully validated Recall apply completed at 2026-07-12 01:32 IST.
- Nine automatic occurrences from 2026-07-13 through 2026-07-21 failed before apply.
- One owner-requested manual occurrence at 2026-07-21 19:26 IST failed at the same stage.
- Every failed occurrence committed zero imports and zero upgrades and did not advance the Recall checkpoint.
- Read-only Recall enumeration continued to work. The latest automatic dry run saw 12 pending cards, confirming provider connectivity was not the blocker.

No private card content, source URL, credential, raw response, or database row is included in this report.

## Root cause

Both automatic and manual synchronization reuse `scripts/recall-scheduled-apply.sh` under the `brain-recall` identity. After a successful dry run, that wrapper must create a WAL-safe SQLite backup in `/opt/brain/data/backups` before any apply is allowed.

The Card Processing immutable deployment path introduced this command in `f4b653d`:

```bash
install -d -m 0700 "$backup_dir"
```

A later immutable deployment therefore normalized the shared directory to owner-only access. On the affected host the resulting state was:

```text
owner=brain group=brain-data mode=2700
```

The `brain-recall` account uses `brain-data` as its primary group. It could read the production database and write private Recall reports, but it could not traverse or write the owner-only backup directory. `better-sqlite3` consequently raised `SQLITE_CANTOPEN` during `recall-first-apply-preflight.mjs`. The lifecycle finalized each occurrence as `error/internal` before apply.

The manual worker discards wrapper stdout/stderr by design, so the user received only the allowlisted failure state. The automatic service has `Restart=on-failure`; its retry found the same occurrence already terminal and exited zero. That preserved exactly-once behavior but caused the latest systemd unit result to read `success`, even though the authoritative execution row remained `error`. Timer and unit activity are therefore insufficient success signals.

## Corrective change

The shared backup-directory contract is now explicit:

```text
path=/opt/brain/data/backups
owner=brain
group=brain-data
mode=2770
```

The mutable and immutable deployment paths now:

1. normalize that owner, group, and setgid group-write mode;
2. create and remove a probe file as `brain-recall:brain-data` before continuing;
3. reject the former owner-only mode in static release checks.

The Recall tmpfiles definition also restores the contract on supported host preparation and boot paths. The directory remains restricted to the trusted `brain-data` group; it is not world-readable or world-writable.

## Production remediation

Arun explicitly authorized only the backup-directory permission repair, corrected tmpfiles rule, and no-sync verification. At 2026-07-21 20:27 IST, the operator held the existing Recall sync lock and:

1. confirmed the automatic and manual workers were inactive and no manual request was queued, claimed, or running;
2. installed the release-verified tmpfiles rule at `/etc/tmpfiles.d/brain-recall-manual-sync.conf`;
3. normalized `/opt/brain/data/backups` to `brain:brain-data` mode `2770`;
4. created and removed a probe as `brain-recall:brain-data`;
5. ran the same `better-sqlite3` backup and restore-integrity routine that had failed, then removed its proof database and sidecars.

The database quick check remained `ok`. Execution, request, run, and apply-run counts were unchanged at `13`, `3`, `46`, and `13`. The latest execution remained the failed manual occurrence, and the checkpoint remained `2026-07-11T20:02:47.350Z`. The app, daily timer, manual path, and fallback timer remained active and enabled; the next daily occurrence remained scheduled for 2026-07-22 01:34 IST. No Recall API call, sync trigger, application deployment, scheduler change, or checkpoint write occurred.

## Verification

- Sanitized production journal: every failed automatic run reached a passing dry-run review and then failed backup creation with `SQLITE_CANTOPEN`.
- Sanitized production database projection: nine automatic errors and one manual error at `terminal`, zero writes; prior validated success preserved.
- Pre-repair production identity check: `brain-recall` could access the data and private-report directories but could not access the backup directory.
- Post-repair production identity check: `brain-recall` has read, write, and traversal access to the backup directory.
- Production backup capability proof: the exact `better-sqlite3` backup routine completed, both backup and restore integrity checks returned `ok`, and all proof files were removed.
- Isolated backup rehearsal: owner-only mode failed; the corrected shared-group mode completed backup and integrity verification.
- Recall-focused tests: 69 passed.
- Manual process fixtures: six groups passed.
- Full repository suite after the cleanup regression: 895 tests across 95 suites passed.
- TypeScript, ESLint, shell syntax, Recall artifact checks, scheduler checks, release artifact smoke, and production build passed.
- Release artifact smoke now contains 53 checks and verifies the packaged tmpfiles contract.

The no-sync production proof exposed a separate cleanup defect: integrity checks could leave SQLite `-wal` and `-shm` files beside the retained backup and removed temporary restore database. The proof-specific files were removed. Twelve older restore-proof sidecars in `/tmp` predated this incident repair and were intentionally left untouched. The follow-up change removes future backup and restore sidecars and has a dedicated WAL-mode regression test.

## Controlled recovery

Arun then explicitly authorized exactly one production manual recovery sync through the existing guarded Settings path. The authorization retained the protected production credential, explicit live-API confirmation, the 20-import cap, existing fidelity policy, and conditional checkpoint movement. It continued to prohibit an application deployment, scheduler mutation, or a second manual sync.

The request was accepted once at 2026-07-21 21:35:16 IST. Durable before-and-after evidence confirms exactly one new request, one execution, one dry run, and one apply run:

| Evidence | Before | After |
|---|---:|---:|
| Manual requests | 3 | 4 |
| Executions | 13 | 14 |
| Runs | 46 | 48 |
| Apply runs | 13 | 14 |
| Library items | 129 | 147 |
| Recall mappings | 59 | 77 |

The linked dry run completed with 18 cards seen, zero writes, complete enumeration, and no blocked cards. The linked apply then completed with 18 imports, zero upgrades, zero skips, zero changed-remote cards, and zero blocked cards. Seventeen imports used the allowed `api_chunks_unverified` fidelity and one used the allowed `metadata_only` fidelity; none used `possibly_truncated`. The apply total remained below the cap of 20.

The retained 7,733,248-byte pre-apply backup passes SQLite quick and foreign-key checks. It records the old checkpoint, 129 library items, and 59 Recall mappings while the execution was at the backup stage. The live database passes the same checks and records the new checkpoint only after the successful apply. All request, execution, dry-run, and apply foreign links match, the wrapper validation timestamp equals terminal completion, and no active Recall work remains.

The Settings API returns the terminal activity as `done`, the same 18/0/0 counts, and `lastSuccessfulSyncAt=2026-07-21T16:06:16.795Z`. The production formatter renders that value as `Today, 9:36 PM IST` on the incident date.

The current deployed runtime predates PR `#38`, so this recovery backup has a zero-byte `-wal` file and a 32 KiB `-shm` file beside it. They do not affect the verified backup. They were left untouched because this recovery authorization did not include cleanup or deployment; the merged follow-up prevents future sidecars once released.

The Settings API's cached next-run snapshot reported 2026-07-22 01:38 IST, while the live unchanged systemd timer reported 2026-07-22 01:34 IST. This does not affect the required last-success timestamp or timer execution, but automatic verification must use the live timer and then refresh or investigate the stale UI schedule snapshot separately.

## Recovery boundary

The permission repair and controlled manual recovery are complete. Do not run another manual sync. The remaining incident boundary is to verify that the unchanged next automatic occurrence completes with a new `done` execution and linked validated apply run.

Do not infer recovery from an active timer or a successful latest unit result. Require a new `done` execution with `wrapper_validated_at` and its linked apply run.
