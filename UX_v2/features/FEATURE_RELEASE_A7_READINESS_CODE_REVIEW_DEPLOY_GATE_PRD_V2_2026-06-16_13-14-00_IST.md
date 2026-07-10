# Feature A7 PRD V2: Release Readiness, Code Review, And Deploy Gate

Created: 2026-06-16 13:14:00 IST
Owner: Main Codex execution agent
Status: Revised product source after adversarial review

## Problem

UX v2 has local implementation and QA evidence across web and Android-responsive milestones, but production release is not safe until the project has one consolidated release decision. The decision must account for the dirty worktree, local browser evidence, Android runtime gaps, backup/rollback requirements, live smoke, observability, and secret redaction.

## Release Status Model

The final packet must use one of these exact statuses:

- `go_for_production`: all required deploy, backup, rollback, live-smoke, observability, code-review, and Android evidence gates are green.
- `no_go_release_blocked`: one or more required release gates are missing or failed.
- `local_candidate_only`: local implementation/QA is green, but production release is blocked by operational or runtime evidence.

## Goals

- Produce a code-review report for release-critical UX v2 changed surfaces.
- Produce a release-readiness packet with exact gate status and a final status from the model above.
- Separate A7-intentional files from broad pre-existing/user/agent dirty-worktree changes.
- Preserve browser-vs-Android evidence labels; browser screenshots must not count as APK/runtime proof.
- Integrate PM/review sidecar findings if available, or explicitly mark them pending.
- Check generated A7/A6 release artifacts for obvious token/cookie/PIN/pairing-code leakage.

## Code Review Scope

Focus on release-critical changed surfaces:

- `src/app/**` UX v2 routes and API contracts touched by the revamp.
- `src/components/**` shared shell, Ask, capture, library, settings, and message components.
- `src/lib/client/**`, `public/offline.html`, and `public/sw.js`.
- Android release contracts: `capacitor.config.ts`, `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`.
- UX v2 scripts and evidence generation under `scripts/ux-v2-*`.

Residual risk from the broader dirty worktree must be documented.

## Deploy Gate Requirements

Production deploy is allowed only if all rows are green:

- Static gates: whitespace, typecheck, lint, tests, build, environment checks, build artifact checks.
- Code review: no unresolved P0/P1.
- Backup: production SQLite backup path, integrity `ok`, item-count sanity, size recorded.
- Rollback: exact restore command, service stop/start/status, smoke path, owner.
- Live smoke: public and authenticated routes, public assets, provider/export/pairing where applicable.
- Observability: service status/restarts, server logs, browser console/network, API status.
- Android: deployed WebView asset pickup, authenticated changed routes, native share, pairing persistence, offline/stale-cache recovery, or explicit no-Android-complete release claim.
- Secret hygiene: no raw token/cookie/PIN/pairing-code values in markdown or JSON reports.

## Non-Goals

- Do not deploy to production if status is `no_go_release_blocked` or `local_candidate_only`.
- Do not publish or overwrite an APK.
- Do not run destructive production mutation smoke.
- Do not fix app behavior inside A7 unless a tiny documentation/script correction is required for the release packet itself.
- Do not append `RUNNING_LOG.md` without explicit approval.

## Required Outputs

- `UX_v2/execution/UX_V2_A7_CODE_REVIEW_2026-06-16_13-18-00_IST.md`
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_13-18-00_IST.md`

## Acceptance Criteria

- Final packet uses one exact release status.
- Release blockers are explicit and actionable.
- Code review findings lead the review report and include file references when possible.
- Sidecar PM/review findings are integrated or marked pending.
- A7 makes no production deployment claim unless deploy evidence exists.
- A7 reports the current best release truth even if that truth is `local_candidate_only` or `no_go_release_blocked`.
