# Reproducibility Snapshot

Captured: 2026-06-14 10:15 IST
Purpose: make the final planning handoff reproducible in a dirty worktree.

## Git And Artifact Snapshot

| Field | Value |
| --- | --- |
| Repo path | `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2` |
| Branch | `codex/v0.7.7-deployment-hygiene` |
| Upstream | `origin/codex/v0.7.7-deployment-hygiene` |
| HEAD | `c33166e4c9b9a3af86165b1b83aaea355174ccd7` |
| Dirty entries at intake | `174` |
| UX_v2 file count before FINAL files | `50` |
| FINAL file count at intake | `0` |
| Design screenshot files | `17` including `SCREENSHOT_EXPORT_INDEX.md` |
| Design source-export files | `63` |

## Path Alias

The `Documents/arunvault` path and the CloudStorage path resolve to the same workspace content. This final package uses `Documents/arunvault` for consistency.

## Critical Source Citations

The following citations are copied forward from inspected current-state planning evidence and line-level source snapshot. Recreate this snapshot before implementation because the worktree is dirty.

| Claim | Evidence |
| --- | --- |
| Android is a thin Capacitor WebView shell | `../../capacitor.config.ts:6` through `:12`; `../../android/app/src/main/java/com/arunprakash/brain/MainActivity.java:3` through `:5` |
| Android loads the hosted web app | `../../capacitor.config.ts:42` through `:44` |
| Android app name is AI Memory but package id still uses brain | `../../capacitor.config.ts:39` through `:40` |
| Offline fallback is bundled from `public` | `../../capacitor.config.ts:9` through `:12`; `../../public/offline.html:6` |
| Android share intents are registered on MainActivity | `../../android/app/src/main/AndroidManifest.xml:25` through `:62` |
| Android share handler uses alert/direct routing paths that need PRD-13 result surface | `../../src/components/share-handler.tsx:78` through `:84`; `:100` through `:103`; `:184` through `:192` |
| Desktop nav includes Library, Needs Upgrade, Ask, Capture, Settings | `../../src/components/sidebar.tsx:32` through `:38` |
| Mobile bottom nav includes Library, Capture, Ask, More | `../../src/components/sidebar.tsx:294` through `:344` |
| Capture is route-aware on mobile | `../../src/components/sidebar.tsx:97` through `:104`; `:309` through `:329` |
| Library multi-select can route to Ask selected | `../../src/components/library-list.tsx:194` through `:201`; `:295` through `:305` |
| Ask API supports only library, item, and items scopes in current evidence | `../../src/app/api/ask/route.ts:31` through `:39` |
| Ask API validates item/items scope inputs | `../../src/app/api/ask/route.ts:61` through `:73` |
| Retriever supports item/itemIds but not proven high-quality-only filtering | `../../src/lib/retrieve/index.ts:41` through `:52`; `:104` through `:171` |
| Chat thread schema currently models only library/item scopes | `../../src/db/chat.ts:10`; `:38` through `:50`; `:62` through `:78` |
| Capture URL API returns duplicate and upgraded actions | `../../src/app/api/capture/url/route.ts:75` through `:98`; `:120` through `:147`; `:179` |
| Weak-capture upgrade path updates item fields directly | `../../src/db/items.ts:287` through `:325` |
| Needs Upgrade query is based on capture quality/warnings | `../../src/db/items.ts:123` through `:130`; `:228` through `:240`; `:256` through `:264` |
| Library quality filters are source-backed | `../../src/db/items.ts:167` through `:190` |
| Item detail already uses source/capture quality state | `../../src/app/items/[id]/page.tsx:113` through `:120`; `:673` through `:674` |

## Snapshot Caveat

This snapshot supports planning only. Any implementation agent must capture a fresh branch/HEAD/dirty count and inspect affected files before code edits.
