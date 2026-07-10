# Recall Controlled Sample Manifest File Safety Guard Execution Report

Created: 2026-06-24 16:51 IST
Status: Done for offline scope; live Recall API execution still requires approval and real controlled samples
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Added file safety enforcement for the private controlled sample manifest used by the live Recall SPIKE-013/SPIKE-014 workflow.

The manifest can contain private Recall card IDs, expected titles, source URLs, and negative-control evidence. The initializer already wrote it under `data/private/recall-live-spikes/` with `0600` permissions, but the validator and live-gate status path did not reject an existing manifest if it was copied outside the ignored private path, became tracked, or became group/other-readable.

No live Recall API call was made. No private Recall sample values were printed. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Shared manifest helper | `scripts/lib/recall-controlled-samples.mjs` | Added no-secret file inspection for path, existence, private-root placement, git ignore/tracking state, octal mode, and owner-only permission status. |
| Manifest validator | `scripts/check-recall-controlled-samples.mjs` | Rejects existing manifest files that are outside `data/private/recall-live-spikes/`, not ignored, tracked, or not owner-only. |
| Live gate status | `scripts/check-recall-live-gate-status.mjs` | Reports manifest file metadata and blocks readiness with `needs_manifest_file_safety_fix` or `needs_manifest_permission_fix` before content validation. |
| Live spike runner | `scripts/run-recall-live-spikes.mjs` | Enforces manifest file safety before approved live SPIKE-013/SPIKE-014 execution while preserving temp manifests for fixture rehearsal. |
| Direct spike probes | `scripts/spikes/recall-rest-enumeration.ts`, `scripts/spikes/recall-content-fidelity.ts` | Enforce manifest file safety when no fixture is supplied, so direct live probe use cannot bypass the private manifest guard. |
| Live gate smoke | `scripts/smoke-recall-live-gate-status.mjs` | Covers unsafe manifest location, tracked manifest path, insecure manifest permissions, and temp cleanup. |
| Live spike smoke | `scripts/smoke-recall-live-spikes.mjs` | Covers unsafe manifest rejection before live Recall API calls and proves fixture rehearsal still accepts temporary manifests. |
| Approval packet | Approval checklist, operating packet, production runbook, completion audit, tracker | Documents the controlled sample manifest file safety requirement. |

## Safety Behavior

The manifest file is considered safe for private values only when all of these are true:

- it exists under `data/private/recall-live-spikes/`;
- git ignores it;
- git does not track it;
- the owner can read it;
- group and other users have no permissions.

The checks report only metadata and validation findings. They do not print card IDs, expected titles, source URLs, notes, chunks, or API keys.

## Status Outcomes

| Condition | Status | Operator next action |
|---|---|---|
| Existing manifest is outside the ignored private path, not ignored, or tracked | `needs_manifest_file_safety_fix` | Recreate or move it through `npm run recall:controlled-samples:init` under `data/private/recall-live-spikes/`. |
| Existing manifest has group/other permissions | `needs_manifest_permission_fix` | Run `chmod 600 data/private/recall-live-spikes/controlled-samples.json`, then re-run live-gate status. |
| Manifest file is safe but placeholders remain | `needs_manifest_fix` | Replace placeholders after approval and re-run manifest validation. |

## Validation Evidence

Syntax checks:

```text
node --check scripts/lib/recall-controlled-samples.mjs
node --check scripts/check-recall-controlled-samples.mjs
node --check scripts/check-recall-live-gate-status.mjs
node --check scripts/smoke-recall-live-gate-status.mjs
node --check scripts/run-recall-live-spikes.mjs
node --check scripts/smoke-recall-live-spikes.mjs
```

Result: passed.

Live-gate smoke:

```text
npm run smoke:recall-live-gate-status
```

Result: passed.

The smoke verifies:

- manifest outside ignored private paths reports `needs_manifest_file_safety_fix`;
- tracked manifest path reports `needs_manifest_file_safety_fix`;
- group-readable manifest reports `needs_manifest_permission_fix`;
- valid private manifest proceeds to content/credential gates;
- temporary private and unsafe manifest files are cleaned up.

Live-spike runner smoke:

```text
npm run smoke:recall-live-spikes
```

Result: passed.

The smoke verifies:

- unconfirmed live mode is rejected;
- mixed fixture/live mode is rejected;
- live report directories outside `docs/plans/spikes` are rejected;
- unsafe live manifest files are rejected before Recall API calls;
- fixture rehearsal still runs SPIKE-013/SPIKE-014 with temporary manifests and redacted public reports.

Pre-live readiness:

```text
npm run check:recall-prelive
```

Result: passed.

Current local live-gate status:

```text
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Result:

- `status: needs_manifest_fix`;
- manifest file is under the ignored private path;
- manifest file is untracked;
- manifest mode is `600`;
- manifest still contains placeholders;
- no live Recall API call was made.

## Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| API-key handling approval | Blocked | User must approve temporary shell env or ignored local env handling before any live API call. |
| Controlled sample manifest values | Blocked | Fill real private sample values only after approval. |
| Live SPIKE-013/SPIKE-014 | Blocked | Run only after manifest validation, API-key handling approval, and explicit live confirmation. |
| Production dry-run/apply/deploy/scheduler | Blocked | Require live spike evidence and later explicit approvals. |
