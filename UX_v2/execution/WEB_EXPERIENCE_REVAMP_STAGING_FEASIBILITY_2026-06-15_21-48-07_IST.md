# Web Experience Revamp Staging Feasibility

**Created:** 2026-06-15 21:48:07 IST
**Status:** Phase 1 gate artifact.

## Findings

No dedicated staging URL or deploy-preview mechanism was found in the provided handover, PRDs, implementation plans, `package.json`, or deploy script. The documented deploy target is production `https://brain.arunp.in` through `scripts/deploy.sh` and SSH host `brain`.

## Required Compensation If No Staging Exists

Before production deploy:

1. Run a local production build.
2. Serve the production build locally if feasible.
3. Run browser route smoke against the local production build, not only `next dev`.
4. Capture screenshots/console/network evidence at required viewports.
5. Run static assets smoke against local build output.
6. Treat any unresolved local production-build route failure as a deploy blocker.

## If Staging Is Later Discovered

Use staging/deploy-preview for:

- Authenticated route smoke.
- Critical public assets.
- Provider/export/pairing API health where safe.
- Browser visual spot checks.

Document the staging URL, auth method, deploy command, and smoke results in the release packet.
