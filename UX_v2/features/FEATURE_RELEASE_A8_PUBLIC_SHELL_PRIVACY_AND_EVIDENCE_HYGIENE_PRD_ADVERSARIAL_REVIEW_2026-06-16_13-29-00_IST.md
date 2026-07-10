# Adversarial Review: A8 Public Shell Privacy PRD V1

Created: 2026-06-16 13:29:00 IST
Reviewer: Main Codex using adversarial-review rubric
Verdict: No-go until revised

## Findings

| Severity | Finding | Evidence | Required Revision |
| --- | --- | --- | --- |
| P1 | PRD says “valid session” but does not require signed-session verification. | Proxy is a presence check; a fake cookie could still reach public routes. | Require the shell count gate to use `verifySessionToken`, not cookie presence alone. |
| P1 | PRD does not require regression evidence on a public route. | The leak manifests on `/unlock`, `/setup`, `/setup-apk`, and `/capture/share-result`. | Require a focused browser or unit-level proof that public unauthenticated shell count is zero. |
| P2 | Packaged Android asset refresh could be mistaken for runtime proof. | `cap sync` can update assets but does not prove installed APK behavior. | State that asset refresh is source hygiene only and Android runtime remains blocked. |
| P2 | Redaction requirements lack explicit fields. | A5 manifest includes PIN, session token, and pairing codes. | Require those exact fields to redact in stdout and non-secret reports. |

## Required V2 Changes

- Require `verifySessionToken` or equivalent signed-session validation.
- Require focused regression test/proof for public unauthenticated shell count.
- Mark Android asset refresh as source hygiene only.
- Name exact redacted A5 fields.
