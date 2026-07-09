# Feature PRD v2 - Web Capture, Settings, Pairing, Export, and Provider Health

**Created:** 2026-06-15 23:34:55 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Status:** Revised after adversarial review; approved for implementation planning.

## 1. Feature Summary

This feature slice completes the remaining high-risk web operational surfaces in the UX v2 revamp:

- `/capture` for URL, PDF, and note capture.
- `/settings` for appearance, organization links, provider status, internal snapshot copy, privacy/offline roadmap copy, and manual export.
- `/settings/device-pairing` for code-entry Android pairing and safe advanced token handling.
- `/api/library/export.zip` for manual library export validation.
- `/api/settings/provider-status` for provider health validation and secret-safe status display.

The slice preserves real functionality while removing or disabling false prototype claims. It must not ship QR pairing, fake connected-device state, fake offline sync/cache, fake automatic backup/restore, fake provider metrics, telemetry controls, E2EE claims, storage charts, or destructive account/data controls.

## 2. Decisions From Adversarial Review

| Review issue | PRD v2 decision |
| --- | --- |
| Raw token exposure | The raw bearer token must not be visible on ordinary `/settings/device-pairing` page load. Advanced token setup may remain only behind an explicit reveal/copy disclosure and must never appear in screenshots/reports unredacted. |
| Capture QA external dependency | Required local QA must not depend on public website extraction. Browser success/weak/failure states use deterministic local fixtures, synthetic seeded items, route-state fixtures, or local API tests. |
| Backup overclaim | Settings may show only internal server snapshot status with copy that restore is not validated in the UI. No user-facing backup/restore promise ships in this slice. |
| Export private-data risk | Export validation must run only against a temporary seeded DB. Reports may include counts, synthetic filenames, headers, and redaction scan results, not real saved content. |
| Provider cache/live-state risk | Provider status QA must reset cache or start with forced provider state before first Settings load. Live provider availability is not required for local completion. |
| Pairing code sensitivity | Pairing-code screenshots must use local QA only, avoid transcribing active codes into reports, and prefer expired/redacted evidence where practical. |

## 3. Problem Statement

The remaining web surfaces touch capture reliability, cross-device pairing, provider availability, manual export, privacy/offline trust copy, and token handling. These are release-risky because false success states or leaked secrets would damage trust more than missing polish.

This slice makes those flows truthful, testable, and evidence-backed before integrated QA and release work.

## 4. Goals

1. Make capture states understandable and truthful for URL, PDF, and note capture.
2. Preserve real capture APIs and result payload contracts.
3. Keep Settings useful while disabling or hiding unsupported roadmap controls.
4. Preserve manual library export as a user-initiated zip download after validation on synthetic data.
5. Show provider health only from real provider probes or deterministic test seams, with secret-safe messages.
6. Preserve code-entry Android pairing while preventing raw-token leakage in ordinary UI and evidence.
7. Add deterministic fixtures and browser evidence for every active state in this slice.
8. Keep release gates explicit: local completion is not production deployment.

## 5. Non-Goals

- No QR pairing or QR scanner claim.
- No Android app implementation in this slice.
- No connected-device registry, fake synced devices, last-sync timestamps, or device inventory.
- No offline sync, offline Ask, offline capture, offline cache, clear-cache control, or "read-only cached items" claim.
- No automatic backup/restore user feature.
- No delete-all-data, account deletion, telemetry, crash-reporting, or E2EE settings.
- No live production deploy or live Android pairing claim in this slice.
- No required QA dependency on public websites or live provider availability.

## 6. User Stories

