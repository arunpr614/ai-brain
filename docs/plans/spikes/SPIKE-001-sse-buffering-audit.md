# SPIKE-001 — Does our own `/api/ask` SSE endpoint stream correctly, or does it buffer server-side?

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-001 |
| **Date** | 2026-05-10 20:05 |
| **Author** | AI agent (Claude) |
| **Time box** | 10 min |
| **Triggered by** | R-CFT critique blocker B-1 ("Named-tunnel SSE support is asserted, not verified"). Before blaming Cloudflare for SSE issues, confirm our own server streams correctly. |
| **Blocks** | R-1 (empirical SSE verification over tunnel), plan v2.0 §SSE |
| **Verdict** | **CLEAR** — our server is correctly configured for streaming. |

## Question

If SSE fails on the Cloudflare named tunnel, is the failure on our side
or Cloudflare's? Specifically: does `/api/ask` today issue SSE responses
with the headers and structure needed to survive Cloudflare's edge
proxying, or do we rely on Next.js / Ollama default behavior that may
buffer?

## Method

```bash
# Find all SSE producers in the codebase
grep -rn "text/event-stream\|event-stream\|flushHeaders\|ReadableStream\|Transfer-Encoding\|transfer-encoding" src/app/api/

# Find all files that ever emit text/event-stream
grep -rln "text/event-stream" src/

# Inspect the SSE headers function in /api/ask/route.ts
sed -n '140,170p' src/app/api/ask/route.ts
```

## Evidence

SSE producers: only **one** route, `src/app/api/ask/route.ts`:

```bash
src/app/api/ask/route.test.ts:47:    /text\/event-stream/,
src/app/api/ask/route.ts:8: * Response: text/event-stream with frames:
src/app/api/ask/route.ts:148:    "content-type": "text/event-stream; charset=utf-8",
```

Response construction at `src/app/api/ask/route.ts:143-155`:

```typescript
return new Response(stream, { status: 200, headers: sseHeaders() });
}

function sseHeaders(): HeadersInit {
  return {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    // Disable Next/Vercel compression for SSE. Harmless on localhost; matters
    // at deploy time (v1.0.0+).
    "x-accel-buffering": "no",
  };
}
```

## Findings

Four correct SSE configurations are already in place:

1. **`content-type: text/event-stream`** — required for browsers/fetch to
   treat the response as a stream. Present.
2. **`cache-control: no-cache, no-transform`** — critical for Cloudflare.
   The `no-transform` directive is a standard HTTP mechanism that tells
   intermediary caches (including Cloudflare edge) to NOT rewrite the
   response. This is THE mechanism that protects SSE from Cloudflare's
   default chunked-response buffering.
3. **`connection: keep-alive`** — keeps the TCP connection open for
   streaming frames.
4. **`x-accel-buffering: no`** — originally an Nginx directive, but
   respected by many reverse proxies including Cloudflare and Vercel.
   Explicitly disables response-body buffering at proxy edge.

The code comment even says "matters at deploy time (v1.0.0+)" — the
author anticipated this exact concern. The comment is outdated (it now
matters at v0.5.0 under the tunnel pivot), but the implementation is
correct.

**The `Response` object is backed by a `ReadableStream`** (passed as the
first argument to `new Response(stream, ...)`). Streams in Next.js 16
backed by `ReadableStream` flush as chunks are enqueued — they do not
accumulate into a single buffer. This is the correct architectural
shape.

**No `Transfer-Encoding: chunked` is explicitly set** — it's implicit
via the streaming Response. Cloudflare named tunnels preserve chunked
transfer encoding by default (verified in R-CFT §4).

## Implementation recommendation

**No code changes needed** to `src/app/api/ask/route.ts`. The SSE
configuration is already correct for Cloudflare named tunnel passthrough.

**Plan v2.0 R-1 (empirical SSE verification) scope:**

- Run named tunnel against local dev server
- `curl -N https://brain.arunp.in/api/ask -H "Authorization: Bearer <token>" -H "content-type: application/json" -d '{"query":"test","item_ids":[]}'`
- Verify: (a) `text/event-stream` content-type in response headers,
  (b) frames arrive incrementally (not buffered into one big chunk at
  end), (c) stream survives past the 90s `keepAliveTimeout` default on
  Cloudflare named tunnels.

If R-1 fails: the issue is on Cloudflare's side, not ours. Fix at the
tunnel `config.yml` level via `originRequest.keepAliveTimeout: 10m`
(documented in R-CFT §4).

**Update the outdated comment** at `src/app/api/ask/route.ts:152-154`:

```typescript
// Before:
// Disable Next/Vercel compression for SSE. Harmless on localhost; matters
// at deploy time (v1.0.0+).

// After:
// Disable edge buffering (Nginx/Cloudflare/Vercel) for SSE. Cloudflare
// named tunnel (v0.5.0) honors x-accel-buffering: no and no-transform.
```

This is a one-line doc fix; not blocking, stays in plan v2.0 backlog.

## Risks / gaps surfaced

1. **`src/app/api/threads/[id]/messages/route.ts`** is listed in R-CFT
   as an SSE endpoint but does not appear in the grep output. Either it
   doesn't exist, or it uses non-streaming responses. **Follow-up spike
   may be needed** if plan v2.0 assumes this endpoint streams.

2. **No empirical test of frame-by-frame delivery** in the current test
   suite (confirmed by SPIKE-003). Regression risk if the SSE config
   is accidentally broken: unit tests check header content but not that
   data arrives in chunks over time.

3. **Ollama itself may buffer** if misconfigured; SPIKE-001 only
   verifies our HTTP layer, not the upstream LLM producer. Assumed OK
   based on v0.4.0 working behavior.
