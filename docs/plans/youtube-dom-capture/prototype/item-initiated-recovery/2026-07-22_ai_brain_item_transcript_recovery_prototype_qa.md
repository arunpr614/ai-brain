# AI Brain Item Transcript Recovery Prototype QA

**Date:** 2026-07-22<br>
**Artifact:** `2026-07-22_ai_brain_item_transcript_recovery_ux_prototype.html`<br>
**Result:** PASS, 29/29 browser interaction and responsive checks<br>

## Environment

- Google Chrome `150.0.7871.129`
- macOS `26.5.2`, Apple Silicon
- Direct Chrome DevTools Protocol control with a temporary browser profile
- Desktop viewport: `1440 x 1024`
- Mobile viewport: `390 x 844`
- Synthetic transcript cues and a public YouTube thumbnail

No extension package, Brain endpoint, YouTube account, YouTube DOM selector, or production service was used.

## Exercised Flow

### Entry And Ordinary Extension Behavior

- PASS: Eligible item shows **Get transcript with Chrome**.
- PASS: Paste and transcript-file upload remain available.
- PASS: Opening the ordinary YouTube source link keeps the existing extension popup.
- PASS: An ordinary tab does not open the item-recovery side panel.

### Item-Bound Handoff

- PASS: The item CTA opens the expected YouTube tab.
- PASS: The tab waits for an explicit Brain toolbar click.
- PASS: Waiting copy says that nothing has been read.
- PASS: The toolbar click opens the persistent side panel.
- PASS: The first side-panel state remains unread.

### Guidance, Inspection, And Commit

- PASS: **Show me where** highlights YouTube's **Show transcript** control.
- PASS: The simulated YouTube transcript panel can be opened manually.
- PASS: **Inspect visible transcript** produces local review evidence.
- PASS: Review exposes the exact destination and final-cue completeness.
- PASS: Closing and reopening the side panel discards review state and requires reinspection.
- PASS: Confirmed save succeeds while focus remains on YouTube.
- PASS: **Open item in Brain** returns to the same item.
- PASS: The same item replaces the repair state with an attached transcript.

### Recovery And Failure States

- PASS: Extension setup covers missing, hidden/unpinned, unpaired, and update-required conditions.
- PASS: No visible transcript adds nothing.
- PASS: A changed video fails closed.
- PASS: A changed item revision replaces nothing.
- PASS: An expired request grants nothing.
- PASS: Incomplete traversal blocks partial transcript commit.
- PASS: A network save failure does not show false success.
- PASS: The network retry reaches a successful receipt.
- PASS: Production mode exposes manual recovery only.

### Mobile

- PASS: The unsupported Chrome CTA is hidden.
- PASS: Copy explicitly says that the extension is unavailable on mobile and offers paste/upload.
- PASS: Document and browser shell have no horizontal overflow at `390 x 844`.

Measured mobile widths:

| Element | Client width | Scroll width |
| --- | ---: | ---: |
| Document | 390 | 390 |
| Browser shell | 370 | 370 |
| Brain main content | 370 | 370 |
| Item layout | 340 | 340 |

## Reference Screens

| Screen | Viewport | File |
| --- | --- | --- |
| Eligible Brain item | `1440 x 1024` | `2026-07-22_ai_brain_item_transcript_recovery_item.png` |
| Existing ordinary popup | `1440 x 1024` | `2026-07-22_ai_brain_item_transcript_recovery_ordinary_popup.png` |
| Guided transcript opening | `1440 x 1024` | `2026-07-22_ai_brain_item_transcript_recovery_guide.png` |
| Review and confirmation | `1440 x 1024` | `2026-07-22_ai_brain_item_transcript_recovery_review.png` |
| Completed Brain item | `1440 x 1024` | `2026-07-22_ai_brain_item_transcript_recovery_complete.png` |
| Mobile manual fallback | `390 x 844` | `2026-07-22_ai_brain_item_transcript_recovery_mobile.png` |

## Evidence Hashes

SHA-256:

```text
8ed4fd11d7f0d504289733822ced2e7194db58c59500cf7e38287c708a98f0de  2026-07-22_ai_brain_item_transcript_recovery_ux_prototype.html
f434fd8e94e8617f67e69fc42b15d0755ac0e1eac86f0f2a5bf7a969257c687b  2026-07-22_ai_brain_item_transcript_recovery_item.png
b50f42f39041ed4392f38f3d6926537ec3898055cc4cc8b796d88e5cd7f748bc  2026-07-22_ai_brain_item_transcript_recovery_ordinary_popup.png
b68cc534a730e4fade6a276fa5fb77f9bf8ba66687d1a8126d616905c7a7d4d8  2026-07-22_ai_brain_item_transcript_recovery_guide.png
d6b198feb8592e3318a6671cb7321e0d6e49e3518b08bac011354e76dbfb0b07  2026-07-22_ai_brain_item_transcript_recovery_review.png
5eca02de7690e3f7cb376fabd2364f77eb3015ae652608a08de6ec5c79e570cc  2026-07-22_ai_brain_item_transcript_recovery_complete.png
9616fc48568dbcc414bf979f27fd5dc7e6eb3cc8b0645488cc8ab10da8ebef1e  2026-07-22_ai_brain_item_transcript_recovery_mobile.png
```

## Limits

- This validates the prototype's interaction model, copy, layout, and state transitions only.
- It does not prove Manifest V3 per-tab popup override behavior in a packaged extension.
- It does not prove current YouTube selectors, signed-in account behavior, transcript traversal, or caption identity.
- It does not exercise Brain authentication, API authorization, database revision fences, atomic commit, receipts, or cleanup.
- It does not replace physical screen-reader, keyboard-only, high-zoom, or assistive-hardware testing during implementation.
- Production browser capture remains disabled and outside this prototype's approval.
