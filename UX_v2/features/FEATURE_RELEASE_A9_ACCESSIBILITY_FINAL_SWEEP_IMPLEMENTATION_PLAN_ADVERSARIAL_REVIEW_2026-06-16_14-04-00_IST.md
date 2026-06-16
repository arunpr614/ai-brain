# A9 Accessibility Final Sweep Implementation Plan Adversarial Review

Created: 2026-06-16 14:04:00 IST
Reviewer: Main Codex using adversarial-review standard
Status: Review complete

## Findings

| Severity | Finding | Evidence | Required revision |
| --- | --- | --- | --- |
| P1 | V1 does not say how Chrome/CDP and the local server will be managed. | Earlier scripts assume CDP and server are already available, which can make QA non-reproducible. | Add explicit orchestration: start/reuse dev server, start/reuse Chrome remote debugging, and clean up only processes started by the script/run. |
| P1 | V1 might fail many valid inline links while missing icon-only controls. | The broad selector can be noisy without element categories. | Categorize controls and enforce 44px for primary controls, inputs, tabs, nav, and icon buttons; record inline links separately. |
| P1 | V1 does not require rerunning A7/A8 release docs after results. | The active blocker lives in A7 packet and trackers. | Require A7 packet and tracker updates if A9 closes or keeps the accessibility blocker. |
| P2 | Evidence screenshots can include generated pairing codes. | Device Pairing route can show a one-time code after clicking actions. | Do not generate codes in A9; only inspect default page controls, and redact code-like text in JSON samples. |

## Recommendation

Revise the plan to include deterministic orchestration, category-aware checks, and explicit release-doc updates.
