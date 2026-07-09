# Recall Live Diagnostic Local Status Failure Release Gate Hardening

Created: 2026-06-27 00:31 IST
Owner: Codex
Workstream: Recall -> AI Brain daily snapshot import
Status: Implemented and verified; no real Recall API call was made

## Purpose

The prior fix made the read-only live diagnostic continue past a local first-apply status-helper failure only when the probe is explicitly confirmed, env-file loading is disabled, and a terminal-only credential is present.

This follow-up makes that regression mandatory in release readiness so the bug does not return silently.

## Changes

Updated `scripts/check-recall-prelive-readiness.mjs`:

- adds `first_apply_live_diagnostic_smoke`;
- adds `first_apply_live_diagnostic_prompt_guard_smoke`;
- requires both before pre-live can pass.

Updated `scripts/deploy.sh`:

- runs `npm run smoke:recall-first-apply-live-diagnostic` in local release gates;
- runs `npm run smoke:recall-first-apply-live-diagnostic-prompt-guard` in local release gates.

Updated `scripts/check-recall-scheduler-artifacts.mjs`:

- requires the package scripts for both smokes;
- requires deploy and pre-live wiring for both smokes;
- statically asserts that `scripts/smoke-recall-first-apply-live-diagnostic.mjs` covers the local status-helper failure case;
- statically asserts that the smoke checks `failureBypassedForReadOnlyProbe`.

## Verification

Passed:

```bash
node --check scripts/check-recall-prelive-readiness.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
bash -n scripts/deploy.sh
npm run -s check:recall-scheduler
npm run -s smoke:recall-first-apply-live-diagnostic
npm run -s smoke:recall-first-apply-live-diagnostic-prompt-guard
npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run -s check:recall-public-docs-privacy
npm run -s check:recall-approval-packet
npm run -s recall:daily-sync:completion-status
```

The full pre-live result now includes:

- `first_apply_live_diagnostic_smoke: passed`
- `first_apply_live_diagnostic_prompt_guard_smoke: passed`

## Safety Notes

- No real Recall API call was made.
- No Recall API key was printed or written.
- No proof refresh, apply, deploy, scheduler enablement, or checkpoint movement occurred.
- Scheduler enablement remains blocked pending the second manual clean run and exact scheduler approval.

## Next Gate

The next production milestone is unchanged:

1. Obtain explicit approval for the second manual production verification run.
2. Run the manual verification wrapper.
3. Validate the private apply report.
4. Proceed to scheduler approval only after repeated clean-run evidence exists.
