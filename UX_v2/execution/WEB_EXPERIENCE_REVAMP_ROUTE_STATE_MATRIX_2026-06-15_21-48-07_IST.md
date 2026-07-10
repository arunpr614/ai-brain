# Web Experience Revamp Route-State Matrix

**Created:** 2026-06-15 21:48:07 IST
**Status:** Phase 1 gate artifact. Update as implementation progresses.

| Route | State | Source | Fixture | Current status | Required change | Owner | Validation | Evidence | Release status |
|---|---|---|---|---|---|---|---|---|---|
| `/unlock` | PIN entry, error, loading | Web/mobile Magic Patterns login + current auth | `FX-AUTH-LOGGED-OUT` | Existing, needs visual revamp | Align copy/actions/contrast; preserve auth behavior | Main Codex | Screenshot + unlock smoke | Pending | QA needed |
| `/setup` | Setup PIN, mismatch, existing PIN error | Existing product | `FX-AUTH-LOGGED-OUT` | Existing, not in MP source | Bring visual language in line without changing reset safety | Main Codex | Screenshot + auth action check | Pending | QA needed |
| `/setup-apk` | Public setup page | Existing product + Android PRD | `FX-OFFLINE-ASSETS` | Existing | Asset/copy smoke; no hidden auth regression | Main Codex | Public route smoke | Pending | QA needed |
| `/library` | Populated | Web `DesktopLibrary`, mobile `MobileLibrary` | `FX-LIBRARY-MIXED` | Existing Magic Patterns release candidate | Tighten visual fidelity, filters, contrast, responsive behavior | Main Codex | Screenshot + interaction | Pending | QA needed |
| `/library` | Empty/loading/error | PRD matrix | `FX-LIBRARY-EMPTY`, `FX-LIBRARY-ERROR` | Partial/unknown | Ensure intentional states | Main Codex | Screenshot/state simulation | Pending | QA needed |
| `/search` | Empty, results, no results, loading, error | Web PRD | `FX-SEARCH-RESULTS`, `FX-SEARCH-NONE` | Existing route | Align with shell and result row primitives | Main Codex | Screenshot + search smoke | Pending | QA needed |
| `/items/[id]` | Full text | Web `DesktopItemDetail`, mobile item detail | `FX-DETAIL-FULL` | Existing | Align detail layout, topics/tags/collections, related items | Main Codex | Screenshot + navigation | Pending | QA needed |
| `/items/[id]` | Metadata-only/failed enrichment | Web/mobile item detail + Needs Upgrade | `FX-DETAIL-METADATA`, `FX-DETAIL-FAILED` | Existing | Clarify repair/upgrade affordances | Main Codex | Screenshot + repair link smoke | Pending | QA needed |
| `/items/[id]/repair` | Pasted text repair | Mobile repair source + existing route | `FX-DETAIL-FAILED` | Existing | Align visual treatment and error states | Main Codex | Screenshot + local mutation | Pending | QA needed |
| `/items/[id]/ask` | This item scope | Web/mobile Ask sources | `FX-ASK-CITATIONS` | Existing/unknown | Ensure scope UI is clear and citations usable | Main Codex | Screenshot + local Ask smoke | Pending | QA needed |
| `/needs-upgrade` | Populated | Web/mobile Needs Upgrade | `FX-DETAIL-METADATA`, `FX-DETAIL-FAILED` | Existing | Align list cards, badges, empty state | Main Codex | Screenshot + navigation | Pending | QA needed |
| `/needs-upgrade` | Empty | Web PRD | `FX-LIBRARY-EMPTY` | Unknown | Add/verify empty state | Main Codex | Screenshot | Pending | QA needed |
| `/ask` | Empty prompt | Web/mobile Ask | `FX-AUTH-LOGGED-IN` | Existing | Align composer/scope/history visuals | Main Codex | Screenshot + keyboard focus | Pending | QA needed |
| `/ask` | Loading, citations, error, no context | Web/mobile Ask + PRD | `FX-ASK-CITATIONS`, `FX-ASK-NO-CONTEXT` | Existing/partial | Preserve API behavior, improve states | Main Codex | Local Ask smoke | Pending | QA needed |
| `/capture` | URL/text/PDF/note | Web/mobile Capture | `FX-CAPTURE-URL-SUCCESS`, `FX-CAPTURE-PDF` | Existing | Align tabs/result banners/states | Main Codex | Screenshot + local mutation | Pending | QA needed |
| `/capture` | Duplicate/invalid/provider failure | PRD + current capture contracts | `FX-CAPTURE-DUPLICATE`, `FX-CAPTURE-FAILURE` | Existing/partial | Ensure state copy and actions remain truthful | Main Codex | Local mutation/error smoke | Pending | QA needed |
| `/review` | Attention list | Existing product | `FX-LIBRARY-MIXED` | Existing route, not explicit MP page | Keep if in nav/route set; align tokens only | Main Codex | Screenshot | Pending | QA needed |
| `/more` | Mobile nav aggregate | Mobile `MobileMore` | `FX-SHELL-MOBILE` | Existing | Confirm responsive nav only route remains usable | Main Codex | Mobile screenshot | Pending | QA needed |
| `/settings` | Categories shell | Web `DesktopSettings` + PRD settings inventory | `FX-SETTINGS-PROVIDERS` | Existing | Align category layout and provider/storage/export states | Main Codex | Screenshot + API smoke | Pending | QA needed |
| `/settings/collections` | Collection management | Existing product + PRD | `FX-COLLECTION-POPULATED` | Existing | Align tokens and action safety | Main Codex | Screenshot + local CRUD if needed | Pending | QA needed |
| `/settings/tags` | Tag management | Existing product + PRD | `FX-LIBRARY-MIXED` | Existing | Align tokens and action safety | Main Codex | Screenshot + local CRUD if needed | Pending | QA needed |
| `/settings/device-pairing` | Code active, missing token, exchange states | Web `DesktopPairDevice` + current API | `FX-PAIR-CODE-ACTIVE`, `FX-PAIR-CODE-EXPIRED` | Existing | Align UI, preserve redaction and short-lived code behavior | Main Codex | Browser + Android pairing smoke | Pending | QA needed |
| `/topics/[slug]` | Populated/not found | Web/mobile Topic | `FX-TOPIC-POPULATED`, `FX-TOPIC-EMPTY` | Existing | Align layout and actions | Main Codex | Screenshot + Ask scope link | Pending | QA needed |
| `/collections/[id]` | Populated/empty/not found | Web/mobile Collection | `FX-COLLECTION-POPULATED`, `FX-COLLECTION-EMPTY` | Existing | Align layout and actions | Main Codex | Screenshot + Ask scope link | Pending | QA needed |
| `/offline.html` | Offline fallback | Android PRD + existing public asset | `FX-OFFLINE-ASSETS` | Existing | Smoke asset and copy; no auth redirect | Main Codex | Public route smoke + Android offline | Pending | QA needed |
| `/manifest.webmanifest`, icons | Public assets | Web PRD asset gate | `FX-OFFLINE-ASSETS` | Existing | Smoke manifest/icons after build/deploy | Main Codex | HTTP smoke | Pending | QA needed |
