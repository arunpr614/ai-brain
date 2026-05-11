# AI Brain

A local-first personal knowledge app that combines the best of **Recall.it** and **Knowly** — capture, auto-organize, RAG chat, spaced-repetition, and AI-generated pages/journeys — all running on your own Mac, with a sideloadable Android APK reaching the Mac via a Cloudflare named tunnel.

**Current status:** v0.2.0 Capture core shipped. URL capture (via Mozilla Readability), PDF capture (via unpdf, with paywall-truncation detection), manual notes, full-text search (FTS5), and Markdown export all work end-to-end. On top of the v0.1.0 foundation (PIN auth, theme toggle, command palette, periodic SQLite backups).

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000 — set a PIN, then add your first note
```

## Core constraints

- **100% local.** SQLite + Ollama on the Mac. No cloud services until `v1.0.0`.
- **Sideloadable Android APK** via Capacitor 8, reaching the Mac through a Cloudflare named tunnel (`brain.arunp.in`) — no LAN / same-Wi-Fi requirement.
- **Single user.** Designed for one person; no multi-tenant plumbing.
- **Feature parity** with Recall.it + Knowly as the north star (36 of 47 features shipping pre-v1.0.0; see `FEATURE_INVENTORY.md` + `ROADMAP_TRACKER.md`).

## Stack (locked in after research)

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Styling | Tailwind 4 + Radix primitives + Lucide |
| DB | better-sqlite3 + sqlite-vec (single file) |
| LLM runtime | Ollama (local) |
| Default model | `qwen2.5:7b-instruct-q4_K_M` — measured 24 tok/s gen, 141 ms first-token on M1 Pro |
| Embeddings | `nomic-embed-text` |
| PDF extraction | `unpdf@1.6.2` + optional poppler fallback |
| Mobile | Capacitor 8 + `@capgo/capacitor-share-target` (requires JDK 21) |
| Auth (v0.1.0) | Local PIN (PBKDF2-HMAC-SHA256, HMAC session cookie) |
| Auth (v0.5.0) | +bearer token, +Cloudflare named tunnel `brain.arunp.in`, +WebAuthn TouchID (stretch) |
| Transport (v0.5.0) | Cloudflare named tunnel (outbound QUIC; TLS at edge) via `cloudflared` |

See `BUILD_PLAN.md` §15 for exact versions, intent filters, Ollama env vars, and pipeline shapes.

## Documents

| Doc | Purpose |
|---|---|
| `BUILD_PLAN.md` | Phased architecture + roadmap (prose). Current: `v0.3.0-plan`. |
| `DESIGN.md` | Design tokens (getdesign.md spec). Light + dark. |
| `DESIGN_SYSTEM.md` | Operational UX contract + per-screen acceptance checklist. |
| `ROADMAP_TRACKER.md` | Every feature pinned to a version lane; deferred items with reopen triggers. |
| `PROJECT_TRACKER.md` | Tactical status board — phases, research spikes, open decisions. |
| `RUNNING_LOG.md` | Append-only project journal; narration for AI agents. |
| `FEATURE_INVENTORY.md` | Recall.it + Knowly feature catalog (source of truth for what to build). |
| `STRATEGY.md` | Historical strategy memo (pre-reopen). |
| `PROJECT_CLOSURE.md` | Historical — this project was closed, then reopened on 2026-05-07. |
| `docs/research/` | Research spike outputs (R-LLM, R-CAP, R-PDF, R-AUTH). |

## Android APK (v0.5.0)

The APK is a thin Capacitor WebView that points at the live Next.js
server on your Mac through a Cloudflare named tunnel
(`https://brain.arunp.in`). No static export, no offline copy of the
app — the Mac is the source of truth, and the phone reaches it via the
public tunnel URL (not the LAN).

### One-time Cloudflare tunnel setup

The tunnel is the transport layer. Run this once per Mac:

```bash
brew install cloudflared
cloudflared tunnel login                              # browser auth → writes ~/.cloudflared/cert.pem
cloudflared tunnel create brain                       # creates tunnel + UUID credentials
cloudflared tunnel route dns brain brain.arunp.in     # adds CNAME on the Cloudflare zone
```

Write `~/.cloudflared/config.yml`:

```yaml
tunnel: brain
credentials-file: /Users/<you>/.cloudflared/<UUID>.json
originRequest:
  keepAliveTimeout: 10m   # SSE streams exceed the default 90s keepalive
  connectTimeout: 30s

ingress:
  - hostname: brain.arunp.in
    service: http://127.0.0.1:3000
  - service: http_status:404
```

Then each time you want the tunnel up:

```bash
cloudflared tunnel run brain        # foreground; 4 QUIC conns to Cloudflare edge
```

