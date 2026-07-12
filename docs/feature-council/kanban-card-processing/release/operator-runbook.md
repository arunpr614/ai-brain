# Kanban Card Processing — operator runbook

**Audience:** AI Brain production operator
**Authority:** `release-plan.md` and `rollback-plan.md`
**Safety:** Production-write procedure. Run only with an approved merged main SHA and its GitHub-attested artifact. Never paste secret values into logs or committed files.

## 1. Required inputs

- Candidate artifact directory downloaded from the successful protected-main `Product CI` run.
- For the first immutable cutover, a known-good artifact directory produced by `workflow_dispatch` from the approved pre-feature main ancestor.
- Authenticated GitHub CLI access capable of reading private artifact attestations.
- SSH access through the configured `brain` host.
- Exact candidate/known-good application SHAs, builder SHAs, and installed release IDs recorded in the private release record. A same-build candidate uses `<app-sha>`; a known-good runtime overlaid with current release tooling uses `<app-sha>-<builder-sha>` so failed evidence is never overwritten or ambiguously reused.

The deployment refuses PR artifacts, self-consistent but unattested archives, self-hosted provenance, the wrong repository/workflow/ref/source SHA, multiple archives in one directory, renamed files, non-Linux Node ABI 127 artifacts, or bootstrap tools whose bytes differ from the attested manifest.

## 2. Production configuration gate

Before candidate activation, `/etc/brain/.env` must contain:

- the existing canonical absolute `BRAIN_DB_PATH`;
- existing `BRAIN_API_TOKEN` and application secrets;
- `BRAIN_PUBLIC_ORIGIN=https://brain.arunp.in`;
- a valid `BRAIN_OWNER_TIMEZONE` IANA name;
- a dedicated `BRAIN_PROCESSING_HMAC_SECRET` containing exactly 64 hexadecimal characters and differing from `BRAIN_API_TOKEN`;
- `PROCESSING_READ_ENABLED=0`;
- `PROCESSING_WRITE_ENABLED=0`;
- `PROCESSING_NAV_ENABLED=0`;
- optional `BRAIN_PROCESSING_WRITE_RATE_LIMIT=60` (accepted range 1–600).

Edit the root-owned EnvironmentFile through the normal private operator path. Do not print it. The deploy preflight validates configuration without emitting secret values.

## 3. Build and download the two artifacts

1. Merge the reviewed PR through normal branch protection.
2. Wait for `Product CI` on protected `main` to pass and attest the candidate.
3. Run the workflow manually with the exact pre-feature known-good main SHA if the server does not yet have `/opt/brain/current`.
4. Download each artifact bundle into its own private local directory.
5. Keep the `.tar.gz`, `.manifest.json`, and `.sha256` files together and unchanged.

The known-good workflow verifies that its application SHA is an ancestor of current main, builds/tests that commit on Linux, restores the exact content-hashed historical `018_topics.sql` identity already present in production, overlays the attested current activation/readiness tools, and records application SHA separately from builder SHA.

## 4. Dark deployment

From the merged main checkout, run:

```bash
npm run deploy:immutable -- /private/path/candidate-artifact /private/path/known-good-artifact
```

For later deployments after the immutable current link already exists, the known-good directory is optional.

The command performs, in order:

1. local checksum, filename, ABI, attestation, source/ref/workflow, and bootstrap-tool verification;
2. remote architecture, runtime, environment, canonical database path, device/inode, stable HMAC, origin, timezone, and dark-flag checks;
3. free-space check;
4. a SQLite online backup of the exact bound database, checksum, quick/FK check, and isolated restore proof;
5. known-good installation/health proof for the first immutable cutover;
6. private transfer through a random owner-only directory and staging of the exact builder tool set without advancing the global tool pointer;
7. bounded regular-file-only archive validation and extraction as the unprivileged `brain` user;
8. exact runtime file, migration, native dependency, Node ABI, and applied migration compatibility verification;
9. immutable installation, full system-state snapshot, atomic current-link switch, unit reload, service restart, timer state, and bounded authenticated health with permanent auth failures rejected immediately;
10. migration 025 application, exact applied hash recording, durable-root writability and startup-backup proof, absence of runtime-local data, deep readiness/config audit, timer verification, external health, Telegram 401 boundary check, and only then atomic promotion of the verified builder tool set.

