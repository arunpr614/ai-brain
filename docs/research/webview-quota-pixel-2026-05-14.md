# WebView quota measurement — Pixel 7 Pro — 2026-05-14

**Plan reference:** `docs/plans/v0.6.x-offline-mode-apk.md` v3 §8.1 (OFFLINE-PRE)
**Device:** Pixel 7 Pro (`2A121FDH300DXA`, model `cheetah`, Android 10 UA string)
**App version under test:** Brain 0.5.5 (APK `data/artifacts/brain-debug-0.5.5.apk`)
**Probe route:** `https://brain.arunp.in/debug/quota`
**Status:** PARTIAL — Chrome baseline captured; **APK WebView probe still needed**

---

## 1. Chrome (system browser) baseline — 2026-05-14 06:43 UTC

```json
{
  "timestamp": "2026-05-14T06:43:28.149Z",
  "userAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
  "isCapacitor": false,
  "storage": {
    "estimate": {
      "usage": 2486,
      "quota": 10737420726,
      "usageDetails": { "indexedDB": 2486 }
    },
    "persistGranted": false,
    "persistError": null
  },
  "serviceWorker": { "available": true, "controller": false },
  "webWorker": { "available": true },
  "decisions": {
    "quotaTier": "generous",
    "pdfMvpScope": "in",
    "workboxCandidate": "yes",
    "sha256Strategy": "web-worker",
    "persistFallback": "warn-user-on-init"
  }
}
```

### 1.1 Headline findings (browser context)

| Dimension | Value | Plan branch |
|---|---|---|
| Storage quota | **10.00 GB** | **Generous** (>1 GB) — PDF MVP IN |
| Current usage | 2.4 KB | n/a |
| `persist()` | **denied** | Fallback: warn-user-on-init |
| Service Worker API | available | n/a (not used in v0.6.x) |
| Web Worker API | available | SHA-256 strategy: web-worker (off-thread) |

### 1.2 Caveat

`isCapacitor: false` — the probe was opened in Chrome on the Pixel, NOT inside the Brain APK WebView. Some signals (esp. `persistGranted`) commonly differ between system Chrome and an installed Capacitor WebView app:

- Chrome applies "site engagement" heuristics before granting persist; a freshly-visited domain typically gets `false`.
- Installed PWAs / Capacitor WebViews are often granted persist automatically because the OS considers the app "installed."

Therefore the `persistGranted: false` here does NOT yet confirm the APK fallback path is needed at install time.

## 2. APK WebView probe — PENDING

**How to run inside the APK** (Brain doesn't have a URL bar, so options):

- **Option A:** Add a temporary "Quota probe" link in Brain's settings (one-line code change), or
- **Option B:** Force the route via deep link: `adb shell am start -n com.arunprakash.brain/.MainActivity -a android.intent.action.VIEW -d "capacitor://localhost/debug/quota"`, or
- **Option C:** From inside Brain, paste the route into a captured note and tap it (works if note rendering autolinks paths).

Once the APK probe runs, append a §3 below with the same JSON shape and a comparison table.

## 3. Decisions locked from §1 (still valid for plan v3)

Even with only the browser baseline, the four pre-flight decisions in plan §8.1 are answerable:

1. **Quota tier:** generous — proceed with PDF MVP in scope.
2. **PDF MVP scope:** IN.
3. **SHA-256 strategy:** web-worker (off-thread; inline fallback retained for guard rejection).
4. **persist() fallback:** warn-user-on-init copy ships either way (defensive default per plan §6.1).

The APK-vs-Chrome delta will inform two things:

- Whether `persistGranted` differs (likely yes for installed APK).
- Whether the WebView quota differs from Chrome's (rare on modern Android System WebView; both share the Chromium origin).

Neither delta blocks v0.6.x ship. Both inform the §10 manual matrix evidence.

## 4. Cross-references

- `docs/plans/v0.6.x-offline-mode-apk.md` v3 §8.1 — OFFLINE-PRE definition
- `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md` §1.5 — pre-flight P-5
- `src/app/debug/quota/quota-probe.tsx` — probe source
- `src/app/api/errors/client/route.ts` — receiver (the "no-bearer-token" failure on this run is expected outside the APK)
