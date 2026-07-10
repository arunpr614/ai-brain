# Recall Daily Snapshot Import - Production Runbook

Created: 2026-06-24 10:47 IST
Status: Drafted and locally validated for offline safety; live execution blocked pending API approval and controlled samples
Related PRD: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V2_2026-06-24_10-16-19_IST.md`
Related plan: `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V2_2026-06-24_10-21-46_IST.md`

## Non-Negotiable Gates

Do not run production apply or enable scheduling until every item below is true:

1. Private controlled sample manifest validates with six sample cards plus one outside-window negative control.
2. SPIKE-013 live REST enumeration passed against controlled Recall cards.
3. SPIKE-014 live content fidelity passed and policy was accepted.
4. Production deploy includes `scripts/sync-recall-prod.mjs`, `scripts/db/migrations/`, `scripts/check-recall-key-rotation-evidence.mjs`, `scripts/check-recall-live-spike-reports.mjs`, `scripts/check-recall-public-privacy.mjs`, `scripts/check-recall-public-manifest-privacy.mjs`, `scripts/lib/recall-controlled-samples.mjs`, `scripts/check-recall-dry-run-report.mjs`, `scripts/recall-first-apply-preflight.mjs`, and `scripts/restore-from-backup.sh`.
5. Production dry-run completed with redacted report reviewed and `PASS_APPLY_REVIEW_GATE` recorded.
6. Fresh SQLite backup exists and has backup plus temp-restore integrity proof.
7. The Recall API key used for apply has been rotated after chat exposure and key-rotation evidence passes.
8. First apply cap is explicitly approved, default `--max-imports 5`.
9. Rollback command is copied into the release note or incident note before apply.
10. `BRAIN_RECALL_SYNC_ENABLED=1` is set only for the approved apply/scheduler window.

## Secret Handling

Required production env vars:

```bash
RECALL_API_KEY=<stored in /etc/brain/.env; never printed>
BRAIN_RECALL_SYNC_ENABLED=0
BRAIN_RECALL_REQUIRE_KEY_ROTATION_EVIDENCE=1
BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=1
BRAIN_RECALL_REQUIRE_BACKUP_PROOF=1
```

Rules:

- Store the Recall API key in `/etc/brain/.env` on Hetzner, owned by `root:brain`, mode `640`.
- Do not commit real Recall payloads, API responses, titles, source URLs, chunks, or API keys.
- Public reports must use redacted output only.
- Private raw evidence, if ever needed, goes under ignored `data/private/recall-live-spikes/`.

## Schema Smoke

Run after deploy, before live dry-run:

```bash
ssh brain "cd /opt/brain && sudo -u brain sqlite3 data/brain.sqlite \"
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('recall_sync_items','recall_sync_runs','recall_sync_state');
PRAGMA table_info(recall_sync_runs);
\""
```

Expected:

- all three Recall sync tables exist;
- `recall_sync_runs` includes `state`, `report_json`, `cards_upgraded`, and `cards_changed_remote`;
- `items.capture_source` accepts `recall`.

## Live Spike Commands

Before live access on the operator machine:

```bash
npm run check:recall-private-ignore
npm run check:recall-prelive
```

Use the no-secret approval checklist before creating private values or running live probes:

```text
docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_CHECKLIST_2026-06-24_14-00-43_IST.md
```

Review the no-secret controlled sample setup guide before choosing live sample cards:

```bash
npm run recall:controlled-samples:guide
```

After the private controlled sample manifest is populated:

```bash
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run recall:live-gate:require-ready -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

For the ignored local-env credential option, create the empty private env template before filling a key locally after approval:

```bash
npm run recall:env:init
```

Keep `data/private/recall-live-spikes/recall.env` under `data/private/recall-live-spikes/`, ignored, untracked, and owner-only (`0600`). The live-gate status command blocks readiness when the env file is outside that private Recall evidence path, not ignored/untracked, or has group/other permissions.

Expected:

