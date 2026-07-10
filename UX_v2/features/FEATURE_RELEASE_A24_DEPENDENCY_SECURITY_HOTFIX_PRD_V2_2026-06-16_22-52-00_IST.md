# Feature Release A24 Dependency Security Hotfix PRD v2

Created: 2026-06-16 22:52:00 IST
Supersedes: `FEATURE_RELEASE_A24_DEPENDENCY_SECURITY_HOTFIX_PRD_V1_2026-06-16_22-50-00_IST.md`
Review incorporated: `FEATURE_RELEASE_A24_DEPENDENCY_SECURITY_HOTFIX_PRD_ADVERSARIAL_REVIEW_2026-06-16_22-51-00_IST.md`

## Problem

A23 reached commit consideration and was committed as `0655f51`. The first production deploy of that candidate succeeded, but the deploy output exposed production dependency audit warnings. A direct production audit found a high-severity Next.js App Router Proxy/Middleware bypass advisory against `next@16.2.5`.

Because AI Brain uses `src/proxy.ts` in the authentication boundary, the release cannot be considered clean while production runs the affected framework version, even though A22 added server-side signed-session checks.

## Goals

1. Patch the framework dependency to a stable patched version in the same line.
2. Clean the production dependency audit.
3. Clean the full workspace audit when safe non-breaking fixes are available.
4. Prove compatibility with the standard release validation suite.
5. Commit the dependency hotfix and redeploy the patched build.
6. Keep APK publication, TalkBack spoken-order, and URL-share decisions open.

## Requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| A24-R1 | Patch framework versions. | `next` and `eslint-config-next` are exactly pinned to `16.2.9`. |
| A24-R2 | Patch nested production advisories. | `postcss` resolves to `8.5.14`; `tar` resolves to `7.5.16`; production audit exits 0. |
| A24-R3 | Patch safe dev-tool advisories. | `npm audit` exits 0 without `--force` or semver-major app framework changes. |
| A24-R4 | Validate compatibility. | Typecheck, lint, full tests, build, env check, build-artifact check, and APK packaging pass. |
| A24-R5 | Commit cleanly. | Hotfix source diff is limited to `package.json`, `package-lock.json`, and A24 governance/evidence docs. |
| A24-R6 | Redeploy patched build. | Deployment script finishes, remote provider check passes, and live smoke proves public/private auth behavior. |

## Hard No-Go Labels

- `dependency_audit_not_clean`
- `hotfix_not_committed`
- `hotfix_not_deployed`
- `postdeploy_smoke_not_run`
- `android_publication_authorization_missing`
- `talkback_spoken_order_not_captured`
- `url_share_success_not_proven`

The first four labels block A24 closure. The last three remain outside A24 and continue to block full project completion or APK publication.

## Validation Commands

- `npm audit`
- `npm audit --omit=dev`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run check:env`
- `npm run check:build-artifacts`
- `ALLOW_REBUILD_SAME_APK_VERSION=1 npm run build:apk`
- `BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh`
- Live `curl` smoke for `/unlock`, `/library`, `/api/ask`, and `/api/telegram/webhook`.

## Exit Criteria

A24 is complete only after the dependency hotfix is committed, production is redeployed from the patched tree, live smoke passes, and trackers/running log reflect the remaining non-A24 publication gates.
