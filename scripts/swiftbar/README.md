# Brain health menu-bar indicator (SwiftBar plugin)

A single shell script that SwiftBar runs every 30 seconds and turns
into a colored icon in your macOS menu bar.

| Icon | Meaning |
|------|---------|
| 🟢 Brain | Everything healthy — extension and APK will work |
| 🟠 Brain (no AI) | Capture works; Ollama is down → enrichment queue will stall |
| 🟡 Brain degraded | Tunnel reachable but a local daemon is misbehaving (rare) |
| 🔴 Brain DOWN | Tunnel unreachable — extension and APK **will fail** |

Click the icon for a per-layer breakdown (Next.js / cloudflared / tunnel / Ollama).

## First-time setup (10 minutes, one-time)

1. **Install Homebrew** if you don't have it.
   Check by running `brew --version` in Terminal. If it errors, go to
   <https://brew.sh>, copy the one-line install command at the top of
   that page, paste it into Terminal, press Return, and follow prompts.

2. **Install SwiftBar.**
   ```
   brew install --cask swiftbar
   ```

3. **Launch SwiftBar** from Applications. On first launch macOS may
   show "unidentified developer" — if so, go to **System Settings →
   Privacy & Security → Open Anyway**.

4. **Pick a plugin folder** when SwiftBar asks. Create a new folder
   called `SwiftBar` inside your `~/Documents/` directory and select it.

5. **Install the Brain plugin** by running:
   ```
   bash scripts/swiftbar/install.sh
   ```
   from this repo's root. The script symlinks `brain-health.30s.sh`
   into your SwiftBar plugin folder so updates to the script in git
   automatically propagate.

6. **Tell SwiftBar to start at login.**
   Menu bar → SwiftBar icon → Preferences → check "Launch at Login."

7. **Verify.** The Brain icon should appear in your menu bar within
   30 seconds. Click it; you should see the per-layer breakdown.

## Troubleshooting

### The icon shows `🔴 Brain DOWN` but everything seems fine

Click the icon — the dropdown tells you which layer is failing.

- **❌ Next.js server** — run `npm run dev` in the ai-brain repo.
- **❌ cloudflared daemon** — the tunnel isn't running locally. Either
  run `cloudflared tunnel run brain` in a Terminal, or if you set up
  the launchd service, run `sudo launchctl start com.cloudflare.cloudflared`.
- **❌ Tunnel end-to-end** (but Next.js + cloudflared both ✅) — rare.
  Usually Cloudflare edge is reporting 502 because the tunnel connection
  just dropped and is reconnecting. Wait 60 seconds; refresh the icon.

### The icon never appears

- Confirm SwiftBar is running (check Activity Monitor for "SwiftBar").
- Confirm the script is executable: `ls -la scripts/swiftbar/` — the
  permissions should start with `-rwxr-xr-x`. If not:
  `chmod +x scripts/swiftbar/brain-health.30s.sh`.
- Confirm the symlink landed: `ls -la ~/Documents/SwiftBar/` should
  show `brain-health.30s.sh` pointing back into this repo.
- Right-click the (empty) menu-bar area → Refresh All Plugins.

### The script runs but the icon never updates

- SwiftBar caches aggressively. Quit SwiftBar fully (right-click the
  SwiftBar icon → Quit) and relaunch it.
- Check the script manually from Terminal — it should print a line
  starting with `🟢`, `🟠`, `🟡`, or `🔴`:
  ```
  bash scripts/swiftbar/brain-health.30s.sh | head -1
  ```

### I moved the repo and the icon disappeared

The install script creates a symlink. If the repo moved, re-run
`bash scripts/swiftbar/install.sh` from the new location.

## Uninstall

```
rm ~/Documents/SwiftBar/brain-health.30s.sh
brew uninstall --cask swiftbar    # optional, if you don't want SwiftBar at all
```

## Customize

Open `brain-health.30s.sh` in any text editor. The four endpoints are
at the top (`NEXTJS_URL`, `CLOUDFLARED_READY_URL`, `TUNNEL_HEALTH_URL`,
`OLLAMA_URL`). Change the filename prefix to adjust refresh rate:
`brain-health.10s.sh` runs every 10 seconds; `brain-health.1m.sh` every
minute.
