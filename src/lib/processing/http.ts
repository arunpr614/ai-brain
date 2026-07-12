import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { verifySessionCookie } from "@/lib/auth";
import { processingReadConfigured, processingWriteConfigured } from "./flags";
import { getProcessingReadiness } from "@/db/processing-readiness";
import { CursorError } from "./cursor";
import { ProcessingDomainError } from "@/db/item-workflow";
import type { WorkflowMutationResponseDto } from "./types";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};

const WRITE_RATE_WINDOW_MS = 60_000;
const DEFAULT_WRITE_RATE_LIMIT = 60;
const writeRateState = new Map<string, number[]>();

function configuredWriteRateLimit(): number {
  const value = Number(process.env.BRAIN_PROCESSING_WRITE_RATE_LIMIT ?? DEFAULT_WRITE_RATE_LIMIT);
  return Number.isInteger(value) && value > 0 && value <= 600 ? value : DEFAULT_WRITE_RATE_LIMIT;
}

function writeRateLimit(req: NextRequest, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
  const session = req.cookies.get("brain-session")?.value ?? "";
  const key = crypto.createHash("sha256").update(session).digest("hex").slice(0, 16);
  const prior = writeRateState.get(key) ?? [];
  const recent = prior.filter((timestamp) => now - timestamp < WRITE_RATE_WINDOW_MS);
  const limit = configuredWriteRateLimit();
  if (recent.length >= limit) {
    writeRateState.set(key, recent);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((WRITE_RATE_WINDOW_MS - (now - recent[0]!)) / 1000)),
    };
  }
  recent.push(now);
  writeRateState.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function processingJson(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(PRIVATE_HEADERS)) headers.set(key, value);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function processingReadGate(req: NextRequest): Response | null {
  if (!verifySessionCookie(req.cookies)) return processingJson({ error: "unauthenticated" }, { status: 401 });
  if (!processingReadConfigured()) return processingJson({ error: "processing_disabled" }, { status: 503 });
  const readiness = getProcessingReadiness();
  if (!readiness.ready) return processingJson({ error: "processing_unavailable", reason: readiness.code }, { status: 503 });
  return null;
}

export function processingWriteGate(req: NextRequest): Response | null {
  const read = processingReadGate(req);
  if (read) return read;
  if (!processingWriteConfigured()) return processingJson({ error: "processing_write_disabled" }, { status: 503 });
  const expectedOrigin = process.env.BRAIN_PUBLIC_ORIGIN?.trim();
  if (!expectedOrigin) return processingJson({ error: "processing_misconfigured" }, { status: 503 });
  if (!req.headers.get("origin") || req.headers.get("origin") !== expectedOrigin) {
    return processingJson({ error: "cross_origin_forbidden" }, { status: 403 });
  }
  const limited = writeRateLimit(req);
  if (!limited.allowed) {
    return processingJson(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }
  return null;
}

export function mutationStatus(result: WorkflowMutationResponseDto): number {
  switch (result.receipt.resultCode) {
    case "item_not_found": return 404;
    case "undo_expired": return 410;
    case "version_conflict":
    case "action_ineligible":
    case "undo_superseded":
    case "undo_invalid_target": return 409;
    default: return 200;
  }
}

export function handleProcessingError(error: unknown): Response {
  if (error instanceof ZodError) return processingJson({ error: "invalid_request" }, { status: 400 });
  if (error instanceof CursorError) return processingJson({ error: error.code, restart: true }, { status: error.code === "cursor_stale" ? 409 : 400 });
  if (error instanceof ProcessingDomainError) return processingJson(error.response ?? { error: error.code }, { status: error.status });
  if (error instanceof SyntaxError) return processingJson({ error: "invalid_json" }, { status: 400 });
  if (error instanceof Error && error.message.includes("database is locked")) return processingJson({ error: "temporarily_unavailable" }, { status: 503 });
  console.error("[processing] normalized server failure");
  return processingJson({ error: "processing_failure" }, { status: 500 });
}

export async function readBoundedJson(req: NextRequest, maxBytes = 16_384): Promise<unknown> {
  const declaredHeader = req.headers.get("content-length");
  if (declaredHeader !== null) {
    const declared = Number(declaredHeader);
    if (!Number.isSafeInteger(declared) || declared < 0) throw new ProcessingDomainError("invalid_content_length", 400);
    if (declared > maxBytes) throw new ProcessingDomainError("request_too_large", 413);
  }
  const reader = req.body?.getReader();
  if (!reader) return JSON.parse("");
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new ProcessingDomainError("request_too_large", 413);
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  text += decoder.decode();
  return JSON.parse(text);
}

/** Test-only reset for deterministic route-rate-limit coverage. */
export function __resetProcessingWriteRateLimitForTests(): void {
  writeRateState.clear();
}
