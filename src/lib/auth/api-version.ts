/**
 * Client API version compatibility — v0.6.x offline mode (OFFLINE-6 / plan v3 §5.5).
 *
 * Protects against the "user queued items offline for a week, server got
 * upgraded with a breaking schema change in the meantime" scenario. The
 * APK sends `X-Brain-Client-Api: <n>` with every outbox POST; if the
 * server's expected version differs, the route returns 422 with body
 * `{ code: 'version_mismatch', message: ... }`. The outbox classifier
 * (src/lib/outbox/classify.ts) maps that to status='stuck' with reason
 * `version_mismatch`, surfacing actionable copy to the user.
 *
 * Backward-compatibility default: routes that read this helper accept
 * MISSING headers as compatible (the Chrome extension and pre-OFFLINE-4
 * APK builds don't send it). A header that is PRESENT but does not equal
 * `EXPECTED_CLIENT_API` triggers the 422.
 *
 * The expected version is bumped only when a breaking change to the
 * outbox payload shape requires re-encoding old queue entries. Bumping
 * is intentionally rare — most additive server changes do not need it.
 */

import { NextResponse, type NextRequest } from "next/server";

/** Header name the APK transport.ts sends. Lowercase per HTTP/2 norms. */
export const CLIENT_API_HEADER = "x-brain-client-api";

/**
 * The server's currently-accepted client API version. Bumped only when a
 * breaking change requires re-encoding outbox entries. Initial: 1.
 */
export const EXPECTED_CLIENT_API = 1;

/**
 * Inspect the request for `X-Brain-Client-Api` and decide whether to
 * proceed or short-circuit with a 422. Returns null on accept; returns a
 * NextResponse the caller should `return` directly on reject.
 *
 * Acceptance rules:
 *   - Header missing → accept (legacy / extension clients).
 *   - Header present and parses to EXPECTED_CLIENT_API → accept.
 *   - Anything else → reject with 422 { code: 'version_mismatch' }.
 */
export function checkClientApiVersion(req: NextRequest): NextResponse | null {
  const raw = req.headers.get(CLIENT_API_HEADER);
  if (raw === null) return null; // missing → accept (back-compat)
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed === EXPECTED_CLIENT_API) {
    return null;
  }
  return NextResponse.json(
    {
      code: "version_mismatch",
      message: "Update Brain to sync these items.",
      expected: EXPECTED_CLIENT_API,
      received: raw,
    },
    { status: 422 },
  );
}
