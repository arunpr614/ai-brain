# AI Brain Integration Pattern Inventory

**Audit date:** 2026-07-21
**Baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`

| Pattern | Current implementation | NotebookLM reuse judgment |
|---|---|---|
| Provider abstraction | LLM/embed factories and injected clients | Reuse interface and fake-client approach, not AI-specific method shapes |
| Provider retry | Anthropic retries selected `429`, `503`, and `529` responses with bounded delay | Reuse classification concept; add durable per-item retry state and `Retry-After` handling |
| Inbound durable identity | Recall remote card ID maps to a local item ledger | Reuse the unique mapping concept with direction reversed |
| Whole-run lifecycle | Recall request/execution/run/stage/heartbeat records | Strong conceptual reuse; extract provider-neutral orchestration |
| Trusted credentials | Recall systemd `LoadCredential` boundary | Strong isolation precedent; OAuth also needs encrypted mutable refresh-token storage |
| Manual wakeup | SQLite intent plus empty marker, path activation, and timer fallback | Reusable for the current single-host deployment |
| Capture idempotency | URL equality and short-window hashes | Too weak for external source creation |
| Telegram webhook claim | Remote update primary key plus `INSERT OR IGNORE` | Do not reuse: failed updates cannot be reclaimed because subsequent deliveries look duplicate (`src/db/telegram-updates.ts:25-42`; `src/lib/telegram/webhook-handler.ts:109-148`) |
| Content mapping | Recall pure mapper with content hash/version | Reuse as a provider-neutral versioned mapper |
| Markdown exports | Separate single-item and bulk formatters | Reuse only after consolidating their inconsistent content selection |
| Artifacts | Bounded filesystem evidence with SQLite pointers | Useful for optional payload/debug evidence; backup coverage must be explicit |
| Status UI | Recall safe DTO and truthful state machine | Strong reuse; distinguish queued, exported, provider accepted, processing, synced, and unobservable refresh |
| Observability | SQLite reports, JSONL, journal, and safe console events | Baseline only; add immutable per-item attempts and aggregate sync metrics |
| Scheduling | In-process workers plus trusted systemd Recall timers | Prefer a trusted external worker for provider writes; do not couple them to the web process |
| Plaintext settings | General key/value settings in SQLite | Unsuitable for OAuth refresh tokens |
| Shared bearer | One token for Android/extension | Irrelevant and insufficient for Google authorization |

## Extraction boundary

The future synchronization service should be provider-neutral through planning, content mapping, outbox discovery, leases, retries, status projection, and attempt reporting. Only the final adapter should differ between:

- Gemini Notebook Enterprise Preview source API; and
- Google Docs/Drive staging for consumer/Workspace NotebookLM.

The consumer path cannot truthfully report a NotebookLM source creation because the supported app action stops at updating a Drive file. Its terminal app state should be “Drive document updated; NotebookLM refresh not observable,” unless a user confirms the notebook-side refresh.
