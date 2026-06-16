# Feature Release A22 Private SSR Session Hardening PRD V1

Created: 2026-06-16 21:24:00 IST
Owner: Codex
Status: Draft for adversarial review
Branch: `codex/ai-brain-ux-v2-execution`

## Problem Statement

A21 final review found a remaining P1: A20 hardened private APIs and selected pages, but several server-rendered private pages still load DB/provider data after only the proxy's presence-only cookie gate. A22 must add signed-session verification before private data is loaded by those SSR pages.

## Target Pages

- `src/app/ask/page.tsx`
- `src/app/items/[id]/ask/page.tsx`
- `src/app/items/[id]/page.tsx`
- `src/app/collections/[id]/page.tsx`
- `src/app/topics/[slug]/page.tsx`
- `src/app/settings/page.tsx`

## Acceptance Criteria

| ID | Criterion | Priority |
| --- | --- | --- |
| A22-R1 | Each target page verifies `verifySessionCookie` before DB/provider reads. | P0 |
| A22-R2 | Invalid/missing sessions redirect to `/unlock?next=<current route>`. | P0 |
| A22-R3 | No private SSR page identified by A21 remains presence-only. | P0 |
| A22-R4 | Typecheck, lint, full tests, build, env/build-artifact checks, and APK packaging pass. | P0 |
| A22-R5 | A22 report/tracker/log document any residual auth follow-ups. | P1 |
