# Feature Release A24 Dependency Security Hotfix PRD v1

Created: 2026-06-16 22:50:00 IST
Owner: Codex
Scope: dependency-only production security hotfix after successful A23 commit/deploy attempt

## Problem

The A23 release candidate was committed as `0655f51` and deployed successfully, but the deployment output showed production dependency audit warnings. A follow-up audit confirmed a high-severity Next.js App Router Proxy/Middleware bypass advisory affecting `next@16.2.5`, plus nested production dependency findings for `postcss` and `tar`.

This project uses `src/proxy.ts` for public/private routing and bearer/session gates. A22 added server-side signed-session verification to reduce blast radius, but shipping a known proxy-bypass advisory in the framework is not acceptable for a production release candidate.

## Goals

1. Remove the high-severity Next.js proxy-bypass advisory from the production dependency set.
2. Remove production audit findings for nested `postcss` and `tar`.
3. Preserve the already validated UX v2 source behavior.
4. Re-run the release validation suite after dependency changes.
5. Commit and redeploy the dependency hotfix before claiming production is clean.
6. Keep Android APK publication gates unchanged unless a new Android finding appears.

## Non-Goals

- No product UI changes.
- No route/auth behavior changes beyond framework dependency patching.
- No APK signing, upload, distribution, or publication authorization.
- No TalkBack spoken-order or URL-share decision closure.
- No broad cleanup of unrelated untracked project artifacts.

## Requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| A24-R1 | Patch Next.js away from vulnerable `16.2.5`. | `next` and `eslint-config-next` resolve to `16.2.9` or newer stable patch in the same major/minor line. |
| A24-R2 | Resolve production audit findings. | `npm audit --omit=dev` exits 0. |
| A24-R3 | Resolve full workspace audit findings when safe. | `npm audit` exits 0 without semver-major forced changes. |
| A24-R4 | Preserve build/test behavior. | Typecheck, lint, full tests, production build, env check, build-artifact check, and APK packaging pass. |
| A24-R5 | Maintain exact framework pinning style. | `package.json` uses exact `next` and `eslint-config-next` versions, matching prior repo style. |
| A24-R6 | Redeploy and smoke production. | Deploy script passes, remote providers pass, and live unauthenticated smoke verifies public unlock/private redirect/API 401 behavior. |

## Evidence To Capture

- Dependency diff in `package.json` and `package-lock.json`.
- `npm audit` and `npm audit --omit=dev` outputs.
- Validation command results.
- Deploy command result.
- Live smoke result for `/unlock`, `/library`, `/api/ask`, and `/api/telegram/webhook`.

## Risks

- Next patch upgrade could subtly affect App Router or proxy behavior.
- PostCSS override could break build pipeline if Next assumes its exact nested version.
- `npm audit fix` can update development tools; validation must prove tests still run.
- Commit/deploy evidence must distinguish the earlier successful A23 deploy from the final A24 hotfix deploy.

## Exit Criteria

A24 can close only when the dependency hotfix is committed, deployed, audited clean, smoke-tested in production, and documented in trackers. APK publication remains separately blocked.
