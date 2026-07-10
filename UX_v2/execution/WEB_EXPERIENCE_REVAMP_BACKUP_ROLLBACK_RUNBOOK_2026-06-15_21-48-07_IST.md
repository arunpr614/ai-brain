# Web Experience Revamp Backup And Rollback Runbook

**Created:** 2026-06-15 21:48:07 IST
**Status:** Phase 1 gate artifact. Verify host-specific commands before deploy.

## Predeploy Backup

`scripts/deploy.sh` does not create a database backup. Run backup manually before deployment:

```bash
TS=$(date +%Y%m%d-%H%M%S)
ssh brain "sudo mkdir -p /opt/brain/data/backups"
ssh brain "sudo cp /opt/brain/data/brain.sqlite /opt/brain/data/backups/web-revamp-predeploy-${TS}.sqlite"
ssh brain "sudo chown brain:brain /opt/brain/data/backups/web-revamp-predeploy-${TS}.sqlite"
ssh brain "sudo -u brain sqlite3 /opt/brain/data/backups/web-revamp-predeploy-${TS}.sqlite 'PRAGMA integrity_check;'"
ssh brain "sudo -u brain sqlite3 /opt/brain/data/brain.sqlite 'SELECT COUNT(*) AS item_count FROM items;'"
```

Record in the release packet:

- Backup path.
- Timestamp.
- Integrity result.
- Production item count before deploy.
- File size if available.

## Deploy Command

Expected deploy command:

```bash
scripts/deploy.sh
```

The script runs local gates, builds, syncs to Hetzner, restarts `brain`, performs authenticated health, checks remote providers, and checks Telegram webhook reachability.

## Code Rollback

If UI release fails before data mutation:

1. Revert or checkout the previous known-good code commit.
2. Re-run static gates.
3. Deploy previous known-good source using `scripts/deploy.sh`.
4. Smoke `/unlock`, `/library`, `/ask`, `/capture`, `/settings/device-pairing`, `/offline.html`, `/ai-memory-logo.png`.

## Database Rollback

Only use if data/schema changes or production mutations create a data problem. Hetzner-only restore:

```bash
ssh brain "sudo systemctl stop brain"
ssh brain "sudo -u brain /opt/brain/scripts/restore-from-backup.sh /opt/brain/data/backups/<snapshot>.sqlite"
ssh brain "sudo systemctl start brain"
ssh brain "sudo systemctl status brain --no-pager"
```

Post-restore checks:

```bash
ssh brain "sudo -u brain sqlite3 /opt/brain/data/brain.sqlite 'PRAGMA integrity_check;'"
ssh brain "sudo -u brain sqlite3 /opt/brain/data/brain.sqlite 'SELECT COUNT(*) AS item_count FROM items;'"
curl -fsS https://brain.arunp.in/offline.html >/dev/null
curl -fsS https://brain.arunp.in/ai-memory-logo.png >/dev/null
```

## Rollback Smoke Route List

- `/unlock`
- `/library` with authenticated session
- `/search`
- `/items/[id]`
- `/ask`
- `/capture`
- `/settings`
- `/settings/device-pairing`
- `/offline.html`
- `/manifest.webmanifest`
- `/ai-memory-logo.png`

## No-Go Conditions

Do not deploy without:

- Verified backup path and integrity result.
- Known rollback command.
- Passing build/typecheck/tests.
- Known data-risk status.
- Authenticated browser smoke plan.
- Live-smoke access path.
