# R-CAP: Capacitor Android Share-Target Integration

**Research ID:** R-CAP | **Status:** complete | **Date:** 2026-05-07 | **Author:** research agent

---

## 1. TL;DR recommendation

Use **`@capawesome/capacitor-android-share-target`** — it is the most maintained community option, ships explicit Android 14 support, and requires ~10 lines of config with no Kotlin authoring. If it breaks during build or fails on first boot, the fallback is a ~50-line native Kotlin `Activity` in the generated `android/` directory plus a thin Capacitor plugin bridge (§8). Try the plugin first; escalate to native only if blocked by a reproducible bug.

---

## 2. Current state of share-target plugins (2025–2026)

### `@capawesome/capacitor-android-share-target`

- **Repo:** `https://github.com/capawesome-team/capacitor-android-share-target`
- **Latest version (as of research cutoff):** `6.x` — tracks Capacitor major versions (5.x shipped Capacitor 5 support, 6.x shipped alongside Capacitor 6). Check `npm info @capawesome/capacitor-android-share-target` for the exact current patch.
- **Maintainer:** Robin Genz (@robingenz), Capawesome team. Active OSS contributor with a strong track record maintaining the broader `@capawesome` plugin suite (filesystem, badge, file-picker, live-update, etc.). No archived status or transfer notices as of research date.
- **Android 14/15 compat:** Capacitor 6 itself targets `compileSdkVersion 34` (Android 14) and is tested against Android 14 in the official Capacitor CI. The share-target plugin hooks into the standard Android `ACTION_SEND` / `ACTION_SEND_MULTIPLE` intent mechanism, which has been stable across Android versions. Android 14 tightened some intent-filter restrictions around **implicit intents** between apps, but the share-sheet flow uses explicit MIME-type filters registered in the manifest — this path is unaffected by the Android 14 implicit-intent restrictions.
- **Android 15 note:** Android 15 (API 35, "Vanilla Ice Cream") tightened back-stack behavior with the `android:enableOnBackInvokedCallback` flag. This affects activity transitions but not share-intent receipt. No known breaking changes for share-target receipt.
- **Known limitation:** The plugin surfaces shared content via a JavaScript event (`appShareReceived`) that fires only when the WebView is ready. This has implications for cold-start timing (see §5).
- **Re-verify trigger:** Run `npm info @capawesome/capacitor-android-share-target` at project setup time and confirm version is `6.x` and was published within the last 12 months.

### `@j4ne/capacitor-plugin-android-share-to-app`

- **Repo:** `https://github.com/j4ne/capacitor-plugin-android-share-to-app`
- **Status:** Low-activity personal plugin. As of research date: no 2025 releases visible, issues appear unanswered. This plugin lacks a documented path for `application/pdf` MIME handling and has no published test matrix for Android 12+.
- **Verdict:** Do not use. Maintenance risk is too high for a must-have user flow.

### Raw native Kotlin (no plugin)

See §8 for the full sketch. Viable fallback; requires ~50 lines of Kotlin in the generated `android/` directory plus a custom Capacitor plugin JS bridge. Fully controllable but adds a native code surface to maintain.

### Other 2026 community options

No other purpose-built Capacitor 6 share-target plugin emerged as a credible maintained alternative as of research date. Ionic's official `@capacitor/` scope does not include a share-target plugin (share-target = "receive from other apps"; Capacitor's `@capacitor/share` = "send to other apps" — the opposite direction). The capawesome plugin is the only well-maintained solution in the `npm` ecosystem for this direction.

---

## 3. Intent-filter setup

Add the following to `android/app/src/main/AndroidManifest.xml` inside the `<application>` tag, as a sibling `<activity>` to the existing Capacitor main activity (or merged into it via `intent-filter` addition depending on plugin install instructions):

```xml
<!-- Share-target intent filters — added by @capawesome/capacitor-android-share-target -->
<!-- The plugin's installation step auto-merges most of this; shown here for reference -->

<activity
    android:name=".ShareTargetActivity"
    android:exported="true"
    android:theme="@style/AppTheme.NoActionBar">

    <!-- 1. Plain text and URLs -->
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="text/plain" />
    </intent-filter>

    <!-- 2. PDF files -->
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="application/pdf" />
    </intent-filter>

    <!-- 3. Images — v0.2.0 stretch for screenshot capture -->
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="image/*" />
    </intent-filter>

    <!-- 4. Multiple files (e.g., bulk PDF share) — optional -->
    <intent-filter>
        <action android:name="android.intent.action.SEND_MULTIPLE" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="application/pdf" />
    </intent-filter>

</activity>
```

