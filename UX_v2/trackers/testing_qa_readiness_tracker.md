# Testing And QA Readiness Tracker

Created: 2026-06-14 07:40 IST

| Area | Current readiness | Required evidence | Owner | Gate |
| --- | --- | --- | --- | --- |
| Static checks | Previously passed in handover | Fresh `npm run typecheck`, `npm run lint` | Implementation agent | Before and after feature work |
| Focused tests | Existing tests for items, ask, topics, chat, capture | Rerun focused tests relevant to selected feature | Implementation agent | Before feature completion |
| Web screenshots | Design refs exist, production evidence missing | Library, Needs Upgrade, Capture, item detail, focus, Ask, Settings, Login/Pair | Implementation agent | PRD-16 |
| Android viewport screenshots | Design refs exist, production evidence missing | Library, filters, Capture, share result, item tabs, focus, Ask composer, More, Login/Offline | Implementation agent | PRD-16 |
| Android emulator/device checks | Not verified for UX v2 | Share intent, pairing/token state, offline fallback, launcher label/icon, APK install/open; exact blocker if unavailable | Implementation agent | Hard gate for Android-specific claims |
| Android APK | Not verified for UX v2 | `npm run build:apk` plus install/open evidence, or exact blocker | Implementation agent | Release gate |
| Brand copy | Partial evidence | `rg "AI Brain|Your Brain|Ask AI Brain|Unlock AI Brain" src public android` with allowed matches documented | Implementation agent | PRD-16 |
| Privacy copy | Partial evidence | Search for encryption/privacy overclaims and disabled controls | Implementation agent | PRD-14/16 |
| Service worker/offline | Partial evidence | `?nosw=1` smoke plus offline fallback inspection | Implementation agent | PRD-14/15/16 |
| Accessibility | Not complete | Labels, focus rings, tap targets, keyboard/sheet dismissal | Implementation agent | PRD-16 |
| Data safety | Partial tests | Repair transaction tests, duplicate capture tests, ask scope tests | Implementation agent | Feature-specific |
| Design freshness | Frozen local package only | Live Magic Patterns recheck or explicit confirmation frozen package is authoritative before visual implementation | Implementation agent / Arun | Before visual implementation |
| Tracker parity | Initial parity recorded | Markdown/CSV row counts and source-of-truth rule updated after tracker changes | Implementation agent | Before handoff |
