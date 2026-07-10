# Mobile, Extension, and Pairing

Purpose: Explain non-web clients, authentication exchange, capture attribution, and distribution status.
Audience: AI agents working on Android, extension, pairing, or client connectivity.
Verified against: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` and `8178117c80923e5724e355fb2684cbc836013d39`.
Runtime evidence through: 2026-06-17 for tied Android/web evidence; complete production tree SHA is Unknown.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

## Android Architecture

The Android application is a Capacitor shell around the hosted web app with native share-target integration. It accepts note, URL, and PDF shares, builds authenticated capture requests, and renders an honest source-specific result. Reachability and offline fallback are client-state concerns separate from server health.

Pinned source: [Android activity](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/android/app/src/main/java/com/arunprakash/brain/MainActivity.java), [share request helpers](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/android-share/request.ts), and [result model](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/android-share/result.ts).

Android runtime evidence covers authenticated routes, pairing persistence, note/URL share, attribution, log hygiene, offline/recovery, keyboard behavior, and platform accessibility order. The artifact is a private debug sideload, not a public store or release-signed distribution.

## Pairing

The web settings surface creates a short-lived pairing code. The Android client exchanges it for the existing bearer credential through dedicated pairing routes. Codes expire and are one-time. Token display, exchange, storage, and logging must never expose credential values in screenshots, logs, or documentation.

Pinned source: [pairing creation](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/device-pairing/create-route-handler.ts) and [exchange](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/device-pairing/exchange-route-handler.ts).

## Browser Extension

The extension offers popup/options capture and background/context-menu capture. The main baseline adds selected-text capture and later recovery-aware behavior not present in the worktree source.

Pinned source: [worktree extension](https://github.com/arunpr614/ai-brain/tree/8178117c80923e5724e355fb2684cbc836013d39/extension) and [main selected-text capture](https://github.com/arunpr614/ai-brain/blob/2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a/src/lib/capture/selected-text.ts).

## Failure Modes

- Pairing code expired, already used, or created against another runtime.
- Hosted app unreachable while the device still has cached shell assets.
- Share intent lacks expected content or MIME type.
- Client and server API versions differ.
- Capture succeeds but result attribution or quality is wrong.
- Debug logs expose request payloads if native bridge logging regresses.

Use [Command Safety](Command-Safety) before builds or device operations. APK builds are W2 local persistent writes.
