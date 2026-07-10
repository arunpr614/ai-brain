# Recall Second Manual Apply Report Capture

## Purpose

This report records the no-live implementation that closes the post-apply evidence handoff gap for the second manual Recall -> AI Brain production verification run.

After an approved second manual production apply succeeds remotely, the local completion-status checker needs a reviewed local private copy of the remote `scheduled-apply-*.json` report. Without that local private report, the second clean manual run could succeed on production while local scheduler-readiness evidence still counted only the first capped apply.

## Change

Updated `scripts/run-recall-second-manual-production-apply.mjs` so that, after exact approval and a successful remote apply:

1. It parses the remote wrapper stdout for `apply_report=data/private/recall-live-spikes/scheduled-apply-<timestamp>.json`.
2. It requires the expected private scheduled apply report path shape.
3. It copies that report from production into the local private Recall evidence directory.
4. It writes the local copy with owner-only mode `0600`.
5. It runs `scripts/check-recall-apply-report.mjs` against the copied local report.
6. It includes `secondManualApplyReport` in the runner JSON with the remote report path, local private report path, local review verdict, and next-use note.

The default local copy directory is:

```text
data/private/recall-live-spikes
```

The smoke path can pass `--local-report-dir` under the ignored private root for isolated test cleanup.

## Safety Properties

| Property | Status |
| --- | --- |
| No approval, no apply | Preserved |
| First capped approval treated as stale | Preserved |
| Wrong env approval rejected | Preserved |
| Local private gates skipped before production preflight | Preserved |
| Remote preflight still required before apply | Preserved |
| Remote report copy only after successful approved remote apply | Added |
| Local post-apply review of copied report | Added |
| Scheduler not enabled by this runner | Preserved |

## Verification

Passed on 2026-06-27 06:33 IST:

```bash
node --check scripts/run-recall-second-manual-production-apply.mjs scripts/smoke-recall-second-manual-production-apply.mjs
npm run -s smoke:recall-second-manual-production-apply
```

The smoke now proves:

- the runner refuses without exact approval;
- stale first-apply approval does not authorize the second manual gate;
- second-manual approval in the wrong env var is rejected;
- command env is built from deployed remote proof by default;
- broad local readiness/proof gates are skipped by default;
- remote runtime preflight runs before apply delegation;
- stale remote key evidence and missing remote helpers fail before apply;
- the fake approved path reaches the remote wrapper only after exact approval;
- the approved path copies the remote apply report into a local private evidence directory;
- the copied report passes the local `PASS_POST_APPLY_REVIEW_GATE`;
- output does not print secret-shaped values.

## Operator Impact

After the future approved second manual production run, the runner output should include:

```json
"secondManualApplyReport": {
  "remoteApplyReportPath": "data/private/recall-live-spikes/scheduled-apply-...",
  "localApplyReportPath": "data/private/recall-live-spikes/scheduled-apply-...",
  "localReview": {
    "ok": true,
    "verdict": "PASS_POST_APPLY_REVIEW_GATE"
  }
}
```

That local private report is the file `npm run -s recall:daily-sync:completion-status` can count as the second clean manual run before scheduler enablement approval.

## Safety Notes

- This implementation work made no Recall API call.
- This implementation work wrote no AI Brain rows.
- This implementation work did not run production apply.
- This implementation work did not enable the scheduler.
- This implementation work did not move a checkpoint.
- This public report contains no Recall API key, bearer token, private card ID, title, source URL, raw response body, chunk, apply payload, or database row.
