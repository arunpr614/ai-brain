# Adversarial Review: A8 Public Shell Privacy Implementation Plan V1

Created: 2026-06-16 13:32:00 IST
Reviewer: Main Codex using adversarial-review rubric
Verdict: No-go until revised

## Findings

| Severity | Finding | Evidence | Required Revision |
| --- | --- | --- | --- |
| P1 | Plan does not require checking that public routes still render after layout refactor. | Layout changes can break all routes. | Add focused route/build validation through existing typecheck/build and, if feasible, proxy/public tests. |
| P1 | Plan says run `cap sync` opportunistically but does not define failure handling. | Android tooling is incomplete. | If `cap sync` fails, record as blocker; do not hide stale asset risk. |
| P2 | Plan omits updating the A7 code review finding from pending to completed. | Release-review sidecar finished after A7 initial docs. | Require A7 report update with sidecar findings and A8 disposition. |
| P2 | Plan does not require re-running redaction scan after seed-script change. | A5 script changed secret handling. | Add targeted redaction/behavior validation for A5 seed stdout and temp manifest path guard. |

## Required V2 Changes

- Add full static/build gates after layout changes.
- Define `cap sync` failure handling.
- Update A7 code review/release packet with sidecar completion and A8 disposition.
- Add A5 seed redaction validation.
