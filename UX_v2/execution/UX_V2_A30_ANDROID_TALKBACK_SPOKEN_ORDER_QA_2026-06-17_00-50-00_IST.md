# UX v2 A30 Android TalkBack Spoken-Order QA

Created: 2026-06-17 00:50 IST
Branch: `codex/ai-brain-ux-v2-execution`
APK candidate: `data/artifacts/brain-debug-v1.0.5-code6.apk`
Verdict: `platform_ax_equivalent_passed_with_residual_risk`

## Summary

A30 completed the required governance cycle and ran an Android WebView accessibility-order audit on the installed `com.arunprakash.brain` debug APK candidate `1.0.5/code6`.

The audit passed all 10 scoped screens using Chrome DevTools `Accessibility.getFullAXTree` from the Android WebView. This proves platform-exposed accessibility labels/order for the tested screens, but it is not a human-heard TalkBack transcript. Therefore A30 reduces the TalkBack blocker to an explicit residual-risk decision: owner acceptance is still required if publication demands true spoken TalkBack proof.

## Evidence

| Evidence | Result |
| --- | --- |
| APK artifact | `data/artifacts/brain-debug-v1.0.5-code6.apk`, SHA-256 `e7539f1afb8b730b0c5f5808724d960df20a6db9fadc943b90c73ac9979298b7` |
| Android package | `versionName=1.0.5`, `versionCode=6`, `lastUpdateTime=2026-06-16 23:36:43` |
| Device target | `Brain_API_36`, Android 16, `emulator-5554` |
| WebView target | `https://brain.arunp.in/library`, title `AI Memory`, DevTools socket `webview_devtools_remote_3456` |
| Redacted summary | `UX_v2/execution/UX_V2_A30_ANDROID_TALKBACK_AX_SUMMARY_2026-06-17_00-50-00_IST.json` |
| Runtime local evidence | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a30/` |

Raw screenshots/XML remain local runtime evidence and should not be staged broadly because authenticated screens can contain private library content.

## Screen Matrix

| Screen | Result | Evidence tier | Notes |
| --- | --- | --- | --- |
| Locked/unlock route | Passed | Platform AX equivalent | Unlock heading/button exposed; locked privacy scan found no source counts, item status, capture quality, source names, or private route details. |
| Library | Passed | Platform AX equivalent | Primary mobile nav, Library heading, Capture action, search, filters, and item links were exposed; private item labels were redacted in retained evidence. |
| Ask | Passed | Platform AX equivalent | Ask heading, input, Send action, and primary mobile nav were exposed. |
| Capture | Passed | Platform AX equivalent | Capture heading, source tabs, URL textbox, Save URL, Cancel, and primary mobile nav were exposed. |
| More | Passed | Platform AX equivalent | More heading, Needs Upgrade entry, Device pairing entry, and primary mobile nav were exposed. |
| Device pairing | Passed | Platform AX equivalent | Device pairing heading, Android app section, Add Android device button, advanced token setup, and nav were exposed. |
| Item detail | Passed | Platform AX equivalent | First item route selected in memory from Library; raw item ID/title was not persisted. Route/nav/action structure passed with private content redacted. |
| Item repair | Passed | Platform AX equivalent | Repair route derived in memory from selected item; raw ID/title was not persisted. Repair source text and Save repair affordances were exposed. |
| Share result saved | Passed | Platform AX equivalent | Session-only non-production-mutation payload exposed Android share, Saved to AI Memory, full_text, Open item, Ask, and Done. |
| Share result URL failure | Passed | Platform AX equivalent | Session-only non-production-mutation payload exposed Android share, Link could not be saved, Capture manually, and Done. |

Retained summary counts: 10 passed, 0 failed, 0 blocked.

## TalkBack Probe

A bounded TalkBack service probe was also run:

- Pre-probe accessibility services: `null`
- Pre-probe touch exploration: `0`
- Enabled service for probe: `com.google.android.marvin.talkback/.TalkBackService`
- Touch exploration during probe: `1`
- TalkBack-related logcat lines: 18
- Post-probe accessibility services restored to `null`
- Post-probe touch exploration restored to `0`

The probe confirmed TalkBack can be enabled/restored, but available logcat output did not provide a reliable spoken-label transcript. A30 therefore does not claim `talkback_spoken_passed`.

## Verdict

`platform_ax_equivalent_passed_with_residual_risk`

A30 is stronger than A12's bounded launch smoke and covers the core route/order matrix, but it remains weaker than a human-heard TalkBack walkthrough or audio/video transcript. APK publication remains blocked until:

1. Arun explicitly authorizes the APK publication/signing/distribution target.
2. Arun accepts the A30 AX-equivalent residual risk, or a true spoken TalkBack audit is performed.

No app code changed during A30, so full source validation was not rerun for this documentation/evidence-only slice.