- Recall private evidence path check reports `ok: true`;
- SPIKE-013 fixture-backed report verdict is `CLEAR`;
- SPIKE-014 fixture-backed report verdict is `PROCEED-WITH-CHANGES`;
- manifest-driven runner rehearsal passes without `RECALL_API_KEY`;
- no-manifest `check:recall-prelive` may pass offline setup but does not enforce controlled sample validation; it must report a redacted `defaultManifest` status when the default manifest exists, and live API access still requires the manifest-enforced command;
- pre-live child-command `stdoutPreview` and `stderrPreview` fields redact private manifest values, Recall API-key-shaped strings, and bearer tokens;
- controlled sample manifest reports `ok: true` with six required labels and an outside-window negative control;
- controlled sample manifest file is under the ignored private path, untracked, and owner-only (`0600`);
- controlled sample manifest keeps public report booleans false because public SPIKE reports are redacted-only;
- ignored local env file, if used, is under `data/private/recall-live-spikes/`, ignored, untracked, and has secure owner-only permissions;
- `recall:live-gate:status` returns `ok: false` for every not-ready status and `ok: true` only when `readyForApprovedLiveSpikes` is true with status `ready_for_approved_live_spikes`;
- `recall:live-gate:require-ready` prints the same live-gate JSON and exits nonzero unless `ready_for_approved_live_spikes` is reached;
- scheduler artifacts remain disabled and guarded;
- the packaged production Recall CLI builds and passes bundled dry-run/apply smoke;
- no live `RECALL_API_KEY` is required.

Preferred combined live spike command:

```bash
ssh brain "cd /opt/brain && sudo -u brain bash -lc '
set -a; source /etc/brain/.env; set +a
npm run recall:live-spikes -- \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --report-dir docs/plans/spikes \
  --confirm-live-api
'"
```

Approved live reports must stay under `docs/plans/spikes`; the runner refuses live report directories outside that public SPIKE report path. Use temporary report directories only for fixture rehearsal.

The runner validates the manifest, requires explicit live API confirmation, runs SPIKE-013, runs SPIKE-014, writes dated public Markdown reports, and scans those generated reports for public privacy leaks.

Use the direct commands below only for one-off debugging or a narrower rerun after the combined runner identifies a failure.

SPIKE-013 enumeration:

```bash
ssh brain "cd /opt/brain && sudo -u brain bash -lc '
set -a; source /etc/brain/.env; set +a
node --import tsx scripts/spikes/recall-rest-enumeration.ts \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --write-report \
  --report-path docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md
'"
```

The manifest supplies the date window, six positive card IDs, outside-window negative card ID, and private title checks.

SPIKE-014 content fidelity:

```bash
ssh brain "cd /opt/brain && sudo -u brain bash -lc '
set -a; source /etc/brain/.env; set +a
node --import tsx scripts/spikes/recall-content-fidelity.ts \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  --max-chunks 50 \
  --write-report \
  --report-path docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md
'"
```

The manifest supplies the six live card IDs and adds public sample labels to the redacted output.

Do not add title/source URL exposure flags for public SPIKE reports. The combined live workflow is redacted-only.

Validate the generated live spike reports before any production dry-run:

```bash
npm run check:recall-live-spike-reports -- \
  --enumeration docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \
  --fidelity docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md \
  --manifest data/private/recall-live-spikes/controlled-samples.json
```

After the manifest-aware local acceptance gate passes, the server-side proof gate can validate the public reports without copying the private manifest to production:

```bash
ssh brain "cd /opt/brain && sudo -u brain node scripts/check-recall-live-spike-reports.mjs \
  --enumeration docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \
  --fidelity docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md"
```

Expected:

```text
verdict: PASS_LIVE_SPIKE_REPORT_GATE
```

If SPIKE-014 is `PROCEED-WITH-CHANGES`, use `--allow-fidelity-changes` and `--accepted-fidelity-risk` only after explicit review. Do not continue to production dry-run if this gate returns `DO_NOT_PROCEED`.

If the dry-run/apply environment intentionally has the private controlled-sample manifest available, the production CLI and scheduled wrapper can also enforce the exact and normalized private-value privacy scan directly by passing `--live-spike-manifest-path` or setting `BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH`. Keep that manifest under ignored private paths only. The manifest-aware scan enforces manifest file safety by default: the manifest must be under `data/private/recall-live-spikes/`, ignored, untracked, and owner-only. `--allow-unsafe-manifest-for-smoke` is only for synthetic temporary manifests in offline smoke fixtures and must not be used for real live reports, production dry-run proof, production apply proof, or scheduled proof.

