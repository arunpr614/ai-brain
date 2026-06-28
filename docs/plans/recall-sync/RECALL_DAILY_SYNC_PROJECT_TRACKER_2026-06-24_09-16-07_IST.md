# Recall Daily Sync Project Tracker

Created: 2026-06-24 09:16 IST
Owner: Codex
Status: Active
Workstream: Recall -> AI Brain daily snapshot import
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Current Verdict

Research and planning artifacts are created through spike requirements V2. Phase A offline compatibility work is complete, including privacy/redaction, schema/type/UI support, and a synthetic mapper/importer with card-ID idempotency tests. Phase C offline scheduler, deployment-operability, optional weak-item upgrade, conservative fidelity-policy apply gating, structured dry-run fidelity breakdowns, non-mutating dry-run action planning, action-aware import caps, changed-remote apply blocking, apply-time importer-block checkpoint protection, cap-aware `total_count` enumeration blocking, strict dry-run proof enumeration completeness plus stale/future-dated proof-file rejection, explicit planned import-write count reporting, live-spike Markdown report generation, SPIKE-013 offline fixture-report smoke coverage, a repeatable live-spike rehearsal smoke, aligned live-spike runbook commands, a reusable public privacy scan for live-spike reports, a manifest-aware public report privacy scan with normalized matching and default manifest file-safety enforcement, a current public-doc privacy scan for approval/runbook/evidence docs, a post-live SPIKE report acceptance gate, live-spike public report directory guard, production CLI live-spike proof enforcement before dry-run/apply with optional manifest-aware private-value scanning, scheduled wrapper live-spike proof enforcement for the future timer path with optional manifest-aware private-value scanning, a redacted-only public report manifest gate, a private controlled sample manifest validator, a no-secret controlled sample setup guide, a controlled sample template initializer with automated smoke coverage, a private Recall env template initializer with automated smoke coverage, a checked private env-file loader for live SPIKE execution, a no-secret live gate status command with env-file permission gating and an explicit readiness JSON contract, a standalone read-only live auth probe, pre-live default manifest status reporting, pre-live child-command preview redaction, explicit live API confirmation for live spikes, explicit live API confirmation for production CLI/scheduler, manifest-driven live spike commands, a combined live-spike runner, a no-secret live API approval checklist, compact no-secret approval handoff, a machine-checked approval packet consistency gate with future-dated proof policy coverage, a private evidence ignore guard, a consolidated pre-live readiness gate, a dry-run report apply-readiness validator, an apply report post-apply review validator, apply-time dry-run proof enforcement, a guarded first capped apply wrapper, first-apply key rotation acknowledgement gate, first-apply key rotation evidence gate, first-apply private evidence recorder workflow, first-apply post-rotation prepare wrapper, first-apply readiness key-evidence consolidation, first-apply status helper, first-apply refresh-if-needed alias, first-apply proof refresh key acknowledgement gate, scheduled wrapper key rotation evidence gate, deploy override key rotation evidence gate, scheduled wrapper key-rotation env-file alias support, scheduled wrapper dry-run proof enforcement, deploy-time scheduled-wrapper smoke enforcement, current-state completion audit, and final implementation options V3 are complete. Read-only live validation has now run against Recall through the checked env-file path: SPIKE-013 is `CLEAR`, SPIKE-014 is `PROCEED-WITH-CHANGES`, the standalone live auth probe returned HTTP 200 with zero future-window results, public and manifest-aware privacy gates passed, and the post-live gate passed with accepted fidelity changes that keep production import blocked by default for unverified chunks. Production dry-run, first-apply backup proof, a no-secret first capped apply approval packet, a guarded apply wrapper, the key rotation acknowledgement gate, local key rotation evidence gate, private key rotation evidence recorder, post-rotation prepare wrapper, first-apply readiness key-evidence consolidation, first-apply status helper, first-apply refresh-if-needed alias, first-apply proof refresh key acknowledgement gate, scheduled wrapper key rotation evidence gate, deploy override key rotation evidence gate, and scheduled/deploy key-rotation env-file alias gates have now passed documentation/smoke/static gates; apply, deploy, and scheduler enablement remain blocked until Arun explicitly approves the first capped write, confirms the apply key was rotated after chat exposure, and records passing key rotation evidence without exposing the key.

## Role Roster

| Role | Status | Notes |
|---|---|---|
| Product Manager sub-agent | Completed initial discovery | Helped identify artifact workflow, risks, milestones, and tracker fields. |
| Technical Architect sub-agent | Completed initial discovery | Helped identify integration point, module shape, and codebase risks. |
| Project Manager sub-agent | Completed initial tracker review | Tracker/milestone structure was reviewed and feedback integrated. |
| QA sub-agent | Completed review | Flagged gate traceability, stronger API/fidelity checks, crash-window cases, and deployment operability. |
| Codex lead | Active | Owns artifact integration and next-step execution. |

## Artifact Ledger

