import assert from "node:assert/strict";
import { test } from "node:test";
import { itemBodyProcessingBlockedResponse } from "./hold-http";

test("held processing maps to the exact private 409 no-effect contract", async () => {
  const response = itemBodyProcessingBlockedResponse({
    allowed: false,
    basis: "held",
    code: "processing_hold_active",
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    ok: false,
    code: "processing_hold_active",
    effect: "none",
  });
  assertPrivate(response);
});

test("incompatible processing maps to the exact private 503 no-effect contract", async () => {
  const response = itemBodyProcessingBlockedResponse({
    allowed: false,
    basis: "schema_incompatible",
    code: "processing_schema_incompatible",
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    code: "processing_schema_incompatible",
    effect: "none",
  });
  assertPrivate(response);
});

function assertPrivate(response: Response): void {
  assert.equal(
    response.headers.get("Cache-Control"),
    "private, no-store, max-age=0",
  );
  assert.equal(response.headers.get("Pragma"), "no-cache");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("Vary"), "Cookie, Origin");
}
