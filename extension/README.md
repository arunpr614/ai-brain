# Brain — Chrome MV3 Extension

Captures pages from Chrome/Edge to your AI Brain library and runs the local half of approved, one-way Brain → consumer NotebookLM deliveries.

## Build

```bash
cd extension
npm install
npm run check
```

Build artifacts land in `extension/dist/`.

## Install an attested release into a stable browser path

Use the extension files from the successful **Product CI** package on `main`; do not load the per-release ZIP or a per-SHA extraction directory directly into Chrome. The operator tool checks that the download contains exactly one extension ZIP, release manifest, and checksum; verifies every archive path, size, and digest; requires Manifest V3; and verifies GitHub provenance against this repository, the Product CI workflow, `refs/heads/main`, and the full builder SHA.

Prerequisites are Node 22, a locked root dependency install, and an authenticated GitHub CLI. Choose one absolute install directory and keep using that exact path for every update. For example:

```bash
node scripts/install-verified-extension-release.mjs \
  /absolute/path/to/release-artifacts \
  "/Users/your-name/Library/Application Support/AI Brain/Chrome Extension" \
  --expected-sha 0123456789abcdef0123456789abcdef01234567
```

To perform all integrity and provenance checks without changing the installed directory:

```bash
node scripts/install-verified-extension-release.mjs \
  /absolute/path/to/release-artifacts \
  --expected-sha 0123456789abcdef0123456789abcdef01234567 \
  --verify-only
```

The command emits content-free JSON evidence with the application/builder SHA, extension version, artifact digest, main-branch provenance policy, and a hash of the stable path. Updates are staged beside the stable directory and replace it with rename operations; an existing version is retained as a recovery backup.

On the first install, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the stable directory. On later releases, run the same command against the same stable directory and click the **reload** (↻) icon on the Brain card. Chrome derives an unpacked extension's origin from its install identity, including its path when no manifest key pins the ID. Loading a per-SHA directory, moving the stable directory, or loading another copy can therefore change the extension origin. If the displayed extension ID changes, revoke or disconnect the old connector in Brain and pair the newly loaded origin again before sending anything.

The installed manifest version is shown in the Brain toolbar popup and at the top-right of the extension Options page. Use that displayed value when confirming which release Chrome has loaded.

## Load a local development build (developer-only)

1. Browser → `chrome://extensions` (or `edge://extensions`)
2. Toggle **Developer mode** on (top-right)
3. Click **Load unpacked** → select `extension/dist/`. Do not use this changing development path for the production connector.
4. The Brain icon appears in the toolbar. Pin it from the puzzle-piece menu if hidden.

## Configure page capture

1. Right-click the Brain icon → **Options** (or Details → Extension options)
2. Paste your bearer token from `https://brain.arunp.in/settings/device-pairing`
3. Click **Test connection** → expect ✅ PASS
4. Click **Save**

## Configure the NotebookLM connector

This is an experimental, unofficial consumer integration over undocumented NotebookLM web behavior. Google can change it without notice, and it is not a Google-supported integration.

1. Open the extension **Options** page.
2. Use **Open NotebookLM sign-in**, which intentionally opens `https://notebooklm.google/` as Google's public entry point. This public URL is not the authenticated RPC origin.
3. Click **Grant NotebookLM access**. The optional permission is limited to `https://notebooklm.google.com/*`, the authenticated app/RPC host.
4. Open `https://brain.arunp.in/settings/notebooklm-export`, create a fresh one-time connector code, and enter it under **Pair connector**. The code expires after five minutes, works once, and must not be shared or included in screenshots. The resulting connector credential is distinct from the page-capture bearer token.
5. Paste a specific `https://notebooklm.google.com/notebook/<uuid>` target URL. A numeric `?authuser=N` selector is accepted for secondary signed-in accounts and remains local.
6. Choose the **Brain safe source limit**, then click **Check and bind notebook**. The default is 45 and the allowed range is 45–259. This is the actual observed-source ceiling: a setting of 259 stops new exports when the notebook reaches 259 sources.

Binding performs read-only notebook, source-count, ownership, and sharing checks. It accepts only an owner-only private notebook and keeps the raw notebook ID plus a sanitized, bounded local notebook label in Chrome. Brain receives a generic target label, private/capacity health, SHA-256 binding proofs, and opaque SHA-256 source aliases—not Google account, notebook, or source identifiers.

The safe source limit is explicit and versioned per binding. Both the extension and Brain server independently enforce 259 as the effective hard maximum, and the internal five-slot guard cannot be changed. Changing the limit requires a safe rebind and is blocked while export work is unresolved.

The service worker checks for approved work on a one-minute MV3 alarm. It uses the browser's existing NotebookLM sign-in without requesting Chrome's cookie API or storing Google cookies, CSRF tokens, session IDs, HTML, or RPC responses.

### Delivery safety

- Copied text uses the current `notebooklm-py` `v0.8.0rc1` wire shape pinned at commit `45fd4258e608fbb9685496f26cfcea48810c44ee`.
- Before the single non-idempotent provider fetch, Brain must acknowledge `dispatch_started` and the extension persists a content-free `possibly_delivered` journal record.
- A timeout, network error, HTTP error, or decode error after that point is never followed by another create. Later work is read-only reconciliation by the unique marker in the source title.
- Unknown RPC IDs, response shapes, status codes, ownership, or sharing posture fail closed and block provider writes.
- Polling reads only the notebook's source IDs, titles, and processing statuses; it does not retrieve source contents.

This is an unofficial consumer-NotebookLM connector built on undocumented Google web RPCs. Google can change the protocol without notice; a detected change requires an extension update.

Disconnect or replace a connector from Brain first, after cancelling or explicitly stopping unresolved exports. The Options page's emergency local-clear control only removes browser state and permission; it cannot revoke server state and may strand active work if used prematurely.

Pairing failures are intentionally not retried. An invalid, expired, or used code requires a fresh code from Brain. A network failure or timeout means the extension did not receive confirmation; reload the extension and use a fresh code, which safely retires any unbound orphan connector created by a lost response. If Chrome reports that Brain access is off, open the Brain extension's **Details**, restore site access for `brain.arunp.in`, and reload the extension. Do not use the emergency local-clear control as a pairing-recovery step.

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

## Development checks

```bash
npm run typecheck
npm test
npm run build
```

The unit suite pins manifest permissions, target parsing and fingerprints, Brain DTOs, provider request/response shapes, the content-free journal, and the no-blind-retry invariant.