| Artifact | Path | Status |
|---|---|---|
| Source inventory | `docs/research/recall-sync/00_SOURCE_INVENTORY_2026-06-24_08-58-33_IST.md` | Done |
| Research report V1 | `docs/research/recall-sync/01_RECALL_DAILY_SYNC_RESEARCH_REPORT_V1_2026-06-24_08-58-33_IST.md` | Done |
| Research report V1 adversarial review | `docs/research/recall-sync/RECALL_DAILY_SYNC_RESEARCH_REPORT_V1_ADVERSARIAL_REVIEW_2026-06-24_09-05-08_IST.md` | Done |
| Research report V2 | `docs/research/recall-sync/02_RECALL_DAILY_SYNC_RESEARCH_REPORT_V2_2026-06-24_09-07-04_IST.md` | Done |
| Final implementation options V3 | `docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_IMPLEMENTATION_OPTIONS_V3_2026-06-24_18-17-27_IST.md` | Done - current option decision packet after late offline hardening and official docs spot-check |
| Spike requirements V1 | `docs/plans/recall-sync/RECALL_DAILY_SYNC_SPIKE_REQUIREMENTS_V1_2026-06-24_09-10-06_IST.md` | Done |
| Spike requirements V1 adversarial review | `docs/plans/recall-sync/RECALL_DAILY_SYNC_SPIKE_REQUIREMENTS_V1_ADVERSARIAL_REVIEW_2026-06-24_09-11-53_IST.md` | Done |
| Spike requirements V2 | `docs/plans/recall-sync/RECALL_DAILY_SYNC_SPIKE_REQUIREMENTS_V2_2026-06-24_09-13-12_IST.md` | Done, QA-amended |
| SPIKE-015 privacy/fixtures report | `docs/plans/spikes/SPIKE-015-recall-privacy-fixtures-2026-06-24_09-19-39_IST.md` | Done - follow-up helper implemented |
| Recall redaction helper | `src/lib/security/redaction.ts`, `src/lib/security/redaction.test.ts` | Done, focused test passed |
| SPIKE-016 import fixture report | `docs/plans/spikes/SPIKE-016-recall-import-fixture-2026-06-24_09-25-55_IST.md` | Done - mapper/importer follow-up completed |
| Recall schema/type/UI support | `src/db/migrations/020_recall_sync.sql`, `src/db/migrations/020_recall_sync.test.ts`, `src/db/client.ts`, `src/lib/capture/quality.ts`, `src/lib/capture/quality.test.ts` | Done, focused tests + typecheck passed |
| Recall mapper/importer idempotency | `src/lib/recall/mapper.ts`, `src/lib/recall/importer.ts`, `src/db/recall-sync.ts`, `src/lib/recall/importer.test.ts` | Done, focused tests + typecheck passed |
| SPIKE-018 scheduler/checkpoint report | `docs/plans/spikes/SPIKE-018-recall-scheduler-checkpoint-2026-06-24_09-51-39_IST.md` | Done - no cron installed |
| Recall scheduler/checkpoint primitives | `src/lib/recall/scheduler.ts`, `src/lib/recall/sync-runner.ts`, `src/lib/recall/scheduler.test.ts`, `src/lib/recall/sync-runner.test.ts` | Done, focused tests + typecheck passed |
| SPIKE-020 deployment operability report | `docs/plans/spikes/SPIKE-020-recall-deployment-operability-2026-06-24_09-57-15_IST.md` | Done - design only, no deploy |
| SPIKE-017 weak item upgrade report | `docs/plans/spikes/SPIKE-017-recall-weak-item-upgrade-2026-06-24_10-07-17_IST.md` | Done - optional policy implemented and validated |
| Recall optional weak-item upgrade policy | `src/lib/recall/importer.ts`, `src/lib/recall/sync-runner.ts`, `src/lib/repair/item-repair.ts`, `src/db/recall-sync.ts` | Done, focused tests + typecheck passed |
| SPIKE-013 REST enumeration probe script | `scripts/spikes/recall-rest-enumeration.ts` | Ready; no-key guard, fixture mode, manifest-driven controls, and Markdown report smoke validated |
| SPIKE-014 content fidelity probe script | `scripts/spikes/recall-content-fidelity.ts`, `src/lib/recall/fidelity.ts`, `src/lib/recall/fidelity.test.ts` | Ready; manifest-driven sample list and offline fixture Markdown report smoke passed |
| Live spike rehearsal smoke | `scripts/smoke-recall-live-spikes.mjs`, `package.json` | Done - `npm run smoke:recall-live-spikes` verifies SPIKE-013/SPIKE-014 report generation and privacy redaction without API key |
| Live auth probe local-gate fix | `scripts/run-recall-live-auth-probe.mjs`, `scripts/smoke-recall-live-auth-probe.mjs`, `docs/plans/recall-sync/RECALL_LIVE_AUTH_PROBE_LOCAL_GATE_FIX_EXECUTION_REPORT_2026-06-25_00-11-33_IST.md` | Done - `npm run smoke:recall-live-auth-probe` passed, and `npm run recall:live-auth-probe -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api` made one read-only `/cards` call and returned HTTP 200 without printing private content |
| Live auth probe key-rotation context report | `scripts/run-recall-live-auth-probe.mjs`, `scripts/smoke-recall-live-auth-probe.mjs`, `docs/plans/recall-sync/RECALL_LIVE_AUTH_PROBE_KEY_ROTATION_CONTEXT_EXECUTION_REPORT_2026-06-25_02-03-04_IST.md` | Done for offline scope - `npm run smoke:recall-live-auth-probe` proves `firstWriteSafety`, `envFileMtimeAfterCheckpoint`, and `keyRotationEvidenceGateRun` context for stale/fresh env-file timestamps while keeping proof refresh/apply disallowed |
| Recall key rotation private evidence recorder | `scripts/record-recall-key-rotation-evidence.mjs`, `scripts/smoke-recall-key-rotation-evidence-record.mjs`, `docs/plans/recall-sync/RECALL_KEY_ROTATION_PRIVATE_EVIDENCE_RECORD_WORKFLOW_EXECUTION_REPORT_2026-06-25_00-27-10_IST.md` | Done for offline scope - `npm run smoke:recall-key-rotation-evidence-record` passed; real `npm run check:recall-key-rotation-evidence` still blocks until the key is rotated outside chat and `data/private/recall-live-spikes/key-rotation-evidence.json` is recorded |
| Key rotation evidence recorder probe context report | `scripts/record-recall-key-rotation-evidence.mjs`, `scripts/smoke-recall-key-rotation-evidence-record.mjs`, `docs/plans/recall-sync/RECALL_KEY_ROTATION_EVIDENCE_RECORDER_PROBE_CONTEXT_EXECUTION_REPORT_2026-06-25_02-09-45_IST.md` | Done for offline scope - private evidence now preserves `liveAuthProbe.firstWriteSafety`, including `envFileMtimeAfterCheckpoint`, `proofRefreshAllowedByThisProbe: false`, and `applyAllowedByThisProbe: false` without storing key material |
| Key rotation evidence file secret guard report | `scripts/check-recall-key-rotation-evidence.mjs`, `scripts/smoke-recall-key-rotation-evidence.mjs`, `docs/plans/recall-sync/RECALL_KEY_ROTATION_EVIDENCE_FILE_SECRET_GUARD_EXECUTION_REPORT_2026-06-25_02-15-09_IST.md` | Done for offline scope - key evidence gate now rejects secret-shaped content in the private evidence JSON, including `key_rotation_evidence_contains_sk_secret`, without echoing the matched value |
| Post-rotation prepare tainted evidence guard report | `scripts/smoke-recall-first-apply-prepare-after-rotation.mjs`, `docs/plans/recall-sync/RECALL_POST_ROTATION_PREPARE_TAINTED_EVIDENCE_GUARD_EXECUTION_REPORT_2026-06-25_02-20-28_IST.md` | Done for offline scope - prepare wrapper now has smoke proof that tainted private evidence fails as `non_recordable_key_evidence_failure` and is not overwritten |
| Recall first apply post-rotation prepare wrapper | `scripts/prepare-recall-first-apply-after-rotation.mjs`, `scripts/smoke-recall-first-apply-prepare-after-rotation.mjs`, `docs/plans/recall-sync/RECALL_FIRST_APPLY_POST_ROTATION_PREPARE_WRAPPER_EXECUTION_REPORT_2026-06-25_00-50-28_IST.md` | Done for offline scope - smoke proves exact acknowledgement is required, private evidence can be recorded through the read-only auth probe, stale proof can refresh through the no-write wrapper, and no apply/deploy/scheduler/checkpoint work occurs |
| Recall first apply post-rotation prepare plan report | `scripts/prepare-recall-first-apply-after-rotation.mjs`, `scripts/smoke-recall-first-apply-prepare-after-rotation.mjs`, `docs/plans/recall-sync/RECALL_FIRST_APPLY_POST_ROTATION_PREPARE_PLAN_EXECUTION_REPORT_2026-06-25_05-46-24_IST.md` | Done for offline scope - `npm run recall:first-apply:prepare-plan` previews the post-rotation sequence without acknowledgement, confirmation, live Recall access, evidence recording, proof refresh, apply, deploy, scheduler, or checkpoint work |
| Recall public privacy scan command | `scripts/check-recall-public-privacy.mjs`, `package.json` | Done - `npm run check:recall-public-privacy` scans public SPIKE-013/SPIKE-014 reports for obvious secret leaks |
| Recall public privacy strict file-count/redacted-preview guard | `scripts/check-recall-public-privacy.mjs`, `scripts/smoke-recall-public-privacy.mjs`, `package.json` | Done - `--require-files` fails closed when no report files are scanned, and leak previews redact secret-shaped values |
| Recall manifest-aware public privacy scan | `scripts/check-recall-public-manifest-privacy.mjs`, `scripts/lib/recall-controlled-samples.mjs`, `scripts/run-recall-live-spikes.mjs`, `scripts/smoke-recall-live-spikes.mjs`, `scripts/deploy.sh`, `package.json` | Done - generated public reports are checked against private manifest card IDs, expected titles, source URLs, and negative-control values without printing private values; deploy copies the checker and its manifest helper |
| Recall manifest privacy normalized matching | `scripts/check-recall-public-manifest-privacy.mjs`, `scripts/smoke-recall-public-manifest-privacy.mjs`, `package.json` | Done - manifest-aware public report scan now catches case, whitespace, HTML-entity, and percent-encoding variants without printing private values |
| Recall public manifest privacy file safety guard | `scripts/check-recall-public-manifest-privacy.mjs`, `scripts/smoke-recall-public-manifest-privacy.mjs`, `scripts/check-recall-live-spike-reports.mjs`, `scripts/run-recall-live-spikes.mjs`, `scripts/sync-recall.ts` | Done - standalone manifest-aware scan rejects unsafe manifest files by default; synthetic fixture callers must opt into the explicit smoke-only bypass |
| Recall live spike report acceptance gate | `scripts/check-recall-live-spike-reports.mjs`, `scripts/smoke-recall-live-spike-reports.mjs`, `scripts/smoke-recall-cli-bundle.mjs`, `package.json` | Done - validates generated SPIKE-013/SPIKE-014 reports before production dry-run; optional `--manifest` runs exact and normalized private-value privacy checks; helper scripts resolve from the checker location; smoke covers pass, blocker, content-fidelity enum drift, generic privacy leak, manifest privacy leak, accepted fidelity-change paths, non-root cwd, and no-src packaged helper coverage in the production `scripts/` layout |
| Recall live-spike public report directory guard | `scripts/run-recall-live-spikes.mjs`, `scripts/smoke-recall-live-spikes.mjs` | Done - approved live runs must write reports under `docs/plans/spikes`; smoke proves invalid live report dirs fail before output creation |
| Recall production live-spike proof enforcement | `scripts/sync-recall.ts`, `scripts/smoke-recall-cli-bundle.mjs`, `scripts/deploy.sh` | Done - production CLI can require accepted SPIKE reports before dry-run/apply and can pass an optional controlled-sample manifest into the proof checker for exact and normalized private-value privacy scanning; bundle smoke proves missing proof fails and manifest-aware valid proof passes |
| Recall scheduled wrapper live-spike proof enforcement | `scripts/recall-scheduled-apply.sh`, `scripts/smoke-recall-scheduled-wrapper.mjs`, `scripts/check-recall-scheduler-artifacts.mjs` | Done - future timer path can require accepted SPIKE reports before scheduled dry-run/apply and can pass an optional controlled-sample manifest into the proof checker; scheduler smoke proves missing proof fails and manifest-aware valid proof passes |
| Recall scheduled wrapper key rotation evidence gate | `scripts/recall-scheduled-apply.sh`, `scripts/check-recall-key-rotation-evidence.mjs`, `scripts/smoke-recall-scheduled-wrapper.mjs`, `scripts/check-recall-scheduler-artifacts.mjs`, `scripts/deploy.sh` | Done for offline scope - future timer path checks key rotation evidence before scheduled live proof, report directory creation, dry-run, backup, or apply, and now passes the same key-evidence requirement into the bundled core apply CLI; scheduler smoke proves stale evidence fails without leaking key values |
| Recall deploy override key rotation evidence gate | `scripts/deploy.sh`, `scripts/check-recall-scheduler-artifacts.mjs` | Done for offline scope - deploy override windows require remote key rotation evidence before deploy proceeds when Recall enable flags or existing timer overrides are used |
| Recall key rotation env-file alias report | `docs/plans/recall-sync/RECALL_KEY_ROTATION_ENV_FILE_ALIAS_EXECUTION_REPORT_2026-06-25_01-44-29_IST.md` | Done for offline scope - scheduled/deploy paths now prefer `BRAIN_RECALL_KEY_ROTATION_ENV_FILE` and keep `BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE` as the legacy fallback |
| Recall private evidence ignore guard | `scripts/check-recall-private-ignore.mjs`, `package.json` | Done - `npm run check:recall-private-ignore` verifies private Recall paths are ignored and untracked |
| Recall controlled sample manifest check | `scripts/check-recall-controlled-samples.mjs`, `package.json` | Done - validates six required live sample labels, source URL rules, date window, negative control, and report privacy booleans before live API access |
| Recall controlled sample manifest file safety guard | `scripts/lib/recall-controlled-samples.mjs`, `scripts/check-recall-controlled-samples.mjs`, `scripts/check-recall-live-gate-status.mjs`, `scripts/run-recall-live-spikes.mjs`, `scripts/spikes/recall-rest-enumeration.ts`, `scripts/spikes/recall-content-fidelity.ts`, `scripts/smoke-recall-live-gate-status.mjs`, `scripts/smoke-recall-live-spikes.mjs` | Done - validates manifest file location, ignored/untracked state, and owner-only permissions before live API access, including combined runner and direct live probes |
| Recall controlled sample manifest file safety report | `docs/plans/recall-sync/RECALL_CONTROLLED_SAMPLE_MANIFEST_FILE_SAFETY_GUARD_EXECUTION_REPORT_2026-06-24_16-51-49_IST.md` | Done - documents `needs_manifest_file_safety_fix`, `needs_manifest_permission_fix`, validation evidence, and current manifest file safety status |
| Recall controlled sample setup guide | `scripts/print-recall-controlled-samples-guide.mjs`, `scripts/smoke-recall-controlled-samples-guide.mjs`, `package.json` | Done - prints a no-secret guide for selecting six positive samples plus the outside-window negative control; smoke is included in pre-live readiness |
| Recall public report redaction manifest gate | `scripts/lib/recall-controlled-samples.mjs`, `scripts/smoke-recall-live-gate-status.mjs` | Done - manifests requesting public title/source URL exposure are rejected before live API access |
| Recall controlled sample template initializer | `scripts/init-recall-controlled-samples.mjs`, `scripts/smoke-recall-controlled-samples-init.mjs`, `package.json` | Done - writes the private manifest template only under ignored Recall evidence paths after the private ignore guard passes; smoke is included in pre-live readiness |
| Recall private env template initializer | `scripts/init-recall-env.mjs`, `scripts/smoke-recall-env-init.mjs`, `package.json` | Done - writes an empty-key, confirmation-disabled env template only under ignored Recall evidence paths after the private ignore guard passes; smoke is included in pre-live readiness |
| Recall live gate status command | `scripts/check-recall-live-gate-status.mjs`, `scripts/smoke-recall-live-gate-status.mjs`, `scripts/lib/recall-env-file.mjs`, `package.json` | Done - summarizes manifest, credential-presence, env-file location/permission safety, checked env-file loading, and next command state without printing secrets; smoke is included in pre-live readiness |
| Recall live gate env-file permission/location guard report | `docs/plans/recall-sync/RECALL_LIVE_GATE_ENV_FILE_PERMISSION_GUARD_EXECUTION_REPORT_2026-06-24_16-41-18_IST.md` | Done - documents `needs_env_file_safety_fix`, `needs_env_permission_fix`, validation evidence, and current private-root ignored/untracked owner-only local env status |
| Recall live gate env-file private-root guard | `scripts/check-recall-live-gate-status.mjs`, `scripts/smoke-recall-live-gate-status.mjs` | Done - existing env files now need `underPrivateRecallEvidencePath: true`; smoke covers ignored-but-wrong-root env files |
| Recall live gate status readiness contract report | `docs/plans/recall-sync/RECALL_LIVE_GATE_STATUS_READINESS_CONTRACT_EXECUTION_REPORT_2026-06-24_17-03-59_IST.md` | Done - `recall:live-gate:status` now returns JSON `ok: true` only when `readyForApprovedLiveSpikes` is true; blocked/not-ready states keep `ok: false` while `privateEvidenceOk` reports private-ignore safety |
| Recall live gate require-ready strict mode | `scripts/check-recall-live-gate-status.mjs`, `scripts/smoke-recall-live-gate-status.mjs`, `package.json` | Done - `npm run recall:live-gate:require-ready -- --manifest ...` prints the same status JSON and exits nonzero unless ready for approved live spikes |
| Manifest-driven live spike commands | `scripts/lib/recall-controlled-samples.mjs`, `scripts/spikes/recall-rest-enumeration.ts`, `scripts/spikes/recall-content-fidelity.ts`, `scripts/smoke-recall-live-spikes.mjs` | Done - SPIKE-013/SPIKE-014 can consume the validated private manifest directly |
| Combined Recall live-spike runner | `scripts/run-recall-live-spikes.mjs`, `scripts/lib/recall-env-file.mjs`, `package.json`, `scripts/smoke-recall-live-spikes.mjs` | Done - `npm run recall:live-spikes -- --manifest data/private/recall-live-spikes/controlled-samples.json --env-file data/private/recall-live-spikes/recall.env --confirm-live-api` validates manifest, safely loads the private env file, runs SPIKE-013/SPIKE-014, writes reports, and scans generated reports after explicit live confirmation |
| Recall live SPIKE env-file gate fix report | `docs/plans/recall-sync/RECALL_LIVE_SPIKE_ENV_FILE_GATE_FIX_EXECUTION_REPORT_2026-06-24_20-05-02_IST.md` | Done - documents root cause, checked env-file loader fix, refreshed live proof pair, and refreshed private dry-run proof |
| Recall pre-live readiness command | `scripts/check-recall-prelive-readiness.mjs`, `package.json` | Done - `npm run check:recall-prelive` consolidates private-ignore, optional manifest validation, offline live-spike rehearsal, public privacy scan, scheduler safety, CLI build, and bundled CLI smoke |
| Recall pre-live default manifest status report | `docs/plans/recall-sync/RECALL_PRELIVE_DEFAULT_MANIFEST_STATUS_EXECUTION_REPORT_2026-06-24_17-16-05_IST.md` | Done - no-manifest pre-live output now reports a redacted `defaultManifest` status and still requires manifest-enforced validation before live Recall API access |
| Recall pre-live output preview redaction | `scripts/lib/recall-prelive-output.mjs`, `scripts/smoke-recall-prelive-output.mjs`, `scripts/check-recall-prelive-readiness.mjs`, `package.json` | Done - child-command previews redact private manifest values, Recall API-key-shaped strings, and bearer tokens; smoke is included in pre-live readiness |
| Recall pre-live output preview redaction report | `docs/plans/recall-sync/RECALL_PRELIVE_OUTPUT_PREVIEW_REDACTION_EXECUTION_REPORT_2026-06-24_17-22-57_IST.md` | Done - documents preview redaction scope and validation evidence |
| Recall approval packet consistency gate | `scripts/check-recall-approval-packet.mjs`, `scripts/check-recall-prelive-readiness.mjs`, `package.json` | Done - machine-checks the no-secret checklist, operating packet, production runbook, completion audit, tracker, required scripts, and future-dated proof policy before live work |
| Recall dry-run report review gate | `scripts/check-recall-dry-run-report.mjs`, `scripts/smoke-recall-dry-run-report-check.mjs`, `scripts/sync-recall.ts`, `package.json` | Done - `npm run check:recall-dry-run-report -- --report ... --max-planned-imports 5 --max-age-minutes 120` returns `PASS_APPLY_REVIEW_GATE` only when the report is fresh, not future-dated, enumeration is complete, and write/policy/privacy gates pass |
| Recall apply report review gate | `scripts/check-recall-apply-report.mjs`, `scripts/smoke-recall-apply-report-check.mjs`, `package.json` | Done for offline scope - `npm run check:recall-apply-report -- --report data/private/recall-live-spikes/first-apply-report.json --max-applied-imports 5 --max-age-minutes 120` returns `PASS_POST_APPLY_REVIEW_GATE` only when the private apply report is clean |
| Apply-time dry-run proof enforcement | `scripts/sync-recall.ts`, `scripts/smoke-recall-cli-bundle.mjs`, `scripts/deploy.sh` | Done - apply can require a fresh, not future-dated dry-run proof report and bundled smoke proves missing/future-dated proof fails before writes |
| Scheduled wrapper dry-run/apply proof enforcement | `scripts/recall-scheduled-apply.sh`, `scripts/smoke-recall-scheduled-wrapper.mjs`, `scripts/check-recall-scheduler-artifacts.mjs`, `package.json` | Done - scheduled wrapper now dry-runs, validates report, creates backup proof, applies with dry-run proof plus backup proof, and validates the post-apply report in fixture smoke |
| Scheduled wrapper fidelity-policy negative smoke | `scripts/recall-scheduled-apply.sh`, `scripts/smoke-recall-scheduled-wrapper.mjs`, `scripts/check-recall-scheduler-artifacts.mjs` | Done - optional Bash args are safe when empty; smoke proves unaccepted unverified Recall chunks stop before backup/apply |
| Final implementation options V1 | `docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_IMPLEMENTATION_OPTIONS_2026-06-24_10-09-20_IST.md` | Done - preliminary historical synthesis |
| Final implementation options V2 | `docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_IMPLEMENTATION_OPTIONS_V2_2026-06-24_15-42-04_IST.md` | Done - current decision package after offline implementation hardening; live gates still block production rollout |
| PRD v1 | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V1_2026-06-24_10-13-04_IST.md` | Done |
| PRD v1 adversarial review | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V1_ADVERSARIAL_REVIEW_2026-06-24_10-14-55_IST.md` | Done |
| PRD v2 | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRD_V2_2026-06-24_10-16-19_IST.md` | Done - live gates remain blockers |
| Implementation plan v1 | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V1_2026-06-24_10-18-50_IST.md` | Done |
| Implementation plan v1 adversarial review | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V1_ADVERSARIAL_REVIEW_2026-06-24_10-20-22_IST.md` | Done |
| Implementation plan v2 | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_IMPLEMENTATION_PLAN_V2_2026-06-24_10-21-46_IST.md` | Done - live gates remain blockers |
| Live API spike operating packet | `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` | Done - updated with rehearsal smoke and current SPIKE-013/SPIKE-014 report commands; awaiting user approval |
| Live API approval checklist | `docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_CHECKLIST_2026-06-24_14-00-43_IST.md` | Done - no-secret checklist for API-key handling, controlled samples, readiness checks, live command, and stop conditions |
| Recall live API approval handoff | `docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_HANDOFF_2026-06-24_18-21-35_IST.md` | Done - compact no-secret approval text, private-file rules, readiness commands, live command, post-live report gates, and stop conditions |
| Recall API client | `src/lib/recall/client.ts`, `src/lib/recall/client.test.ts` | Done - focused tests passed against mocked fetch |
| Recall production CLI source and package path | `scripts/sync-recall.ts`, `scripts/build-recall-cli.mjs`, `scripts/smoke-recall-cli-bundle.mjs`, `package.json`, `scripts/deploy.sh` | Done for offline scope - bundle smoke passed in production-like `scripts/sync-recall-prod.mjs` plus `scripts/db` layout including manifest-aware report-gate helper packaging, optional manifest-aware live-spike proof, and cap-aware `total_count` enumeration blocking; live mode now requires explicit confirmation; no live API run |
| Packaged migration directory support | `src/db/client.ts` | Done - bundled CLI smoke proved migrations run without `src/` |
| CLI packaging execution report | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_CLI_PACKAGING_EXECUTION_REPORT_2026-06-24_10-35-32_IST.md` | Done |
| Durable run-report persistence | `src/db/recall-sync.ts`, `src/lib/recall/sync-runner.ts`, `src/db/migrations/020_recall_sync.sql`, `src/lib/recall/sync-runner.test.ts`, `src/db/migrations/020_recall_sync.test.ts` | Done for offline scope - redacted report persistence tested |
| Run-report persistence execution report | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_RUN_REPORT_PERSISTENCE_EXECUTION_REPORT_2026-06-24_10-40-11_IST.md` | Done |
| Content fidelity probe execution report | `docs/plans/recall-sync/RECALL_CONTENT_FIDELITY_PROBE_EXECUTION_REPORT_2026-06-24_10-43-15_IST.md` | Done |
| First-apply backup preflight and apply guard | `scripts/recall-first-apply-preflight.mjs`, `scripts/sync-recall.ts`, `scripts/smoke-recall-cli-bundle.mjs`, `scripts/deploy.sh`, `package.json` | Done for offline scope - temp backup proof and bundled backup-guarded apply smoke passed |
| Production runbook | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Done - updated with rehearsal smoke and current live-spike report commands; live execution remains blocked |
| First-apply backup/runbook execution report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_BACKUP_RUNBOOK_EXECUTION_REPORT_2026-06-24_10-50-01_IST.md` | Done |
| Disabled systemd scheduler artifacts | `scripts/recall-scheduled-apply.sh`, `scripts/deploy/brain-recall-sync.service`, `scripts/deploy/brain-recall-sync.timer`, `scripts/deploy.sh`, `scripts/check-recall-scheduler-artifacts.mjs` | Done for offline scope - static check, deploy-time already-enabled/active timer guard, remote Recall enable-flag guard, and disabled wrapper smoke passed |
| Disabled scheduler readiness report | `docs/plans/recall-sync/RECALL_DISABLED_SYSTEMD_SCHEDULER_READINESS_REPORT_2026-06-24_10-54-25_IST.md` | Done |
| Baseline secret/privacy scan | `docs/plans/recall-sync/RECALL_BASELINE_SECRET_PRIVACY_SCAN_2026-06-24_10-56-17_IST.md` | Done - no real Recall secret found |
| Fidelity policy apply gate report | `docs/plans/recall-sync/RECALL_FIDELITY_POLICY_APPLY_GATE_EXECUTION_REPORT_2026-06-24_11-09-52_IST.md` | Done - default apply blocks unapproved Recall fidelity classes before writes/checkpoint |
| Dry-run fidelity breakdown report | `docs/plans/recall-sync/RECALL_DRY_RUN_FIDELITY_BREAKDOWN_EXECUTION_REPORT_2026-06-24_11-13-51_IST.md` | Done - reports now include `fidelityCounts`, `policyBlockCounts`, and `policyBlockReasons` |
| Dry-run action planning report | `docs/plans/recall-sync/RECALL_DRY_RUN_ACTION_PLANNING_EXECUTION_REPORT_2026-06-24_11-19-17_IST.md` | Done - reports now include non-mutating `plannedActionCounts` |
| Action-aware caps report | `docs/plans/recall-sync/RECALL_ACTION_AWARE_CAPS_EXECUTION_REPORT_2026-06-24_11-20-50_IST.md` | Done - `maxImports` now counts planned import writes instead of already-synced skips |
| Changed-remote apply gate report | `docs/plans/recall-sync/RECALL_CHANGED_REMOTE_APPLY_GATE_EXECUTION_REPORT_2026-06-24_11-23-38_IST.md` | Done - changed remote cards now block apply before sync mutation/checkpoint |
| Apply-time import blocker checkpoint guard | `src/lib/recall/sync-runner.ts`, `src/lib/recall/sync-runner.test.ts` | Done - `blocked_weak_existing`, `blocked_by_fidelity_policy`, or apply-time `changed_remote` results produce a blocked report and do not advance the checkpoint |
| Planned import count reporting report | `docs/plans/recall-sync/RECALL_PLANNED_IMPORT_COUNT_REPORTING_EXECUTION_REPORT_2026-06-24_11-30-10_IST.md` | Done - reports now expose `cardsPlannedForImport` for direct first-apply write-count review |
| Live spike Markdown reporting report | `docs/plans/recall-sync/RECALL_LIVE_SPIKE_MARKDOWN_REPORTING_EXECUTION_REPORT_2026-06-24_12-03-21_IST.md` | Done - SPIKE-013/SPIKE-014 probes can write redacted Markdown reports directly |
| SPIKE-013 fixture reporting report | `docs/plans/recall-sync/RECALL_SPIKE_013_FIXTURE_REPORTING_EXECUTION_REPORT_2026-06-24_12-07-54_IST.md` | Done - SPIKE-013 report generation and privacy path can be smoke-tested without API key |
| Live spike rehearsal smoke report | `docs/plans/recall-sync/RECALL_LIVE_SPIKE_REHEARSAL_SMOKE_EXECUTION_REPORT_2026-06-24_12-11-03_IST.md` | Done - repeatable smoke covers both live spike report paths offline |
| Live spike runbook command alignment report | `docs/plans/recall-sync/RECALL_LIVE_SPIKE_RUNBOOK_COMMAND_ALIGNMENT_EXECUTION_REPORT_2026-06-24_12-13-38_IST.md` | Done - operating packet and production runbook now match current spike script flags |
| Recall public privacy scan command report | `docs/plans/recall-sync/RECALL_PUBLIC_PRIVACY_SCAN_COMMAND_EXECUTION_REPORT_2026-06-24_12-17-56_IST.md` | Done - reusable public-report leak scan added and validated |
| Recall manifest-aware public privacy scan report | `docs/plans/recall-sync/RECALL_MANIFEST_AWARE_PUBLIC_PRIVACY_SCAN_EXECUTION_REPORT_2026-06-24_14-52-35_IST.md` | Done - live runner now scans public reports against private manifest values |
| Recall public manifest privacy file-safety guard report | `docs/plans/recall-sync/RECALL_PUBLIC_MANIFEST_PRIVACY_FILE_SAFETY_GUARD_EXECUTION_REPORT_2026-06-24_18-11-22_IST.md` | Done - standalone manifest-aware privacy scan now enforces ignored private manifest file safety by default |
| Recall public docs privacy scan report | `docs/plans/recall-sync/RECALL_PUBLIC_DOCS_PRIVACY_SCAN_EXECUTION_REPORT_2026-06-24_18-28-55_IST.md` | Done - current public approval/runbook docs privacy scan added to pre-live and deploy-time local release gates |
| Recall live API approval received readiness check | `docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_RECEIVED_READINESS_CHECK_2026-06-24_18-48-28_IST.md` | Done - historical readiness record before key/manifest were populated |
| Recall live SPIKE execution report | `docs/plans/recall-sync/RECALL_LIVE_SPIKE_EXECUTION_REPORT_2026-06-24_19-06-25_IST.md` | Done - SPIKE-013 live enumeration is CLEAR; SPIKE-014 content fidelity is PROCEED-WITH-CHANGES with accepted conservative import risk |
| Recall production dry-run execution report | `docs/plans/recall-sync/RECALL_PRODUCTION_DRY_RUN_EXECUTION_REPORT_2026-06-24_19-14-08_IST.md` | Done - private production-shaped dry-run passed `PASS_APPLY_REVIEW_GATE` with 3 planned imports, no writes, and no checkpoint advancement |
| Recall first capped apply backup proof | `docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_BACKUP_PROOF_2026-06-24_19-19-52_IST.md` | Done - private SQLite backup and temporary restore integrity checks passed; apply still awaits explicit write approval |
| Recall first capped apply approval packet | `docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_APPROVAL_PACKET_2026-06-24_19-28-07_IST.md` | Done - no-secret exact approval text and apply command captured with live proof, dry-run proof, backup proof, caps, date window, and fidelity flags |
| Recall apply report review gate report | `docs/plans/recall-sync/RECALL_APPLY_REPORT_REVIEW_GATE_EXECUTION_REPORT_2026-06-24_19-47-09_IST.md` | Done - post-apply private report validator added and smoked before deploy/scheduler |
| Recall first capped apply readiness gate report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_READINESS_GATE_EXECUTION_REPORT_2026-06-24_20-16-20_IST.md` | Done - consolidated no-write gate returned `PASS_FIRST_CAPPED_APPLY_READINESS_GATE` against the current proof chain |
| Recall first capped apply wrapper report | `docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_WRAPPER_EXECUTION_REPORT_2026-06-24_20-26-51_IST.md` | Done - guarded wrapper refuses without exact approval, reruns readiness, executes capped apply, and validates the post-apply report in fixture smoke |
| Recall first apply readiness freshness countdown report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_READINESS_FRESHNESS_COUNTDOWN_EXECUTION_REPORT_2026-06-24_20-34-12_IST.md` | Done - readiness output now reports no-secret proof age, `freshnessRemainingMinutes`, and a default 5-minute minimum freshness floor for private dry-run and backup proof |
| Recall first apply proof refresh wrapper report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_PROOF_REFRESH_WRAPPER_EXECUTION_REPORT_2026-06-24_20-47-10_IST.md` | Done - no-write wrapper refreshes dry-run proof and backup proof, then reruns readiness when proof is stale or below the freshness floor |
| Recall first apply ready-or-refresh wrapper report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_READY_OR_REFRESH_WRAPPER_EXECUTION_REPORT_2026-06-24_21-02-06_IST.md` | Done - no-write wrapper checks local key rotation evidence first on the real path, then readiness, refreshes only on proof freshness/existence failures, and stops on failed key evidence or other non-refreshable gates |
| Recall first apply actual proof refresh report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_PROOF_REFRESH_ACTUAL_EXECUTION_REPORT_2026-06-24_21-11-03_IST.md` | Done - real no-write refresh renewed private dry-run and backup proof to about 120 minutes freshness and reran readiness; no apply was run |
| Recall first apply key rotation acknowledgement gate report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_KEY_ROTATION_ACK_GATE_EXECUTION_REPORT_2026-06-24_21-24-17_IST.md` | Done - wrapper now requires exact key rotation acknowledgement before first capped apply |
| Recall first apply key rotation evidence gate report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_KEY_ROTATION_EVIDENCE_GATE_EXECUTION_REPORT_2026-06-24_21-33-19_IST.md` | Done - wrapper now requires local ignored private env-file metadata to prove update after the key-rotation checkpoint before first capped apply |
| Recall first apply readiness key-evidence consolidation report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_READINESS_KEY_EVIDENCE_CONSOLIDATION_EXECUTION_REPORT_2026-06-24_23-23-20_IST.md` | Done - readiness now reports key rotation evidence directly and direct proof refresh stops before live Recall work when key evidence is stale |
| Recall first apply status helper report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_STATUS_HELPER_EXECUTION_REPORT_2026-06-24_23-37-44_IST.md` | Done - `npm run recall:first-apply:status` summarizes ordered blockers and next safe commands without refreshing proof or applying |
| Recall first apply status gate summary report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_STATUS_GATE_SUMMARY_EXECUTION_REPORT_2026-06-25_06-04-42_IST.md` | Done - status output now exposes `gateSummary` with current gate owner, external action, safe no-write preview, and blocked proof/apply/deploy/scheduler/checkpoint actions |
| Recall first apply status read-only diagnostic priority report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_STATUS_READ_ONLY_DIAGNOSTIC_PRIORITY_EXECUTION_REPORT_2026-06-25_06-22-16_IST.md` | Done - status now prefers the private env-file read-only diagnostic when the local live gate is ready and keeps the guarded prompt path as fallback |
| Recall first apply status private diagnostic proof summary report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_STATUS_PRIVATE_DIAGNOSTIC_PROOF_SUMMARY_EXECUTION_REPORT_2026-06-25_06-40-46_IST.md` | Done - status now surfaces `latestPrivateDiagnosticProof` for the existing private report, including HTTP `200` and `doesNotAuthorize`, without rerunning live Recall or unlocking writes |
| Recall daily sync completion status helper report | `docs/plans/recall-sync/RECALL_DAILY_SYNC_COMPLETION_STATUS_HELPER_EXECUTION_REPORT_2026-06-25_06-56-49_IST.md` | Done - `npm run recall:daily-sync:completion-status` now reports `completionAchieved`, `blockedRequirements`, and the first apply/deploy/scheduler gaps without live calls or writes |
| Recall daily sync release visibility gate report | `docs/plans/recall-sync/RECALL_DAILY_SYNC_RELEASE_VISIBILITY_GATE_EXECUTION_REPORT_2026-06-25_07-06-36_IST.md` | Done - pre-live and deploy-time local gates now run the no-live completion status smoke and snapshot, and scheduler artifact static checks require those links |
| Recall completion evidence validators report | `docs/plans/recall-sync/RECALL_COMPLETION_EVIDENCE_VALIDATORS_EXECUTION_REPORT_2026-06-25_07-14-55_IST.md` | Done - strict deploy and scheduler evidence validators now require private no-secret `data/private/recall-live-spikes/production-deploy-evidence.json` and `data/private/recall-live-spikes/scheduler-enable-evidence.json` before `completionAchieved` can pass |
| Recall key rotation handoff command report | `docs/plans/recall-sync/RECALL_KEY_ROTATION_HANDOFF_COMMAND_EXECUTION_REPORT_2026-06-25_07-34-55_IST.md` | Done - `npm run recall:key-rotation:handoff` prints a no-live/no-write operator checklist for the current `blocked_key_rotation_evidence` gate and `npm run smoke:recall-key-rotation-handoff` proves no secret output or live API call |
| Recall key rotation handoff release visibility report | `docs/plans/recall-sync/RECALL_KEY_ROTATION_HANDOFF_RELEASE_VISIBILITY_GATE_EXECUTION_REPORT_2026-06-25_07-42-57_IST.md` | Done - pre-live and deploy-time local gates now run the key-rotation handoff smoke and snapshot, while `check:recall-scheduler` statically requires those links |
| Recall key rotation handoff read-only diagnostic proof fix report | `docs/plans/recall-sync/RECALL_KEY_ROTATION_HANDOFF_READ_ONLY_DIAGNOSTIC_PROOF_FIX_2026-06-25_08-13-44_IST.md` | Done - key-rotation handoff now surfaces the existing read-only live diagnostic proof (`HTTP 200`) separately from first-write/proof/deploy/scheduler blockers |
| Recall rotated private env writer report | `docs/plans/recall-sync/RECALL_ROTATED_PRIVATE_ENV_WRITER_EXECUTION_REPORT_2026-06-25_08-26-47_IST.md` | Done for no-live/no-write local env writer scope - `npm run smoke:recall-key-rotation-env-writer` proves the helper writes only owner-only ignored private env files, keeps live confirmation disabled, reaches `PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE` in smoke, and does not call Recall; handoff/status, first-apply approval packet, and production runbook guidance now surface the helper |
| Recall post-rotation prepare release gate report | `docs/plans/recall-sync/RECALL_POST_ROTATION_PREPARE_RELEASE_GATE_EXECUTION_REPORT_2026-06-25_07-53-55_IST.md` | Done - pre-live and deploy-time local gates now smoke the guarded post-rotation prepare wrapper, while `check:recall-scheduler` statically requires that coverage |
| Recall first apply refreshability bugfix report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_REFRESHABILITY_BUGFIX_EXECUTION_REPORT_2026-06-25_08-02-46_IST.md` | Done - status and ready-or-refresh now classify dry-run freshness-floor findings as refreshable and refuse mixed refreshable/non-refreshable failures before proof refresh |
| Recall first apply status live diagnostic split report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_STATUS_LIVE_DIAGNOSTIC_SPLIT_EXECUTION_REPORT_2026-06-25_01-53-37_IST.md` | Done for offline scope - status output now separates optional read-only live auth diagnostics from first-write proof refresh/apply gates |
| Recall first apply live diagnostic wrapper report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_LIVE_DIAGNOSTIC_WRAPPER_EXECUTION_REPORT_2026-06-25_02-27-19_IST.md` | Done for offline scope - `npm run recall:first-apply:live-diagnostic` preserves blocked first-write status and `npm run recall:first-apply:live-diagnostic:prompt` prompts locally for a read-only `/cards` probe with env-file loading disabled; Node `--env-file` argument interception is fixed on operator-facing live/readiness package scripts, child spawns, key-evidence/prepare paths, proof refresh, first capped apply, and scheduled apply |
| Recall first apply env-file primary live diagnostic actual run | `docs/plans/recall-sync/RECALL_FIRST_APPLY_ENV_FILE_PRIMARY_LIVE_DIAGNOSTIC_ACTUAL_RUN_2026-06-25_06-32-32_IST.md` | Done for read-only live scope - the current status-recommended env-file primary command reached Recall, wrote sanitized private proof, and preserved first-write blockers |
| Recall live diagnostic report checker report | `docs/plans/recall-sync/RECALL_LIVE_DIAGNOSTIC_REPORT_CHECKER_EXECUTION_REPORT_2026-06-25_05-32-13_IST.md` | Done for offline scope - `npm run check:recall-live-diagnostic-report` validates the private live diagnostic proof as sanitized diagnostic-only evidence without satisfying any write gates |
| Recall first apply refresh-if-needed alias report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_REFRESH_IF_NEEDED_ALIAS_EXECUTION_REPORT_2026-06-24_23-50-50_IST.md` | Done - `npm run recall:first-apply:refresh-if-needed` gives the post-rotation no-write proof refresh path a one-command alias while still stopping on failed key evidence |
| Recall first apply proof refresh key acknowledgement gate report | `docs/plans/recall-sync/RECALL_FIRST_APPLY_PROOF_REFRESH_KEY_ACK_GATE_EXECUTION_REPORT_2026-06-25_00-00-33_IST.md` | Done - real proof refresh now requires exact `BRAIN_RECALL_KEY_ROTATION_ACK` after key evidence passes and before live Recall dry-run refresh |
| Live SPIKE-013 report | `docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_20-03-34_IST.md` | Done - refreshed checked env-file live Recall date-window enumeration report, redacted |
| Live SPIKE-014 report | `docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_20-03-34_IST.md` | Done - refreshed checked env-file live Recall content-fidelity report, redacted |
| Recall controlled sample manifest validator report | `docs/plans/recall-sync/RECALL_CONTROLLED_SAMPLE_MANIFEST_VALIDATOR_EXECUTION_REPORT_2026-06-24_12-25-33_IST.md` | Done - private sample manifest validator added, hardened, documented, and validated |
| Recall controlled sample setup guide report | `docs/plans/recall-sync/RECALL_CONTROLLED_SAMPLE_SETUP_GUIDE_EXECUTION_REPORT_2026-06-24_14-41-32_IST.md` | Done - no-secret sample selection guide added and pre-live-smoked |
| Recall controlled sample template init helper report | `docs/plans/recall-sync/RECALL_CONTROLLED_SAMPLE_TEMPLATE_INIT_HELPER_EXECUTION_REPORT_2026-06-24_13-18-06_IST.md` | Done - safe private manifest template writer added |
| Recall private env template init helper report | `docs/plans/recall-sync/RECALL_PRIVATE_ENV_TEMPLATE_INIT_HELPER_EXECUTION_REPORT_2026-06-24_13-47-56_IST.md` | Done - safe private env template writer added and pre-live integrated |
| Recall public report redaction manifest gate report | `docs/plans/recall-sync/RECALL_PUBLIC_REPORT_REDACTION_MANIFEST_GATE_EXECUTION_REPORT_2026-06-24_13-56-43_IST.md` | Done - public SPIKE reports are redacted-only and manifest enforcement is validated |
| Recall live gate status summary report | `docs/plans/recall-sync/RECALL_LIVE_GATE_STATUS_SUMMARY_COMMAND_EXECUTION_REPORT_2026-06-24_13-26-00_IST.md` | Done - no-secret live gate status command added and pre-live integrated |
| Recall live spike explicit confirmation gate report | `docs/plans/recall-sync/RECALL_LIVE_SPIKE_EXPLICIT_CONFIRMATION_GATE_EXECUTION_REPORT_2026-06-24_13-30-55_IST.md` | Done - combined live runner now refuses live mode without explicit confirmation |
| Recall production CLI live confirmation gate report | `docs/plans/recall-sync/RECALL_PRODUCTION_CLI_LIVE_CONFIRMATION_GATE_EXECUTION_REPORT_2026-06-24_13-38-00_IST.md` | Done and validated - production CLI and scheduler wrapper now refuse non-fixture live mode without explicit confirmation |
| Recall approval packet consistency gate report | `docs/plans/recall-sync/RECALL_APPROVAL_PACKET_CONSISTENCY_GATE_EXECUTION_REPORT_2026-06-24_14-06-24_IST.md` | Done - approval handoff packet is checked by pre-live readiness |
| Recall live spike report gate report | `docs/plans/recall-sync/RECALL_LIVE_SPIKE_REPORT_GATE_EXECUTION_REPORT_2026-06-24_14-12-14_IST.md` | Done - post-live report acceptance gate added and pre-live-smoked |
| Recall live-spike public report directory guard report | `docs/plans/recall-sync/RECALL_LIVE_SPIKE_PUBLIC_REPORT_DIR_GUARD_EXECUTION_REPORT_2026-06-24_14-46-21_IST.md` | Done - live runner refuses public report directories outside `docs/plans/spikes` |
| Recall production live-spike proof gate report | `docs/plans/recall-sync/RECALL_PRODUCTION_DRY_RUN_LIVE_SPIKE_PROOF_GATE_EXECUTION_REPORT_2026-06-24_14-24-15_IST.md` | Done - production dry-run/apply CLI can enforce accepted live-spike reports |
| Recall scheduled wrapper live-spike proof gate report | `docs/plans/recall-sync/RECALL_SCHEDULED_WRAPPER_LIVE_SPIKE_PROOF_GATE_EXECUTION_REPORT_2026-06-24_14-32-45_IST.md` | Done - future timer path can enforce accepted live-spike reports before scheduled dry-run/apply |
| Recall scheduled wrapper key rotation evidence gate report | `docs/plans/recall-sync/RECALL_SCHEDULED_WRAPPER_KEY_ROTATION_EVIDENCE_GATE_EXECUTION_REPORT_2026-06-24_23-03-38_IST.md` | Done - future timer path requires system env-file key rotation evidence before scheduled live work |
| Recall scheduled apply core key-evidence pass-through report | `docs/plans/recall-sync/RECALL_SCHEDULED_APPLY_CORE_KEY_EVIDENCE_PASS_THROUGH_EXECUTION_REPORT_2026-06-25_01-32-17_IST.md` | Done - future timer path passes key-evidence flags and `BRAIN_RECALL_REQUIRE_KEY_ROTATION_EVIDENCE=1` into the bundled apply CLI |
| Recall deploy override key rotation evidence gate report | `docs/plans/recall-sync/RECALL_DEPLOY_OVERRIDE_KEY_ROTATION_EVIDENCE_GATE_EXECUTION_REPORT_2026-06-24_23-12-24_IST.md` | Done - deploy override windows require remote key rotation evidence before deploy proceeds |
| Manifest-driven live spike commands report | `docs/plans/recall-sync/RECALL_MANIFEST_DRIVEN_LIVE_SPIKE_COMMANDS_EXECUTION_REPORT_2026-06-24_12-34-22_IST.md` | Done - SPIKE-013/SPIKE-014 now load the validated manifest directly |
| Recall live-spike runner report | `docs/plans/recall-sync/RECALL_LIVE_SPIKE_RUNNER_EXECUTION_REPORT_2026-06-24_12-40-59_IST.md` | Done - combined runner added and fixture-smoked |
| Recall private evidence ignore guard report | `docs/plans/recall-sync/RECALL_PRIVATE_EVIDENCE_IGNORE_GUARD_EXECUTION_REPORT_2026-06-24_12-44-46_IST.md` | Done - private evidence ignore guard added and runner-integrated |
| Recall pre-live readiness command report | `docs/plans/recall-sync/RECALL_PRELIVE_READINESS_COMMAND_EXECUTION_REPORT_2026-06-24_12-50-59_IST.md` | Done - single offline readiness gate added and validated |
| Recall dry-run report review gate report | `docs/plans/recall-sync/RECALL_DRY_RUN_REPORT_REVIEW_GATE_EXECUTION_REPORT_2026-06-24_12-59-12_IST.md` | Done - first-apply dry-run report validator added, smoked, and runbook-integrated |
| Recall apply dry-run proof gate report | `docs/plans/recall-sync/RECALL_APPLY_DRY_RUN_PROOF_GATE_EXECUTION_REPORT_2026-06-24_13-05-04_IST.md` | Done - sync apply now enforces fresh dry-run proof when required |
| Recall scheduled wrapper dry-run proof report | `docs/plans/recall-sync/RECALL_SCHEDULED_WRAPPER_DRY_RUN_PROOF_EXECUTION_REPORT_2026-06-24_13-09-39_IST.md` | Done - scheduled wrapper now has proof-backed future apply path and fixture smoke |
| Recall current-state completion audit | `docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md` | Done - maps original goal requirements to evidence and remaining live/production gates |
| Recall final implementation options V3 | `docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_IMPLEMENTATION_OPTIONS_V3_2026-06-24_18-17-27_IST.md` | Done - final option decision packet now reflects strict readiness, manifest privacy file safety, latest validation, and current Recall docs spot-check |
| Recall live API approval handoff | `docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_HANDOFF_2026-06-24_18-21-35_IST.md` | Done - compact no-secret approval packet for Arun's live SPIKE-013/SPIKE-014 approval moment |

## Milestones

| ID | Milestone | Status | Exit Criteria | Blocker |
|---|---|---|---|---|
| M0 | Source inventory and codebase discovery | Done | Current Recall docs and local AI Brain integration points recorded. | None |
| M1 | Research report V1 | Done | Initial recommendation and options documented. | None |
| M2 | Adversarial review of research | Done | V1 risks captured as review report. | None |
| M3 | Research report V2 | Done | Review findings incorporated into hard gates. | None |
| M4 | Spike requirements V1 | Done | Executable spike plan drafted. | None |
| M5 | Adversarial review of spike requirements | Done | V1 spike plan challenged. | None |
| M6 | Spike requirements V2 | Done | Phase-gated spike plan produced and QA feedback incorporated. | None |
| M7 | Phase A offline spikes | Done | Privacy/fixtures and synthetic import fixture reports complete; schema/type/UI support and mapper/importer idempotency are validated. | None |
| M8 | Phase B live API spikes | Done | REST enumeration and content fidelity reports complete. | None |
| M9 | Phase C integration/scheduler/operability spikes | Done for offline scope | Scheduler/checkpoint, deployment operability, and optional weak-item upgrade are complete. | Live API gates still block production scheduling |
| M10 | Fallback spike, if needed | Conditional | MCP/Markdown fallback verdict. | Depends on REST outcome |
| M11 | Final implementation options | Done - V2 current | Gate matrix and recommended REST-first path updated after offline implementation hardening. | Live API gates still block production rollout |
| M12 | PRD cycle | Done | PRD v1, adversarial review, and PRD v2 created. | Live gates remain pre-implementation blockers |
| M13 | Implementation plan cycle | Done | Plan v1, adversarial review, and plan v2 created. | Live gates remain pre-execution blockers |
| M14 | Execution, QA, deployment | In progress - offline CLI/package gate done | Code complete, tests pass, bugs resolved, production deployed. | Live API gates and production deploy still pending |

## Task Tracker

| ID | Workstream | Task | Status | Owner Role | Dependency | Next Action |
|---|---|---|---|---|---|---|
| RDS-001 | Research | Build source inventory | Done | Codex | None | None |
| RDS-002 | Research | Create research report V1 | Done | Codex | RDS-001 | None |
| RDS-003 | Review | Adversarial review research V1 | Done | Codex | RDS-002 | None |
| RDS-004 | Research | Create research report V2 | Done | Codex | RDS-003 | None |
| RDS-005 | Planning | Create spike requirements V1 | Done | Codex | RDS-004 | None |
| RDS-006 | Review | Adversarial review spike requirements V1 | Done | Codex | RDS-005 | None |
| RDS-007 | Planning | Create spike requirements V2 | Done | Codex | RDS-006 | QA amendments integrated |
| RDS-008 | PM | Validate tracker and milestone rows | Done | Project Manager sub-agent | RDS-007 | Feedback integrated |
| RDS-009 | QA | Validate gate testability | Done | QA sub-agent | RDS-007 | Feedback integrated |
| RDS-010 | Phase A | Execute SPIKE-015 privacy and fixture safety | Done - follow-up implemented | QA agent | RDS-007 | None |
| RDS-011 | Phase A | Add reusable Recall redaction helper/test table | Done | Technical Architect + QA | RDS-010 | Focused test passed |
| RDS-012 | Phase A | Execute SPIKE-016 AI Brain import fixture | Done - mapper/importer implemented | Technical Architect | RDS-011 | None |
| RDS-013 | Phase B | Execute SPIKE-013 REST enumeration | Done - live run complete | Technical Architect | User API key approval + controlled cards | Fresh checked env-file run produced `CLEAR` report at `docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_20-03-34_IST.md` |
| RDS-014 | Phase B | Execute SPIKE-014 content fidelity | Done - live run complete with accepted changes | Product Manager + Technical Architect | RDS-013 and user sample approval | Fresh checked env-file run produced `PROCEED-WITH-CHANGES` report at `docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_20-03-34_IST.md` |
| RDS-015 | Phase C | Execute SPIKE-018 scheduler/checkpoint safety | Done - offline primitives implemented | Technical Architect | RDS-012 | No cron installed; revisit after live API |
| RDS-016 | Phase C | Execute SPIKE-020 deployment operability | Done - design/runbook outline complete; CLI packaging gap solved offline | PM + Technical Architect | RDS-015 | Production deploy still blocked by live gates |
| RDS-017 | Phase C | Execute SPIKE-017 weak item upgrade | Done - optional policy implemented and validated | Technical Architect | RDS-012/RDS-015 | Keep disabled by default until live fidelity gates pass |
| RDS-018 | Fallback | Execute SPIKE-019 fallback enumeration | Conditional | PM + Technical Architect | REST failure or user request | Run only if needed |
| RDS-019 | Synthesis | Create final implementation options | Done - V2 current | PM + Architect | Spike reports and offline implementation audit | Revisit only if live SPIKE-013/SPIKE-014 changes the recommendation |
| RDS-020 | PRD | Create PRD v1 for chosen option | Done | Product Manager | RDS-019 | None |
| RDS-021 | Review | Adversarial review PRD v1 | Done | QA/Codex | RDS-020 | None |
| RDS-022 | PRD | Create PRD v2 | Done | Product Manager | RDS-021 | None |
| RDS-023 | Plan | Create implementation plan v1 | Done | Technical Architect | RDS-022 | None |
| RDS-024 | Review | Adversarial review implementation plan v1 | Done | QA/Codex | RDS-023 | None |
| RDS-025 | Plan | Create implementation plan v2 | Done | Technical Architect | RDS-024 | None |
| RDS-026 | Execution | Implement selected option end to end | In progress - dry-run passed; first capped apply approval next | Codex + workers | RDS-025 | Do not run apply until Arun explicitly approves the write step with backup and dry-run proof |
| RDS-026a | Execution | Implement production dry-run/apply CLI packaging | Done for offline scope | Codex | RDS-025 | Re-run `npm run build:recall-cli && npm run smoke:recall-cli:bundle` before deploy |
| RDS-026aa | Execution | Persist redacted Recall sync run reports | Done for offline scope | Codex | RDS-025 | Keep `report_json` redacted; no raw Recall payloads in public artifacts |
| RDS-026ab | Execution | Add first-apply backup proof and production runbook | Done for offline scope | Codex | RDS-025 | Use `scripts/recall-first-apply-preflight.mjs` and runbook before any production apply |
| RDS-026ac | Execution | Run Recall-owned baseline secret/privacy scan | Done | QA/Codex | RDS-025 | Re-run before public report, commit, PR, or live evidence summary |
| RDS-026ad | Execution | Enforce content-fidelity policy before apply writes/checkpoint | Done for offline scope | Codex | RDS-025 | Live approval flags remain operator-controlled; no production apply yet |
| RDS-026ae | Execution | Add structured dry-run fidelity breakdowns | Done for offline scope | Codex | RDS-026ad | Use live dry-run output to review fidelity risk after SPIKE-013/SPIKE-014 approval |
| RDS-026af | Execution | Add non-mutating dry-run action planning | Done for offline scope | Codex | RDS-026ae | Use `plannedActionCounts` in live dry-run approval before capped apply |
| RDS-026ag | Execution | Make import caps action-aware | Done for offline scope | Codex | RDS-026af | First apply cap now protects write count without blocking harmless overlap skips |
| RDS-026ah | Execution | Block apply on changed remote content | Done for offline scope | Codex | RDS-026af | Changed remote cards require review before any checkpoint advancement |
| RDS-026ai | Execution | Expose planned import-write count in reports | Done for offline scope | Codex | RDS-026ag | Use `cardsPlannedForImport` in live dry-run and first-apply approval |
| RDS-026aj | Execution | Add redacted Markdown report generation to live spike probes | Done for offline scope | Codex | RDS-013/RDS-014 | Use `--write-report` or `--report-path` during approved live spikes |
| RDS-026ak | Execution | Add SPIKE-013 offline fixture mode and report smoke | Done for offline scope | Codex | RDS-026aj | Use `--fixture` for safe rehearsal; use live API only after approval |
| RDS-026al | Execution | Add repeatable offline smoke for live spike report generation | Done for offline scope | Codex | RDS-026aj/RDS-026ak | Run `npm run smoke:recall-live-spikes` before approved live SPIKE-013/SPIKE-014 |
| RDS-026am | Execution | Align operating packet and runbook with current live spike commands | Done for offline scope | Codex | RDS-026al | Use updated packet/runbook for approved live SPIKE-013/SPIKE-014 |
| RDS-026an | Execution | Add reusable public privacy scan for live spike reports | Done for offline scope | Codex | RDS-026am | Run `npm run check:recall-public-privacy` before sharing or committing SPIKE-013/SPIKE-014 reports |
| RDS-026an0 | Execution | Add strict public privacy scan mode and redacted leak previews | Done for offline scope | Codex | RDS-026an | Use `npm run check:recall-public-privacy -- --require-files` after live reports should exist; smoke proves missing report files fail closed and synthetic leak previews are redacted |
| RDS-026an1 | Execution | Add manifest-aware public report privacy scan | Done for offline scope | Codex | RDS-026an/RDS-026ao | Live runner now checks public reports against private manifest card IDs, expected titles, source URLs, and negative-control values; deploy copies the checker and runs live-spike rehearsal smoke |
| RDS-026an2 | Execution | Add normalized manifest-aware privacy matching | Done for offline scope | Codex | RDS-026an1 | `smoke:recall-public-manifest-privacy` proves exact and normalized private title/source URL leaks fail without printing private values; pre-live now includes this smoke |
| RDS-026an3 | Execution | Enforce manifest file safety in standalone manifest-aware privacy scan | Done for offline scope | Codex | RDS-026an2/RDS-026ao0 | Real manifest-aware scans now require manifests under `data/private/recall-live-spikes/`, ignored, untracked, and owner-only; fixture callers use explicit `--allow-unsafe-manifest-for-smoke` only for synthetic temp manifests |
| RDS-026an4 | Execution | Add current public approval/runbook docs privacy scan | Done for offline scope | Codex | RDS-026an3/RDS-026aq1a | `check:recall-public-docs-privacy` scans the curated current checklist, handoff, operating packet, runbook, audit, tracker, final options V3, manifest file-safety report, its own execution report, approval received readiness check, live SPIKE execution report, and production dry-run execution report; smoke proves missing curated docs fail closed and synthetic leak previews are redacted; deploy local release gates now run both smoke and real scan |
| RDS-026ao | Execution | Add controlled sample manifest validator | Done for offline scope | Codex | RDS-026am/RDS-026an | Validate private sample manifest before approved SPIKE-013/SPIKE-014 |
| RDS-026ao0 | Execution | Gate controlled sample manifest file safety | Done for offline scope | Codex | RDS-026ao | Manifest validation, live-gate status, combined live runner, and direct live probes now block manifests outside ignored private paths, tracked manifests, and group/other-readable manifests |
| RDS-026ao0a | Execution | Enforce redacted-only public SPIKE reports in manifest validation | Done for offline scope | Codex | RDS-026ao | Keep all public report booleans false; live-gate smoke rejects public exposure requests |
| RDS-026ao0b | Execution | Add no-secret controlled sample setup guide | Done for offline scope | Codex | RDS-026ao0a | Run `npm run recall:controlled-samples:guide` before choosing/filling live sample cards; smoke is included in pre-live readiness |
| RDS-026ao1 | Execution | Add controlled sample template initializer | Done for offline scope | Codex | RDS-026ao0a | Use `npm run recall:controlled-samples:init` to create the ignored private template before filling sample values |
| RDS-026ao2 | Execution | Automate controlled sample initializer smoke | Done for offline scope | Codex | RDS-026ao1 | `npm run smoke:recall-controlled-samples-init` is now part of pre-live readiness |
| RDS-026ao2a | Execution | Add private Recall env template initializer | Done for offline scope | Codex | RDS-026ao2 | Use `npm run recall:env:init` only as an empty-key template; after the received live-validation approval, fill the ignored local file only and never paste the key in chat |
| RDS-026ao3 | Execution | Add no-secret live gate status command | Done for offline scope | Codex | RDS-026ao2a | Use `npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json` before live spikes |
| RDS-026ao3a | Execution | Gate live status on env-file permissions | Done for offline scope | Codex | RDS-026ao3 | `recall:live-gate:status` now reports env file mode metadata and blocks readiness if group/other permissions are present; smoke covers insecure and secure env files; report: `RECALL_LIVE_GATE_ENV_FILE_PERMISSION_GUARD_EXECUTION_REPORT_2026-06-24_16-41-18_IST.md` |
| RDS-026ao3b | Execution | Gate live status on env-file location safety | Done for offline scope | Codex | RDS-026ao3a | `recall:live-gate:status` now blocks existing env-file paths that are not ignored or are tracked; smoke covers unignored and tracked env-file paths |
| RDS-026ao3b1 | Execution | Require Recall env file to stay under private evidence root | Done for offline scope | Codex | RDS-026ao3b | `recall:live-gate:status` now blocks ignored env files outside `data/private/recall-live-spikes/`; smoke covers an ignored wrong-root env file |
| RDS-026ao3c | Execution | Clarify live status JSON readiness contract | Done for offline scope | Codex | RDS-026ao3b1 | `recall:live-gate:status` now reports `ok: false` for not-ready statuses, `readyForApprovedLiveSpikes: false`, and `privateEvidenceOk` separately; smoke proves `ok: true` only for `ready_for_approved_live_spikes` |
| RDS-026ao3d | Execution | Add fail-closed live gate readiness command | Done for offline scope | Codex | RDS-026ao3c | `recall:live-gate:require-ready` now exits nonzero when status is not `ready_for_approved_live_spikes`; smoke covers not-ready and ready paths |
| RDS-026ao4 | Execution | Require explicit confirmation for live Recall spike runner | Done for offline scope | Codex | RDS-026ao3d | Use `--confirm-live-api` only after API-key/reporting approval; mixed fixture/live mode is rejected |
| RDS-026ao5 | Execution | Require explicit confirmation for production Recall CLI and scheduled wrapper | Done and validated for offline scope | Codex | RDS-026ao4 | Use `--confirm-live-api` or `BRAIN_RECALL_CONFIRM_LIVE_API=1` only after approval; fixture smokes remain unaffected |
| RDS-026ap | Execution | Add manifest-driven SPIKE-013/SPIKE-014 command path | Done for offline scope | Codex | RDS-026ao | Use `--manifest data/private/recall-live-spikes/controlled-samples.json` for approved live spikes |
| RDS-026aq | Execution | Add combined SPIKE-013/SPIKE-014 live runner | Done and live-validated | Codex | RDS-026ap | Use `npm run recall:live-spikes -- --manifest data/private/recall-live-spikes/controlled-samples.json --env-file data/private/recall-live-spikes/recall.env --confirm-live-api` after approval |
| RDS-026aq0a | Execution | Guard live-spike public report output directory | Done for offline scope | Codex | RDS-026aq | Approved live runs must write reports under `docs/plans/spikes`; fixture rehearsals can use temp dirs |
| RDS-026aq1 | Execution | Create no-secret live API approval checklist | Done for offline scope | Codex | RDS-026aq | Use the checklist before any live API run; no API keys or private card data in the artifact |
| RDS-026aq1a | Execution | Create compact no-secret live API approval handoff | Done for offline scope | Codex | RDS-026aq1/RDS-026an3 | Use the handoff for safe approval text, readiness commands, live command, post-live gates, and stop conditions before any live API run |
| RDS-026aq2 | Execution | Add approval packet consistency gate | Done for offline scope | Codex | RDS-026aq1 | `npm run check:recall-approval-packet` now guards approval checklist, operating packet, runbook, audit, tracker, and script drift |
| RDS-026aq3 | Execution | Add post-live SPIKE report acceptance gate | Done for offline scope | Codex | RDS-026aq2 | Run `npm run check:recall-live-spike-reports -- --enumeration <SPIKE-013.md> --fidelity <SPIKE-014.md> --manifest data/private/recall-live-spikes/controlled-samples.json` before production dry-run; checker resolves helper scripts from its own location and packaged smoke proves helper coverage in the deploy-matching `scripts/` layout; server-side proof may omit the private manifest after local manifest-aware acceptance passes |
| RDS-026aq4 | Execution | Enforce live-spike report proof in production CLI | Done for offline scope | Codex | RDS-026aq3 | Production dry-run/apply can use `--require-live-spike-report-proof`; bundled smoke proves the packaged path |
| RDS-026aq5 | Execution | Enforce live-spike report proof in scheduled wrapper | Done for offline scope | Codex | RDS-026aq4 | Future timer path can set `BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF=1` and pass SPIKE-013/SPIKE-014 report paths; scheduler smoke proves missing proof fails |
| RDS-026ar | Execution | Add private evidence ignore guard | Done for offline scope | Codex | RDS-026aq | Run `npm run check:recall-private-ignore` before creating private Recall evidence |
| RDS-026as | Execution | Add consolidated pre-live readiness gate | Done for offline scope | Codex | RDS-026ar | Run `npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` before approved live API work |
| RDS-026as1 | Execution | Report default manifest status when pre-live runs without manifest enforcement | Done for offline scope | Codex | RDS-026as | No-manifest `check:recall-prelive` now emits redacted `defaultManifest` status and `nextGate` requires rerun with `--manifest` before live API access |
| RDS-026as2 | Execution | Redact private values from pre-live child-command previews | Done for offline scope | Codex | RDS-026as1 | `check:recall-prelive` now redacts manifest card IDs, expected titles, source URLs/paths, notes, Recall API-key-shaped strings, and bearer tokens from `stdoutPreview`/`stderrPreview`; smoke is included in pre-live readiness |
| RDS-026at | Execution | Add first-apply dry-run report review gate | Done for offline scope | Codex | RDS-026as | Run `npm run check:recall-dry-run-report -- --report data/private/recall-live-spikes/dry-run-report.json --max-planned-imports 5 --require-private-path --require-cards-seen` before first apply |
| RDS-026at1 | Execution | Require complete enumeration in dry-run apply proof | Done for offline scope | Codex | RDS-026at | Dry-run report validator and production CLI proof now require `enumerationComplete=true` and `cardsAvailable === cardsSeen`; fixture clients emit `totalCount` for parity |
| RDS-026at2 | Execution | Require freshness in standalone dry-run report review | Done for offline scope | Codex | RDS-026at1 | `check-recall-dry-run-report` now rejects stale reports with `--max-age-minutes` defaulting to 120; smoke covers stale proof failure |
| RDS-026at3 | Execution | Reject future-dated proof files | Done for offline scope | Codex | RDS-026at2 | Standalone dry-run review and production CLI proof freshness now reject proof files more than 1 minute in the future; bundled smoke covers live-spike, dry-run, and backup proof failures |
| RDS-026at4 | Execution | Machine-check future-dated proof policy drift | Done for offline scope | Codex | RDS-026at3 | Approval packet and scheduler artifact checks now require the future-dated proof policy in docs, production CLI guard, and packaged smoke |
| RDS-026au | Execution | Enforce dry-run proof inside apply CLI | Done for offline scope | Codex | RDS-026at | First apply now uses `--require-dry-run-proof --dry-run-report-path data/private/recall-live-spikes/dry-run-report.json` |
| RDS-026av | Execution | Enforce dry-run/apply proof inside scheduled wrapper | Done for offline scope | Codex | RDS-026au | Future timer path now runs dry-run review, backup proof, proof-backed apply, and post-apply report review; timer remains disabled |
| RDS-026av1 | Execution | Add deploy-time scheduled-wrapper smoke enforcement | Done for offline scope | Codex | RDS-026av | `scripts/deploy.sh` now runs `npm run smoke:recall-scheduler-wrapper`, and the scheduler artifact checker prevents drift |
| RDS-026av2 | Execution | Block apply-time importer blockers before checkpoint | Done for offline scope | Codex | RDS-026ah/RDS-026av | Apply now reports blocker counts and leaves checkpoint unchanged if a weak upgrade repair, fidelity policy, or changed-remote result appears during import |
| RDS-026av3 | Execution | Add scheduled-wrapper fidelity-policy negative smoke | Done for offline scope | Codex | RDS-026av1 | Scheduled wrapper smoke now omits `BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT` in a valid fixture/proof run and proves the wrapper stops before backup/apply on `blocked_by_fidelity_policy`; wrapper optional arrays now expand safely under `set -u` |
| RDS-026av4 | Execution | Add scheduled-wrapper key rotation evidence gate | Done for offline scope; real env still stale | Codex | RDS-026av3/RDS-026b12 | Scheduled wrapper now checks key evidence before scheduled live proof/report/dry-run/apply; scheduler smoke proves stale evidence fails before report directory creation |
| RDS-026av5 | Execution | Add deploy override key rotation evidence gate | Done for offline scope; remote env still must be rotated before override windows | Codex | RDS-026av4 | Deploy override windows now require remote key evidence when `BRAIN_RECALL_ALLOW_ENABLED_FLAGS=1` or `BRAIN_RECALL_ALLOW_EXISTING_TIMER=1`; scheduler artifact check enforces this |
| RDS-026av6 | Execution | Pass scheduled key evidence into core apply CLI | Done for offline scope; scheduler remains disabled | Codex | RDS-026av4/RDS-026b23 | `scripts/recall-scheduled-apply.sh` now passes `--require-key-rotation-evidence`, system env-file mode, and `BRAIN_RECALL_REQUIRE_KEY_ROTATION_EVIDENCE=1` into the bundled scheduled apply command; scheduler smoke and scheduler artifact check enforce the pass-through |
| RDS-026av7 | Execution | Align scheduled/deploy key-rotation env-file variable names | Done for offline scope; scheduler remains disabled | Codex | RDS-026av5/RDS-026av6 | Scheduled/deploy paths now prefer `BRAIN_RECALL_KEY_ROTATION_ENV_FILE`, keep `BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE` as a legacy fallback, and smoke proves stale evidence via the new variable stops before report directory creation |
| RDS-026aw | Execution | Create current-state completion audit | Done | Codex | RDS-026av | Audit confirms offline readiness and preserves live/production completion gates |
| RDS-026b | Execution | Run live production-capable dry-run | Done | Codex + Arun | Accepted SPIKE-013/SPIKE-014 proof | Private dry-run report passed `PASS_APPLY_REVIEW_GATE`; no writes or checkpoint advancement |
| RDS-026b1 | Execution | Create first capped apply backup proof | Done | Codex | RDS-026b | Private SQLite backup and temporary restore integrity checks passed; backup proof file is under ignored private evidence path |
| RDS-026b2 | Execution | Create no-secret first capped apply approval packet | Done | Codex | RDS-026b1 | Exact approval text and apply command captured in `RECALL_FIRST_CAPPED_APPLY_APPROVAL_PACKET_2026-06-24_19-28-07_IST.md` |
| RDS-026b3 | Execution | Add first apply and scheduled apply report review gate | Done for offline scope | Codex | RDS-026b2 | Run `npm run check:recall-apply-report` on the private first apply report before deploy/scheduler decisions; future scheduled wrapper also validates each scheduled apply report before success |
| RDS-026b4 | Execution | Add consolidated first capped apply readiness gate | Done | Codex | RDS-026b3 | `npm run check:recall-first-apply-readiness` returned `PASS_FIRST_CAPPED_APPLY_READINESS_GATE`; rerun immediately before any apply |
| RDS-026b5 | Execution | Add guarded first capped apply wrapper | Done for offline scope | Codex | RDS-026b4 | `npm run smoke:recall-first-capped-apply` proves the wrapper refuses without exact approval, reruns readiness, uses a temporary fixture database, and validates the post-apply report |
| RDS-026b6 | Execution | Add first apply proof freshness countdown | Done for offline scope | Codex | RDS-026b5 | `npm run check:recall-first-apply-readiness` now reports proof age and `freshnessRemainingMinutes` for dry-run and backup proof without private content |
| RDS-026b7 | Execution | Fail closed on near-expiry first apply proof | Done for offline scope | Codex | RDS-026b6 | Readiness now requires `minFreshnessRemainingMinutes` and smoke proves `proof_expiring_soon` blocks near-expiry backup proof before apply |
| RDS-026b8 | Execution | Add no-write first apply proof refresh wrapper | Done for offline scope | Codex | RDS-026b7 | `npm run smoke:recall-first-apply-proof-refresh` proves stale proof can be refreshed through dry-run and backup preflight without apply |
| RDS-026b9 | Execution | Add ready-or-refresh proof maintenance wrapper | Done for offline scope | Codex | RDS-026b8 | `npm run smoke:recall-first-apply-ready-or-refresh` proves fresh proof does not refresh, proof freshness failures require confirmation, confirmed refresh delegates to the no-write refresh wrapper, and non-refreshable gates stop |
| RDS-026b10 | Execution | Refresh private first-apply proof before approval window | Done | Codex | RDS-026b9 | `BRAIN_RECALL_FIRST_APPLY_READY_REFRESH_CONFIRM=1 BRAIN_RECALL_FIRST_APPLY_MIN_FRESHNESS_REMAINING_MINUTES=15 npm run recall:first-apply:ready-or-refresh` refreshed private proof and returned `PASS_FIRST_CAPPED_APPLY_READINESS_GATE` without apply |
| RDS-026b11 | Execution | Add key rotation acknowledgement gate for first capped apply | Done for offline scope | Codex | RDS-026b10 | `npm run smoke:recall-first-capped-apply` proves the wrapper refuses without exact `BRAIN_RECALL_KEY_ROTATION_ACK`; no apply was run |
| RDS-026b12 | Execution | Add local key rotation evidence gate for first capped apply | Done for offline scope; real env still stale | Codex | RDS-026b11 | `npm run smoke:recall-key-rotation-evidence` and `npm run smoke:recall-first-capped-apply` pass; real `npm run check:recall-key-rotation-evidence` fails closed until the ignored private env file is updated after key rotation |
| RDS-026b13 | Execution | Align ready-or-refresh with local key rotation evidence | Done for offline scope; real env still stale | Codex | RDS-026b12 | `npm run smoke:recall-first-apply-ready-or-refresh` proves stale key evidence stops before readiness or proof refresh; real `npm run recall:first-apply:ready-or-refresh` now fails closed until key evidence passes |
| RDS-026b14 | Execution | Consolidate key evidence into first-apply readiness and direct proof refresh | Done for offline scope; real env still stale | Codex | RDS-026b13 | `npm run check:recall-first-apply-readiness` now reports `key_rotation_evidence` as a checked gate; direct `npm run recall:first-apply:proof-refresh` fails before live Recall work until key evidence passes |
| RDS-026b15 | Execution | Add first-apply ordered status helper | Done for offline scope; real env still stale | Codex | RDS-026b14 | `npm run recall:first-apply:status` currently reports `blocked_key_rotation_evidence`, with stale proof as secondary context and key rotation as the next command |
| RDS-026b15b | Execution | Add first-apply status gate summary | Done for offline scope; real env still stale | Codex | RDS-026b15 | `RECALL_FIRST_APPLY_STATUS_GATE_SUMMARY_EXECUTION_REPORT_2026-06-25_06-04-42_IST.md` records top-level `gateSummary`; current status identifies `currentBlockingGate: key_rotation_evidence`, owner `Arun`, external action `rotate_recall_api_key_outside_chat`, `safeNoWritePreviewCommand: npm run recall:first-apply:prepare-plan`, and `blockedActions: proof_refresh, first_capped_apply, deploy, scheduler, checkpoint` |
| RDS-026b15c | Execution | Prefer env-file read-only diagnostic when local live gate is ready | Done for offline scope; real env still stale for first-write evidence | Codex | RDS-026b15b/RDS-026b18g | `RECALL_FIRST_APPLY_STATUS_READ_ONLY_DIAGNOSTIC_PRIORITY_EXECUTION_REPORT_2026-06-25_06-22-16_IST.md` records `primarySafeReadOnlyDiagnosticCommand`, `primarySafeReadOnlyDiagnosticCredentialMode: private_env_file`, and `promptFallbackReadOnlyDiagnosticCommand`; `npm run smoke:recall-first-apply-status` proves the prompt remains primary only when the env-file live gate is not ready, while proof refresh/apply/deploy/scheduler/checkpoint stay blocked |
| RDS-026b15a | Execution | Split first-apply status diagnostics between live read and first write | Done for offline scope; real env still stale | Codex | RDS-026b15/RDS-026b18 | `npm run recall:first-apply:status` now includes `diagnostics.liveReadConnectivity.optionalNoWriteCommand` for the standalone read-only auth probe when live gate status is ready, while `diagnostics.firstWriteSafety` keeps proof refresh/apply blocked on stale key evidence |
| RDS-026b16 | Execution | Add first-apply refresh-if-needed alias | Done for offline scope; real env still stale | Codex | RDS-026b15 | `npm run recall:first-apply:refresh-if-needed` delegates to the no-write ready-or-refresh wrapper with refresh confirmation set, but still stops on failed key evidence before live Recall dry-run refresh |
| RDS-026b17 | Execution | Require key rotation acknowledgement before proof refresh | Done for offline scope; real env still stale | Codex | RDS-026b16 | `npm run smoke:recall-first-apply-proof-refresh` proves a fresh-env real proof refresh stops before artifacts without exact `BRAIN_RECALL_KEY_ROTATION_ACK`; current real alias still stops earlier on stale key evidence |
| RDS-026b18 | Execution | Add standalone read-only live auth probe | Done; live Recall reachable | Codex | RDS-026b17 | `npm run recall:live-auth-probe -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api` returned HTTP 200 with zero future-window results; this proves auth/connectivity but does not satisfy first-apply key evidence or proof freshness |
| RDS-026b18a | Execution | Add key-rotation context to read-only live auth probe | Done for offline scope; real env still stale | Codex | RDS-026b18/RDS-026b15a | `npm run smoke:recall-live-auth-probe` now proves the optional probe reports `firstWriteSafety.envFileMtimeAfterCheckpoint` and `keyRotationEvidenceGateRun: false` for stale/fresh private env-file metadata while still refusing to authorize proof refresh or apply |
| RDS-026b18b | Execution | Preserve probe first-write safety context in private key-rotation evidence | Done for offline scope; real env still stale | Codex | RDS-026b18a/RDS-026b19 | `npm run smoke:recall-key-rotation-evidence-record` now proves private evidence stores `liveAuthProbe.firstWriteSafety`, `envFileMtimeAfterCheckpoint`, `proofRefreshAllowedByThisProbe: false`, and `applyAllowedByThisProbe: false` without storing key material |
| RDS-026b18c | Execution | Reject secret-shaped content in private key-rotation evidence | Done for offline scope; real env still stale | Codex | RDS-026b18b/RDS-026b19 | `npm run smoke:recall-key-rotation-evidence` now proves a private evidence file containing secret-shaped content fails without echoing the matched value |
| RDS-026b18d | Execution | Refuse tainted private evidence in post-rotation prepare wrapper | Done for offline scope; real env still stale | Codex | RDS-026b18c/RDS-026b20 | `npm run smoke:recall-first-apply-prepare-after-rotation` now proves tainted private evidence fails as `non_recordable_key_evidence_failure` and is not overwritten before the recorder runs |
| RDS-026b18e | Execution | Add status-preserving first-apply live diagnostic wrapper | Done for offline scope; real env still stale | Codex | RDS-026b15a/RDS-026b18 | `npm run smoke:recall-first-apply-live-diagnostic` proves the wrapper preserves `blocked_key_rotation_evidence`, makes exactly one read-only `/cards` request, supports an env-file-disabled ephemeral process-env credential via `--probe-no-env-file --probe-api-key-env RECALL_EPHEMERAL_API_KEY`, proves `npm run recall:first-apply:live-diagnostic:prompt` reads a key from stdin for the read-only probe without env-file loading, proves the prompt wrapper runs an internal no-live prompt guard preflight before reading a key, rejects caller-supplied probe credential flags before prompting, enriches successful output with `promptWrapper.preKeyGuarded`, `promptWrapper.childApiKeyEnv`, `promptWrapper.envFileDisabledForProbe`, and `promptWrapper.controlledProbeArgsRejectedBeforeKeyEntry`, rejects `--output-file` outside `data/private/recall-live-spikes/` as `output_file_not_private` before reading a key, writes sanitized private output with owner-only mode `0600`, and proves a missing local `recall.env` cannot stop the prompt diagnostic before the read-only probe when env-file loading is disabled; `npm run smoke:recall-first-apply-live-diagnostic-prompt-guard` proves the prompt guard self-test covers that internal preflight before key entry, rejects controlled probe flags before reading stdin, and prints no secret-shaped values; the wrapper reports `localPrivateGateHandling.bypassedLocalLiveGateForReadOnlyProbe` for that case, and package/child/shell Node invocations now use `node --` so Node 22 does not consume AI Brain's `--env-file` argument first across key evidence, prepare, proof refresh, first capped apply, and scheduled apply paths; `npm run check:recall-node-env-file-separators` makes that invariant executable for package env-file scripts, shell wrappers, child spawns, and TSX command ordering; `npm run smoke:recall-first-apply-readiness` proves parent readiness preserves child `env_file_not_rotated_after_checkpoint` findings; `npm run smoke:recall-first-apply-status` proves status exposes `optionalNoWritePromptCommand` even when the local live gate is not ready, includes `--output-file data/private/recall-live-spikes/live-diagnostic-report.json`, reports `optionalNoWritePromptOutputFile`, marks that path with `promptDiagnosticAvailableWithoutLocalLiveGate`, `promptDiagnosticBypassesLocalLiveGate`, and `promptDiagnosticPreKeyGuarded`, hides `optionalNoWriteWrapperCommand` and lower-level env-file diagnostics until the local live gate is ready, exposes `promptGuardSelfTestCommand` as `npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test`, keeps `promptGuardSmokeCommand` as `npm run smoke:recall-first-apply-live-diagnostic-prompt-guard`, puts `first_apply_live_diagnostic_prompt_guard` first as an `offline_self_test` before the preferred real prompt command with `local_prompt_env_file_disabled`, `preKeyGuarded: true`, `guardedBy`, `outputFile`, and `outputFileMode: 0600` metadata in top-level `optionalDiagnosticCommands`, and makes `readOnlyDiagnosticNextAction` name the private-output prompt command, the built-in internal no-live guard before key entry, direct no-live guard, and smoke guard; output reports only status/count metadata and does not unlock proof refresh or apply; first-apply live diagnostic preserves blocked_key_rotation_evidence status |
| RDS-026b18f | Execution | Run actual status-preserving env-file live diagnostic | Done for read-only live scope; first-write still blocked | Codex | RDS-026b18e | `RECALL_FIRST_APPLY_LIVE_DIAGNOSTIC_ACTUAL_ENV_FILE_RUN_2026-06-25_04-58-40_IST.md` records the real `npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api` run: one read-only `GET /cards` request returned HTTP `200`, `authenticated: true`, `reachable: true`, `totalCount: 0`, and `resultCount: 0`; post-run status remained `blocked_key_rotation_evidence` with failed checks `key_rotation_evidence`, `dry_run_report_proof`, and `backup_proof`, `proofRefreshAllowedNow: false`, and `applyAllowedNow: false`; dry-run/backup proof mtimes stayed at 2026-06-24 21:10 IST, key-rotation evidence stayed missing, and no prompt output file was created |
| RDS-026b18g | Execution | Add private output support to env-file live diagnostic | Done for offline scope; first-write still blocked | Codex | RDS-026b18f | `RECALL_FIRST_APPLY_ENV_FILE_LIVE_DIAGNOSTIC_PRIVATE_OUTPUT_EXECUTION_REPORT_2026-06-25_05-09-35_IST.md` records that `scripts/run-recall-first-apply-live-diagnostic.mjs` now accepts `--output-file data/private/recall-live-spikes/live-diagnostic-report.json`, rejects non-private output paths as `output_file_not_private` before probing, writes sanitized owner-only JSON with `diagnosticOutputFile` metadata, and `npm run recall:first-apply:status` exposes the env-file wrapper command with the private output path plus `optionalNoWriteWrapperOutputFile` and `optionalDiagnosticCommands[2].outputFileMode: 0600`; `npm run smoke:recall-first-apply-status`, `npm run smoke:recall-first-apply-live-diagnostic`, and `npm run recall:first-apply:status` passed without real Recall API access, proof refresh, apply, deploy, scheduler, or checkpoint advancement |
| RDS-026b18h | Execution | Run actual env-file live diagnostic with private output | Done for read-only live scope; first-write still blocked | Codex | RDS-026b18g | `RECALL_FIRST_APPLY_ENV_FILE_LIVE_DIAGNOSTIC_PRIVATE_OUTPUT_ACTUAL_RUN_2026-06-25_05-21-39_IST.md` records the real `npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json` run: one read-only `GET /cards` request returned HTTP `200`, `authenticated: true`, `reachable: true`, `totalCount: 0`, and `resultCount: 0`; the private artifact `data/private/recall-live-spikes/live-diagnostic-report.json` exists with `6524` bytes and mode `600`; the artifact secret-shape scan returned no findings; post-run status remained `blocked_key_rotation_evidence` with failed checks `key_rotation_evidence`, `dry_run_report_proof`, and `backup_proof`, `proofRefreshAllowedNow: false`, and `applyAllowedNow: false` |
| RDS-026b18j | Execution | Run actual env-file-primary diagnostic from status guidance | Done for read-only live scope; first-write still blocked | Codex | RDS-026b15c/RDS-026b18h | `RECALL_FIRST_APPLY_ENV_FILE_PRIMARY_LIVE_DIAGNOSTIC_ACTUAL_RUN_2026-06-25_06-32-32_IST.md` records the current `gateSummary.safeReadOnlyDiagnosticCommand` run: one read-only `GET /cards` request returned HTTP `200`, authenticated/reachable, `totalCount: 0`, `resultCount: 0`, wrote `data/private/recall-live-spikes/live-diagnostic-report.json` as `7288` bytes mode `600`, passed `PASS_RECALL_LIVE_DIAGNOSTIC_REPORT`, and preserved `blocked_key_rotation_evidence` with proof/apply/deploy/scheduler/checkpoint still false |
| RDS-026b18k | Execution | Surface existing private diagnostic proof in first-apply status | Done for no-live status-helper scope; first-write still blocked | Codex | RDS-026b18j/RDS-026b18i | `RECALL_FIRST_APPLY_STATUS_PRIVATE_DIAGNOSTIC_PROOF_SUMMARY_EXECUTION_REPORT_2026-06-25_06-40-46_IST.md` records that `npm run recall:first-apply:status` now includes `diagnostics.liveReadConnectivity.latestPrivateDiagnosticProof` for `data/private/recall-live-spikes/live-diagnostic-report.json`; current status reports `PASS_RECALL_LIVE_DIAGNOSTIC_REPORT`, HTTP `200`, authenticated/reachable, size `7288`, mode `600`, and `doesNotAuthorize` for key evidence, proof freshness, approval, apply, deploy, scheduler, and checkpoint, while `proofRefreshAllowedNow` and `applyAllowedNow` stay false |
| RDS-026b18i | Execution | Add no-live private live-diagnostic report checker | Done for offline scope; first-write still blocked | Codex | RDS-026b18h | `RECALL_LIVE_DIAGNOSTIC_REPORT_CHECKER_EXECUTION_REPORT_2026-06-25_05-32-13_IST.md` records `scripts/check-recall-live-diagnostic-report.mjs`, `scripts/smoke-recall-live-diagnostic-report-check.mjs`, `check:recall-live-diagnostic-report`, and `smoke:recall-live-diagnostic-report`; the checker returns `PASS_RECALL_LIVE_DIAGNOSTIC_REPORT` only for ignored, untracked, owner-only, sanitized private diagnostic output and `npm run recall:first-apply:status` exposes `first_apply_live_diagnostic_report_check` with `mode: no_live_private_file_check`, while preserving `blocked_key_rotation_evidence`, `proofRefreshAllowedNow: false`, and `applyAllowedNow: false` |
| RDS-026b19 | Execution | Add private key rotation evidence recorder | Done for offline scope; real evidence file not recorded yet | Codex | RDS-026b18 | `npm run smoke:recall-key-rotation-evidence-record` proves the recorder refuses without exact acknowledgement, runs a read-only auth probe, writes owner-only private evidence without key material, and lets stale env mtime pass only with fresh private evidence |
| RDS-026b20 | Execution | Add post-rotation first-apply prepare wrapper | Done for offline scope; real key rotation still pending | Codex | RDS-026b19 | `npm run smoke:recall-first-apply-prepare-after-rotation` proves one no-write command can record private evidence and refresh stale proof after exact acknowledgement; real command must wait for external key rotation |
| RDS-026b20a | Execution | Add no-live post-rotation prepare plan mode | Done for offline scope; real key rotation still pending | Codex | RDS-026b20 | `RECALL_FIRST_APPLY_POST_ROTATION_PREPARE_PLAN_EXECUTION_REPORT_2026-06-25_05-46-24_IST.md` records `npm run recall:first-apply:prepare-plan`; plan mode prints `first_apply_prepare_after_rotation_plan`, current failed checks, real prepare prerequisites, and planned evidence/proof actions without requiring acknowledgement or confirmation, without calling Recall, and without creating key evidence, refreshing proof, applying, deploying, scheduling, or advancing a checkpoint |
| RDS-026b21 | Execution | Harden prepare wrapper prepare-confirm negative smoke | Done for offline scope; real key rotation still pending | Codex | RDS-026b20 | `npm run smoke:recall-first-apply-prepare-after-rotation` now proves exact key rotation acknowledgement without `BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1` still fails before private evidence creation |
| RDS-026b22 | Execution | Harden ready status apply guidance | Done for offline scope; real key rotation still pending | Codex | RDS-026b21 | `npm run smoke:recall-first-apply-status` now proves ready status points to the approval packet and guarded wrapper with both `BRAIN_RECALL_FIRST_APPLY_APPROVAL` and `BRAIN_RECALL_KEY_ROTATION_ACK`, not a bare apply command |
| RDS-026b23 | Execution | Gate lower-level apply CLI on key rotation evidence | Done for offline scope; real key rotation still pending | Codex | RDS-026b22 | `scripts/sync-recall.ts --apply` now supports `--require-key-rotation-evidence`; `npm run smoke:recall-cli:bundle` proves missing evidence fails before apply and fresh metadata passes in the packaged CLI; `npm run smoke:recall-first-capped-apply` proves the real wrapper path passes those flags into the core CLI |
| RDS-026f | Execution | Add full Recall daily sync completion status helper | Done for no-live/no-write status scope; completion remains false | Codex | RDS-026b18k/RDS-026b23 | `RECALL_DAILY_SYNC_COMPLETION_STATUS_HELPER_EXECUTION_REPORT_2026-06-25_06-56-49_IST.md` records `scripts/check-recall-daily-sync-completion-status.mjs`, `scripts/smoke-recall-daily-sync-completion-status.mjs`, `recall:daily-sync:completion-status`, and `smoke:recall-daily-sync-completion-status`; current output reports `completionAchieved: false`, `blockedRequirements: first_apply_key_and_proof_readiness, first_capped_apply, post_apply_review, production_deploy, scheduler_enablement`, and `noLiveNoWrite: true`, while `--require-complete` exits nonzero until first apply, post-apply review, deploy verification, and scheduler evidence all exist |
| RDS-026g | Execution | Surface whole-goal completion status in pre-live and deploy gates | Done for no-live/no-write release visibility scope; completion remains false | Codex | RDS-026f | `RECALL_DAILY_SYNC_RELEASE_VISIBILITY_GATE_EXECUTION_REPORT_2026-06-25_07-06-36_IST.md` records that pre-live readiness and deploy-time local gates run `smoke:recall-daily-sync-completion-status` plus `recall:daily-sync:completion-status`, and `check:recall-scheduler` now fails if those links drift out |
| RDS-026h | Execution | Harden deploy and scheduler completion evidence validators | Done for no-live/no-write evidence validation scope; completion remains false | Codex | RDS-026f/RDS-026g | `RECALL_COMPLETION_EVIDENCE_VALIDATORS_EXECUTION_REPORT_2026-06-25_07-14-55_IST.md` records `scripts/check-recall-completion-evidence.mjs`, `scripts/smoke-recall-completion-evidence.mjs`, `check:recall-production-deploy-evidence`, `check:recall-scheduler-enable-evidence`, and `smoke:recall-completion-evidence`; completion status now defaults to private deploy/scheduler evidence paths and will not accept loose verdict-only JSON |
| RDS-026i | Execution | Add no-live key rotation operator handoff | Done for no-live/no-write handoff scope; completion remains false | Codex | RDS-026b23/RDS-026f | `RECALL_KEY_ROTATION_HANDOFF_COMMAND_EXECUTION_REPORT_2026-06-25_07-34-55_IST.md` records `scripts/print-recall-key-rotation-handoff.mjs`, `scripts/smoke-recall-key-rotation-handoff.mjs`, `recall:key-rotation:handoff`, and `smoke:recall-key-rotation-handoff`; output turns the current stale key-evidence gate into a checklist while keeping proof refresh, apply, deploy, scheduler, and checkpoint blocked |
| RDS-026j | Execution | Surface key rotation handoff in pre-live and deploy gates | Done for no-live/no-write release visibility scope; completion remains false | Codex | RDS-026i/RDS-026g | `RECALL_KEY_ROTATION_HANDOFF_RELEASE_VISIBILITY_GATE_EXECUTION_REPORT_2026-06-25_07-42-57_IST.md` records `key_rotation_handoff_smoke`, `key_rotation_handoff_snapshot`, deploy local gate wiring, and scheduler-artifact static checks; release paths now surface the owner action and failed key-evidence rules before first-write/deploy/scheduler work |
| RDS-026k | Execution | Smoke post-rotation prepare in pre-live and deploy gates | Done for no-live/no-write release-gate smoke scope; completion remains false | Codex | RDS-026j/RDS-026b20 | `RECALL_POST_ROTATION_PREPARE_RELEASE_GATE_EXECUTION_REPORT_2026-06-25_07-53-55_IST.md` records `post_rotation_prepare_smoke`, deploy local gate wiring, and scheduler-artifact static checks; release paths now prove the post-rotation prepare wrapper still refuses tainted evidence, can record safe private evidence in smoke, and can refresh stale proof without apply |
| RDS-026l | Execution | Fix first-apply refreshability classification before post-rotation prepare | Done for no-live/no-write local gate correctness scope; completion remains false | Codex + Hilbert | RDS-026k/RDS-026b20 | `RECALL_FIRST_APPLY_REFRESHABILITY_BUGFIX_EXECUTION_REPORT_2026-06-25_08-02-46_IST.md` records that `recall:first-apply:status` now includes readiness findings when classifying refreshability and `recall:first-apply:ready-or-refresh` refreshes only when all failures are refreshable proof failures; docs now include the exact key-rotation acknowledgement on the lower-level proof-refresh command |
| RDS-026m | Execution | Surface existing read-only live diagnostic proof in key-rotation handoff | Done for no-live/no-write handoff clarity scope; completion remains false | Codex | RDS-026i/RDS-026b18k | `RECALL_KEY_ROTATION_HANDOFF_READ_ONLY_DIAGNOSTIC_PROOF_FIX_2026-06-25_08-13-44_IST.md` records that `recall:key-rotation:handoff` now exposes `currentGate.readOnlyLiveDiagnostic`, including the existing private `PASS_RECALL_LIVE_DIAGNOSTIC_REPORT` proof, `GET /cards` HTTP `200`, authenticated/reachable status, and `doesNotAuthorize`, while key rotation evidence, proof refresh, apply, deploy, scheduler, and checkpoint gates remain blocked |
| RDS-026n | Execution | Add local rotated-key private env writer | Done for no-live/no-write local env writer scope; completion remains false | Codex | RDS-026m/RDS-026b20 | `RECALL_ROTATED_PRIVATE_ENV_WRITER_EXECUTION_REPORT_2026-06-25_08-26-47_IST.md` records `scripts/write-recall-rotated-env.mjs`, `scripts/smoke-recall-key-rotation-env-writer.mjs`, `recall:key-rotation:write-env`, `smoke:recall-key-rotation-env-writer`, and `key_rotation_env_writer_smoke`; helper requires exact key-rotation acknowledgement, writes only ignored owner-only `data/private/recall-live-spikes/recall.env` with `BRAIN_RECALL_CONFIRM_LIVE_API=0`, runs the no-live metadata gate, appears in handoff/status/approval-packet/runbook guidance, and stops before proof refresh, first apply, deploy, scheduler, or checkpoint work |
| RDS-026c | Execution | Run first capped apply with backup/rollback | Awaiting explicit approval, key rotation acknowledgement, passing local key evidence, and fresh proof - packet ready | Codex + Arun | RDS-026b23 | Do not run apply until Arun explicitly approves the write step, confirms the apply key was rotated after chat exposure, `BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation` returns ready, and readiness is rerun immediately before apply |
| RDS-026d | Execution | Prepare disabled scheduled daily job artifacts | Done for offline scope | Codex | RDS-026ab | Timer files exist but are not enabled; deploy check prevents accidental start and fails if the timer is already enabled/active or Recall enable flags are set without explicit override |
| RDS-026e | Execution | Enable scheduled daily job | Pending | Codex + Arun | RDS-026c repeated clean run | Keep disabled until manual apply validates and Arun approves automation |
| RDS-027 | Deployment | Deploy and verify production | Pending | Codex | RDS-026 | Deploy only after QA clear |

## Current Blockers

| Blocker | Impact | Resolution Needed |
|---|---|---|
| Private Recall evidence directory must remain ignored | Blocks safe local credential/sample handling if it fails | `npm run check:recall-private-ignore` currently passes |
| Live content fidelity requires conservative handling | Blocks production apply by default | Keep unverified Recall chunks blocked unless explicit fidelity flags and dry-run review approve the risk |
| First capped apply not yet approved | Blocks deployment and scheduler enablement | Arun must explicitly approve the write step after key evidence passes and the private dry-run/backup proof is refreshed |
| Recall API key was pasted into chat earlier | Blocks safe first write with that credential | Rotate the Recall API key, store the rotated key only in the ignored private Recall env file, rerun `npm run check:recall-key-rotation-evidence` until it passes, or use `npm run recall:key-rotation-evidence:record` with exact `BRAIN_RECALL_KEY_ROTATION_ACK` to create the ignored owner-only private evidence file before apply |
| First-apply dry-run and backup proof are below freshness floor | Blocks first capped apply | After key evidence passes, rerun `BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." npm run recall:first-apply:refresh-if-needed` to refresh proof without `--apply` |

