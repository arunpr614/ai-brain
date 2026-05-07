# R-AUTH: LAN Auth Model for AI Brain

**Research ID:** R-AUTH | **Status:** complete | **Date:** 2026-05-07 | **Author:** research agent

---

## 1. TL;DR Recommendation

**v0.5.0 default:** Bind to `0.0.0.0` with a single static bearer token stored in `.env`. The APK embeds the token at build time. A one-line `BRAIN_TOKEN=<random>` in `.env` is the only setup step. A menu-bar toggle (Little Snitch rule or a trivial shell alias) switches between home and café binding.

**v0.10.0 hardening:** Migrate to Option D (QR-scan per-device pairing) plus Tailscale for café safety. This eliminates the token-distribution manual step, adds revocability, and removes all LAN exposure at untrusted networks without any user ceremony.

---

## 2. Threat Model (Honest)

| Threat | Realistic? | Severity |
|---|---|---|
| Roommate or home-network neighbor passively reading traffic | Yes — shared router, ARP snoop is trivial | Medium |
| Café guest scanning the subnet for open ports | Yes — public Wi-Fi, same broadcast domain | High |
| Someone finding the APK file and extracting a hardcoded token | Low — APK decompilation is possible but unlikely for a home tool | Low |
| Man-in-the-middle on LAN (ARP poisoning) | Unlikely in a home setting; realistic at a café | Medium–High at café |
| Malware on Mac exfiltrating the `.env` token | Possible but out of scope for LAN auth | Out of scope |
| Brute-force of a weak token over HTTP | Irrelevant if the token is 32+ random hex characters | Negligible |
| Accidental exposure to the internet | Only if router port-forwards 3000 — very unlikely in a typical home setup | Low |

The realistic threats collapse to two: (1) a nosy person on the same Wi-Fi reading unencrypted HTTP, and (2) port-scanning a café subnet and hitting an open, unprotected server. The first is mitigated by requiring a token header; the second is mitigated by not binding to `0.0.0.0` at cafés.

---

## 3. Options Matrix

| Option | Setup Steps | Security | Non-Technical Friendliness | Mobile-Friendly | Café-Safe | Verdict |
|---|---|---|---|---|---|---|
| **(A) No auth, 127.0.0.1** | Zero | Good on Mac | Seamless | Blocked — APK cannot reach LAN | Yes — nothing exposed | Drop: breaks the core mobile requirement |
| **(B) No auth, 0.0.0.0** | Zero | None | Seamless | Works | No — open to all | Drop: unacceptable at café or shared network |
| **(C) Static bearer token, 0.0.0.0** | One-time: set `BRAIN_TOKEN` in `.env`; embed same value in APK build | Good — unauthorized requests rejected | One `.env` edit; token baked into APK at build time | Works; APK sends `Authorization: Bearer <token>` header | Risky unless binding is toggled off at café | **Recommended for v0.5.0** with café toggle |
| **(D) Per-device token, QR pairing** | Zero ongoing; first-time pair each device | Good — each device has a revocable token | One QR scan per device | Works; token stored in APK keychain | Safe if combined with binding toggle | Best choice for v0.10.0 |
| **(E) Tailscale** | Install Tailscale on Mac + Android; login once with a personal account | Excellent — WireGuard encryption, no LAN exposure at all | Tailscale's onboarding is one OAuth login per device; free tier supports up to 100 devices | Works over Tailscale IP regardless of physical network | Yes — traffic exits over Tailscale regardless of local Wi-Fi | Strong stretch option; adds third-party dep but Tailscale is open-source and free-tier generous (https://tailscale.com/kb/1016/network-types) |
| **(F) SSH tunnel** | Install SSH client app (e.g., Termius) on Android; configure tunnel | Good | Too many steps; non-technical user would need ongoing management | Awkward | Yes | Drop: fails the non-technical-user requirement |
| **(G) mDNS + self-signed TLS + cert pinning** | Generate cert; bundle in APK; configure Next.js TLS | Excellent | Extremely complex; cert rotation is a recurring ceremony | Works | Yes | Drop for v0.x; revisit only if v1.0 requires HTTPS |

---

## 4. Recommended LAN Posture Per Network

**Home Wi-Fi (trusted):** Bind to `0.0.0.0`. Bearer token is required on every request. The server is reachable by the Android APK over LAN at `http://192.168.x.x:3000`.

**Café / public Wi-Fi (hostile):** Bind to `127.0.0.1` only. A one-line shell alias or a macOS Network Location switch can toggle this. The APK loses LAN access, but so does every stranger on the café network. If mobile access at cafés is later needed, Tailscale (Option E) is the right answer — not relaxing the binding.

**Practical toggle mechanism:** A small launchd plist or a `.env` variable `BRAIN_BIND=127.0.0.1` vs `BRAIN_BIND=0.0.0.0` controlled by a menu-bar script (e.g., Hammerspoon or a Raycast extension) is sufficient. A macOS Network Location named "Café" that sets `BRAIN_BIND=127.0.0.1` and restarts the dev server is a one-click operation.

---

## 5. Web UI Access Control

For v0.5.0, the bearer token that protects the API is also the credential for the web UI. A middleware check on every non-static route — if `Authorization` header or a session cookie contains the correct token, let through; otherwise, redirect to a PIN entry page — is sufficient.

**First-run PIN:** On first start (no `BRAIN_TOKEN` in `.env`), generate a random token and display it once in the terminal and as a QR code. The user scans it with the APK. This replaces the manual copy-paste distribution step without adding complexity.

