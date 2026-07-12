# Android Client and Pairing

Purpose: Document the Capacitor Android client, native share flow, reachability, pairing and offline boundary.
Audience: AI agents changing Android or pairing behavior.
Verified against: `ea7b159515fc37f76ffdb83dedf2d33d17f9a193`.
Runtime evidence through: 2026-07-10 for deployed web/client boundaries; physical-device scope remains feature-specific.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

**Status:** Implemented · **Confidence:** High · **Availability:** Private sideload

The Android app is a Capacitor WebView around the hosted application. Native share accepts text/URL or one PDF, reads the bearer credential from Capacitor Preferences, calls capture APIs, and renders canonical result states. Multiple-PDF input is received by the manifest but intentionally rejected by classification.

Pairing begins in web Settings with a short-lived one-use code. `/setup-apk` exchanges it for the shared global bearer token, stores it locally, checks reachability and returns to the Library. Token rotation invalidates every paired client because there is no per-device credential model.

The service worker caches shell/static/visited-page content and provides an honest offline page. It does not provide a complete offline library, offline capture queue or synchronization. Attached-note IndexedDB protects drafts separately.

This is not a public store/release-signed distribution, native Kotlin product, iOS client, or application-level encrypted store. Primary code: Capacitor/Android configuration, MainActivity/share target, share handler/result/request helpers, pairing/reachability clients/routes and tests. Browser capture is documented separately in [Browser Extension](Browser-Extension).

## User journey and states

Install private APK → open hosted shell → pair if no token → browse normally; or share text/URL/PDF from Android → native intent classification → authenticated capture request → full/limited/duplicate/updated/failure result → open item/repair. Empty/unsupported intents and multiple PDFs fail explicitly. Offline loads cached shell/visited content or the honest fallback; it never claims queued capture.

Loading covers pairing/reachability and capture-request progress. Success stores/uses the authorized client state and shows the canonical result without promising downstream enrichment.

## Architecture, data, APIs, security, and configuration

Android Manifest/MainActivity and the share-target plugin bridge native intents into `src/components/share-handler.tsx`; request/result helpers call capture APIs. Pairing uses the same routes/data described in [Authentication and Pairing](Authentication-Sessions-and-Device-Pairing). Client-local state includes Capacitor Preferences, service-worker caches and browser note journal. Server URL, API compatibility, bearer token and reachability shape behavior. Platform backup and local token storage are security residuals.

## Tests, operations, and change impact

Protecting tests include `src/lib/android-share/request.test.ts`, `result.test.ts`, pairing/reachability/setup tests, capture route tests and Note Focus/browser evidence. Android build/share changes also require manifest/Gradle/Capacitor sync and device-level validation; the repository rules require versionName/versionCode bumps for a new shared APK. Changes can affect capture attribution, MIME/size contracts, result deep links, pairing and offline trust copy. Pinned evidence: [current Android source](https://github.com/arunpr614/ai-brain/tree/23868faf13c8e3d0821715e6f5d0e3d2af1e1a34/android).

Related current features are pairing/authentication, capture, attached-note recovery and the browser extension. Related ideas are full offline library, native Kotlin, iOS and public-store distribution.