## Next Recommended Action

Phase A/B live validation, the standalone read-only live auth probe, the first production-shaped dry-run, the no-secret apply approval packet, the machine first-apply readiness gate, the guarded first capped apply wrapper, key rotation acknowledgement gate, local key rotation evidence gate, private key rotation evidence recorder, post-rotation first-apply prepare wrapper, first-apply status helper, first-apply refresh-if-needed alias, first-apply proof refresh key acknowledgement gate, scheduled wrapper key rotation evidence gate, and the proof freshness countdown with minimum freshness floor are complete. The previous private dry-run and backup proof are now below the freshness floor, and ready-or-refresh correctly refuses to refresh until key rotation evidence passes. Next recommended action is key rotation, post-rotation prepare wrapper, then first capped apply approval plus key rotation acknowledgement:

1. Review `data/private/recall-live-spikes/dry-run-report.json` locally if private evidence inspection is needed.
2. Keep apply blocked until Arun explicitly approves writes, the Recall API key used for apply has been rotated after chat exposure, and `npm run check:recall-key-rotation-evidence` passes.
3. If env-file mtime evidence is stale after real rotation, run `BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." npm run recall:key-rotation-evidence:record` to create `data/private/recall-live-spikes/key-rotation-evidence.json` without storing key material.
4. Preferred one-command preparation after rotation: `BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation`; it records private evidence if needed and refreshes stale proof without apply.
5. Use `docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_APPROVAL_PACKET_2026-06-24_19-28-07_IST.md` for the exact approval text and guarded wrapper command.
6. Rerun `npm run check:recall-first-apply-readiness` immediately before any apply.
   - If the output shows `freshnessRemainingMinutes` below `minFreshnessRemainingMinutes` for dry-run or backup proof, refresh that private proof first.
   - Preferred maintenance command: `BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." npm run recall:first-apply:refresh-if-needed`.
   - Refresh command: `BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM=1 npm run recall:first-apply:proof-refresh`.
