# APIs and Integrations

Purpose: Summarize internal HTTP contracts, external clients, authentication, and operational constraints.
Audience: AI agents and engineers changing interfaces or integrations.
Verified against: deployed application `167a15d57b8f70574a017ea4cda507870f3600d4` plus retained route-specific evidence.
Runtime evidence through: 2026-07-23; route-level runtime evidence varies. NotebookLM URL-source export is deployed at `1:1:1` with a provider-level production canary.
Last reviewed: 2026-07-23.
Owner: AI Brain maintainer.

## Route families

- Capture: note, URL, PDF, and user-provided transcript.
- Retrieval: search and streamed Ask.
- Items: enrichment trigger/status, item/note exports, attached-note CRUD/policy/revisions/restore, and experimental NotebookLM export status/request/cancel controls.
- Processing: summary, bounded item/group pages, filters, preferences, enrollment, mutation outcomes, Move/Archive/Restore/Reprocess/Undo.
- Library: ZIP export.
- Threads: create/list/read/rename/delete and messages.
- Settings: pairing/exchange, token rotation, provider status, note consent/default, default-off Recall manual-sync status/request, and NotebookLM connector setup/status/revocation.
- NotebookLM connector: scoped pairing exchange, fixed-private-target bind, request claim, and lease-scoped lifecycle events.
- Integrations: Telegram webhook and inactive owned-media transcript route.
- Diagnostics: authenticated health and client-error intake.

## Authentication

Browser routes use the signed PIN session. Android and extension capture use one shared bearer token as the primary control. Client version is checked only when present; Origin can be absent for server-to-server use, and Chrome-extension origins are broadly accepted. General device pairing exchanges a short-lived one-use code. Telegram combines a webhook secret with owner/private-chat policy. Recall and AI providers use separate environment credentials. Attached-note and NotebookLM browser mutations require same-origin requests.

The NotebookLM connector has a separate five-minute, one-use pairing exchange and stores a scoped connector-token hash plus a non-authenticating token hint server-side, never the raw token. Bind, claim and event routes require that connector token plus the exact paired Chrome-extension origin. Google authentication and session material stay in the owner's local Chrome profile; the hosted application never receives them.

## External systems

| Integration | Direction | Current boundary |
|---|---|---|
| Generation providers | Outbound | Selected through factory; availability and privacy depend on configuration |
| Embedding providers | Outbound | Ollama or Gemini; note content additionally requires consent/flags |
| Managed edge/tunnel | Inbound proxy | Terminates public TLS before loopback service |
| Telegram | Inbound webhook/outbound reply | Private owner chat only |
| Recall | Outbound read/import | Guarded one-way scheduled import plus a default-off manual request UI that reuses the full trusted wrapper |
| Android | Authenticated web/API client | Private sideload thin client |
| Browser extension | Authenticated API client | Token stored in extension local storage |
| Consumer NotebookLM | Outbound copy through local Chrome connector | Experimental owner-operated export to one fixed private notebook; safe saved URLs become web/YouTube sources, URL-less notes become copied text; extension 0.7.4 is paired at protocol v2 and a production URL-source request reached provider `ready` |
| Off-site backup service | Outbound backup | Database snapshot workflow; private runbook details excluded |

Error behavior is intentionally capability-specific. Preserve explicit `401/403/409/422/429/503` semantics and avoid converting inactive routes into apparent configuration-only features.

The public NotebookLM entry/sign-in URL is `https://notebooklm.google/`. The authenticated app and the extension's optional host permission use `https://notebooklm.google.com/` and `https://notebooklm.google.com/*` respectively.

### NotebookLM export endpoints

`/api/settings/notebooklm-export` and `/api/items/[id]/notebooklm-export` are signed-browser-session routes; writes require exact same-origin requests. `/api/notebooklm/connectors/exchange`, `/api/notebooklm/connector/bind`, `/api/notebooklm/connector/claim`, and `/api/notebooklm/connector/requests/[id]/events` form the scoped local-connector protocol. The master, queue, and provider-write gates are independent and fail closed. The verified production tuple is `1:1:1`; disabling queue intake blocks new requests, while disabling provider writes prevents connector create authorization without removing read-only status and recovery.

### Processing endpoints

`/api/processing/**` and `/api/items/[id]/workflow/**` are browser-session-only. Bearer-only requests remain unauthorized. Reads expose allow-listed summaries, groups, cards, filters, preferences, enrollment state, and mutation outcomes. Writes require the exact configured HTTPS origin, a streaming 16 KiB request ceiling, validated bounded bodies, and per-valid-session throttling. Mutation IDs provide durable replay; expected versions provide compare-and-swap conflict protection; Undo is actor-tab scoped and expires after its server-backed window.

### Recall manual-sync endpoint

`/api/settings/recall-sync` is an authenticated, exact-same-origin control plane over durable SQLite intent. `GET` returns only allowlisted status data and can rehydrate an exact request ID or idempotency key. `POST` accepts an empty bounded body plus a bounded idempotency key, returns `202` for new or active-deduplicated intent, `429` during the five-minute terminal cooldown, and `409` for terminal key replay after cooldown. The web process writes only an empty wake marker; it never receives the Recall credential or launches the wrapper.
