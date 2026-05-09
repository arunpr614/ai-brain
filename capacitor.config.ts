import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor 8.3.3 configuration for the Brain APK (v0.5.0 T-9 / F-014).
 *
 * Thin-WebView architecture: the APK is a shell that loads the live
 * Next.js server on the Mac. No static export, no bundled app.
 *
 * `webDir: 'public'` serves only as the offline fallback bundle that
 * Capacitor ships inside the APK — when `server.url` is unreachable,
 * the WebView falls back to this directory (plan §6.4 + T-14 offline
 * screen). `public/offline.html` lands in T-14.
 *
 * `server.url` points at `brain.local` (the macOS LocalHostName set
 * via `sudo scutil --set LocalHostName brain`, T-7 deferred to
 * pre-T-21). The QR-IP fallback (D-v0.5.0-3) is wired at runtime via
 * @capacitor/preferences, not static config.
 *
 * Cleartext traffic policy lives in android/app/src/main/res/xml/
 * network_security_config.xml (T-10 / D-v0.5.0-4 — <base-config
 * cleartextTrafficPermitted="true"/>). Do NOT add `cleartext: true`
 * to this file — it would overlay a blanket usesCleartextTraffic
 * attribute that the per-build XML is trying to document more
 * carefully.
 *
 * CapacitorHttp is enabled so the share-handler can stream PDF
 * content-URIs as multipart uploads (T-13 / F-039) without loading
 * the full file into the WebView heap.
 */
const config: CapacitorConfig = {
  appId: "com.arunprakash.brain",
  appName: "Brain",
  webDir: "public",
  server: {
    url: "http://brain.local:3000",
    androidScheme: "http",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
