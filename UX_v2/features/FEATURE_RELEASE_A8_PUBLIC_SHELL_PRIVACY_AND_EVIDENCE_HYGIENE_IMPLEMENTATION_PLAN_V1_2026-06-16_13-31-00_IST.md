# A8 Public Shell Privacy Implementation Plan V1

Created: 2026-06-16 13:31:00 IST
Owner: Main Codex execution agent
Status: Draft for adversarial review
Source PRD: `FEATURE_RELEASE_A8_PUBLIC_SHELL_PRIVACY_AND_EVIDENCE_HYGIENE_PRD_V2_2026-06-16_13-30-00_IST.md`

## Steps

1. Add a shell-private-count helper.
   - Accept a session token, a verifier, and a count function.
   - Return zero when verification fails.
   - Return the count only when verification succeeds.

2. Update `src/app/layout.tsx`.
   - Read the request cookie store once.
   - Resolve theme from that store.
   - Pass `needsUpgradeCount=0` for unauthenticated/invalid sessions.

3. Add unit tests for the helper.

4. Harden A5 seed script.
   - Redact stdout.
   - Restrict full secret manifest to `/tmp`.
   - Use `0600` permissions.

5. Refresh Android packaged public assets if possible.
   - Run `npx cap sync android` only if it does not require unavailable runtime tooling.
   - Document if skipped or failed.

6. Run validation and update A7/A8 reports.

## Expected Files

- `src/lib/shell/private-counts.ts`
- `src/lib/shell/private-counts.test.ts`
- `src/app/layout.tsx`
- `scripts/ux-v2-seed-android-a5-login-pairing.ts`
- Android generated asset files if `cap sync android` succeeds
- A7/A8 QA/tracker docs
