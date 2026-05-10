# SPIKE-005 — Does `share-handler.tsx` still need Capacitor.Preferences URL lookup now that the named tunnel URL is stable?

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-005 |
| **Date** | 2026-05-10 20:14 |
| **Author** | AI agent (Claude) |
| **Time box** | 10 min |
| **Triggered by** | SPIKE-002 flagged `src/components/share-handler.tsx:62` has `getBrainUrl()` reading from Capacitor.Preferences and defaulting to `http://brain.local:3000`. Named tunnel URL is stable — is runtime URL lookup still justified? |
| **Blocks** | T-CF-2 (share-handler default edit), plan v2.0 pairing UX scope |
| **Verdict** | **PROCEED-WITH-CHANGES** — runtime URL lookup is unnecessary for named tunnel. Simplify `getBrainUrl()` to a constant. Also flags a next.config audit finding: no `allowedDevOrigins` or CSP that blocks the pivot. |

## Question

In the LAN-era design, `share-handler.tsx` read the Brain URL from
Capacitor.Preferences at runtime so the QR-scanner flow could store
a per-user-installed URL (different Macs = different LAN IPs). With
the pivot to a single stable named tunnel URL (`brain.arunp.in`),
is the runtime lookup still justified, or can it be hardcoded?

Secondary: does `next.config.ts` have any allow-list (`allowedDevOrigins`,
`images.domains`, CSP) that the pivot would break?

## Method

```bash
# Inspect share-handler.tsx URL-resolution logic
sed -n '55,75p' src/components/share-handler.tsx

# Next.js config audit
ls next.config.*
cat next.config.ts
```

## Evidence

### share-handler.tsx `getBrainUrl()` (lines 58–65)

```typescript
async function getBrainUrl(): Promise<string> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: "brain_url" });
    return value ?? "http://brain.local:3000";
  } catch {
    return "http://brain.local:3000";
  }
}
```

The function tries Capacitor.Preferences first (populated by the
QR-scan setup flow in `src/app/setup-apk/page.tsx`). Falls back to
`http://brain.local:3000` on any error (plugin not available,
key missing).

### next.config.ts

```typescript
const nextConfig: NextConfig = {
  turbopack: { root: projectRoot },
  serverExternalPackages: ["better-sqlite3", "sqlite-vec"],
};
```

**No** `allowedDevOrigins`, `images.domains`, CSP headers, or
host-allow-lists. Clean.

## Findings

### The Preferences-based URL read is over-engineered for named tunnel

**LAN-era justification (no longer applies):**
- Different users on different Macs had different LAN IPs → stored
  IP had to come from the QR scan.
- Some users' routers gave reserved IPs, others DHCP-rotated → the
  Preferences-stored value could be updated at any time.
- `brain.local` mDNS might work or might not (D-v0.5.0-3 fallback
  tree).

**Named-tunnel reality:**
- All users of this Brain install (one Mac + N phones) connect to
  the same URL: `https://brain.arunp.in`.
- URL is stable — doesn't rotate, doesn't change per-network.
- No mDNS, no fallback tree — single probe against the tunnel.
- The Preferences key `brain_url` is written during QR-scan setup,
  but the QR's `url` parameter will always be `https://brain.arunp.in`.
- Reading Preferences at runtime adds a ~5ms dynamic-import cost on
  every share intent — to retrieve a constant.

**However** — there's one legitimate reason to keep Preferences:
- If the user moves to a *different* Mac (second install, shared
  installation) with a *different* domain (`brain.alice.in` vs
  `brain.bob.com`), the Preferences-stored URL is the discriminator.
- But this is a v0.6.0+ multi-instance concern, not v0.5.0.

**For v0.5.0 (single-user, single-domain):** hardcode the URL. Remove
the Preferences read and its async overhead. The same simplification
applies to `src/app/setup-apk/page.tsx` which writes this key.

### next.config.ts is clean

No config changes needed for the pivot. The pivot adds a new origin
(`brain.arunp.in`) but:
- `allowedDevOrigins` is only for Next.js dev-server cross-origin
  requests; not in use here.
- CSP headers aren't set in Next config (could be set via middleware
  if needed; out of scope for pivot).
- `images.domains` not relevant.

**If** a future task wants to add CSP headers scoping `connect-src`,
the named tunnel URL must be added there. Not a blocker for v0.5.0.

### One adjacent concern flagged

`getBrainUrl()` is also called from inside the share-handler
(`reportClientError` callback). That function posts errors to
`/api/errors/client` using the resolved URL. Same hardcode
simplification applies there.

## Implementation recommendation

**For plan v2.0 T-CF-2 (or adjacent cleanup task):**

Replace `getBrainUrl()` in `src/components/share-handler.tsx`:

```typescript
// Before (LAN-era Preferences lookup):
async function getBrainUrl(): Promise<string> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: "brain_url" });
    return value ?? "http://brain.local:3000";
  } catch {
    return "http://brain.local:3000";
  }
}

// After (named-tunnel static constant):
const BRAIN_TUNNEL_URL = "https://brain.arunp.in";
// Exported only for share-handler internal use; keeping a Preferences
// key for v0.6.0+ multi-instance scenarios is tracked separately.

// Call sites change from:
//   const base = await getBrainUrl();
// To:
//   const base = BRAIN_TUNNEL_URL;
```

Or even simpler: inline the constant at call sites, eliminate
`getBrainUrl()` entirely. 4 call sites to update.

**Preferences-write side (setup-apk/page.tsx):**

The QR-scan flow's `writePreferences(token, baseUrl)` currently writes
both `brain_token` AND `brain_url`. The `brain_url` write can be
removed — token is still per-pairing (rotates), URL is static.

**Do NOT remove the `@capacitor/preferences` plugin.** It's still the
right home for the bearer token (rotates, not a build-time constant).

**Defer multi-instance justification to v0.6.0 backlog:** add a
backlog note "If we ever support multi-instance (user has two Macs
with two domains), restore Preferences-based URL resolution."

## Risks / gaps surfaced

1. **Hardcoding `https://brain.arunp.in` into a committed `.tsx` file**
   means the domain is in git history forever. For `arunp.in` (public
   domain anyway), zero privacy loss. But if a future user forks this
   repo and deploys under their own domain, they must edit the
   constant — unlike the Preferences approach, which would just
   require a different QR. Plan v2.0 may want a `BRAIN_TUNNEL_URL`
   constant in a single module for ergonomics:
   `src/lib/config/tunnel.ts::BRAIN_TUNNEL_URL`.

2. **The QR-scan setup flow becomes slightly redundant.** If the URL is
   hardcoded, the QR only carries the token. Arguably the QR becomes
   a token-only pairing — similar to TOTP setup QRs. Plan v2.0 QR
   schema decision (T-CF-4) should address this: does the QR still
   carry `url=...` (defense-in-depth) or is it token-only?

3. **Failed-lookup fallback** (the current `catch` branch) becomes
   dead code. Good to delete, but verify no other caller depends on
   the fallback semantics.
