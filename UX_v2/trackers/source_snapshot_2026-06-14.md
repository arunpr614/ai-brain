# Source Snapshot For UX v2 Planning Package

Captured: 2026-06-14 08:14:30 IST
Purpose: make the feature classification reproducible in a dirty worktree.

## Git And Artifact Snapshot

| Field | Value |
| --- | --- |
| Repo path | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2` |
| Branch | `codex/v0.7.7-deployment-hygiene` |
| Upstream | `origin/codex/v0.7.7-deployment-hygiene` |
| HEAD | `c33166e4c9b9a3af86165b1b83aaea355174ccd7` |
| Dirty entries at snapshot | `174` |
| UX_v2 files before remediation edits | `41` |
| Design screenshot files | `17` including `SCREENSHOT_EXPORT_INDEX.md` |
| Design source-export files | `63` |

## Critical Source Citations

| Claim | Evidence |
| --- | --- |
| Android is a thin Capacitor WebView shell | `capacitor.config.ts:6` through `capacitor.config.ts:12`; `android/app/src/main/java/com/arunprakash/brain/MainActivity.java:3` through `android/app/src/main/java/com/arunprakash/brain/MainActivity.java:5` |
| Android loads the hosted web app | `capacitor.config.ts:42` through `capacitor.config.ts:44` |
| Android app name is AI Memory but package id still uses brain | `capacitor.config.ts:39` through `capacitor.config.ts:40` |
| Offline fallback is bundled from `public` | `capacitor.config.ts:9` through `capacitor.config.ts:12`; `public/offline.html:6` |
| Android share intents are registered on MainActivity | `android/app/src/main/AndroidManifest.xml:25` through `android/app/src/main/AndroidManifest.xml:62` |
| Android share handler currently uses alerts/direct routing for several states | `src/components/share-handler.tsx:78` through `src/components/share-handler.tsx:84`; `src/components/share-handler.tsx:100` through `src/components/share-handler.tsx:103`; `src/components/share-handler.tsx:184` through `src/components/share-handler.tsx:192` |
| Desktop nav includes Library, Needs Upgrade, Ask, Capture, Settings | `src/components/sidebar.tsx:32` through `src/components/sidebar.tsx:38` |
| Mobile bottom nav includes Library, Capture, Ask, More | `src/components/sidebar.tsx:294` through `src/components/sidebar.tsx:344` |
| Capture is route-aware on mobile | `src/components/sidebar.tsx:97` through `src/components/sidebar.tsx:104`; `src/components/sidebar.tsx:309` through `src/components/sidebar.tsx:329` |
| Library multi-select can route to Ask selected | `src/components/library-list.tsx:194` through `src/components/library-list.tsx:201`; `src/components/library-list.tsx:295` through `src/components/library-list.tsx:305` |
| Ask API supports only library, item, and items scopes | `src/app/api/ask/route.ts:31` through `src/app/api/ask/route.ts:39` |
| Ask API validates item/items scope inputs | `src/app/api/ask/route.ts:61` through `src/app/api/ask/route.ts:73` |
| Retriever supports item/itemIds but not high-quality-only filtering | `src/lib/retrieve/index.ts:41` through `src/lib/retrieve/index.ts:52`; `src/lib/retrieve/index.ts:104` through `src/lib/retrieve/index.ts:171` |
| Chat thread schema currently models only library/item scopes | `src/db/chat.ts:10`; `src/db/chat.ts:38` through `src/db/chat.ts:50`; `src/db/chat.ts:62` through `src/db/chat.ts:78` |
| Capture URL API returns duplicate and upgraded actions | `src/app/api/capture/url/route.ts:75` through `src/app/api/capture/url/route.ts:98`; `src/app/api/capture/url/route.ts:120` through `src/app/api/capture/url/route.ts:147`; `src/app/api/capture/url/route.ts:179` |
| Weak-capture upgrade path updates item fields directly | `src/db/items.ts:287` through `src/db/items.ts:325` |
| Needs Upgrade query is based on capture quality/warnings | `src/db/items.ts:123` through `src/db/items.ts:130`; `src/db/items.ts:228` through `src/db/items.ts:240`; `src/db/items.ts:256` through `src/db/items.ts:264` |
| Library quality filters are source-backed | `src/db/items.ts:167` through `src/db/items.ts:190` |
| Item detail already uses source/capture quality state | `src/app/items/[id]/page.tsx:113` through `src/app/items/[id]/page.tsx:120`; `src/app/items/[id]/page.tsx:673` through `src/app/items/[id]/page.tsx:674` |

## Snapshot Caveat

This snapshot is evidence for planning only. Because the worktree is dirty, any future implementation slice must create a new snapshot before editing code and must not assume these citations still describe the current source.
