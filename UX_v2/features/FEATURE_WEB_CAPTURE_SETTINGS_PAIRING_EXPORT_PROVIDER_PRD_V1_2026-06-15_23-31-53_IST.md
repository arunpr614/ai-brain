# Feature PRD v1 - Web Capture, Settings, Pairing, Export, and Provider Health

**Created:** 2026-06-15 23:31:53 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Status:** Draft for adversarial review. Do not execute until PRD v2 and implementation plan v2 exist.

## 1. Feature Summary

This feature slice completes the remaining high-risk web operational surfaces in the UX v2 revamp:

- `/capture` for URL, PDF, and note capture.
- `/settings` for real settings, provider status, manual export, privacy/offline/backup copy, and truthful disabled-roadmap states.
- `/settings/device-pairing` for code-entry Android pairing and safe advanced token handling.
- `/api/library/export.zip` for manual library export validation.
- `/api/settings/provider-status` for provider health validation and secret-safe status display.

The slice must preserve existing real functionality while removing or disabling false prototype claims. It must not ship QR pairing, fake connected-device state, fake offline sync/cache, fake automatic backups, fake provider metrics, telemetry controls, E2EE claims, storage charts, or destructive account/data controls.

## 2. Problem Statement

The earlier UX v2 slices cleaned up shell, library, search, topics, collections, item detail, Ask, and Needs Upgrade. The remaining web surfaces still contain the highest release-risk claims because they touch capture reliability, cross-device pairing, provider availability, manual export, privacy/offline trust copy, and token handling.

If these surfaces are shipped without tighter product rules:

- Capture can report success or failure ambiguously.
- Pairing screenshots can expose secrets or imply QR/device-sync capabilities that are not implemented.
- Settings can overclaim backup, offline, privacy, provider, or connected-device states.
- Manual export can be mistaken for backup/restore.
- Provider health can leak internal errors or show green status without real validation.

## 3. Goals

1. Make capture states understandable and truthful for URL, PDF, and note capture.
2. Preserve real capture APIs and result payload contracts.
3. Keep Settings useful while disabling or hiding unsupported roadmap controls.
4. Preserve manual library export as a user-initiated zip download if validation passes.
5. Show provider health only from real provider probes and secret-safe messages.
6. Preserve code-entry Android pairing while preventing raw-token leakage in ordinary UI and evidence.
7. Add deterministic fixtures and browser evidence for every active state in this slice.
8. Keep release gates explicit: local completion is not production deployment.

## 4. Non-Goals

- No QR pairing or QR scanner claim.
- No Android app implementation in this slice.
- No connected-device registry, fake synced devices, last-sync timestamps, or device inventory.
- No offline sync, offline Ask, offline capture, offline cache, clear-cache control, or "read-only cached items" claim.
- No automatic backup/restore feature unless a separate backup/restore implementation and release validation exists.
- No delete-all-data, account deletion, telemetry, crash-reporting, or E2EE settings.
- No live production deploy or live Android pairing claim in this slice.
- No external network dependency in required local QA; external capture/provider checks may be documented as optional or blocked.

## 5. User Stories

| Priority | Story | Acceptance |
| --- | --- | --- |
| P0 | As Arun, I want URL capture to tell me what happened. | Valid URL success redirects to item detail with a capture banner. Invalid URL, duplicate URL, weak capture, and capture failure have truthful copy and no fake success. |
| P0 | As Arun, I want note capture to be simple and reliable. | Title/body validation is clear; success redirects to item detail; saved note is full-text and searchable later. |
| P0 | As Arun, I want PDF capture to be safe and predictable. | Dropzone supports PDF only, size copy matches server limit, upload failure is visible, and successful upload redirects with the correct capture state. |
| P0 | As Arun, I want Settings to avoid fake controls. | Unsupported offline, telemetry, E2EE, connected-device, automatic-backup, storage-chart, and destructive controls are hidden or disabled as roadmap with truthful copy. |
| P0 | As Arun, I want manual export to work if it is visible. | Authenticated export returns a zip with Markdown files and README; unauthenticated export returns 401; UI calls it manual export, not backup/sync. |
| P0 | As Arun, I want provider health to be honest. | Provider status comes from `/api/settings/provider-status`, covers ok/unconfigured/unreachable/quota/invalid/unknown, and never exposes secrets or stack traces. |
| P0 | As Arun, I want Android pairing to be clear. | The web page generates short-lived one-time codes, shows expiry/regenerate states, and avoids QR/synced-device claims. |
| P0 | As Arun, I do not want screenshots or docs to leak tokens. | Raw bearer tokens, cookies, PINs, pairing secrets, provider keys, and env values are not visible in browser evidence or Markdown reports. |
| P1 | As Arun, I want degraded states to be testable. | Seeded/local QA can force provider-down, export empty-library, capture failure, invalid upload, token-not-configured, and missing-auth states without production data. |

## 6. Functional Requirements

### 6.1 Capture

| Requirement | Details |
| --- | --- |
| URL form | Preserve URL tab, prefilled `?url=`, validation, duplicate handling, Save again anyway, and redirect to item detail on success. |
| URL result states | Evidence required for created full text, duplicate existing, weak/needs-upgrade capture, invalid URL, and failed capture. |
| Note form | Preserve title/body validation, saving, redirect, and item-detail capture banner. |
| PDF dropzone | Preserve click, keyboard activation, drag/drop, file picker, PDF-only validation, 50 MB copy, upload error, and success redirect. |
| Capture banners | Item detail must show capture result banners for created, duplicate, updated, weak, saved-with-error, and failed-without-save states where route state permits. |
| No fake result cycling | UI cannot simulate result states not backed by real action/API response or deterministic fixture route. |