7. Run capped apply through `npm run recall:first-capped-apply` only after `PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE`, exact approval text, exact `BRAIN_RECALL_KEY_ROTATION_ACK`, live-spike proof, dry-run proof, backup proof, and explicit apply confirmation.
8. Run `npm run check:recall-apply-report -- --report data/private/recall-live-spikes/first-apply-report.json --max-applied-imports 5 --max-age-minutes 120 --require-private-path --require-cards-seen --require-applied-imports --allow-unverified-fidelity --allow-metadata-only-fidelity`.
9. Keep deploy and scheduler enablement blocked until apply verification passes.
10. Baseline Recall-owned secret/privacy scan found no real Recall key or private payload leak.
11. Conservative fidelity-policy apply gating is implemented: dry-run reports blocked cards, and apply exits with policy-blocked status before writes/checkpoint unless explicit fidelity-class approval flags are provided.
12. Dry-run/apply reports now include structured `fidelityCounts`, `policyBlockCounts`, and `policyBlockReasons`; packaged CLI smoke verifies these fields are present in bundled dry-run JSON.
13. Dry-run/apply reports now include non-mutating `plannedActionCounts` so a live dry-run can distinguish would-import, would-skip-existing, would-upgrade-weak, would-skip-strong-source-url, changed-remote, and policy-blocked counts before any writes.
14. `maxImports` now counts only planned import writes (`imported` and `upgraded_existing_weak`), so overlap-window skips do not falsely consume the first-apply write cap.
15. Apply now blocks on `changed_remote` before importer mutation or checkpoint advancement, using exit code `80` and `errorName='remote_changed'`.
16. Dry-run/apply reports now include `cardsPlannedForImport`, so first-apply cap review shows the exact write-like count directly.
17. Approved live SPIKE-013/SPIKE-014 runs can now add `--write-report` or `--report-path` to generate the required redacted Markdown reports directly.
18. SPIKE-013 also supports `--fixture`, so enumeration report generation and privacy behavior can be rehearsed without `RECALL_API_KEY`.
19. `npm run smoke:recall-live-spikes` now rehearses SPIKE-013/SPIKE-014 report generation and privacy redaction without `RECALL_API_KEY`.
20. The live API operating packet and production runbook now use the current tested SPIKE-013/SPIKE-014 flags, including `--write-report` and `--report-path`.
21. `npm run check:recall-public-privacy` now scans public SPIKE-013/SPIKE-014 reports before sharing or commit.
22. `npm run check:recall-private-ignore` now verifies Recall private evidence paths are ignored and not tracked before any private files are created.
23. `npm run check:recall-controlled-samples -- data/private/recall-live-spikes/controlled-samples.json` now validates the private live sample manifest before any approved API access.
24. SPIKE-013 and SPIKE-014 now accept `--manifest data/private/recall-live-spikes/controlled-samples.json`, so the validated private manifest drives the live date window, card IDs, negative control, title checks, and public sample labels.
25. `npm run recall:live-spikes -- --manifest data/private/recall-live-spikes/controlled-samples.json --confirm-live-api` now runs the complete approved live-spike sequence and scans generated reports after explicit live confirmation.
26. `npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` now provides the single pre-live readiness gate before approved API work.
27. `npm run check:recall-dry-run-report -- --report data/private/recall-live-spikes/dry-run-report.json --max-planned-imports 5 --max-age-minutes 120 --require-private-path --require-cards-seen` now machine-checks the live dry-run report before first apply, including report freshness, future-mtime rejection, `enumerationComplete=true`, and `cardsAvailable === cardsSeen`.
28. `scripts/sync-recall.ts --apply` now supports `--require-dry-run-proof` and refuses apply when the reviewed dry-run report is missing, stale, future-dated, mismatched, blocked, too large, incomplete in enumeration, or inconsistent with explicit fidelity/upgrade flags.
29. `scripts/recall-scheduled-apply.sh` now runs scheduled dry-run review, optional live-spike proof, backup proof, and proof-backed apply; `npm run smoke:recall-scheduler-wrapper` proves this future path offline with the packaged CLI and now also proves unaccepted unverified Recall chunks stop before backup/apply.
30. `docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md` maps the original goal to evidence and confirms the goal is not complete until live Recall and production gates pass.
31. `npm run recall:controlled-samples:init` now creates the private controlled-samples template only after private ignore checks pass, reducing the chance of putting live sample metadata in a tracked path.
32. `npm run smoke:recall-controlled-samples-init` now automates the initializer safety checks and is included in `npm run check:recall-prelive`.
33. `npm run recall:env:init` now creates an ignored private env template with empty `RECALL_API_KEY` and `BRAIN_RECALL_CONFIRM_LIVE_API=0`; `npm run smoke:recall-env-init` is included in `npm run check:recall-prelive`.
34. The controlled sample manifest validator now rejects public title/source URL exposure requests, so SPIKE-013/SPIKE-014 public reports are redacted-only by default and the prior reporting-preference blocker is closed for the combined workflow.
35. `npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json` now reports the current live-gate status and next command without printing secrets or private Recall content, and blocks readiness when `recall.env` is outside `data/private/recall-live-spikes/`, not ignored/untracked, or has group/other permissions. Use `npm run recall:live-gate:require-ready -- --manifest ...` when automation must fail closed unless the ready state is reached.
36. The combined SPIKE-013/SPIKE-014 runner now refuses live mode unless `--confirm-live-api` or `BRAIN_RECALL_CONFIRM_LIVE_API=1` is present, and rejects mixed fixture/live mode.
37. `scripts/sync-recall.ts` and `scripts/recall-scheduled-apply.sh` now also require explicit live API confirmation for non-fixture production CLI/scheduler live mode; validation passed for build, bundled CLI smoke, scheduler checks, disabled wrapper, scheduled wrapper smoke including unconfirmed live refusal, pre-live readiness, lint, typecheck, focused Recall tests, and private temp-file hygiene.
38. `docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_CHECKLIST_2026-06-24_14-00-43_IST.md` is the no-secret handoff checklist for the first approved live SPIKE-013/SPIKE-014 run.
39. `npm run check:recall-approval-packet` now machine-checks the no-secret approval checklist, operating packet, production runbook, completion audit, tracker, and required package scripts; it is included in `npm run check:recall-prelive`.
40. `npm run check:recall-live-spike-reports -- --enumeration <SPIKE-013.md> --fidelity <SPIKE-014.md> --manifest data/private/recall-live-spikes/controlled-samples.json` now validates generated live spike reports before production dry-run with exact and normalized private-value privacy scanning; helper scripts are resolved relative to the checker, `npm run smoke:recall-live-spike-reports` covers a non-root cwd, and the bundled CLI smoke proves the no-src helper packaging path in the same `scripts/` layout used by deploy.
41. `scripts/sync-recall.ts` now supports `--require-live-spike-report-proof` with SPIKE-013/SPIKE-014 report paths, so production dry-run/apply can fail before Recall or DB work if accepted live-spike evidence is missing; bundled CLI smoke validates this path.
42. `scripts/recall-scheduled-apply.sh` now honors `BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF=1`; the scheduled-wrapper smoke proves missing proof paths fail before report directory creation and valid SPIKE reports pass through scheduled dry-run/apply.
43. `npm run recall:controlled-samples:guide` now prints a no-secret guide for selecting the six positive live sample cards plus the outside-window negative control; its smoke is included in pre-live readiness.
44. `npm run smoke:recall-live-spikes` now proves approved live report directories outside `docs/plans/spikes` are rejected before output directory creation; fixture rehearsals can still write to temp report directories.
45. `scripts/check-recall-public-manifest-privacy.mjs` now scans public SPIKE reports for exact and normalized private controlled-sample card IDs, expected titles, source URLs, source URL paths, and negative-control values without printing those private values; the live runner calls it after report generation, and deploy now copies the checker plus its `scripts/lib/recall-controlled-samples.mjs` helper and runs live-spike rehearsal smoke.
46. No-secret private templates now exist at `data/private/recall-live-spikes/controlled-samples.json` and `data/private/recall-live-spikes/recall.env`; they are now populated locally under ignored owner-only private paths for live validation.
47. Production deploy now runs `npm run smoke:recall-scheduler-wrapper` before scheduler artifact checking, closing the runbook/deploy mismatch and proving the disabled future timer path during release gates.
48. Apply now blocks checkpoint advancement when import-time blocker results appear after planning, including repair-rejected weak upgrades; the focused Recall runner test and full suite passed.
49. The approval packet checker now requires the proof/report freshness and future-dated-file policy across the checklist, operating packet, runbook, audit, and tracker; the scheduler artifact checker also requires the production CLI guard and packaged smoke coverage.
50. The combined SPIKE-013/SPIKE-014 runner executed successfully against live Recall after local key/confirmation and controlled sample manifest setup; production dry-run also passed, while apply/deploy/scheduler remain blocked.
51. `RECALL_LIVE_GATE_ENV_FILE_PERMISSION_GUARD_EXECUTION_REPORT_2026-06-24_16-41-18_IST.md` records the env-file permission/location guard, validation evidence, and current `recall.env` private-root ignored/untracked owner-only status.
52. `RECALL_LIVE_GATE_STATUS_READINESS_CONTRACT_EXECUTION_REPORT_2026-06-24_17-03-59_IST.md` records the live-gate JSON contract hardening: current placeholder manifest status is `ok: false`, `status: needs_manifest_fix`, `readyForApprovedLiveSpikes: false`, and `privateEvidenceOk: true`.
53. `RECALL_CONTROLLED_SAMPLE_MANIFEST_FILE_SAFETY_GUARD_EXECUTION_REPORT_2026-06-24_16-51-49_IST.md` records the controlled sample manifest file safety guard, validation evidence, and current manifest ignored/untracked owner-only status.
54. `RECALL_PRELIVE_DEFAULT_MANIFEST_STATUS_EXECUTION_REPORT_2026-06-24_17-16-05_IST.md` records the no-manifest pre-live hardening: current output reports `defaultManifest.status: invalid`, `validationEnforced: false`, and a `nextGate` requiring `--manifest` before live API access.
55. `RECALL_PRELIVE_OUTPUT_PREVIEW_REDACTION_EXECUTION_REPORT_2026-06-24_17-22-57_IST.md` records pre-live preview hardening: `stdoutPreview`/`stderrPreview` now redact private manifest values, Recall API-key-shaped strings, and bearer tokens before output.
56. `RECALL_LIVE_GATE_ENV_FILE_PRIVATE_ROOT_GUARD_EXECUTION_REPORT_2026-06-24_17-33-19_IST.md` records env-file private-root hardening: ignored env files outside `data/private/recall-live-spikes/` now block live readiness, and `smoke:recall-live-gate-status` covers this wrong-root case.
57. `RECALL_SCHEDULED_WRAPPER_FIDELITY_POLICY_NEGATIVE_SMOKE_EXECUTION_REPORT_2026-06-24_17-39-12_IST.md` records the scheduled-wrapper negative fidelity smoke and the `set -u` optional-array fix in `scripts/recall-scheduled-apply.sh`.
58. `RECALL_LIVE_GATE_REQUIRE_READY_EXECUTION_REPORT_2026-06-24_17-43-50_IST.md` records the live-gate strict-mode command: status reports still exit 0 by default, while `--require-ready` / `recall:live-gate:require-ready` exits nonzero for all not-ready states.
59. `RECALL_PUBLIC_PRIVACY_REQUIRE_FILES_AND_REDACTED_PREVIEW_EXECUTION_REPORT_2026-06-24_17-51-20_IST.md` records public privacy scanner hardening: `--require-files` fails closed when no SPIKE-013/SPIKE-014 reports are scanned, and failure previews redact secret-shaped values instead of echoing them.
60. `RECALL_MANIFEST_PRIVACY_NORMALIZED_MATCHING_EXECUTION_REPORT_2026-06-24_18-00-19_IST.md` records manifest-aware privacy hardening: exact matching remains, and normalized matching now catches case, whitespace, HTML entity, and percent-encoding variants without printing private values.
61. `RECALL_PUBLIC_MANIFEST_PRIVACY_FILE_SAFETY_GUARD_EXECUTION_REPORT_2026-06-24_18-11-22_IST.md` records standalone manifest-aware privacy scan file-safety hardening: real manifest scans now reject unsafe manifest files by default, while synthetic fixture smokes must opt into `--allow-unsafe-manifest-for-smoke`.
62. `RECALL_DAILY_SYNC_FINAL_IMPLEMENTATION_OPTIONS_V3_2026-06-24_18-17-27_IST.md` is the current final option packet: Option A remains V1, Option B stays disabled opt-in after live proof, MCP/export/browser paths stay fallbacks, and the remaining gate sequence includes strict readiness plus manifest-aware privacy file safety.
63. `RECALL_LIVE_API_APPROVAL_HANDOFF_2026-06-24_18-21-35_IST.md` is the compact no-secret approval handoff for Arun: it states exactly what live approval permits, what remains blocked, safe approval text, readiness commands, post-live gates, and stop conditions.
64. `RECALL_PUBLIC_DOCS_PRIVACY_SCAN_EXECUTION_REPORT_2026-06-24_18-28-55_IST.md` records the current public approval/runbook docs privacy scan: the curated current docs fail closed when missing, safe placeholders pass, synthetic leaks fail with redacted previews, and `npm run check:recall-prelive` plus future deploy local release gates now include the smoke and real current-doc scan.
65. `RECALL_LIVE_API_APPROVAL_RECEIVED_READINESS_CHECK_2026-06-24_18-48-28_IST.md` records the historical approval moment before local key/manifest readiness was fixed.
66. `RECALL_LIVE_SPIKE_EXECUTION_REPORT_2026-06-24_19-06-25_IST.md` records the live Recall API run: SPIKE-013 is `CLEAR`, SPIKE-014 is `PROCEED-WITH-CHANGES`, public privacy and manifest privacy gates passed, and the post-live report gate passed with accepted conservative fidelity handling.
67. `RECALL_FIRST_CAPPED_APPLY_BACKUP_PROOF_2026-06-24_19-19-52_IST.md` records the first capped apply backup proof: the private SQLite backup and temporary restore integrity checks passed, while production apply remains blocked pending explicit write approval.
68. `RECALL_FIRST_CAPPED_APPLY_APPROVAL_PACKET_2026-06-24_19-28-07_IST.md` records the exact no-secret first capped apply approval text and command, including accepted live SPIKE reports, dry-run proof, backup proof, date window, five-import cap, and explicit fidelity flags.
69. `RECALL_APPLY_REPORT_REVIEW_GATE_EXECUTION_REPORT_2026-06-24_19-47-09_IST.md` records the post-apply private report validator and smoke coverage; deploy and scheduler remain blocked unless `PASS_POST_APPLY_REVIEW_GATE` passes after the first capped apply, and the future scheduled wrapper now validates each scheduled apply report before success.
70. `RECALL_FIRST_CAPPED_APPLY_WRAPPER_EXECUTION_REPORT_2026-06-24_20-26-51_IST.md` records the guarded first capped apply wrapper and fixture smoke coverage: it refuses without exact approval, reruns readiness before apply, uses the current proof chain, and validates the private apply report before success.
71. `RECALL_FIRST_APPLY_READINESS_FRESHNESS_COUNTDOWN_EXECUTION_REPORT_2026-06-24_20-34-12_IST.md` records the no-secret proof freshness countdown and minimum freshness floor: the first-apply readiness output now reports proof age, `freshnessRemainingMinutes`, and `minFreshnessRemainingMinutes` for dry-run and backup proof so approval cannot unknowingly race stale evidence.
72. `RECALL_FIRST_APPLY_PROOF_REFRESH_WRAPPER_EXECUTION_REPORT_2026-06-24_20-47-10_IST.md` records the no-write proof refresh wrapper: it refreshes the dry-run proof and backup proof, validates both gates, and reruns first-apply readiness without running `--apply`.
73. `RECALL_FIRST_APPLY_READY_OR_REFRESH_WRAPPER_EXECUTION_REPORT_2026-06-24_21-02-06_IST.md` records the no-write ready-or-refresh wrapper: it checks local key rotation evidence first on the real path, then readiness, refreshes only on proof freshness/existence failures with explicit confirmation, and stops on failed key evidence or other non-refreshable gates without running `--apply`.
74. `RECALL_FIRST_APPLY_PROOF_REFRESH_ACTUAL_EXECUTION_REPORT_2026-06-24_21-11-03_IST.md` records the real no-write proof refresh: the wrapper refreshed private dry-run and backup proof after the backup entered the 15-minute maintenance window, then returned `PASS_FIRST_CAPPED_APPLY_READINESS_GATE` without apply.
75. `RECALL_FIRST_APPLY_KEY_ROTATION_EVIDENCE_GATE_EXECUTION_REPORT_2026-06-24_21-33-19_IST.md` records the local key rotation evidence gate: the wrapper now checks ignored private env-file metadata before real apply, and the current real env file fails closed until it is updated after key rotation.
76. `RECALL_SCHEDULED_WRAPPER_KEY_ROTATION_EVIDENCE_GATE_EXECUTION_REPORT_2026-06-24_23-03-38_IST.md` records the scheduled wrapper key rotation evidence gate: future non-fixture scheduled live mode checks system env-file metadata before live proof, report directory creation, dry-run, backup, or apply.
77. `RECALL_DEPLOY_OVERRIDE_KEY_ROTATION_EVIDENCE_GATE_EXECUTION_REPORT_2026-06-24_23-12-24_IST.md` records the deploy override key rotation evidence gate: deploy override windows now require remote system env-file metadata to pass before deploy proceeds.
78. `RECALL_FIRST_APPLY_READINESS_KEY_EVIDENCE_CONSOLIDATION_EXECUTION_REPORT_2026-06-24_23-23-20_IST.md` records first-apply key-evidence consolidation: readiness now reports the local key evidence gate directly, and direct proof refresh stops before live Recall work while key evidence is stale.
79. `RECALL_FIRST_APPLY_STATUS_HELPER_EXECUTION_REPORT_2026-06-24_23-37-44_IST.md` records the first-apply ordered status helper: `npm run recall:first-apply:status` reports the current next blocker and safe next command without live Recall calls, proof refresh, apply, or checkpoint changes.
80. `RECALL_FIRST_APPLY_REFRESH_IF_NEEDED_ALIAS_EXECUTION_REPORT_2026-06-24_23-50-50_IST.md` records the one-command no-write proof refresh alias: `npm run recall:first-apply:refresh-if-needed` remains blocked on stale key evidence today and is the preferred proof refresh command after key evidence passes.
81. `RECALL_FIRST_APPLY_PROOF_REFRESH_KEY_ACK_GATE_EXECUTION_REPORT_2026-06-25_00-00-33_IST.md` records the proof-refresh key acknowledgement gate: real no-write proof refresh requires exact `BRAIN_RECALL_KEY_ROTATION_ACK` after key evidence passes and before live Recall dry-run refresh.
82. `RECALL_LIVE_AUTH_PROBE_LOCAL_GATE_FIX_EXECUTION_REPORT_2026-06-25_00-11-33_IST.md` records the standalone read-only live auth probe: one future-window `/cards` request returned HTTP 200 with zero results, proving Recall auth/connectivity without first-apply proof refresh, apply, database write, deploy, scheduler, or checkpoint movement.
83. `RECALL_CORE_APPLY_KEY_ROTATION_EVIDENCE_GATE_EXECUTION_REPORT_2026-06-25_01-18-04_IST.md` records the core apply key-rotation evidence gate: lower-level `scripts/sync-recall.ts --apply` can now require the same metadata proof, and the guarded first capped apply wrapper passes that requirement into the real core CLI path.
84. `RECALL_SCHEDULED_APPLY_CORE_KEY_EVIDENCE_PASS_THROUGH_EXECUTION_REPORT_2026-06-25_01-32-17_IST.md` records the scheduled apply core key-evidence pass-through: future non-fixture scheduled apply passes the key-evidence flags and `BRAIN_RECALL_REQUIRE_KEY_ROTATION_EVIDENCE=1` into the bundled core CLI.
85. `RECALL_KEY_ROTATION_ENV_FILE_ALIAS_EXECUTION_REPORT_2026-06-25_01-44-29_IST.md` records the scheduled/deploy key-rotation env-file alias fix: future non-fixture scheduled and deploy override paths prefer `BRAIN_RECALL_KEY_ROTATION_ENV_FILE`, keep `BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE` as a legacy fallback, and still fail closed on stale key evidence before scheduled live work.
86. `RECALL_FIRST_APPLY_STATUS_LIVE_DIAGNOSTIC_SPLIT_EXECUTION_REPORT_2026-06-25_01-53-37_IST.md` records the first-apply status diagnostic split: status output can show the optional no-write live auth probe while still reporting `blocked_key_rotation_evidence` and keeping first-write proof refresh/apply disabled.
87. `RECALL_LIVE_AUTH_PROBE_KEY_ROTATION_CONTEXT_EXECUTION_REPORT_2026-06-25_02-03-04_IST.md` records the live auth probe key-rotation context report: the optional read-only probe now emits `firstWriteSafety`, `envFileMtimeAfterCheckpoint`, and `keyRotationEvidenceGateRun: false` so stale/fresh env-file timestamp context is visible without satisfying key evidence, proof refresh, or apply gates.
88. `RECALL_KEY_ROTATION_EVIDENCE_RECORDER_PROBE_CONTEXT_EXECUTION_REPORT_2026-06-25_02-09-45_IST.md` records the key rotation evidence recorder probe context report: private key-rotation evidence now preserves `liveAuthProbe.firstWriteSafety`, including `envFileMtimeAfterCheckpoint`, `proofRefreshAllowedByThisProbe: false`, and `applyAllowedByThisProbe: false`, without storing key material.
89. `RECALL_KEY_ROTATION_EVIDENCE_FILE_SECRET_GUARD_EXECUTION_REPORT_2026-06-25_02-15-09_IST.md` records the key rotation evidence file secret guard: private key-rotation evidence JSON now fails closed on secret-shaped API-key, bearer-token, cookie, and signed/tokenized URL values without echoing the matched value.
90. `RECALL_POST_ROTATION_PREPARE_TAINTED_EVIDENCE_GUARD_EXECUTION_REPORT_2026-06-25_02-20-28_IST.md` records the post-rotation prepare tainted evidence guard: the prepare wrapper now has smoke proof that secret-tainted private evidence fails as `non_recordable_key_evidence_failure` and is not overwritten before recorder execution.
91. `RECALL_FIRST_APPLY_LIVE_DIAGNOSTIC_WRAPPER_EXECUTION_REPORT_2026-06-25_02-27-19_IST.md` records the first-apply live diagnostic wrapper: the wrapper preserves the first-write `blocked_key_rotation_evidence` status, runs only one read-only `/cards` auth probe, supports `--probe-no-env-file --probe-api-key-env RECALL_EPHEMERAL_API_KEY` for terminal-only read diagnostics when the env file is stale, missing, or not trusted, adds `npm run recall:first-apply:live-diagnostic:prompt` for a local hidden prompt that uses `RECALL_PROMPT_LIVE_DIAGNOSTIC_API_KEY` only in the child process, runs an internal no-live prompt guard preflight before reading a key, rejects caller-supplied probe credential flags before prompting, enriches successful prompt output with `promptWrapper.preKeyGuarded`, `promptWrapper.childApiKeyEnv`, `promptWrapper.envFileDisabledForProbe`, and `promptWrapper.controlledProbeArgsRejectedBeforeKeyEntry`, rejects `--output-file` outside `data/private/recall-live-spikes/` as `output_file_not_private` before reading a key, writes sanitized private output with owner-only mode `0600`, adds `npm run smoke:recall-first-apply-live-diagnostic-prompt-guard` to prove that preflight and rejection before stdin is read, exposes the direct no-live guard from `npm run recall:first-apply:status` as `promptGuardSelfTestCommand: npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test`, preserves the deeper smoke as `promptGuardSmokeCommand`, lists the guard as `first_apply_live_diagnostic_prompt_guard`, exposes the real prompt command with `--output-file data/private/recall-live-spikes/live-diagnostic-report.json` even when the local live gate is not ready with `optionalNoWritePromptOutputFile`, `promptDiagnosticAvailableWithoutLocalLiveGate`, `promptDiagnosticBypassesLocalLiveGate`, `promptDiagnosticPreKeyGuarded`, `preKeyGuarded: true`, `guardedBy`, `outputFile`, and `outputFileMode: 0600` metadata, emits `localPrivateGateHandling.bypassedLocalLiveGateForReadOnlyProbe` when the env-file-disabled prompt path legitimately continues past missing local env-file readiness, fixes Node 22 `--env-file` argument interception with `node --` separators across package scripts, child spawns, proof refresh, first capped apply, and scheduled apply, adds `npm run check:recall-node-env-file-separators` to keep package env-file scripts, shell wrappers, child spawns, and TSX command ordering guarded, preserves child key-evidence findings such as `env_file_not_rotated_after_checkpoint` in parent readiness output, and does not create proof, apply, deploy, schedule, or advance a checkpoint.
92. `RECALL_FIRST_APPLY_LIVE_DIAGNOSTIC_ACTUAL_ENV_FILE_RUN_2026-06-25_04-58-40_IST.md` records that the status-preserving env-file live diagnostic actually ran against Recall: one real read-only `GET /cards` request returned HTTP `200`, `authenticated: true`, `reachable: true`, `totalCount: 0`, and `resultCount: 0`, while the wrapper preserved `blocked_key_rotation_evidence`, left `proofRefreshAllowedNow: false` and `applyAllowedNow: false`, did not create key-rotation evidence, did not refresh dry-run or backup proof, did not create `live-diagnostic-report.json`, and did not apply, deploy, enable the scheduler, or advance a checkpoint.
93. `RECALL_FIRST_APPLY_ENV_FILE_LIVE_DIAGNOSTIC_PRIVATE_OUTPUT_ACTUAL_RUN_2026-06-25_05-21-39_IST.md` records that the env-file live diagnostic also wrote the sanitized private diagnostic artifact: the real read-only `GET /cards` probe returned HTTP `200` and wrote `data/private/recall-live-spikes/live-diagnostic-report.json` with `6524` bytes and mode `600`, with secret-shape scan findings empty and first-write still blocked.
94. `RECALL_LIVE_DIAGNOSTIC_REPORT_CHECKER_EXECUTION_REPORT_2026-06-25_05-32-13_IST.md` records the no-live checker for that private artifact: `npm run check:recall-live-diagnostic-report` validates owner-only ignored/untracked diagnostic output, `npm run smoke:recall-live-diagnostic-report` proves unsafe variants fail, and the checker remains diagnostic-only rather than live connectivity, key-rotation evidence, proof freshness, approval, apply, deploy, scheduler, or checkpoint permission.
95. `RECALL_FIRST_APPLY_POST_ROTATION_PREPARE_PLAN_EXECUTION_REPORT_2026-06-25_05-46-24_IST.md` records the no-live post-rotation prepare plan mode: `npm run recall:first-apply:prepare-plan` prints `first_apply_prepare_after_rotation_plan`, current blockers, real prepare prerequisites, and planned evidence/proof actions without requiring acknowledgement or confirmation and without calling Recall, recording evidence, refreshing proof, applying, deploying, scheduling, or advancing a checkpoint.
96. `RECALL_FIRST_APPLY_STATUS_GATE_SUMMARY_EXECUTION_REPORT_2026-06-25_06-04-42_IST.md` records the status `gateSummary` contract: current blocked status identifies Arun-owned external key rotation, safe no-write preview, and proof refresh/apply/deploy/scheduler/checkpoint as blocked until post-chat key rotation evidence passes.
97. `RECALL_FIRST_APPLY_STATUS_READ_ONLY_DIAGNOSTIC_PRIORITY_EXECUTION_REPORT_2026-06-25_06-22-16_IST.md` records the read-only diagnostic priority follow-up: when the local live gate is ready, status now names the private env-file wrapper as the primary safe diagnostic, keeps the guarded prompt command as fallback, and still leaves first-write gates blocked.
98. `RECALL_FIRST_APPLY_ENV_FILE_PRIMARY_LIVE_DIAGNOSTIC_ACTUAL_RUN_2026-06-25_06-32-32_IST.md` records that the current status-recommended env-file primary read-only diagnostic actually reached Recall: the real `GET /cards` probe returned HTTP `200`, authenticated/reachable, zero future-window results, wrote private diagnostic proof as `7288` bytes mode `600`, passed the private diagnostic report checker, and still did not satisfy key-rotation evidence, proof freshness, apply, deploy, scheduler, or checkpoint gates.
99. `RECALL_FIRST_APPLY_STATUS_PRIVATE_DIAGNOSTIC_PROOF_SUMMARY_EXECUTION_REPORT_2026-06-25_06-40-46_IST.md` records that first-apply status now summarizes the existing private proof as `latestPrivateDiagnosticProof`, including `PASS_RECALL_LIVE_DIAGNOSTIC_REPORT`, HTTP `200`, authenticated/reachable, private proof size/mode metadata, and `doesNotAuthorize`, without making a new live call or unlocking proof refresh, apply, deploy, scheduler, or checkpoint gates.
100. `RECALL_DAILY_SYNC_COMPLETION_STATUS_HELPER_EXECUTION_REPORT_2026-06-25_06-56-49_IST.md` records that the whole Recall daily sync objective now has a no-live/no-write completion status command: current `completionAchieved` is `false`, done proof includes live SPIKE proof, private diagnostic proof, approval/privacy gates, and scheduler artifacts, while blocked requirements remain first-apply readiness, first capped apply, post-apply review, production deploy, and scheduler enablement.
101. `RECALL_DAILY_SYNC_RELEASE_VISIBILITY_GATE_EXECUTION_REPORT_2026-06-25_07-06-36_IST.md` records that pre-live readiness and deploy-time local release gates now run the no-live completion-status smoke and snapshot, while the scheduler artifact checker statically requires those links so future release paths surface the still-blocked first apply, deploy, and scheduler requirements.
102. `RECALL_COMPLETION_EVIDENCE_VALIDATORS_EXECUTION_REPORT_2026-06-25_07-14-55_IST.md` records that production deploy and scheduler enablement completion evidence now have strict no-live validators: evidence must stay private/ignored/owner-only, omit secrets and raw payloads, prove deploy health with the Recall timer still disabled, and later prove scheduler approval, repeated clean runs, enabled timer state, and first scheduled run success.
103. `RECALL_KEY_ROTATION_HANDOFF_COMMAND_EXECUTION_REPORT_2026-06-25_07-34-55_IST.md` records the no-live key-rotation handoff command: `npm run recall:key-rotation:handoff` summarizes `blocked_key_rotation_evidence`, names stale/missing key-evidence rules, prints the exact post-rotation prepare command, and keeps proof refresh, first capped apply, production deploy, scheduler enablement, and checkpoint advancement blocked until key evidence passes.
104. `RECALL_KEY_ROTATION_HANDOFF_RELEASE_VISIBILITY_GATE_EXECUTION_REPORT_2026-06-25_07-42-57_IST.md` records that pre-live readiness and deploy-time local release gates now run the key-rotation handoff smoke and snapshot; `check:recall-scheduler` also requires those links so release paths expose `env_file_not_rotated_after_checkpoint`, `missing_key_rotation_evidence_file`, and blocked proof/apply/deploy/scheduler/checkpoint actions.
105. `RECALL_POST_ROTATION_PREPARE_RELEASE_GATE_EXECUTION_REPORT_2026-06-25_07-53-55_IST.md` records that pre-live readiness and deploy-time local release gates now run `smoke:recall-first-apply-prepare-after-rotation`; `check:recall-scheduler` also requires the package script plus pre-live/deploy wiring so release paths prove the guarded post-rotation prepare wrapper still records only safe private evidence, refuses tainted evidence, and refreshes stale proof without apply.
106. `RECALL_FIRST_APPLY_REFRESHABILITY_BUGFIX_EXECUTION_REPORT_2026-06-25_08-02-46_IST.md` records the QA-found refreshability fix: status now treats readiness findings as failed checks, ready-or-refresh parses readiness JSON and refuses mixed blockers, smoke coverage includes dry-run-only freshness-floor refresh, and lower-level proof-refresh docs now include the exact key-rotation acknowledgement.
107. `RECALL_KEY_ROTATION_HANDOFF_READ_ONLY_DIAGNOSTIC_PROOF_FIX_2026-06-25_08-13-44_IST.md` records the handoff clarity fix: `npm run recall:key-rotation:handoff -- --json` now reports `read_only_live_diagnostic_already_succeeded`, the existing private `PASS_RECALL_LIVE_DIAGNOSTIC_REPORT` proof, `GET /cards` HTTP `200`, authenticated/reachable status, and `doesNotAuthorize`, while still blocking key evidence, proof refresh, first capped apply, deploy, scheduler, and checkpoint movement.
108. `RECALL_ROTATED_PRIVATE_ENV_WRITER_EXECUTION_REPORT_2026-06-25_08-26-47_IST.md` records the local rotated-key env writer: `npm run recall:key-rotation:write-env` writes a post-rotation key only to the ignored owner-only private env file after exact acknowledgement, leaves live confirmation disabled, runs the no-live metadata gate, appears in handoff/status/approval-packet/runbook guidance, and has `npm run smoke:recall-key-rotation-env-writer` wired into pre-live, deploy, and scheduler drift checks without making live Recall calls.

## Context Handover Status Update - 2026-06-26 22:45 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Context handover package | Done | Codex | Created `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/handover/2026-06-26_22-45-32_CONTEXT_HANDOVER/` with index, summary, artifacts/files, technical state, next steps, and self-critique. |
| Live-confirmed whole-goal status | Incomplete | Codex | `BRAIN_RECALL_CONFIRM_LIVE_API=1 npm run -s recall:daily-sync:completion-status` reported `currentBlockingGate: first_write_approval`, owner `Arun`, and blocked requirements `first_capped_apply`, `post_apply_review`, `production_deploy`, `scheduler_enablement`. |
| First capped apply readiness | Ready for approval at handover | Arun | `BRAIN_RECALL_CONFIRM_LIVE_API=1 npm run -s recall:first-apply:status` reported `ready_for_first_capped_apply_approval` with about 81 minutes of dry-run/backup proof freshness remaining at 2026-06-26 22:45 IST. Re-run before any write. |
| Production deploy | Not started | Codex after apply | Must wait for first capped apply and post-apply report review. |
| Scheduler enablement | Not started | Codex after deploy | Must wait for production deploy evidence and scheduler approval/validation. |
| Context rule outcome | Stopped active execution | Codex | Per the goal's context handover rule, active implementation should resume in a fresh continuation after reading the newest handover index. |

