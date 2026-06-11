# Brain — Chrome MV3 Extension

Captures pages from Chrome/Edge to your local AI Brain library via `https://brain.arunp.in`.

## Build

```bash
cd extension
npm install
npm run build
```

Build artifacts land in `extension/dist/`.

## Load into Chrome/Edge (developer mode, one-time)

1. Browser → `chrome://extensions` (or `edge://extensions`)
2. Toggle **Developer mode** on (top-right)
3. Click **Load unpacked** → select `extension/dist/`
4. The Brain icon appears in the toolbar. Pin it from the puzzle-piece menu if hidden.

## Configure

1. Right-click the Brain icon → **Options** (or Details → Extension options)
2. Paste your bearer token from `https://brain.arunp.in/settings/device-pairing`
3. Click **Test connection** → expect ✅ PASS
4. Click **Save**

## Use

- **Click the Brain icon** on any page → popup shows title + URL → **Save to Brain**
- **Right-click any page** → **Save this page to Brain**
- **Select text, then right-click** → **Save selected text to Brain**
- Captures appear in Library within ~5 seconds.

## Rebuild after code changes

```bash
cd extension && npm run build
```

Then on the extensions page, click the **reload** (↻) icon on the Brain card. Popup and service worker pick up the new bundle immediately.
