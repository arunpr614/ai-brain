# Browser Extension

Purpose: Document the Chrome extension capture client and its security/operational boundaries.
Audience: AI agents and client contributors.
Verified against: `167a15d57b8f70574a017ea4cda507870f3600d4`.
Runtime evidence through: Historical capture end-to-end evidence plus the 2026-07-22 attested 0.7.0 release artifact and stable local install. The release extension has not been loaded, paired, or used for a signed-in NotebookLM canary.
Last reviewed: 2026-07-22.
Owner: AI Brain maintainer.

**Status:** Capture implemented; NotebookLM connector experimental · **Confidence:** High for code and attested artifact, Medium for latest capture runtime, no live-provider confidence yet · **Availability:** Capture is user-installed; NotebookLM release artifact is installed locally but not loaded or paired

Chrome Manifest V3 provides popup URL capture and context menus for page, link, and selected-text capture. The capture service endpoint is hard-coded and shown read-only in Options; its only stored capture credential is the bearer token. Capture requests rely primarily on that bearer token. The extension does not send a client-version header, and Chrome-extension origins are broadly accepted before the canonical capture result is shown.

The same packaged extension now contains a distinct experimental NotebookLM connector. Its optional host permission is limited to `https://notebooklm.google.com/*`; [https://notebooklm.google/](https://notebooklm.google/) is only the public product entrance/sign-in link. NotebookLM setup uses a separate scoped connector credential, exact paired extension origin, protocol version, one fixed local notebook binding, and browser-managed Google session. It does not reuse the page-capture bearer as its provider credential, request Chrome's cookie API, or send Google session material or raw notebook/source identifiers to AI Memory.

The extension does not provide store-publication proof, automatic content overlays, augmented-browsing highlights, offline capture queueing, or per-device capture-token revocation. Selected text preserves the passage with page context but remains subject to server dedup/quality rules. NotebookLM is a separate durable server queue, but production remains UI-only `1:0:0`: queueing and provider writes are off, the extension is not loaded or paired, and no target, source, canary, or owner-only real-content enablement is claimed.

Primary files: `extension/manifest.json`, `extension/src/background.ts`, `capture.ts`, popup/options sources, `extension/src/notebooklm/`, capture selected-text code and tests.

## User journey and states

For capture: install the unpacked/user-distributed extension → paste token in Options → save current page from popup or page/link/selection from context menu → wait for API response → view canonical success/limited/duplicate/failure feedback. Missing token, unsupported selection/context, auth rejection, network failure and limited extraction remain distinct.

For NotebookLM after a separately authorized rollout: load the verified stable-path extension → open Options → open the public sign-in entrance → grant the narrow optional authenticated-app permission → exchange a short-lived AI Memory connector code → bind and verify one exact owner-only private notebook. That flow is not currently complete in production.

Empty page/link/selection input is rejected without capture. Loading displays request progress until a canonical result arrives.

## Architecture, data, configuration, and security

Manifest/background registers context menus and delegates normalized capture requests to `extension/src/capture.ts`. Captured content becomes normal server items/provenance/artifacts. No model runs in the extension. Capture retains the global-token and broad Chrome-extension-origin limitations. NotebookLM uses separate local target/account routing, scoped token, content-free delivery journal, and raw provider references; Chrome local storage is not application-level encrypted.

## Tests, operations, and change impact

Evidence includes extension build configuration, `src/lib/capture/selected-text.ts`, user-provided/selected-text tests, capture route tests, historical capture E2E records, and the attested 0.7.0 artifact. The NotebookLM connector also has protocol, local-journal, privacy/preflight, create/reconcile/poll, and release-installer coverage, but no signed-in provider canary. Changes require extension typecheck/test/build/load validation plus server API compatibility; store publication is not claimed. They can affect capture dedup/extraction/attribution/review/token rotation or, separately, NotebookLM target privacy, duplicate safety, and provider-write controls. Pinned evidence: [protected-main extension source](https://github.com/arunpr614/ai-brain/tree/167a15d57b8f70574a017ea4cda507870f3600d4/extension).

Related current features are bearer auth, URL/selected-text capture and Review. Related ideas include augmented-browsing overlays and append-to-existing-note actions.
