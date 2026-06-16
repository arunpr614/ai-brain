# UX v2 A8 Public Shell Privacy And Evidence Hygiene QA

Created: 2026-06-16 13:45:00 IST
Owner: Main Codex execution agent
Status: Complete locally; production release remains `local_candidate_only`

## Scope

A8 remediated release-review sidecar findings that arrived after the initial A7 packet:

- P1: public routes could expose private library state through the global Needs Upgrade sidebar count.
- P2: A5 seed output and manifest handling could expose raw auth material if used carelessly.
- P2: packaged Android offline asset freshness needed source-level proof.

This pass did not perform production deploy, Android device/emulator runtime validation, or APK publication.

## Implemented

| Area | Change | Evidence |
| --- | --- | --- |
| Public shell privacy | Added `resolvePrivateShellCounts()` and gated the Needs Upgrade count behind `verifySessionToken()` before passing it to the sidebar. | `src/lib/shell/private-counts.ts`, `src/app/layout.tsx` |
| Regression coverage | Added unit coverage that unauthenticated or invalid sessions return zero and do not call the private count function; verified valid sessions expose the count. | `src/lib/shell/private-counts.test.ts` |
| A5 seed evidence hygiene | Redacted stdout for `auth.pin`, `auth.sessionToken`, and pairing-code values; full secret manifests are allowed only under `/tmp` and are written with `0600` permissions. | `scripts/ux-v2-seed-android-a5-login-pairing.ts` |
| Android packaged asset freshness | Ran Capacitor sync and confirmed packaged `offline.html` matches `public/offline.html`. | `android/app/src/main/assets/public/offline.html`, `public/offline.html` |
| Release docs | Updated A7 code-review/release-readiness language and project trackers to show sidecar findings integrated and A8 disposition captured. | A7 packet, A8 QA, tracker updates |

## Validation

| Gate | Result | Notes |
| --- | --- | --- |
| Focused public-shell/proxy tests | Passed | `node --import tsx --test src/lib/shell/private-counts.test.ts src/proxy.test.ts`; 21 tests / 5 suites passed. |
| A5 seed redaction check | Passed | Redacted stdout contained no raw seed PIN, session token, or pairing codes; `/tmp` secret manifest retained full values for local QA only. |
| A5 non-`/tmp` manifest guard | Passed | Repo-local manifest path was blocked and no repo-local secret manifest was created. |
| Android offline asset match | Passed | `public/offline.html` and `android/app/src/main/assets/public/offline.html` match after Capacitor sync. |
| `git diff --check` | Passed | No whitespace errors. |
| `npm run typecheck` | Passed | TypeScript clean. |
| `npm run lint` | Passed with existing warning | Existing unrelated warning remains in `src/lib/queue/enrichment-batch-cron.ts`. |
| `npm test` | Passed | 551 tests / 78 suites passed. |
| `npm run build` | Passed with known warning | Production build completed; known `unpdf` warning remains. |

## Release Disposition

The A8 code/privacy blocker is closed locally. Release remains blocked by:

- Android runtime and fresh APK evidence.
- Production backup, rollback proof, deploy, live smoke, and observability.
- Local web accessibility release sweep closed later in A9; Android APK accessibility remains part of runtime proof.
- Live Ask/provider citation proof.
- Final clean release ownership/commit review for the broad dirty worktree.

## Running Log Draft

Do not append without explicit user approval.

```markdown
## Entry #121 - 2026-06-16 13:45 IST - UX v2 A8 privacy and evidence-hygiene remediation completed locally

### Summary

Completed A8 remediation after the release-review sidecar found a P1 public-shell privacy issue and P2 evidence-hygiene risks. Public Needs Upgrade counts are now gated by verified session state, A5 seed output is redacted with `/tmp`-only full manifest writes, and Android packaged offline assets were resynced and matched to source.

### Evidence

- `UX_v2/execution/UX_V2_A8_PUBLIC_SHELL_PRIVACY_AND_EVIDENCE_HYGIENE_QA_2026-06-16_13-45-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_13-45-00_IST.md`
- `UX_v2/execution/UX_V2_A7_CODE_REVIEW_2026-06-16_13-18-00_IST.md`
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`

### Validation

- Focused shell/proxy tests passed: 21 tests / 5 suites.
- Full gates passed: whitespace, typecheck, lint, 551 tests / 78 suites, and build.
- A5 redaction and non-`/tmp` guard checks passed.
- Android offline packaged asset matches source.

### Release state

- Production deploy: not authorized.
- APK publication: not authorized.
- Remaining blockers: Android runtime/APK proof including APK accessibility evidence, backup/rollback, deploy/live smoke, observability, live Ask/provider proof, and clean release ownership review.
```
