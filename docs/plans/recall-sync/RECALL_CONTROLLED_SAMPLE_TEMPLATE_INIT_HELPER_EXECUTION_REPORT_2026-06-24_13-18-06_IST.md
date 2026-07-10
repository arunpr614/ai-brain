# Recall Controlled Sample Template Init Helper Execution Report

Created: 2026-06-24 13:18 IST
Status: Done for offline scope; no persistent private manifest created by this report
Owner: Codex
Related workstream: Recall -> AI Brain daily snapshot import

## Summary

Added a safe initializer command for the private Recall controlled sample manifest.

Before this change, the operator had to copy JSON from `node scripts/check-recall-controlled-samples.mjs --template` into the ignored private path manually. The new helper reduces the chance of writing private Recall sample metadata into a tracked location. It writes only under `data/private/recall-live-spikes/`, refuses other paths, and runs the private ignore guard before creating the template.

No live Recall API call was made. No production dry-run, apply, deployment, or scheduler enablement was performed.

## Implemented

| Area | Artifact | Result |
|---|---|---|
| Manifest initializer | `scripts/init-recall-controlled-samples.mjs` | Writes the template to the ignored private manifest path after running the private ignore guard. |
| Manifest initializer smoke | `scripts/smoke-recall-controlled-samples-init.mjs` | Automates stdout, unsafe path refusal, traversal refusal, private write, overwrite, permissions, and cleanup checks. |
| Package script | `package.json` | Added `npm run recall:controlled-samples:init`. |
| Validator help | `scripts/check-recall-controlled-samples.mjs` | Points operators to the initializer. |
| Operating packet | `docs/plans/recall-sync/RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` | Adds the initializer command to the controlled manifest section. |
| Completion audit | `docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md` | Adds the initializer to the exact next-gate sequence. |

## Safety Behavior

- Default output: `data/private/recall-live-spikes/controlled-samples.json`.
- Refuses paths outside `data/private/recall-live-spikes/`.
- Runs `scripts/check-recall-private-ignore.mjs` before writing.
- Refuses to overwrite an existing manifest unless `--force` is passed.
- Supports `--stdout` for template inspection without writing.
- Creates the private directory with `0700` mode and manifest file with `0600` mode.

## Validation Evidence

Template stdout:

```text
npm run recall:controlled-samples:init -- --stdout
```

Result: passed; output includes six required samples plus the outside-window negative control.

Unsafe output path refusal:

```text
npm run recall:controlled-samples:init -- --path /tmp/controlled-samples.json
```

Result: exited `2` and refused to write outside `data/private/recall-live-spikes/`.

Path traversal refusal:

```text
npm run recall:controlled-samples:init -- --path data/private/recall-live-spikes/../../controlled-samples.json
```

Result: exited `2` and refused the resolved path outside `data/private/recall-live-spikes/`.

Private-path write smoke:

```text
npm run recall:controlled-samples:init -- --path data/private/recall-live-spikes/controlled-samples-template-smoke.json --force
stat -f '%Lp %N' data/private/recall-live-spikes/controlled-samples-template-smoke.json
```

Result: passed; helper reported `privateIgnoreChecked: true`; file permission was `600`. The temporary smoke file was deleted after verification, leaving no persistent private manifest.

Private ignore guard:

```text
npm run check:recall-private-ignore
```

Result: passed; all checked Recall private evidence paths are ignored and untracked.

Pre-live readiness:

```text
npm run check:recall-prelive
```

Result: passed without manifest and now includes `controlled_samples_init_smoke: passed`; next gate remains private manifest population and live API approval.

Lint:

```text
npm run lint
```

Result: passed.

Typecheck:

```text
npm run typecheck
```

Result: passed.

Automated initializer smoke:

```text
npm run smoke:recall-controlled-samples-init
```

Result: passed; covers stdout template shape, unsafe path refusal, path traversal refusal, private write after ignore check, `0600` private file permission, overwrite refusal, force overwrite, and temp file cleanup.

Smoke cleanup check:

```text
find data/private/recall-live-spikes -maxdepth 1 -name 'controlled-samples-init-smoke-*.json' -print
```

Result: no files printed.

## Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| User-approved Recall API-key handling | Blocked | Still required before live SPIKE-013/SPIKE-014. |
| Private controlled sample manifest populated with real Recall card IDs | Blocked | Helper can create the template, but Arun still needs to fill it with private local values. |
| Live SPIKE-013/SPIKE-014 execution | Blocked | Run only after manifest validation and API-key approval. |
