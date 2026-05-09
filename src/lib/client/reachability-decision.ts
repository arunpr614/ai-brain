/**
 * D-v0.5.0-3 reachability decision tree (v0.5.0 T-16 / plan v1.3 extraction).
 *
 * Originally inline in `src/app/setup-apk/page.tsx`; pulled here as a
 * pure module so the two-path mDNS → IP fallback logic gets real unit
 * test coverage instead of only being reachable through a rendered
 * component. Matches the contract in plan §3.2 D-v0.5.0-3:
 *
 *   1. Try http://brain.local:3000/api/health (mDNS path).
 *   2. Try http://<scanned-ip>:3000/api/health (DHCP fallback).
 *   3. Neither: return error with the more-specific verdict message.
 *
 * Returns the base URL that succeeded so the caller persists it as
 * `brain_url` in Capacitor Preferences. The scanned IP is the
 * canonical fallback — it always ships with the QR, so there's no
 * "unknown IP" edge case.
 */
import {
  probeReachability,
  describeVerdict,
  type ReachabilityVerdict,
} from "./reachability";

export type ResolveVerdict =
  | { ok: true; base: string; via: "mdns" | "ip" }
  | { ok: false; reason: string };

export interface ResolveOptions {
  /** LAN IPv4 scanned from the QR. */
  ip: string;
  /** Bearer token scanned from the QR (used on both probe attempts). */
  token: string;
  /** Per-probe timeout in ms, default 2000. Max wall-clock is 2x. */
  timeoutMs?: number;
  /** Injectable for tests; defaults to the real probeReachability. */
  probe?: typeof probeReachability;
}

const MDNS_BASE = "http://brain.local:3000";

export async function resolveBaseUrl(opts: ResolveOptions): Promise<ResolveVerdict> {
  const { ip, token, timeoutMs = 2000, probe = probeReachability } = opts;

  const mdnsVerdict = await probe({
    baseUrl: MDNS_BASE,
    bearerToken: token,
    timeoutMs,
  });
  if (mdnsVerdict.ok) return { ok: true, base: MDNS_BASE, via: "mdns" };

  const ipBase = `http://${ip}:3000`;
  const ipVerdict = await probe({
    baseUrl: ipBase,
    bearerToken: token,
    timeoutMs,
  });
  if (ipVerdict.ok) return { ok: true, base: ipBase, via: "ip" };

  return {
    ok: false,
    reason: formatFailure(mdnsVerdict, ipVerdict, ipBase),
  };
}

function formatFailure(
  mdns: ReachabilityVerdict,
  ip: ReachabilityVerdict,
  ipBase: string,
): string {
  // IP-fallback is the more reliable diagnostic — in the common
  // "Mac off Wi-Fi" case mDNS AND IP both time out, but an "unauthorized"
  // or "forbidden" on IP tells us Brain IS reachable and the token is
  // bad. Surface the IP verdict.
  return `Tried ${MDNS_BASE} and ${ipBase}. ${describeVerdict(ip)}`;
}
