# Recall Core Apply Key Rotation Evidence Gate Execution Report

Created: 2026-06-25 01:18 IST
Owner: Codex
Status: Done for offline scope; no production apply was run
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Objective

Close the remaining first-write safety gap where an operator could bypass the guarded `npm run recall:first-capped-apply` wrapper and invoke the lower-level `scripts/sync-recall.ts --apply` command without the local key-rotation evidence gate.

This report contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, or database rows.

## Change Summary

- `scripts/sync-recall.ts --apply` now supports a core key-rotation evidence gate:
  - `--require-key-rotation-evidence`
  - `--key-rotation-env-file <path>`
  - `--key-rotation-evidence-file <path>`
  - `--no-key-rotation-evidence-file`
  - `--key-rotated-after <iso>`
  - `--key-rotation-system-env-file`
- The core CLI also honors environment-controlled equivalents for automation:
  - `BRAIN_RECALL_REQUIRE_KEY_ROTATION_EVIDENCE=1`
  - `BRAIN_RECALL_KEY_ROTATION_ENV_FILE`
  - `BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE`
  - `BRAIN_RECALL_KEY_ROTATED_AFTER_ISO`
  - `BRAIN_RECALL_KEY_ROTATION_SYSTEM_ENV_FILE=1`
- `scripts/recall-first-capped-apply.sh` now passes the same key-rotation evidence requirement into the real, non-fixture core apply invocation.
- `scripts/sync-recall.ts` invokes child proof checkers with an explicit `--` separator so Node 22 does not consume checker arguments such as `--env-file` as Node runtime options.
- `scripts/recall-first-capped-apply.sh` uses guarded empty-array expansion for the key-evidence argument list so fixture smokes remain compatible with `set -u`.
- `scripts/smoke-recall-cli-bundle.mjs` now packages `check-recall-key-rotation-evidence.mjs` beside the bundled CLI, proves missing key evidence fails before apply, and proves fresh safe metadata passes in the packaged apply path.
- `scripts/smoke-recall-first-capped-apply.mjs` now statically asserts the real wrapper branch passes key-evidence flags into the core CLI.
- `RECALL_FIRST_CAPPED_APPLY_APPROVAL_PACKET_2026-06-24_19-28-07_IST.md` now shows a lower-level debug command that is still key-evidence-gated.
- `RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` now shows the production direct-apply command with the same core key-evidence flags.
- `RECALL_FIRST_CAPPED_APPLY_WRAPPER_EXECUTION_REPORT_2026-06-24_20-26-51_IST.md` now reflects the current wrapper contract, including exact key acknowledgement, local key evidence, and core CLI flag pass-through.

## Safety Properties

- The new core gate calls `scripts/check-recall-key-rotation-evidence.mjs`; it inspects safe file metadata and optional private evidence JSON only.
- The gate runs in `apply` mode before live-spike proof, dry-run proof, backup proof, live Recall API use, importer writes, or checkpoint advancement.
- Failure output is passed through the existing Recall CLI redaction helper before being printed.
- Fixture mode remains available for offline smokes, but the bundled smoke explicitly enables the new key-evidence requirement so the packaged path is covered.
- The wrapper remains the preferred first capped apply command because it still enforces exact `BRAIN_RECALL_KEY_ROTATION_ACK` and exact first-write approval text in addition to the core CLI proof gate.

## Learned During Validation

- Node 22 treats `--env-file` as a runtime option even when it appears after a script path if the referenced env file is missing. Child checker invocations now use `node -- <checker> ...` so checker-level `--env-file` arguments remain script arguments in missing-file negative tests and packaged deployments.
- Bash `set -u` treats an empty array expansion as unbound in the fixture path. The wrapper now uses the same guarded empty-array expansion pattern used elsewhere in the Recall scripts.

## Validation

Passed in this session:

```text
node --check scripts/smoke-recall-cli-bundle.mjs
node --check scripts/smoke-recall-first-capped-apply.mjs
node --check scripts/check-recall-approval-packet.mjs
node --check scripts/check-recall-public-docs-privacy.mjs
bash -n scripts/recall-first-capped-apply.sh
npm run build:recall-cli
npm run smoke:recall-cli:bundle
npm run smoke:recall-first-capped-apply
npm run check:recall-approval-packet
npm run smoke:recall-public-docs-privacy
npm run check:recall-public-docs-privacy
git diff --check -- scripts/sync-recall.ts scripts/recall-first-capped-apply.sh scripts/smoke-recall-cli-bundle.mjs scripts/smoke-recall-first-capped-apply.mjs scripts/check-recall-approval-packet.mjs scripts/check-recall-public-docs-privacy.mjs docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_APPROVAL_PACKET_2026-06-24_19-28-07_IST.md docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_WRAPPER_EXECUTION_REPORT_2026-06-24_20-26-51_IST.md docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md docs/plans/recall-sync/RECALL_CORE_APPLY_KEY_ROTATION_EVIDENCE_GATE_EXECUTION_REPORT_2026-06-25_01-18-04_IST.md
```

Real local first-apply status remains intentionally blocked:

```text
npm run recall:first-apply:status
```

Observed state: `blocked_key_rotation_evidence`. This is expected until the Recall API key is rotated outside chat and the ignored private env file or private evidence file proves the rotation.

## Remaining Gate

No production apply, deploy, scheduler enablement, checkpoint advancement, stage, commit, push, or pull request happened in this work. The next production step remains: rotate the Recall API key outside chat, store the rotated key only in the ignored private Recall env file, run the post-rotation prepare wrapper, then request exact first capped apply approval only after status/readiness are green.