To make the tunnel survive reboots, install it as a launchd service
(deferred; see the [tunnel persistence](#tunnel-persistence) section).

**Troubleshooting:** if the phone hits NXDOMAIN on `brain.arunp.in`,
verify the tunnel is live:

```bash
curl http://127.0.0.1:20241/ready
# expected: {"status":200,"readyConnections":4,"connectorId":"..."}
```

If you have outbound-filtering software (Little Snitch, LuLu), allow
`cloudflared` outbound to ports 7844 (QUIC) + 443 (TCP fallback) →
`region1.v2.argotunnel.com` and `region2.v2.argotunnel.com`.

### Build

```bash
npm run build:apk
# → data/artifacts/brain-debug-<version>.apk  (~8 MB)
```

The script runs `tsc --noEmit`, `next build`, `cap sync android`, and
`./gradlew assembleDebug`, then copies the signed APK into
`data/artifacts/`. First run generates a project-local debug keystore
at `android/app/debug.keystore` (gitignored, created via `keytool`
with the AGP-default alias `androiddebugkey`); subsequent runs reuse
it. Cold build ~90s on an M1 Pro; warm rebuild <10s.

The APK's `capacitor.config.ts` has `server.url = "https://brain.arunp.in"`
baked in; no per-install configuration needed.

### Install on an Android device or emulator

```bash
# List connected devices (USB-debug-enabled phones + running emulators)
adb devices

# Install or upgrade in place; -r keeps app data across reinstalls
adb install -r data/artifacts/brain-debug-<version>.apk
```

If `adb` is not on your `PATH`, export it from the Android SDK:

```bash
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"
```

### First-run pairing

1. On your Mac, `npm run dev` and `cloudflared tunnel run brain`. Verify
   both are up: `curl https://brain.arunp.in/api/health` should reply.
2. Open **Settings → Device pairing** in the web UI. The page shows the
   tunnel URL + QR code.
3. Launch the APK on your phone; unlock with PIN; go to the QR scanner
   (`/setup-apk`) and scan the Mac's screen. The APK stores the bearer
   token in Capacitor Preferences and routes back to the Library. The
   URL is a compile-time constant in the APK so the QR only carries
   the token.

Rotate the bearer token any time from **Settings → Device pairing →
Rotate token**; all paired devices must re-pair after a rotation.

### Privacy note

Traffic from your phone to the Mac transits Cloudflare's edge. TLS
terminates at Cloudflare and the request is re-encrypted (actually,
forwarded over an outbound QUIC tunnel from your Mac to the edge) —
Cloudflare observes plaintext request/response data the same way any
HTTPS reverse proxy would. The tunnel is attributed to your Cloudflare
account (visible in `one.dash.cloudflare.com` → Zero Trust → Networks
→ Tunnels). This is personal-use, single-tenant data; the trust model
was chosen over firewall reconfiguration during the v0.5.0 pivot.

### Tunnel persistence

By default `cloudflared tunnel run brain` is a foreground process and
dies when you close the terminal. To survive reboots, install as a
launchd service:

```bash
sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/config.yml /etc/cloudflared/config.yml
sudo cloudflared service install
```

This writes `/Library/LaunchDaemons/com.cloudflare.cloudflared.plist`
and starts cloudflared at boot. Verify: `sudo launchctl list | grep cloudflared`.

### Keystore recovery

If `android/app/debug.keystore` is deleted, `scripts/build-apk.sh`
regenerates it on the next run — but the new keystore has a different
identity, so `adb install -r` will refuse to upgrade an APK signed by
the old keystore (Android enforces same-signer for in-place upgrades).

**Two-tier backup strategy:**

1. **Automatic in-tree backup.** Every `npm run build:apk` copies the
   active keystore to `data/backups/debug.keystore.backup`. This file
   is NOT rotated (F-009's `pruneOldBackups()` only matches `*.sqlite`,
   so `.backup` files persist indefinitely — intentional). Protects
   against accidental deletion of `android/app/debug.keystore`.

2. **Operator-managed external backup (one-time step).** After the
   first successful build, copy the backup to an external, non-repo
   path so a full repo wipe or laptop loss doesn't take the keystore
   with it:

   ```bash
   mkdir -p ~/Documents/Brain-keystore-backup
   cp data/backups/debug.keystore.backup ~/Documents/Brain-keystore-backup/debug.keystore
   ```

   Refresh the external copy after any keystore rotation. There is no
   automation for this step by design — the script can't safely guess
   where "external" lives, and you should intentionally choose a path
   that is (a) on a different filesystem than the repo and (b) included
   in whatever backup scheme you use (Time Machine, iCloud, etc.).

**If both backups are lost:** `adb uninstall com.arunprakash.brain` on
every paired device, then reinstall a fresh APK. Local app storage
(Capacitor Preferences: `brain_token`) is wiped by uninstall, so
you'll need to re-scan the setup QR.

## Versioning

- `v0.x.y` = pre-hosting, local-only.
- `v1.0.0` = first "solid product" checkpoint where hosting is revisited.
- Plan document carries its own `v*-plan` version; bumps on scope changes.

## Roadmap (phases)

```
v0.1.0 Foundation         v0.6.0 GenPage + clusters
v0.2.0 Capture core       v0.7.0 GenLink
v0.3.0 Intelligence       v0.8.0 Review (SRS)
v0.4.0 Ask (RAG)          v0.9.0 Flow + proactive
v0.5.0 APK + extension    v0.10.0 Breadth + graph + Obsidian
                          v1.0.0 Solid-product gate
```

Full walk-down in `BUILD_PLAN.md` §5.

## License

Not yet decided. The project is currently in a planning-only state; no code to license. When code lands, MIT is the expected default.
