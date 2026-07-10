# Note Focus Mode — WCAG Accessibility Review

Review baseline: WCAG 2.1 AA
Scope: changed React/HTML/CSS for the responsive companion tabs and Focus surface
Post-fix status: Pass with environment-specific assistive-technology residuals

---
### Finding 1: Companion tabs lacked the standard arrow-key tab pattern

**Severity:** 🟡 Moderate

**What the issue is**

Both tabs were in the sequential Tab order and mouse/Enter were the only selection mechanics. This created avoidable friction for keyboard and screen-reader users of a `role=tablist` pattern (WCAG 2.1 AA – 2.1.1 Keyboard and 4.1.2 Name, Role, Value).

**Where to find it**

`src/components/item-companion-tabs.tsx`

**Recommended fix**

Use roving `tabIndex`, keep `aria-selected` synchronized, and support ArrowLeft/ArrowRight/Home/End while moving DOM focus to the selected tab.

**Resolution**

Implemented and covered by `item-companion-tabs.test.ts`; the production browser confirms ArrowLeft and ArrowRight preserve the mounted note textarea and value.
---

---
### Finding 2: Sticky Focus chrome could obscure a keyboard target

**Severity:** 🟡 Moderate

**What the issue is**

A sticky header and action bar can fully cover a newly focused control when the surface scrolls, especially under zoom or a small viewport (WCAG 2.1 AA – 2.4.12 Focus Not Obscured).

**Where to find it**

`src/components/manual-note-editor.tsx`, focused section layout.

**Recommended fix**

Apply top and bottom scroll padding equal to the sticky regions and keep the middle formatting/editor content in one scroll flow.

**Resolution**

Implemented with focused-surface scroll padding. At 320×800 the document and dialog have zero horizontal overflow, all toolbar targets are 44×44px, and Exit/Copy/Save remain inside the viewport.
---

---
### Finding 3: Notice announcements were mounted at the same time as their text

**Severity:** 🟡 Moderate

**What the issue is**

The transient notice `role=status` existed only when notice text existed. Some screen readers do not announce a live region created and populated in the same update (WCAG 2.1 AA – 4.1.3 Status Messages).

**Where to find it**

`src/components/manual-note-editor.tsx`, note notice region.

**Recommended fix**

Keep an empty polite, atomic status container mounted and visually hide it until text is available.

**Resolution**

Implemented. Save status was already continuously mounted and remains unchanged.
---

## Summary

| Severity | Count |
|---|---:|
| 🔴 Critical | 0 |
| 🟠 High | 0 |
| 🟡 Moderate | 3 resolved |
| 🟢 Low | 0 |
| **Total** | **3 resolved** |

**WCAG 2.1 AA Compliance Status:** Pass for reviewed code and production-browser keyboard/reflow evidence.

**Top priority fixes before shipping:** None open.

**What's done well**

- The same section gains `role=dialog`, `aria-modal`, an item-aware heading label, a description, and `aria-keyshortcuts=Escape` without a duplicate portal.
- Background isolation is transactional and exact; the keyboard trap wraps Save → Exit and Shift+Tab Exit → Save.
- Native buttons, links, labels, status roles, global visible focus styles, 44px mobile targets, and content-free history markers are preserved.

Residual evidence boundary: real VoiceOver/TalkBack speech and physical Android keyboard/Back are not available in this environment and are not claimed as verified.
