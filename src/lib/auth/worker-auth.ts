import { type NextRequest } from "next/server";
import { verifyBearerToken } from "./bearer";
import { verifySessionCookie } from "@/lib/auth";

/**
 * Checks if the request is authorized either via a valid session cookie (Web UI)
 * or via a valid Bearer token (BRAIN_WORKER_TOKEN or BRAIN_API_TOKEN).
 */
export function isAuthorizedWorkerOrSession(req: NextRequest): boolean {
  // 1. Check session cookie
  if (verifySessionCookie(req.cookies)) {
    return true;
  }

  // 2. Check Bearer authorization header
  const authHeader = req.headers.get("authorization");
  const verdict = verifyBearerToken(authHeader);
  return verdict.ok;
}
