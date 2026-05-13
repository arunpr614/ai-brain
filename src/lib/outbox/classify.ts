/**
 * Outbox response classifier — v0.6.x offline mode (OFFLINE-2 / plan v3 §5.3).
 *
 * Maps the result of a single capture POST attempt to one of three
 * dispositions:
 *
 *   - `synced`    — terminal success. Sync-worker marks the row `synced`,
 *                   resets attempts, clears last_error.
 *   - `transient` — non-terminal failure. Sync-worker bumps attempts and
 *                   schedules next_retry_at via backoff.ts. Never moves
 *                   to `stuck` (plan §5.3 — no MAX_ATTEMPTS).
 *   - `stuck`     — terminal failure. Sync-worker marks the row `stuck`
 *                   with the supplied reason; user must Retry or Discard.
 *
 * The function takes a normalized `ProbeOutcome` rather than a Response
 * directly because the caller's path varies — `fetch()` may have thrown
 * before any HTTP status was observed (DNS failure, abort), or the
 * response may have arrived but failed to parse as JSON (captive portal
 * proxies returning HTML — plan §5.3 v3 B-3 fix).
 *
 * The shape of `serverItemId` is opaque — it's whatever the
 * /api/capture/* endpoints set on the success path. Stored on the
 * outbox row as `server_id` so the inbox UI can link to the new item.
 */

export type Disposition =
  | { kind: "synced"; serverItemId?: string }
  | { kind: "transient"; reason: string }
  | { kind: "stuck"; reason: "auth_bad" | "payload_bad" | "version_mismatch" };

/**
 * Normalized input. The caller (sync-worker) is responsible for collapsing
 * the cross product of (fetch-threw | got-Response) × (parsed-JSON | parse-failed)
 * into one of these branches.
 */
export type ProbeOutcome =
  | {
      /** fetch() itself threw — DNS error, abort, network down, etc. */
      kind: "network-error";
      message: string;
    }
  | {
      /**
       * HTTP request completed; we have a status code AND we successfully
       * parsed the body as JSON. The body may still indicate an
       * application-level error (e.g. version_mismatch, duplicate=true).
       */
      kind: "http-json";
      status: number;
      retryAfter: string | null;
      body: unknown;
    }
  | {
      /**
       * HTTP request completed but the body could not be parsed as JSON.
       * Plan §5.3 v3 B-3 fix: this is captive portal HTML or a transparent
       * proxy returning text/html with any status code. Always classified
       * transient — caller doesn't even need to inspect status.
       */
      kind: "http-non-json";
      status: number;
      contentType: string | null;
    };

/**
 * Classify a single attempt outcome. Pure function: no I/O, no Date.now().
 */
export function classifyOutcome(outcome: ProbeOutcome): Disposition {
  if (outcome.kind === "network-error") {
    return { kind: "transient", reason: `network: ${outcome.message}` };
  }

  if (outcome.kind === "http-non-json") {
    return {
      kind: "transient",
      reason: `non-json-body status=${outcome.status} content-type=${outcome.contentType ?? "(unset)"}`,
    };
  }

  const { status, body } = outcome;

  // 5xx — transient regardless of body.
  if (status >= 500 && status < 600) {
    return { kind: "transient", reason: `http_${status}` };
  }

  // 429 — transient with Retry-After signal that the caller will use to
  // override backoff.ts.
  if (status === 429) {
    return { kind: "transient", reason: "rate_limited" };
  }

  // 401 / 403 — terminal auth failure. Bearer rotated or wrong device.
  if (status === 401 || status === 403) {
    return { kind: "stuck", reason: "auth_bad" };
  }

  // 422 with explicit version_mismatch code — terminal, distinct copy.
  if (status === 422 && isVersionMismatchBody(body)) {
    return { kind: "stuck", reason: "version_mismatch" };
  }

  // Other 4xx — terminal payload-bad.
  if (status >= 400 && status < 500) {
    return { kind: "stuck", reason: "payload_bad" };
  }

  // 2xx — success path. The endpoint returns `{ duplicate: true, itemId }`
  // OR `{ id: <newly-created-item-id> }` (varies by route). Either way,
  // the row goes `synced`; we just record whichever item id is present.
  if (status >= 200 && status < 300) {
    const serverItemId = extractItemId(body);
    return serverItemId
      ? { kind: "synced", serverItemId }
      : { kind: "synced" };
  }

  // 1xx, 3xx (after fetch followed redirects?) — treat as transient.
  return { kind: "transient", reason: `unexpected_status_${status}` };
}

function isVersionMismatchBody(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    (body as { code: unknown }).code === "version_mismatch"
  );
}

function extractItemId(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const o = body as Record<string, unknown>;
  if (typeof o.itemId === "string") return o.itemId;
  if (typeof o.id === "string") return o.id;
  return undefined;
}