Any failure after cutover automatically restores the previous symlink, release environment, service/audit unit files, timer enable/active state, and application service; rollback is authenticated-health verified before the deploy returns failure. Failed candidate directories remain immutable evidence and can be retried only through the verified switch path.

## 5. Dark-state evidence

Do not enable reads unless all are true:

- candidate and known-good provenance passed;
- the backup record includes checksum, size, source-path hash, and source device/inode;
- authenticated health is 200;
- `processing-readiness-prod.mjs audit --require-ready --require-production-config` is green for the candidate SHA and migration manifest;
- quick check is `ok` and foreign-key check is empty;
- missing initialization and projection/history mismatch counts are zero;
- the six-hour audit timer is enabled and active;
- Processing flags are still all zero.

Save only content-free command results in the private release evidence record.

## 6. Staged enablement

Change one stage at a time through the root-owned EnvironmentFile, restart `brain`, run the strict audit, and observe before continuing.

### Stage A — owner reads

- Set `PROCESSING_READ_ENABLED=1` only.
- Keep writes/navigation at zero.
- Verify session-only summary/items/groups/filters/timezone/workflow reads, bearer-negative responses, private/no-store headers, exact counts, and no stale-zero failure state.
- Observe one 15-minute window with journal/audit/health clean.

### Stage B — owner writes

- Set `PROCESSING_WRITE_ENABLED=1`; keep navigation zero.
- Use a direct private Processing URL.
- Preview and confirm a small bounded legacy enrollment.
- Exercise CAS conflict, replay/outcome lookup, Move, Done, Archive, Restore, Reprocess, and timed/permanent reversal paths.
- Verify origin-negative, streamed-oversize 413, rate-limit 429, private headers, exact event/receipt/version effects, and two clean 15-minute windows.

### Stage C — navigation

- Set `PROCESSING_NAV_ENABLED=1`.
- Verify desktop navigation, mobile More, Library summary, command palette, capture feedback, item detail/notes independence, browser Back/Forward context, 320/390 layouts, and dark/light behavior.
- Complete the browser/design/accessibility task matrix before declaring release acceptance.

Do not skip directly to all three flags. A failed stage returns to the last proven flag state.

## 7. Live synthetic journey and cleanup

Create one clearly synthetic source through a normal authenticated capture path. Record only its generated IDs and timestamps in the private mode-0600 release evidence file. Verify:

1. capture enters Inbox exactly once;
2. Process next ordering and focus;
3. Move to To Do, In Progress, and Done;
4. Archive, Restore to Done, Reprocess to Inbox, and Undo/permanent reversal;
5. exact four-state counts and Today/week metric deltas;
6. Library/detail/search/Ask/Review behavior remains independent;
7. every private response header and bearer/origin negative;
8. hard delete removes the synthetic item and cascades its workflow events/receipts/slots;
9. no synthetic row or orphan remains.

Cleanup failure is an automatic no-go.

## 8. Rollback

Use the least destructive option:

1. Set navigation, writes, and reads to zero; restart and verify core Library/capture/Ask health.
2. Run a forward repair and strict audit if data is intact.
3. For code rollback, use the exact installed known-good release ID reported by activation through `/opt/brain/release-tools/current/switch-release.sh` with the explicit schema-025 compatibility guard. Keep flags zero. The switch tool verifies that the release ID exactly matches the manifest's application/builder identity.
4. Snapshot restore is last resort only after stopping writers and accounting for every post-backup capture/workflow mutation that would be lost.

Never delete an immutable release to make a retry work. Never revert migration 025 or remove its raw initialization guard while an older runtime can still write captures.

## 9. Completion evidence

The release record must include:

- merged PR and protected-main SHA;
- CI run and attestation verification;
- candidate/known-good artifact SHAs, builder SHAs, and installed release IDs;
- bound backup proof;
- migration/readiness outputs;
- staged flag timestamps and observation results;
- live journey and cleanup IDs/results without content;
- browser/design/accessibility evidence;
- rollback rehearsal result;
- deployed application SHA;
- repository documentation commit and published GitHub Wiki commit/hash.

Only after every item is verified may the feature and persistent goal be marked complete.
