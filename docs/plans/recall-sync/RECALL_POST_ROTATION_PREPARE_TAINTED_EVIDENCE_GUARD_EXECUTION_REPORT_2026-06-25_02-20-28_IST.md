# Recall Post-Rotation Prepare Tainted Evidence Guard Execution Report

Created: 2026-06-25 02:20 IST
Owner: Codex
Status: Done for offline scope; no live Recall API call was made in this change

No live Recall API call was made in this change.

## Purpose

Prove the post-rotation prepare wrapper refuses a tainted private key-rotation evidence file instead of overwriting it.

The key-evidence gate now rejects private evidence JSON with secret-shaped content. The prepare wrapper can record private evidence for recordable blockers, but it must not bypass or overwrite evidence that failed for a non-recordable hygiene rule such as `key_rotation_evidence_contains_sk_secret`.

## Files Changed

| File | Change |
|---|---|
| `scripts/smoke-recall-first-apply-prepare-after-rotation.mjs` | Adds a tainted private evidence fixture and asserts the prepare wrapper fails with `non_recordable_key_evidence_failure`, includes `key_rotation_evidence_contains_sk_secret`, does not echo the fake secret-shaped value, and does not overwrite the tainted file. |

## Behavior Proven

When private key-rotation evidence contains secret-shaped content:

- the first-apply status path reports the secret-shape key-evidence rule;
- `scripts/prepare-recall-first-apply-after-rotation.mjs` classifies that rule as non-recordable;
- the wrapper exits before invoking the evidence recorder;
- the tainted evidence file remains untouched for inspection/removal;
- stderr contains the generic rule name only and does not print the secret-shaped value;
- no proof refresh, first capped apply, deploy, scheduler enablement, or checkpoint advancement happens.

## Validation

```text
node --check scripts/smoke-recall-first-apply-prepare-after-rotation.mjs
node --check scripts/prepare-recall-first-apply-after-rotation.mjs
node --check scripts/check-recall-key-rotation-evidence.mjs
npm run smoke:recall-first-apply-prepare-after-rotation
npm run smoke:recall-key-rotation-evidence
npm run smoke:recall-key-rotation-evidence-record
```

The prepare smoke now includes:

- missing acknowledgement fails before private evidence creation;
- missing prepare confirmation fails before private evidence creation;
- tainted private evidence fails as non-recordable without being overwritten;
- stale env mtime plus exact acknowledgement records private evidence via read-only auth probe;
- fresh private evidence can make first-apply status ready when proof is fresh;
- stale proof is refreshed through the existing no-write ready-or-refresh wrapper;
- output does not print key material;
- temporary private files are cleaned up.

## Current Real Gate State

`npm run recall:first-apply:status` still reports `blocked_key_rotation_evidence`.

This change does not rotate the Recall API key, record real private evidence, refresh proof, run first capped apply, deploy, enable the scheduler, stage, commit, push, create a pull request, or advance a checkpoint.
