# Feature Release A30 - Android TalkBack Spoken Order PRD v2

Created: 2026-06-17 00:42:00 IST
Owner: Codex
Status: Approved for implementation planning after adversarial review closure
Supersedes: `FEATURE_RELEASE_A30_ANDROID_TALKBACK_SPOKEN_ORDER_PRD_V1_2026-06-17_00-40-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A30_ANDROID_TALKBACK_SPOKEN_ORDER_PRD_ADVERSARIAL_REVIEW_2026-06-17_00-41-00_IST.md`
Related gates: A12 Android publication gate, A29 native Android URL-share proof

## Objective

Close or explicitly keep blocked the `talkback_spoken_order_not_captured` gate by auditing Android APK `1.0.5/code6` accessibility order and labels across the core app surfaces. A30 must distinguish true observed TalkBack spoken output from platform accessibility-tree evidence so the release packet does not overclaim.

## Review Closure

| Review finding | V2 resolution |
| --- | --- |
| AX tree evidence can overclaim spoken output | Adds explicit status taxonomy. Only human-observed spoken output may use `talkback_spoken_passed`; instrumented AX evidence uses `platform_ax_equivalent_passed_with_residual_risk`. |
| Item detail and repair omitted | Adds item detail and repair as required if safe redacted aliases exist or can be selected; otherwise they must be marked blocked with reason. |
| Share result setup can pollute production | Requires reuse of existing result state where possible or deterministic fixture precheck/cleanup if a new share is needed. |
| Locked privacy needs visual and accessibility separation | Requires locked-state visible sample and accessible-name sample. |
| Trackers need exact labels | Requires tracker and release packet labels to match A30 QA verdict. |

## Result Taxonomy

| Status | Meaning | Can close TalkBack publication gate? |
| --- | --- | --- |
| `talkback_spoken_passed` | A human listened to TalkBack or captured audio/video transcript and verified expected order/labels. | Yes. |
| `platform_ax_equivalent_passed_with_residual_risk` | Android/WebView accessibility tree, focus order, and accessible labels pass, but no human-heard TalkBack transcript exists. | Only if owner accepts residual risk. |
| `failed` | Missing labels, unsafe order, unreachable controls, privacy leak, or confusing announcement detected. | No. |
| `blocked` | Tooling/auth/device limitations prevent credible evidence. | No. |
| `not_applicable` | Screen/state cannot apply without unsafe mutation and is superseded by another direct result proof. | No broad closure; must explain. |

## Required Screens

1. Locked/unpaired launch screen.
2. Library.
3. Ask.
4. Capture.
5. More.
6. Device pairing.
7. Item detail with redacted alias.
8. Item repair with redacted alias.
9. Native share saved-result screen using existing state or a deterministic fixture.
10. Native share failure/result state if safely reachable without production pollution.

## Requirements

| ID | Requirement | Priority | Evidence |
| --- | --- | --- | --- |
| A30-R1 | Verify APK identity and device target. | P0 | APK path, versionName/versionCode, installed package metadata, emulator/device target. |
| A30-R2 | Capture non-screenshot accessibility evidence for every required screen. | P0 | AX tree/focus summary or manual checklist with element order, role/type, expected label, observed label/result, pass/fail, and evidence path. |
| A30-R3 | Keep true TalkBack and AX-equivalent claims separate. | P0 | QA report uses the taxonomy above and does not call AX evidence spoken output. |
| A30-R4 | Audit bottom navigation order and labels. | P1 | Library, Capture, Ask, More are exposed once, in expected order, with useful labels. |
| A30-R5 | Audit primary actions and forms. | P1 | Unlock/pairing, Ask composer, Capture controls, Repair text input, and share result actions expose names and are reachable. |
| A30-R6 | Audit item detail and repair or record exact blocker. | P1 | Safe route alias evidence, or blocked status with target-selection reason. |
| A30-R7 | Prove locked privacy in visual and accessibility content. | P0 | Locked visible sample and accessible-name sample contain no private counts, item titles, source names, raw IDs, or queue details. |
| A30-R8 | Avoid production pollution during share-result setup. | P0 | Existing state is reused, or deterministic fixture precheck, result, cleanup, and zero-count verification are recorded. |
| A30-R9 | Preserve evidence hygiene. | P0 | Redaction scan reports no raw tokens, pairing codes, private item IDs/titles/source text, full private answers, device serials, or raw private URLs. |
| A30-R10 | Update release packet, milestone tracker, delivery tracker, PM update, and running log. | P0 | All trackers use the same A30 verdict label. |

## Acceptance Criteria

1. A30 governance files exist before execution: PRD v1, PRD review, PRD v2, plan v1, plan review, plan v2.
2. A30 QA records a status for each required screen and a single overall verdict.
3. If actual spoken TalkBack cannot be captured, A30 must state `platform_ax_equivalent_passed_with_residual_risk` or `blocked`, not `talkback_spoken_passed`.
4. APK publication remains blocked unless publication authorization/signing target is separately provided and any residual AX-only risk is explicitly owner-accepted.
5. No raw secrets or private production content are retained in tracked evidence.

## No-Go Conditions

- APK identity cannot be confirmed.
- Accessibility evidence is only screenshots.
- Locked screen exposes private data visually or through accessibility names.
- A blocking accessibility defect is found and remains unresolved.
- A new share fixture is created but cleanup cannot be verified.
- Tracker/release-packet language overclaims TalkBack spoken proof.
