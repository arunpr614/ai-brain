# Recall manual sync visual and accessibility QA

Date: 2026-07-11 IST
Scope: local fixture database and local Next.js server only
Production impact: none; no live Recall request, credential access, deployment, service/timer mutation, or host change

## Verdict

**Passed for review-ready browser evidence.** The implemented Settings panel, confirmation dialog, durable states, recovery overlays, responsive layouts, keyboard behavior, accessibility tree, live announcements, contrast, zoom, target sizes, and reduced-motion behavior were exercised in Chrome against migration `024` fixture data.

This is browser/local evidence, not production-enablement proof. Effective Linux identity, credential, unit, tmpfiles, SQLite/WAL/backup, timer, and live Recall behavior remain separately blocked and unauthorized.

## Viewport and theme evidence

| Evidence | Result |
| --- | --- |
| `implementation-ready-desktop-1440.png` | Ready/never-synced, light, complete Settings placement |
| `implementation-ready-desktop-dark-1440.png` | Ready/never-synced, dark |
| `implementation-queued-tablet-1024.png` | Queued, 1024px |
| `implementation-ready-mobile-390.png` and `implementation-ready-mobile-390-focus.png` | Ready, 390px, full page and focused panel |
| `implementation-ready-mobile-320.png` | Ready, 320px |
| `implementation-dialog-mobile-390-focus.png` | Confirmation dialog at 390px |
| `implementation-running-automatic-dark-reduced-motion-390.png` | Long automatic run, dark, reduced motion |
| `implementation-partial-desktop-1440.png` and `implementation-partial-mobile-390.png` | Truthful partial counts plus cooldown |
| `implementation-queued-mobile-390.png` | Accepted queued request |
| `implementation-offline-accepted-mobile-390.png` | Offline after acceptance with last-known metadata |
| `implementation-session-expired-mobile-390.png` | Session-expired overlay and Unlock action |

Direct DOM measurement found no horizontal overflow at 1440, 1024, 390, or 320 CSS pixels. At 200% page scale, `visualViewport.scale` was 2, document width remained equal to the 390px layout viewport, and no element crossed the viewport boundary.

The fixed mobile navigation does not obscure the primary Recall action; the page remains scrollable beyond the panel and retains the existing shell's bottom clearance behavior.

## State and copy evidence

- Ready/never-synced renders **Not yet synced** and **Schedule unavailable**.
- A long automatic execution renders **This is taking longer than usual**, disabled **Sync in progress**, and persistent freshness metadata.
- Request submission emitted exactly one POST and transitioned the stable live region through **Requesting sync…** then **Sync requested**.
- Partial fixture data rendered `2 items imported · 1 item upgraded · 4 items already current` exactly once, retained **Retrying remains safe**, and displayed the server-authoritative cooldown.
- Offline after accepted work rendered **Status temporarily unavailable**, **Last known** metadata, and **Check again** without creating a POST.
- Removing the authenticated session during queued work rendered **Session expired** and an **Unlock** link without inventing a terminal state.
- Fixed `Asia/Kolkata` formatter output and UTC wire values are covered separately by cross-time-zone automated tests.

## Keyboard and dialog evidence

Chrome input events, not DOM-only assertions, were used against the running application.

| Check | Observed result |
| --- | --- |
| Initial dialog focus | **Start sync** |
| Tab cycle | Close → Start sync → Cancel → Close; focus remained trapped |
| Overlay click | Dialog remained open |
| Escape | Dialog closed |
| Focus return | Exact **Sync now** opener regained focus |
| Cancel/close targets | 44×44px minimum; action buttons 44px high |
| Mobile primary action | 324×44px at 390px; 254×44px at 320px |

Dialog-scoped axe analysis returned zero violations.

## Accessibility tree and announcements

- Chrome's accessibility tree exposed the confirmation as role `dialog`, named **Sync Recall now?**, with named Close, Start sync, and Cancel buttons.
- The persistent status node exposed role `status`, `live=polite`, `atomic=true`, and relevant additions/text.
- A real request transition changed that live region only at semantic transitions: **Requesting sync…** then **Sync requested**; the one-second cooldown text was not the live-region source.
- Busy states retain text, badge, icon, and disabled-action cues; meaning is not color-only.
- Reduced-motion emulation produced no active animation names while the long automatic state remained visually understandable.

This validates browser accessibility semantics and announcement mutations. It does not claim a physical assistive-technology device lab run.

## Contrast and automated accessibility

- Recall light-theme minimum measured text contrast: **4.97:1** for 12px muted metadata; primary/action text was substantially higher.
- Recall dark-theme minimum measured text contrast: **6.31:1** for 12px muted metadata.
- Whole-page axe on the dark Settings state returned zero violations.
- Whole-page axe on light Settings reported two pre-existing, unrelated warning badges (**Coming soon** and **Server required**) at 4.48:1. Neither node is inside the Recall section; the Recall section itself had no axe violation.
- Dialog-scoped axe returned zero violations.

The unrelated 4.48:1 badges are recorded rather than silently attributed to this feature. Changing global warning tokens or unrelated Settings sections is outside this feature's scope.

## Residual boundaries

- Physical VoiceOver/TalkBack audio output and physical touch hardware were not available; browser AX, keyboard, measured target, live-region, responsive, and reduced-motion evidence is provided instead.
- Systemd-equivalent fixtures cover local path/fallback behavior; effective Linux unit execution remains a production-enablement gate.
- Supplied/revised prototype screenshots remain discovery/design evidence; the `implementation-*` files listed above are the implementation evidence.
