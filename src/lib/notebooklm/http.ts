import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth";
import { isExactSameOrigin } from "@/lib/notes/http";
import {
  authenticateNotebookLmConnector,
  type NotebookLmConnectorRow,
} from "./connector-auth";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
} as const;

const CONNECTOR_WINDOW_MS = 60_000;
const CONNECTOR_REQUEST_LIMIT = 120;
const EXCHANGE_REQUEST_LIMIT = 10;
const connectorRateState = new Map<string, number[]>();
const exchangeRateState = new Map<string, number[]>();

export class NotebookLmHttpError extends Error {
  constructor(
    public readonly code: "invalid_request" | "request_too_large",
    public readonly status: 400 | 413,
  ) {
    super(code);
    this.name = "NotebookLmHttpError";
  }
}

export function notebookLmJson(body: unknown, init: ResponseInit = {}): NextResponse {
  const response = NextResponse.json(body, init);
  for (const [key, value] of Object.entries(PRIVATE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function notebookLmSessionReadGate(req: NextRequest): NextResponse | null {
  if (!verifySessionCookie(req.cookies)) {
    return notebookLmJson({ error: "unauthenticated" }, { status: 401 });
  }
  return null;
}

export function notebookLmSessionWriteGate(req: NextRequest): NextResponse | null {
  const read = notebookLmSessionReadGate(req);
  if (read) return read;
  if (!isExactSameOrigin(req)) {
    return notebookLmJson({ error: "cross_origin_forbidden" }, { status: 403 });
  }
  return null;
}

export function isNotebookLmExtensionOrigin(origin: string | null): origin is string {
  return Boolean(origin && /^chrome-extension:\/\/[a-p]{32}$/.test(origin));
}

function connectorCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, content-type, x-notebooklm-connector-protocol",
    "Access-Control-Max-Age": "300",
    "Cache-Control": "no-store",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

export function notebookLmConnectorPreflight(req: NextRequest): NextResponse {
  const origin = req.headers.get("origin");
  if (!isNotebookLmExtensionOrigin(origin)) {
    return notebookLmJson({ error: "origin_required" }, { status: 403 });
  }
  return new NextResponse(null, { status: 204, headers: connectorCorsHeaders(origin) });
}

export function notebookLmConnectorJson(
  req: NextRequest,
  body: unknown,
  init: ResponseInit = {},
): NextResponse {
  const response = NextResponse.json(body, init);
  const origin = req.headers.get("origin");
  if (isNotebookLmExtensionOrigin(origin)) {
    for (const [key, value] of Object.entries(connectorCorsHeaders(origin))) {
      response.headers.set(key, value);
    }
  } else {
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
  }
  return response;
}

export function notebookLmConnectorEmpty(
  req: NextRequest,
  status = 204,
  extraHeaders: Record<string, string> = {},
): NextResponse {
  const origin = req.headers.get("origin");
  const headers = isNotebookLmExtensionOrigin(origin)
    ? { ...connectorCorsHeaders(origin), ...extraHeaders }
    : { "Cache-Control": "no-store", ...extraHeaders };
  return new NextResponse(null, { status, headers });
}

export function notebookLmConnectorAuthGate(
  req: NextRequest,
):
  | { ok: true; connector: NotebookLmConnectorRow }
  | { ok: false; response: NextResponse } {
  const auth = authenticateNotebookLmConnector({
    authorization: req.headers.get("authorization"),
    origin: req.headers.get("origin"),
    protocolVersion: req.headers.get("x-notebooklm-connector-protocol"),
  });
  if (!auth.ok) {
    const status = auth.reason === "protocol_mismatch" ? 426 :
      auth.reason === "origin_required" || auth.reason === "origin_mismatch" ? 403 : 401;
    return {
      ok: false,
      response: notebookLmConnectorJson(
        req,
        {
          error: auth.reason,
          ...(auth.reason === "protocol_mismatch" ? { expectedProtocolVersion: 1 } : {}),
        },
        { status },
      ),
    };
  }
  if (!consumeRate(connectorRateState, auth.connector.id, CONNECTOR_REQUEST_LIMIT)) {
    return {
      ok: false,
      response: notebookLmConnectorJson(
        req,
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": "60" } },
      ),
    };
  }
  return auth;
}

export function notebookLmPairingExchangeAllowed(req: NextRequest): boolean {
  const key =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return consumeRate(exchangeRateState, key, EXCHANGE_REQUEST_LIMIT);
}

export async function readNotebookLmJson(
  req: NextRequest,
  maxBytes = 4_096,
): Promise<unknown> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new NotebookLmHttpError("invalid_request", 400);
  }
  const declared = req.headers.get("content-length");
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) throw new NotebookLmHttpError("invalid_request", 400);
    if (Number(declared) > maxBytes) {
      throw new NotebookLmHttpError("request_too_large", 413);
    }
  }
  if (!req.body) throw new NotebookLmHttpError("invalid_request", 400);
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new NotebookLmHttpError("request_too_large", 413);
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  text += decoder.decode();
  try {
    return JSON.parse(text);
  } catch {
    throw new NotebookLmHttpError("invalid_request", 400);
  }
}

function consumeRate(
  state: Map<string, number[]>,
  key: string,
  limit: number,
  now = Date.now(),
): boolean {
  const recent = (state.get(key) ?? []).filter((timestamp) => now - timestamp < CONNECTOR_WINDOW_MS);
  if (recent.length >= limit) {
    state.set(key, recent);
    return false;
  }
  recent.push(now);
  state.set(key, recent);
  if (state.size > 1_000) {
    for (const [candidate, timestamps] of state) {
      if (!timestamps.some((timestamp) => now - timestamp < CONNECTOR_WINDOW_MS)) {
        state.delete(candidate);
      }
    }
  }
  return true;
}