Proof and report files used for gates must be fresh and must not be future-dated. Regenerate live-spike reports, dry-run reports, or backup proof if file timestamps are stale or more than the accepted clock-skew window in the future.

## Production Dry-Run

Default dry-run, no writes:

```bash
ssh brain "cd /opt/brain && sudo -u brain bash -lc '
set -a; source /etc/brain/.env; set +a
node scripts/sync-recall-prod.mjs \
  --dry-run \
  --confirm-live-api \
  --require-live-spike-report-proof \
  --live-spike-enumeration-report-path docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \
  --live-spike-fidelity-report-path docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md \
  --date-from <iso> \
  --date-to <iso> \
  --max-cards 20 \
  --max-imports 20 \
  --max-total-chars 250000 \
  --max-total-chunks 250 \
  --max-chunks-per-card 50 \
  --output data/private/recall-live-spikes/dry-run-report.json
'"
```

Review:

- `state` is `done`;
- `cardsSeen` matches controlled-card expectations;
- `checkpointAdvanced` is false;
- no raw titles, chunks, bearer tokens, cookies, signed URL secrets, or stacks appear in the report;
- `recall_sync_runs.report_json` stores only a redacted summary.

Machine review before first apply:

```bash
ssh brain "cd /opt/brain && sudo -u brain npm run check:recall-dry-run-report -- \
  --report data/private/recall-live-spikes/dry-run-report.json \
  --max-planned-imports 5 \
  --max-age-minutes 120 \
  --require-private-path \
  --require-cards-seen"
```

Expected:

```text
verdict: PASS_APPLY_REVIEW_GATE
```

If the validator returns `DO_NOT_APPLY`, stop. The default validator fails on non-dry-run reports, stale reports, future-dated report files, incomplete or mismatched enumeration, blocked cards, changed remote cards, policy blocks, weak upgrades, risky fidelity classes without matching explicit approval flags, checkpoint advancement, raw payload fields, obvious secret leaks, or planned writes above the approved cap.

## First-Apply Backup Proof

Create and verify a fresh backup:

```bash
ssh brain "cd /opt/brain && sudo -u brain node scripts/recall-first-apply-preflight.mjs \
  --db-path data/brain.sqlite \
  --backup-dir data/backups \
  --json"
```

Save the returned `backupPath`. The preflight proves:

- SQLite backup was created from the live DB;
- backup `PRAGMA integrity_check` returned `ok`;
- temp restore copy `PRAGMA integrity_check` returned `ok`.

## First Capped Apply

Only after dry-run review, `PASS_APPLY_REVIEW_GATE`, backup proof, and explicit approval:

For the current local first-apply window, use the no-secret approval packet:

```text
docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_APPROVAL_PACKET_2026-06-24_19-28-07_IST.md
```

The packet includes the exact approved live SPIKE report paths, private dry-run proof path, private backup proof path, accepted fidelity-risk text, 2026-06-16 date window, five-import cap, and explicit unverified/metadata-only fidelity flags. Before choosing the next command, run the local no-write ordered status helper, `npm run recall:first-apply:status`; in the current local state before key rotation evidence is updated, it reports `blocked_key_rotation_evidence`.

Read `gateSummary` first in the status output. In the current blocked state it reports `currentBlockingGate: key_rotation_evidence`, `owner: Arun`, `externalActionRequired: true`, `externalAction: rotate_recall_api_key_outside_chat`, `safeNoWritePreviewCommand: npm run recall:first-apply:prepare-plan`, and `blockedActions: proof_refresh, first_capped_apply, deploy, scheduler, checkpoint`. All of `proofRefreshAllowedNow`, `applyAllowedNow`, `deployAllowedNow`, `schedulerAllowedNow`, and `checkpointAllowedNow` remain `false` until post-chat key rotation evidence passes.