## First-Write Approval Gate Refresh - 2026-06-26 22:56 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| First-apply status | Ready for exact approval | Arun | `BRAIN_RECALL_CONFIRM_LIVE_API=1 npm run -s recall:first-apply:status` reported `ready_for_first_capped_apply_approval`, no failed checks, and about 72 minutes of dry-run/backup proof freshness remaining at 22:53 IST. |
| Ready-or-refresh wrapper | Passed without refresh | Codex | `BRAIN_RECALL_CONFIRM_LIVE_API=1 npm run -s recall:first-apply:ready-or-refresh` returned `PASS_FIRST_CAPPED_APPLY_READINESS_GATE` and `ready_without_refresh`; no apply was run. |
| Manifest-enforced pre-live | Passed | Codex | `npm run -s check:recall-prelive:live-confirmed-status -- --manifest data/private/recall-live-spikes/controlled-samples.json` passed, including private controlled-samples validation, production CLI build, bundled CLI smoke, scheduled wrapper smoke, and live-confirmed completion snapshot. |
| Approval-gate status report | Created | Codex | `docs/plans/recall-sync/RECALL_FIRST_WRITE_APPROVAL_GATE_STATUS_2026-06-26_22-56-29_IST.md` records the no-write evidence and exact approval requirement. |
| First capped apply | Blocked on exact user text | Arun | Do not run `recall:first-capped-apply` until Arun provides the exact approval sentence and a fresh status check still reports ready. |

## First Capped Apply, Production Redeploy, and Scheduler Gate - 2026-06-26 23:50 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| First capped apply | Done | Codex | Exact Arun approval was received for the 2026-06-16 window, cap 5. Guarded first apply completed and wrote private owner-only report `data/private/recall-live-spikes/first-apply-report.json`. |
| Post-apply review | Passed | Codex | `npm run -s check:recall-apply-report -- --report data/private/recall-live-spikes/first-apply-report.json --max-applied-imports 5 --max-age-minutes 180 --require-cards-seen --require-applied-imports --allow-unverified-fidelity --allow-metadata-only-fidelity --require-private-path` returned `PASS_POST_APPLY_REVIEW_GATE`: 3 cards seen, 3 planned imports, 3 imported, 0 blocked/skipped/changed remote, checkpoint advanced. |
| Production deployment | Done | Codex | Production deploy completed after first apply. A second deploy was run after dependency-audit and status-smoke fixes; latest private command log is `data/private/recall-live-spikes/production-deploy-command-output-20260626T181006Z.log`. |
| Production deploy evidence | Passed | Codex | Refreshed `data/private/recall-live-spikes/production-deploy-evidence.json` passed `PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION`; production health is HTTP 200, AI provider checks pass on the host, and `brain-recall-sync.timer` is installed but disabled/inactive. |
| Dependency audit follow-up | Done | Codex | Added `package.json` override for `undici: 7.28.0`, refreshed `package-lock.json`, reinstalled dependencies with scripts ignored, and confirmed `npm audit --omit=dev --json` reports 0 vulnerabilities. |
| Completion status helper | Fixed and verified | Codex | `scripts/check-recall-daily-sync-completion-status.mjs` now promotes scheduler enablement as the active gate after first apply/deploy are done. `scripts/smoke-recall-daily-sync-completion-status.mjs` now covers the apply-done/deploy-done/scheduler-missing state and passes. |
| Public execution report | Created | Codex | `docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_AND_PRODUCTION_DEPLOY_EXECUTION_REPORT_2026-06-26_23-50-00_IST.md` records the no-secret outcome. |
| Scheduler approval packet | Created | Codex | `docs/plans/recall-sync/RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md` records the next approval path and evidence requirements. |
| Whole-goal completion status | Incomplete by design | Arun | `npm run -s recall:daily-sync:completion-status` now reports `currentBlockingGate: scheduler_enablement`, `owner: Arun`, `externalActionRequired: true`, blocked requirements `scheduler_enablement`, and blocked actions `scheduler`, `checkpoint`. |

## Next Recommended Action - 2026-06-26 23:50 IST

The first capped apply and production deployment are complete and verified. Do not enable the daily scheduler yet. The remaining gate is scheduler enablement after repeated clean manual-run evidence and explicit scheduler approval:

1. Review `docs/plans/recall-sync/RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md`.
2. Treat the first capped apply as one confirmed clean manual run unless another qualifying clean manual run is separately approved and recorded.
3. Approve and run one additional manual production verification run before scheduler enablement, or explicitly decide that existing evidence is sufficient and record that decision in scheduler evidence.
4. Only after the repeated-run requirement is satisfied, approve scheduler enablement with scope `scheduler_enablement_after_repeated_clean_runs`.
5. Enable `brain-recall-sync.timer`, verify it is enabled/active, verify first `brain-recall-sync.service` run exits 0, and record private owner-only `data/private/recall-live-spikes/scheduler-enable-evidence.json`.
6. Run `npm run -s check:recall-production-deploy-evidence -- --evidence data/private/recall-live-spikes/production-deploy-evidence.json --max-age-minutes 120`.
7. Run `npm run -s check:recall-scheduler-enable-evidence -- --evidence data/private/recall-live-spikes/scheduler-enable-evidence.json --max-age-minutes 120`.
8. Run `npm run -s recall:daily-sync:completion-status -- --require-complete`; only then can the Recall daily sync goal be marked complete.

## Scheduler Manual Clean Run Evidence Guard - 2026-06-26 23:56 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Scheduler evidence contract | Hardened | Codex | `scripts/check-recall-completion-evidence.mjs` now requires `manualCleanRuns[]` evidence in addition to `manualCleanRunsBeforeEnable >= 2`; every counted clean run must have a distinct private apply report path and `PASS_POST_APPLY_REVIEW_GATE`. |
| Completion evidence smoke | Passed | Codex | `npm run -s smoke:recall-completion-evidence` now proves missing manual-run evidence and duplicate manual-run apply report paths fail. |
| Completion status smoke | Passed | Codex | `npm run -s smoke:recall-daily-sync-completion-status` still passes with complete fixtures updated to include two distinct manual clean run entries. |
| Scheduler approval packet | Updated | Codex | `RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md` now documents the `manualCleanRuns[]` requirements. |
| Execution report | Created | Codex | `RECALL_SCHEDULER_ENABLEMENT_MANUAL_CLEAN_RUN_EVIDENCE_GUARD_EXECUTION_REPORT_2026-06-26_23-56-37_IST.md` records the guard and validation. |
| Current real gate | Still scheduler approval | Arun | `npm run -s recall:daily-sync:completion-status` still reports `currentBlockingGate: scheduler_enablement`, owner `Arun`, and blocked actions `scheduler`, `checkpoint`; no scheduler timer was enabled. |

## Scheduler Enablement Evidence Recorder - 2026-06-27 00:07 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Scheduler evidence recorder | Added | Codex | `scripts/record-recall-scheduler-enable-evidence.mjs` records private scheduler evidence only after exact `BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL`, production deploy evidence, at least two manual clean run reports, first scheduled run report, and timer/service/env state are supplied. |
| Recorder smoke | Passed | Codex | `npm run -s smoke:recall-scheduler-enable-evidence-record` proves the recorder refuses missing approval, requires two manual clean run reports, validates apply reports before writing evidence, writes owner-only private evidence, and runs the strict scheduler evidence checker. |
| Release gate wiring | Done | Codex | `scripts/check-recall-prelive-readiness.mjs`, `scripts/deploy.sh`, and `scripts/check-recall-scheduler-artifacts.mjs` now include/assert `smoke:recall-scheduler-enable-evidence-record`. |
| Full pre-live verification | Passed | Codex | `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` passed and included `scheduler_enable_evidence_recorder_smoke`. |
| Execution report | Created | Codex | `RECALL_SCHEDULER_ENABLEMENT_EVIDENCE_RECORDER_EXECUTION_REPORT_2026-06-27_00-07-12_IST.md` records the recorder behavior, command shape, and verification. |
| Current real gate | Still scheduler approval | Arun | `npm run -s recall:daily-sync:completion-status` still reports `currentBlockingGate: scheduler_enablement`; no timer was enabled by this recorder work. |

## Second Manual Verification Apply Wrapper - 2026-06-27 00:14 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Manual verification wrapper | Added | Codex | `scripts/recall-second-manual-verification-apply.sh` requires exact approval, `BRAIN_RECALL_SYNC_ENABLED=1`, live confirmation for non-fixture mode, sets manual verification mode, and delegates to the guarded scheduled apply wrapper without enabling timers. |
| Scheduled wrapper manual mode | Added | Codex | `scripts/recall-scheduled-apply.sh` now accepts `BRAIN_RECALL_MANUAL_VERIFICATION_MODE=1` only with exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`; scheduler mode remains unchanged. |
| Manual wrapper smoke | Passed | Codex | `npm run -s smoke:recall-manual-verification-apply` proves missing approval/sync/live-confirmation refusals, manual-mode delegation, no timer mutation, and no secret-shaped output. |
| Release gate wiring | Done | Codex | `scripts/check-recall-prelive-readiness.mjs`, `scripts/deploy.sh`, and `scripts/check-recall-scheduler-artifacts.mjs` now include/assert `smoke:recall-manual-verification-apply`; deploy also copies `recall-second-manual-verification-apply.sh` to production scripts on next release. |
| Full pre-live verification | Passed | Codex | `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` passed and included `manual_verification_apply_smoke`. |
| Approval packet | Created | Codex | `RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` contains the exact second-run approval text and command shape. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_VERIFICATION_APPLY_WRAPPER_EXECUTION_REPORT_2026-06-27_00-14-29_IST.md` records the wrapper behavior and validation. |
| Current real gate | Still scheduler approval path | Arun | No second live write was run and no timer was enabled. Next step is explicit approval for the second manual verification run. |

## Live Diagnostic Local Status Failure Bypass - 2026-06-27 00:23 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Status-helper failure bypass | Added | Codex | `scripts/run-recall-first-apply-live-diagnostic.mjs` can now continue past a local first-apply status-helper failure only for an explicitly confirmed, env-file-disabled, read-only probe with a terminal-only credential. |
| First-write safety | Preserved | Codex | The fallback status is `local_private_gate_status_failed`; output keeps `blockedBeforeProofRefreshOrApply: true`, `proofRefreshAllowedNow: false`, and `applyAllowedNow: false`. |
| Diagnostic report validator | Updated | Codex | `scripts/check-recall-live-diagnostic-report.mjs` now accepts `local_private_gate_status_failed` as diagnostic-only status-before-probe evidence. |
| Regression smoke | Passed | Codex | `npm run -s smoke:recall-first-apply-live-diagnostic` now injects a failing status helper and proves the env-file-disabled read-only probe still makes exactly one `/cards` request to the local test server without exposing secrets or private Recall content. |
| Execution report | Created | Codex | `RECALL_LIVE_DIAGNOSTIC_LOCAL_STATUS_FAILURE_BYPASS_EXECUTION_REPORT_2026-06-27_00-23-39_IST.md` records the fix, guard conditions, and verification. |
| Current real gate | Unchanged | Arun | No real Recall API call, write, deploy, scheduler enablement, or checkpoint movement happened. Next production step remains explicit approval for the second manual verification run. |

## Live Diagnostic Local Status Failure Release Gate Hardening - 2026-06-27 00:31 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Pre-live wiring | Added | Codex | `scripts/check-recall-prelive-readiness.mjs` now requires `first_apply_live_diagnostic_smoke` and `first_apply_live_diagnostic_prompt_guard_smoke`. |
| Deploy gate wiring | Added | Codex | `scripts/deploy.sh` now runs `smoke:recall-first-apply-live-diagnostic` and `smoke:recall-first-apply-live-diagnostic-prompt-guard` before build/deploy. |
| Static release guard | Added | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now asserts the package scripts, pre-live wiring, deploy wiring, local status-helper failure smoke coverage, and `failureBypassedForReadOnlyProbe` assertion. |
| Full pre-live verification | Passed | Codex | `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` passed and now includes both first-apply live diagnostic smoke steps. |
| Execution report | Created | Codex | `RECALL_LIVE_DIAGNOSTIC_LOCAL_STATUS_FAILURE_RELEASE_GATE_HARDENING_2026-06-27_00-31-34_IST.md` records the release-gate hardening and verification. |
| Current real gate | Unchanged | Arun | No real Recall API call, write, deploy, scheduler enablement, or checkpoint movement happened. Next production step remains explicit approval for the second manual verification run. |

## Live Diagnostic Status-Helper Failure Actual Run - 2026-06-27 00:36 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Real read-only Recall probe | Passed | Codex | The env-file-disabled diagnostic made one real read-only `/cards` call and returned HTTP `200`, authenticated/reachable, with `totalCount: 0` and `resultCount: 0`. |
| Local status-helper failure proof | Passed | Codex | A temporary private injector made `check-recall-first-apply-status.mjs` fail first; the wrapper still ran the env-file-disabled live probe and reported `failureBypassedForReadOnlyProbe: true`. |
| Private report | Passed checker | Codex | `data/private/recall-live-spikes/live-diagnostic-status-helper-failed-bypass-20260626T190534Z.json` passed `PASS_RECALL_LIVE_DIAGNOSTIC_REPORT` with `statusBeforeProbe: local_private_gate_status_failed` and `failedChecks: status_helper_execution`. |
| Temporary injector cleanup | Done | Codex | `data/private/recall-live-spikes/status-helper-failer.cjs` was removed after the proof run. |
| Execution report | Created | Codex | `RECALL_LIVE_DIAGNOSTIC_STATUS_HELPER_FAILURE_ACTUAL_RUN_2026-06-27_00-36-10_IST.md` records the actual live proof without exposing secrets or private Recall content. |
| Current real gate | Unchanged | Arun | No write, deploy, scheduler enablement, or checkpoint movement happened. Next production step remains explicit approval for the second manual verification run. |

## Completion Status Second Manual Gate Guidance - 2026-06-27 00:45 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Completion status next gate | Corrected | Codex | `scripts/check-recall-daily-sync-completion-status.mjs` now reports `second_manual_verification_run` as the active gate when first apply/deploy are complete but only one clean manual run exists. |
| Manual clean-run readiness | Added | Codex | Scheduler requirement evidence now includes `manualCleanRunReadiness` with required count `2`, current count, approval packet path, and whether scheduler approval is allowed by manual-run evidence. |
| Completion status smoke | Passed | Codex | `npm run -s smoke:recall-daily-sync-completion-status` now proves both one-clean-run and two-clean-run states. |
| Current real status | Incomplete by design | Arun | `npm run -s recall:daily-sync:completion-status` reports `currentBlockingGate: second_manual_verification_run`, `externalAction: approve_second_manual_verification_run_before_scheduler_enablement`, one clean manual run counted, and blocked actions `second_manual_verification`, `scheduler`, `checkpoint`. |
| Execution report | Created | Codex | `RECALL_COMPLETION_STATUS_SECOND_MANUAL_GATE_GUIDANCE_2026-06-27_00-45-20_IST.md` records the no-secret guidance correction and verification. |
| Current real gate | Awaiting explicit second-run approval | Arun | No live Recall API call, write, deploy, scheduler enablement, or checkpoint movement happened. |

## Second Manual Verification Readiness Gate - 2026-06-27 00:56 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Readiness command | Added | Codex | `scripts/check-recall-second-manual-verification-readiness.mjs` verifies the project is ready for exact owner approval of the second manual run while keeping `liveWriteAllowedNow: false`, `schedulerAllowedNow: false`, and `checkpointAllowedNow: false`. |
| Readiness smoke | Passed | Codex | `npm run -s smoke:recall-second-manual-readiness` proves the approval-ready state, wrong scheduler-ready gate, missing production deploy evidence, zero-prior-clean-run blocker, and no secret-shaped output. |
| Package scripts | Added | Codex | `recall:second-manual:readiness` and `smoke:recall-second-manual-readiness` are now exposed in `package.json`. |
| Release gate wiring | Done | Codex | `scripts/check-recall-prelive-readiness.mjs`, `scripts/deploy.sh`, and `scripts/check-recall-scheduler-artifacts.mjs` now include/assert the readiness smoke. |
| Current real readiness | Ready for approval only | Arun | `npm run -s recall:second-manual:readiness` returns `ready_for_second_manual_verification_approval`, current gate `second_manual_verification_run`, one clean manual run counted, and no live write permission granted. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_VERIFICATION_READINESS_GATE_2026-06-27_00-56-03_IST.md` records the no-secret implementation and verification. |
| Current real gate | Awaiting exact second-run approval | Arun | No live Recall API call, write, deploy, scheduler enablement, or checkpoint movement happened. |

## Second Manual Readiness Status Guidance Alignment - 2026-06-27 01:01 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Completion status safe-next guidance | Aligned | Codex | `scripts/check-recall-daily-sync-completion-status.mjs` now includes `npm run recall:second-manual:readiness` before the live manual wrapper in `safeNextCommands` when the active gate is `second_manual_verification_run`. |
| Completion status smoke | Passed | Codex | `scripts/smoke-recall-daily-sync-completion-status.mjs` now asserts the scheduler-only fixture points to the readiness command. |
| Approval packet script coverage | Hardened | Codex | `scripts/check-recall-approval-packet.mjs` now requires package scripts for manual verification apply, second-manual readiness, and scheduler enablement evidence recording plus their smokes. |
| Second-run approval packet | Updated | Codex | `RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` now tells operators to run readiness before approval/live run, adds readiness failure as a stop condition, and corrects current gate to `second_manual_verification_run`. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_READINESS_STATUS_GUIDANCE_ALIGNMENT_2026-06-27_01-01-12_IST.md` records the no-secret guidance alignment. |
| Current real gate | Awaiting exact second-run approval | Arun | No live Recall API call, write, deploy, scheduler enablement, or checkpoint movement happened. |

## Public Docs Privacy Corpus Second Manual Reports - 2026-06-27 01:06 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Curated public-doc corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` now scans 73 current Recall public documents by default, including first apply/deploy, scheduler handoff, live-diagnostic, second-manual approval, and readiness guidance reports. |
| Privacy scan | Passed | Codex | `npm run -s check:recall-public-docs-privacy` passed across the expanded fail-closed corpus. |
| Privacy smoke | Passed | Codex | `npm run -s smoke:recall-public-docs-privacy` still proves missing curated docs fail closed and synthetic leak previews are redacted. |
| Full pre-live gate | Passed | Codex | `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` passed and included `public_docs_privacy_scan` with 73 scanned files. |
| Execution report | Created | Codex | `RECALL_PUBLIC_DOCS_PRIVACY_CORPUS_SECOND_MANUAL_REPORTS_2026-06-27_01-06-52_IST.md` records the no-secret corpus hardening and verification. |
| Current real gate | Awaiting exact second-run approval | Arun | No live Recall API call, write, deploy, scheduler enablement, or checkpoint movement happened. |

## First-Apply Status Confirmation-Only Live Diagnostic Guidance - 2026-06-27 01:20 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Status helper guidance | Fixed | Codex | `scripts/check-recall-first-apply-status.mjs` now treats `needs_live_api_confirmation` as confirmation-only when the private env file is safely loaded, and recommends the direct env-file diagnostic wrapper with `--confirm-live-api`. |
| Regression smoke | Passed | Codex | `npm run -s smoke:recall-first-apply-status` now covers the confirmation-missing fixture and proves the env-file wrapper is preferred while first-write, deploy, scheduler, and checkpoint actions remain blocked. |
| Read-only live reproduction | Passed | Codex | `npm run -s recall:first-apply:live-diagnostic -- --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-current-repro.json` made one future-window `/cards` call, returned HTTP `200`, authenticated/reachable, with `totalCount: 0` and `resultCount: 0`. |
| Private report checker | Passed | Codex | `npm run -s check:recall-live-diagnostic-report -- --report data/private/recall-live-spikes/live-diagnostic-current-repro.json` returned `PASS_RECALL_LIVE_DIAGNOSTIC_REPORT`. |
| Completion status durable evidence | Fixed | Codex | `scripts/check-recall-daily-sync-completion-status.mjs` now treats apply reports as durable historical completion evidence by default, so stale first-apply report mtime no longer regresses the active gate after deploy evidence exists. |
| Completion status smoke | Passed | Codex | `npm run -s smoke:recall-daily-sync-completion-status` now proves stale historical apply evidence does not mask the real `second_manual_verification_run` gate. |
| Current completion status | Corrected | Codex | `npm run -s recall:daily-sync:completion-status` again reports `currentBlockingGate: second_manual_verification_run`, one clean manual run counted, and only `scheduler_enablement` blocked. |
| Second manual readiness | Passed | Codex | `npm run -s recall:second-manual:readiness` reports `ready_for_second_manual_verification_approval`, `liveWriteAllowedNow: false`, `schedulerAllowedNow: false`, and `checkpointAllowedNow: false`. |
| Full pre-live gate | Passed | Codex | `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` passed and includes the 74-file public-doc privacy scan plus completion-status snapshot at `second_manual_verification_run`. |
| Execution report | Created | Codex | `RECALL_FIRST_APPLY_STATUS_CONFIRMATION_ONLY_LIVE_DIAGNOSTIC_GUIDANCE_2026-06-27_01-20-56_IST.md` records the no-secret root cause, fix, live reproduction, and safety notes. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report, increasing the curated default scan to 74 current Recall public docs. |
| Current real gate | Awaiting exact second-run approval | Arun | No Recall -> AI Brain import, database write, deploy, scheduler enablement, or checkpoint movement happened. |

## Scheduler Manual Run Distinctness Recorder Guard - 2026-06-27 01:33 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Recorder duplicate-run guard | Added | Codex | `scripts/record-recall-scheduler-enable-evidence.mjs` now rejects duplicate `--manual-clean-run` apply report paths before writing scheduler evidence. |
| Recorder smoke | Passed | Codex | `npm run -s smoke:recall-scheduler-enable-evidence-record` now proves duplicate manual clean-run reports fail with `duplicate_manual_clean_run_apply_report` before scheduler evidence is left behind. |
| Strict completion evidence smoke | Passed | Codex | `npm run -s smoke:recall-completion-evidence` still proves the downstream scheduler evidence checker rejects duplicate manual-run report paths as defense in depth. |
| Scheduler artifact gate | Passed | Codex | `npm run -s check:recall-scheduler` still passes after the recorder guard. |
| Second manual readiness | Passed | Codex | `npm run -s recall:second-manual:readiness` still reports `ready_for_second_manual_verification_approval`, with live write, scheduler, and checkpoint permissions false. |
| Completion status | Unchanged | Codex | `npm run -s recall:daily-sync:completion-status` still reports `currentBlockingGate: second_manual_verification_run`, one clean manual run counted, and scheduler approval disallowed by manual-run evidence. |
| Execution report | Created | Codex | `RECALL_SCHEDULER_MANUAL_RUN_DISTINCTNESS_RECORDER_GUARD_2026-06-27_01-33-47_IST.md` records the guardrail and no-secret verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report, increasing the curated default scan to 75 current Recall public docs. |
| Current real gate | Awaiting exact second-run approval | Arun | No Recall API call, import, database write, deploy, scheduler enablement, or checkpoint movement happened. |

## Completion Status Completed First-Apply Evidence Clarity - 2026-06-27 01:40 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Post-apply readiness evidence | Clarified | Codex | `scripts/check-recall-daily-sync-completion-status.mjs` now reports `first_apply_key_and_proof_readiness.evidence.status: satisfied_by_completed_first_apply` after the first apply has passed, instead of embedding stale pre-apply failed checks. |
| Completion status smoke | Passed | Codex | `npm run -s smoke:recall-daily-sync-completion-status` now proves completed first-apply readiness evidence suppresses stale pre-apply failed checks in post-apply states. |
| Current completion status | Passed | Codex | `npm run -s recall:daily-sync:completion-status` still reports `currentBlockingGate: second_manual_verification_run`, with one clean manual run counted and scheduler approval disallowed. |
| Execution report | Created | Codex | `RECALL_COMPLETION_STATUS_COMPLETED_FIRST_APPLY_EVIDENCE_CLARITY_2026-06-27_01-40-24_IST.md` records the no-secret status clarity change and verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report, increasing the curated default scan to 76 current Recall public docs. |
| Current real gate | Awaiting exact second-run approval | Arun | No Recall API call, import, database write, deploy, scheduler enablement, or checkpoint movement happened. |

## Pre-Live Next Gate Completion Status Alignment - 2026-06-27 01:47 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Pre-live top-level next gate | Aligned | Codex | `scripts/check-recall-prelive-readiness.mjs` now parses the embedded `daily_sync_completion_status_snapshot` and exposes a structured `nextGate.currentProductionGate` instead of the stale live-spike setup string. |
| Completion status summary | Added | Codex | The `daily_sync_completion_status_snapshot` result now includes sanitized `statusSummary` fields: current gate, owner, blocked actions, safe next commands, and manual clean-run readiness without private Recall content. |
| Manifest-enforced pre-live | Passed | Codex | `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` now reports `nextGate.currentProductionGate.currentBlockingGate: second_manual_verification_run`, `cleanRunCount: 1`, and scheduler approval disallowed. |
| Execution report | Created | Codex | `RECALL_PRELIVE_NEXT_GATE_COMPLETION_STATUS_ALIGNMENT_2026-06-27_01-47-04_IST.md` records the no-secret release guidance alignment. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report, increasing the curated default scan to 77 current Recall public docs. |
| Current real gate | Awaiting exact second-run approval | Arun | No Recall API call, import, database write, deploy, scheduler enablement, or checkpoint movement happened. |

## Pre-Live Next Gate Static Release Guard - 2026-06-27 01:53 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now asserts pre-live readiness keeps `statusSummary`, `currentProductionGate`, `manualCleanRunReadiness`, and the no-write next-gate safety note. |
| Scheduler artifact gate | Passed | Codex | `npm run -s check:recall-scheduler` passes with the new static contract checks. |
| Manifest-enforced pre-live | Passed | Codex | `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` still reports `nextGate.currentProductionGate.currentBlockingGate: second_manual_verification_run`. |
| Second manual readiness | Passed | Codex | `npm run -s recall:second-manual:readiness` still reports approval-only readiness, one clean manual run counted, and live write/scheduler/checkpoint permissions false. |
| Execution report | Created | Codex | `RECALL_PRELIVE_NEXT_GATE_STATIC_RELEASE_GUARD_2026-06-27_01-53-23_IST.md` records the static release guard and no-secret verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report, increasing the curated default scan to 78 current Recall public docs. |
| Current real gate | Awaiting exact second-run approval | Arun | No Recall API call, import, database write, deploy, scheduler enablement, or checkpoint movement happened. |

## First Capped Apply Approval Reconciliation - 2026-06-27 01:58 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| User approval received | Reconciled | Codex | Arun approved the first capped Recall -> AI Brain apply after the durable first-apply report already existed. No duplicate first apply was run. |
| Completion status | Passed as historical evidence | Codex | `npm run -s recall:daily-sync:completion-status` reports `first_capped_apply`, `post_apply_review`, production deploy verification, and scheduler artifact checks as done. |
| Active gate | Still blocked on second manual verification | Arun | Completion status reports `currentBlockingGate: second_manual_verification_run`, one clean manual run counted, and scheduler enablement evidence missing. |
| Second manual readiness | Ready for exact approval only | Codex | `npm run -s recall:second-manual:readiness` reports `ready_for_second_manual_verification_approval`; live write, scheduler, and checkpoint permissions remain false until exact second-run approval. |
| Safety outcome | No write performed | Codex | No Recall API call, import, database write, deploy, scheduler enablement, or checkpoint movement happened during this reconciliation. |

## First-Apply Status Completed Gate Reconciliation - 2026-06-27 02:08 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| First-apply status helper | Fixed | Codex | `scripts/check-recall-first-apply-status.mjs` now checks the durable private first-apply report before stale pre-apply proof and returns `first_capped_apply_completed` when post-apply review passed. |
| Operator next gate | Corrected | Codex | `npm run -s recall:first-apply:status` now points to `second_manual_verification_run` and `npm run recall:second-manual:readiness`, rather than reopening first-write readiness. |
| Pre-first-apply helper workflows | Preserved | Codex | Live diagnostic, key-rotation handoff, and post-rotation prepare helpers explicitly pass `--skip-completed-apply-check` for their internal pre-first-apply status probes. |
| Regression coverage | Passed | Codex | `npm run -s smoke:recall-first-apply-status` now proves a completed apply report suppresses stale pre-apply blockers and keeps later gates blocked. |
| Full release gate | Passed | Codex | `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` passed after dependent helper smokes were aligned. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes `RECALL_FIRST_APPLY_STATUS_COMPLETED_GATE_RECONCILIATION_2026-06-27_02-08-29_IST.md`; curated scan now covers 79 current Recall docs. |
| Current real gate | Awaiting exact second-run approval | Arun | No Recall API call, import, database write, deploy, scheduler enablement, or checkpoint movement happened. |

## Key-Rotation Handoff Completed Phase Alignment - 2026-06-27 02:17 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Handoff current phase | Aligned | Codex | `scripts/print-recall-key-rotation-handoff.mjs` now reports `currentPhase: first_apply_completed` and `currentGate.status: first_capped_apply_completed` by default after the first capped apply has passed. |
| Required external action | Corrected | Codex | Handoff JSON now points to `approve_second_manual_verification_run_before_scheduler_enablement` instead of key rotation as the current owner action in the completed-first-apply phase. |
| Legacy key-rotation regression mode | Preserved | Codex | `--skip-completed-apply-check` keeps the old pre-first-apply key-rotation checklist available for smoke fixtures and historical workflows. |
| Pre-live snapshot wording | Updated | Codex | `scripts/check-recall-prelive-readiness.mjs` now describes the handoff snapshot as the current production phase and safe next commands. |
| Verification | Passed | Codex | `npm run -s smoke:recall-key-rotation-handoff`, `npm run -s recall:key-rotation:handoff -- --json`, `npm run -s check:recall-scheduler`, `npm run -s recall:daily-sync:completion-status`, `npm run -s recall:second-manual:readiness`, and full manifest-enforced pre-live passed. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes `RECALL_KEY_ROTATION_HANDOFF_COMPLETED_PHASE_ALIGNMENT_2026-06-27_02-17-05_IST.md`; curated scan now covers 80 current Recall docs. |
| Current real gate | Awaiting exact second-run approval | Arun | No Recall API call, import, database write, deploy, scheduler enablement, or checkpoint movement happened. |

## Second Manual Wrapper Internal Readiness Gate - 2026-06-27 02:24 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Wrapper readiness gate | Hardened | Codex | `scripts/recall-second-manual-verification-apply.sh` now reruns `scripts/check-recall-second-manual-verification-readiness.mjs` after exact approval/sync/live-confirmation checks and before delegated apply. |
| Wrapper failure mode | Hardened | Codex | If readiness fails, the wrapper stops with a targeted message telling the operator to rerun `npm run recall:second-manual:readiness` for details. |
| Regression coverage | Passed | Codex | `npm run -s smoke:recall-manual-verification-apply` now proves the wrapper runs readiness, stops on readiness failure, and delegates only after readiness plus exact approval/sync/live confirmation. |
| Release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` statically requires the wrapper readiness call and corresponding smoke coverage. |
| Approval packet | Updated | Codex | `RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` now documents the wrapper's internal readiness rerun. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_WRAPPER_INTERNAL_READINESS_GATE_2026-06-27_02-24-37_IST.md` records the no-secret implementation and verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report; curated scan should now cover 81 current Recall docs. |
| Current real gate | Awaiting exact second-run approval | Arun | No Recall API call, import, database write, deploy, scheduler enablement, or checkpoint movement happened. |

## Second Manual Command Builder - 2026-06-27 02:34 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Command builder | Added | Codex | `scripts/print-recall-second-manual-verification-command.mjs` selects the latest matching SPIKE-013/SPIKE-014 pair, validates it, runs readiness by default, and prints the guarded second-manual command with concrete proof paths. |
| Package scripts | Added | Codex | `recall:second-manual:command` and `smoke:recall-second-manual-command` are exposed in `package.json`. |
| Placeholder risk | Reduced | Codex | The approval packet now prefers `npm run -s recall:second-manual:command`, so operators do not have to manually replace `<SPIKE-013-report-path>` and `<SPIKE-014-report-path>` before the approved run. |
| Current selected proof | Validated | Codex | `npm run -s recall:second-manual:command -- --json` selected the `2026-06-26_21-58-57_IST` SPIKE pair and returned `PASS_WITH_ACCEPTED_FIDELITY_CHANGES` plus readiness `ready_for_second_manual_verification_approval`. |
| Release gates | Hardened | Codex | `scripts/check-recall-prelive-readiness.mjs`, `scripts/deploy.sh`, and `scripts/check-recall-scheduler-artifacts.mjs` now include/assert the command-builder smoke. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_COMMAND_BUILDER_2026-06-27_02-34-33_IST.md` records the no-secret implementation and verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the command-builder report; curated scan should now cover 82 current Recall docs. |
| Current real gate | Awaiting exact second-run approval | Arun | No Recall API call, import, database write, deploy, scheduler enablement, or checkpoint movement happened. |

## Second Manual Runtime Preflight Deploy Alignment - 2026-06-27 02:48 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Root cause | Confirmed | Codex | The manual wrapper had been changed to call the local second-manual readiness checker, but deploy copied the wrapper without copying that helper and its broader local dependencies. This could stop an approved production run before the intended live Recall path. |
| Runtime preflight | Added | Codex | `scripts/check-recall-second-manual-runtime-preflight.mjs` validates exact approval, sync/live flags, concrete SPIKE proof paths, explicit fidelity flags, `BRAIN_RECALL_MAX_IMPORTS<=5`, scheduler-disabled manual mode, and deployed helper availability without live calls or writes. |
| Wrapper alignment | Fixed | Codex | `scripts/recall-second-manual-verification-apply.sh` now calls the runtime preflight before setting manual mode and delegating to `scripts/recall-scheduled-apply.sh`. |
| Deploy alignment | Fixed | Codex | `scripts/deploy.sh` now copies `check-recall-second-manual-runtime-preflight.mjs`, `check-recall-apply-report.mjs`, and public SPIKE-013/SPIKE-014 proof reports into production. |
| Command builder privacy | Hardened | Codex | `scripts/print-recall-second-manual-verification-command.mjs` still uses the private manifest for local proof validation, but omits `BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH` from the production command unless `--include-runtime-manifest` is passed. |
| Release gates | Passed | Codex | `npm run -s smoke:recall-second-manual-runtime-preflight`, `npm run -s smoke:recall-manual-verification-apply`, `npm run -s smoke:recall-second-manual-command`, `npm run -s check:recall-scheduler`, and `npm run -s recall:second-manual:command -- --json` passed. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_RUNTIME_PREFLIGHT_DEPLOY_ALIGNMENT_2026-06-27_02-48-21_IST.md` records the no-secret root cause, fix, and verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report; curated scan should now cover 83 current Recall docs. |
| Current real gate | Awaiting exact second-run approval | Arun | No Recall API call, import, database write, production deploy, scheduler enablement, or checkpoint movement happened. |

