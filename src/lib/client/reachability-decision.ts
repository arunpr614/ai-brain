/**
 * Single-probe reachability check for APK pairing (T-CF-6).
 *
 * Pre-pivot this was a two-step decision tree (try the mDNS host then
 * fall back to a scanned IP). Post-pivot there is exactly one origin — the
 * Cloudflare named tunnel at `BRAIN_TUNNEL_URL` — so the logic collapses
 * to "probe once, report the verdict". Kept as a separate module so the
 * setup-apk page stays thin and we keep unit-test coverage of the probe
 * contract without rendering the component.
 */
import { BRAIN_TUNNEL_URL } from "@/lib/config/tunnel";
import {
  probeReachability,
  describeVerdict,
  type ReachabilityVerdict,
} from "./reachability";

export type ResolveVerdict =
  | { ok: true; base: string }
  | { ok: false; reason: string };

export interface ResolveOptions {
  /** Bearer token scanned from the QR (used on the single probe). */
  token: string;
  /** Probe timeout in ms, default 2000. */
  timeoutMs?: number;
  /** Injectable for tests; defaults to the real probeReachability. */
  probe?: typeof probeReachability;
}

export async function resolveBaseUrl(opts: ResolveOptions): Promise<ResolveVerdict> {
  const { token, timeoutMs = 2000, probe = probeReachability } = opts;

  const verdict = await probe({
    baseUrl: BRAIN_TUNNEL_URL,
    bearerToken: token,
    timeoutMs,
  });
  if (verdict.ok) return { ok: true, base: BRAIN_TUNNEL_URL };

  return {
    ok: false,
    reason: formatFailure(verdict),
  };
}

function formatFailure(v: ReachabilityVerdict): string {
  return `Could not reach ${BRAIN_TUNNEL_URL}. ${describeVerdict(v)}`;
}