Use `npm run recall:first-apply:prepare-plan` for a no-live, no-write preview of the post-rotation preparation sequence. It prints `first_apply_prepare_after_rotation_plan`, the current failed checks, the real prepare command, and the actions that may happen after external key rotation: private key-rotation evidence recording, no-write proof refresh, and then a stop at first capped apply approval. Plan mode does not require `BRAIN_RECALL_KEY_ROTATION_ACK`, does not require `BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1`, does not record private evidence, does not refresh proof, does not call Recall, and does not satisfy key-rotation evidence, proof freshness, write approval, apply, deploy, scheduler, or checkpoint gates.

Status always exposes `readOnlyDiagnosticNextAction`, `diagnostics.liveReadConnectivity.primarySafeReadOnlyDiagnosticCommand`, `diagnostics.liveReadConnectivity.primarySafeReadOnlyDiagnosticCredentialMode`, `diagnostics.liveReadConnectivity.promptFallbackReadOnlyDiagnosticCommand`, `diagnostics.liveReadConnectivity.promptGuardSelfTestCommand`, `diagnostics.liveReadConnectivity.promptGuardSmokeCommand`, `diagnostics.liveReadConnectivity.promptDiagnosticPreKeyGuarded`, and `diagnostics.liveReadConnectivity.optionalNoWritePromptCommand`. `optionalDiagnosticCommands[0]` is the direct no-live prompt self-test, `npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test`; it does not read a key, load an env file, or call Recall. Its `regressionCommand` is `npm run smoke:recall-first-apply-live-diagnostic-prompt-guard`, which proves the same guard plus controlled-argument rejection. `optionalDiagnosticCommands[1]` is the guarded read-only prompt command, `npm run recall:first-apply:live-diagnostic:prompt -- --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json`; it has `preKeyGuarded: true`, `guardedBy: npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test`, `outputFile: data/private/recall-live-spikes/live-diagnostic-report.json`, `outputFileMode: 0600`, runs the internal no-live guard before key entry, first preserves the status output, then runs only the read-only `/cards` auth probe with env-file loading disabled. If the local live gate is not ready, this prompt command is the primary diagnostic with `primarySafeReadOnlyDiagnosticCredentialMode: local_prompt_env_file_disabled`; status sets `promptDiagnosticAvailableWithoutLocalLiveGate: true` and `promptDiagnosticBypassesLocalLiveGate: true`, keeps this prompt command visible, and hides the env-file wrapper diagnostics.

Successful prompt-wrapper diagnostic output should include `promptWrapper.preKeyGuarded: true`, `promptWrapper.credentialMode: local_prompt_env_file_disabled`, `promptWrapper.childApiKeyEnv: RECALL_PROMPT_LIVE_DIAGNOSTIC_API_KEY`, `promptWrapper.envFileDisabledForProbe: true`, `promptWrapper.controlledProbeArgsRejectedBeforeKeyEntry: true`, and prompt guard preflight counts. Treat those fields as the artifact-level proof that the read-only `/cards` call came through the guarded prompt path; they still do not satisfy key-rotation evidence, proof freshness, approval, apply, deploy, scheduler, or checkpoint gates.

For a durable local copy, run the prompt diagnostic with `--output-file data/private/recall-live-spikes/live-diagnostic-report.json`. The prompt wrapper refuses `--output-file` paths outside `data/private/recall-live-spikes/` as `output_file_not_private` before reading a key, writes only the sanitized prompt diagnostic JSON, and sets the file to owner-only mode `0600`. The env-file diagnostic wrapper now supports the same private output path after the local live gate is ready. The private output file is diagnostic evidence only and still does not unlock proof refresh or apply.

After the private diagnostic output exists, validate it offline with `npm run check:recall-live-diagnostic-report -- --report data/private/recall-live-spikes/live-diagnostic-report.json`. The checker returns `PASS_RECALL_LIVE_DIAGNOSTIC_REPORT` only for an owner-only, ignored, untracked, sanitized diagnostic report that preserves `blocked_key_rotation_evidence`, `proofRefreshAllowedNow: false`, `applyAllowedNow: false`, `proofRefreshAllowedByThisProbe: false`, and `applyAllowedByThisProbe: false`. `npm run recall:first-apply:status` also exposes this as `first_apply_live_diagnostic_report_check` with `mode: no_live_private_file_check`; passing it does not satisfy live connectivity, key-rotation evidence, proof freshness, write approval, apply, deploy, scheduler, or checkpoint gates.

