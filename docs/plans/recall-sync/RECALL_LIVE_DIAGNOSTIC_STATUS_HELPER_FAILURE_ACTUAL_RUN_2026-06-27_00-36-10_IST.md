# Recall Live Diagnostic Status-Helper Failure Actual Run

Created: 2026-06-27 00:36 IST
Owner: Codex
Workstream: Recall -> AI Brain daily snapshot import
Status: Real read-only Recall API proof passed; no write/deploy/scheduler action was performed

## Purpose

This run proves the specific issue named in the active goal:

> the live call still did not run because the local private gates stopped first

After the wrapper fix, Codex intentionally made the local first-apply status helper fail before the probe, then ran the env-file-disabled read-only diagnostic using a terminal-only credential loaded from the ignored private Recall env file.

The result: the live read-only Recall `/cards` call ran successfully anyway, while all first-write gates stayed blocked.

## Commands Executed

Two read-only diagnostics were run:

1. Env-file-disabled live diagnostic without an injected status-helper failure.
2. Env-file-disabled live diagnostic with a private temporary status-helper failure injector.

The second command is the authoritative regression proof. It wrote:

```text
data/private/recall-live-spikes/live-diagnostic-status-helper-failed-bypass-20260626T190534Z.json
```

The temporary private injector was removed after the run:

```text
data/private/recall-live-spikes/status-helper-failer.cjs removed
```

## Authoritative Result

Private report checker:

```bash
npm run -s check:recall-live-diagnostic-report -- --report data/private/recall-live-spikes/live-diagnostic-status-helper-failed-bypass-20260626T190534Z.json --max-age-minutes 30
```

Verdict:

```text
PASS_RECALL_LIVE_DIAGNOSTIC_REPORT
```

Sanitized summary:

| Field | Value |
| --- | --- |
| Report path | `data/private/recall-live-spikes/live-diagnostic-status-helper-failed-bypass-20260626T190534Z.json` |
| Report mode | `600` |
| Report size | `6105` bytes |
| Status before probe | `local_private_gate_status_failed` |
| Failed check | `status_helper_execution` |
| Status-helper bypass flag | `failureBypassedForReadOnlyProbe: true` |
| Probe endpoint | `/cards` |
| Probe method | `GET` |
| HTTP status | `200` |
| Authenticated | `true` |
| Reachable | `true` |
| Total count | `0` |
| Result count | `0` |
| Proof refresh allowed now | `false` |
| Apply allowed now | `false` |
| Proof refresh allowed by probe | `false` |
| Apply allowed by probe | `false` |

## Safety Evidence

- The actual Recall API key was not printed.
- No bearer token was printed.
- No private Recall card ID, title, source URL, chunk, raw response body, or AI Brain row was printed.
- The probe used `--probe-no-env-file` and a named process environment variable for the live request.
- The private output report passed the live diagnostic checker.
- A targeted secret-shape scan of the private report and first non-injected report returned no findings.
- The temporary injector file was removed after the proof run.

## Failed Attempt and Recovery

One first attempt at injecting the status-helper failure failed before running the wrapper because `NODE_OPTIONS --require` was given an absolute workspace path containing a space. Node split that value at `Other computers` and could not preload the file.

Recovery:

- reran the command with a relative private path: `--require ./data/private/recall-live-spikes/status-helper-failer.cjs`;
- the status-helper child failed as intended;
- the read-only live `/cards` probe still ran and returned HTTP `200`.

## What This Does Not Authorize

This proof does not authorize:

- key-rotation evidence;
- proof refresh;
- first capped apply;
- second manual verification apply;
- production deploy;
- scheduler enablement;
- checkpoint movement.

The next production write gate remains explicit approval for the second manual verification run.