**TouchID / WebAuthn:** Deferred to v0.10.0. WebAuthn `platform` authenticator (TouchID on Mac, fingerprint on Pixel) is the right eventual upgrade — it replaces the PIN entirely with biometric and stores a credential in the OS keychain. The spec is well-supported in Chrome/WebView2 as of 2024. Home Assistant added WebAuthn support in 2023.2 as an optional second factor on top of username/password.

---

## 6. Pairing Flow (Per-Device Token — v0.10.0)

```
Mac (Next.js server)                    Android APK
        |                                     |
        |  1. User opens /pair in browser     |
        |     or clicks "Add Device"          |
        |                                     |
        |  2. Server generates one-time       |
        |     pairing code + embeds it in QR  |
        |     (code expires in 5 min)         |
        |                                     |
        |  3. QR displayed on screen          |
        |                                     |
        |         <-- APK camera scans QR --> |
        |                                     |
        |  4. APK POSTs code to /api/pair     |
        |     Server validates code,          |
        |     issues device-specific token    |
        |     (stored in server DB, revocable)|
        |                                     |
        |  5. APK stores token in             |
        |     Android Keystore; uses it       |
        |     as Bearer on all requests       |
        |                                     |
     [pairing complete — no manual string copy]
```

Device tokens can be listed and revoked at `/settings/devices`. The one-time pairing code is the only thing that transits unencrypted; it is short-lived and single-use.

---

## 7. Prior-Art Reference

- **Home Assistant** (https://www.home-assistant.io/docs/authentication): Uses a long-lived access token model with per-device tokens generated from the UI. The mobile app pairs via QR scan against the local URL. It explicitly recommends Nabu Casa (their cloud relay) or a VPN for external access — the same conclusion reached here for café scenarios.

- **Syncthing** (https://docs.syncthing.net/users/security.html): Binds the GUI to `127.0.0.1` by default and requires an API key for all requests. LAN sync uses TLS with self-signed certificates and certificate fingerprint pinning, but the GUI itself never exposes auth to the LAN — a clean separation of "GUI access" vs "device sync" that mirrors what is proposed here.

- **Immich** (https://immich.app/docs/administration/oauth): Self-hosted photo app; defaults to binding on all interfaces but mandates a password on first run. Adds OAuth as an optional upgrade. For LAN mobile access it simply uses HTTP + password and recommends a VPN for untrusted networks — identical pattern to Option C + Tailscale here.

- **Tailscale** (https://tailscale.com/kb/1077/secure-server-locally): Explicitly documents the pattern of running a local service on `localhost` and exposing it only over the Tailscale network, avoiding the need for TLS certificates. Their `serve` and `funnel` commands automate this entirely.

---

## 8. Decision for v0.5.0

1. Next.js binds to `0.0.0.0:3000` by default when `BRAIN_BIND` is unset; falls back to `127.0.0.1` when `BRAIN_BIND=127.0.0.1`.
2. On first `npm run dev`, if `BRAIN_TOKEN` is absent from `.env`, generate a 32-byte hex token, write it to `.env`, and print it to the terminal.
3. Next.js middleware rejects any request missing the correct `Authorization: Bearer <token>` header or session cookie; redirect to `/auth` for browser clients.
4. The Android APK receives the token as a build-time constant (defined in `local.properties` or `BuildConfig`). Distribution is a one-time copy from the terminal on first setup.
5. A shell alias `brain-café` sets `BRAIN_BIND=127.0.0.1` and restarts the dev server; `brain-home` clears it and restarts. One alias file, one-step execution.

---

## 9. Hardening Plan for v0.10.0

- **Replace static APK token with QR pairing flow** (Section 6 above). Eliminates manual token copy-paste; adds per-device revocability.
- **Add Tailscale support** as the recommended café mode. Server advertises itself as `aibrain` on the Tailscale network. The café binding toggle becomes: if on Tailscale, bind to Tailscale interface only (`100.x.x.x`); otherwise home default.
- **Add WebAuthn (TouchID) for the web UI** as the browser session initiator, replacing the PIN page.
- **Session expiry:** Issue a short-lived JWT (8h) from the bearer token; the APK refreshes silently. This bounds the damage window if a token leaks.
- **HTTPS is not required** for v0.10.0 as long as Tailscale is the transport for untrusted networks — Tailscale provides WireGuard encryption end-to-end. Self-signed TLS adds no meaningful security over Tailscale.

---

## 10. Open Risks / Re-eval Triggers

- **Token in `.env` leaks to dotfiles repo:** If the user ever commits `.env` to GitHub, the token is public. Mitigation: ensure `.gitignore` includes `.env`; add a pre-commit hook that blocks secrets. Re-evaluate if the repo is ever made public.
- **Android APK decompiled:** If the APK is distributed (e.g., sideloaded to a second device via a shared file), the hardcoded token travels with it. The per-device pairing flow in v0.10.0 eliminates this. Re-evaluate if the APK is shared outside the owner's device.
- **Tailscale as a third-party dependency:** Tailscale requires a login (Google/GitHub OAuth or email). If Anthropic or the user's threat model prohibits third-party auth, Tailscale cannot be used. Fallback is Option G (self-signed TLS + cert pinning), which is significantly more complex. Re-evaluate if Tailscale's free-tier terms change materially.
- **Multiple home networks:** If the Mac moves between two trusted home networks (e.g., home + parents' house), the static `192.168.x.x` IP changes. Use mDNS hostname (`aibrain.local`) in the APK rather than a hardcoded IP to resolve this without code changes.
