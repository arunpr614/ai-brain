# Recall sync production incident: backup directory permissions

Date: 2026-07-21
Status: Root cause confirmed; code fix verified locally; production repair and live recovery run not yet authorized
Affected release: `8c1341100b174fe4ca518e6a745c30b9078df21c`
Fix branch: `codex/fix-recall-sync-backup-permissions`

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

## Verification

- Sanitized production journal: every failed automatic run reached a passing dry-run review and then failed backup creation with `SQLITE_CANTOPEN`.
- Sanitized production database projection: nine automatic errors and one manual error at `terminal`, zero writes; prior validated success preserved.
- Production identity check: `brain-recall` can access the data and private-report directories but cannot access the current backup directory.
- Isolated backup rehearsal: owner-only mode failed; the corrected shared-group mode completed backup and integrity verification.
- Recall-focused tests: 69 passed.
- Manual process fixtures: six groups passed.
- Full repository suite: 894 tests across 95 suites passed.
- TypeScript, ESLint, shell syntax, Recall artifact checks, scheduler checks, release artifact smoke, and production build passed.
- Release artifact smoke now contains 53 checks and verifies the packaged tmpfiles contract.

## Recovery boundary

No production file permission, unit, timer, database, checkpoint, Recall API, or application release was changed during diagnosis. Recovery requires a separately authorized production change.

After authorization, the operator must:

1. apply the `brain:brain-data` / `2770` directory contract and install the updated tmpfiles rule;
2. verify the effective `brain-recall` identity can create and remove a probe in the backup directory;
3. confirm the app, daily timer, manual path, fallback timer, database integrity, and prior validated success remain unchanged;
4. obtain the separately required live-sync authorization before triggering a manual apply;
5. validate the new execution, apply report, imported counts, checkpoint behavior, and next automatic occurrence without exposing private data.

Do not infer recovery from an active timer or a successful latest unit result. Require a new `done` execution with `wrapper_validated_at` and its linked apply run.
