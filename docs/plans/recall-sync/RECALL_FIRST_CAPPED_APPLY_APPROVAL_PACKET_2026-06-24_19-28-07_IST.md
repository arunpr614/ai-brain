# Recall First Capped Apply Approval Packet

Created: 2026-06-24 19:28 IST
Owner: Codex
Status: Ready for explicit write approval; no apply has been run
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Give Arun one no-secret, copy-safe decision packet for the first capped Recall -> AI Brain apply.

This document contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, or database rows.

## Current Evidence

Read-only live validation:

- `docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_20-03-34_IST.md`
- `docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_20-03-34_IST.md`

No-write production dry-run proof:

- `data/private/recall-live-spikes/dry-run-report.json`
- dry-run proof mtime: 2026-06-24 21:10 IST after no-write proof refresh
- dry-run proof freshness window: 120 minutes
- dry-run planned imports: 3
- dry-run writes/checkpoint advancement: 0

Backup proof:

- `data/private/recall-live-spikes/backups/recall-first-apply-20260624T134927Z.sqlite`
- backup proof mtime: 2026-06-24 21:10 IST after no-write proof refresh
- backup proof freshness window: 120 minutes
- backup integrity: `ok`
- temporary restore integrity: `ok`

Latest no-write proof refresh:

- `docs/plans/recall-sync/RECALL_FIRST_APPLY_PROOF_REFRESH_ACTUAL_EXECUTION_REPORT_2026-06-24_21-11-03_IST.md`
- refresh trigger: backup proof entered the near-expiry maintenance window under a 15-minute floor
- refresh result: `PASS_FIRST_CAPPED_APPLY_READINESS_GATE`

If approval happens after either freshness window expires, refresh the private dry-run proof and/or private backup proof before apply.

## Machine Readiness Gate

For a no-write ordered status before choosing the next first-apply command, run:

```bash
npm run recall:first-apply:status
```

This helper does not call live Recall APIs, does not refresh proof, does not apply, and does not advance any checkpoint. In the current local state before key rotation evidence is updated, it reports `blocked_key_rotation_evidence` and points to the post-rotation prepare wrapper as the next preferred command after actual key rotation. If the env-file mtime is stale after real key rotation, the prepare wrapper can record private evidence before proof refresh or apply.

Before any first capped apply command, run the consolidated no-write readiness gate:

```bash
npm run check:recall-first-apply-readiness
```

Expected verdict:

```text
PASS_FIRST_CAPPED_APPLY_READINESS_GATE
```

This gate does not approve writes. It proves that the private proof chain is still fresh and internally consistent, and it now reports local key rotation evidence as a checked gate.

The gate also prints a no-secret proof freshness countdown for the private dry-run proof and backup proof, including `freshnessRemainingMinutes`, and requires at least 5 minutes remaining by default through `minFreshnessRemainingMinutes`. If either proof falls below that floor before approval, refresh that private proof before apply.

After actual key rotation, prefer the local private env writer instead of manual editing:

```bash
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." \
npm run recall:key-rotation:write-env -- --replace-existing
```

The writer stores the rotated key only in `data/private/recall-live-spikes/recall.env`, keeps `BRAIN_RECALL_CONFIRM_LIVE_API=0`, writes owner-only mode `0600`, runs the no-live key-rotation metadata gate, and stops before proof refresh, first apply, deploy, scheduler, or checkpoint work.

Then use the preferred no-write prepare wrapper before approval/apply. It requires the same exact key rotation acknowledgement plus `BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1`, records no-secret private key-rotation evidence through the read-only auth probe if needed, delegates stale-proof refresh to the no-write ready-or-refresh wrapper, and never applies, deploys, enables the scheduler, or advances a checkpoint:

```bash
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." \
BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 \
npm run recall:first-apply:prepare-after-rotation
```

If refresh may be needed after key evidence passes, use the no-write refresh-if-needed alias as the lower-level maintenance command. It delegates to the ready-or-refresh wrapper with explicit refresh confirmation, checks local key rotation evidence before readiness, requires exact acknowledgement before live proof refresh, refreshes only on proof freshness/existence findings, and stops on failed key evidence or other non-refreshable gates:

```bash
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." \
npm run recall:first-apply:refresh-if-needed
```

If refresh is needed, use the no-write proof refresh wrapper only as the lower-level debugging command. On the real path it checks local key rotation evidence before any live Recall dry-run refresh, so it will also stop on `env_file_not_rotated_after_checkpoint` until the ignored private env file is updated after key rotation:

