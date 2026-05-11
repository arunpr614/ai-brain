/**
 * Cloudflare named tunnel — single source of truth for the public Brain URL.
 *
 * Post-pivot (2026-05-11), all Capacitor APK and Chrome extension traffic
 * reaches the Mac-local Next.js server via this public HTTPS origin. The
 * `cloudflared` tunnel terminates TLS at Cloudflare's edge and forwards to
 * `localhost:3000` over an outbound QUIC connection.
 */
export const BRAIN_TUNNEL_URL = "https://brain.arunp.in";
