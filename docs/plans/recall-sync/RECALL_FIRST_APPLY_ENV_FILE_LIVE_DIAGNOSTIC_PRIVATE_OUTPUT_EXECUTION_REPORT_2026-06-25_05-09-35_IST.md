# Recall First-Apply Env-File Live Diagnostic Private Output Execution Report

Status: Done for offline scope; real first-write remains blocked by key-rotation evidence
Date: 2026-06-25 05:09 IST
Owner: AI agent (Codex)
Scope: Recall daily sync / first-apply live-read diagnostic evidence

## Summary

The status-preserving env-file live diagnostic wrapper now supports a durable private diagnostic output file. This closes the remaining operator gap after the real env-file live call passed: the live read can be retained as sanitized owner-only JSON without turning the read-only diagnostic into key-rotation evidence, proof refresh, apply, deploy, scheduler enablement, or checkpoint advancement.

The earlier actual env-file live run remains valid evidence that the live call can run. It did not create `data/private/recall-live-spikes/live-diagnostic-report.json` because that run happened before this wrapper supported env-file `--output-file`.

## Change

| Area | Behavior |
|---|---|
| Env-file diagnostic wrapper | `scripts/run-recall-first-apply-live-diagnostic.mjs` accepts `--output-file data/private/recall-live-spikes/live-diagnostic-report.json`. |
| Private path guard | Output paths outside `data/private/recall-live-spikes/` fail as `output_file_not_private` before any read-only probe. |
| Private file mode | Successful output writes sanitized JSON with owner-only mode `0600`. |
| Output metadata | Successful JSON includes `diagnosticOutputFile.path`, `diagnosticOutputFile.written`, `diagnosticOutputFile.mode`, and `diagnosticOutputFile.privateRoot`. |
| Status discoverability | `npm run recall:first-apply:status` now advertises the env-file wrapper as `optionalNoWriteWrapperCommand` with `--output-file data/private/recall-live-spikes/live-diagnostic-report.json`, `optionalNoWriteWrapperOutputFile`, and `optionalDiagnosticCommands[2].outputFileMode: 0600`. |

## Current Status Output

The real no-write status command still reports first-write blockers:

```text
status: blocked_key_rotation_evidence
failedChecks: key_rotation_evidence, dry_run_report_proof, backup_proof
proofRefreshAllowedNow: false
applyAllowedNow: false
```

It now exposes the durable env-file read-only diagnostic command:

```bash
npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json
```

The status output still keeps the prompt wrapper as the preferred command when the persisted env file is stale or intentionally not trusted:

```bash
npm run recall:first-apply:live-diagnostic:prompt -- --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json
```

## Safety Properties

- The env-file wrapper still runs the no-write first-apply status helper before the probe.
- The env-file wrapper still runs exactly one read-only Recall `/cards` auth probe.
- The env-file wrapper still prints only status and count metadata.
- The env-file wrapper still does not create or refresh dry-run proof or backup proof.
- The env-file wrapper still does not read or write the AI Brain database.
- The env-file wrapper still does not apply, deploy, enable the scheduler, or advance a checkpoint.
- The private output file is diagnostic evidence only and does not satisfy key-rotation evidence, proof freshness, write approval, apply, deploy, scheduler, or checkpoint gates.
- No Recall API key, bearer token, env contents, private Recall card IDs, private titles, private source URLs, chunks, raw response bodies, dry-run payloads, apply payloads, backup payloads, or database rows are written to the public report.

## Validation

Passed:

```text
node --check scripts/run-recall-first-apply-live-diagnostic.mjs
node --check scripts/check-recall-first-apply-status.mjs
node --check scripts/smoke-recall-first-apply-status.mjs
node --check scripts/smoke-recall-first-apply-live-diagnostic.mjs
npm run smoke:recall-first-apply-status
npm run smoke:recall-first-apply-live-diagnostic
npm run recall:first-apply:status
```

`npm run smoke:recall-first-apply-live-diagnostic` now proves the env-file wrapper rejects non-private output files before probing and can write owner-only sanitized private output. `npm run smoke:recall-first-apply-status` now proves the status helper exposes the env-file wrapper with private output while keeping the prompt command preferred and keeping first-write work blocked.

## Current Real State

No real Recall API call was made during this follow-up change. The current real status remains `blocked_key_rotation_evidence` because `data/private/recall-live-spikes/key-rotation-evidence.json` is absent and the private env-file evidence still predates the required rotation checkpoint. Dry-run and backup proof are stale behind that blocker.

## Next Gate

For read-only connectivity evidence with the ignored private env file, use the env-file command above. For first-write progress, rotate the Recall API key outside chat, store the rotated key only in the ignored private Recall env file, then run the post-rotation prepare wrapper with the exact acknowledgement before any proof refresh or apply.
