# Recall First Apply Status Live Diagnostic Split Execution Report

Created: 2026-06-25 01:53 IST
Owner: Codex
Status: Done for offline scope; first write remains blocked by key-rotation evidence
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Make the first-apply status helper explicitly separate two different questions:

1. Can a read-only Recall live connectivity diagnostic be run?
2. Can first-write proof refresh or apply proceed?

This prevents the earlier confusion where "the live call did not run" could mean either a Recall network/auth diagnostic or the first-write proof-refresh/apply lane. The status helper now exposes the optional no-write live auth probe when local live gates are ready, while still keeping first-write proof refresh and apply blocked until key-rotation evidence passes.

This report contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, database rows, dry-run payload, apply payload, or backup payload.

## Change Summary

| Area | File | Change |
|---|---|---|
| Status helper | `scripts/check-recall-first-apply-status.mjs` | Added a `diagnostics` section with `liveReadConnectivity` and `firstWriteSafety`. When live gate status is ready, it shows the optional command `npm run recall:live-auth-probe -- --env-file ... --confirm-live-api` and says this does not satisfy key-rotation evidence, proof freshness, write approval, apply, deploy, scheduler, or checkpoint gates. |
| Status smoke | `scripts/smoke-recall-first-apply-status.mjs` | Added a regression case where live gate status is ready but key evidence is stale. The expected status remains `blocked_key_rotation_evidence`, the optional live auth probe appears only as a diagnostic, and first-write work remains blocked. |

## Validation

Focused validation passed:

```text
node --check scripts/check-recall-first-apply-status.mjs
node --check scripts/smoke-recall-first-apply-status.mjs
npm run smoke:recall-first-apply-status
npm run recall:first-apply:status
```

The real status command still returns `blocked_key_rotation_evidence`. It now includes:

```text
diagnostics.liveReadConnectivity.optionalNoWriteCommand:
npm run recall:live-auth-probe -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api

diagnostics.firstWriteSafety.blockedBeforeProofRefreshOrApply: true
diagnostics.firstWriteSafety.proofRefreshAllowedNow: false
diagnostics.firstWriteSafety.applyAllowedNow: false
```

## Current Real State

The private env file remains ignored, untracked, owner-only, and under `data/private/recall-live-spikes/`, but its mtime is still older than the key-rotation checkpoint and `data/private/recall-live-spikes/key-rotation-evidence.json` is absent. Dry-run and backup proof are stale behind that gate.

No live Recall API call was made by this change. No production dry-run, proof refresh, apply, deploy, scheduler enablement, staging, commit, push, pull request, or checkpoint advancement was performed.