## Second Manual Runtime Preflight Production Sync - 2026-06-27 02:56 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Remote gap | Confirmed | Codex | `/opt/brain` on `ubuntu-4gb-hel1-1` was missing the second-manual wrapper, new runtime preflight, post-apply checker, and public SPIKE proof report directory before sync. |
| Narrow runtime sync | Completed | Codex | Synced only Recall runtime scripts, packaged Recall CLI, packaged migrations, helper library, and public SPIKE proof reports to `/opt/brain`; no full app deploy or restart was performed. |
| Remote file verification | Passed | Codex | Verified `/opt/brain` now has `recall-second-manual-verification-apply.sh`, `check-recall-second-manual-runtime-preflight.mjs`, `check-recall-apply-report.mjs`, `sync-recall-prod.mjs`, `020_recall_sync.sql`, and the latest `2026-06-26_21-58-57_IST` SPIKE-013/SPIKE-014 reports. |
| Remote runtime preflight | Passed | Codex | Running `node -- scripts/check-recall-second-manual-runtime-preflight.mjs` from `/opt/brain` with the generated second-manual command env returned `ready_for_second_manual_runtime_preflight`, `liveApplyDelegationAllowed: true`, and no findings. |
| No live/write side effects | Confirmed | Codex | No Recall API call, import, database write, app restart, scheduler enablement, or checkpoint movement happened during the sync or verification. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_RUNTIME_PREFLIGHT_PRODUCTION_SYNC_2026-06-27_02-56-32_IST.md` records the no-secret production sync and verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new production-sync report; curated scan should now cover 84 current Recall docs. |
| Current real gate | Awaiting exact second-run approval | Arun | The prior production runtime/local-file blocker is fixed. The remaining gate is exact second-manual approval before live apply delegation. |

## Second Manual Remote Runtime Preflight Verifier - 2026-06-27 03:06 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Remote verifier | Added | Codex | `scripts/check-recall-second-manual-remote-runtime-preflight.mjs` builds the current second-manual command env, SSHes to production, checks timer/env flag safety, and runs the remote runtime preflight without Recall calls or writes. |
| Command-builder JSON | Hardened | Codex | `scripts/print-recall-second-manual-verification-command.mjs` now exposes structured `commandEnv` for verifier reuse instead of shell-text parsing. |
| Smoke coverage | Passed | Codex | `npm run -s smoke:recall-second-manual-remote-runtime-preflight` proves SSH-shim execution, production-shaped runtime files, missing-helper failure, and no secret-shaped output. |
| Production verification | Passed | Codex | `npm run -s recall:second-manual:remote-runtime-preflight` passed against `brain`/`/opt/brain` with `ready_for_second_manual_remote_runtime_preflight`, remote timer disabled/inactive, remote Recall enable flags disabled, and remote runtime preflight `liveApplyDelegationAllowed: true`. |
| Release gates | Hardened | Codex | Pre-live/deploy local gates and `check:recall-scheduler` now include/assert the remote verifier smoke. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_REMOTE_RUNTIME_PREFLIGHT_VERIFIER_2026-06-27_03-06-02_IST.md` records the no-secret implementation and verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new verifier report; curated scan should now cover 85 current Recall docs. |
| Current real gate | Awaiting exact second-run approval | Arun | The accidental remote runtime blocker is now repeatably checkable. No Recall API call, import, database write, scheduler enablement, or checkpoint movement happened. |

## Second Manual Production Apply Runner - 2026-06-27 03:14 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Guarded production runner | Added | Codex | `scripts/run-recall-second-manual-production-apply.mjs` builds the guarded command, runs the remote runtime preflight, and refuses to run the remote apply unless exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is present. |
| Production command handoff | Added | Codex | `npm run recall:second-manual:production-command` prints the exact guarded production runner command after no-live completion-status and remote-preflight checks, while warning that printing the command is not approval. |
| Key-rotation handoff alignment | Added | Codex | Completed first-apply key-rotation handoff now includes `npm run recall:second-manual:production-command`, so older operator handoff surfaces match the current no-live handoff-first sequence. |
| Local-gate bypass | Hardened | Codex | Production runner now skips broad local readiness and local live-spike validation by default; remote runtime preflight and remote guarded apply proof validation remain authoritative before any Recall API call. |
| Smoke coverage | Passed | Codex | `npm run -s smoke:recall-second-manual-production-apply` proves no approval means no remote apply, broad local gates are skipped by default, remote preflight failure means no remote apply, and exact approval reaches the remote manual wrapper only in smoke. |
| Release gates | Passed | Codex | `npm run -s check:recall-scheduler` and full manifest pre-live passed with the new production-apply runner smoke included/asserted. |
| Approval packet | Updated | Codex | `RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` now lists `npm run recall:second-manual:production-apply` as the preferred approved production execution path. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_PRODUCTION_APPLY_RUNNER_2026-06-27_03-14-39_IST.md` records the no-secret implementation and verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new runner report, command-handoff report, and key-rotation handoff alignment report; curated scan now covers 88 current Recall docs. |
| Production no-approval probe | Passed | Codex | `npm run -s recall:second-manual:production-apply` without exact approval exited blocked with local readiness/proof gates skipped, remote preflight ready, and `liveWriteAttempted: false`. |
| Deployed proof reports | Surfaced | Codex | The same no-approval probe now exposes `remotePreflight.proofReports` with selected SPIKE-013 and SPIKE-014 proof files readable from `/opt/brain`. |
| Latest deployed proof pair | Surfaced | Codex | Remote preflight and production runner output now include `remotePreflight.deployedLatestReports`, including the latest deployed SPIKE pair timestamp and `selectedMatchesRemoteLatest`, so local selection vs `/opt/brain` deployed proof drift is visible before approval or apply. |
| Completion guidance | Aligned | Codex | `npm run -s recall:daily-sync:completion-status` now points safe next commands at `npm run recall:second-manual:production-command` as the no-live handoff before exact approval, then `npm run recall:second-manual:production-apply` only after exact approval. |
| Current real gate | Awaiting exact second-run approval | Arun | This reduces operator/copy-paste risk but does not approve or execute the live write. No Recall API call, import, database write, scheduler enablement, or checkpoint movement happened. |

## Second Manual Approval Classification Hardening - 2026-06-27 04:17 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Approval ambiguity | Hardened | Codex | `scripts/run-recall-second-manual-production-apply.mjs` now reports stale first capped apply approval as `stale_first_apply_approval` and second-manual approval text supplied outside `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` as `second_manual_approval_wrong_env`. |
| Handoff clarity | Hardened | Codex | `scripts/print-recall-second-manual-production-apply-command.mjs` now exposes `approvalStatus` and warns that first capped apply approval is already spent and does not authorize the second manual verification run. |
| No-live guarantees | Covered | Codex | Smokes prove stale first-apply approval and wrong-env second-manual approval stop before remote apply with `liveWriteAttempted: false`; no Recall API call or write occurs in either case. |
| Release gate | Updated | Codex | `scripts/check-recall-scheduler-artifacts.mjs` statically requires the approval-classification behavior and the smoke assertions. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_APPROVAL_CLASSIFICATION_HARDENING_2026-06-27_04-17-00_IST.md` records the change and verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report; curated scan should now cover 89 current Recall docs. |
| Current real gate | Unchanged | Arun | First capped apply remains complete. The active gate is still exact second-manual verification approval before live production apply. |

## Second Manual Remote-Built Command Env - 2026-06-27 04:29 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Remaining local dependency | Removed from default path | Codex | `scripts/check-recall-second-manual-remote-runtime-preflight.mjs` now builds the guarded command env from the latest deployed remote SPIKE proof pair by default, instead of requiring local proof discovery first. |
| Production runner | Aligned | Codex | `scripts/run-recall-second-manual-production-apply.mjs` now uses the remote-built command env by default and keeps `--local-build-command-env` only for explicit debugging. |
| Handoff visibility | Added | Codex | `scripts/print-recall-second-manual-production-apply-command.mjs` surfaces `commandEnvSource: remote_deployed_latest_spike_pair` and `remoteBuildCommandEnv` from the no-live remote preflight. |
| Real production preflight | Passed | Codex | `npm run -s recall:second-manual:remote-runtime-preflight` returned `commandEnvSource: remote_deployed_latest_spike_pair`, local command builder skipped, timer disabled/inactive, remote enable flags disabled, and runtime preflight ready. |
| No-live handoff | Passed | Codex | `npm run -s recall:second-manual:production-command -- --json` returned remote-built command env status with latest deployed proof pair timestamp `2026-06-26_21-58-57_IST` and `selectedMatchesRemoteLatest: true`. |
| Release gate | Updated | Codex | Smokes and `scripts/check-recall-scheduler-artifacts.mjs` now assert remote-built command env is the default for the production path. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_REMOTE_BUILT_COMMAND_ENV_2026-06-27_04-29-52_IST.md` records the no-secret implementation and verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report; curated scan should now cover 90 current Recall docs. |
| Current real gate | Unchanged | Arun | No live Recall call, write, checkpoint movement, deploy, or scheduler enablement happened. Exact second-manual approval is still required before production apply. |

## Second Manual System Env Override Guard - 2026-06-27 04:39 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Manual wrapper delegation risk | Guarded | Codex | `scripts/recall-scheduled-apply.sh` now preserves explicit manual verification env values across system env sourcing when manual mode was set before sourcing. |
| Smoke coverage | Added | Codex | `scripts/smoke-recall-scheduled-wrapper.mjs` now creates a disabled system env fixture and proves the approved manual run values still drive the dry-run/apply fixture path. |
| Release gate | Updated | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the manual env override preservation code and smoke proof. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_SYSTEM_ENV_OVERRIDE_GUARD_2026-06-27_04-39-22_IST.md` records the no-live/no-write change and completed verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report; curated scan should now cover 91 current Recall docs. |
| Current real gate | Unchanged | Arun | The first capped apply approval is stale for this phase. Exact second-manual approval is still required before any live production apply. |

## Second Manual Production Wrapper Drift Fix - 2026-06-27 04:52 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Production drift | Fixed | Codex | Production `/opt/brain/scripts/recall-scheduled-apply.sh` was still missing the manual env preservation guard; copied the guarded local wrapper to production after creating a private remote backup. |
| Runtime preflight drift detector | Deployed | Codex | Copied updated `check-recall-second-manual-runtime-preflight.mjs` to production so remote preflight rejects stale scheduled wrappers missing `manual_env_override_keys`, `BRAIN_RECALL_SYSTEM_ENV_FILE`, and `manual_verification_mode_before_env`. |
| Production verification | Passed | Codex | `npm run -s recall:second-manual:remote-runtime-preflight` passed after the narrow scripts-only update; timer disabled/inactive, remote enable flags disabled, runtime preflight ready, and latest deployed proof pair matched. |
| No-approval probe | Passed | Codex | `npm run -s recall:second-manual:production-apply` without exact approval stopped before remote apply with `liveWriteAttempted: false`, proving no live write occurred during the fix. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_PRODUCTION_WRAPPER_DRIFT_FIX_2026-06-27_04-52-13_IST.md` records the production backup paths, deployed hashes, and no-live verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report; curated scan should now cover 92 current Recall docs. |
| Current real gate | Unchanged | Arun | Production is now synced for the wrapper guard, but exact second-manual approval is still required before any live production apply. |

## Second Manual Key Rotation Preflight Guard - 2026-06-27 05:09 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Runtime preflight parity | Hardened | Codex | `scripts/check-recall-second-manual-runtime-preflight.mjs` now runs `scripts/check-recall-key-rotation-evidence.mjs` before second-manual apply delegation, matching the real scheduled wrapper's pre-live gate. |
| Smoke coverage | Passed | Codex | Local, remote, and production-apply smokes now prove stale key evidence blocks before remote apply and that no secret-shaped values are printed. |
| Production script sync | Completed | Codex | Backed up the prior production checker to `data/private/recall-live-spikes/check-recall-second-manual-runtime-preflight.pre-key-evidence-guard.20260626T233855Z.mjs`, then deployed hash `f5da54102b8ef4ec99b675d14d8ff74af060662fa02ab5becfe4d808da8f0e86`. |
| Production no-live verification | Blocked as intended | Codex | `npm run -s recall:second-manual:remote-runtime-preflight` now blocks with `key_rotation_evidence`, while timer remains disabled/inactive and remote Recall enable flags remain disabled. |
| Current production key evidence | Failing | Arun | Direct production key evidence check reports `/etc/brain/.env` mtime `2026-06-08T16:25:15.112Z`, checkpoint `2026-06-24T15:54:17.000Z`, and missing `data/private/recall-live-spikes/key-rotation-evidence.json`. |
| Completion-status guidance | Aligned | Codex | `npm run -s recall:daily-sync:completion-status` still names the second manual phase, but now tells operators to run the no-live production handoff first and repair key evidence if it reports `key_rotation_evidence` or `remote_preflight_not_ready`. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_KEY_ROTATION_PREFLIGHT_GUARD_2026-06-27_05-09-57_IST.md` records the implementation, production backup/hash, and no-live verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report; curated scan should now cover 93 current Recall docs. |
| Current real gate | Key evidence repair before approval | Arun | Do not run the second-manual production apply yet. First repair production key-rotation evidence truthfully, rerun `npm run recall:second-manual:production-command`, and only proceed to exact second-manual approval after remote preflight is ready. |

## Production System Key Evidence Recorder - 2026-06-27 05:26 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Production repair path | Added | Codex | `scripts/run-recall-live-auth-probe.mjs` and `scripts/record-recall-key-rotation-evidence.mjs` now support `--system-env-file` for `/etc/brain/.env` key-rotation evidence repair. |
| Acknowledgement separation | Hardened | Codex | System mode requires exact `BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK`, distinct from the local private-env acknowledgement, before any read-only Recall auth probe can run. |
| Smoke coverage | Passed | Codex | `npm run -s smoke:recall-key-rotation-evidence-record` proves system mode refuses the private acknowledgement, records no key material, and passes `check-recall-key-rotation-evidence.mjs --system-env-file` against fixture evidence. |
| Static release gate | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now asserts the production system-env recorder, auth probe, and smoke coverage are present. |
| Production helper sync | Completed | Codex | Copied `scripts/record-recall-key-rotation-evidence.mjs`, `scripts/run-recall-live-auth-probe.mjs`, and `scripts/lib/recall-env-file.mjs` to `/opt/brain`; remote syntax checks passed. |
| Production negative proof | Passed | Codex | Running the production recorder without exact `BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK` refused with `missing_exact_key_rotation_ack` before any read-only auth probe, key-evidence write, Recall import, AI Brain database write, scheduler enablement, or checkpoint movement. |
| Approval packet | Updated | Codex | `RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` now includes the production system key-evidence repair command and states it does not approve or run the second manual apply. |
| Execution report | Created | Codex | `RECALL_PRODUCTION_SYSTEM_KEY_EVIDENCE_RECORDER_2026-06-27_05-26-09_IST.md` records the implementation, production helper hashes, and no-live/no-write verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report; curated scan should now cover 94 current Recall docs. |
| Current real gate | Key evidence repair before approval | Arun | Production key evidence is still not repaired. Rerun `npm run recall:second-manual:production-command` only after truthful system key-evidence repair, then proceed to exact second-manual approval only if remote preflight is ready. |

## Production Key Evidence Repair Runner - 2026-06-27 05:46 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| No-live repair handoff | Added | Codex | `npm run recall:production-key-evidence:command` checks remote key-evidence metadata and prints the guarded repair runner command without calling Recall or writing evidence. |
| Guarded repair runner | Added | Codex | `npm run recall:production-key-evidence:repair` runs the production system-env evidence recorder on `/opt/brain` only after exact `BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK`. |
| Local private gate bypass | Fixed for repair path | Codex | The repair runner executes against `/opt/brain` and `/etc/brain/.env`, so local private Recall env-file gates no longer stop this production evidence repair path first. |
| Wrong acknowledgement guard | Hardened | Codex | The runner rejects the local private-env acknowledgement as `private_acknowledgement_wrong_gate`; production system evidence requires the production-specific acknowledgement. |
| Smoke coverage | Passed | Codex | `npm run -s smoke:recall-production-key-evidence-repair` proves missing ack and wrong ack block before live calls, while exact ack reaches one fixture read-only auth probe and writes no-secret private evidence. |
| Release gates | Hardened | Codex | `scripts/check-recall-prelive-readiness.mjs`, `scripts/deploy.sh`, `scripts/check-recall-scheduler-artifacts.mjs`, and `scripts/check-recall-node-env-file-separators.mjs` now include/assert the new repair path. |
| Production no-live handoff | Passed | Codex | `npm run -s recall:production-key-evidence:command -- --json` reports `repairStatus: needs_repair_or_operator_review` with `env_file_not_rotated_after_checkpoint` and `missing_key_rotation_evidence_file`. |
| Production no-ack runner | Blocked as intended | Codex | `npm run -s recall:production-key-evidence:repair` without exact acknowledgement stops before read-only Recall auth probe or private evidence write. |
| Execution report | Created | Codex | `RECALL_PRODUCTION_KEY_EVIDENCE_REPAIR_RUNNER_2026-06-27_05-46-16_IST.md` records the implementation and verification. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report; curated scan should now cover 95 current Recall docs. |
| Current real gate | Key evidence repair before approval | Arun | Production key evidence is still not repaired. Use the guarded repair command only after production key rotation is true, then rerun `npm run recall:second-manual:production-command -- --json`. |

## Production Env Key Install And Live Probe Fix - 2026-06-27 06:07 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Root cause | Identified | Codex | Production `/etc/brain/.env` had no `RECALL_API_KEY`, so the production read-only auth probe loaded the system env file but stopped with `missing_api_key` before reaching Recall. |
| Guarded installer | Added | Codex | `scripts/run-recall-production-env-key-install.mjs` requires exact `BRAIN_RECALL_PRODUCTION_KEY_INSTALL_ACK`, reads only the ignored local private Recall env file, installs `RECALL_API_KEY` into production `/etc/brain/.env`, and keeps `BRAIN_RECALL_CONFIRM_LIVE_API=0`. |
| Smoke coverage | Passed | Codex | `npm run -s smoke:recall-production-env-key-install` proves the installer refuses without acknowledgement, does not print key material, runs exactly one fixture read-only auth probe, and does not import Recall data, write AI Brain rows, enable scheduler, or move checkpoint. |
| Production repair | Completed | Codex | The guarded installer updated production `/etc/brain/.env`; sanitized output reported `RECALL_API_KEY` absent before and present after, mode `640`, and no key printed. |
| Real live probe | Passed | Codex | The production read-only Recall auth probe returned HTTP `200`, authenticated `true`, reachable `true`, and future-window result count `0`. |
| Key evidence | Passed | Codex | `npm run -s recall:production-key-evidence:command -- --json` now reports `PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE` with `evidenceSource: env_file_mtime` and `remoteEnvContract.hasRecallApiKey: true`. |
| Remote preflight | Ready | Codex | `npm run -s recall:second-manual:remote-runtime-preflight` and `npm run -s recall:second-manual:production-command -- --json` now pass no-live remote preflight; `liveApplyDelegationAllowed: true`. |
| Release gates | Hardened | Codex | Package scripts, pre-live, deploy, scheduler static checks, node env-file separator checks, and completion-status guidance now include the production env key install path. |
| Execution report | Created | Codex | `RECALL_PRODUCTION_ENV_KEY_INSTALL_AND_LIVE_PROBE_FIX_2026-06-27_06-07-34_IST.md` records the implementation, production live-probe evidence, and remaining approval gate. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the new report; curated scan should now cover 96 current Recall docs. |
| Current real gate | Ready for second-manual approval | Arun | Do not run the production apply until exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is supplied. Scheduler enablement remains blocked until two clean manual runs and separate scheduler approval/evidence exist. |

## Second Manual Approval Ready Handoff - 2026-06-27 06:15 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Fresh no-live production handoff | Passed | Codex | `npm run -s recall:second-manual:production-command -- --json` passed with remote preflight ready, timer disabled/inactive, remote Recall enable flags disabled, and `liveApplyDelegationAllowed: true`. |
| Production key evidence | Passed | Codex | `npm run -s recall:production-key-evidence:command -- --json` reports `PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE`, `evidenceSource: env_file_mtime`, and `remoteEnvContract.hasRecallApiKey: true`. |
| Completion status | Still incomplete by design | Codex | `npm run -s recall:daily-sync:completion-status` keeps `currentBlockingGate: second_manual_verification_run`; scheduler remains blocked until a second clean manual run and separate scheduler evidence exist. |
| Approval handoff | Created | Codex | `RECALL_SECOND_MANUAL_APPROVAL_READY_HANDOFF_2026-06-27_06-15-41_IST.md` records the exact approval env, guarded production apply command, pre-run checks, and post-run validation sequence. |
| Public-doc privacy corpus | Expanded | Codex | `scripts/check-recall-public-docs-privacy.mjs` includes the approval-ready handoff; curated scan should now cover 97 current Recall docs. |
| Current real gate | Awaiting exact approval | Arun | Do not infer approval. The next live write requires exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` and a fresh ready no-live handoff immediately before execution. |

## Second Manual Local Gate Bypass Verification - 2026-06-27 06:24 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Root failure mode | Rechecked | Codex | Verified the current runner no longer lets local private proof/readiness gates stop before the production remote preflight. |
| Focused smoke | Passed | Codex | `npm run -s smoke:recall-second-manual-production-apply` proves local gates are skipped by default, remote proof is selected by default, and a fake approved path reaches the remote wrapper only after exact approval. |
| Remote preflight smoke | Passed | Codex | `npm run -s smoke:recall-second-manual-remote-runtime-preflight` proves remote command-env construction and fail-closed production-shaped checks. |
| Real production remote preflight | Passed | Codex | `npm run -s recall:second-manual:remote-runtime-preflight` returned `commandEnvSource: remote_deployed_latest_spike_pair`, local command builder skipped, timer disabled/inactive, remote enable flags disabled, and `liveApplyDelegationAllowed: true`. |
| Real production apply without approval | Blocked as intended | Codex | `npm run -s recall:second-manual:production-apply` without approval selected the deployed proof pair, skipped local gates, passed remote preflight, then stopped only at `approval_required`; `liveWriteAttempted: false`. |
| Verification report | Created | Codex | `RECALL_SECOND_MANUAL_LOCAL_GATE_BYPASS_CURRENT_VERIFICATION_2026-06-27_06-24-42_IST.md` records the no-live/no-write evidence. |
| Current real gate | Awaiting exact approval | Arun | The live write is no longer blocked by local private gates first. It still must not run until exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is supplied. Scheduler remains blocked separately. |

## Second Manual Apply Report Capture - 2026-06-27 06:33 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Post-apply handoff gap | Closed | Codex | `scripts/run-recall-second-manual-production-apply.mjs` now copies the successful remote `scheduled-apply-*.json` report into the local private Recall evidence directory after an approved remote apply. |
| Local review | Added | Codex | The runner immediately validates the copied local report with `scripts/check-recall-apply-report.mjs` and includes the `PASS_POST_APPLY_REVIEW_GATE` summary in `secondManualApplyReport`. |
| Completion-status readiness | Improved | Codex | The copied local private `scheduled-apply-*.json` is what `npm run -s recall:daily-sync:completion-status` can discover and count as the second clean manual run before scheduler approval. |
| Smoke coverage | Passed | Codex | `npm run -s smoke:recall-second-manual-production-apply` now proves the approved fake remote path copies and locally validates the remote apply report while preserving approval, remote-preflight, and no-scheduler guards. |
| Syntax check | Passed | Codex | `node --check scripts/run-recall-second-manual-production-apply.mjs scripts/smoke-recall-second-manual-production-apply.mjs`. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_APPLY_REPORT_CAPTURE_2026-06-27_06-33-33_IST.md` documents the behavior and safety notes. |
| Current real gate | Awaiting exact approval | Arun | This change prepares evidence capture after the future approved write. It did not run production apply, import Recall data, enable scheduler, or move checkpoint. |

## Second Manual Operator Docs Capture Alignment - 2026-06-27 06:43 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Stale operator guidance | Fixed | Codex | Updated the approval packet and approval-ready handoff to say the production runner now captures the remote `scheduled-apply-*.json`, stores a local private copy, and reports `secondManualApplyReport.localReview.verdict`. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the report capture function, `secondManualApplyReport`, `apply_report=` parsing, production-shaped scheduled report paths, local post-apply checker validation, `--local-report-dir`, and smoke proof of `PASS_POST_APPLY_REVIEW_GATE`. |
| No-live/no-write verification | Passed | Codex | `npm run -s recall:second-manual:production-command -- --json` passed with remote preflight ready and `liveApplyDelegationAllowed: true`; `npm run -s recall:second-manual:production-apply` without approval stopped only at `approval_required`, with local gates skipped and `liveWriteAttempted: false`. |
| Validation | Passed | Codex | `node --check scripts/check-recall-scheduler-artifacts.mjs`, `npm run -s check:recall-scheduler`, `npm run -s check:recall-public-docs-privacy`, `npm run -s check:recall-approval-packet`, `npm run -s smoke:recall-second-manual-production-apply`, `npm run -s recall:second-manual:readiness`, and `npm run -s recall:daily-sync:completion-status`. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_OPERATOR_DOCS_CAPTURE_ALIGNMENT_2026-06-27_06-43-30_IST.md` records this alignment and the current gate. |
| Current real gate | Awaiting exact approval | Arun | The live write is no longer blocked by local private gates first, but exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is still required. Scheduler enablement remains separate. |

## Second Manual Local Report Directory Privacy Guard - 2026-06-27 06:49 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Unsafe local report directory | Guarded | Codex | `scripts/run-recall-second-manual-production-apply.mjs` now blocks `--local-report-dir` values outside `data/private/recall-live-spikes` before command building or remote apply. |
| Runner output | Improved | Codex | Production runner JSON now includes `localReportDir.underPrivateRecallEvidencePath`, so operators can verify the copied second-manual report will stay under ignored private evidence. |
| Smoke coverage | Passed | Codex | `npm run -s smoke:recall-second-manual-production-apply` now proves an approved fixture with a public local report dir fails with `local_apply_report_dir_not_private`, `liveWriteAttempted: false`, and no remote apply marker. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the private evidence root, private-path helper, unsafe-dir finding, and smoke proof. |
| Real no-approval probe | Passed | Codex | `npm run -s recall:second-manual:production-apply` without approval still uses the default private report dir, reaches ready remote preflight, skips local gates, and stops only at `approval_required` with `liveWriteAttempted: false`. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_LOCAL_REPORT_DIR_PRIVACY_GUARD_2026-06-27_06-49-08_IST.md` records this hardening and the current gate. |
| Current real gate | Awaiting exact approval | Arun | This hardening did not run production apply, import Recall data, enable scheduler, or move checkpoint. Exact second-manual approval is still required. |

## Second Manual Handoff Local Report Directory Visibility - 2026-06-27 06:54 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| No-live handoff visibility | Added | Codex | `scripts/print-recall-second-manual-production-apply-command.mjs` now reports `localReportDir.path`, `privateRoot`, `underPrivateRecallEvidencePath`, and `runnerDefault` before approval. |
| Unsafe handoff override | Guarded | Codex | The no-live handoff now refuses `--local-report-dir` values outside `data/private/recall-live-spikes` and withholds the runnable command with `command: null`. |
| Smoke coverage | Passed | Codex | `npm run -s smoke:recall-second-manual-production-command` proves default private-dir visibility, private override command printing, unsafe override refusal, and no secret-shaped output. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires handoff report-dir visibility and unsafe override refusal. |
| Real no-live handoff | Passed | Codex | `npm run -s recall:second-manual:production-command -- --json` reports default private report dir, remote preflight ready, and `liveApplyDelegationAllowed: true`. |
| Expected unsafe handoff failure | Passed | Codex | `npm run -s recall:second-manual:production-command -- --json --local-report-dir docs/plans/recall-sync/unsafe-handoff-report-cache` exits 1 with `local_apply_report_dir_not_private` and `command: null`. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_HANDOFF_LOCAL_REPORT_DIR_VISIBILITY_2026-06-27_06-54-33_IST.md` records this no-live hardening and the current gate. |
| Current real gate | Awaiting exact approval | Arun | This change did not run production apply, import Recall data, enable scheduler, or move checkpoint. Exact second-manual approval is still required. |

## Second Manual Handoff Local Report Directory Short-Circuit - 2026-06-27 06:58 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Local validation order | Hardened | Codex | The no-live handoff now evaluates `localReportDir` before completion status or remote runtime preflight. |
| Unsafe handoff behavior | Improved | Codex | Unsafe `--local-report-dir` values now return `command: null`, `completionStatus.skipped: true`, and `remotePreflight.skipped: true` with `blocked_local_report_dir_not_private`. |
| Smoke coverage | Passed | Codex | `npm run -s smoke:recall-second-manual-production-command` proves unsafe local report-dir overrides short-circuit before remote preflight. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires `localInputBlocked` and the short-circuit smoke proof. |
| Real no-live handoff | Passed | Codex | Normal `npm run -s recall:second-manual:production-command -- --json` still reports private default report dir, remote preflight ready, and `liveApplyDelegationAllowed: true`. |
| Expected unsafe handoff failure | Passed | Codex | Unsafe report-dir handoff exits 1 locally with no remote preflight summary beyond skipped `blocked_local_report_dir_not_private`. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_HANDOFF_LOCAL_REPORT_DIR_SHORT_CIRCUIT_2026-06-27_06-58-50_IST.md` records this no-live hardening and the current gate. |
| Current real gate | Awaiting exact approval | Arun | This change did not run production apply, import Recall data, enable scheduler, or move checkpoint. Exact second-manual approval is still required. |

## Second Manual Pre-Apply Progress Clarity - 2026-06-27 07:06 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Stop-point evidence | Added | Codex | `scripts/run-recall-second-manual-production-apply.mjs` now emits `preApplyProgress` with `stoppedAt`, `blockingFindingIds`, remote preflight fields, approval fields, and a concise no-live reason. |
| Local private-gate ambiguity | Closed | Codex | The real no-approval production runner now reports `localPrivateGatesSkippedForProductionPath: true`, `localGateStatus: not_blocking_production_path`, `remotePreflightPassed: true`, and `stoppedAt: approval_gate`. |
| Smoke coverage | Passed | Codex | `npm run -s smoke:recall-second-manual-production-apply` now proves local private gates are not blocking the production path and that missing exact approval stops after remote preflight. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires `preApplyProgress`, local-gate clarity, and the approval-after-preflight explanation. |
| Real no-approval probe | Passed | Codex | `npm run -s recall:second-manual:production-apply` without approval stopped only at `approval_required` after ready production remote preflight; `liveWriteAttempted: false`. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_PRE_APPLY_PROGRESS_CLARITY_2026-06-27_07-06-04_IST.md` records this no-secret hardening and verification. |
| Current real gate | Awaiting exact approval | Arun | The live write is not blocked by local private gates first. Exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is still required, and scheduler enablement remains separate. |

## Second Manual Command Handoff Progress Clarity - 2026-06-27 07:13 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| No-live handoff progress | Added | Codex | `scripts/print-recall-second-manual-production-apply-command.mjs` now emits `handoffProgress` before the approval-bearing production runner command. |
| Exact approval next action | Clarified | Codex | Real handoff now reports `handoffProgress.stoppedAt: ready_for_exact_approval`, `readyForExactApproval: true`, and `liveCallNotAttemptedBecause` naming exact second-manual approval after passed production remote preflight. |
| Local private-gate ambiguity | Closed earlier in the flow | Codex | Real handoff now reports `localPrivateGatesSkippedForProductionPath: true`, `localGateStatus: not_blocking_production_path`, `remotePreflightPassed: true`, and `commandEnvSource: remote_deployed_latest_spike_pair`. |
| Unsafe local report dir | Still fail-closed | Codex | Smoke proves unsafe `--local-report-dir` values classify as `local_report_dir_private_gate` with no remote preflight attempt and no runnable command. |
| Smoke coverage | Passed | Codex | `npm run -s smoke:recall-second-manual-production-command` now proves exact approval is the next action and local private gates are not blocking the handoff. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires `handoffProgress`, `ready_for_exact_approval`, local-gate clarity, and the no-live explanation. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_COMMAND_HANDOFF_PROGRESS_CLARITY_2026-06-27_07-13-20_IST.md` records this no-secret hardening and verification. |
| Current real gate | Awaiting exact approval | Arun | This change did not run production apply, import Recall data, enable scheduler, or move checkpoint. Exact second-manual approval is still required. |

## Second Manual Approval Docs Handoff Progress Alignment - 2026-06-27 07:19 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Approval packet guidance | Aligned | Codex | `RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` now tells operators to confirm `handoffProgress.stoppedAt: ready_for_exact_approval`, local private gates not blocking, remote preflight passed, and no live write attempted before copying/running the printed command. |
| Approval-ready handoff | Aligned | Codex | `RECALL_SECOND_MANUAL_APPROVAL_READY_HANDOFF_2026-06-27_06-15-41_IST.md` now includes a handoff-progress evidence row and pre-run checklist. |
| Approval packet checker | Hardened | Codex | `scripts/check-recall-approval-packet.mjs` now checks the second-manual approval packet, approval-ready handoff, and required second-manual production command/apply package scripts. |
| Validation | Passed | Codex | `npm run -s check:recall-approval-packet` passed with the new second-manual docs; `npm run -s check:recall-public-docs-privacy` passed with `scannedFiles: 105`. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_APPROVAL_DOCS_HANDOFF_PROGRESS_ALIGNMENT_2026-06-27_07-19-10_IST.md` records this no-secret docs/checker alignment. |
| Current real gate | Awaiting exact approval | Arun | This change did not run production apply, import Recall data, enable scheduler, or move checkpoint. Exact second-manual approval is still required. |

## Completion Status Second Manual Path Clarity - 2026-06-27 07:26 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Completion-status path summary | Added | Codex | `npm run -s recall:daily-sync:completion-status` now emits `secondManualVerificationPath` while the active gate is `second_manual_verification_run`. |
| Ready handoff proof fields | Made explicit | Codex | The status output now states a ready no-live handoff must show `ready_for_exact_approval`, `localPrivateGatesSkippedForProductionPath: true`, `localGateStatus: not_blocking_production_path`, `remotePreflightPassed: true`, and `liveWriteAttempted: false`. |
| Smoke coverage | Passed | Codex | `npm run -s smoke:recall-daily-sync-completion-status` proves the scheduler-only and stale historical apply fixtures retain the second-manual path and local-private-gate clarification. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires `secondManualVerificationPath`, `readyHandoffMustShow`, and `localPrivateGatesAreNotThePlannedProductionGate`. |
| Real no-live handoff | Passed | Codex | `npm run -s recall:second-manual:production-command -- --json` still reports `handoffProgress.stoppedAt: ready_for_exact_approval`, remote preflight passed, local private gates not blocking, and no live write attempted. |
| Real no-approval apply | Blocked as intended | Codex | `npm run -s recall:second-manual:production-apply` exited 1 at `approval_gate` after remote preflight passed; `liveWriteAttempted: false`. |
| Execution report | Created | Codex | `RECALL_COMPLETION_STATUS_SECOND_MANUAL_PATH_CLARITY_2026-06-27_07-26-17_IST.md` records this no-secret hardening and verification. |
| Current real gate | Awaiting exact approval | Arun | This change did not run production apply, import Recall data, enable scheduler, deploy, restart services, or move checkpoint. Exact second-manual approval is still required. |

## Pre-Live Second Manual Path Summary - 2026-06-27 07:31 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Pre-live status projection | Added | Codex | `scripts/check-recall-prelive-readiness.mjs` now carries `secondManualVerificationPath` into `nextGate.currentProductionGate`. |
| Ready handoff proof fields | Preserved | Codex | Pre-live output now includes the same ready-handoff fields: `ready_for_exact_approval`, `localPrivateGatesSkippedForProductionPath: true`, `localGateStatus: not_blocking_production_path`, `remotePreflightPassed: true`, and `liveWriteAttempted: false`. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` requires pre-live readiness to expose `summarizeSecondManualVerificationPath`, `readyHandoffMustShow`, and `localPrivateGatesAreNotThePlannedProductionGate`. |
| Manifest-enforced pre-live validation | Passed | Codex | `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` passed and showed `nextGate.currentProductionGate.secondManualVerificationPath`. |
| Execution report | Created | Codex | `RECALL_PRELIVE_SECOND_MANUAL_PATH_SUMMARY_2026-06-27_07-31-38_IST.md` records this no-secret alignment and validation. |
| Current real gate | Awaiting exact approval | Arun | This change did not run production apply, import Recall data, enable scheduler, deploy, restart services, or move checkpoint. Exact second-manual approval is still required. |

