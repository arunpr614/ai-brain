# Recall Second Manual Wrapper Internal Readiness Gate - 2026-06-27 02:24 IST

## Purpose

Close the remaining gap between the no-live readiness command and the approved second manual verification wrapper.

Before this change, operators were instructed to run `npm run recall:second-manual:readiness` before approval, but `scripts/recall-second-manual-verification-apply.sh` did not rerun that gate itself. If state changed between readiness review and the live wrapper invocation, the deeper scheduled apply path would discover the problem later.

## Implementation

- `scripts/recall-second-manual-verification-apply.sh` now reruns:

```bash
node -- scripts/check-recall-second-manual-verification-readiness.mjs
```

before setting manual verification mode or delegating to `scripts/recall-scheduled-apply.sh`.

- If readiness fails, the wrapper stops with:

```text
[recall-manual-verification-apply] second manual readiness gate failed; run npm run recall:second-manual:readiness for details
```

- `scripts/smoke-recall-manual-verification-apply.mjs` now stubs the no-live readiness checker in its scratch workspace and proves:
  - the wrapper calls readiness for approved attempts;
  - readiness failure stops before scheduled-apply delegation;
  - successful readiness still delegates only after exact approval, sync enablement, and live confirmation.

- `scripts/check-recall-scheduler-artifacts.mjs` now statically requires the wrapper readiness call and the smoke coverage string.

- `docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` now documents that the wrapper reruns readiness internally.

## Verification

Passed:

- `bash -n scripts/recall-second-manual-verification-apply.sh`
- `node --check scripts/smoke-recall-manual-verification-apply.mjs`
- `npm run -s smoke:recall-manual-verification-apply`
- `npm run -s recall:second-manual:readiness`

## Current State

- Machine readiness for the second manual verification run remains satisfied.
- Live write permission is still not granted by readiness.
- The active production gate remains `second_manual_verification_run`.
- The second manual verification run still requires exact Arun approval from the approval packet before any live write.

## Safety Notes

- No Recall API call was made for this change.
- No import, database write, production deploy, scheduler enablement, or checkpoint movement happened.
- No private Recall card IDs, titles, source URLs, chunks, raw content, API keys, bearer tokens, cookies, or private payloads are included in this report.
