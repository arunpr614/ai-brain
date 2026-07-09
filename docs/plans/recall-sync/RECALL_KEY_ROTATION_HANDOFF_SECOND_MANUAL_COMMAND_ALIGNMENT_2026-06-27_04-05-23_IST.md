# Recall Key Rotation Handoff Second Manual Command Alignment - 2026-06-27 04:05 IST

## Purpose

Align the older key-rotation handoff with the current post-first-apply gate.

After the first capped apply completed, `npm run recall:key-rotation:handoff` correctly shifted to the second manual verification approval gate, but its completed-phase checklist did not yet include the new no-live production command handoff.

## Change

Updated `scripts/print-recall-key-rotation-handoff.mjs` so completed first-apply output now includes:

- `commands.secondManualProductionCommand`
- checklist item `print_second_manual_production_command`
- the command in Markdown output:

```bash
npm run recall:second-manual:production-command
```

This keeps key-rotation handoff, completion status, pre-live, and the second manual approval packet aligned on the same operator sequence:

1. `npm run recall:second-manual:readiness`
2. `npm run recall:second-manual:production-command`
3. exact Arun approval
4. `npm run recall:second-manual:production-apply`

## Safety

- This is no-live/no-write guidance only.
- No Recall API call, import, database write, scheduler enablement, deploy, or checkpoint movement happened.
- The production command handoff still prints a command; it is not approval and does not execute the live apply.

## Verification

Passed:

- `npm run -s smoke:recall-key-rotation-handoff`
- `npm run -s recall:key-rotation:handoff -- --json` - completed first-apply phase now includes `commands.secondManualProductionCommand: npm run recall:second-manual:production-command`.
- `npm run -s check:recall-scheduler`
- `npm run -s check:recall-public-docs-privacy` - scanned 88 curated public Recall docs.

## Current Gate

The active production gate remains:

- `currentBlockingGate`: `second_manual_verification_run`
- owner: Arun
- next live command only after exact approval: `npm run recall:second-manual:production-apply`
