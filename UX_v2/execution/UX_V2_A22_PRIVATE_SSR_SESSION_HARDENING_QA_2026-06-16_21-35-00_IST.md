# UX v2 A22 Private SSR Session Hardening QA

Created: 2026-06-16 21:35:00 IST
Owner: Codex
Status: Passed; final post-A22 staged review required
Branch: `codex/ai-brain-ux-v2-execution`
PRD: `../features/FEATURE_RELEASE_A22_PRIVATE_SSR_SESSION_HARDENING_PRD_V2_2026-06-16_21-26-00_IST.md`
Implementation plan: `../features/FEATURE_RELEASE_A22_PRIVATE_SSR_SESSION_HARDENING_IMPLEMENTATION_PLAN_V2_2026-06-16_21-29-00_IST.md`

## Scope Executed

A22 fixed the A21 P1 by moving private HTML/API auth from cookie presence to signed-session verification.

Source changes:

- `src/proxy.ts`: verifies `brain-session` through `verifySessionCookie` before allowing web UI/API cookie flow; forged cookies now fall through to bearer verification or unauthenticated handling.
- `src/app/api/capture/pdf/route.ts`: verifies signed-session cookies and revalidates bearer tokens before processing PDF uploads.
- `src/app/ask/page.tsx`: verifies session before Ask history/scope DB reads and preserves Ask query params in `next`.
- `src/app/items/[id]/ask/page.tsx`: verifies session before item/thread reads.
- `src/app/items/[id]/page.tsx`: verifies session before item/detail/tag/topic/collection reads.
- `src/app/collections/[id]/page.tsx`: verifies session before collection reads.
- `src/app/topics/[slug]/page.tsx`: verifies session before topic reads.
- `src/app/settings/page.tsx`: verifies session before backup/provider/theme private state reads.
- `src/app/capture/page.tsx`: verifies session before duplicate URL lookup and preserves `tab`/`url`.
- `src/app/search/page.tsx`: verifies session before provider/search calls and preserves `q`/`mode`.
- `src/app/needs-upgrade/page.tsx`: verifies session before weak-capture listing.
- `src/app/items/[id]/repair/page.tsx`: verifies session before item repair reads.
- `src/app/settings/tags/page.tsx`: verifies session before tag/count reads.
- `src/app/settings/collections/page.tsx`: verifies session before collection/count reads.

Regression tests:

- `src/proxy.test.ts`
- `src/proxy.test.setup.ts`
- `src/app/api/capture/pdf/route.test.ts`

## Static Source Scan

Targeted scan confirmed `verifySessionCookie` guards appear before the private DB/provider reads in the scanned private SSR pages and `/api/capture/pdf`.

No remaining `req.cookies.get(SESSION_COOKIE)` cookie-presence auth pattern remains in the scanned release-bound paths after the proxy/PDF changes.

## Validation

| Check | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | Passed | `tsc --noEmit` exited 0. |
| Focused auth tests | Passed | `node --import tsx --test src/proxy.test.ts src/app/api/capture/pdf/route.test.ts src/lib/auth.test.ts`: 40 tests passed. |
| `npm run lint` | Passed | No warnings after removing the stale proxy constant. |
| `npm test` | Passed | 563 tests, 78 suites, 0 failures. |
| `npm run build` | Passed | Production build exited 0; known `unpdf` import-meta warning remains. |
| `npm run check:env` | Passed | `.env` is gitignored and `.env.example` is tracked. |
| `npm run check:build-artifacts` | Passed | No `.next/standalone/data` directory. |
| `ALLOW_REBUILD_SAME_APK_VERSION=1 npm run build:apk` | Passed | Rebuilt debug APK `1.0.4/code5`. |

APK artifact:

- Path: `data/artifacts/brain-debug-v1.0.4-code5.apk`
- Size: 7.5 MB
- SHA-256: `a4be82c4d8d51de81345e27441af250bc1a8300f4646388dbd50522875c021b7`

## Residual Gates

- A22 is a local source/test/governance fix and validation pass. It does not deploy, publish, sign, upload, commit, push, or authorize APK distribution.
- A post-A22 final staged-candidate review is still required before commit/PR consideration.
- APK publication remains gated by final ownership review, explicit distribution authorization, TalkBack spoken-order decision, and URL-share success decision.
