# Magic Patterns Source Snapshot

**Created:** 2026-06-15 21:48:07 IST
**Purpose:** Phase 0 design-source capture for the web experience revamp.

## Artifact Status

| Source | Editor ID | Active artifact ID | Generation status |
|---|---|---|---|
| Web desktop | `fhbeo46qahq5fkjfseckxx` | `f3312489-9172-4c3f-bcf8-2352ece9d417` | `isGenerating=false` |
| Android/mobile | `d5w3fb6rzxdeht7urnye5r` | `d7eeaec6-0272-40fa-a7ca-4de7871182e7` | `isGenerating=false` |

## Web Source Files Available

- `index.tsx`
- `App.tsx`
- `package.json`
- `index.css`
- `tailwind.config.js`
- `canvas.manifest.js`
- `useScreenInit.js`
- `components/ui/Select.tsx`
- `components/ui/Drawer.tsx`
- `components/ui/Card.tsx`
- `components/ui/Input.tsx`
- `components/ui/Tabs.tsx`
- `components/ui/Badge.tsx`
- `components/ui/Checkbox.tsx`
- `components/ui/Button.tsx`
- `components/ui/Separator.tsx`
- `data/sources.ts`
- `components/DesktopLayout.tsx`
- `pages/DesktopLibrary.tsx`
- `pages/DesktopNeedsUpgrade.tsx`
- `pages/DesktopItemDetail.tsx`
- `pages/DesktopAsk.tsx`
- `pages/DesktopCapture.tsx`
- `pages/DesktopSettings.tsx`
- `pages/DesktopLogin.tsx`
- `data/conversations.ts`
- `pages/DesktopPairDevice.tsx`
- `pages/DesktopTopic.tsx`
- `pages/DesktopCollection.tsx`

## Mobile Source Files Available

- `index.tsx`
- `App.tsx`
- `package.json`
- `index.css`
- `tailwind.config.js`
- `canvas.manifest.js`
- `useScreenInit.js`
- `components/ui/Select.tsx`
- `components/ui/Drawer.tsx`
- `components/ui/Card.tsx`
- `components/ui/Input.tsx`
- `components/ui/Tabs.tsx`
- `components/ui/Badge.tsx`
- `components/ui/Checkbox.tsx`
- `components/ui/Button.tsx`
- `components/ui/Separator.tsx`
- `data/sources.ts`
- `components/MobileFrame.tsx`
- `components/MobileBottomNav.tsx`
- `pages/MobileLibrary.tsx`
- `pages/MobileShareCapture.tsx`
- `pages/MobileRepair.tsx`
- `pages/MobileItemDetail.tsx`
- `pages/MobileOffline.tsx`
- `pages/MobileAsk.tsx`
- `pages/MobileCapture.tsx`
- `pages/MobileMore.tsx`
- `pages/MobileLogin.tsx`
- `data/conversations.ts`
- `pages/MobileNeedsUpgrade.tsx`
- `pages/MobileTopic.tsx`
- `pages/MobileCollection.tsx`

## Extracted Design Notes

- The web design is a real routed prototype using `react-router-dom`, desktop layout, route-specific pages, UI primitives, and fixture data.
- The web shell uses a left rail, AI Memory identity, Library, Needs Upgrade, Ask, Settings, Capture action, and Pair Device entrypoint.
- The mobile design is a framed Android-style prototype with a bottom nav for Library, Capture, Ask, and More. The frame itself is prototype chrome and must not be copied into the production responsive web app.
- The shared fixture model covers source quality states: `Full text`, `Transcript`, `Preview only`, `Metadata only`, and `Needs upgrade`.
- The source fixtures include capture channels: Telegram, Android share, Chrome extension, web capture, PDF upload, and web note.
- The design distinguishes generated topics, user-managed tags, and user-created collections. Topic/collection routes are in scope because production already has corresponding routes.
- The design uses a calm light desktop palette with high-contrast dark navy primary actions. Mobile source uses slate/violet/teal/ruby status colors. Production implementation must adapt these to existing CSS variable tokens and dark-theme support.
- Pair Device exists in both source sets. Web source has QR/code presentation; mobile source has unlock, pair, unreachable, and connected states.

## Capture Limitations

- Full source contents were inspected through Magic Patterns tooling, but the code is prototype source, not production-ready Next.js code.
- Several source reads were large enough for tool output truncation. During implementation, each specific page/component must be re-read before adapting it.
- Screenshots have not yet been captured in this snapshot folder. Browser visual evidence will be created under `WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/` during Phase 10.
- The mobile frame/status/navigation bars are design context only; production Android validation must use the real Capacitor APK/WebView.
