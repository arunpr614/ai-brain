import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { NextConfig } from "next";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin workspace root so Turbopack stops guessing against ancestor lockfiles.
  turbopack: {
    root: projectRoot,
  },
  // Keep native + dynamically-resolved modules on the Node side of the server bundle.
  // sqlite-vec uses `import.meta.resolve` to locate its prebuilt binary, which
  // Turbopack's module graph can't statically rewrite.
  serverExternalPackages: ["better-sqlite3", "sqlite-vec"],
  // Allow dev-mode HMR + React hydration bundle requests from the Cloudflare
  // tunnel origin (brain.arunp.in → 127.0.0.1:3000). Without this, Next.js 16
  // blocks /_next/webpack-hmr as a cross-origin dev resource and React never
  // hydrates, leaving buttons visually rendered but event-handler-less.
  allowedDevOrigins: ["brain.arunp.in"],
};

export default nextConfig;
