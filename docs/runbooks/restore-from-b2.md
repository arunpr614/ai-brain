# Restore from B2 — disaster recovery runbook

| Field | Value |
|---|---|
| **Runbook version** | 1.0 |
| **Date created** | 2026-06-02 |
| **Audience** | Arun (operator) — non-technical, full AI-assist. Also future-you on a brand-new machine with no AI help. |
| **Covers** | Recovering AI Brain from a Backblaze B2 backup when the Mac and/or Hetzner state is gone. |
| **Related plan** | [`docs/plans/v0.6.2-backup-only.md`](../plans/v0.6.2-backup-only.md) |

---

## How to use this document

- **You drive every step.** This runbook is designed to work without an AI agent in the loop. The whole point is that future-you can run it solo on a fresh Mac.
- **Every command is copy-paste-able as written.** No placeholders to fill in unless flagged with `<…>`.
- **Don't skip the "verify escrow" runbook before you ever need a real restore.** A backup system whose recovery path has never been tested is not a backup system.
- **Two runbooks below.**
  - **Runbook 1 — Verify escrow** (~15 min). Run this once now, while the Mac still has the working GPG key. Catches a bad 1Password paste while it's still cheap to fix. Repeat once a year.
  - **Runbook 2 — Real restore** (~45 min). Run this only when you actually need to recover. Mac is gone, Hetzner is gone, or both.

---

## What you need before either runbook

| Asset | Where it lives | What it looks like |
|---|---|---|
| **1Password account** | Apple ID + your master password | Whatever device you signed in with |
| **`Brain — secrets` vault item** | Inside 1Password | Has 4 fields starting with `gpg.` |
| **B2 account credentials** | 1Password (or Backblaze account login) | `B2_KEY_ID`, `B2_APPLICATION_KEY`, bucket name `ai-brain-backups-arunpr614` |
| **A working machine** | Any Mac or Linux box | Needs internet + ability to install `gpg` and `rclone` |

If you can't get into 1Password, **stop**. Recovery is impossible without it. The rest of this doc assumes 1Password access.

---

# Runbook 1 — Verify escrow (~15 min)

**Goal:** prove the 1Password armored private key + passphrase actually decrypt a real B2 backup, using a clean GPG keyring that has never seen the working Mac key.

**Run frequency:** once now, then yearly. Set a calendar reminder.

## Step 1 — Open a fresh, isolated GPG home

```bash
GNUPGHOME_TEST=$(mktemp -d -t gpg-escrow-XXXX)
chmod 700 "$GNUPGHOME_TEST"
echo "Test GPG home: $GNUPGHOME_TEST"
```

This makes a per-user temp directory under `/var/folders/...` (macOS) or `/tmp/...` (Linux), mode 700. The working Mac key in `~/.gnupg/` is untouched and **invisible** to the test.

## Step 2 — Get the private key out of 1Password

1. Open 1Password → `Brain — secrets`.
2. Find the field `gpg.private_key.armored`.
3. Click the field to reveal it. Verify it starts with `-----BEGIN PGP PRIVATE KEY BLOCK-----` and ends with `-----END PGP PRIVATE KEY BLOCK-----`. **If either delimiter is missing or has stray text after it, the paste was corrupted — fix the 1Password copy from the working Mac before continuing.**
4. Copy the entire field to clipboard.
5. In Terminal:

```bash
pbpaste > /tmp/escrow-private.asc
```

(On Linux, use `xclip -o > /tmp/escrow-private.asc` or paste into a heredoc.)

## Step 3 — Get the passphrase out of 1Password

1. In the same `Brain — secrets` item, find the field `gpg.passphrase`.
2. Reveal and copy.
3. Paste into a temp file (NOT the command line — see why in the gotchas below):

```bash
cat > /tmp/escrow-passphrase << 'EOF'
PASTE_THE_PASSPHRASE_HERE_THEN_DELETE_THIS_LINE_AND_KEEP_THE_NEXT_LINE_BLANK
EOF
```

