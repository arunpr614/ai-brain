# Recall Live Gate Status Summary Command Execution Report

Created: 2026-06-24 13:26 IST
Status: Done for offline scope; live execution still requires approval and real controlled samples
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Added a no-secret live gate status command for the Recall daily sync workstream.

The pre-live gate already proves offline readiness, but operators still needed a quick way to answer: "What exactly blocks the live Recall spike right now?" The new command reports the current state using only booleans, counts, statuses, and next commands. It does not call Recall and does not print API keys, private titles, private source URLs, chunks, or raw payloads.

No live Recall API call was made. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Live gate status | `scripts/check-recall-live-gate-status.mjs` | Summarizes private-ignore, manifest, credential-presence, and next command state without secrets. |
| Live gate status smoke | `scripts/smoke-recall-live-gate-status.mjs` | Covers missing manifest, valid manifest, public report exposure rejection, API-key presence boolean, no key-value leak, and temp cleanup. |
| Package scripts | `package.json` | Added `npm run recall:live-gate:status` and `npm run smoke:recall-live-gate-status`. |
| Pre-live readiness | `scripts/check-recall-prelive-readiness.mjs` | Adds `live_gate_status_smoke` to the required offline readiness gate. |
| Private env template initializer | `scripts/init-recall-env.mjs` | Later update: missing-credential next steps now point to `npm run recall:env:init` for the ignored local-env option. |
| Operating packet | `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` | Documents the no-secret status command. |
| Completion audit | `docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md` | Adds the status command to the next-gate sequence. |

## Command

```text
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Default manifest path:

```text
data/private/recall-live-spikes/controlled-samples.json
```

Possible statuses:

| Status | Meaning |
|---|---|
| `blocked_private_ignore` | Private evidence ignore guard failed. |
| `needs_manifest_template` | Private controlled sample manifest is missing. |
| `needs_manifest_fix` | Manifest exists but validator findings remain. |
| `needs_api_key_approval` | Manifest is valid, but no local `RECALL_API_KEY` is present and no local env file was detected. |
| `needs_env_source_or_approval` | Ignored local `recall.env` exists, but current shell has not sourced `RECALL_API_KEY`. |
| `needs_live_api_confirmation` | Manifest is valid and API-key presence is detected, but explicit live API confirmation is not set. |
| `ready_for_approved_live_spikes` | Manifest is valid, the current shell has an API-key value present, and explicit live API confirmation is set; live spikes still require human approval. |

## Safety Behavior

- Calls only local checks.
- Does not call the Recall API.
- Prints only API-key presence boolean, never the value.
- Prints manifest counts and required labels, not private titles or source URLs.
- Reduces validator findings to field paths and messages.
- Reports whether `recall.env` exists, is ignored, and is tracked; does not print its contents.

## Validation Evidence

Automated smoke:

```text
npm run smoke:recall-live-gate-status
```

Result: passed.

- missing manifest reports `needs_manifest_template`;
- valid temp manifest reports six samples;
- manifest requesting public title/source URL exposure reports `needs_manifest_fix`;
- absent API key reports `needs_api_key_approval`;
- absent API key with no env file suggests the empty-key `npm run recall:env:init` setup path;
- env key presence without explicit confirmation reports `needs_live_api_confirmation`;
- env key presence with explicit confirmation reports `ready_for_approved_live_spikes`;
- API-key value is not printed;
- temporary manifest is cleaned up.

Current local status:

```text
npm run recall:live-gate:status
```

Result: passed and reported:

- `status: needs_manifest_template`;
- `manifest.exists: false`;
- `credential.recallApiKeyEnvPresent: false`;
- next command: `npm run recall:controlled-samples:init`.

Pre-live readiness:

```text
npm run check:recall-prelive
```

Result: passed and includes `live_gate_status_smoke: passed`.

Quality gates:

```text
npm run lint
npm run typecheck
```

Result: both passed.

Smoke cleanup check:

```text
find data/private/recall-live-spikes -maxdepth 1 \( -name '*status-smoke*.json' -o -name 'controlled-samples-init-smoke-*.json' \) -print
```

Result: no files printed.

## Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| User-approved Recall API-key handling | Blocked | Status command can detect presence, but approval is still a human gate. |
| Private controlled sample manifest populated with real Recall card IDs | Blocked | Status command will report missing/invalid/valid manifest state. |
| Live SPIKE-013/SPIKE-014 execution | Blocked | Run only after manifest validation and API-key approval. |
