# S11 — One-click item export contract

**Run date:** 2026-07-21

**Scope:** Consumer NotebookLM; one explicit AI Brain item; one preconfigured target notebook

**Evidence class:** Credential-free local model only

**Result:** Pass — 13/13 tests

**Remote NotebookLM calls:** 0
**Real content or credentials used:** 0

## Hypothesis

AI Brain can own the product semantics around an unofficial NotebookLM adapter instead of inheriting unsafe behavior from a third-party CLI. In particular, a narrow coordinator can:

- resolve one immutable target binding server-side, with no browser-selectable alias or notebook identifier;
- freeze a minimized copied-text snapshot when the user clicks;
- coalesce same-process sequential duplicate submissions and repeat clicks for unchanged content;
- wait for source readiness before reporting success;
- distinguish authentication required before a write from authentication whose write outcome is uncertain, then resume through the correct phase;
- reconcile an accepted-but-response-lost write by an opaque title marker; and
- refuse a blind retry when the remote result remains uncertain.

## Synthetic input

One synthetic item represented the current text-centric AI Brain model. It reused the URL item's identity from the existing ten-item synthetic catalog, so this spike did not increase the global fixture count. It contained a title, body, public URL, author, publication date, generated summary, quotes, attached note, internal identifiers, and a credential-bearing thumbnail URL. The latter fields were present specifically to prove that the mapper did not export them.

The coordinator contained one immutable synthetic target binding mapped to one synthetic notebook identifier. The browser-facing request supplied no target alias, notebook identifier, or URL—only an idempotency key and, for a weak capture, an explicit confirmation boolean. No Google account, cookie, token, notebook URL, or real item was used.

## Prototype

- [`prototype/one-click-export-contract.mjs`](prototype/one-click-export-contract.mjs)
- [`prototype/one-click-export-contract.test.mjs`](prototype/one-click-export-contract.test.mjs)

The fake adapter exposes only the capabilities the button needs: add copied text, list sources for reconciliation, and retrieve source status. It has no delete, share, chat, research, or artifact-generation capability.

## Command

```text
node --test docs/feature-council/notebooklm-sync/spikes/prototype/one-click-export-contract.test.mjs
```

## Observed result

```text
tests 13
pass 13
fail 0
duration_ms 92.246958
```

The passing cases covered:

1. deterministic copied-text mapping and exclusion of internal/private fields;
2. removal of private, local, signed, credential-bearing, or query-string URLs;
3. confirmation gating for metadata-only, paywall-preview, and failed captures, including a confirmed success path;
4. immutable server-side target resolution despite attacker-controlled extra alias/notebook fields, plus marker versioning when a binding changes;
5. same-process sequential double-submit coalescing;
6. later-click deduplication for unchanged content;
7. a new version for changed content;
8. processing versus ready status truthfulness;
9. one-match recovery after a committed write whose response was lost, including normalized reconciliation-read failure;
10. no blind retry when reconciliation finds no match;
11. fail-closed behavior when more than one source has the marker;
12. explicit reconnect/resume behavior for pre-send, post-send-uncertain, and readiness-poll authentication failures; and
13. browser DTO and event-log redaction.

## Contract proven locally

The safe state machine is:

```text
queued → running → processing → succeeded
          ↘ retryable_error          (only when confirmed not sent)
          ↘ terminal_error
          ↘ reconciling → processing (exactly one marker match)
                        → conflict    (multiple matches)
                        → reconciling (no conclusive match; no rewrite)

authentication_attention → queued      (confirmed pre-send)
                         → reconciling (write outcome uncertain)
                         → processing  (readiness poll interrupted)
```

The provider title includes a stable opaque HMAC marker derived from an immutable target-binding ID/version, item identifier, canonical payload hash, and mapper version. The marker contains no raw AI Brain or Google identifier. This is deliberately visible because consumer NotebookLM source listings expose titles but not copied-text bodies; hiding the marker would make post-timeout reconciliation unreliable.

## What this does not prove

- It does not prove that any unofficial repository still matches Google’s live internal protocol.
- It does not prove live cookie/session longevity or Google account behavior.
- It does not prove that source-list propagation is immediate after an uncertain write.
- It does not make copied-text creation exactly once. If Google accepted a write but the marker is not yet visible, the correct state is unresolved—not success and not safe-to-retry.
- Its duplicate-submit model is in-memory and sequential. A production implementation still needs durable database uniqueness and transactional concurrency tests across processes.
- It does not prove source-capacity headroom, payload-size limits, frozen-snapshot retention, cancellation/cleanup, or target sharing/privacy inspection.
- It does not authorize a live consumer-NotebookLM test or production dependency.

## Decision impact

Repository selection must reward a client that surfaces the first uncertain text-write failure and lets AI Brain own reconciliation. A client that blindly retries copied-text creation on network, 429, or 5xx errors is incompatible unless that behavior is disabled or patched. This criterion materially favors `teng-lin/notebooklm-py` over the direct TypeScript alternatives inspected for this feature.
