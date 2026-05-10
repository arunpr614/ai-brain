import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor 8.3.3 configuration for the Brain APK (v0.5.0).
 *
 * Thin-WebView architecture: the APK is a shell that loads the live
 * Next.js server on the Mac. No static export, no bundled app.
 *
 * `webDir: 'public'` serves only as the offline fallback bundle that
 * Capacitor ships inside the APK — when `server.url` is unreachable,
 * the WebView falls back to this directory. `public/offline.html` is
 * the primary fallback page.
 *
 * `server.url` points at the Cloudflare named tunnel mapped to the
 * user's domain. Setup at `cloudflared tunnel route dns brain
 * brain.arunp.in`. This URL is STABLE — named tunnels do not rotate
 * (unlike quick tunnels at `*.trycloudflare.com`), so this value is a
 * build-time constant, not an env var. See
 * `docs/plans/v0.5.0-CLOUDFLARE-RESEARCH.md` §6 + the v2.0 pivot plan.
 *
 * `androidScheme: "https"` matches the HTTPS tunnel — named tunnels
 * terminate TLS at the Cloudflare edge and present a real CA-signed
 * certificate for `brain.arunp.in`. The legacy `"http"` value was a
 * LAN-era artifact paired with `network_security_config.xml`'s
 * cleartext-permitted configuration (both now deleted by the pivot).
 *
 * CapacitorHttp is enabled so the share-handler can stream PDF
 * content-URIs as multipart uploads (share-intent flow) without
 * loading the full file into the WebView heap. This is orthogonal to
 * the tunnel — it's about content:// URI resolution on Android.
 */
const config: CapacitorConfig = {
  appId: "com.arunprakash.brain",
  appName: "Brain",
  webDir: "public",
  server: {
    url: "https://brain.arunp.in",
    androidScheme: "https",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
