# YouTube DOM Capture UX Prototype QA

**Date:** 2026-07-22<br>
**Result:** Passed for throwaway interaction and visual review<br>
**Prototype:** `2026-07-22_ai_brain_youtube_dom_capture_ux_prototype.html`<br>

## Purpose

This record verifies that the throwaway prototype communicates the final V2 consent model and failure behavior. It does not validate a real extension, YouTube DOM extractor, Brain endpoint, authentication path, or persistence layer.

## Environment

- Google Chrome `150.0.7871.129`
- Temporary local HTTP server and temporary Chrome profile
- Desktop viewport: `1440 x 1024`
- Mobile viewport: `390 x 844`
- Browser control: Chrome DevTools Protocol

## Interaction Results

| Scenario | Action | Expected result | Observed result |
|---|---|---|---|
| Ready | Open prototype | URL/title-only readiness; no transcript-detection claim | `YouTube video ready`; `Nothing has been read`; pass |
| Ready | Inspect visible transcript | Local inspection transitions to review | `Transcript ready to save`; pass |
| Ready | Save transcript to Brain | Explicit confirmation produces receipt | Saved receipt state; pass |
| Panel closed | Inspect visible transcript | Explain how to open the panel; send nothing | `Open the transcript on YouTube`; nothing sent; pass |
| No captions | Inspect visible transcript | Supported unavailable state; send nothing | Transcript unavailable state; nothing sent; pass |
| Incomplete | Inspect visible transcript | Fail closed when traversal cannot prove completeness | Incomplete state; nothing sent or saved; pass |
| Video changed | Inspect visible transcript | Fail closed on navigation/identity change | Navigation-changed state; nothing sent or saved; pass |
| Ready | Save link only | Use metadata-only outcome and suppress recovery | Link saved; no transcript recovery queued; pass |

## Layout Results

- Desktop ready and review states render without overlap at `1440 x 1024`.
- Mobile body width and scroll width both measure `390px`; no horizontal overflow is present.
- Mobile popup bounds remain inside the viewport: left `18px`, right `372px`, bottom about `833px`.
- Mobile action controls retain a stable `320px` content width without label clipping.
- The mobile review body scrolls vertically; disclosure and commands remain reachable without resizing the popup shell.

## Reference Evidence

| File | Dimensions | SHA-256 |
|---|---:|---|
| `2026-07-22_ai_brain_youtube_dom_capture_ux_prototype.html` | N/A | `96a84ffc28aeb77a3c2dc13fe0d5da31166ace2ce143859231ab4c76489e26a7` |
| `2026-07-22_ai_brain_youtube_dom_capture_initial.png` | `1440 x 1024` | `bc1288578d2cf1c11a4d1641045b23fe958e4132cbb9d0d7043778bfa0feaca7` |
| `2026-07-22_ai_brain_youtube_dom_capture_review.png` | `1440 x 1024` | `1de5dabd439fc3fb410cf61b43b73f195d9dbe03573bf62a733a24ea3d3c4d5e` |
| `2026-07-22_ai_brain_youtube_dom_capture_mobile.png` | `390 x 844` | `f1d46888fbdb86511475df0379c9ef136e489652b12c87c7a4957a0770c45413` |

## Deliberate Limits

- All inspection, save, and failure outcomes are simulated in-browser.
- The prototype does not access a YouTube account, cookies, captions, page DOM, or Brain data.
- The public demo thumbnail and Lucide icon library need network access; the committed screenshots do not.
- Browser keyboard and screen-reader acceptance remain implementation-stage work.