```bash
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." \
BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM=1 \
npm run recall:first-apply:proof-refresh
```

Then rerun `npm run check:recall-first-apply-readiness`.

## Required Approval Text

Use this exact approval if Arun wants Codex to run the first capped write:

```text
I approve the first capped Recall -> AI Brain apply for the 2026-06-16 window, capped at 5 planned imports, using the accepted live-spike proof, reviewed dry-run proof, backup proof, and explicit fidelity flags for unverified and metadata-only Recall content.
```

Approval of this packet does not approve production deploy or scheduler enablement.

## Required Key Rotation Acknowledgement

Because the Recall API key was pasted into chat during the live-validation setup, the first capped write must also confirm that the key used for apply has been rotated and stored only in the ignored private Recall env file.

Use this exact acknowledgement with the guarded wrapper:

```text
I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.
```

The wrapper refuses without this exact `BRAIN_RECALL_KEY_ROTATION_ACK` text.

## Required Local Key Rotation Evidence

Before the first capped write, the ignored private Recall env file must also show local evidence that it was updated after the key-rotation checkpoint. This check inspects only safe file metadata: path, ignored/untracked state, owner-only permissions, and modification time. It does not read or print the API key. If the env-file mtime alone cannot prove the rotation, the same gate can accept a fresh ignored, untracked, owner-only private evidence file at `data/private/recall-live-spikes/key-rotation-evidence.json`.

Run after rotating the Recall API key and writing the key through `npm run recall:key-rotation:write-env -- --replace-existing` or otherwise updating only `data/private/recall-live-spikes/recall.env`:

```bash
npm run check:recall-key-rotation-evidence
```

Expected verdict:

```text
PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE
```

The current readiness gate, proof-refresh wrapper, ready-or-refresh wrapper, and first capped apply wrapper all run this metadata gate before any live Recall refresh, apply, or DB write. If the output reports `env_file_not_rotated_after_checkpoint`, rotate the Recall API key, use the private env writer or update only the ignored private env file, and rerun the check.

If the key has been rotated outside chat and the private env file has been updated but the metadata check still reports stale env-file evidence, prefer the prepare wrapper above. Use the recorder directly only as the lower-level evidence command:

```bash
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." \
npm run recall:key-rotation-evidence:record
```

The recorder writes `data/private/recall-live-spikes/key-rotation-evidence.json` only after the exact acknowledgement and a read-only auth probe succeed. That private evidence file stores no API key, no private Recall card IDs, no private titles, no source URLs, no chunks, no raw response body, and no AI Brain rows.

## Guarded Preferred Command

Run only after the explicit approval above.

```bash
BRAIN_RECALL_SYNC_ENABLED=1 \
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." \
BRAIN_RECALL_FIRST_APPLY_APPROVAL="I approve the first capped Recall -> AI Brain apply for the 2026-06-16 window, capped at 5 planned imports, using the accepted live-spike proof, reviewed dry-run proof, backup proof, and explicit fidelity flags for unverified and metadata-only Recall content." \
npm run recall:first-capped-apply
```

The guarded wrapper:

- verifies local key-rotation evidence for the ignored private Recall env file before any live Recall call or DB write;
- passes the same key-rotation evidence requirement into the core sync CLI for the real apply path;
- reruns `npm run check:recall-first-apply-readiness` before apply;
- wrapper refuses without exact approval text;
- wrapper refuses without exact key rotation acknowledgement;
- refuses if private dry-run or backup proof is too close to expiry;
- runs the proof-backed capped apply using the current accepted live SPIKE proof, dry-run proof, backup proof, caps, date window, and explicit fidelity flags;
- runs `npm run check:recall-apply-report` on the private apply report before printing success.

Wrapper smoke coverage passed in `RECALL_FIRST_CAPPED_APPLY_WRAPPER_EXECUTION_REPORT_2026-06-24_20-26-51_IST.md`.

## Lower-Level Equivalent Command

Use this only if the wrapper itself needs debugging. It is intentionally more verbose and easier to mis-key.

The lower-level command still bypasses the wrapper's exact key-rotation acknowledgement check, so the wrapper remains preferred. It now carries the same core CLI key-rotation evidence requirement and must still be used only after the Recall API key has been rotated after chat exposure, stored only in the ignored private Recall env file, and `npm run check:recall-key-rotation-evidence` passes.

