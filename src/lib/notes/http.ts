import { type NextRequest, NextResponse } from "next/server";

export const NOTE_PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
} as const;

export function noteJson(body: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(body, init);
  for (const [name, value] of Object.entries(NOTE_PRIVATE_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export function noteEmpty(status = 204): NextResponse {
  return new NextResponse(null, { status, headers: NOTE_PRIVATE_HEADERS });
}

/** Cookie-authenticated note mutations must come from the request's exact origin. */
export function isExactSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const supplied = new URL(origin);
    const requestUrl = new URL(req.url);
    const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || req.headers.get("host") || requestUrl.host;
    const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProto ? `${forwardedProto.replace(/:$/, "")}:` : requestUrl.protocol;
    return supplied.protocol === protocol && supplied.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}
