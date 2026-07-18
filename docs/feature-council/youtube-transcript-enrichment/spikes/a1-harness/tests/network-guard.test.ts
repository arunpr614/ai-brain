import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

import {
  installFailFastNetworkGuard,
  NetworkAttemptBlockedError,
} from "../network-guard";

const require = createRequire(import.meta.url);

test("DEV unit: network guard blocks fetch synchronously and records only a target hash", () => {
  const originalFetch = globalThis.fetch;
  const guard = installFailFastNetworkGuard();
  try {
    assert.throws(
      () => globalThis.fetch("https://example.invalid/private?token=secret"),
      NetworkAttemptBlockedError,
    );
    assert.equal(guard.attempts.length, 1);
    assert.equal(guard.attempts[0].surface, "global.fetch");
    assert.match(guard.attempts[0].target_sha256, /^[0-9a-f]{64}$/);
    assert.equal(JSON.stringify(guard.attempts).includes("secret"), false);
  } finally {
    guard.restore();
  }
  assert.equal(globalThis.fetch, originalFetch);
});

test("DEV unit: network guard blocks the low-level HTTP surface before egress", () => {
  const http = require("node:http") as typeof import("node:http");
  const guard = installFailFastNetworkGuard();
  try {
    assert.throws(
      () => http.get("http://127.0.0.1:9/private"),
      NetworkAttemptBlockedError,
    );
    assert.equal(guard.attempts[0].surface, "http.get");
  } finally {
    guard.restore();
  }
});

test("DEV unit: network guard blocks promise-based DNS resolution", () => {
  const dns = require("node:dns/promises") as typeof import("node:dns/promises");
  const guard = installFailFastNetworkGuard();
  try {
    assert.throws(
      () => dns.resolve4("example.invalid"),
      NetworkAttemptBlockedError,
    );
    assert.equal(guard.attempts[0].surface, "dns.promises.resolve4");
  } finally {
    guard.restore();
  }
});