```bash
BRAIN_RECALL_SYNC_ENABLED=1 \
node --import tsx scripts/sync-recall.ts \
  --apply \
  --confirm-apply \
  --confirm-live-api \
  --env-file data/private/recall-live-spikes/recall.env \
  --require-key-rotation-evidence \
  --key-rotation-env-file data/private/recall-live-spikes/recall.env \
  --key-rotation-evidence-file data/private/recall-live-spikes/key-rotation-evidence.json \
  --key-rotated-after 2026-06-24T15:54:17.000Z \
  --require-live-spike-report-proof \
  --live-spike-enumeration-report-path docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_20-03-34_IST.md \
  --live-spike-fidelity-report-path docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_20-03-34_IST.md \
  --live-spike-manifest-path data/private/recall-live-spikes/controlled-samples.json \
  --live-spike-allow-fidelity-changes \
  --live-spike-accepted-fidelity-risk "Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used." \
  --require-dry-run-proof \
  --dry-run-report-path data/private/recall-live-spikes/dry-run-report.json \
  --dry-run-report-max-age-minutes 120 \
  --dry-run-report-max-planned-imports 5 \
  --dry-run-report-require-cards-seen \
  --require-backup-proof \
  --backup-path data/private/recall-live-spikes/backups/recall-first-apply-20260624T134927Z.sqlite \
  --backup-max-age-minutes 120 \
  --date-from 2026-06-16T00:00:00.000Z \
  --date-to 2026-06-16T23:59:59.999Z \
  --max-cards 5 \
  --max-imports 5 \
  --max-total-chars 250000 \
  --max-total-chunks 250 \
  --max-chunks-per-card 50 \
  --allow-unverified-import \
  --allow-metadata-only-import \
  --warning-ui-available \
  --output data/private/recall-live-spikes/first-apply-report.json
```

## Immediate Post-Apply Checks

After the command exits, run the post-apply report gate before any deploy or scheduler decision:

```bash
npm run check:recall-apply-report -- \
  --report data/private/recall-live-spikes/first-apply-report.json \
  --max-applied-imports 5 \
  --max-age-minutes 120 \
  --require-private-path \
  --require-cards-seen \
  --require-applied-imports \
  --allow-unverified-fidelity \
  --allow-metadata-only-fidelity
```

Expected verdict:

```text
PASS_POST_APPLY_REVIEW_GATE
```

Then inspect only aggregate/redacted state:

```bash
sqlite3 data/brain.sqlite "
SELECT mode,state,cards_seen,cards_imported,cards_upgraded,cards_skipped,cards_blocked,last_error
FROM recall_sync_runs
ORDER BY started_at DESC
LIMIT 5;

SELECT content_fidelity,sync_status,COUNT(*) AS count
FROM recall_sync_items
GROUP BY content_fidelity,sync_status
ORDER BY content_fidelity,sync_status;
"
```

Expected first-apply shape:

- `state` is `done`;
- imported plus upgraded cards is at most 5;
- blocked cards is 0;
- changed remote cards is 0;
- `PASS_POST_APPLY_REVIEW_GATE` passes on the private apply report;
- no checkpoint advancement bug or unreviewed fidelity-policy block appears;
- private apply report is written to `data/private/recall-live-spikes/first-apply-report.json`.

## Stop Conditions

Do not run apply if any of these are true:

- Arun has not explicitly approved the first capped write with the approval text above;
- the Recall API key used for apply has not been rotated after chat exposure and stored only in the ignored private Recall env file;
- exact `BRAIN_RECALL_KEY_ROTATION_ACK` text is missing from the guarded wrapper command;
- `npm run check:recall-key-rotation-evidence` does not return `PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE`;
- any lower-level apply command omits `--require-key-rotation-evidence` and the matching key-rotation env/evidence/checkpoint flags;
- dry-run proof is stale, future-dated, missing, or no longer passes `PASS_APPLY_REVIEW_GATE`;
- backup proof is stale, future-dated, missing, or fails SQLite integrity check;
- live-spike report proof no longer passes with the accepted fidelity-risk text;
- private evidence files are no longer ignored, untracked, and owner-only;
- the intended write cap, date window, or accepted fidelity flags change.

Do not deploy or enable the scheduler after a successful first apply. Those require a separate clean-run review and explicit approval.
