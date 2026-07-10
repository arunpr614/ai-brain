# Web Experience Revamp Capability Audit

**Created:** 2026-06-15 21:48:07 IST
**Status:** Phase 1 gate artifact.

| Capability | Current evidence | Revamp risk | Required validation |
|---|---|---|---|
| Auth/session | `src/app/auth-actions.ts`, `src/proxy.ts`, `/unlock`, `/setup` | Visual changes could break form actions, redirects, or session copy | Unlock/setup smoke; unauth redirect smoke |
| Library | `/library`, `src/components/library-list.tsx`, topic/collection data paths | UI changes could hide quality/status/action context | Mixed fixture screenshots; filter/select interaction |
| Search | `/search`, `/api/search`, retrieval tests | Search UI could drift from results behavior | Empty/results/no-results smoke; console/network capture |
| Item detail | `/items/[id]`, related items/topics/collections | Detail layout could hide repair, source quality, related context | Full/metadata/failed item screenshots |
| Needs Upgrade | `/needs-upgrade`, review/quality helpers | Product could imply automatic repair that does not exist | Populated/empty screenshots; repair path smoke |
| Ask/citations | `/ask`, `/api/ask`, thread routes | Scope/citation UI could overclaim answer quality | Local Ask smoke with citations/no-context/error states |
| Capture URL/note/PDF | `/capture`, `/api/capture/*`, capture tests | UI revamp could break form actions or duplicate/update truthfulness | Local mutation smoke; cleanup proof |
| Provider status | `/api/settings/provider-status`, `scripts/check-ai-providers.mjs` | Settings UI could show stale/false health | Local provider-status call; deploy provider check |
| Export | `/api/library/export.zip`, `/api/items/[id]/export.md` | UI could expose export without verifying files/content | Local export smoke; no secret/private data in evidence |
| Storage | SQLite DB under `data/brain.sqlite`; migrations through build/tests | UI-only work should not change schema unless documented | Data risk review; migration/no-migration declaration |
| Pair Device web | `/settings/device-pairing`, `/api/settings/device-pairing` | UI could expose token/code or break short-lived code path | Code generation smoke; redacted evidence |
| Pair Device Android | Existing APK `brain-debug-v1.0.2-code3.apk`; exchange API public | Web claim invalid without real APK/WebView validation | Emulator/device install, pair, relaunch, invalid/expired code |
| Offline/service worker | `/offline.html`, `/sw.js`, proxy public path | Auth redirect or asset change could break offline fallback | Public asset smoke; Android offline after data clear |
| Public assets | `/ai-memory-logo.png`, icons, manifest | Deploy could omit assets or manifest | Build artifact check; live asset smoke |
| `/more` responsive route | Existing route from Magic Patterns/mobile release | Nav-only route can regress unnoticed on desktop/mobile | Route screenshot at mobile + desktop |

## API Change Policy

The revamp should be UI-first. Any API/schema/storage change must be called out in the route-state matrix and release packet with rollback and tests before deploy.
