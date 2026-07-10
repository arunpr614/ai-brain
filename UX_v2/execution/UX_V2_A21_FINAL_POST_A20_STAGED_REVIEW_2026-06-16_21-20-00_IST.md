# UX v2 A21 Final Post-A20 Staged Review

Created: 2026-06-16 21:20:00 IST
Owner: Codex
Status: Request changes
Branch: `codex/ai-brain-ux-v2-execution`
Reviewed candidate: staged A18 release candidate plus staged A20 P1 fixes

## Summary

A21 reran final staged-candidate review after A20 fixed the A19 blockers. Product/Ask and public/governance review lanes returned go, but the security/privacy lane found one remaining P1: several server-rendered private pages still loaded library/settings/provider data after only the proxy cookie-presence gate.

The A21 verdict is `REQUEST_CHANGES`. A22 was opened immediately to harden private SSR pages, the shared proxy boundary, and the PDF upload auth path.

## Review Inputs

- Staged file list: 293 paths at A21 review start.
- Security/privacy slice: `/tmp/a21-security-private.diff`.
- Product/Ask slice: `/tmp/a21-product-ask.diff`.
- Public/governance slice: `/tmp/a21-public-governance.diff`.

## Lane Results

| Lane | Result | Notes |
| --- | --- | --- |
| Security/privacy | Request changes | P1: forged `brain-session` cookie strings could still pass the proxy and reach private SSR pages that loaded DB/provider data before page-level verification. |
| Product/Ask | Go | A20 keyed-remount fix resolved stale thread/history state. Residual future hardening: server-side item/thread scope validation for `/api/ask`. |
| Public/governance | Go | No P0/P1 in public/offline/Android packaging/governance slices. This was not a publication or deploy authorization. |

## P1 Finding

Private SSR pages needed signed-session verification before private data reads. A21 evidence named:

- `src/app/ask/page.tsx`
- `src/app/topics/[slug]/page.tsx`
- `src/app/items/[id]/page.tsx`
- `src/app/collections/[id]/page.tsx`
- `src/app/settings/page.tsx`

A22 expanded this to the full scanned private SSR class, including capture duplicate detection, search, needs-upgrade, item repair, and settings taxonomy pages.

## Required Follow-Up

1. Complete A22 PRD/review/plan/review cycle.
2. Implement signed-session guards before private SSR reads.
3. Upgrade the shared proxy from cookie-presence to signed-session verification.
4. Revalidate with typecheck, lint, full tests, build, env/build-artifact checks, and APK packaging.
5. Run a post-A22 final staged review before commit/PR/publication consideration.

## Release Effect

A21 blocks commit consideration. It does not deploy, publish, sign, upload, commit, push, or authorize APK distribution.
