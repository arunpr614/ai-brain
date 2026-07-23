import type { BodyProcessingBlockedGate } from "./hold-gate";
import { privateNoStoreHeaders } from "@/lib/http/configured-origin";

/** D-014's only pre-027 public-route change: a private typed no-effect body. */
export function itemBodyProcessingBlockedResponse(
  decision: BodyProcessingBlockedGate,
): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      code: decision.code,
      effect: "none",
    }),
    {
      status: decision.basis === "held" ? 409 : 503,
      headers: privateNoStoreHeaders({
        "Content-Type": "application/json; charset=utf-8",
      }),
    },
  );
}
