# Local Server Status Visualizer — Tool Research

**Audience:** Non-technical user (product manager). All jargon is glossed on first use.  
**Date:** 2026-05-12  
**Author:** Research agent

---

## 1. The Problem

When the AI Brain Chrome extension or Android app fails to save a page, there is no easy way to tell whether the fault is the Next.js server being down, the Cloudflare tunnel not running, the tunnel running but unable to reach the server, or something else entirely. The user needs a permanent, glanceable indicator on their Mac — green when everything is healthy, red when something is broken — without needing to open a terminal or remember commands. A plain-language status display in the macOS menu bar (the row of icons at the top-right of the screen) is the right form factor.

---

## 2. What "Status" Actually Means for This Stack

Each layer can fail independently. A good status tool should check all of them:

| # | Check | What it tells you | How to check |
|---|-------|-------------------|-------------|
| 1 | **Next.js dev server** | Is the app process running? | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000` → expect `200` |
| 2 | **Cloudflare tunnel daemon** | Is `cloudflared` running locally? | `curl -s http://127.0.0.1:20241/ready` → expect `OK` |
| 3 | **Tunnel end-to-end reachability** | Can the outside world reach your app via the tunnel? | `curl -s -o /dev/null -w "%{http_code}" https://brain.arunp.in/api/health` → expect `200` |
| 4 | **Ollama (AI enrichment service)** | Is the local AI model server running? (Doesn't block captures, but blocks enrichment) | `curl -s http://127.0.0.1:11434` → expect any non-empty response |
| 5 | **Mac awake / network reachable** | Is the laptop awake and on a network? | Implicit: if checks 1–3 all fail simultaneously, suspect sleep or network loss |
| 6 | **Capture API smoke test** | Does the actual capture endpoint respond at all? | `curl -s -o /dev/null -w "%{http_code}" https://brain.arunp.in/api/capture/url` → expect `405` (method not allowed for GET) or `200`; anything non-5xx means the route exists |

**Priority order for the menu bar icon:**
- Red if check 3 fails (tunnel unreachable — extension/APK will fail).
- Yellow if check 3 passes but check 2 or 1 fails locally (tunnel is up, possibly cached, but something is wrong).
- Orange if check 4 (Ollama) is down and the rest are green (captures work, enrichment will queue or fail silently).
- Green if 1 + 2 + 3 all pass.

---

## 3. Tool Comparison Matrix

> **Install effort** = how hard is it to get the app onto your Mac (1 = download and double-click, 5 = compile from source).  
> **Setup effort** = how hard is writing the health-check config (1 = fill a form, 5 = write code/YAML from scratch).  
> **Menu-bar support** = does it put an icon in the macOS top bar that you can see all the time without opening a browser tab?

| Tool | Install effort | Setup effort | Menu-bar support | Cost | License | Best for | Biggest drawback for this user |
|------|:-:|:-:|:-:|------|---------|---------|-------------------------------|
| **SwiftBar** | 1 (Homebrew or .dmg) | 2 (short shell script) | **Y — always visible** | Free | MIT | Non-technical users who want a single glanceable icon that runs a custom script | Requires writing ~15 lines of shell script once (agent can do this) |
| **xbar** | 1 (.dmg download) | 2 (same shell script format as SwiftBar) | **Y — always visible** | Free | MIT | Users with existing BitBar plugins | Last stable release was 2021; betas only since; SwiftBar is more actively maintained |
| **Uptime Kuma** | 3 (Node.js + git clone, or Docker) | 2 (fill web form to add monitors) | **N — browser tab only** | Free | MIT | Multi-service uptime dashboards with history graphs and Pushover/Telegram alerts | No menu bar icon; you must open a browser to see status; Node.js must stay running |
| **Homepage** | 3 (Node.js/pnpm build or Docker) | 3 (YAML config file) | **N — browser tab only** | Free | GPL-3.0 | Teams with many self-hosted services | No menu bar; designed for many services, overkill for 4 endpoints; YAML editing required |
| **Stats** | 1 (.dmg download, open source) | N/A | **Y — always visible** | Free | MIT | CPU/RAM/disk/network system metrics in menu bar | Cannot check HTTP endpoints at all; monitors only local hardware metrics |
| **BitBar** | 1 (old .dmg) | 2 (shell script) | **Y — always visible** | Free | MIT | Legacy use only | Officially abandoned; replaced by xbar and SwiftBar; no longer updated |
| **Healthchecks.io (self-hosted)** | 4 (Python/Django/PostgreSQL stack) | 4 (push-model: your app must ping it) | **N — browser tab only** | Free (self-hosted) | BSD-3-Clause | Monitoring cron jobs and scheduled tasks | Wrong paradigm: it waits for your services to check in; it does not poll them; requires code changes |

---

## 4. Recommended Tool

### Primary Recommendation: SwiftBar

**What it is:**  
SwiftBar is a free, open-source macOS app (MIT license) that sits in your menu bar and runs any shell script you drop into a folder. The script's output becomes the menu bar icon text — including color (green, red, yellow). It refreshes on whatever schedule you set (e.g., every 30 seconds). No server to run, no browser tab to keep open.

**Why it fits this user:**  
- One .dmg download and one shell script (which an agent can write for you) — that's the entire setup.
- The icon is always visible at the top of your screen alongside the clock and Wi-Fi indicator.
- You can see at a glance: `🟢 Brain OK` or `🔴 Brain DOWN` without opening anything.
- Actively maintained: version 2.0.1 released February 2024, betas in March 2024.
- The shell script checks all four stack layers (Next.js, cloudflared, tunnel, Ollama) in sequence and lights up the right color.
- No Docker, no Node.js, no YAML. Works entirely with tools already on your Mac (`curl`).

**Non-technical setup steps:**

1. Open Terminal, run: `brew install swiftbar`  
   (If you don't have Homebrew, go to `https://brew.sh`, copy the one-line install command, run it, then come back.)
2. Launch SwiftBar from your Applications folder. It will ask you to pick a "Plugin Folder" — create a new folder called `SwiftBar` in your Documents and select it.
3. An agent (or someone technical) drops one file — `brain-health.30s.sh` — into that folder. The `30s` in the name tells SwiftBar to run it every 30 seconds.
4. Right-click the new menu bar item → "Refresh all" to test it immediately.
5. Done. The icon now updates every 30 seconds automatically, even after reboots (SwiftBar opens at login).

**What the icon looks like:**

| Situation | Menu bar shows |
|-----------|---------------|
| Everything healthy | `🟢 Brain` (green dot + text, or just the dot if you prefer minimal) |
| Tunnel unreachable (extension will fail) | `🔴 Brain` |
| cloudflared daemon down locally | `🟡 Brain` |
| Ollama down (enrichment only) | `🟠 Brain` |
| Mac just woke up / still checking | `⚪ Brain…` |

**Common pitfalls:**

- **macOS Gatekeeper warning:** The first time you open SwiftBar it may say "unidentified developer." Go to System Settings → Privacy & Security → scroll down → click "Open Anyway."
- **curl not in PATH:** If the script fails silently, it's because SwiftBar runs scripts with a minimal PATH. Fix: use the full path `/usr/bin/curl` in the script instead of just `curl`.
- **Script not executable:** The file must be executable. An agent can set this automatically; if doing it manually, run `chmod +x ~/Documents/SwiftBar/brain-health.30s.sh` in Terminal once.
- **Tunnel check timing:** `https://brain.arunp.in/api/health` goes out to the internet and back. On a slow connection, the check may time out. Add `-m 5` to the curl command (5-second timeout) to prevent the script from hanging.
- **SwiftBar must be running:** SwiftBar does not run as a background daemon — it is a regular macOS app. Make sure "Open at Login" is checked in SwiftBar's preferences so it starts after every reboot.

---

### Backup Recommendation: Uptime Kuma

**What it is:**  
Uptime Kuma is a self-hosted web dashboard (MIT license) that polls your endpoints on a schedule and shows a green/red timeline with history. You add monitors via a browser form — no YAML, no code. It also sends push notifications (Pushover, Telegram, Slack) when something goes down.

**Why it's the backup (not primary):**  
It has no menu bar icon. You must open a browser tab at `http://localhost:3001` to see status. It also requires Node.js to be installed and a background process to keep running. That said, if you want history ("was Brain down at 2am?"), graphs, and push alerts to your phone, Uptime Kuma is far richer than SwiftBar.

**Non-technical setup steps (no Docker path):**

1. Install Node.js 20: go to `https://nodejs.org`, download the macOS installer, run it.
2. Open Terminal and run these three commands one at a time:
   ```
   git clone https://github.com/louislam/uptime-kuma.git ~/uptime-kuma
   cd ~/uptime-kuma
   npm run setup
   ```
3. Start it: `node server/server.js` — leave this Terminal window open (or use PM2 to run it in the background permanently).
4. Open `http://localhost:3001` in your browser. Create a free account (local only, not sent anywhere).
5. Click "Add New Monitor" → HTTP(s) → enter `https://brain.arunp.in/api/health` → Save.
6. Repeat for `http://127.0.0.1:3000` (Next.js), `http://127.0.0.1:20241/ready` (cloudflared), `http://127.0.0.1:11434` (Ollama).
7. Optional: add a Pushover or Telegram notification so your phone buzzes when something goes down.

**What the dashboard looks like:**  
A browser page with one card per monitor. Each card shows a green "Up" badge (or red "Down"), the last response time, and a 90-day uptime bar. Hovering over the bar shows when outages happened.

**Common pitfalls:**

- **Node.js process must stay running:** If you close Terminal, Uptime Kuma stops. Use a process manager (`pm2`) or a launchd plist to auto-start it. Both require a one-time terminal command.
- **localhost monitoring from the dashboard:** Uptime Kuma runs on your Mac, so `http://127.0.0.1:3000` works fine — it's checking the local machine, not a remote server.
- **Not visible at a glance:** The whole point is a browser tab, not a menu bar icon. If you want both a menu bar icon AND history, run SwiftBar (primary) AND Uptime Kuma (backup) simultaneously — they don't conflict.

---

## 5. Categories Considered

### (a) macOS Menu-Bar Script Runners — xbar, SwiftBar, BitBar
These apps let any shell script appear in the menu bar. Output a line of text → it shows in the bar. Output `color=red` → it turns red. The script runs on a schedule.

- **BitBar** (https://github.com/matryer/bitbar): Original. Abandoned. Replaced by xbar.
- **xbar** (https://github.com/matryer/xbar): BitBar rewrite in Go. MIT license. Still has a plugin store. Last release: October 2024 beta. Not as actively developed as SwiftBar.
- **SwiftBar** (https://github.com/swiftbar/SwiftBar): xbar's actively maintained macOS-native competitor. MIT. Latest stable: v2.0.1 (Feb 2024). **Recommended primary.**

All three use the same plugin script format, so a script written for one works on another.

### (b) Self-Hosted Uptime Dashboards — Uptime Kuma, Statping, Healthchecks.io
Web dashboards that poll endpoints and show history.

- **Uptime Kuma** (https://github.com/louislam/uptime-kuma): MIT, latest v2.3.2 (May 2026), Node.js or Docker, browser-only UI. Rich alerts. **Recommended backup.**
- **Statping-NG** (https://github.com/statping-ng/statping-ng): Single Go binary, MIT, but development has stalled (last meaningful release 2022). Not recommended.
- **Healthchecks.io self-hosted** (https://github.com/healthchecks/healthchecks): BSD-3, Python/Django, most recent v4.2 (April 2026). Wrong paradigm — it waits for your services to ping it, not the other way around. Not a fit.

### (c) Native macOS System Monitors — Stats, iStat Menus
These show CPU/RAM/network in the menu bar. They are for hardware metrics, not HTTP health checks.

- **Stats** (https://github.com/exelban/stats): MIT, free, latest v2.12.13 (May 2026). Cannot ping URLs. Dismissed for this use case.
- **iStat Menus** (https://bjango.com/mac/istatmenus/): Paid ($13 one-time). Excellent but also hardware-only. Dismissed.

### (d) Browser-Based Local Dashboards — Homepage, Homer, Dashy
Dashboards designed for displaying links to your self-hosted services, with optional status widgets.

- **Homepage** (https://github.com/gethomepage/homepage): GPL-3, v1.13.1 (May 2026), requires Node.js/pnpm or Docker. Can show HTTP status widgets. No menu bar. Overkill for 4 endpoints.
- **Homer** (https://github.com/bastienwirtz/homer): Apache-2, v26.4.2 (April 2026), static HTML — no build step needed. Can serve as a simple "bookmark page" with ping status. No menu bar. Viable secondary but no live alerting.
- **Dasherr:** Project not found / abandoned. Dismissed.

### (e) Terminal TUI (Text-User Interface) Tools — btop, lazydocker, custom watch loops
Tools like `watch curl ...` or `btop` show status in a terminal window. Dismissed: require a terminal to stay open, not glanceable, and not beginner-friendly.

---

## 6. Extra-Mile Ideas (Seeds for Later)

**1. A `/status` page served by your own Next.js app**  
Add a route at `https://brain.arunp.in/status` that hits the same internal checks (Ollama reachable? SQLite writable? Last capture timestamp?) and returns a tidy HTML page. Then your SwiftBar script can also open this page in a click for details. Low effort; high payoff for debugging.

**2. Push notifications via Pushover when the tunnel drops**  
Pushover (https://pushover.net) is $5 one-time per platform. Uptime Kuma has native Pushover integration — enable it and your iPhone buzzes within 60 seconds of Brain going offline. Alternatively, the SwiftBar script itself could `curl` Pushover's API when it detects a red state (with a rate-limit file to avoid spamming you).

**3. An Apple Shortcut that reads status aloud**  
In the Shortcuts app, create a shortcut that runs a URL action against `https://brain.arunp.in/api/health` and then uses "Speak Text" to say "Brain is up" or "Brain is down." Pin it to your iPhone home screen or trigger it via Siri ("Hey Siri, check Brain status"). Zero code, zero install — entirely within Apple's built-in ecosystem.

---

## 7. Sources

| Tool | Official URL |
|------|-------------|
| SwiftBar | https://github.com/swiftbar/SwiftBar |
| xbar | https://github.com/matryer/xbar |
| xbar plugin store | https://github.com/matryer/xbar-plugins |
| BitBar (archived) | https://github.com/matryer/bitbar |
| Uptime Kuma | https://github.com/louislam/uptime-kuma |
| Statping-NG | https://github.com/statping-ng/statping-ng |
| Healthchecks.io self-hosted | https://github.com/healthchecks/healthchecks |
| Stats | https://github.com/exelban/stats |
| iStat Menus | https://bjango.com/mac/istatmenus/ |
| Homepage | https://github.com/gethomepage/homepage |
| Homer | https://github.com/bastienwirtz/homer |
| Pushover | https://pushover.net |
| Homebrew (macOS package manager) | https://brew.sh |
| Node.js | https://nodejs.org |
