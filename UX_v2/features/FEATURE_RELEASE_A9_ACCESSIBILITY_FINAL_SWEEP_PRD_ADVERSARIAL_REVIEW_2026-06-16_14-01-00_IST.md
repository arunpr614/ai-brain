# A9 Accessibility Final Sweep PRD Adversarial Review

Created: 2026-06-16 14:01:00 IST
Reviewer: Main Codex using adversarial-review standard
Status: Review complete

## Findings

| Severity | Finding | Evidence | Required revision |
| --- | --- | --- | --- |
| P1 | V1 could let BODY focus pass if the script only checks that the route loaded. | The prior accessibility smoke explicitly said Library and Device Pairing stayed on BODY with the current method. | Require route-level focus assertions that fail BODY-only focus for authenticated routes and record focus sequence labels. |
| P1 | V1 does not define how to handle below-44px controls that are intentionally inline links or repeated controls. | Touch-target checks can create false blockers if every inline text link is treated as a primary button. | Define accepted exceptions and keep failures for primary buttons, inputs, tabs, nav items, and icon controls. |
| P1 | 200 percent zoom can be overclaimed if only viewport screenshots are captured. | The prior smoke said reliable browser zoom control was unavailable. | Treat compact/zoom-equivalent width as a reflow proxy, document the limitation, and fail horizontal overflow/clipped primary controls. |
| P2 | The PRD does not explicitly require preserving secret hygiene while injecting a session. | A8 was just created because QA evidence could leak session/pairing material. | Require `/tmp` secret manifest handling and report redaction scans. |

## Recommendation

Revise the PRD before execution. The sweep should be honest: it can close the web local accessibility blocker if it passes, but it must leave Android TalkBack and real APK keyboard behavior open.