When the local live gate is ready, `diagnostics.liveReadConnectivity.primarySafeReadOnlyDiagnosticCommand` and `gateSummary.safeReadOnlyDiagnosticCommand` prefer the env-file wrapper from `diagnostics.liveReadConnectivity.optionalNoWriteWrapperCommand`: `npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json`. `diagnostics.liveReadConnectivity.primarySafeReadOnlyDiagnosticCredentialMode` is `private_env_file`, `optionalDiagnosticCommands[2].preferred` is `true`, and `diagnostics.liveReadConnectivity.promptFallbackReadOnlyDiagnosticCommand` keeps the guarded prompt path available when the persisted env file is stale or intentionally not trusted. `diagnostics.liveReadConnectivity.optionalNoWriteWrapperOutputFile` plus `optionalDiagnosticCommands[2].outputFileMode: 0600` identify the private artifact path. `diagnostics.liveReadConnectivity.optionalNoWriteCommand` may also show the standalone `npm run recall:live-auth-probe` command. These commands are connectivity diagnostics only and do not satisfy `diagnostics.firstWriteSafety`, key-rotation evidence, proof freshness, approval, apply, deploy, scheduler, or checkpoint gates.

If the persisted env file is stale or intentionally not trusted for a read-only diagnostic, prefer the local prompt wrapper; it prompts in the terminal, passes the key only to the child process as `RECALL_PROMPT_LIVE_DIAGNOSTIC_API_KEY`, forces the lower-level probe to ignore Recall env files, and still does not satisfy write gates. The lower-level non-prompt equivalent is `read -rsp "Recall API key: " RECALL_EPHEMERAL_API_KEY; echo`, then `RECALL_EPHEMERAL_API_KEY="$RECALL_EPHEMERAL_API_KEY" npm run recall:first-apply:live-diagnostic -- --probe-no-env-file --probe-api-key-env RECALL_EPHEMERAL_API_KEY --confirm-live-api`, then `unset RECALL_EPHEMERAL_API_KEY`. The probe output includes diagnostic-only `firstWriteSafety` context, including `envFileMtimeAfterCheckpoint` and `keyRotationEvidenceGateRun: false`, so stale/fresh env-file timestamp context is visible without granting proof refresh or apply permission.

After the Recall API key is rotated outside chat, prefer the local private env writer instead of manual editing:

```bash
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." \
npm run recall:key-rotation:write-env -- --replace-existing
```

The writer stores the rotated key only in `data/private/recall-live-spikes/recall.env`, keeps `BRAIN_RECALL_CONFIRM_LIVE_API=0`, writes owner-only mode `0600`, runs the no-live key-rotation metadata gate, and stops before proof refresh, first apply, deploy, scheduler, or checkpoint work.

After the rotated key is stored only in the ignored private env file, the preferred preparation command is `BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation`; it can record private key-rotation evidence through the read-only auth probe if needed, refresh stale proof through the no-write ready-or-refresh wrapper, and never applies, deploys, enables the scheduler, or advances a checkpoint. If any proof file becomes stale, regenerate the private proof before apply only after key rotation evidence passes. When status becomes `needs_no_write_proof_refresh`, use `BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." npm run recall:first-apply:refresh-if-needed`; it is a no-write alias for the ready-or-refresh wrapper and still stops on failed key evidence or missing key rotation acknowledgement. The current first-apply readiness gate reports `key_rotation_evidence` directly, and the direct proof-refresh wrapper stops before live Recall work if the env-file evidence predates the rotation checkpoint.

If the API key has been rotated outside chat and stored only in the ignored private env file but the env-file mtime remains stale, prefer the prepare wrapper above. Use the recorder directly only as the lower-level evidence command:

```bash
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." \
npm run recall:key-rotation-evidence:record
```

