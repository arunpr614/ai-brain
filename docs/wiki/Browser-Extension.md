# Browser Extension

Purpose: Document the Chrome extension capture client and its security/operational boundaries.
Audience: AI agents and client contributors.
Verified against: `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`.
Runtime evidence through: Historical end-to-end evidence exists; latest production selected-text flow was not independently re-verified.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

**Status:** Implemented · **Confidence:** High for code, Medium for latest runtime · **Availability:** User-installed extension

Chrome Manifest V3 provides popup URL capture and context menus for page, link, and selected-text capture. The service endpoint is hard-coded and shown read-only in Options; only the bearer token is stored in extension local storage. Requests rely primarily on the bearer token. The extension does not send a client-version header, and Chrome-extension origins are broadly accepted before the canonical capture result is shown.

The extension does not provide store-publication proof, automatic content overlays, augmented-browsing highlights, offline queueing, or per-device token revocation. Selected text preserves the passage with page context but remains subject to server dedup/quality rules.

Primary files: `extension/manifest.json`, `extension/src/background.ts`, `capture.ts`, popup/options sources, capture selected-text code and tests.

## User journey and states

Install unpacked/user-distributed extension → paste token in Options → save current page from popup or page/link/selection from context menu → wait for API response → view canonical success/limited/duplicate/failure feedback. Missing token, unsupported selection/context, auth rejection, network failure and limited extraction remain distinct.

Empty page/link/selection input is rejected without capture. Loading displays request progress until a canonical result arrives.

## Architecture, data, configuration, and security

Manifest/background registers context menus and delegates normalized requests to `extension/src/capture.ts`. The fixed endpoint and locally stored bearer credential are the only client configuration; captured content becomes normal server items/provenance/artifacts. No model runs in the extension. The global token, broad Chrome-extension origin acceptance and local storage are explicit trust limitations.

## Tests, operations, and change impact

Evidence includes extension build configuration, `src/lib/capture/selected-text.ts`, user-provided/selected-text tests, capture route tests and historical manual E2E records. Changes require extension build/load validation plus server API compatibility; store publication is not claimed. They can affect dedup, extraction quality, capture source attribution, review links and token rotation. Pinned evidence: [current extension source](https://github.com/arunpr614/ai-brain/tree/23868faf13c8e3d0821715e6f5d0e3d2af1e1a34/extension).

Related current features are bearer auth, URL/selected-text capture and Review. Related ideas include augmented-browsing overlays and append-to-existing-note actions.
