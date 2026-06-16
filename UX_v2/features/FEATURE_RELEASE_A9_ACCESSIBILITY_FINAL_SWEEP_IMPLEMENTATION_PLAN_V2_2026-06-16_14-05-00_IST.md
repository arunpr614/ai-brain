# A9 Accessibility Final Sweep Implementation Plan V2

Created: 2026-06-16 14:05:00 IST
Owner: Main Codex execution agent
Status: Approved for execution after adversarial review
Source PRD: `FEATURE_RELEASE_A9_ACCESSIBILITY_FINAL_SWEEP_PRD_V2_2026-06-16_14-02-00_IST.md`

## Steps

1. Build the sweep script.
   - Connect to an existing CDP endpoint or a locally started Chrome remote-debugging session.
   - Run against a local dev server on a dedicated port.
   - Use a temporary DB and seed all required synthetic fixtures.
   - Read the full A5 session manifest only from `/tmp`.

2. Keyboard and focus checks.
   - Dispatch real Tab key events through CDP.
   - Capture focus sequence, accessible label/name, element type, and focus styling.
   - Fail BODY-only focus on protected routes after session injection.

3. Touch-target checks.
   - Enforce 44px minimum on buttons, inputs, textareas, selects, nav links, tabs, and icon controls.
   - Record inline body links separately as observations, not blockers, unless they are the only path to a primary action.

4. 200 percent reflow proxy.
   - Use a 720px desktop/zoom-equivalent viewport as the documented browser reflow proxy.
   - Fail horizontal overflow and clipped primary controls.

5. Avoid secret exposure.
   - Do not click Device Pairing code generation.
   - Redact token, hex-secret, and pairing-code patterns from JSON text samples.

6. Execute, fix, and rerun.
   - If source code changes are needed, keep them scoped and rerun focused/full validation as appropriate.

7. Update reports.
   - Create A9 QA report and tracker update.
   - Update A7 packet, master tracker, and milestone tracker to reflect whether the local web accessibility blocker is closed.

## Release Status

Passing A9 closes only the local web accessibility release follow-up. Android TalkBack/runtime, live Ask/provider proof, backup/rollback, deploy/live smoke, observability, and APK proof remain separate blockers.
