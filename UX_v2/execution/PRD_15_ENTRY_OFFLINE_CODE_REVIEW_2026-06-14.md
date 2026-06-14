# PRD-15 Entry / Offline Fallback Code Review

Created: 2026-06-14 12:33 IST
Reviewer: Codex lead integrator
Scope: PRD-15 server-unreachable / offline-before-pairing Android fallback only
Verdict: APPROVE for local deploy-ready state; production release remains gated

## Reviewed Files

- `capacitor.config.ts`
- `public/offline.html`
- Generated Android assets inspected after `npx cap sync android`:
  - `android/app/src/main/assets/capacitor.config.json`
  - `android/app/src/main/assets/public/offline.html`
- `UX_v2/execution/ANDROID_RUNTIME_CHECK_2026-06-14.md`

## Review Frame

This review checked only the approved PRD-15 fallback lane: server-unreachable entry state, offline-before-pairing copy, Android app-name/config freshness, and avoiding QR/offline-queue overclaims. It did not treat active offline capture, QR pairing, Android package-ID migration, or live deployment as approved.

## Findings

### P0

No P0 findings.

### P1

No P1 findings.

### P2

No P2 findings.

### P3

1. Residual: `public/offline.html` duplicates the production server origin from `capacitor.config.ts`.

   Risk: If the Android `server.url` changes, the local `server.errorPath` fallback links could point users back to the old origin.

   Current mitigation: The duplicate constant is commented in the offline page as intentionally kept in sync with `capacitor.config.ts server.url`. This is acceptable for the current PRD-15 slice because the fallback page is static and cannot import app configuration.

   Follow-up if this changes often: generate a tiny static config asset during the Capacitor sync/build step.

## Data-Safety Review

- No schema migration was added.
- No API or storage write behavior changed.
- No auth bypass was added.
- No offline capture queue, offline Ask, offline export, or sync behavior was added.
- No QR pairing behavior was added.
- Rollback is code-only: remove `server.errorPath` from `capacitor.config.ts` and revert the offline-page link rewrite.
- Production DB backup remains mandatory before release even though this slice is config/static-page only.

## Verification

- `npx cap sync android` passed and generated Android config with `appName: "AI Memory"` plus `server.errorPath: "offline.html"`.
- `diff -u android/app/src/main/assets/public/offline.html public/offline.html` had no differences after sync.
- `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew assembleDebug` passed from `android/`.
- Final APK: `android/app/build/outputs/apk/debug/brain-debug-v1.0.2-code3.apk`.
- Final APK SHA-256: `d360f25735180bcac7ad51180788772438a01a7586a9144ce212878786f98e1e`.
- Final APK size: `7,862,055 bytes`.
- APK `assets/capacitor.config.json` contains `server.errorPath: "offline.html"`.
- APK `assets/public/offline.html` contains `AI Memory needs the server`, `Pair device`, and `primaryServerOrigin = "https://brain.arunp.in"`.
- `npm run typecheck` passed.
- `apksigner verify --verbose --print-certs` passed.
- `aapt dump badging` still reports package `com.arunprakash.brain`, version `1.0.2` / code `3`, label `AI Memory`, min SDK `24`, target SDK `36`.
- Emulator clean app data + first launch with no default network now shows the bundled branded fallback instead of native WebView `net::ERR_NAME_NOT_RESOLVED`.
- Evidence: `UX_v2/execution/evidence/android/android-errorpath-offline-first-launch-2026-06-14.png`.

## Non-Findings / Deferred Gates

- The Android package ID remains `com.arunprakash.brain` per D-013.
- Camera permission and QR-related manifest comments were not removed because QR/package-ID decisions remain open.
- Live Android online/share UI still loads current production web assets until a staged/live web deploy is approved.
- Full pairing/token validation remains blocked by missing authenticated pairing-code access.
- Full paired share capture/result validation remains blocked by pairing/token access and live asset staleness.
- Production/live deploy has not been requested or performed.

## Approval Rationale

The PRD-15 fallback fix stays within approved scope: it gives Android a branded server-unreachable fallback before first successful online load, keeps copy truthful about server-required behavior, and avoids QR/offline-queue promises. No P0/P1/P2 release-blocking findings remain for this slice, but production release is still a no-go until the broader Android/live/pairing gates pass.