### 6.2 Settings

| Requirement | Details |
| --- | --- |
| Appearance | Preserve theme selector and route-safe display. |
| Organization | Preserve Tags, Collections, and Device pairing links. |
| Provider health | Show real LLM and embedding status from `getProviderStatusReport()`; copy must be user-facing and secret-safe. |
| Export | Show manual `library.zip` export only after export validation passes. |
| Privacy/offline | Use truthful informational copy only; active controls remain disabled/roadmap unless implemented. |
| Backups | Do not present automatic backup/restore as a complete user feature unless backup and restore are validated. Existing backup status copy must not imply user-managed restore. |
| Forbidden copy | No stale `AI Brain`, fake offline cache, "stays on your devices", QR, E2EE, telemetry, connected devices, fake provider metrics, storage chart, or delete-all-data claim. |

### 6.3 Pair Device

| Requirement | Details |
| --- | --- |
| Auth gate | Unauthenticated `/settings/device-pairing` redirects to `/unlock?next=/settings/device-pairing`. |
| Code generation | Authenticated page can POST `/api/settings/device-pairing` and show code, expiry countdown, expired state, and regenerate. |
| Code exchange | `/api/settings/device-pairing/exchange` maps valid, invalid, expired, used, rate-limited, and token-not-configured states correctly. |
| Token safety | Raw bearer token must not be visible by default in screenshot-ready UI. If advanced token setup remains, it must be hidden behind an explicit reveal/copy interaction and evidence must redact it. |
| No QR/device-sync claims | Page must not show QR, fake device list, synced status, last sync, Pixel device, or connected-device registry. |

### 6.4 Manual Export

| Requirement | Details |
| --- | --- |
| Authenticated export | Cookie-authenticated GET `/api/library/export.zip` returns `200`, `application/zip`, no-store, and a dated filename. |
| Unauthenticated export | Missing session returns `401` JSON. |
| Zip contents | Zip contains `README.md` plus one Markdown file per exported item, grouped by source type, with safe deduped filenames. |
| Secret safety | Export content must not include cookies, bearer tokens, env values, provider keys, or pairing codes. |
| Empty library | Export works with zero items and still includes a README. |

### 6.5 Provider Health

| Requirement | Details |
| --- | --- |
| API auth | `/api/settings/provider-status` returns `401` without session and no-store headers. |
| Status coverage | Local tests cover ok, unconfigured, unreachable, quota/billing, invalid response, unknown. |
| UI mapping | Settings maps degraded statuses to truthful labels/copy and never shows green success for degraded providers. |
| Secret redaction | Messages from provider errors are redacted and converted to safe product copy. |
| Provider-down evidence | Local browser QA forces provider-down/unreachable without depending on live provider state. |

## 7. Data, Privacy, and Security

- This slice handles private saved content, uploaded PDFs, manual notes, export zips, provider status, pairing codes, and bearer tokens.
- Browser screenshots must not show raw bearer tokens, cookies, PINs, provider keys, env values, or pairing secrets after exchange.
- Pairing code screenshots are allowed only for temporary one-time codes and must be from a local QA dataset; reports should avoid reusing the exact code text unless necessary.
- Export zips must stay local and must not be attached to chat or uploaded.
- Provider errors must be redacted before display.

## 8. Deterministic QA Requirements

Create a deterministic seed/harness for this slice that can exercise:

- Existing duplicate URL.
- Weak URL capture or seeded capture-result route state.
- Successful note capture.
- PDF invalid type and invalid PDF upload failure.
- Export with zero items and with mixed seeded items.
- Provider-down status using local env/config override or dependency injection.
- Pairing code generation, expiry/expired UI, token-not-configured state, and exchange error mapping.
- Missing auth states for export, provider status, and pairing APIs.

## 9. Acceptance Criteria

| Gate | Required result |
| --- | --- |
| PRD cycle | PRD v1, adversarial review, PRD v2 created as Markdown files. |
| Plan cycle | Implementation plan v1, adversarial review, implementation plan v2 created as Markdown files. |
| Static checks | `git diff --check`, focused tests, typecheck, lint, full tests, build pass or documented no-go. |
| Capture browser QA | `/capture` URL/PDF/note desktop and mobile states captured; invalid/duplicate/failure states verified. |
| Settings browser QA | `/settings`, `/settings/tags`, `/settings/collections`, and provider/export sections captured; forbidden-copy scan passes. |
| Pairing browser/API QA | Code generation, regenerate/expiry, token-not-configured state, auth redirect/API 401, and exchange error mapping verified. |
| Export QA | Authenticated zip validated locally; unauthenticated 401 verified; contents inspected locally without sharing private export contents. |
| Provider QA | Provider status API/UI degraded state verified with no secret leakage. |
| Console QA | Final route sweep has 0 fresh browser console warnings/errors. |
| Project tracker | QA report, tracker update, and running-log entry created after execution. |

## 10. Release Gates

This slice is complete locally only when all acceptance criteria pass. Production remains blocked until:

- Remaining Android scope is completed or explicitly excluded from release claims.
- Manual keyboard/accessibility release pass is done.
- Integrated route QA across all changed web slices is done.
- Code review and release packet are complete.
- Backup/rollback runbook is verified.
- Production deploy and live smoke pass.

## 11. Open Questions for Adversarial Review

1. Should the advanced token setup remain on `/settings/device-pairing`, or should it move behind an explicit reveal/disclosure for screenshot safety?
2. Can provider status be forced deterministically without relying on live provider outages?
3. Should automatic backup status be hidden or recast as internal scheduler status until restore validation exists?
4. What is the safest local way to validate export zip contents without exposing private saved content?
5. Which capture states can be proven through real local actions, and which need seeded route-state fixtures?