This writes `data/private/recall-live-spikes/key-rotation-evidence.json` only after a read-only auth probe succeeds. It stores metadata only and no Recall API key, private Recall card IDs, titles, source URLs, chunks, raw response body, dry-run payloads, apply payloads, backup payloads, or database rows. The private evidence now also preserves `liveAuthProbe.firstWriteSafety`, including `envFileMtimeAfterCheckpoint`, `keyRotationEvidenceGateRun: false`, `proofRefreshAllowedByThisProbe: false`, and `applyAllowedByThisProbe: false`, so the evidence records that the probe did not itself unlock proof refresh or apply. The key-evidence gate rejects private evidence JSON if it contains secret-shaped API-key, bearer-token, cookie, or signed/tokenized URL content and reports only the generic rule name. If the post-rotation prepare wrapper reports `non_recordable_key_evidence_failure` with a secret-shaped evidence rule such as `key_rotation_evidence_contains_sk_secret`, remove the tainted private evidence file and record it again after verifying the rotated key is stored only in the ignored private env file; the prepare wrapper intentionally does not overwrite tainted evidence.

```bash
ssh brain "cd /opt/brain && sudo -u brain bash -lc '
set -a; source /etc/brain/.env; set +a
BRAIN_RECALL_SYNC_ENABLED=1 \
BRAIN_RECALL_CONFIRM_LIVE_API=1 \
BRAIN_RECALL_REQUIRE_KEY_ROTATION_EVIDENCE=1 \
BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF=1 \
BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=1 \
BRAIN_RECALL_REQUIRE_BACKUP_PROOF=1 \
node scripts/sync-recall-prod.mjs \
  --apply \
  --confirm-apply \
  --confirm-live-api \
  --require-key-rotation-evidence \
  --key-rotation-env-file /etc/brain/.env \
  --key-rotation-system-env-file \
  --key-rotated-after <rotation-checkpoint-iso> \
  --require-live-spike-report-proof \
  --live-spike-enumeration-report-path docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \
  --live-spike-fidelity-report-path docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md \
  --live-spike-manifest-path data/private/recall-live-spikes/controlled-samples.json \
  --live-spike-allow-fidelity-changes \
  --live-spike-accepted-fidelity-risk <accepted-fidelity-risk-text> \
  --require-dry-run-proof \
  --dry-run-report-path data/private/recall-live-spikes/dry-run-report.json \
  --dry-run-report-max-age-minutes 120 \
  --dry-run-report-max-planned-imports 5 \
  --dry-run-report-require-cards-seen \
  --require-backup-proof \
  --backup-path <backupPath-from-preflight> \
  --backup-max-age-minutes 120 \
  --date-from <iso> \
  --date-to <iso> \
  --max-cards 20 \
  --max-imports 5 \
  --max-total-chars 250000 \
  --max-total-chunks 250 \
  --max-chunks-per-card 50 \
  --allow-unverified-import \
  --allow-metadata-only-import \
  --warning-ui-available \
  --output data/private/recall-live-spikes/first-apply-report.json
'"
```

Immediate checks:

```bash
ssh brain "cd /opt/brain && sudo -u brain npm run check:recall-apply-report -- \
  --report data/private/recall-live-spikes/first-apply-report.json \
  --max-applied-imports 5 \
  --max-age-minutes 120 \
  --require-private-path \
  --require-cards-seen \
  --require-applied-imports \
  --allow-unverified-fidelity \
  --allow-metadata-only-fidelity"
```

Expected verdict:

```text
PASS_POST_APPLY_REVIEW_GATE
```

Then inspect aggregate DB state:

```bash
ssh brain "cd /opt/brain && sudo -u brain sqlite3 data/brain.sqlite \"
SELECT mode,state,cards_seen,cards_imported,cards_upgraded,cards_skipped,cards_blocked,last_error
FROM recall_sync_runs
ORDER BY started_at DESC
LIMIT 5;

SELECT recall_card_id,item_id,content_fidelity,sync_status,last_error
FROM recall_sync_items
ORDER BY last_seen_at DESC
LIMIT 20;
\""
```

## Rollback

Stop Brain, restore the pre-apply backup, then restart:

```bash
ssh brain "sudo systemctl stop brain && \
cd /opt/brain && \
sudo -u brain scripts/restore-from-backup.sh <backupPath-from-preflight> && \
sudo systemctl start brain"
```

After rollback:

