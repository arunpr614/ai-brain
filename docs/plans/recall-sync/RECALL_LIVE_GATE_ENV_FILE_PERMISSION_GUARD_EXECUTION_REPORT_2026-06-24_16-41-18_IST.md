# Recall Live Gate Env File Permission And Location Guard Execution Report

Created: 2026-06-24 16:41 IST
Status: Done for offline scope; live Recall API execution still requires approval and real controlled samples
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Added ignored/untracked location and owner-only permission guards for the local Recall env file used by the no-secret live-gate status command.

The prior live-gate status command correctly reported whether `data/private/recall-live-spikes/recall.env` existed, was ignored, and was untracked. This change tightens the pre-live safety boundary: if an existing env file is not ignored/untracked, the live-gate status blocks readiness with `needs_env_file_safety_fix`; if it has group or other permissions, the live-gate status blocks readiness with `needs_env_permission_fix` and tells the operator to run `chmod 600`.

No live Recall API call was made. No API key value, private Recall title, private source URL, chunk content, production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Live gate status | `scripts/check-recall-live-gate-status.mjs` | Reports env-file mode and location metadata, then blocks live readiness when the file is not ignored/untracked or has group/other permissions. |
| Live gate status smoke | `scripts/smoke-recall-live-gate-status.mjs` | Covers unignored env-file rejection, tracked env-file rejection, insecure `0644` env-file rejection, secure `0600` env-file acceptance, and temporary file cleanup. |
| Approval packet consistency | `scripts/check-recall-approval-packet.mjs` | Requires env-file location and permission policy snippets across the checklist, operating packet, runbook, audit, and tracker. |
| Approval checklist | `docs/plans/recall-sync/RECALL_LIVE_API_APPROVAL_CHECKLIST_2026-06-24_14-00-43_IST.md` | Adds ignored/untracked and owner-only expectations as pre-live decisions and stop conditions. |
| Operating packet | `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` | Documents that the ignored local env option is blocked unless the file is ignored/untracked and permissions are owner-only. |
| Production runbook | `docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` | Adds the ignored/untracked and owner-only env-file expectation to live preparation. |
| Completion audit | `docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md` | Adds the env-file permission guard to the safety gate map. |
| Project tracker | `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md` | Tracks `RDS-026ao3a` as done for offline scope. |

## Safety Behavior

When an env file is supplied or the default private env path exists, the status command reports only file metadata:

- path;
- existence;
- ignored/untracked state;
- `safeForSecretHandling` boolean;
- octal mode string;
- `securePermissions` boolean.

The status command does not print env-file contents or API-key values.

## Status Outcomes

| Condition | Status | Operator next action |
|---|---|---|
| Existing env file is not ignored or is tracked | `needs_env_file_safety_fix` | Move to `data/private/recall-live-spikes/recall.env` through `npm run recall:env:init`, then re-run live-gate status. |
| `recall.env` exists with group/other permissions | `needs_env_permission_fix` | Run `chmod 600 data/private/recall-live-spikes/recall.env`, then re-run live-gate status. |
| `recall.env` exists with owner-only permissions but shell has no key loaded | `needs_env_source_or_approval` | Source the approved local env file only after API-key handling approval. |
| Manifest is valid, key presence is detected, and confirmation is set | `ready_for_approved_live_spikes` | Still requires human approval before running live spikes. |

## Validation Evidence

Syntax checks:

```text
node --check scripts/check-recall-live-gate-status.mjs
node --check scripts/smoke-recall-live-gate-status.mjs
node --check scripts/check-recall-approval-packet.mjs
```

Result: passed.

Live-gate smoke:

```text
npm run smoke:recall-live-gate-status
```

Result: passed.

The smoke verifies:

- existing env file outside ignored private paths reports `needs_env_file_safety_fix`;
- tracked env file path reports `needs_env_file_safety_fix`;
- insecure `0644` env file reports `needs_env_permission_fix`;
- secure `0600` env file reports `securePermissions: true`;
- env-file contents are not printed;
- temporary private env and manifest files are cleaned up.

Pre-live readiness:

```text
npm run check:recall-prelive
```

Result: passed.

Approval packet consistency:

```text
npm run check:recall-approval-packet
```

Result: passed.

Whole-project checks:

```text
npm run typecheck
npm run lint
node --import tsx --test src/lib/recall/client.test.ts src/lib/recall/sync-runner.test.ts src/lib/recall/fidelity.test.ts src/lib/recall/importer.test.ts src/lib/recall/scheduler.test.ts src/db/migrations/020_recall_sync.test.ts
npm test
git diff --check
```

Result: passed. The focused Recall suite passed 40/40 tests, and the full suite passed 689/689 tests.

Current local live-gate status:

```text
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Result:

- `status: needs_manifest_fix`;
- private controlled sample manifest still contains placeholders;
- `recall.env` exists under the ignored private path;
- `recall.env` is untracked;
- `safeForSecretHandling: true`;
- `recall.env` mode is `600`;
- `securePermissions: true`;
- no live Recall API call was made.

Private temp-file hygiene:

```text
find data/private/recall-live-spikes -maxdepth 1 \( -name '*status-smoke*.json' -o -name 'recall-status-smoke-*.env' -o -name 'controlled-samples-status-smoke-*.json' -o -name 'recall-env-init-smoke-*.env' \) -print
```

Result: no files printed.

## Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| API-key handling approval | Blocked | User must approve temporary shell env or ignored local env handling before any live API call. |
| Controlled sample manifest | Blocked | Current private manifest still has placeholders; fill only after approval. |
| Live SPIKE-013/SPIKE-014 | Blocked | Run only after manifest validation, API-key handling approval, and explicit live confirmation. |
| Production dry-run/apply/deploy/scheduler | Blocked | Require live spike evidence and later explicit approvals. |

## Operator Next Step

After API-key handling and controlled sample approval, fill `data/private/recall-live-spikes/controlled-samples.json`, then run:

```text
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```