## Local Gate Wording Residual Cleanup - 2026-06-27 07:36 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Residual wording audit | Completed | Codex | Re-scanned current scripts for stale "local private gates stopped first" wording; remaining local-gate mentions are positive "not blocking" assertions or historical docs. |
| Pre-live first-apply diagnostic wording | Clarified | Codex | `first_apply_live_diagnostic_smoke.description` now says status-helper checks are inconclusive instead of saying local status helper gates fail first. |
| Key-rotation handoff smoke wording | Clarified | Codex | Smoke output now says `stale key-rotation evidence gates`, not `stale private gates`. |
| First-apply live diagnostic fallback wording | Clarified | Codex | Diagnostic-only fallback now says local first-apply status checks failed before env-file readiness could be proven. |
| Manifest-enforced pre-live validation | Passed | Codex | `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` passed with the updated wording and preserved `secondManualVerificationPath`. |
| Execution report | Created | Codex | `RECALL_LOCAL_GATE_WORDING_RESIDUAL_CLEANUP_2026-06-27_07-36-56_IST.md` records this no-secret cleanup and validation. |
| Current real gate | Awaiting exact approval | Arun | This change did not run production apply, import Recall data, enable scheduler, deploy, restart services, or move checkpoint. Exact second-manual approval is still required. |

## Second Manual Local-Gate Resolution Checker - 2026-06-27 07:48 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Dedicated no-live verifier | Added | Codex | Added `npm run -s check:recall-second-manual-local-gate-resolution` to prove completion status, no-live handoff, no-approval production apply, and stale wording scan agree on the current gate. |
| Local private-gate ambiguity | Closed | Codex | Real checker output reports `localGateStatus: not_blocking_production_path`, `remotePreflightPassed: true`, and `liveWriteAttempted: false` for both the ready handoff and no-approval apply boundary. |
| Approval boundary | Confirmed | Codex | The no-approval production apply reaches remote preflight and stops at `preApplyProgress.stoppedAt: approval_gate` with `approval_required`, not at a local private gate. |
| Stale wording scan | Passed | Codex | The checker scanned `scripts` and found zero current stale local-gate blocker phrases. |
| Smoke coverage | Passed | Codex | `npm run -s smoke:recall-second-manual-local-gate-resolution` proves the good path passes and stale wording or pre-remote-preflight apply output fails. |
| Pre-live integration | Passed | Codex | Manifest-enforced pre-live readiness now runs `second_manual_local_gate_resolution_smoke` as a required check and passed. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_LOCAL_GATE_RESOLUTION_CHECKER_2026-06-27_07-48-35_IST.md` records this no-live verifier and evidence. |
| Current real gate | Awaiting exact approval | Arun | This change did not run production apply, import Recall data, enable scheduler, deploy, restart services, or move checkpoint. Exact second-manual approval is still required. |

## Completion Status Active Blocked Requirement Clarity - 2026-06-27 07:56 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Top-level status | Clarified | Codex | `npm run -s recall:daily-sync:completion-status` now reports `status: blocked_second_manual_verification_run` while that is the active live-call gate. |
| Active blocked requirement | Added | Codex | Completion status and pre-live readiness now carry `activeBlockedRequirement: second_manual_verification`, separate from the broader final missing requirement `scheduler_enablement`. |
| Scheduler-ready distinction | Guarded | Codex | Smoke coverage proves the same helper reports `blocked_scheduler_enablement` and `activeBlockedRequirement: scheduler_enablement` only after two clean manual runs exist. |
| Pre-live projection | Passed | Codex | Manifest-enforced pre-live readiness now carries the explicit second-manual status and active blocked requirement into `nextGate.currentProductionGate`. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the explicit second-manual status, scheduler status, active requirement field, and pre-live propagation. |
| Execution report | Created | Codex | `RECALL_COMPLETION_STATUS_ACTIVE_BLOCKED_REQUIREMENT_CLARITY_2026-06-27_07-56-49_IST.md` records this no-secret status clarity fix. |
| Current real gate | Awaiting exact approval | Arun | This change did not run production apply, import Recall data, enable scheduler, deploy, restart services, or move checkpoint. Exact second-manual approval is still required. |

## Local-Gate Checker Active Requirement Hardening - 2026-06-27 08:04 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Checker contract | Hardened | Codex | `npm run -s check:recall-second-manual-local-gate-resolution` now requires `status: blocked_second_manual_verification_run` and `activeBlockedRequirement: second_manual_verification`. |
| Broad completion distinction | Preserved | Codex | The same checker requires `blockedRequirements` to keep `scheduler_enablement` as the broader final missing requirement while the immediate gate remains second manual verification. |
| Regression fixture | Added | Codex | Smoke now rejects stale broad completion-status wording with `completion_status_wrong_status`, `completion_status_wrong_active_requirement`, and `completion_status_missing_second_manual_blocked_action`. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires local-gate checker active requirement coverage. |
| Real no-live proof | Passed | Codex | Real checker output reports the active requirement, ready handoff, approval-gate apply stop, zero stale wording findings, and `liveWriteAttempted: false`. |
| Execution report | Created | Codex | `RECALL_LOCAL_GATE_CHECKER_ACTIVE_REQUIREMENT_HARDENING_2026-06-27_08-04-47_IST.md` records this no-live checker hardening. |
| Current real gate | Awaiting exact approval | Arun | This change did not run production apply, import Recall data, enable scheduler, deploy, restart services, or move checkpoint. Exact second-manual approval is still required. |

## Second Manual Readiness Active Requirement Alignment - 2026-06-27 08:09 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Readiness output | Aligned | Codex | `npm run -s recall:second-manual:readiness` now reports `activeBlockedRequirement: second_manual_verification` and `blockedRequirements: scheduler_enablement`. |
| Checked completion summary | Improved | Codex | The readiness `checked` entry for completion status now includes `status: blocked_second_manual_verification_run` and `activeBlockedRequirement: second_manual_verification`. |
| No-write contract | Preserved | Codex | Real readiness still reports `liveWriteAllowedNow: false`, `schedulerAllowedNow: false`, and `checkpointAllowedNow: false`. |
| Smoke coverage | Passed | Codex | Smoke proves the ready fixture exposes the active blocked requirement and scheduler-ready fixture fails with `wrong_active_blocked_requirement`. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires readiness active requirement propagation and scheduler requirement preservation. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_READINESS_ACTIVE_REQUIREMENT_ALIGNMENT_2026-06-27_08-09-49_IST.md` records this no-secret readiness alignment. |
| Current real gate | Awaiting exact approval | Arun | This change did not run production apply, import Recall data, enable scheduler, deploy, restart services, or move checkpoint. Exact second-manual approval is still required. |

## Second Manual Readiness Safe-Next Command Alignment - 2026-06-27 08:16 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Safe-next command drift | Fixed | Codex | `npm run -s recall:second-manual:readiness` now points operators to `npm run recall:second-manual:production-command` for the no-live handoff and `npm run recall:second-manual:production-apply` only after exact approval. |
| Stale alias risk | Guarded | Codex | Readiness smoke rejects the older `npm run recall:manual-verification-apply` safe-next guidance and proves the current handoff/apply sequence. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the readiness helper and smoke to keep the current production command guidance. |
| Real no-live readiness | Passed | Codex | Real readiness still reports `status: ready_for_second_manual_verification_approval`, `activeBlockedRequirement: second_manual_verification`, `noLiveNoWrite: true`, and no permission to write, schedule, or checkpoint. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_READINESS_SAFE_NEXT_COMMAND_ALIGNMENT_2026-06-27_08-16-02_IST.md` records this operator-facing alignment. |
| Current real gate | Awaiting exact second-manual approval | Arun | The first capped apply is already complete; this did not run the second manual production apply, import Recall data, enable scheduler, deploy, restart services, or move checkpoint. |

## Second Manual Local-Gate Current Evidence Refresh - 2026-06-27 08:21 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Fresh no-live handoff | Passed | Codex | `npm run -s recall:second-manual:production-command -- --json` reached `handoffProgress.stoppedAt: ready_for_exact_approval` with `localGateStatus: not_blocking_production_path`, `remotePreflightPassed: true`, and `liveWriteAttempted: false`. |
| Fresh no-approval apply probe | Blocked as intended | Codex | `npm run -s recall:second-manual:production-apply` without exact approval reached production remote preflight and stopped at `preApplyProgress.stoppedAt: approval_gate`; `blockingFindingIds: approval_required`; `liveWriteAttempted: false`. |
| Dedicated checker | Passed | Codex | `npm run -s check:recall-second-manual-local-gate-resolution` passed with completion status, handoff, no-approval apply, and stale wording scan all agreeing that local gates are not the production blocker. |
| Completion status | Confirmed | Codex | `npm run -s recall:daily-sync:completion-status` still reports `status: blocked_second_manual_verification_run`, `activeBlockedRequirement: second_manual_verification`, and broader `blockedRequirements: scheduler_enablement`. |
| Evidence report | Created | Codex | `RECALL_SECOND_MANUAL_LOCAL_GATE_CURRENT_EVIDENCE_REFRESH_2026-06-27_08-21-13_IST.md` records the fresh no-live/no-write proof. |
| Current real gate | Awaiting exact second-manual approval | Arun | The live call is no longer stopped by local private gates first. The remaining live-write gate is exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`; scheduler enablement remains separate. |

## Goal Completion Audit - 2026-06-27 08:25 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Full-goal audit | Completed | Codex | `RECALL_DAILY_SYNC_GOAL_COMPLETION_AUDIT_2026-06-27_08-25-25_IST.md` maps the original objective to current evidence without redefining completion around existing work. |
| Proven work | Confirmed | Codex | Research/spikes, live proof, private diagnostic proof, approval/privacy gates, first capped apply, post-apply review, production deploy, and local-gate blocker fix are all recorded as proved for the current implementation path. |
| Remaining work | Explicit | Codex | Second manual production verification apply, two distinct clean manual runs, scheduler enablement evidence, and daily scheduler verification remain incomplete. |
| Current real gate | Awaiting exact second-manual approval | Arun | Completion status remains `blocked_second_manual_verification_run`; broader final requirement remains `scheduler_enablement`. |

## Goal Completion Audit Checker - 2026-06-27 08:34 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Audit checker | Added | Codex | `scripts/check-recall-goal-completion-audit.mjs` verifies the current completion audit still matches no-live completion status and intentionally fails if the audit goes stale. |
| Smoke coverage | Passed | Codex | `scripts/smoke-recall-goal-completion-audit.mjs` proves current incomplete audit passes, stale complete audit fails, scheduler-ready drift fails, missing done requirements fail, and secret-shaped audit docs fail. |
| Pre-live wiring | Added | Codex | `scripts/check-recall-prelive-readiness.mjs` now runs both `smoke:recall-goal-completion-audit` and `check:recall-goal-completion-audit`. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires package script exposure, checker verdict strings, smoke drift coverage, and pre-live wiring. |
| Real checker | Passed | Codex | `npm run -s check:recall-goal-completion-audit` reports `goal_completion_audit_current_incomplete_state_verified`, `completionAchieved: false`, `activeBlockedRequirement: second_manual_verification`, and `cleanRunCount: 1`. |
| Execution report | Created | Codex | `RECALL_GOAL_COMPLETION_AUDIT_CHECKER_2026-06-27_08-34-03_IST.md` records this no-live guard. |
| Current real gate | Awaiting exact second-manual approval | Arun | The checker makes the incomplete state enforceable; it does not run the second manual apply or enable the scheduler. |

## Current Gate Checker - 2026-06-27 08:42 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Current-gate checker | Added | Codex | `scripts/check-recall-current-gate.mjs` combines the goal completion audit and no-live second-manual production handoff into one operator-facing gate. |
| Smoke coverage | Passed | Codex | `scripts/smoke-recall-current-gate.mjs` proves ready, stale audit, local-gate regression, remote-preflight blocked, approval-present, and no-secret cases. |
| Pre-live wiring | Added | Codex | `scripts/check-recall-prelive-readiness.mjs` now runs both `smoke:recall-current-gate` and `recall:current-gate`. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` requires package exposure, checker ready status, local-gate/remote-preflight assertions, approval-present rejection, smoke coverage, and pre-live wiring. |
| Real current gate | Ready for exact approval | Codex | `npm run -s recall:current-gate` reports `ready_for_second_manual_exact_approval`, `localGateStatus: not_blocking_production_path`, `remotePreflightPassed: true`, `liveWriteAttempted: false`, `schedulerAllowedNow: false`, and `checkpointAllowedNow: false`. |
| Execution report | Created | Codex | `RECALL_CURRENT_GATE_CHECKER_2026-06-27_08-42-23_IST.md` records this no-live consolidated gate. |
| Current real gate | Awaiting exact second-manual approval | Arun | This does not run the second manual apply or enable the scheduler; it gives the one-command current gate before approval. |

## Current Gate Approval-Mismatch Hardening - 2026-06-27 08:51 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Stale first-apply approval classification | Added | Codex | `scripts/check-recall-current-gate.mjs` now exposes `firstApplyApprovalPresent` and fails with `stale_first_apply_approval_present` if a first capped apply approval is present while the current gate is second manual verification. |
| Wrong-env second-manual approval classification | Added | Codex | `scripts/check-recall-current-gate.mjs` now exposes `secondManualApprovalInWrongEnv` and fails with `second_manual_approval_wrong_env` if second-manual approval text is present outside `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`. |
| Smoke coverage | Added | Codex | `scripts/smoke-recall-current-gate.mjs` now proves stale first-apply approval and wrong-env second-manual approval fixtures fail without printing secret-shaped values. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires both approval-mismatch rules and smoke cases. |
| Execution report | Updated | Codex | `RECALL_CURRENT_GATE_CHECKER_2026-06-27_08-42-23_IST.md` includes the 08:51 hardening update. |
| Current real gate | Awaiting exact second-manual approval | Arun | The first capped apply approval remains stale for this phase. The second manual production apply still must not run until exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is supplied. |

## Second Manual Approval Packet Current-Gate Alignment - 2026-06-27 08:57 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Approval packet pre-run gate | Aligned | Codex | `RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` now requires `npm run -s recall:current-gate` before approval and immediately before any live run. |
| Stale first-apply warning | Added | Codex | The packet now states that `BRAIN_RECALL_FIRST_APPLY_APPROVAL` is stale for `second_manual_verification_run` and must not be translated into second-manual approval. |
| Expected current-gate fields | Added | Codex | The packet now requires `ready_for_second_manual_exact_approval`, `firstApplyApprovalPresent: false`, `secondManualApprovalInWrongEnv: false`, `localGateStatus: not_blocking_production_path`, `remotePreflightPassed: true`, and `liveWriteAttempted: false`. |
| Approval-packet checker | Hardened | Codex | `scripts/check-recall-approval-packet.mjs` now requires the current-gate command, expected fields, stale first-apply rule, and wrong-env second-manual rule in the second-manual approval packet. |
| Current real gate | Awaiting exact second-manual approval | Arun | No live write was run. The packet and checker now point to the same exact approval gate as the machine current-gate command. |

## Completion Status Current-Gate Alignment - 2026-06-27 09:03 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Safe next command order | Aligned | Codex | `scripts/check-recall-daily-sync-completion-status.mjs` now includes `npm run recall:current-gate` before readiness and production handoff in the second-manual path. |
| Next-action wording | Hardened | Codex | Completion status now requires `ready_for_second_manual_exact_approval`, `firstApplyApprovalPresent=false`, `secondManualApprovalInWrongEnv=false`, `localGateStatus=not_blocking_production_path`, `remotePreflightPassed=true`, and `liveWriteAttempted=false` before handoff. |
| Structured path summary | Expanded | Codex | `secondManualVerificationPath` now exposes `currentGateCommand` and `readyCurrentGateMustShow` alongside the production handoff proof fields. |
| Smoke coverage | Added | Codex | `scripts/smoke-recall-daily-sync-completion-status.mjs` proves current-gate safe-next guidance and current-gate proof fields for scheduler-only and stale historical first-apply states. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the completion-status current-gate command, proof fields, and smoke strings. |
| Pre-live projection | Hardened | Codex | `scripts/check-recall-prelive-readiness.mjs` now preserves `currentGateCommand` and `readyCurrentGateMustShow` in the sanitized `currentProductionGate.secondManualVerificationPath`. |
| Execution report | Created | Codex | `RECALL_COMPLETION_STATUS_CURRENT_GATE_ALIGNMENT_2026-06-27_09-03-01_IST.md` records the no-live alignment. |
| Current real gate | Awaiting exact second-manual approval | Arun | No live write was run. The top-level completion-status surface now matches the approval packet and current-gate checker. |

## Second Manual No-Approval Production Runner Proof - 2026-06-27 09:17 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Actual guarded runner probe | Blocked as intended | Codex | Ran `npm run -s recall:second-manual:production-apply` with approval env vars cleared. Exit code was `1` as expected for missing exact approval. |
| Local gate bypass proof | Passed | Codex | Output reported `localPrivateGatesSkippedForProductionPath: true`, `localGateStatus: not_blocking_production_path`, and `commandBuilderSkipped: true`. |
| Remote preflight proof | Passed | Codex | Output reported `remotePreflightAttempted: true`, `remotePreflightPassed: true`, and `remotePreflightStatus: ready_for_second_manual_remote_runtime_preflight`. |
| Live-write safety | Preserved | Codex | Output reported `noLiveNoWrite: true`, `liveWriteAttempted: false`, `stoppedAt: approval_gate`, and `blockingFindingIds: approval_required`. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_NO_APPROVAL_PRODUCTION_RUNNER_PROOF_2026-06-27_09-17-39_IST.md` records the sanitized negative proof. |
| Current real gate | Awaiting exact second-manual approval | Arun | The live call is no longer blocked by broad local private gates. It is now blocked only by missing exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`; scheduler enablement remains separate. |

## Local-Gate Resolution Proof-Pair Hardening - 2026-06-27 09:23 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Checker proof-pair requirements | Hardened | Codex | `scripts/check-recall-second-manual-local-gate-resolution.mjs` now requires selected deployed SPIKE proof paths, `selectedBy: remote_latest_deployed_pair`, ready remote preflight status, passing SPIKE-013/SPIKE-014 proof checks, and `selectedMatchesRemoteLatest: true`. |
| Smoke coverage | Hardened | Codex | `scripts/smoke-recall-second-manual-local-gate-resolution.mjs` now proves selected proof-pair summary and rejects missing, stale, or non-remote-latest proof selection. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the checker and smoke strings for selected deployed proof-pair visibility/freshness. |
| Real checker | Passed | Codex | `npm run -s check:recall-second-manual-local-gate-resolution` reports selected proof pair `2026-06-26_21-58-57_IST`, `selectedBy: remote_latest_deployed_pair`, `enumerationOk: true`, `fidelityOk: true`, and `selectedMatchesRemoteLatest: true`. |
| Execution report | Created | Codex | `RECALL_LOCAL_GATE_RESOLUTION_PROOF_PAIR_HARDENING_2026-06-27_09-23-12_IST.md` records this no-live hardening. |
| Current real gate | Awaiting exact second-manual approval | Arun | No live write was run. The reusable local-gate resolution checker now preserves both stop-point proof and deployed proof-pair proof before approval. |

## Pre-Live Local-Gate Resolution Summary - 2026-06-27 09:31 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Real local-gate checker in pre-live | Added | Codex | `scripts/check-recall-prelive-readiness.mjs` now runs `npm run check:recall-second-manual-local-gate-resolution` as a required step, not only its smoke. |
| Top-level pre-live summary | Added | Codex | Pre-live output now includes `nextGate.localGateResolution` with handoff stop, no-approval apply stop, remote preflight status, selected proof pair, proof readiness, and stale wording count. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` requires the real checker step, `localGateResolutionSummary`, `nextGate.localGateResolution`, and `selectedMatchesRemoteLatest`. |
| Real pre-live | Passed | Codex | Manifest-enforced pre-live reports `nextGate.status: offline_readiness_passed`, `currentBlockingGate: second_manual_verification_run`, `localGateResolution.preApplyProgress.stoppedAt: approval_gate`, selected proof pair `2026-06-26_21-58-57_IST`, and `selectedMatchesRemoteLatest: true`. |
| Execution report | Created | Codex | `RECALL_PRELIVE_LOCAL_GATE_RESOLUTION_SUMMARY_2026-06-27_09-31-13_IST.md` records the pre-live summary contract. |
| Current real gate | Awaiting exact second-manual approval | Arun | No live write was run. Broad pre-live now carries the same local-gate resolution proof as the focused checker. |

## Goal Audit Pre-Live Local-Gate Alignment - 2026-06-27 09:38 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Audit checker pre-live input | Added | Codex | `scripts/check-recall-goal-completion-audit.mjs` now accepts optional `--prelive-result <path>` and validates `nextGate.localGateResolution` without running pre-live by default. |
| Audit doc coverage | Updated | Codex | `RECALL_DAILY_SYNC_GOAL_COMPLETION_AUDIT_2026-06-27_08-25-25_IST.md` now states broad pre-live carries `nextGate.localGateResolution` proof and lists selected proof-pair freshness in the local-gate fix row. |
| Smoke coverage | Hardened | Codex | `scripts/smoke-recall-goal-completion-audit.mjs` now proves good pre-live proof passes and stale pre-live local-gate proof fails. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires `--prelive-result`, `nextGate.localGateResolution`, stale pre-live proof rejection, and smoke coverage. |
| Real pre-live plus audit | Passed | Codex | Manifest-enforced pre-live passed with `goal_completion_audit_check.status: passed` and `nextGate.localGateResolution.preApplyProgress.selectedReports.timestamp: 2026-06-26_21-58-57_IST`. |
| Explicit audit with pre-live proof | Passed | Codex | `node -- scripts/check-recall-goal-completion-audit.mjs --prelive-result /tmp/recall-prelive-goal-audit-local-gate.json` passed with `selectedBy: remote_latest_deployed_pair` and `selectedMatchesRemoteLatest: true`. |
| Execution report | Created | Codex | `RECALL_GOAL_AUDIT_PRELIVE_LOCAL_GATE_ALIGNMENT_2026-06-27_09-38-47_IST.md` records this no-live alignment. |
| Current real gate | Awaiting exact second-manual approval | Arun | No live write was run. Goal-level audit, completion status, and broad pre-live now agree that the active gate is exact second-manual approval, not local private gates. |