```bash
ssh brain "sudo systemctl is-active brain"
ssh brain "cd /opt/brain && sudo -u brain sqlite3 data/brain.sqlite 'PRAGMA integrity_check;'"
```

Expected:

- service returns `active`;
- integrity check returns `ok`;
- imported Recall rows from the failed apply are absent.

## Scheduler

Scheduler remains disabled until after:

1. live dry-run passes;
2. first capped apply passes;
3. at least one repeated manual dry-run/apply is reviewed;
4. Arun approves automation.

Preferred scheduler type: systemd timer. Do not use in-process Next.js cron for Recall V1.

Installed artifact names:

```text
/etc/systemd/system/brain-recall-sync.service
/etc/systemd/system/brain-recall-sync.timer
/opt/brain/scripts/recall-scheduled-apply.sh
```

The deploy script may install these files and run `systemctl daemon-reload`, but it must not enable or start the timer. It also fails before deploy if `brain-recall-sync.timer` is already enabled or active, unless `BRAIN_RECALL_ALLOW_EXISTING_TIMER=1` is set after explicit scheduler approval. It also fails if remote `/etc/brain/.env` has `BRAIN_RECALL_SYNC_ENABLED=1`, `BRAIN_RECALL_SCHEDULER_ENABLED=1`, or `BRAIN_RECALL_CONFIRM_LIVE_API=1`, including exported, quoted, or spaced assignments, unless `BRAIN_RECALL_ALLOW_ENABLED_FLAGS=1` is set for an approved apply/scheduler window. If either Recall override is set, deploy also checks remote key rotation evidence for `${BRAIN_RECALL_KEY_ROTATION_ENV_FILE:-${BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE:-/etc/brain/.env}}` before continuing. Local deploy gates run:

```bash
npm run check:recall-scheduler
npm run check:recall-approval-packet
npm run smoke:recall-live-spikes
npm run smoke:recall-live-spike-reports
npm run build:recall-cli
npm run smoke:recall-cli:bundle
npm run smoke:recall-scheduler-wrapper
```

The scheduled wrapper's future enabled path requires `BRAIN_RECALL_CONFIRM_LIVE_API=1` for non-fixture live mode and checks key rotation evidence for `${BRAIN_RECALL_KEY_ROTATION_ENV_FILE:-${BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE:-/etc/brain/.env}}` before live-spike proof, report directory creation, dry-run, backup, apply, or report validation. After key evidence passes, it runs a dry-run first, validates the scheduled dry-run report, creates backup proof, invokes apply with `BRAIN_RECALL_REQUIRE_KEY_ROTATION_EVIDENCE=1`, `BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=1`, `BRAIN_RECALL_REQUIRE_BACKUP_PROOF=1`, and the matching `--require-key-rotation-evidence` / `--key-rotation-system-env-file` core CLI flags, and then validates the scheduled apply report with `scripts/check-recall-apply-report.mjs` before printing success. The scheduler wrapper smoke also proves stale key evidence stops before report creation through the preferred `BRAIN_RECALL_KEY_ROTATION_ENV_FILE`, proves a valid fixture/proof run without explicit unverified-content acceptance stops before backup/apply on `blocked_by_fidelity_policy`, proves scheduled core key-evidence flag pass-through, and proves the packaged future path runs post-apply report review.

If `BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF=1`, the wrapper also refuses to start until both `BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH` and `BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH` are set, then passes the accepted SPIKE-013/SPIKE-014 report proof to both scheduled dry-run and scheduled apply. If `BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH` is set, the proof check also runs the manifest-aware exact and normalized private-value privacy scan with default manifest file-safety enforcement. Use this only with an explicit report freshness policy; default max age is 1440 minutes unless `BRAIN_RECALL_LIVE_SPIKE_REPORT_MAX_AGE_MINUTES` is set.

Default disabled env:

```bash
BRAIN_RECALL_SYNC_ENABLED=0
BRAIN_RECALL_SCHEDULER_ENABLED=0
BRAIN_RECALL_CONFIRM_LIVE_API=0
BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF=0
BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=1
BRAIN_RECALL_REQUIRE_BACKUP_PROOF=1
```

Future enable sequence after manual apply approval:

```bash
ssh brain "sudo sed -i.bak \
  -e 's/^BRAIN_RECALL_SYNC_ENABLED=.*/BRAIN_RECALL_SYNC_ENABLED=1/' \
  -e 's/^BRAIN_RECALL_SCHEDULER_ENABLED=.*/BRAIN_RECALL_SCHEDULER_ENABLED=1/' \
  -e 's/^BRAIN_RECALL_CONFIRM_LIVE_API=.*/BRAIN_RECALL_CONFIRM_LIVE_API=1/' \
  -e 's/^BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=.*/BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=1/' \
  -e 's/^BRAIN_RECALL_REQUIRE_BACKUP_PROOF=.*/BRAIN_RECALL_REQUIRE_BACKUP_PROOF=1/' \
  /etc/brain/.env && \
sudo systemctl daemon-reload && \
sudo systemctl enable --now brain-recall-sync.timer && \
systemctl list-timers brain-recall-sync.timer"
```

After the timer is intentionally enabled, future deploys require the explicit existing-timer override:

```bash
BRAIN_RECALL_ALLOW_EXISTING_TIMER=1 ./scripts/deploy.sh
```

During an explicitly approved manual apply or scheduler window where remote Recall enable flags are already set, future deploys also require:

```bash
BRAIN_RECALL_ALLOW_ENABLED_FLAGS=1 ./scripts/deploy.sh
```

Both override paths also require remote key rotation evidence to pass; use `BRAIN_RECALL_KEY_ROTATED_AFTER_ISO` and prefer `BRAIN_RECALL_KEY_ROTATION_ENV_FILE` to point at the approved rotated-key env file. `BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE` remains a legacy fallback for existing deploy environments.

Emergency disable:

```bash
ssh brain "sudo systemctl disable --now brain-recall-sync.timer || true && \
sudo sed -i.bak \
  -e 's/^BRAIN_RECALL_SYNC_ENABLED=.*/BRAIN_RECALL_SYNC_ENABLED=0/' \
  -e 's/^BRAIN_RECALL_SCHEDULER_ENABLED=.*/BRAIN_RECALL_SCHEDULER_ENABLED=0/' \
  -e 's/^BRAIN_RECALL_CONFIRM_LIVE_API=.*/BRAIN_RECALL_CONFIRM_LIVE_API=0/' \
  -e 's/^BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=.*/BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=1/' \
  -e 's/^BRAIN_RECALL_REQUIRE_BACKUP_PROOF=.*/BRAIN_RECALL_REQUIRE_BACKUP_PROOF=1/' \
  /etc/brain/.env && \
sudo systemctl daemon-reload"
```

## Logs And Evidence

Allowed public evidence:

- counts;
- redacted IDs;
- fidelity states;
- skipped/blocked reasons;
- command exit codes;
- screenshots without private content.

Private evidence path:

```text
data/private/recall-live-spikes/
```

Redaction scan before sharing any report:

```bash
npm run check:recall-public-privacy -- --require-files
npm run check:recall-public-docs-privacy
npm run check:recall-public-manifest-privacy -- \
  --manifest data/private/recall-live-spikes/controlled-samples.json \
  docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \
  docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md
```

Expected:

```text
ok: true
```

The `--require-files` flag is intentional after live reports are generated; it turns a zero-file scan into a blocker instead of a status-only success. The current public approval/runbook docs privacy scan checks the checklist, handoff, operating packet, production runbook, audit, tracker, current option docs, and privacy evidence docs for obvious secret leaks before any live findings are summarized or used for production-capable dry-run approval.

## Do Not Proceed Conditions

Stop and do not apply if any are true:

- Recall API returns unexpected pagination, missing controlled cards, or unexplained date-window behavior.
- Any controlled sample lacks a fidelity decision.
- The long/truncation candidate hits exactly 50 chunks and policy is not explicitly accepted.
- Backup preflight fails.
- Dry-run report contains raw private titles, chunk bodies, bearer tokens, cookies, signed URL secrets, or stack traces.
- Dry-run report validator returns `DO_NOT_APPLY`.
- `cardsBlocked` is unexpectedly high or every card is skipped for an unexplained reason.
- Production CLI requires `tsx`, TypeScript source files, or dev dependencies.