| Priority | Story | Acceptance |
| --- | --- | --- |
| P0 | As Arun, I want URL capture to tell me what happened. | Success, invalid URL, duplicate URL, weak capture, and failure states have truthful copy and no fake success. Required browser evidence uses deterministic local/synthetic paths. |
| P0 | As Arun, I want note capture to be simple and reliable. | Title/body validation is clear; success redirects to item detail; saved note is full-text. |
| P0 | As Arun, I want PDF capture to be safe and predictable. | Dropzone supports PDF only, size copy matches server limit, upload failure is visible, keyboard/touch activation is checked, and success redirect is verified through deterministic data or API-level validation. |
| P0 | As Arun, I want Settings to avoid fake controls. | Unsupported offline, telemetry, E2EE, connected-device, automatic-backup/restore, storage-chart, and destructive controls are hidden or disabled with truthful copy. |
| P0 | As Arun, I want manual export to work if it is visible. | Authenticated export returns a zip with Markdown files and README from a temporary seeded DB; unauthenticated export returns 401; UI calls it manual export, not backup/sync. |
| P0 | As Arun, I want provider health to be honest. | Provider status covers ok/unconfigured/unreachable/quota/invalid/unknown through deterministic tests and never exposes secrets or stack traces. |
| P0 | As Arun, I want Android pairing to be clear. | The web page generates short-lived one-time codes, shows expiry/regenerate states, and avoids QR/synced-device claims. |
| P0 | As Arun, I do not want screenshots or docs to leak tokens. | Raw bearer tokens, cookies, PINs, pairing secrets, provider keys, env values, and raw exchange tokens are absent from browser evidence and Markdown reports. |

## 7. Functional Requirements

### 7.1 Capture

| Requirement | Details |
| --- | --- |
| URL form | Preserve URL tab, prefilled `?url=`, validation, duplicate handling, Save again anyway, and redirect to item detail on success. |
| Deterministic URL states | Created full text, duplicate existing, weak/needs-upgrade, invalid URL, and failed capture evidence must not depend on public websites. Use local fixture server, seeded DB route states, or API tests. |
| Note form | Preserve title/body validation, saving, redirect, and item-detail capture banner. |
| PDF dropzone | Preserve click, keyboard activation, drag/drop, file picker, PDF-only validation, 50 MB copy, upload error, and success redirect. |
| Capture banners | Item detail must show capture result banners for created, duplicate, updated, weak, saved-with-error, and failed-without-save states where route state permits. |
| No fake result cycling | UI cannot simulate result states not backed by real action/API response or deterministic fixture route. |

### 7.2 Settings

| Requirement | Details |
| --- | --- |
| Appearance | Preserve theme selector and route-safe display. |
| Organization | Preserve Tags, Collections, and Device pairing links. Tags/collections settings in this slice are route/copy smoke only unless this implementation changes their mutation controls. |
| Provider health | Show real LLM and embedding status from `getProviderStatusReport()` or an implementation-safe deterministic test seam; copy must be user-facing and secret-safe. |
| Export | Show manual `library.zip` export only after export validation passes on synthetic data. |
| Privacy/offline | Use truthful informational copy only; active controls remain disabled/roadmap unless implemented. |
| Internal snapshots | Backup status, if shown, must be framed as internal server snapshots. The UI must not claim user-managed backup/restore or restore readiness. |
| Forbidden copy | No stale `AI Brain`, fake offline cache, "stays on your devices", QR, E2EE, telemetry, connected devices, fake provider metrics, storage chart, delete-all-data, user-managed backup, or restore-ready claim. |

### 7.3 Pair Device

| Requirement | Details |
| --- | --- |
| Auth gate | Unauthenticated `/settings/device-pairing` redirects to `/unlock?next=/settings/device-pairing`; API endpoints return 401 where applicable. |
| Code generation | Authenticated page can POST `/api/settings/device-pairing` and show code, expiry countdown, expired state, and regenerate. |
| Code exchange | `/api/settings/device-pairing/exchange` maps valid, invalid, expired, used, rate-limited, and token-not-configured states correctly. |
| Token default-hidden | Raw bearer token is not visible by default. If advanced token setup remains, it is collapsed behind a deliberate reveal action and QA screenshots avoid/reject visible token values. |
| Exchange redaction | API exchange success validation records status, cache headers, key presence, token length/fingerprint/redacted marker only. Raw token values are never written into reports. |
| No QR/device-sync claims | Page must not show QR, fake device list, synced status, last sync, Pixel device, or connected-device registry. |

### 7.4 Manual Export

| Requirement | Details |
| --- | --- |
| Synthetic-only validation | Export QA runs against `/tmp` seeded SQLite databases only. Do not validate export using Arun's real library. |
| Authenticated export | Cookie-authenticated GET `/api/library/export.zip` returns `200`, `application/zip`, no-store, and a dated filename. |
| Unauthenticated export | Missing session returns `401` JSON. |
| Zip contents | Zip contains `README.md` plus one Markdown file per exported synthetic item, grouped by source type, with safe deduped filenames. |
| Secret safety | Redaction scan confirms exported synthetic Markdown contains no cookies, bearer tokens, env values, provider keys, pairing codes, or token-like accidental fixtures. |
| Empty library | Export works with zero items and still includes a README. |

