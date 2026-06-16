# Feature Release A29 - Android Capture Source Attribution PRD v1

Created: 2026-06-17 00:18:00 IST
Owner: Codex
Status: Draft for adversarial review
Discovered by: A28 native Android URL-share proof

## Problem

A28 proved that a native Android `ACTION_SEND` URL share can save a full-text production item and show the user `Saved to AI Memory`. However, production DB verification showed the item was saved with `capture_source=unknown` rather than `capture_source=android`.

The server already supports trusted capture-source attribution through `x-brain-capture-source`, but the Android share handler does not send that header on URL/note JSON captures or PDF uploads. This prevents production evidence and UI surfaces from accurately identifying Android-originated captures.

## Goal

Ensure native Android share captures are attributed as Android in production for URL, note, and PDF capture calls, then rerun a native Android URL-share proof to verify `capture_source=android`.

## Non-Goals

- Do not change auth semantics or bearer validation.
- Do not add new capture-source enum values.
- Do not publish or distribute the APK.
- Do not perform TalkBack spoken-order audit.
- Do not stage root `RUNNING_LOG.md`, raw logs, screenshots, APKs, DBs, `.env`, keystores, `assets/`, or `data/artifacts/`.

## Requirements

1. Android share-handler JSON requests to `/api/capture/url` and `/api/capture/note` must include `x-brain-capture-source: android`.
2. Android share-handler PDF upload requests to `/api/capture/pdf` must include `x-brain-capture-source: android`.
3. Existing content type and authorization headers must continue to work.
4. Tests must cover the Android header behavior in a maintainable way.
5. Source must pass typecheck, lint, focused tests, full tests, and production build before deploy.
6. Production must be deployed because the APK WebView loads the live web app.
7. A new native Android URL-share fixture must be run after deploy.
8. Production DB verification must show `capture_source=android`, `capture_quality=full_text`, `extraction_method=readability`, and exact fixture cleanup to zero.

## Acceptance Criteria

| Gate | Pass condition |
| --- | --- |
| Governance | PRD v1, adversarial review, PRD v2, plan v1, plan review, and plan v2 exist before code edits. |
| Implementation | Android URL/note/PDF capture requests include trusted Android source header. |
| Regression tests | Test coverage proves header construction or request behavior. |
| Validation | Typecheck, lint, tests, build, env check, and build-artifact check pass before deploy. |
| Deploy | Production deploy succeeds and health/smoke checks pass. |
| Native proof | New Android URL share saves a full-text item with `capture_source=android`. |
| Cleanup | Fixture and related rows are deleted and verified at zero. |
| Evidence hygiene | Only redacted/summarized log and production evidence are tracked. |

## No-Go Conditions

- Header is added in a way that exposes tokens or breaks auth.
- Header is accepted from untrusted non-bearer paths beyond the existing server contract.
- Native rerun still saves with `capture_source=unknown`.
- Cleanup fails.
- Raw secrets or heavy/runtime artifacts are staged.