## Second Manual Approval Packet Pre-Live Local-Gate Alignment - 2026-06-27 09:43 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Approval packet proof requirement | Added | Codex | `RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` now requires manifest-enforced pre-live `nextGate.localGateResolution` proof before exact approval and immediately before any live run. |
| Required proof fields | Added | Codex | The packet now requires `preApplyProgress.stoppedAt: approval_gate`, `remotePreflightStatus: ready_for_second_manual_remote_runtime_preflight`, selected proof pair `2026-06-26_21-58-57_IST`, `selectedBy: remote_latest_deployed_pair`, `enumerationOk: true`, `fidelityOk: true`, and `selectedMatchesRemoteLatest: true`. |
| Approval-packet checker | Hardened | Codex | `scripts/check-recall-approval-packet.mjs` now fails if the second-manual packet omits the pre-live local-gate proof command, fields, or stop guidance. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now checks that the approval-packet checker requires pre-live latest deployed proof-pair evidence. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_APPROVAL_PACKET_PRELIVE_LOCAL_GATE_ALIGNMENT_2026-06-27_09-43-46_IST.md` records this no-live alignment. |
| Current real gate | Awaiting exact second-manual approval | Arun | No live write was run. First capped apply approval remains stale for this phase; exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is still required before the second manual production apply. |

## Current-Gate Safe-Next Pre-Live Handoff Alignment - 2026-06-27 09:50 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Current-gate safe-next sequence | Aligned | Codex | `scripts/check-recall-current-gate.mjs` now reports `requiredBeforeApply` and safe-next commands for current gate, manifest-enforced pre-live, no-live production handoff, and exact-approved apply. |
| Pre-live proof contract | Added | Codex | Current-gate output now names required pre-live proof: `approval_gate`, `ready_for_second_manual_remote_runtime_preflight`, `remote_latest_deployed_pair`, and `selectedMatchesRemoteLatest: true`. |
| Smoke coverage | Hardened | Codex | `scripts/smoke-recall-current-gate.mjs` now proves ready output includes manifest-enforced pre-live, no-live production handoff, and latest deployed proof-pair guidance. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires current-gate pre-live/handoff safe-next guidance. |
| Execution report | Created | Codex | `RECALL_CURRENT_GATE_SAFE_NEXT_PRELIVE_HANDOFF_ALIGNMENT_2026-06-27_09-50-34_IST.md` records this no-live alignment. |
| Current real gate | Awaiting exact second-manual approval | Arun | No live write was run. The top-level current-gate command now matches the approval packet's pre-live and no-live handoff sequence. |

## Completion Status Required-Before-Apply Alignment - 2026-06-27 09:55 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Completion-status safe-next sequence | Aligned | Codex | `scripts/check-recall-daily-sync-completion-status.mjs` now includes manifest-enforced pre-live before second-manual readiness and no-live production handoff. |
| Required-before-apply contract | Added | Codex | `secondManualVerificationPath.requiredBeforeApply` now mirrors current-gate guidance: current gate, manifest pre-live, no-live production handoff, exact-approved apply, approval env, and required pre-live proof. |
| Smoke coverage | Hardened | Codex | `scripts/smoke-recall-daily-sync-completion-status.mjs` now proves scheduler-only and stale historical apply states include manifest pre-live and latest deployed proof-pair evidence. |
| Pre-live projection | Hardened | Codex | `scripts/check-recall-prelive-readiness.mjs` now preserves `requiredBeforeApply` inside the sanitized current production gate summary. |
| Execution report | Created | Codex | `RECALL_COMPLETION_STATUS_REQUIREDBEFOREAPPLY_ALIGNMENT_2026-06-27_09-55-55_IST.md` records this no-live alignment. |
| Current real gate | Awaiting exact second-manual approval | Arun | No live write was run. Completion status, current gate, approval packet, and broad pre-live now agree on the same pre-apply sequence. |

## Stale First-Apply Approval Second-Manual Gate Recheck - 2026-06-27 10:09 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Direct stale approval probe | Blocked as intended | Codex | Ran `recall:second-manual:production-apply` with `BRAIN_RECALL_FIRST_APPLY_APPROVAL` set to the historical first-apply text and `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` unset. Exit code was `1`. |
| Local gate bypass proof | Passed | Codex | Output reported `localGates.skippedByDefault: true`, `localGates.commandEnvSource: remote_deployed_latest_spike_pair`, `preApplyProgress.localPrivateGatesSkippedForProductionPath: true`, and `preApplyProgress.localGateStatus: not_blocking_production_path`. |
| Remote preflight proof | Passed | Codex | Output reported `remotePreflight.status: ready_for_second_manual_remote_runtime_preflight`, `preApplyProgress.remotePreflightPassed: true`, and selected latest deployed proof pair `2026-06-26_21-58-57_IST`. |
| Approval classification | Passed | Codex | Output reported `approvalStatus.firstApplyApprovalPresent: true`, `manualVerificationApprovalExact: false`, `blockingFindingIds: stale_first_apply_approval`, and `liveWriteAttempted: false`. |
| Regression checks | Passed | Codex | `smoke:recall-second-manual-production-apply`, `check:recall-second-manual-local-gate-resolution`, and `recall:daily-sync:completion-status` passed or blocked exactly as expected. |
| Execution report | Created | Codex | `RECALL_STALE_FIRST_APPLY_APPROVAL_SECOND_MANUAL_GATE_RECHECK_2026-06-27_10-09-24_IST.md` records the no-live recheck. |
| Current real gate | Awaiting exact second-manual approval | Arun | No live write was run. The original local-private-gates-stopped-first issue is fixed; current refusal is the correct second-manual approval gate. |

## Stale First-Apply Approval Checker Automation - 2026-06-27 10:19 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Real checker automation | Hardened | Codex | `scripts/check-recall-second-manual-local-gate-resolution.mjs` now runs a stale first-apply approval production probe with exact second-manual approval env forcibly cleared. |
| No-live env safety | Hardened | Codex | The same checker now clears `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`, `BRAIN_RECALL_FIRST_APPLY_APPROVAL`, and `BRAIN_RECALL_APPROVAL_TEXT` for the normal no-approval probe, then sets only the stale first-apply approval for the stale probe. |
| Broad pre-live visibility | Hardened | Codex | `scripts/check-recall-prelive-readiness.mjs` now preserves `staleFirstApplyApprovalProgress` and `localPrivateGatesSkippedForProductionPath` in `nextGate.localGateResolution`. |
| Smoke coverage | Hardened | Codex | `scripts/smoke-recall-second-manual-local-gate-resolution.mjs` now proves good stale approval behavior and rejects stale-approval regressions that stop before remote preflight. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now guards stale-first-apply automation, env clearing, pre-live summary visibility, and smoke strings. |
| Real checker | Passed | Codex | `npm run -s check:recall-second-manual-local-gate-resolution` now reports `checked.staleFirstApplyApprovalProgress.stoppedAt: approval_gate`, `blockingFindingIds: stale_first_apply_approval`, `localPrivateGatesSkippedForProductionPath: true`, `remotePreflightStatus: ready_for_second_manual_remote_runtime_preflight`, and `selectedMatchesRemoteLatest: true`. |
| Execution report | Created | Codex | `RECALL_STALE_FIRST_APPLY_APPROVAL_CHECKER_AUTOMATION_2026-06-27_10-19-02_IST.md` records this no-live automation hardening. |
| Current real gate | Awaiting exact second-manual approval | Arun | No live write was run. The stale approval case is now checked automatically during local-gate resolution and broad pre-live. |

## Goal Audit Stale First-Apply Pre-Live Alignment - 2026-06-27 10:28 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Goal audit pre-live validation | Hardened | Codex | `scripts/check-recall-goal-completion-audit.mjs` now validates `staleFirstApplyApprovalProgress` from optional pre-live JSON. |
| Audit doc coverage | Updated | Codex | `RECALL_DAILY_SYNC_GOAL_COMPLETION_AUDIT_2026-06-27_08-25-25_IST.md` now documents stale first-apply approval proof fields in broad pre-live. |
| Smoke coverage | Hardened | Codex | `scripts/smoke-recall-goal-completion-audit.mjs` now proves good stale-approval proof passes and stale pre-live stale-approval proof fails. |
| Static release guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now guards goal-audit stale approval validation and smoke strings. |
| Real pre-live plus audit | Passed | Codex | Fresh `/tmp/recall-prelive-goal-audit-stale-first-apply.json` passed `node -- scripts/check-recall-goal-completion-audit.mjs --prelive-result ...` with `staleFirstApplyStoppedAt: approval_gate`, `stale_first_apply_approval`, `staleFirstApplyLocalPrivateGatesSkipped: true`, ready remote preflight, and latest deployed proof-pair match. |
| Execution report | Created | Codex | `RECALL_GOAL_AUDIT_STALE_FIRST_APPLY_PRELIVE_ALIGNMENT_2026-06-27_10-28-06_IST.md` records this no-live goal-audit alignment. |
| Current real gate | Awaiting exact second-manual approval | Arun | No live write was run. Goal-level audit now validates the stale first-apply approval regression proof carried by broad pre-live. |

## Second Manual Production Verification Apply - 2026-06-27 10:46 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Exact second-manual approval | Received | Arun | Approval matched `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` for one additional manual Recall -> AI Brain production verification run before scheduler enablement. |
| Pre-apply no-live gates | Passed | Codex | `recall:current-gate`, manifest pre-live, and `recall:second-manual:production-command -- --json` passed before the live run; local gates reported `not_blocking_production_path` and remote preflight passed. |
| Approved production verification apply | Completed | Codex | `npm run -s recall:second-manual:production-apply` completed with `status: second_manual_production_apply_completed`, `liveWriteAttempted: true`, and selected deployed proof pair `2026-06-26_21-58-57_IST`. |
| Second manual apply report | Reviewed | Codex | `data/private/recall-live-spikes/scheduled-apply-20260627T050448Z.json` passed `PASS_POST_APPLY_REVIEW_GATE`; run saw 0 cards and wrote 0 imports/upgrades, so it proves the guarded live path and second clean run but not new-card import behavior in this window. |
| Goal audit/current gate | Advanced | Codex | `check:recall-goal-completion-audit` and `recall:current-gate` now report `currentBlockingGate: scheduler_enablement`, two clean manual runs, and scheduler approval readiness. |
| Static guard | Refreshed | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now validates scheduler-phase audit/current-gate strings instead of stale second-manual pending strings. |
| Execution report | Created | Codex | `RECALL_SECOND_MANUAL_PRODUCTION_VERIFICATION_APPLY_2026-06-27_10-46-05_IST.md` records the no-secret live apply outcome and remaining scheduler gate. |
| Current real gate | Awaiting exact scheduler approval | Arun | Scheduler timer was not enabled. No scheduler evidence file was recorded. Next required approval is `BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL` for scheduler enablement after two clean manual runs. |

## Scheduler Approval Packet Two-Run Alignment - 2026-06-27 11:03 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Scheduler approval packet | Updated | Codex | `RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md` now states the second manual verification run is complete, names `data/private/recall-live-spikes/scheduled-apply-20260627T050448Z.json`, and asks operators to verify `manualCleanRunReadiness.cleanRunCount: 2` before scheduler approval. |
| Operator flow | Clarified | Codex | Packet now separates no-live gate rechecks, exact `BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL`, production timer/flag enablement plus first scheduled service run, and private evidence recording. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now reads the scheduler approval packet and fails if it regresses to stale one-run/second-manual-pending guidance or omits the evidence-recorder no-mutation warning. |
| Verification | Passed | Codex | `check:recall-scheduler`, `check:recall-public-docs-privacy`, `recall:current-gate`, and `smoke:recall-scheduler-enable-evidence-record` passed after the packet sync. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Scheduler Enablement No-Live Command Handoff - 2026-06-27 11:12 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| No-live scheduler handoff command | Added | Codex | `scripts/print-recall-scheduler-enable-command.mjs` verifies scheduler approval readiness and prints the exact post-approval sequence without enabling timers, calling Recall, writing evidence, deploying, applying imports, or advancing checkpoints. |
| Package scripts | Added | Codex | `package.json` now exposes `recall:scheduler-enable:command` and `smoke:recall-scheduler-enable-command`. |
| Smoke coverage | Added | Codex | `scripts/smoke-recall-scheduler-enable-command.mjs` proves the handoff is no-live/no-write, detects exact scheduler approval without mutating production, includes both clean manual run reports, keeps the first scheduled run report as an explicit placeholder, includes verification/rollback commands, and redacts secret-shaped values. |
| Current-gate handoff | Updated | Codex | `scripts/check-recall-current-gate.mjs` now surfaces `requiredBeforeScheduler.noLiveSchedulerHandoffCommand: npm run recall:scheduler-enable:command` and includes it in scheduler safe-next commands before evidence recording. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the scheduler handoff package scripts, no-live text, exact approval env, timer enable command text, emergency disable command text, second manual report path, first scheduled run placeholder, and smoke strings. |
| Approval packet | Updated | Codex | `RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md` now includes `npm run recall:scheduler-enable:command` as the no-live handoff before exact scheduler approval. |
| Real handoff verification | Passed | Codex | `npm run -s recall:scheduler-enable:command -- --json` ran full no-live checks including manifest pre-live and returned `mode: scheduler_enablement_command_handoff`, `stoppedAt: ready_for_exact_scheduler_approval`, `cleanRunCount: 2`, `preliveCurrentGate: scheduler_enablement`, commands present, and no findings. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Scheduler Handoff Broad Gate Wiring - 2026-06-27 11:17 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Pre-live wiring | Added | Codex | `scripts/check-recall-prelive-readiness.mjs` now runs `smoke:recall-scheduler-enable-command` as required step `scheduler_enable_command_handoff_smoke`. |
| Deploy wiring | Added | Codex | `scripts/deploy.sh` now runs `npm run smoke:recall-scheduler-enable-command` in local release gates before production deployment. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the scheduler command handoff smoke in both pre-live readiness and deploy local release gates. |
| Broad pre-live verification | Passed | Codex | `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` passed with `resultCount: 47`, `currentGate: scheduler_enablement`, `scheduler_enable_command_handoff_smoke: passed`, and no failures. |
| Focused verification | Passed | Codex | `check:recall-scheduler`, `smoke:recall-scheduler-enable-command`, and `check:recall-public-docs-privacy` passed after wiring. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Completion Status Scheduler Handoff Alignment - 2026-06-27 11:22 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Completion-status scheduler guidance | Aligned | Codex | `scripts/check-recall-daily-sync-completion-status.mjs` now points scheduler-ready safe-next output at `npm run recall:scheduler-enable:command` before scheduler evidence recording. |
| Scheduler next-action proof | Hardened | Codex | Scheduler-ready `nextGate.nextAction` now requires `ready_for_exact_scheduler_approval`, `noLiveNoWrite=true`, `cleanRunCount>=2`, `prelive.ok=true`, and `schedulerEnablementAttempted=false` before timer/flag enablement. |
| Smoke coverage | Hardened | Codex | `scripts/smoke-recall-daily-sync-completion-status.mjs` now proves scheduler-ready output points to the no-live scheduler command handoff, evidence recording, evidence verification, and ready proof fields. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the scheduler handoff constant, safe-next wording, ready proof wording, and smoke coverage. |
| Real completion status | Passed | Codex | `npm run -s recall:daily-sync:completion-status` exits 0 with `status: blocked_scheduler_enablement`, `currentBlockingGate: scheduler_enablement`, and safe-next commands that review the scheduler packet, run current-gate, run `recall:scheduler-enable:command`, then only after exact approval record and verify scheduler evidence. |
| Broad pre-live verification | Passed | Codex | Manifest pre-live passed with `resultCount: 47`, `daily_sync_completion_status_snapshot: passed`, `currentGate: scheduler_enablement`, and no failures. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Goal Audit Scheduler Handoff Enforcement - 2026-06-27 11:29 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Goal audit enforcement | Hardened | Codex | `scripts/check-recall-goal-completion-audit.mjs` now fails if scheduler-ready completion status omits `recall:scheduler-enable:command`, scheduler evidence record/verify commands, or `ready_for_exact_scheduler_approval` handoff proof. |
| Audit doc | Updated | Codex | `RECALL_DAILY_SYNC_GOAL_COMPLETION_AUDIT_2026-06-27_08-25-25_IST.md` now requires `npm run recall:scheduler-enable:command` and proof that the no-live scheduler handoff stopped at `ready_for_exact_scheduler_approval` before scheduler approval. |
| Smoke coverage | Hardened | Codex | `scripts/smoke-recall-goal-completion-audit.mjs` now includes `stale scheduler handoff guidance fails`. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires goal-audit scheduler handoff safe-next and ready-proof enforcement plus the stale-handoff smoke string. |
| Real goal audit | Passed | Codex | `npm run -s check:recall-goal-completion-audit` exits 0 with `currentBlockingGate: scheduler_enablement`, safe-next containing `npm run recall:scheduler-enable:command`, and no findings. |
| Broad pre-live verification | Passed | Codex | Manifest pre-live passed with `resultCount: 47`, `goal_completion_audit_check: passed`, `currentGate: scheduler_enablement`, and no failures. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Scheduler Evidence First-Run Distinctness Guard - 2026-06-27 11:41 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Scheduler evidence recorder | Hardened | Codex | `scripts/record-recall-scheduler-enable-evidence.mjs` now rejects duplicate manual clean-run kind labels and refuses a `--first-run-apply-report` path that reuses any pre-enable manual clean-run apply report. |
| Strict completion evidence checker | Hardened | Codex | `scripts/check-recall-completion-evidence.mjs` now rejects forged scheduler enablement evidence when `firstRun.applyReportPath` duplicates any `manualCleanRuns[].applyReportPath`; it also rejects duplicate manual clean-run kind labels. |
| Recorder smoke coverage | Hardened | Codex | `scripts/smoke-recall-scheduler-enable-evidence-record.mjs` now proves duplicate manual paths, duplicate manual kinds, reused first scheduled run reports, and forged duplicate first-run evidence are rejected before scheduler evidence can be accepted. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the distinct first scheduled run guard and the approval-packet wording that `firstRun.applyReportPath` must be distinct from pre-enable manual clean-run reports. |
| Scheduler approval packet | Updated | Codex | `RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md` now tells operators the first scheduled service-run apply report must not reuse `first-apply-report.json` or `scheduled-apply-20260627T050448Z.json`. |
| Goal audit doc | Updated | Codex | `RECALL_DAILY_SYNC_GOAL_COMPLETION_AUDIT_2026-06-27_08-25-25_IST.md` now states scheduler evidence recording must use a first scheduled service-run apply report distinct from both manual clean-run reports. |
| Verification | Passed | Codex | `smoke:recall-scheduler-enable-evidence-record`, `check:recall-scheduler`, `check:recall-goal-completion-audit`, `check:recall-public-docs-privacy`, `recall:current-gate`, `recall:daily-sync:completion-status`, `smoke:recall-scheduler-enable-command`, `git diff --check` on touched files, and broad manifest `check:recall-prelive` passed. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Scheduler Evidence First-Run Timing Guard - 2026-06-27 11:53 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Scheduler evidence recorder | Hardened | Codex | `scripts/record-recall-scheduler-enable-evidence.mjs` now collects `ActiveEnterTimestamp` from `brain-recall-sync.timer`, `ExecMainExitTimestamp` from `brain-recall-sync.service`, records `timer.activeSinceIso` and `service.lastRunCompletedAtIso`, and rejects first scheduled service-run reports completed before scheduler activation. |
| Strict completion evidence checker | Hardened | Codex | `scripts/check-recall-completion-evidence.mjs` now requires `timer.activeSinceIso`, `service.lastRunCompletedAtIso`, and `firstRun.completedAtIso` timing alignment; forged evidence fails when the first scheduled run predates scheduler enablement/activation or is not aligned with the latest service completion. |
| Smoke coverage | Hardened | Codex | `scripts/smoke-recall-scheduler-enable-evidence-record.mjs` proves the recorder rejects stale first-run timing before writing evidence and the strict checker rejects forged stale first-run timing evidence. |
| Completion evidence fixtures | Updated | Codex | `scripts/smoke-recall-completion-evidence.mjs` and `scripts/smoke-recall-daily-sync-completion-status.mjs` now include timer active-since and service completion timestamps in complete scheduler evidence fixtures. |
| Approval packet and audit doc | Updated | Codex | `RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md` and `RECALL_DAILY_SYNC_GOAL_COMPLETION_AUDIT_2026-06-27_08-25-25_IST.md` now state the first scheduled service-run apply report must be completed after scheduler timer activation. |
| Verification | Passed | Codex | `smoke:recall-scheduler-enable-evidence-record`, `smoke:recall-completion-evidence`, `smoke:recall-daily-sync-completion-status`, `check:recall-scheduler`, `check:recall-goal-completion-audit`, `check:recall-public-docs-privacy`, touched-file `git diff --check`, and broad manifest `check:recall-prelive` passed. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Additional Manual Production Verification Apply - 2026-06-27 12:10 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Extra manual approval | Received | Arun | Arun approved one additional manual Recall -> AI Brain production verification run before scheduler enablement, explicitly excluding scheduler timer enablement and allowing only guarded apply-path checkpoint movement. |
| Approved production verification apply | Completed | Codex | `npm run -s recall:second-manual:production-apply` completed with `status: second_manual_production_apply_completed`, `liveWriteAttempted: true`, and selected deployed proof pair `2026-06-26_21-58-57_IST`. |
| New apply report | Reviewed | Codex | `data/private/recall-live-spikes/scheduled-apply-20260627T063340Z.json` passed `PASS_POST_APPLY_REVIEW_GATE`; latest run saw 0 cards and wrote 0 imports/upgrades, with checkpoint advanced by the guarded apply path. |
| Manual-run count | Updated | Codex | Completion status now reports `manualCleanRunReadiness.cleanRunCount: 3`, `needsSecondManualVerificationRun: false`, and scheduler approval allowed by manual-run evidence. |
| At-least-two guard | Hardened | Codex | `check-recall-second-manual-local-gate-resolution`, `check-recall-goal-completion-audit`, `check-recall-current-gate`, related smokes, scheduler static guard, scheduler approval packet, and goal audit doc now treat scheduler readiness as `cleanRunCount >= 2` rather than exactly 2. |
| Remote timer state | Verified disabled | Codex | `recall:second-manual:remote-runtime-preflight` reports production timer `enabled: false`, `active: false`, and remote Recall enable flags disabled. |
| Scheduler handoff | Passed no-live | Codex | `recall:scheduler-enable:command -- --json` reports `stoppedAt: ready_for_exact_scheduler_approval`, `cleanRunCount: 3`, `schedulerEnablementAttempted: false`, `liveWriteAttempted: false`, and `checkpointAdvanced: false`. |
| Execution report | Created | Codex | `RECALL_ADDITIONAL_MANUAL_PRODUCTION_VERIFICATION_APPLY_2026-06-27_12-10-00_IST.md` records the no-secret outcome and remaining scheduler gate. |
| Current real gate | Awaiting exact scheduler approval | Arun | Scheduler timer was not enabled, no scheduler evidence file was recorded, no deploy was run, and the goal remains incomplete until scheduler approval/evidence/final completion pass. |

## Scheduler Handoff Uses All Clean Manual Runs - 2026-06-27 12:29 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Dynamic manual-run extraction | Hardened | Codex | `scripts/print-recall-scheduler-enable-command.mjs` now derives scheduler evidence `--manual-clean-run` args from `manualCleanRunReadiness.cleanRuns[]` instead of hardcoding two reports. |
| Third manual report inclusion | Verified | Codex | The no-live handoff now includes `manual_additional_guarded_apply_2=data/private/recall-live-spikes/scheduled-apply-20260627T063340Z.json` alongside the first and second manual reports. |
| Evidence-count guard | Hardened | Codex | Handoff prechecks now require `cleanRunEvidenceCount === cleanRunCount`, so scheduler handoff cannot be ready if completion status counts manual runs without exposing their evidence paths. |
| Operator packet | Updated | Codex | `RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md` now shows all three manual clean-run args and notes that the handoff derives future extra manual runs from completion status. |
| Static/smoke coverage | Passed | Codex | `smoke:recall-scheduler-enable-command` proves every counted manual report is included and duplicate-source manual reports get unique evidence labels; `check:recall-scheduler` guards the behavior. |
| Verification | Passed | Codex | `smoke:recall-scheduler-enable-command`, `check:recall-scheduler`, `recall:scheduler-enable:command -- --json`, `recall:current-gate`, `recall:daily-sync:completion-status`, `check:recall-goal-completion-audit`, `check:recall-public-docs-privacy`, touched-file `git diff --check`, and broad manifest `check:recall-prelive` passed. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Durable Manual Clean-Run Evidence and Scheduler Sequence Alignment - 2026-06-27 12:42 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Time-based clean-run drift | Fixed | Codex | `scripts/check-recall-daily-sync-completion-status.mjs` now validates scheduled manual apply reports with `DEFAULT_DURABLE_APPLY_REPORT_EVIDENCE_MAX_AGE_MINUTES`, so historical clean manual evidence does not age out after the default 120-minute apply-report window. |
| Regression observed | Reproduced | Codex | Before the fix, `scheduled-apply-20260627T050448Z.json` failed standalone apply-report review only for `stale_report`, completion status dropped to `cleanRunCount: 2`, and `check:recall-goal-completion-audit` blocked with `second_manual_apply_report_not_current`. |
| Completion status | Restored | Codex | `recall:daily-sync:completion-status` again reports `manualCleanRunReadiness.cleanRunCount: 3` with first apply, `scheduled-apply-20260627T050448Z.json`, and `scheduled-apply-20260627T063340Z.json`. |
| Current-gate sequencing | Hardened | Codex | `scripts/check-recall-current-gate.mjs` now exposes `postApprovalSequence` and safe-next wording for exact approval, timer/flag enablement, first scheduled service-run verification after timer activation, then private evidence recording/verification. |
| Goal-audit sequencing | Hardened | Codex | `scripts/check-recall-goal-completion-audit.mjs` now fails stale safe-next guidance that skips timer/first-run verification before scheduler evidence recording. |
| Smoke/static coverage | Passed | Codex | `smoke:recall-current-gate`, `smoke:recall-goal-completion-audit`, and `check:recall-scheduler` now guard the durable evidence and post-approval sequence behavior. |
| Real handoff verification | Passed | Codex | `recall:scheduler-enable:command -- --json` passed with `cleanRunCount: 3`, `cleanRunEvidenceCount: 3`, three manual clean-run args, `prelive.resultCount: 47`, `stoppedAt: ready_for_exact_scheduler_approval`, and no mutation flags. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Completion Status Scheduler Sequence Alignment - 2026-06-27 12:48 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Completion-status safe-next wording | Aligned | Codex | `scripts/check-recall-daily-sync-completion-status.mjs` now separates exact scheduler approval, timer/flag enablement, first scheduled service-run completion after scheduler timer activation, scheduler evidence recording, evidence verification, and final completion status. |
| Completion-status next action | Aligned | Codex | Scheduler-ready `nextGate.nextAction` now says private evidence can be recorded only after the first scheduled service run completed after scheduler timer activation. |
| Smoke/static coverage | Passed | Codex | `smoke:recall-daily-sync-completion-status` now proves `scheduler-ready fixture requires post-approval timer/first-run sequence before evidence recording`; `check:recall-scheduler` guards the smoke string. |
| Real gate verification | Passed | Codex | `recall:daily-sync:completion-status`, `check:recall-goal-completion-audit`, and `recall:current-gate` passed with `cleanRunCount: 3` and scheduler approval still absent. |
| Full handoff verification | Passed | Codex | `recall:scheduler-enable:command -- --json` passed with `prelive.resultCount: 47`, `cleanRunEvidenceCount: 3`, `stoppedAt: ready_for_exact_scheduler_approval`, and no mutation flags. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Additional Manual Production Verification Apply - 2026-06-27 13:04 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Extra manual approval | Received | Arun | Arun approved one additional manual Recall -> AI Brain production verification run before scheduler enablement, explicitly excluding scheduler timer enablement and allowing only guarded apply-path checkpoint movement. |
| Approved production verification apply | Completed | Codex | Production `scripts/recall-scheduled-apply.sh` ran in manual verification mode with explicit live API confirmation and deployed SPIKE pair `2026-06-26_21-58-57_IST`. |
| New private reports | Copied locally | Codex | `data/private/recall-live-spikes/scheduled-dry-run-20260627T073114Z.json`, `scheduled-preflight-20260627T073114Z.json`, and `scheduled-apply-20260627T073114Z.json` were copied from production into ignored private evidence with mode `600`. |
| New apply report | Reviewed | Codex | `data/private/recall-live-spikes/scheduled-apply-20260627T073114Z.json` passed `PASS_POST_APPLY_REVIEW_GATE`; run saw 0 cards and wrote 0 imports/upgrades, with checkpoint advanced by the guarded apply path. |
| Manual-run count | Updated | Codex | Completion status now reports `manualCleanRunReadiness.cleanRunCount: 4`, `needsSecondManualVerificationRun: false`, and scheduler approval allowed by manual-run evidence. |
| Remote timer state | Verified disabled | Codex | Post-run `recall:second-manual:remote-runtime-preflight` reports production timer `enabled: false`, `active: false`, and remote Recall enable flags disabled. |
| Scheduler handoff | Passed no-live | Codex | `recall:scheduler-enable:command -- --json` reports `stoppedAt: ready_for_exact_scheduler_approval`, `cleanRunCount: 4`, `prelive.resultCount: 48`, `manual_additional_guarded_apply_3`, `schedulerEnablementAttempted: false`, `liveWriteAttempted: false`, and `checkpointAdvanced: false`. |
| Scheduler evidence handoff | Passed no-live | Codex | `recall:scheduler-evidence:command -- --json` sees all four manual reports and keeps the first scheduled service-run report placeholder explicit for post-enable evidence. |
| Execution report | Created | Codex | `RECALL_ADDITIONAL_MANUAL_PRODUCTION_VERIFICATION_APPLY_2026-06-27_13-04-07_IST.md` records the no-secret outcome and remaining scheduler gate. |
| Current real gate | Awaiting exact scheduler approval | Arun | Scheduler timer was not enabled, no scheduler evidence file was recorded, no deploy was run, and the goal remains incomplete until scheduler approval/evidence/final completion pass. |

## Four-Run Scheduler Handoff Fixture Guard - 2026-06-27 13:11 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Current gate recheck | Passed | Codex | `recall:current-gate` reports `ready_for_scheduler_enablement_approval`, `manualCleanRunCount: 4`, `schedulerAllowedNow: true`, and exact scheduler approval absent. |
| Scheduler handoff real output | Verified | Codex | `recall:scheduler-enable:command -- --json` dynamically includes `manual_additional_guarded_apply_3=data/private/recall-live-spikes/scheduled-apply-20260627T073114Z.json` and stops at `ready_for_exact_scheduler_approval` with no mutation flags. |
| Smoke fixtures | Hardened | Codex | `scripts/print-recall-scheduler-enable-command.mjs` and `scripts/print-recall-scheduler-evidence-command.mjs` smoke fixtures now model all four clean manual reports instead of stopping at the prior three-report state. |
| Smoke assertions | Hardened | Codex | `scripts/smoke-recall-scheduler-enable-command.mjs` and `scripts/smoke-recall-scheduler-evidence-command.mjs` now assert `manual_additional_guarded_apply_3` and `scheduled-apply-20260627T073114Z.json`. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the latest fourth-run report assertion in the scheduler handoff smoke and scheduler approval packet. |
| Verification | Passed | Codex | `node --check` for touched scheduler handoff/checker scripts, `smoke:recall-scheduler-enable-command`, `smoke:recall-scheduler-evidence-command`, and `check:recall-scheduler` passed. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Real Scheduler Handoff Recheck After Fixture Guard - 2026-06-27 13:14 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Real no-live scheduler handoff | Passed | Codex | After the four-run fixture patch, `recall:scheduler-enable:command -- --json` passed with `cleanRunCount: 4`, all four `manualCleanRuns`, `preliveOk: true`, and `preliveResultCount: 48`. |
| Mutation flags | Verified false | Codex | The same real handoff reported `schedulerEnablementAttempted: false`, `liveWriteAttempted: false`, and `checkpointAdvanced: false`. |
| Current real gate | Awaiting exact scheduler approval | Arun | Scheduler timer was not enabled, no scheduler evidence file was recorded, no deploy was run, and the goal remains incomplete until scheduler approval/evidence/final completion pass. |

## Current Gate First-Run Evidence Handoff Alignment - 2026-06-27 13:18 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Current-gate scheduler sequence | Hardened | Codex | `scripts/check-recall-current-gate.mjs` now exposes `postEnableFirstRunEvidenceHandoffCommand: npm run recall:scheduler-evidence:command` in `requiredBeforeScheduler`. |
| Safe-next guidance | Hardened | Codex | `recall:current-gate` now tells operators to run `recall:scheduler-evidence:command` after the first scheduled service run completes after timer activation and before scheduler evidence recording. |
| Smoke coverage | Hardened | Codex | `scripts/smoke-recall-current-gate.mjs` now proves the ready output includes the post-enable first-run evidence handoff and the timer/first-run/evidence-handoff/evidence sequence. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the current-gate first-run evidence handoff field, command, and smoke strings. |
| Verification | Passed | Codex | `node --check` for touched current-gate/static scripts, `smoke:recall-current-gate`, `check:recall-scheduler`, and real `recall:current-gate` passed. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Fifth Manual Production Verification Apply - 2026-06-27 13:28 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Extra manual approval | Received | Arun | Arun approved one additional manual Recall -> AI Brain production verification run before scheduler enablement, explicitly excluding scheduler timer enablement and allowing only guarded apply-path checkpoint movement. |
| Approved production verification apply | Completed | Codex | `recall:second-manual:production-apply` completed with `status: second_manual_production_apply_completed`, `liveWriteAttempted: true`, and deployed proof pair `2026-06-26_21-58-57_IST`. |
| New private evidence | Copied locally | Codex | Wrapper summary `data/private/recall-live-spikes/additional-manual-production-apply-20260627T075405Z.json` and apply report `data/private/recall-live-spikes/scheduled-apply-20260627T075410Z.json` are local private evidence files with mode `600`. |
| New apply report | Reviewed | Codex | `scheduled-apply-20260627T075410Z.json` passed `PASS_POST_APPLY_REVIEW_GATE`; run saw 0 cards and wrote 0 imports/upgrades, with checkpoint advanced only by the guarded apply path. |
| Manual-run count | Updated | Codex | Goal-completion audit now reports `manualCleanRunReadiness.cleanRunCount: 5`; scheduler approval is allowed by manual-run evidence but exact scheduler approval is absent. |
| Fixture drift | Fixed | Codex | `scripts/smoke-recall-goal-completion-audit.mjs` now includes `recall:scheduler-evidence:command` in the good audit fixture, matching the real checker's required post-enable first-run evidence handoff. |
| Verification | Passed | Codex | `smoke:recall-daily-sync-completion-status`, `smoke:recall-goal-completion-audit`, `check-recall-goal-completion-audit`, `check:recall-scheduler`, `recall:current-gate`, `recall:daily-sync:completion-status`, `recall:scheduler-evidence:command -- --json`, and `recall:scheduler-enable:command -- --json` passed. |
| Scheduler handoff | Passed no-live | Codex | `recall:scheduler-enable:command -- --json` reports five manual clean runs, `stoppedAt: ready_for_exact_scheduler_approval`, `schedulerEnablementAttempted: false`, `liveWriteAttempted: false`, and `checkpointAdvanced: false`. |
| Execution report | Created | Codex | `RECALL_ADDITIONAL_MANUAL_PRODUCTION_VERIFICATION_APPLY_2026-06-27_13-28-32_IST.md` records the no-secret outcome and remaining scheduler gate. |
| Current real gate | Awaiting exact scheduler approval | Arun | Scheduler timer was not enabled, no scheduler evidence file was recorded, no deploy was run, and the goal remains incomplete until scheduler approval/evidence/final completion pass. |

## Fifth-Run Scheduler Approval Packet Alignment - 2026-06-27 13:38 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Drift found | Confirmed | Codex | Real `recall:scheduler-enable:command -- --json` already reported five manual clean runs, but `RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md`, scheduler handoff smoke fixtures, and static assertions still stopped at the fourth `scheduled-apply-20260627T073114Z.json` run. |
| Scheduler handoff fixtures | Hardened | Codex | `scripts/print-recall-scheduler-enable-command.mjs` and `scripts/print-recall-scheduler-evidence-command.mjs` smoke fixtures now model `cleanRunCount: 5` and include `scheduled-apply-20260627T075410Z.json`. |
| Smoke assertions | Hardened | Codex | `scripts/smoke-recall-scheduler-enable-command.mjs` and `scripts/smoke-recall-scheduler-evidence-command.mjs` now assert `manual_additional_guarded_apply_4=data/private/recall-live-spikes/scheduled-apply-20260627T075410Z.json`. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires fifth-run inclusion in the scheduler enablement and first-run evidence handoff smokes plus the approval packet evidence command. |
| Approval packet | Updated | Codex | `RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md` now says `manualCleanRunReadiness.cleanRunCount >= 2` currently equals `5`, lists the fifth manual run, includes `manual_additional_guarded_apply_4`, and forbids reusing `scheduled-apply-20260627T075410Z.json` as first scheduled service-run evidence. |
| Goal audit doc | Updated | Codex | `RECALL_DAILY_SYNC_GOAL_COMPLETION_AUDIT_2026-06-27_08-25-25_IST.md` now records five current clean runs and includes `scheduled-apply-20260627T075410Z.json`; `check-recall-goal-completion-audit` now requires that fifth-run snippet. |
| Verification | Passed | Codex | Syntax checks for touched scripts, `smoke:recall-scheduler-enable-command`, `smoke:recall-scheduler-evidence-command`, `smoke:recall-goal-completion-audit`, `check:recall-scheduler`, `check:recall-public-docs-privacy`, `check-recall-goal-completion-audit`, `recall:current-gate`, `recall:daily-sync:completion-status`, `recall:scheduler-enable:command -- --json`, `recall:scheduler-evidence:command -- --json`, and touched-file `git diff --check` passed. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Current-Gate Manual Clean-Run Visibility - 2026-06-27 13:42 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Operator visibility gap | Fixed | Codex | `recall:current-gate` now exposes `manualCleanRunReadiness` at the top level and under `requiredBeforeScheduler`, so the consolidated gate directly shows `requiredManualCleanRunsBeforeSchedulerEnable: 2`, `cleanRunCount: 5`, `needsSecondManualVerificationRun: false`, and `schedulerEnablementApprovalAllowedByManualRunEvidence: true`. |
| Current-gate smoke | Hardened | Codex | `scripts/smoke-recall-current-gate.mjs` now proves scheduler-ready output exposes manual clean-run readiness at the top level and under `requiredBeforeScheduler`, including extra manual-run counts. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires current-gate manual clean-run readiness exposure and smoke coverage. |
| Scheduler packet drift | Fixed | Codex | `RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md` no longer has the stale `cleanRunCount` of `4`; it now says the current count is `5`. |
| Verification | Passed | Codex | `node --check` for current-gate/static scripts, `smoke:recall-current-gate`, `check:recall-scheduler`, `check:recall-public-docs-privacy`, real `recall:current-gate`, stale-`4` scan for touched scheduler surfaces, and touched-file `git diff --check` passed. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Scheduler Handoff Current-Gate Count Consistency - 2026-06-27 13:51 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Count consistency guard | Added | Codex | `scripts/print-recall-scheduler-enable-command.mjs` and `scripts/print-recall-scheduler-evidence-command.mjs` now compare current-gate and completion-status clean-run counts before reporting ready. |
| Current-gate readiness requirement | Hardened | Codex | Both handoffs now require current-gate `manualCleanRunReadiness.cleanRunCount >= 2`, `needsSecondManualVerificationRun: false`, and `schedulerEnablementApprovalAllowedByManualRunEvidence: true`. |
| Smoke coverage | Hardened | Codex | `smoke:recall-scheduler-enable-command` and `smoke:recall-scheduler-evidence-command` now prove current-gate and completion-status clean-run count agreement. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the consistency function and smoke strings for both scheduler handoffs. |
| Real scheduler handoff | Passed no-live | Codex | `recall:scheduler-enable:command -- --json` reports current-gate clean-run count `5`, completion-status clean-run count `5`, all five manual reports, `ready_for_exact_scheduler_approval`, exact approval absent, and no mutation flags. |
| Real first-run evidence handoff | Passed no-live | Codex | `recall:scheduler-evidence:command -- --json` reports current-gate clean-run count `5`, completion-status clean-run count `5`, all five manual reports, `ready_for_post_enable_first_run_evidence`, and `evidenceRecorded: false`. |
| Verification | Passed | Codex | Syntax checks, both scheduler handoff smokes, `check:recall-scheduler`, `check:recall-public-docs-privacy`, both real handoff commands, and touched-file `git diff --check` passed. |
| Current real gate | Awaiting exact scheduler approval | Arun | No scheduler timer was enabled, no Recall API call was made, no apply/import/deploy/checkpoint movement occurred, and no scheduler evidence file was recorded. |

## Sixth Manual Production Verification Apply - 2026-06-27 14:00 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Extra manual approval | Received | Arun | Arun approved one additional manual Recall -> AI Brain production verification run before scheduler enablement, explicitly excluding scheduler timer enablement and allowing only guarded apply-path checkpoint movement. |
| Approved production verification apply | Completed | Codex | `recall:second-manual:production-apply` completed with `status: second_manual_production_apply_completed`, `liveWriteAttempted: true`, and deployed proof pair `2026-06-26_21-58-57_IST`. |
| New private apply report | Copied locally | Codex | `data/private/recall-live-spikes/scheduled-apply-20260627T082621Z.json` exists locally with mode `600`. |
| New apply report | Reviewed | Codex | `scheduled-apply-20260627T082621Z.json` passed `PASS_POST_APPLY_REVIEW_GATE`; run saw 0 cards and wrote 0 imports/upgrades, with checkpoint advanced only by the guarded apply path. |
| Manual-run count | Updated | Codex | `recall:current-gate` and completion status now report `manualCleanRunReadiness.cleanRunCount: 6`, `needsSecondManualVerificationRun: false`, and scheduler approval allowed by manual-run evidence. |
| Scheduler handoff fixtures | Hardened | Codex | Scheduler enablement and first-run evidence handoff smoke fixtures now model all six clean manual reports, including `manual_additional_guarded_apply_5=data/private/recall-live-spikes/scheduled-apply-20260627T082621Z.json`. |
| Approval/audit docs | Updated | Codex | Scheduler approval packet, goal completion audit, and new execution report `RECALL_ADDITIONAL_MANUAL_PRODUCTION_VERIFICATION_APPLY_2026-06-27_13-59-33_IST.md` now record the sixth run and forbid reusing it as first scheduled service-run evidence. |
| Verification | Passed | Codex | Syntax checks, `smoke:recall-scheduler-enable-command`, `smoke:recall-scheduler-evidence-command`, `smoke:recall-goal-completion-audit`, `check:recall-scheduler`, `check:recall-public-docs-privacy`, `check-recall-goal-completion-audit`, `recall:current-gate`, `recall:daily-sync:completion-status`, `recall:scheduler-enable:command -- --json`, and `recall:scheduler-evidence:command -- --json` passed. |
| Current real gate | Awaiting exact scheduler approval | Arun | Scheduler timer was not enabled, no scheduler evidence file was recorded, no deploy was run, and the goal remains incomplete until scheduler approval/evidence/final completion pass. |

## Scheduler Handoff Count-Mismatch Negative Coverage - 2026-06-27 14:13 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Smoke-only fixture override | Added | Codex | `scripts/print-recall-scheduler-enable-command.mjs` and `scripts/print-recall-scheduler-evidence-command.mjs` now accept `--smoke-current-gate-clean-run-count` / `--smoke-completion-clean-run-count` only with `--skip-checks-for-smoke`; production/no-live handoffs reject those overrides. |
| Negative smoke coverage | Hardened | Codex | `smoke:recall-scheduler-enable-command` and `smoke:recall-scheduler-evidence-command` now force a current-gate/completion clean-run count mismatch and assert `manual_clean_run_count_mismatch` plus fail-closed stop states before scheduler readiness or evidence readiness. |
| Static guard | Hardened | Codex | `scripts/check-recall-scheduler-artifacts.mjs` now requires the smoke-only override and mismatch-finding assertions for both scheduler handoffs. |
| Real no-live scheduler handoff | Passed | Codex | `recall:scheduler-enable:command -- --json` still reports current-gate clean-run count `6`, completion-status clean-run count `6`, `ready_for_exact_scheduler_approval`, and mutation flags false. |
| Real no-live evidence handoff | Passed | Codex | `recall:scheduler-evidence:command -- --json` still reports current-gate clean-run count `6`, completion-status clean-run count `6`, `ready_for_post_enable_first_run_evidence`, and `evidenceRecorded: false`. |
| Verification | Passed | Codex | Syntax checks, `smoke:recall-scheduler-enable-command`, `smoke:recall-scheduler-evidence-command`, `check:recall-scheduler`, `check:recall-public-docs-privacy`, `recall:current-gate`, `recall:scheduler-enable:command -- --json`, and `recall:scheduler-evidence:command -- --json` passed. |
| Current real gate | Awaiting exact scheduler approval | Arun | Scheduler timer was not enabled, no scheduler evidence file was recorded, no Recall live call was made in this hardening pass, no deploy was run, and the goal remains incomplete until scheduler approval/evidence/final completion pass. |

## Production Scheduler Enabled and Goal Completed - 2026-06-28 01:53 IST

| Item | Status | Owner | Evidence / Notes |
| --- | --- | --- | --- |
| Exact scheduler approval | Received | Arun | Arun approved enabling the production Recall -> AI Brain daily scheduler after repeated clean manual runs, using deployed scheduler artifacts, rotated private env, explicit live API confirmation, production timer `brain-recall-sync.timer`, and private scheduler evidence recording. |
| Scheduler env enablement bug | Found and fixed | Codex | The generated `sed` enablement command did not update `/etc/brain/.env` because production env lines use `export KEY=value` and some scheduler flags were absent. Production was repaired with a timestamped `/etc/brain/.env.scheduler-*.bak` backup and upserted exported flags: `BRAIN_RECALL_SYNC_ENABLED=1`, `BRAIN_RECALL_SCHEDULER_ENABLED=1`, `BRAIN_RECALL_CONFIRM_LIVE_API=1`, `BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF=1`, and `BRAIN_RECALL_REQUIRE_BACKUP_PROOF=1`. |
| Scheduler command hardening | Completed | Codex | `scripts/print-recall-scheduler-enable-command.mjs` now prints a robust exported-env upsert command for enable and emergency disable instead of brittle bare `sed` replacements. |
| Production timer | Enabled and verified | Codex | `brain-recall-sync.timer` is enabled/active. It first fired naturally after activation; no manual `systemctl start` was used as first-run proof. |
| First scheduled service run | Verified | Codex | Production service completed at `2026-06-27T20:03:08.000Z`; private report `data/private/recall-live-spikes/scheduled-apply-20260627T200306Z.json` passed `PASS_POST_APPLY_REVIEW_GATE`. The run saw zero Recall cards and wrote zero imports/upgrades, which is valid empty-window scheduler proof. |
| Private scheduler evidence | Recorded and verified | Codex | `data/private/recall-live-spikes/scheduler-enable-evidence.json` passed `PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION`; manual clean-run evidence count before enablement is `6`, and first scheduled run evidence is distinct from all manual clean-run reports. |
| Final audit | Created and verified | Codex | Created `RECALL_DAILY_SYNC_FINAL_COMPLETION_AUDIT_2026-06-28_01-40-12_IST.md`; `check:recall-goal-completion-audit` now reports `goal_completion_audit_final_state_verified`. |
| Final current gate | Completed | Codex | `recall:current-gate` now reports `status: complete`, `currentBlockingGate: null`, `approvalRequiredEnv: null`, `safeNextCommands: []`, and `nextAction: No remaining Recall daily sync completion gate.` |
| Stale post-completion guards | Fixed | Codex | Goal audit, current-gate, and second-manual local-gate checkers/smokes now accept the final completed state while preserving historical incomplete-state fixture coverage. |
| Final completion status | Passed | Codex | `npm run recall:daily-sync:completion-status -- --require-complete` reports `ok: true`, `completionAchieved: true`, `status: complete`, no blocked requirements, and scheduler enablement done. |
| Verification | Passed | Codex | `check:recall-scheduler-enable-evidence`, `recall:daily-sync:completion-status -- --require-complete`, `check:recall-goal-completion-audit`, `recall:current-gate`, `check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`, `check:recall-scheduler`, `check:recall-public-docs-privacy`, scheduler/current-gate/local-gate smokes, and touched-file `git diff --check` passed. |
| Current real gate | Complete | Codex | No remaining Recall daily-sync completion gate is open. Production scheduler remains enabled for the next daily run. |
