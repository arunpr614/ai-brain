# UX v2 A20 P1 Blocker Fixes QA

Created: 2026-06-16 21:03:00 IST
Owner: Codex
Branch: `codex/ai-brain-ux-v2-execution`
Status: P1 blockers fixed and revalidated; final review still required

## Scope

A20 responds to the A19 request-changes review:

1. Sensitive private surfaces accepted any non-empty `brain-session` cookie.
2. Ask history could keep stale client state after switching `?thread=` history links.

Governance inputs:

- `UX_v2/features/FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_PRD_V2_2026-06-16_20-54-00_IST.md`
- `UX_v2/features/FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_IMPLEMENTATION_PLAN_V2_2026-06-16_20-57-00_IST.md`
- `UX_v2/execution/UX_V2_A19_FINAL_STAGED_CANDIDATE_REVIEW_2026-06-16_20-48-00_IST.md`

## Implementation Summary

### Verified Session Hardening

- Added shared helpers in `src/lib/auth.ts`: `SessionCookieSource`, `getSessionCookieValue`, and `verifySessionCookie`.
- Updated device-pairing route handler to verify session tokens and accept a test-only verifier override.
- Replaced cookie-presence checks with `verifySessionCookie` in the A20 first-pass private API scope:
  - `src/app/api/ask/route.ts`
  - `src/app/api/library/export.zip/route.ts`
  - `src/app/api/search/route.ts`
  - `src/app/api/settings/provider-status/route.ts`
  - `src/app/api/settings/rotate-token/route.ts`
  - `src/app/api/items/[id]/export.md/route.ts`
  - `src/app/api/items/[id]/enrich/route.ts`
  - `src/app/api/items/[id]/enrichment-status/route.ts`
  - `src/app/api/threads/route.ts`
  - `src/app/api/threads/[id]/route.ts`
  - `src/app/api/threads/[id]/messages/route.ts`
- Hardened private server-rendered pages before private data is fetched:
  - `src/app/settings/device-pairing/page.tsx`
  - `src/app/library/page.tsx`
  - `src/app/more/page.tsx`

### Ask Thread-State Reset

- Added `src/app/ask/ask-state.ts` with `buildAskClientStateKey`.
- Updated `src/app/ask/ask-client.tsx` so `AskClient` keys the inner stateful chat component by restored thread id and message payload.
- First effect-based reset attempt was rejected by lint (`react-hooks/set-state-in-effect`). The final implementation uses keyed remount and passes lint.

### Regression Coverage

- `src/lib/auth.test.ts` now verifies cookie-helper behavior and rejects stub sessions.
- `src/app/api/settings/device-pairing/route.test.ts` now covers unsigned cookie rejection before token data is returned.
- `src/app/api/library/export.zip/route.test.ts` now uses real signed session tokens and rejects unsigned cookies.
- `src/app/api/ask/route.test.ts`, item enrichment tests, and rotate-token tests now use signed session tokens.
- Added isolated setup for rotate-token route tests: `src/app/api/settings/rotate-token/route.test.setup.ts`.
- Added Ask state key regression coverage: `src/app/ask/ask-state.test.ts`.

## Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- src/lib/auth.test.ts ... src/app/ask/ask-state.test.ts` | Passed | Repo script ran the full suite: 559 tests, 78 suites, 0 failures. |
| `npm run typecheck` | Passed | `tsc --noEmit`. |
| `npm run lint` | Failed once, then passed | First failure caught the effect-based Ask reset. Final keyed-remount implementation exits 0 with no warnings. |
| `npm run build` | Passed | Production build exits 0; retains known `unpdf` import-meta warning. |
| `npm test` | Passed | Full suite: 559 tests, 78 suites, 0 failures. |
| `npm run check:env` | Passed | `.env` gitignore check ok. |
| `npm run check:build-artifacts` | Passed | No `.next/standalone/data` directory. |
| `ALLOW_REBUILD_SAME_APK_VERSION=1 npm run build:apk` | Passed | Rebuilt debug candidate flow for `1.0.4/code5`. |

APK artifact:

- Path: `data/artifacts/brain-debug-v1.0.4-code5.apk`
- Size: 7.5 MB
- SHA-256: `a4be82c4d8d51de81345e27441af250bc1a8300f4646388dbd50522875c021b7`

## Remaining Risks / Follow-Ups

- `src/app/api/capture/pdf/route.ts` still has a cookie-presence-or-bearer gate. It is a write/capture surface rather than a sensitive data-returning surface and was outside A20 first-pass scope, but it should get a separate auth-design pass because it mixes browser cookie and Android/extension bearer semantics.
- `src/proxy.ts` remains presence-only by design because it runs before the Node DB-backed HMAC verification path; the hardened server pages and APIs now enforce verification for the A20 private surfaces.
- A19 non-blocking follow-ups remain open: large tag/topic/collection Ask scope cap transparency, missing item deletion affordance, IPv6 `[::1]` service-worker dev bypass, and mobile bulk tag/add-to-collection controls.
- APK publication authorization, full TalkBack spoken-order decision, URL-share success decision, and final commit/ownership review remain open.

## Verdict

The two A19 P1 blockers are fixed in source and covered by regression tests. A20 recommends a new final staged-candidate review before commit consideration.
