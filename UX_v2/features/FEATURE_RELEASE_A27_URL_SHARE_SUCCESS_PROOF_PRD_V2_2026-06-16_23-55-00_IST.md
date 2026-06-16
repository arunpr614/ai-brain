# Feature Release A27 URL Capture Success Proof PRD v2

Created: 2026-06-16 23:55:00 IST
Owner: PM sidecar / Codex
Status: Revised after adversarial review

## Problem

The delivery gate tracker still marks URL-share success as unresolved. Existing evidence proves:

- A12: native note share success with cleanup.
- A25: honest URL-share failure UI in production.
- A26: native share-target log hygiene in Android `1.0.5/code6`.

Existing evidence does not prove a URL capture can successfully create a saved item through the URL capture route.

## Revised Scope

A27 has two separate proof tiers:

1. `server_url_capture_success`: prove production `/api/capture/url` can save a deterministic full-text URL fixture and clean it up.
2. `native_android_url_share_success`: prove the Android share-intent path reaches the same success state on device/emulator.

This turn can execute tier 1. Tier 2 requires Android tooling or a physical device. In the resumed environment, `adb`, `emulator`, Android SDK Spotlight hits, and Homebrew Android tool prefixes are unavailable, so tier 2 cannot be honestly claimed here.

## Deterministic Fixture

Fixture URL:

`https://www.iana.org/help/example-domains?ai_brain_qa=a27-20260616-2355`

Local extraction preflight:

- title: `Example Domains`
- body length: 757
- capture quality: `full_text`
- source URL preserved with the unique query string

## Requirements

1. Run production `/api/capture/url` with the fixture URL and configured bearer token without printing or persisting the token.
2. Verify successful response status and `capture_result.state=created_full_text`.
3. Verify production DB contains exactly one fixture item after capture.
4. Record only redacted response/proof artifacts.
5. Cleanup production fixture with SQLite foreign keys enabled, targeting the exact fixture URL.
6. Verify production DB contains zero fixture items after cleanup.
7. Update trackers to close only `server_url_capture_success`.
8. Keep `native_android_url_share_success` open if no Android share-intent proof is captured.
9. Keep APK publication authorization and TalkBack spoken-order gates open.

## Acceptance Criteria

| Gate | Acceptance |
| --- | --- |
| Local extraction preflight | Fixture extracts as `full_text` with body length greater than 100. |
| Production API proof | `/api/capture/url` returns a saved item and `capture_result.state=created_full_text`. |
| Redacted evidence | Response artifact records status, item id, source URL, quality, state, and cleanup counts without bearer tokens. |
| Cleanup | Production DB fixture count is zero after cleanup with `PRAGMA foreign_keys=ON`. |
| Tracker honesty | Delivery docs say server URL capture success is proven and native Android URL-share success is still pending if Android tooling is unavailable. |

## Non-Goals

- Do not claim native Android URL-share success unless an Android share intent is run.
- Do not publish, sign, upload, or distribute an APK.
- Do not stage raw logs, raw DB dumps, token values, APKs, `data/artifacts/`, or root `RUNNING_LOG.md`.

## No-Go Gates

- If production capture fails, keep both URL success gates open and record the failure.
- If cleanup cannot be proven, keep the release blocked and document the fixture item id.
- If Android tooling remains unavailable, keep native URL-share proof open.

## Open Decisions

1. Does Arun require native Android URL-share success before APK publication, or is server URL capture success plus native note-share success enough?
2. Should Android SDK tools be restored in this workspace, or should remaining native proof move to a real device?
