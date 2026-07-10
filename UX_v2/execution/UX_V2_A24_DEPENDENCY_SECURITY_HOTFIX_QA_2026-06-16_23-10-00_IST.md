# UX v2 A24 Dependency Security Hotfix QA

Created: 2026-06-16 23:10:00 IST
Source hotfix commit deployed: `f9de485` (`Patch UX v2 dependency security advisories`)
Previous release candidate commit: `0655f51` (`Complete UX v2 release candidate`)
Status: `web_production_hotfix_deployed_android_publication_gated`

## Why A24 Was Needed

The A23 release candidate was committed and deployed successfully, but the deploy output showed production dependency audit warnings. A follow-up local audit confirmed a high-severity Next.js App Router Proxy/Middleware bypass advisory affecting `next@16.2.5`.

AI Brain uses `src/proxy.ts` in the auth boundary. A22 server-side signed-session checks reduce exposure, but the framework advisory was still treated as release-blocking for a clean production claim.

## Dependency Changes

| Package | Before | After | Reason |
| --- | --- | --- | --- |
| `next` | `16.2.5` | `16.2.9` | Patch Next.js proxy-bypass advisory. |
| `eslint-config-next` | `16.2.5` | `16.2.9` | Keep framework lint config aligned. |
| `postcss` | nested vulnerable Next copy | `8.5.14` through override | Clear production PostCSS advisory. |
| `tar` | `7.5.15` | `7.5.16` through override/update | Clear production tar advisory. |
| `tsx` | `4.19.2` | `4.22.4` | Safe `npm audit fix` for dev-tool advisory chain. |

No product source files were changed in A24.

## Validation

| Check | Result |
| --- | --- |
| Resolved versions | `next=16.2.9`, `eslint-config-next=16.2.9`, `postcss=8.5.14`, `tar=7.5.16`, `tsx=4.22.4`. |
| `npm audit` | Passed, 0 vulnerabilities. |
| `npm audit --omit=dev` | Passed, 0 vulnerabilities. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm test` | Passed, 563 tests, 78 suites, 0 failures. |
| `npm run build` | Passed on Next `16.2.9` with known `unpdf` import-meta warning. |
| `npm run check:env` | Passed. |
| `npm run check:build-artifacts` | Passed. |
| `ALLOW_REBUILD_SAME_APK_VERSION=1 npm run build:apk` | Passed; rebuilt existing `1.0.4/code5` debug candidate. |
| Staged hygiene before source hotfix commit | `git diff --cached --check` passed; staged count 8; exclusion scan found no root `RUNNING_LOG.md`, APK/AAB, keystore, SQLite, `.env`, `data/artifacts/`, `assets/`, or heavy evidence folders. |

APK output remains `data/artifacts/brain-debug-v1.0.4-code5.apk`; publication remains unauthorized and gated.

## Deployment

Command:

```bash
BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh
```

Deploy result:

- Local release gates inside deploy passed: typecheck, lint, tests, env check, provider warn-only preflight.
- Standalone build used Next `16.2.9` and passed with the known `unpdf` warning.
- Build-artifact check passed.
- Artifact synced to Hetzner.
- Remote native dependencies rebuilt successfully.
- Remote production install reported `found 0 vulnerabilities`.
- Service restarted.
- Authenticated remote health check passed.
- Remote provider check during deploy:
  - enrichment passed;
  - Ask timed out once under warn-only;
  - embedding passed.
- Immediate rerun of the same remote provider check passed for enrichment, Ask, and embedding.
- Telegram unauthenticated webhook reachability check passed.
- Telegram live smoke was skipped because `TELEGRAM_RELEASE=1` and `TELEGRAM_WEBHOOK_SECRET` were not set.

## Postdeploy Production Proof

| Smoke | Result |
| --- | --- |
| `GET https://brain.arunp.in/unlock` | `200` |
| unauthenticated `HEAD https://brain.arunp.in/library` | `307` to `/unlock?next=%2Flibrary&reason=session-expired` |
| unauthenticated `POST https://brain.arunp.in/api/ask` | `401` |
| unauthenticated `POST https://brain.arunp.in/api/telegram/webhook` | `401` |
| remote `/opt/brain` package check | `next: 16.2.9` |
| remote `npm audit --omit=dev` | `found 0 vulnerabilities` |
| remote service state | `active` |

## Residual Risks / Open Gates

- APK publication remains blocked until Arun authorizes a named distribution/signing target.
- Full TalkBack spoken-order audit remains uncaptured unless explicitly accepted as a release risk.
- Native URL-share success remains unresolved; A12 proved native note share and cleanup, but the `example.com` URL fixture failed.
- Local provider preflight still warns when local Ollama is unavailable; production Anthropic/Gemini provider proof passed after rerun.
- Root `RUNNING_LOG.md` remains append-only and intentionally unstaged.

## Verdict

A24 closes the dependency security hotfix and redeploy gate for the web production release. The full project goal is still not complete because Android publication and the remaining Android release decisions are still open.
