import { NextResponse, type NextRequest } from "next/server";
import { capturePdfAction } from "@/app/capture-actions";
import { SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PDF upload endpoint — avoids the ~4.5MB server-action body limit.
 * Browser posts a multipart/form-data with field `pdf`.
 *
 * Auth: matches the page gate (session cookie must be present).
 *   Full HMAC verification is redundant at v0.1.0 because the PIN already
 *   gated the browser that sent this request; the two-layer check documented
 *   in proxy.ts applies.
 */
export async function POST(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const { id } = await capturePdfAction(form);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
