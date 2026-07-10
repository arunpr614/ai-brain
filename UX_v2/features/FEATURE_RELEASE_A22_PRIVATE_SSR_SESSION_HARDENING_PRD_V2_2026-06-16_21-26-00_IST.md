# Feature Release A22 Private SSR Session Hardening PRD V2

Created: 2026-06-16 21:26:00 IST
Owner: Codex
Status: Approved for implementation planning after adversarial review
Branch: `codex/ai-brain-ux-v2-execution`
Supersedes: `FEATURE_RELEASE_A22_PRIVATE_SSR_SESSION_HARDENING_PRD_V1_2026-06-16_21-24-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A22_PRIVATE_SSR_SESSION_HARDENING_PRD_ADVERSARIAL_REVIEW_2026-06-16_21-25-00_IST.md`

## Problem Statement

A21 final review found a remaining P1: A20 hardened private APIs and selected pages, but several server-rendered private pages still load DB/provider data after only the proxy's presence-only cookie gate. A22 must add signed-session verification before private data is loaded by those SSR pages and close the same forged-cookie bypass at the shared proxy/API boundary.

## Target Pages

- `src/app/ask/page.tsx`
- `src/app/items/[id]/ask/page.tsx`
- `src/app/items/[id]/page.tsx`
- `src/app/collections/[id]/page.tsx`
- `src/app/topics/[slug]/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/capture/page.tsx`
- `src/app/search/page.tsx`
- `src/app/needs-upgrade/page.tsx`
- `src/app/items/[id]/repair/page.tsx`
- `src/app/settings/tags/page.tsx`
- `src/app/settings/collections/page.tsx`

## Shared Auth Boundary

- `src/proxy.ts` must verify the signed `brain-session` value instead of accepting cookie presence.
- `src/app/api/capture/pdf/route.ts` must verify session-cookie auth and re-validate bearer tokens so direct handler invocation cannot pass with a forged cookie.
- Existing bearer clients must remain supported when no valid session cookie is present.

## Next URL Policy

- Ask page preserves `scope`, `ids`, `tag`, `topic`, `collection`, and `thread` query params in `/unlock?next=...`.
- Capture preserves `tab` and `url`.
- Search preserves `q` and `mode`.
- Item, item Ask, item repair, collection, and topic dynamic pages use their current route path in `next`.
- Settings pages use their current settings path.
- If a dynamic record is not found after auth passes, preserve existing `notFound()` behavior.

## Acceptance Criteria

| ID | Criterion | Priority |
| --- | --- | --- |
| A22-R1 | Each target page verifies `verifySessionCookie` before DB/provider reads. | P0 |
| A22-R2 | Invalid/missing sessions redirect to `/unlock?next=<current route>`. | P0 |
| A22-R3 | No private SSR page identified by A21 remains presence-only. | P0 |
| A22-R4 | Proxy rejects forged session cookies and still permits valid bearer clients on bearer routes. | P0 |
| A22-R5 | PDF upload route rejects forged session cookies and keeps signed-session and bearer paths working. | P0 |
| A22-R6 | Source scan verifies guard placement before private reads; page tests are added only if local patterns support them without brittle framework mocking. | P1 |
| A22-R7 | Typecheck, lint, focused auth tests, full tests, build, env/build-artifact checks, and APK packaging pass. | P0 |
| A22-R8 | A22 report/tracker/log document residual auth follow-ups and require post-A22 final review. | P1 |
