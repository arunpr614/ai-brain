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
};

export default nextConfig;
