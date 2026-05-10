# v0.5.0 LAN-only approach (ARCHIVED)

**Status:** Superseded 2026-05-09 by the Cloudflare Tunnel pivot. See
`docs/plans/v0.5.0-CLOUDFLARE-RESEARCH.md` and the forthcoming
`docs/plans/v0.5.0-apk-extension-v2.md` (plan v2.0) for the active design.

## Why this was abandoned

The LAN-only design (mDNS via bonjour-service + `brain.local` resolution +
cleartext-on-LAN + scutil LocalHostName setup) required the user to:

1. Run `sudo scutil --set LocalHostName brain` (one-time Mac config change)
2. Configure the macOS application firewall to allow inbound `node` on port 3000
3. Keep the phone on the same Wi-Fi network as the Mac

At the T-21 AVD smoke gate on 2026-05-09, the user (non-technical; full
AI-assist norm per memory) reported step 2 was too complex for their
workflow. Rather than force-walk the firewall UI, the project pivoted to
Cloudflare Tunnel (named tunnel via `arunp.in` domain).

Full decision trail is in `RUNNING_LOG.md` entry 27 (2026-05-09 23:50).

## What shipped under this approach

The LAN-era plan (v1.3) produced **21 commits of shipped code** that mostly
survives the pivot:

- Bearer auth + rate limiter (`src/lib/auth/bearer.ts`) — transport-agnostic,
  survives unchanged
- Proxy layered auth (`src/proxy.ts`) — transport-agnostic, survives
- Share-handler + dedup (`src/components/share-handler.tsx`,
  `src/lib/capture/dedup.ts`) — URL changes but logic intact
- Capture endpoints (`/api/capture/url`, `/api/capture/pdf`,
  `/api/capture/note`) — survive
- Reachability probe (`src/lib/client/reachability.ts`) — survives
- Offline page (`public/offline.html`) — survives (origin-agnostic)
- QR scanner (`src/components/qr-scanner.tsx`) — survives
- Keystore pipeline (`scripts/build-apk.sh`, T-19 + T-20) — survives
- Debug keystore config in `android/app/build.gradle` — survives

## What this archive contains

- `v0.5.0-RESEARCH.md` — R-0.5.0 research spike (681 lines, 2026-05-09)
- `v0.5.0-RESEARCH-CRITIQUE.md` — self-critique of research (467 lines)
- `v0.5.0-apk-extension.md` — implementation plan v1.3 (final LAN-era
  version, 658 lines, 37 tasks across 7 waves)
- `v0.5.0-apk-extension-REVIEW.md` — cross-AI review (Plan architect agent
  output) that drove v1.0 → v1.1 patches

## What to read if you're continuing this project

1. `docs/plans/v0.5.0-CLOUDFLARE-RESEARCH.md` — R-CFT research (active)
2. Upcoming: `docs/plans/v0.5.0-CLOUDFLARE-RESEARCH-CRITIQUE.md`
3. Upcoming: `docs/plans/v0.5.0-apk-extension-v2.md` — plan v2.0
4. `RUNNING_LOG.md` entries 23–27 — narrative of v0.4.0 close → v0.5.0 LAN
   work → pivot decision
5. `CLAUDE.md` / `MEMORY.md` for user profile + project constraints

## Do NOT re-introduce

Without explicit planning reversal, do not reintroduce:

- mDNS advertising via `bonjour-service` or any equivalent
- `network_security_config.xml` permitting cleartext (HTTPS via tunnel
  makes this unnecessary and removing it is a security win)
- `sudo scutil --set LocalHostName brain` as a required user step
- The D-v0.5.0-3 two-probe decision tree (mDNS → IP fallback) — replaced
  by single-probe of the tunnel URL
- Any hardcoded `brain.local` or `ip:3000` addresses in client code

If a future decision revisits tunnel architecture and LAN becomes
attractive again, unarchive from this directory with a new plan document
that explicitly supersedes v2.0 — do not resurrect these files in place.