**Notes on each MIME type:**

- `text/plain` — covers both bare text ("hello") and URLs. Chrome Android shares URLs as `text/plain` with `EXTRA_TEXT` = the full URL string. This is the primary v0.5.0 case.
- `application/pdf` — Chrome's "Download PDF → Share" flow sends `content://` URIs with this type. The plugin reads the URI and provides a local file path.
- `image/*` — wildcard covers `image/png`, `image/jpeg`, `image/webp`. Used for screenshot-to-capture in a future version. Acceptable to include now (costs nothing, just ignored if unused).
- `SEND_MULTIPLE` — only needed if bulk PDF share is a real use case (unlikely at v0.5.0). Include or omit based on preference.

**Android 14 `android:exported` requirement:** Any `<activity>` with an `<intent-filter>` must explicitly declare `android:exported="true"` or the build will fail on `targetSdkVersion 34+`. This is a hard requirement introduced in Android 12, enforced more strictly in 13/14. The snippet above includes it.

---

## 4. Capture-screen routing

### How the shared payload reaches `/capture`

The flow has two stages: native → WebView → Next.js route.

**Stage 1 — Native to WebView:**
When the user picks "Brain" in the share sheet, Android creates the `ShareTargetActivity`, which reads the intent extras (`EXTRA_TEXT` for plain text/URLs, `EXTRA_STREAM` for files). The capawesome plugin stores the payload and then fires a JavaScript custom event (`appShareReceived`) into the Capacitor WebView. The event payload is a JSON object:

```json
{
  "type": "text/plain",
  "text": "https://example.com/some-article",
  "title": "Some Article"
}
```

For PDF files it includes a `url` field with a `content://` URI.

**Stage 2 — WebView to Next.js route:**
In the Capacitor app, listen for the event in a client component (e.g., `src/components/share-handler.tsx`) that is mounted globally (in `app/layout.tsx`):

```typescript
// pseudocode — not production code
import { ShareTarget } from '@capawesome/capacitor-android-share-target';

ShareTarget.addListener('appShareReceived', (event) => {
  if (event.type === 'text/plain' && event.text?.startsWith('http')) {
    router.push(`/capture?url=${encodeURIComponent(event.text)}`);
  } else if (event.type === 'application/pdf') {
    router.push(`/capture?pdf=${encodeURIComponent(event.url)}`);
  }
});
```

**Stage 3 — `/capture` page reads params:**
`src/app/capture/page.tsx` reads `searchParams.url` (or `.pdf`) and pre-fills the capture form. On form submit it POSTs to the Mac's `/api/capture` endpoint using the LAN IP (`process.env.NEXT_PUBLIC_API_BASE`).

**Static export vs. App Router note:** Because the APK uses `capacitor.config.ts` pointing `server.url` at the Mac LAN IP (e.g., `http://192.168.1.x:3000`), the app is NOT a static export — it's a thin WebView wrapper hitting the live Next.js dev/prod server on the Mac. This means all App Router features (server components, server actions) work normally. Do NOT use `next export` / `output: 'export'` for this setup; that would break server components and the API routes the APK calls. The `next build` step still runs for asset precompilation but the server runs live on the Mac.

---

## 5. Cold-start vs warm-start behavior

### Cold-start (app not in memory)

This is the tricky case. When Android launches the `ShareTargetActivity` and the WebView has not yet initialized:

1. Capacitor boots the WebView, loads the Next.js bundle (hitting the Mac over LAN).
2. The share plugin must hold the intent payload until the WebView signals "ready."
3. The `appShareReceived` event fires **after** WebView init — typically 1–3 seconds on a fast LAN.

**Known gotcha:** If the listener is registered too late (e.g., inside a `useEffect` that runs after a lazy-loaded component), the event fires before the listener is attached and the payload is silently dropped. Mitigation: register the `ShareTarget.addListener` call in `app/layout.tsx` at the root layout level, outside any conditional rendering.

