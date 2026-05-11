/**
 * LAN connection-info helpers (v0.5.0 T-8).
 *
 * Single source of truth for the IP/token/QR trio surfaced on
 * /settings/lan-info and consumed by the APK QR scanner + the extension
 * options page. Pure module — the settings page + API route compose it;
 * the rotate endpoint mutates .env via ensureLanToken()'s upsert pattern.
 */
import { networkInterfaces } from "node:os";
import { generateLanToken } from "@/lib/auth/bearer";
import { BRAIN_TUNNEL_URL } from "@/lib/config/tunnel";
import * as nodeFs from "node:fs";
import * as nodePath from "node:path";

/**
 * First non-loopback IPv4 address of this host. Picks the first `en*` or
 * `wl*` interface (macOS/Linux LAN convention); falls back to any non-
 * internal IPv4 if nothing matches. Returns the string form or null when
 * the host has no external interface (offline, sandboxed CI).
 */
export function getLanIpv4(): string | null {
  const ifs = networkInterfaces();
  const addrs: string[] = [];
  for (const [name, list] of Object.entries(ifs)) {
    if (!list) continue;
    for (const a of list) {
      if (a.family === "IPv4" && !a.internal) {
        if (name.startsWith("en") || name.startsWith("wl")) return a.address;
        addrs.push(a.address);
      }
    }
  }
  return addrs[0] ?? null;
}

/**
 * Rotate BRAIN_LAN_TOKEN — generate a fresh token, upsert into .env, mutate
 * process.env so the new value is live for the current server process.
 * Mirrors ensureLanToken()'s file-handling semantics (chmod 600, preserve
 * other lines). Called from POST /api/settings/rotate-token.
 *
 * Returns the new token so the caller can log a truncated fingerprint
 * without re-reading process.env.
 */
export function rotateLanToken(options?: { envPath?: string }): string {
  const envPath = options?.envPath ?? nodePath.resolve(process.cwd(), ".env");
  const token = generateLanToken();
  const line = `BRAIN_LAN_TOKEN=${token}`;

  let body = "";
  if (nodeFs.existsSync(envPath)) {
    body = nodeFs.readFileSync(envPath, "utf8");
  }
  if (/^BRAIN_LAN_TOKEN=.*$/m.test(body)) {
    body = body.replace(/^BRAIN_LAN_TOKEN=.*$/m, line);
  } else {
    if (body.length > 0 && !body.endsWith("\n")) body += "\n";
    body += `${line}\n`;
  }
  nodeFs.writeFileSync(envPath, body, { mode: 0o600 });
  process.env.BRAIN_LAN_TOKEN = token;
  return token;
}

/**
 * Build the URI that the APK QR scanner consumes. Schema `brain://setup?
 * url=<tunnel-url>&token=<token>` keeps the payload deep-link-friendly.
 * The `url` is always the build-time tunnel constant — no more IP
 * plumbing post-pivot (T-CF-4).
 */
export function buildSetupUri(token: string): string {
  const u = new URL("brain://setup");
  u.searchParams.set("url", BRAIN_TUNNEL_URL);
  u.searchParams.set("token", token);
  return u.toString();
}
