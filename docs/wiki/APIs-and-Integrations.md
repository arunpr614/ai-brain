# APIs and Integrations

Purpose: Summarize internal HTTP contracts, external clients, authentication, and operational constraints.
Audience: AI agents and engineers changing interfaces or integrations.
Verified against: deployed application `8c1341100b174fe4ca518e6a745c30b9078df21c` plus retained route-specific evidence.
Runtime evidence through: 2026-07-12; route-level runtime evidence varies.
Last reviewed: 2026-07-12.
Owner: AI Brain maintainer.

## Route families

- Capture: note, URL, PDF, and user-provided transcript.
- Retrieval: search and streamed Ask.
- Items: enrichment trigger/status, item/note exports, attached-note CRUD/policy/revisions/restore.
- Processing: summary, bounded item/group pages, filters, preferences, enrollment, mutation outcomes, Move/Archive/Restore/Reprocess/Undo.
- Library: ZIP export.
- Threads: create/list/read/rename/delete and messages.
- Settings: pairing/exchange, token rotation, provider status, note consent/default, and default-off Recall manual-sync status/request.
- Integrations: Telegram webhook and inactive owned-media transcript route.
- Diagnostics: authenticated health and client-error intake.

## Authentication

Browser routes use the signed PIN session. Android and extension capture use one shared bearer token as the primary control. Client version is checked only when present; Origin can be absent for server-to-server use, and Chrome-extension origins are broadly accepted. Pairing exchange uses a short-lived one-use code. Telegram combines a webhook secret with owner/private-chat policy. Recall and AI providers use separate environment credentials. Attached-note browser mutations require same-origin requests.

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
| Off-site backup service | Outbound backup | Database snapshot workflow; private runbook details excluded |

Error behavior is intentionally capability-specific. Preserve explicit `401/403/409/422/429/503` semantics and avoid converting inactive routes into apparent configuration-only features.

### Processing endpoints

`/api/processing/**` and `/api/items/[id]/workflow/**` are browser-session-only. Bearer-only requests remain unauthorized. Reads expose allow-listed summaries, groups, cards, filters, preferences, enrollment state, and mutation outcomes. Writes require the exact configured HTTPS origin, a streaming 16 KiB request ceiling, validated bounded bodies, and per-valid-session throttling. Mutation IDs provide durable replay; expected versions provide compare-and-swap conflict protection; Undo is actor-tab scoped and expires after its server-backed window.

### Recall manual-sync endpoint

`/api/settings/recall-sync` is an authenticated, exact-same-origin control plane over durable SQLite intent. `GET` returns only allowlisted status data and can rehydrate an exact request ID or idempotency key. `POST` accepts an empty bounded body plus a bounded idempotency key, returns `202` for new or active-deduplicated intent, `429` during the five-minute terminal cooldown, and `409` for terminal key replay after cooldown. The web process writes only an empty wake marker; it never receives the Recall credential or launches the wrapper.