Open the file in any editor (`nano /tmp/escrow-passphrase` or `code /tmp/escrow-passphrase`) and replace the placeholder line with the actual passphrase. Save. The file should contain exactly one line — the passphrase — with no leading or trailing whitespace.

`chmod 600 /tmp/escrow-passphrase` to lock it down.

## Step 4 — Import the key into the isolated GPG home

```bash
GNUPGHOME="$GNUPGHOME_TEST" gpg --batch --import /tmp/escrow-private.asc
```

Expected output: `gpg: key BC1CCA584E82D84B: secret key imported`. Anything else (e.g., "no valid OpenPGP data") means the armored block in 1Password is corrupted — fix it before relying on this for real recovery.

## Step 5 — Pull a real encrypted backup from B2

You need rclone configured. Two paths:

**Path A — Hetzner is reachable (faster):**

```bash
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  'rclone lsf b2:ai-brain-backups-arunpr614 | sort | tail -1' \
  | tee /tmp/escrow-latest.txt

LATEST=$(cat /tmp/escrow-latest.txt)
ssh -i ~/.ssh/ai_brain_hetzner brain@204.168.155.44 \
  "rclone cat b2:ai-brain-backups-arunpr614/$LATEST" \
  > /tmp/escrow-test.gpg

ls -lh /tmp/escrow-test.gpg
```

**Path B — Hetzner is gone (real-Mac-loss simulation):**

Configure rclone on the local machine with B2 credentials from 1Password. See `docs/runbooks/restore-from-b2.md` Runbook 2 Step 2 for the rclone config commands. Then:

```bash
rclone lsf b2:ai-brain-backups-arunpr614 | sort | tail -1 | tee /tmp/escrow-latest.txt
LATEST=$(cat /tmp/escrow-latest.txt)
rclone copy "b2:ai-brain-backups-arunpr614/$LATEST" /tmp/
mv "/tmp/$LATEST" /tmp/escrow-test.gpg
```

For this verify runbook, Path A is fine — we're testing the GPG escrow, not the rclone-from-scratch path.

## Step 6 — Decrypt with the isolated key + escrow passphrase

```bash
GNUPGHOME="$GNUPGHOME_TEST" gpg \
  --batch --pinentry-mode loopback \
  --passphrase-file /tmp/escrow-passphrase \
  --decrypt /tmp/escrow-test.gpg \
  2> /tmp/escrow-gpg.stderr \
  > /tmp/escrow-test.sqlite
```

Notes:
- `--passphrase-file` reads the passphrase from disk so it never appears in `ps aux` or `~/.zsh_history`. Do NOT use `--passphrase '<string>'` on the command line.
- stderr goes to a separate file. **Do not** use `2>&1` — it would corrupt the binary stdout.
- Expected stderr: one or two lines about "encrypted with rsa4096 key, ID …". If you see "decryption failed: bad passphrase", the 1Password passphrase paste has a typo or trailing whitespace.

## Step 7 — Sanity-check the decrypted file

```bash
ls -lh /tmp/escrow-test.sqlite                     # should be a few MB, not zero
file /tmp/escrow-test.sqlite                       # should say "SQLite 3.x database"
sqlite3 /tmp/escrow-test.sqlite 'select count(*) from items'
sqlite3 /tmp/escrow-test.sqlite 'select count(*) from chunks'
```

The row counts should be plausible (i.e., > 0 and roughly matching what the live system has). If you don't have a working live system to compare to (real disaster scenario), as long as `select count(*) from items` returns a positive integer, the restore is valid.

## Step 8 — Cleanup

```bash
rm -P /tmp/escrow-private.asc \
      /tmp/escrow-passphrase \
      /tmp/escrow-test.gpg \
      /tmp/escrow-test.sqlite \
      /tmp/escrow-gpg.stderr \
      /tmp/escrow-latest.txt

rm -rf "$GNUPGHOME_TEST"
unset GNUPGHOME_TEST
```

