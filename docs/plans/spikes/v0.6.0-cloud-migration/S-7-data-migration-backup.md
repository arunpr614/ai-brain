# S-7: Data migration + backup + rollback

**Estimated effort:** 1 hour
**Depends on:** S-6 (need host choice to finalize disk / backup specifics)
**Produces:** a step-by-step migration runbook + an ongoing backup strategy + a rollback plan.

---

## 0. Why this spike

The current `data/brain.sqlite` on your Mac has N months of captures, enrichments, embeddings, and chat history. Losing it would be catastrophic and irrecoverable. Moving it to a cloud VM without data loss + establishing a sane backup cadence is the least glamorous but most load-bearing piece of this migration.

## 1. Questions to answer

### 1.1 One-shot migration (Mac → cloud VM)

- DB size from S-1; is it small enough to rsync in one minute? Or large enough we need a real strategy?
- Current backup cadence on the Mac: 6h snapshots in `data/backups/`. Keep this post-migration OR replace?
- Is an `sqlite3 .backup file.sqlite` + scp the simplest path?
- Are there open write transactions at migration time? Strategy: stop the Mac server, backup, copy, verify checksum, start cloud server.
- Any files beyond `brain.sqlite`? `data/errors.jsonl`, `.env`, any attached PDFs? (Check the repo for data paths.)

### 1.2 Ongoing backup on the cloud VM

Options, ordered simplest → fanciest:

- **Cron-rsync to S3 / Backblaze B2:** cheap ($0.005/GB/month on B2); standard pattern
- **Litestream:** streams SQLite WAL to S3/B2 in real time; zero-downtime restore; ~$1/month extra storage
- **VM host snapshot:** Hetzner offers volume snapshots ($0.01/GB/month); easy but ties you to the host
- **Pull-model: Mac syncs VM's `data/brain.sqlite` periodically back to your Mac:** paranoia tier but gives you offline copy

Per-option:
- Cost
- Restore time (RTO)
- Data loss window (RPO)
- Operational complexity

### 1.3 Rollback: cloud fails, revert to Mac

Scenarios:
- Cloud VM crashes / host goes down / Oracle reaps your free tier / cost spikes unexpectedly
- You decide the cloud path isn't working (performance, privacy, etc.)

Plan:
1. Stop the cloud VM (or just revoke the tunnel)
2. Download the latest backup to the Mac
3. Restart Mac's `npm run start` + `cloudflared` daemon
4. Clients keep working (same `brain.arunp.in` URL)

Target rollback time: < 1 hour.

### 1.4 The tricky bit: dual-run during migration

Option A: hard cutover — Mac stops, data copies, cloud starts. Captures in between lost. (Minutes window.)
Option B: parallel-run for one day — both running, writes go to both (how? trigger?). Complex.
Option C: snapshot + forward-replay — back up Mac's DB, start cloud with it, accept that captures made on Mac during migration window will be manually re-captured.

Option A is fine if we pick a time with zero write activity (3 AM local). Quantify the window.

### 1.5 DB file layout questions

- `better-sqlite3` uses WAL. Copying a DB with live WAL can corrupt — use `sqlite3 .backup` to flush before copy.
- `sqlite-vec`'s vector data is stored in `chunks_vec` table; included in `.backup`? (It's a virtual table backed by SQLite — yes.)
- Embeddings need regenerating? No — the chunk IDs persist; the vector data copies cleanly.
- `data/backups/` directory: copy or let the cloud start fresh? (Let it start fresh; old backups are on the Mac still.)

### 1.6 One-shot script design

A `scripts/migrate-to-cloud.sh` that:
1. Stops Mac's Brain server (or warns you to)
2. Creates a clean SQLite backup with `.backup`
3. Hashes it for integrity
4. rsync/scp to cloud
5. Hashes on cloud
6. Validates hash match
7. Reports done

## 2. Sources to consult

- `src/db/client.ts` — backup scheduler implementation; check if it writes to anywhere beyond `data/backups/`
- Existing `scripts/restore-from-backup.sh` (F-034 from v0.3.1) — sanity-check if we already have restore tooling
- Litestream docs — https://litestream.io/getting-started/
- Backblaze B2 pricing — https://www.backblaze.com/b2/cloud-storage-pricing.html
- rclone docs — if we want multi-destination (B2 + local Mac sync)
- SQLite `.backup` command docs

## 3. Output format

`docs/plans/spikes/v0.6.0-cloud-migration/S-7-MIGRATION-RUNBOOK.md`:

```markdown
# Migration Runbook

## Preconditions
- [ ] Cloud VM provisioned (S-6)
- [ ] cloudflared running on cloud VM
- [ ] Latest Mac brain.sqlite < 500 MB (from S-1)

## Migration window
Target: local time <3:00 AM>
Expected duration: <10 minutes>
Expected write activity window lost: <N minutes>

## Steps

### 1. Stop Mac server
kill $(pgrep -f "next start")

### 2. Clean-backup Mac DB
sqlite3 data/brain.sqlite ".backup data/migration-snapshot.sqlite"
sha256sum data/migration-snapshot.sqlite > data/migration-snapshot.sha256

### 3. Transfer
scp data/migration-snapshot.sqlite user@cloud:/var/lib/brain/

### 4. Verify on cloud
sha256sum /var/lib/brain/migration-snapshot.sqlite
# Must match step 2 hash

### 5. Activate on cloud
mv /var/lib/brain/migration-snapshot.sqlite /var/lib/brain/brain.sqlite
systemctl start brain

### 6. Sanity-check
curl https://brain.arunp.in/api/health → 401 (as expected)
Capture a test item via the extension → item appears

### 7. Mac server stays stopped
Confirm no double-captures; rollback plan below.

## Ongoing backup (chosen: <option>)
Runs every <N hours>; stores at <location>; keeps <retention>.

## Rollback (cloud → Mac)

1. Stop cloud server / revoke tunnel
2. Download latest backup from <location> to Mac
3. Verify hash
4. Replace Mac data/brain.sqlite
5. Start Mac server
6. Start cloudflared on Mac
7. Resume normal use

Target: < 60 min end-to-end.
```

## 4. Success criteria

- [ ] Full migration runbook with concrete commands
- [ ] Backup option chosen with rationale
- [ ] Rollback plan tested in theory (walk-through against current code)
- [ ] Migration window + expected data loss quantified
- [ ] Hash-based integrity check included

## 5. Open questions for the user

1. **Migration timing** — pick a specific time window (~3 AM local) that's genuinely idle for your capture pattern
2. **Backup destination preference** — Backblaze B2 (cheapest), AWS S3 (familiar), local-Mac-sync (most-paranoid)?
3. **Are you OK losing ~10 minutes of potential captures during the cutover?** (Probably yes, since you'll know it's happening; can avoid captures during the window.)

## 6. Execution note

This is a runbook spike, not a benchmark. The output is a checklist. Don't over-engineer — you're doing this once.
