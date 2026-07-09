# Adversarial Review: Android A5 Login, Pairing, And Session Implementation Plan V1

Timestamp: 2026-06-16 12:42:00 IST
Reviewer: Main Codex using adversarial-review workflow
Reviewed artifact: `FEATURE_ANDROID_A5_LOGIN_PAIRING_SESSION_IMPLEMENTATION_PLAN_V1_2026-06-16_12-40-00_IST.md`

## Executive Summary

The plan has the right implementation surface and validation sequence, but it under-specifies how the browser proof will avoid state contamination and how the dev server will be run for the two different database scenarios. It also needs a more explicit report schema so future review can trust the proof without reading the whole browser script.

## Findings

### [P0] Two fixture scenarios require explicit server sequencing

The plan names empty and paired fixtures, but does not state how the dev server process will switch from empty setup proof to paired proof. Next.js holds a singleton DB per process, so changing `BRAIN_DB_PATH` without restarting the server would invalidate proof.

Recommended change: Plan must require one server run for the empty DB setup state and a separate server restart for the paired DB states, or use only one DB with deliberate state mutation. Server restart is cleaner.

### [P0] Session cookie handling must be proven without reporting the cookie

The plan says omit raw session values, but the browser script needs the cookie to access `/settings/device-pairing`. It should inject the cookie from the paired seed manifest but record only whether the cookie was set, never the value.

Recommended change: Browser report should include `sessionCookieInjected: true`, not the token.

### [P1] Pairing-code secrecy and determinism conflict

The browser script needs valid/expired/used codes to drive the form, but the report should not transcribe codes in markdown. JSON fixture manifests may contain local-only short-lived codes, but QA markdown should redact them.

Recommended change: Report code states by label and status, not code value.

### [P1] Touch target checks can create false positives for text links and fixed nav

Blindly requiring every link/button/input to be 44px can fail existing bottom nav or small informational links unrelated to A5 primary controls.

Recommended change: Require 44px checks for primary form controls and route-critical action buttons only, while separately reporting other sub-44 controls as observations.

### [P2] Copy audit should distinguish source comments from rendered copy

Some source comments may mention legacy facts. Failing all comments would be noisy in this dirty repo.

Recommended change: Scan A5 source files and include targeted forbidden source strings, but focus strict failures on rendered copy and high-risk source strings such as `AI Brain`, `Your Brain`, `scan QR`, terminal reset paths, and unsupported unlock/sync promises.

## Required Revisions For Plan V2

1. Specify server restart between empty and paired DB proofs.
2. Define browser report redaction and `sessionCookieInjected` behavior.
3. Report pairing code states by label, not by raw code in markdown.
4. Scope target-size assertions to A5 primary controls.
5. Tune copy audit strictness to avoid unrelated comment noise while catching rendered-risk strings.

## Verdict

Revise before execution. The plan is executable after clarifying fixture/server sequencing and proof redaction.