`-P` overwrites file bytes before unlinking on macOS (no-op on Linux but harmless). The temp GPG home is removed entirely along with the imported key.

## Step 9 — Mark verified

Put a note in 1Password `Brain — secrets`: `escrow.last_verified` = today's date. This becomes the "when did we last prove recovery works" audit trail. Repeat yearly.

## Pass / fail summary

| Result | What to do |
|---|---|
| All steps green, sqlite count > 0 | Escrow verified. Update 1Password `escrow.last_verified`. v0.6.2 is genuinely done. |
| Step 4 fails ("no valid OpenPGP data") | Re-export from working Mac and re-paste into 1Password. The armored block is corrupted (likely truncation or extra whitespace). |
| Step 6 fails ("bad passphrase") | The passphrase string in 1Password has a typo or whitespace issue. Re-copy from the source you used during T-G. |
| Step 6 fails ("no secret key") | The wrong armored block is in the field — probably the public key, not the private key. The private block has `PRIVATE KEY` in the delimiters. |
| Step 7 returns garbage / sqlite errors | Decrypt path corruption — most likely cause is `2>&1` instead of separate stderr redirect. Re-read step 6 carefully. |

---

# Runbook 2 — Real restore (~45 min)

**Goal:** rebuild a working AI Brain from a B2 backup when Hetzner and/or Mac are gone. Either restore to a new Hetzner box (preferred) or a fresh Mac for read-only access.

**When to run:** Hetzner is unreachable for > 24h, or hardware loss, or any "I need my data back" scenario.

## Step 1 — Install prerequisites on the recovery machine

macOS:
```bash
brew install gnupg rclone sqlite
```

Ubuntu/Debian:
```bash
sudo apt update && sudo apt install -y gnupg sqlite3
curl https://rclone.org/install.sh | sudo bash
```

## Step 2 — Configure rclone for B2

Get `B2_KEY_ID` and `B2_APPLICATION_KEY` from 1Password (`Brain — secrets`, fields `b2.key_id` and `b2.application_key` — or wherever you stored them; if not in 1Password, log into Backblaze and create a new app key).

```bash
read -s -p "B2 Key ID: " B2_KEY_ID && echo
read -s -p "B2 App Key: " B2_APPLICATION_KEY && echo
rclone config create b2 b2 account "$B2_KEY_ID" key "$B2_APPLICATION_KEY" --non-interactive
unset B2_KEY_ID B2_APPLICATION_KEY
```

Verify:
```bash
rclone lsd b2:                                          # should list ai-brain-backups-arunpr614
rclone lsf b2:ai-brain-backups-arunpr614 | sort | tail -3
```

## Step 3 — Import the GPG private key from 1Password

Same as Runbook 1 steps 2 + 3 + 4, but you can skip the isolated `GNUPGHOME` — on a fresh recovery machine, your default `~/.gnupg/` IS the recovery keyring.

```bash
pbpaste > /tmp/restore-private.asc                       # macOS, after copying from 1Password
gpg --batch --import /tmp/restore-private.asc
rm -P /tmp/restore-private.asc
```

Save the passphrase to a temp file as in Runbook 1 Step 3 — `/tmp/restore-passphrase`, mode 600.

## Step 4 — Download the latest backup

```bash
LATEST=$(rclone lsf b2:ai-brain-backups-arunpr614 | sort | tail -1)
echo "Latest backup: $LATEST"
rclone copy "b2:ai-brain-backups-arunpr614/$LATEST" /tmp/
mv "/tmp/$LATEST" /tmp/restore.gpg
ls -lh /tmp/restore.gpg
```

## Step 5 — Decrypt

```bash
gpg --batch --pinentry-mode loopback \
    --passphrase-file /tmp/restore-passphrase \
    --decrypt /tmp/restore.gpg \
    2> /tmp/restore-gpg.stderr \
    > /tmp/restore.sqlite

ls -lh /tmp/restore.sqlite
file /tmp/restore.sqlite                                # should say "SQLite 3.x database"
sqlite3 /tmp/restore.sqlite 'select count(*) from items'
```

