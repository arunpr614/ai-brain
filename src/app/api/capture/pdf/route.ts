/**
 * POST /api/capture/pdf — PDF upload endpoint.
 *
 * v0.2.0 shipped the original cookie-authed path; v0.5.0 T-13 extends it
 * with bearer auth so the APK share-handler can stream content-URI PDFs
 * without the user ever seeing the PIN unlock flow (D-v0.5.0-5).
 *
 * Auth: the proxy (T-4) lets through requests with either a session
 * cookie OR a valid bearer token on BEARER_ROUTES. This handler accepts
 * both; an operator share via the web form still works (cookie), and the
 * Capacitor WebView's fetch with `Authorization: Bearer <token>` also
 * works. Origin validation on the bearer path matches the other v0.5.0
 * capture endpoints.
 *
 * SHA256 round-trip verification (F-039 gap G-2):
 *   - Client may send an `X-Expected-SHA256` header with the 64-hex
 *     digest it computed locally before upload.
 *   - Server computes the SHA256 of the received bytes and compares.
 *   - On mismatch: 422 with both hashes in the body (not a silent fail).
 *   - On match or absent header: 201 with `sha256` always in the
 *     response so the client can still verify after the fact.
 *
 * Multipart body: field `pdf` (File). The Capacitor WebView on Android
 * can point a Blob at a `content://` URI via `fetch(contentUri).blob()`
 * (CapacitorHttp.enabled:true, set at T-9) and hand it straight into
 * FormData — no WebView heap load of the full file, matches F-039's
 * "avoid WebView heap" goal.
 */
import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { capturePdfAction } from "@/app/capture-actions";
import { SESSION_COOKIE } from "@/lib/auth";
import { validateOrigin } from "@/lib/auth/bearer";
import { checkClientApiVersion } from "@/lib/auth/api-version";
import { logError } from "@/lib/errors/sink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTHENTICATED_ERROR_STATUS = 401;

export async function POST(req: NextRequest) {
  // Cookie path (web form, existing v0.2.0 behaviour)
  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  // Bearer path (APK share-handler, Chrome extension). The proxy has
  // already verified the token; we only re-check Origin here.
  const hasBearer = (req.headers.get("authorization") ?? "").startsWith("Bearer ");

  if (!hasCookie && !hasBearer) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: AUTHENTICATED_ERROR_STATUS },
    );
  }

  if (hasBearer && !validateOrigin(req.headers.get("origin"))) {
    logError({
      type: "lan.bearer.reject-origin",
      path: "/api/capture/pdf",
      origin: req.headers.get("origin"),
      ts: Date.now(),
    });
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  }

  const versionReject = checkClientApiVersion(req);
  if (versionReject) return versionReject;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_multipart" }, { status: 400 });
  }

  const file = form.get("pdf");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_pdf_field" }, { status: 400 });
  }

  // Compute SHA256 on the server side BEFORE handing off to
  // capturePdfAction — the action runs a second pass on the bytes, but
  // doing the hash up front lets us reject a mismatched upload cheaply
  // without running PDF extraction.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const serverSha = crypto.createHash("sha256").update(bytes).digest("hex");
  const expected = req.headers.get("x-expected-sha256");
  if (expected && expected.toLowerCase() !== serverSha) {
    logError({
      type: "share.pdf.sha256-mismatch",
      expected,
      actual: serverSha,
      size: bytes.byteLength,
      ts: Date.now(),
    });
    return NextResponse.json(
      { error: "sha256_mismatch", expected, actual: serverSha },
      { status: 422 },
    );
  }

  try {
    // Re-wrap the File into FormData that shape-matches the legacy action.
    const innerForm = new FormData();
    innerForm.set("pdf", file);
    const { id } = await capturePdfAction(innerForm);
    return NextResponse.json({ id, sha256: serverSha }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    logError({
      type: "share.pdf.upload-failed",
      message,
      size: bytes.byteLength,
      ts: Date.now(),
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
