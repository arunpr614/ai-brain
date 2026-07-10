# UX v2 Project Tracker Update

Created: 2026-06-16 13:45:00 IST
Milestone: A8 Public Shell Privacy / Evidence Hygiene
Status: A8 remediation complete locally; final release remains `local_candidate_only`.

## Completed

- Completed the A8 PRD v1, adversarial review, and revised PRD v2 cycle.
- Completed the A8 implementation plan v1, adversarial review, and revised implementation plan v2 cycle.
- Integrated release-review sidecar findings into A7 docs.
- Fixed the public-shell Needs Upgrade privacy leak by gating the count behind verified session state.
- Hardened A5 seed evidence handling with redacted stdout, `/tmp`-only full manifest writes, and `0600` secret manifest permissions.
- Resynced Android public assets and verified packaged `offline.html` matches source.
- Ran focused, static, full test, and build gates.

## Evidence

| Evidence | Path |
| --- | --- |
| A8 QA report | `UX_v2/execution/UX_V2_A8_PUBLIC_SHELL_PRIVACY_AND_EVIDENCE_HYGIENE_QA_2026-06-16_13-45-00_IST.md` |
| Updated A7 code review | `UX_v2/execution/UX_V2_A7_CODE_REVIEW_2026-06-16_13-18-00_IST.md` |
| Updated A7 release packet | `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md` |
| A8 PRD/plan cycle | `UX_v2/features/FEATURE_RELEASE_A8_PUBLIC_SHELL_PRIVACY_AND_EVIDENCE_HYGIENE_*_2026-06-16_13-*.md` |

## Validation Summary

| Gate | Result |
| --- | --- |
| Focused public-shell/proxy tests | Passed: 21 tests / 5 suites |
| A5 seed redaction check | Passed |
| A5 non-`/tmp` manifest guard | Passed |
| Android offline asset match | Passed |
| `git diff --check` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with existing unrelated warning |
| `npm test` | Passed: 551 tests / 78 suites |
| `npm run build` | Passed with known `unpdf` warning |

## Remaining

- Android runtime/APK proof.
- Local web accessibility release sweep closed later in A9; Android APK accessibility remains part of runtime proof.
- Live Ask/provider citation proof.
- Production backup/rollback.
- Production deploy.
- Live smoke.
- Observability.
- Final clean release ownership/commit review.
- Running-log append only after explicit approval.