Same `2>file > out` rule as Runbook 1. Never `2>&1` for binary stdout.

## Step 6 — Choose recovery target

**Option A — restore to a new Hetzner box (full service recovery):**

1. Provision a new Hetzner VM (CCX13 or similar, Ubuntu 24.04).
2. Re-run the cutover provisioning (see `docs/plans/v0.6.0-cloud-migration.md` and `docs/plans/spikes/v0.6.0-cloud-migration/S-7-MIGRATION-RUNBOOK.md`). Skip the data migration step.
3. `scp /tmp/restore.sqlite root@<new-hetzner>:/opt/brain/data/brain.sqlite`.
4. `chown brain:brain /opt/brain/data/brain.sqlite`.
5. `systemctl start brain`.
6. Update Cloudflare DNS / tunnel config to point `brain.arunp.in` at the new tunnel UUID.
7. Reinstall rclone + redo escrow + re-deploy `scripts/backup-offsite.sh` + `scripts/deploy/brain-backup.cron` (Hetzner state is gone; the GPG public key needs to be on the new box).

**Option B — read-only access on Mac (data triage only):**

```bash
sqlite3 /tmp/restore.sqlite
```

Run queries directly. Useful for "I need to look up one specific note while I figure out option A."

## Step 7 — Cleanup

```bash
rm -P /tmp/restore-passphrase /tmp/restore.gpg /tmp/restore-gpg.stderr
# Keep /tmp/restore.sqlite until it's safely deployed
```

If you imported the GPG key on a recovery machine that won't be your permanent setup, also remove it:
```bash
gpg --delete-secret-keys BC1CCA584E82D84B
gpg --delete-keys BC1CCA584E82D84B
```

---

## Common gotchas

| Symptom | Cause | Fix |
|---|---|---|
| `gpg: decryption failed: No secret key` | Wrong key imported, or empty keyring. | Re-check Runbook 1 Step 4 output. The hex ID `BC1CCA584E82D84B` must appear. |
| `gpg: decryption failed: bad passphrase` | Passphrase typo, trailing whitespace, or wrong field copied from 1Password. | `cat /tmp/escrow-passphrase` and visually verify. Try with `--passphrase` (one-shot only, never in a saved script) to rule out file-encoding issues. |
| `sqlite3: file is not a database` | Decrypt corruption — almost always `2>&1` redirect. | Re-run with `2>/tmp/err.log > /tmp/out.sqlite`. |
| `rclone: command not found` after Hetzner restore | rclone install on the new box was skipped. | `curl https://rclone.org/install.sh \| sudo bash`. |
| Latest blob in B2 is hours old | Cron didn't fire, or B2 lifecycle pruned old blobs. | Use the next-most-recent. Backup cadence is 6h; data loss window ≤ 6h is the design target. |
| `Brain — secrets` 1Password item not found on a new device | You're signed into the wrong 1Password account. | Check Apple ID, family-vs-personal account, etc. |

## Why this design

- **Two-wall escrow:** 1Password account access (wall 1) + passphrase string (wall 2). An attacker needs both to use the escrow copy.
- **Public key only on Hetzner:** the encryption side needs no secret material. If Hetzner is compromised, an attacker can write garbage backups but cannot read existing ones.
- **B2 cleartext-free:** every blob in B2 is gpg-encrypted to a key that exists nowhere on the server. Backblaze itself cannot read backups.
- **Offline-capable:** this runbook does not depend on `brain.arunp.in`, the Hetzner box, or any AI agent. It works with 1Password + a B2-reachable internet connection + a Mac or Linux box.

## What this runbook does NOT cover

- **Restoring Cloudflare tunnel state** — handled separately in cutover docs.
- **Restoring `data/errors.jsonl`** — out of scope for v0.6.2; only `data/brain.sqlite` is replicated.
- **Restoring APK artifacts** — re-buildable from source; not backed up.
- **Restoring Android device pairings** — re-pair with a fresh QR code from `/settings/device-pairing`.
