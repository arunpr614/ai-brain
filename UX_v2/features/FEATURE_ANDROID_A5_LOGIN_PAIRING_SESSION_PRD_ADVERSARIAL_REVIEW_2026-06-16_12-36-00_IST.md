# Adversarial Review: Android A5 Login, Pairing, And Session PRD V1

Timestamp: 2026-06-16 12:36:00 IST
Reviewer: Main Codex using adversarial-review workflow
Reviewed artifact: `FEATURE_ANDROID_A5_LOGIN_PAIRING_SESSION_PRD_V1_2026-06-16_12-34-00_IST.md`

## Executive Summary

The PRD is directionally correct and avoids the largest false claims from the Android source package. It still needs tighter acceptance wording around secrets, state determinism, and what browser proof can and cannot demonstrate. Without those corrections, execution could pass visually while missing auth redirects, token secrecy, or APK evidence boundaries.

## Findings

### [P0] Acceptance does not require unauthenticated redirect proof

The PRD says auth contracts must remain unchanged, but browser acceptance does not explicitly require an unauthenticated `/settings/device-pairing` redirect to `/unlock?next=/settings/device-pairing`. This is central to session behavior and must be a named proof state.

Recommended change: Add redirect proof to browser acceptance and QA reporting.

### [P0] Pairing success wording can still overclaim reachability

The PRD includes accepted-but-unreachable coverage, but also asks for "paired" state. Because `BRAIN_TUNNEL_URL` is a production URL and not locally configurable in this slice, local browser proof cannot guarantee production reachability or APK WebView behavior.

Recommended change: Split "exchange accepted" from "server reachable". Require deterministic accepted-but-unreachable proof and document true APK reachability as pending unless a separate production/APK smoke is completed.

### [P1] Secret handling needs explicit non-logging criteria

The PRD says reports should avoid logging secrets, but does not specify which values must be redacted or omitted. Fixture manifests can accidentally include session cookies, bearer tokens, or one-time codes.

Recommended change: Allow short-lived test pairing codes in local-only fixture manifests only when needed, but never record `brain-session` values or raw bearer tokens in markdown reports. Browser reports may record code-state labels, not token values.

### [P1] Mobile input requirements lack testable selector-level detail

The PRD requires mobile-appropriate input attributes, but without specific checks the implementation might visually pass while omitting `inputMode`, `autoComplete`, or labels.

Recommended change: Browser script should inspect setup/unlock/pairing inputs for required attributes and minimum target sizes.

### [P2] Recovery copy requirement is subjective

"Avoid terminal-only recovery instructions as primary mobile guidance" is directionally useful but can be interpreted loosely.

Recommended change: Make the app copy say reset requires server access and refer to the existing operational runbook or server data reset, without inline shell paths/commands on the mobile screen.

## Required Revisions For PRD V2

1. Add explicit unauthenticated redirect proof.
2. Separate exchange acceptance from tunnel/APK reachability.
3. Add secret redaction rules for markdown and JSON artifacts.
4. Add selector-level mobile input checks to acceptance.
5. Make recovery-copy replacement concrete.

## Verdict

Revise before implementation. The scope is useful, but the acceptance criteria need sharper guardrails to prevent a visually nice but evidence-weak slice.