### 7.5 Provider Health

| Requirement | Details |
| --- | --- |
| API auth | `/api/settings/provider-status` returns `401` without session and no-store headers. |
| Status coverage | Local tests cover ok, unconfigured, unreachable, quota/billing, invalid response, unknown. |
| UI mapping | Settings maps degraded statuses to truthful labels/copy and never shows green success for degraded providers. |
| Cache control | Tests or browser QA must avoid stale status by resetting cache, using dependency injection, or starting the dev server with forced provider state before the first Settings load. |
| Secret redaction | Messages from provider errors are redacted and converted to safe product copy. |

## 8. Data, Privacy, and Security

- This slice handles private saved content, uploaded PDFs, manual notes, export zips, provider status, pairing codes, and bearer tokens.
- Browser screenshots must not show raw bearer tokens, cookies, PINs, provider keys, env values, or pairing secrets after exchange.
- Pairing code screenshots are allowed only in local QA. Reports must not transcribe active code text.
- Export zips must stay local and must be generated from temporary seeded data only.
- Provider errors must be redacted before display.
- Any generated JSON report must redact raw token-like values before saving.

## 9. Deterministic QA Requirements

Create a deterministic seed/harness for this slice that can exercise:

- Existing duplicate URL without external network.
- Weak URL/capture-result state without external network.
- Successful note capture.
- PDF invalid type and invalid PDF upload failure.
- Export with zero items and with mixed synthetic seeded items.
- Provider ok/degraded statuses with cache-safe setup.
- Pairing code generation, expiry/expired UI, token-not-configured state, and exchange error mapping.
- Missing auth states for export, provider status, and pairing APIs.
- Forbidden-copy and token-like-value scans across screenshots metadata, JSON reports, and Markdown reports where feasible.

## 10. Acceptance Criteria

| Gate | Required result |
| --- | --- |
| PRD cycle | PRD v1, adversarial review, PRD v2 created as Markdown files. |
| Plan cycle | Implementation plan v1, adversarial review, implementation plan v2 created as Markdown files. |
| Static checks | `git diff --check`, focused tests, typecheck, lint, full tests, build pass or documented no-go. |
| Capture browser QA | `/capture` URL/PDF/note desktop and mobile states captured; invalid/duplicate/failure states verified without public-network dependency. |
| Capture interaction QA | Tab switching and PDF dropzone activation are checked for desktop keyboard and mobile/touch-visible layout. |
| Settings browser QA | `/settings`, `/settings/tags`, `/settings/collections`, and provider/export sections captured; forbidden-copy scan passes. |
| Pairing browser/API QA | Code generation, regenerate/expiry, token-not-configured state, auth redirect/API 401, exchange error mapping, and token-default-hidden state verified. |
| Export QA | Authenticated zip validated locally from synthetic DB; unauthenticated 401 verified; contents inspected without exposing private saved content. |
| Provider QA | Provider status API/UI degraded state verified with cache-safe setup and no secret leakage. |
| Secret-safety QA | No raw bearer token, exchange token, cookie, PIN, provider key, env value, or active pairing code appears in QA Markdown/JSON reports. |
| Console QA | Final route sweep has 0 fresh browser console warnings/errors. |
| Project tracker | QA report, tracker update, PM checkpoint incorporation, and running-log entry created after execution. |

## 11. Release Gates

This slice is complete locally only when all acceptance criteria pass. Production remains blocked until:

- Remaining Android scope is completed or explicitly excluded from release claims.
- Route-state matrix is reconciled with completed slices.
- Manual keyboard/accessibility release pass is done.
- Integrated route QA across all changed web slices is done.
- Code review and release packet are complete.
- Backup/rollback runbook is verified.
- Production deploy and live smoke pass.

## 12. Residual Risks

- Pairing code screenshots remain sensitive even when short-lived.
- Export validation can expose private data if the harness is pointed at the wrong DB; implementation plan must hard-code `/tmp` QA DBs and report the DB path.
- Provider health proves configured local conditions, not long-term provider reliability.
- Android pairing still needs separate device/emulator evidence before any Android claim.
