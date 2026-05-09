# AI Brain

A local-first personal knowledge app that combines the best of **Recall.it** and **Knowly** — capture, auto-organize, RAG chat, spaced-repetition, and AI-generated pages/journeys — all running on your own Mac, with a sideloadable Android APK as a thin LAN client.

**Current status:** v0.2.0 Capture core shipped. URL capture (via Mozilla Readability), PDF capture (via unpdf, with paywall-truncation detection), manual notes, full-text search (FTS5), and Markdown export all work end-to-end. On top of the v0.1.0 foundation (PIN auth, theme toggle, command palette, periodic SQLite backups).

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000 — set a PIN, then add your first note
```

## Core constraints

- **100% local.** SQLite + Ollama on the Mac. No cloud services until `v1.0.0`.
- **Sideloadable Android APK** via Capacitor 8, talking to the Mac over LAN.
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
| Auth (v0.5.0) | +LAN bearer token, +mDNS `brain.local`, +WebAuthn TouchID (stretch) |

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
server on your Mac (`http://brain.local:3000` by default). No static
export, no offline copy of the app — the Mac is the source of truth.

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

1. On your Mac, `npm run dev:lan` (binds to `0.0.0.0:3000`).
2. Open **Settings → LAN Info** in the web UI; copy the generated QR.
3. Launch the APK on your phone; unlock with PIN; go to the QR scanner
   (`/setup-apk`) and scan the Mac's screen. The APK stores the bearer
   token + base URL in Capacitor Preferences and routes back to the
   Library.

Rotate the bearer token any time from **Settings → LAN Info → Rotate
token**; all paired devices must re-pair after a rotation.

### Keystore recovery

If `android/app/debug.keystore` is deleted, `scripts/build-apk.sh`
regenerates it on the next run — but the new keystore has a different
identity, so `adb install -r` will refuse to upgrade an APK signed by
the old keystore (Android enforces same-signer for in-place upgrades).
Workaround: `adb uninstall com.arunprakash.brain` on the device, then
reinstall. T-20 adds an automatic backup copy at
`data/backups/debug.keystore.backup` on every build; copy that to an
external path once you have a working install.

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
