import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { NextConfig } from "next";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Self-contained production bundle for Hetzner deploy (no node_modules needed).
  output: "standalone",
  // Runtime state must never be copied into the standalone deploy artifact.
  // Next's file tracer can be over-broad when server code references
  // process.cwd()/data paths; keep databases, backups, APK artifacts, and
  // spike outputs out of production bundles.
  outputFileTracingExcludes: {
    "/*": ["./data", "./data/**/*"],
  },
  // Pin workspace root so Turbopack stops guessing against ancestor lockfiles.
  turbopack: {
    root: projectRoot,
  },
  // Hide the Next.js dev-mode "N" indicator. The APK WebView loads the
  // dev server via the Cloudflare tunnel, so the indicator overlaps the
  // mobile bottom-nav's Library tab. Off in dev; production builds have
  // never rendered it. Reported via APK on Pixel 7 Pro 2026-05-14.
  devIndicators: false,
  // Keep native + dynamically-resolved modules on the Node side of the server bundle.
  // sqlite-vec uses `import.meta.resolve` to locate its prebuilt binary, which
  // Turbopack's module graph can't statically rewrite.
  serverExternalPackages: ["better-sqlite3", "sqlite-vec"],
  // Allow dev-mode HMR + React hydration bundle requests from the Cloudflare
  // tunnel origin (brain.arunp.in → 127.0.0.1:3000). Without this, Next.js 16
  // blocks /_next/webpack-hmr as a cross-origin dev resource and React never
  // hydrates, leaving buttons visually rendered but event-handler-less.
  allowedDevOrigins: ["brain.arunp.in"],
  // v0.6.1 T-3: HTTP security headers for the public domain. CSP intentionally
  // omitted — see plan §1 (deferred to v0.6.3) — because the inline themeScript
  // in layout.tsx would need nonce wiring before a strict CSP ships.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  // v0.6.1 T-12: route renamed from /settings/lan-info to /settings/device-pairing.
  // 308 keeps any bookmarked link (or stale extension docs) working.
  async redirects() {
    return [
      {
        source: "/settings/lan-info",
        destination: "/settings/device-pairing",
        permanent: true,
      },
      {
        source: "/api/settings/lan-info",
        destination: "/api/settings/device-pairing",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
