import assert from "node:assert/strict";
import test from "node:test";
import { BrainConnectorError } from "../src/notebooklm/brain-client.ts";
import {
  connectorSetupErrorMessage,
  pairingErrorMessage,
  shouldClearPairingCode,
} from "../src/notebooklm/setup-errors.ts";

test("unknown setup errors never expose arbitrary exception text", () => {
  const secretSentinel = "SECRET_SHAPED_SENTINEL_DO_NOT_RENDER";
  assert.equal(pairingErrorMessage(new Error(secretSentinel)).includes(secretSentinel), false);
  assert.equal(connectorSetupErrorMessage(new Error(secretSentinel)).includes(secretSentinel), false);
});

test("only locally repairable pairing format errors retain the typed code", () => {
  assert.equal(
    shouldClearPairingCode(new BrainConnectorError("invalid_format", "local format")),
    false,
  );
  for (const kind of [
    "invalid_code",
    "expired_code",
    "used_code",
    "invalid_origin",
    "network",
    "timeout",
    "rate_limited",
    "server",
    "protocol",
  ] as const) {
    assert.equal(shouldClearPairingCode(new BrainConnectorError(kind, "safe")), true);
  }
  assert.equal(shouldClearPairingCode(new Error("unknown")), true);
});
