# PRD-14 Trust Copy Smoke

Created: 2026-06-14 11:40 IST
Owner: Codex lead integrator
Scope: PRD-14 informational privacy/offline copy only

## Files Checked

- `src/lib/settings/trust-copy.ts`
- `src/app/settings/page.tsx`
- `src/app/more/page.tsx`
- `public/offline.html`
- `public/sw.js` for offline-service-worker copy audit context

## Copy Audit

Command:

```sh
rg -n -i "end-to-end|encrypted|anonymous|AI Brain|Your Brain|offline|sync|QR|telemetry|private by default|private memory" src/app/settings src/app/more public/offline.html src/lib/settings/trust-copy.ts public/sw.js
```

Result:

- `AI Brain`: no matches in the audited files.
- `Your Brain`: no matches in the audited files.
- `anonymous`: no matches.
- `telemetry`: no matches after removing the More privacy row wording.
- `QR` / `Re-scan`: no matches in the touched offline/More/Settings surfaces; only `async` and file/function names appeared in the broad search.
- `encrypted`: only appears in the explicit negative statement: "End-to-end encryption is not active yet."
- `offline`: allowed matches in offline trust copy, `offline.html`, and service-worker implementation comments.
- `sync`: allowed matches only in explicit server-required copy and implementation comments; the More section title no longer says `Sync & Devices`.
- `private by default` / `private memory`: no matches in the audited files after More copy changed to `Personal memory workspace`.

## Browser Smoke

Target: `http://127.0.0.1:3000`

Settings page:

- `/settings` loaded.
- `Privacy controls` present.
- `Coming soon` present.
- `Manage privacy controls` button is disabled.
- `Offline access` present.
- `Server required` present.
- `There is no offline queue` present.
- No `gpg-encrypted`, `QR`, or `Re-scan` copy present.

Mobile More page:

- Viewport: 390 x 844.
- `/more` loaded.
- `Devices` section present.
- `Sync & Devices` absent.
- `Personal memory workspace` present.
- `Privacy controls` present.
- `Coming soon` present.
- `Offline access` present.
- `Server required` present.
- `There is no offline queue` present.
- Provider names match Settings: `Claude generation`, `Gemini semantic indexing`.
- No `telemetry`, `QR`, or `Re-scan` copy present.

Offline page:

- `/offline.html` loaded.
- `AI Memory needs the server` present.
- Copy says Ask, capture, export, and sync require server access.
- Copy says there is no offline capture queue.
- `Pair device` present.
- No `enable offline mode`, `QR`, or `Re-scan` copy present.

## Automated Validation

- `npm run typecheck` passed.
- `npm run lint` passed with the existing `src/lib/queue/enrichment-batch-cron.ts:49` unused-disable warning.
- `npm test` passed: 455 tests, 65 suites, 0 failures.
- `npm run build` passed with the known `unpdf` warning.

## Deferred / Blocked

- Active offline downloads, offline Ask, offline capture queue, and sync controls remain blocked by D-007.
- QR pairing remains blocked by D-008 and was not implemented.
- Android package-ID change remains blocked by D-013 and was not implemented.
- Android device validation remains blocked by no attached device/emulator.
- Production/live deploy was not requested or performed.