**Capawesome plugin behavior:** The plugin queues the most recent intent and re-fires it on a `getLastShareData()` call. Best practice is to call `ShareTarget.getLastShareData()` on every app resume AND on initial mount, then also listen for the live event. This covers both cold and warm start.

```typescript
// On mount in layout.tsx (pseudocode)
onMount(async () => {
  const last = await ShareTarget.getLastShareData();
  if (last?.text) handleShare(last);
});
ShareTarget.addListener('appShareReceived', handleShare);
```

### Warm-start (app already running in background)

The `appShareReceived` event fires immediately into the already-loaded WebView. No timing issues. Router navigation to `/capture` is instant.

### LAN connectivity edge case

If the Mac is unreachable when a share arrives (Wi-Fi switched, Mac asleep), the WebView fails to load entirely. Handle this with a `capacitor.config.ts` offline fallback: set `server.errorPath` to a bundled offline HTML page that shows "Cannot reach Brain — is your Mac on the same Wi-Fi?". This requires bundling at least one static fallback page into the APK assets.

---

## 6. Testing plan (without needing a physical Pixel yet)

### AVD (Android Virtual Device) setup

Create a Pixel 9 API 35 AVD in Android Studio (matches Android 15):

1. Android Studio → Device Manager → Create Device → Pixel 9 → API 35 (Android 15) system image.
2. Start the AVD. Confirm it boots.

### Test share intent via `adb`

**Share a URL (text/plain):**
```bash
adb shell am start \
  -a android.intent.action.SEND \
  -t text/plain \
  --es android.intent.extra.TEXT "https://www.example.com/test-article" \
  --es android.intent.extra.SUBJECT "Test Article" \
  -f 0x10000000
```

The `-f 0x10000000` flag (`FLAG_ACTIVITY_NEW_TASK`) is required for `am start` to behave like a real share-sheet trigger.

**Share a PDF file from device storage:**
```bash
# First push a test PDF onto the AVD
adb push /path/to/test.pdf /sdcard/Download/test.pdf

# Then trigger a share intent with a file URI
adb shell am start \
  -a android.intent.action.SEND \
  -t application/pdf \
  --eu android.intent.extra.STREAM "file:///sdcard/Download/test.pdf" \
  -f 0x10000000
```

**Note:** `file://` URIs work in AVD testing but real device shares from Chrome/Files app use `content://` URIs (FileProvider). The production plugin handles both. For a more realistic test, use `adb shell content` to stage a file and share via a content URI.

### Validate cold-start

Kill the app first, then fire the intent:
```bash
adb shell am force-stop com.arunprakash.brain
adb shell am start -a android.intent.action.SEND -t text/plain \
  --es android.intent.extra.TEXT "https://example.com" -f 0x10000000
```

Watch for the WebView load + event delivery in Logcat:
```bash
adb logcat -s Capacitor:D ShareTarget:D
```

### LAN connectivity on AVD

The AVD can reach the Mac's LAN IP via the host network. Set `capacitor.config.ts` → `server.url = "http://10.0.2.2:3000"` for AVD testing (`10.0.2.2` is Android's alias for the host machine's `localhost`). On a real Pixel, use the Mac's actual LAN IP.

---

## 7. Sideload + signing

### Debug keystore and `assembleDebug`

Android Studio auto-generates a debug keystore at `~/.android/debug.keystore` (password: `android`, alias: `androiddebugkey`). A debug APK built with `./gradlew assembleDebug` is automatically signed with this keystore — no manual signing step needed.

**Install on device:**
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The `-r` flag reinstalls over an existing version (useful for iterative builds).

### "Install unknown apps" toggle

On Android 14, the device must allow installs from the source you use:
- If installing via `adb` from a Mac: `adb install` bypasses the "unknown sources" UI entirely — it installs directly without any toggle.
- If sideloading via a file manager or browser on the device: Settings → Apps → Special app access → Install unknown apps → enable for "Files" or whichever app you use to open the APK.

### Intent filters and signing restrictions

`text/plain`, `application/pdf`, and `image/*` intent filters do not require a specific signing certificate. They are data MIME type filters, not scheme-based URL filters. The Android 14 restrictions on unverified App Links (which require `android:autoVerify="true"` and HTTPS domain association) apply only to `android.intent.action.VIEW` with `http/https` scheme — not to `ACTION_SEND` MIME-type filters. Debug keystore is fully sufficient.

