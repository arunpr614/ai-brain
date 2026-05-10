# SPIKE-003 — Do existing tests verify SSE frame-by-frame streaming, or just static response shape?

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-003 |
| **Date** | 2026-05-10 20:10 |
| **Author** | AI agent (Claude) |
| **Time box** | 5 min |
| **Triggered by** | SPIKE-001 finding: our SSE config looks correct. But is there a regression test that would catch breakage at the streaming level (not just header level)? |
| **Blocks** | R-1 (empirical SSE verification over tunnel) — determines if R-1 must be manual smoke or can be TDD |
| **Verdict** | **BLOCKER** (for TDD path) — no test exercises actual chunked delivery. R-1 must be manual smoke, and any future SSE regression will not be caught by `npm test`. |

## Question

If someone accidentally changes `/api/ask/route.ts` to remove
`x-accel-buffering: no` or replace `ReadableStream` with a
buffered-response-then-return pattern, would our test suite catch it?

## Method

```bash
grep -rn "text/event-stream\|ReadableStream\|AsyncIterable\|stream.read\|for await" \
  src/app/api/ask/ src/app/api/threads/ 2>/dev/null

grep -n "stream\|event\|SSE\|body" src/app/api/ask/route.test.ts
```

## Evidence

Only match in tests:

```
src/app/api/ask/route.test.ts:47:    /text\/event-stream/,
```

Context from the test file:

```typescript
// Line 37-41 — checks response is unauthenticated when no cookie
const body = await res.text();
assert.match(body, /UNAUTHENTICATED/);

// Line 47-51 — checks 503 + OLLAMA_OFFLINE path
/text\/event-stream/,  // regex inside an assert — header check
const body = await res.text();
assert.match(body, /OLLAMA_OFFLINE/);
```

Every test in `ask/route.test.ts` consumes the response via
`res.text()` — which reads the entire body into a string. This defeats
any streaming verification: the test cannot distinguish "frames arrived
every 100ms" from "entire body buffered, delivered as one blob at end".

No test uses `res.body` with `getReader()`, no `ReadableStream` iteration,
no timing-based assertions on frame arrival.

## Findings

**The SSE test coverage is structural-only, not behavioral.**

What's tested:
- Response status code
- `content-type: text/event-stream` header presence (via regex on the
  response text — actually a fragile way to check the header)
- Expected frame content appears somewhere in the body (`OLLAMA_OFFLINE`,
  `UNAUTHENTICATED`, etc.)

What's NOT tested:
- Frames arrive incrementally (not buffered-and-flushed-at-end)
- `x-accel-buffering: no` is present
- `cache-control: no-transform` is present
- Stream closes cleanly on client disconnect
- Stream survives >90s of idle activity (keepAliveTimeout regression)
- Frames are correctly formatted SSE (`data: ...\n\n`)

**Implications for R-1 (empirical SSE over tunnel):**

R-1 cannot be run as an automated regression test. It must be a **manual
smoke** via `curl -N` against the live tunnel, with a human observing
that output arrives progressively.

**Implications for plan v2.0:**

Adding a proper SSE test is a non-trivial task (needs a streaming HTTP
client that can read chunks with timestamps) and is **out of scope** for
v0.5.0 (which is about APK/extension delivery, not test harness
improvement). Document the gap; defer to a future plan.

## Implementation recommendation

**For R-1 execution (plan v2.0 task):**

Use this manual-smoke harness. Add it as a script rather than a test so
its invocation is explicit:

```bash
#!/usr/bin/env bash
# scripts/smoke-sse.sh — manual SSE streaming verification
# Usage: BRAIN_URL=https://brain.arunp.in BRAIN_TOKEN=... npm run smoke:sse
set -euo pipefail
: "${BRAIN_URL:?required}"
: "${BRAIN_TOKEN:?required}"

echo "Streaming /api/ask against $BRAIN_URL..."
echo "Expected: progressive output, not buffered-at-end."
echo "Watch for frames appearing over time, not all at once."
echo "---"

curl -N "$BRAIN_URL/api/ask" \
  -H "Authorization: Bearer $BRAIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"hello","item_ids":[]}' \
  | while IFS= read -r line; do
      printf "[%s] %s\n" "$(date +%H:%M:%S.%N | cut -c1-12)" "$line"
    done
```

The timestamp prefix makes buffering obvious: if all lines have the same
timestamp, the response was buffered. If timestamps span seconds, it's
streaming correctly.

**Plan v2.0 should add this as a task:** "T-CF-SSE-SMOKE: ship
`scripts/smoke-sse.sh` with timestamp verification and a README section
documenting how to interpret the output."

**DO NOT try to add an automated SSE test in v0.5.0.** The JavaScript
test harness tooling for this is heavy (`node-fetch` streaming, timing
assertions, custom chunk readers) and would balloon scope. The manual
smoke is good enough for now.

## Risks / gaps surfaced

1. **Silent regressions are possible.** If a future refactor accidentally
   breaks SSE streaming (e.g., wraps the response in a buffering proxy),
   `npm test` will still pass. Mitigated by making `smoke-sse.sh` part
   of the release checklist.

2. **`/api/threads/[id]/messages` SSE endpoint** may not exist yet, or
   may use a different streaming mechanism. SPIKE-001 flagged this; not
   resolved by this spike.

3. **Timestamp precision** — `date +%N` (nanoseconds) works on Linux and
   modern macOS, but has different behavior on some systems. The smoke
   script may need a `gdate` fallback on older macOS.
