# Feature A8 PRD V1: Public Shell Privacy And Evidence Hygiene

Created: 2026-06-16 13:28:00 IST
Owner: Main Codex execution agent
Status: Draft for adversarial review

## Problem

The A7 release-review sidecar found a real P1: public unauthenticated routes can render the global shell with the private Needs Upgrade count. It also found evidence-hygiene issues: stale packaged Android offline assets and an A5 seed script that prints secret-bearing test manifests.

## Goals

- Prevent unauthenticated/public routes from exposing private library-derived shell counts.
- Add focused test coverage for the private-count gating rule.
- Make the A5 seed script print only redacted output while preserving temp-file support for the browser harness.
- Refresh packaged Android public assets if possible so `android/app/src/main/assets/public/offline.html` matches `public/offline.html`.
- Update A7 reports and trackers so the late sidecar findings are captured.

## Non-Goals

- Do not deploy to production.
- Do not publish an APK.
- Do not claim Android runtime validation.
- Do not broaden auth behavior beyond hiding private shell-derived counts without a valid session.

## Acceptance Criteria

- Public unauthenticated layout state resolves `needsUpgradeCount` to `0`.
- Authenticated layout state may resolve the real Needs Upgrade count.
- A focused unit test covers both cases without relying on full Next layout mocking.
- A5 seed stdout does not include raw PIN, session token, or pairing codes.
- Secret-bearing A5 manifest files are allowed only under `/tmp` and are written with owner-only permissions.
- A7 code review and release packet identify the late sidecar findings and the A8 fixes.