**Summary:** debug APK + `adb install` + `ACTION_SEND` MIME filters = no signing ceremony required.

### Build command sequence

```bash
# From the project root
npm run build          # Next.js build (asset compilation)
npx cap sync android   # Copies web assets into android/ and updates plugins
cd android
./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Wrap this in `scripts/build-apk.sh` (already planned in BUILD_PLAN.md §10).

---

## 8. Fallback plan if plugin fails

If `@capawesome/capacitor-android-share-target` is abandoned, broken with a future Gradle/AGP version, or has an unresolvable cold-start bug, the fallback is a native-only implementation. No third-party plugin needed — Capacitor explicitly supports editing the generated `android/` directory.

**Shape of the native approach (not full code):**

1. **`ShareActivity.kt`** (~30 lines) — a new `Activity` in `android/app/src/main/java/com/arunprakash/brain/`. On `onCreate`, reads `intent.action`, `intent.type`, and `intent.getStringExtra(Intent.EXTRA_TEXT)` or `intent.getParcelableExtra(Intent.EXTRA_STREAM)`. Converts the payload to a JSON string. Launches `MainActivity` via explicit intent with the JSON as an extra, then calls `finish()`.

2. **`MainActivity.kt`** (modification, ~10 lines) — in `onNewIntent()`, reads the JSON extra from the launched intent and calls a Capacitor bridge method to deliver it to JS.

3. **`SharePlugin.kt`** (~20 lines) — a custom `@CapacitorPlugin`-annotated class that exposes a `getLastShare()` method and a `addListener("shareReceived")` event. The JS side is identical in shape to the capawesome plugin API.

4. **JS glue** (`src/lib/share-bridge.ts`, ~15 lines) — imports the custom plugin and exports the same `handleShare()` interface used throughout the app.

The AndroidManifest.xml intent-filter block is identical regardless of plugin vs. native path (§3 above).

Total native code surface: ~60 lines across 3 files. All lives inside the already-generated `android/` directory. AI-assisted codegen makes this a 30-minute task.

---

## 9. Decision for v0.5.0

**Use `@capawesome/capacitor-android-share-target`.**

- Install: `npm install @capawesome/capacitor-android-share-target`
- Run `npx cap sync` — plugin auto-registers in the Android project.
- Add the intent-filter XML to `AndroidManifest.xml` (§3).
- Register the listener + `getLastShareData()` call in `app/layout.tsx` (§4).
- Test with AVD + `adb am start` (§6) before touching a physical Pixel.
- Use `10.0.2.2:3000` as the server URL during AVD testing; switch to real LAN IP for device.

**Scope for v0.5.0:**
- `text/plain` only (URLs from Chrome). Ship this first.
- `application/pdf` add immediately after — same code path, just a different handler branch.
- `image/*` deferred to v0.2.0 stretch or later (requires OCR pipeline not yet built).

---

## 10. Open risks / re-verify triggers

| Risk | Likelihood | Trigger to re-verify |
|---|---|---|
| Plugin version behind Capacitor 6 | Low — capawesome tracks Capacitor versions | Run `npm info @capawesome/capacitor-android-share-target` at project setup; confirm `6.x` |
| Cold-start event dropped before listener attaches | Medium — documented behavior | Test with AVD cold-start (§6); fix with `getLastShareData()` pattern if needed |
| Android 15 back-stack change breaks share activity lifecycle | Low — doesn't affect intent receipt | Test on API 35 AVD; look for `onBackInvokedCallback` Logcat warnings |
| LAN IP changes (DHCP reassignment) | High — happens regularly | Bake the LAN IP as a runtime-configurable setting in the app (Settings screen), not hardcoded in `capacitor.config.ts`; or use mDNS (`brain.local`) once that feature exists |
| `content://` PDF URI permissions revoked before WebView reads it | Medium — URI permission is scoped to the receiving activity | Ensure the plugin copies file to app-internal storage on receipt; verify plugin changelog for this handling |
| Plugin archived / transferred | Low in 2026 | Check GitHub at project init time; fallback §8 is pre-designed and low-effort |

**Re-verify this document when:**
- Capacitor 7 is released (plugin may need a version bump).
- Android 16 (API 36) developer preview ships and changes intent handling.
- `@capawesome/capacitor-android-share-target` goes more than 12 months without a commit.
