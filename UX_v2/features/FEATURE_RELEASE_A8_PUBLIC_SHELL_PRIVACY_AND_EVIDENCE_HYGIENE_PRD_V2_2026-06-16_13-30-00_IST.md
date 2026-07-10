# Feature A8 PRD V2: Public Shell Privacy And Evidence Hygiene

Created: 2026-06-16 13:30:00 IST
Owner: Main Codex execution agent
Status: Revised product source after adversarial review

## Problem

A7 sidecar review found that public unauthenticated routes can expose a private Needs Upgrade count through the global shell. The same review also found evidence-hygiene risks in the A5 seed script and stale packaged Android public assets. These findings block production release until fixed or explicitly documented as remaining blockers.

## Goals

- Gate private shell-derived counts with signed-session validation via `verifySessionToken`, not cookie presence alone.
- Add focused regression coverage proving unauthenticated shell counts resolve to zero and authenticated counts can be exposed.
- Redact A5 seed stdout for `auth.pin`, `auth.sessionToken`, and `pairingCodes.*.code`.
- Restrict secret-bearing A5 manifest files to `/tmp` and owner-only permissions.
- Refresh packaged Android public assets if `cap sync` is available, while clearly stating this is source hygiene only and not Android runtime proof.
- Update A7/A8 reports and trackers with the late sidecar findings and fixes.

## Non-Goals

- Do not deploy to production.
- Do not publish or promote an APK.
- Do not claim Android runtime validation from source asset refresh alone.
- Do not change route auth policy beyond hiding private shell-derived counts without a signed session.

## Acceptance Criteria

- The global shell does not read/render the private Needs Upgrade count unless `verifySessionToken` accepts the session cookie.
- Unit tests cover signed-session true/false count behavior.
- A5 seed stdout redacts `auth.pin`, `auth.sessionToken`, and `pairingCodes.*.code`.
- Secret-bearing A5 manifest writes outside `/tmp` fail closed.
- `git diff --check`, typecheck, lint, tests, and build pass after fixes.
- A7 release status remains blocked/local-only until Android runtime, deploy, and release gates are completed.
