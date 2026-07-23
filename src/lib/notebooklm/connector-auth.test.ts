import "./connector-auth.test.setup";

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { test } from "node:test";
import { getDb } from "@/db/client";
import {
  authenticateNotebookLmConnector,
  createConnectorPairingCode,
  exchangeConnectorPairingCode,
  hashConnectorToken,
  normalizeConnectorPairingCode,
} from "./connector-auth";
import { NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION } from "./contracts";
import { TEST_API_TOKEN, TEST_DB_DIR } from "./connector-auth.test.setup";

const ORIGIN_A = `chrome-extension://${"a".repeat(32)}`;
const ORIGIN_B = `chrome-extension://${"b".repeat(32)}`;
let sequence = 0;

test.after(() => {
  rmSync(TEST_DB_DIR, { recursive: true, force: true });
});

function pair(now = 1_700_000_000_000) {
  sequence += 1;
  const pairing = createConnectorPairingCode({
    label: `Synthetic connector ${sequence}`,
    now,
  });
  const exchanged = exchangeConnectorPairingCode({
    code: pairing.code,
    origin: ORIGIN_A,
    label: `Synthetic connector ${sequence}`,
    protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
    now: now + 1,
  });
  assert.equal(exchanged.ok, true);
  if (!exchanged.ok) throw new Error("synthetic connector pairing failed");
  return { pairing, exchanged };
}

test("pairing codes are short-lived, normalized, single-use, and never stored in plaintext", () => {
  const now = 1_700_000_100_000;
  const pairing = createConnectorPairingCode({ label: "  Browser\u0000  helper ", now });
  assert.match(pairing.code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.equal(pairing.expiresAt, now + 5 * 60_000);
  assert.equal(normalizeConnectorPairingCode(` ${pairing.code.toLowerCase()} `), pairing.code.replace("-", ""));

  const before = getDb().prepare("SELECT * FROM notebooklm_connector_pairing_codes").get() as Record<string, unknown>;
  assert.match(String(before.code_hash), /^[a-f0-9]{64}$/);
  assert.notEqual(before.code_hash, normalizeConnectorPairingCode(pairing.code));
  assert.equal(JSON.stringify(before).includes(pairing.code), false);

  const exchanged = exchangeConnectorPairingCode({
    code: pairing.code.toLowerCase(),
    origin: ORIGIN_A,
    protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
    now: now + 1,
  });
  assert.equal(exchanged.ok, true);
  if (!exchanged.ok) return;
  assert.match(exchanged.connectorToken, /^[a-f0-9]{64}$/);

  const replay = exchangeConnectorPairingCode({
    code: pairing.code,
    origin: ORIGIN_A,
    protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
    now: now + 2,
  });
  assert.deepEqual(replay, { ok: false, reason: "used_code" });

  const connector = getDb()
    .prepare("SELECT * FROM notebooklm_connectors WHERE id = ?")
    .get(exchanged.connectorId) as Record<string, unknown>;
  assert.equal(connector.token_hash, hashConnectorToken(exchanged.connectorToken));
  assert.equal(connector.token_hint, exchanged.connectorToken.slice(-8));
  assert.equal(connector.label, "Chrome connector");
  assert.equal(JSON.stringify(connector).includes(exchanged.connectorToken), false);
  const operationalEvents = getDb()
    .prepare("SELECT * FROM notebooklm_operational_events ORDER BY id")
    .all();
  assert.deepEqual(
    (operationalEvents as Array<{ event_type: string }>).map((event) => event.event_type),
    ["notebooklm.setup_started", "notebooklm.permission_granted"],
  );
  const serializedEvents = JSON.stringify(operationalEvents);
  assert.equal(serializedEvents.includes(pairing.code), false);
  assert.equal(serializedEvents.includes(exchanged.connectorToken), false);
  assert.equal(serializedEvents.includes(TEST_API_TOKEN), false);
});

test("creating a new enrollment code invalidates the previous active code", () => {
  const now = 1_700_000_200_000;
  const first = createConnectorPairingCode({ now });
  const second = createConnectorPairingCode({ now: now + 1 });
  assert.notEqual(first.code, second.code);
  assert.deepEqual(
    exchangeConnectorPairingCode({ code: first.code, origin: ORIGIN_A, protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION, now: now + 2 }),
    { ok: false, reason: "used_code" },
  );
  assert.equal(
    exchangeConnectorPairingCode({ code: second.code, origin: ORIGIN_A, protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION, now: now + 2 }).ok,
    true,
  );
});

test("a fresh exchange retires an unbound connector whose first response was lost", () => {
  const now = 1_700_000_250_000;
  const firstCode = createConnectorPairingCode({ now });
  const first = exchangeConnectorPairingCode({
    code: firstCode.code,
    origin: ORIGIN_A,
    protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
    now: now + 1,
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;

  // Model the browser losing the success response: it creates a fresh code
  // instead of retrying the consumed code or clearing unrelated local state.
  const recoveryCode = createConnectorPairingCode({ now: now + 2 });
  const recovery = exchangeConnectorPairingCode({
    code: recoveryCode.code,
    origin: ORIGIN_A,
    protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
    now: now + 3,
  });
  assert.equal(recovery.ok, true);
  if (!recovery.ok) return;

  const firstRow = getDb()
    .prepare("SELECT state, revoked_at FROM notebooklm_connectors WHERE id = ?")
    .get(first.connectorId) as { state: string; revoked_at: number | null };
  const recoveryRow = getDb()
    .prepare("SELECT state, revoked_at FROM notebooklm_connectors WHERE id = ?")
    .get(recovery.connectorId) as { state: string; revoked_at: number | null };
  assert.deepEqual(firstRow, { state: "revoked", revoked_at: now + 3 });
  assert.deepEqual(recoveryRow, { state: "registered", revoked_at: null });
  assert.equal(
    (getDb().prepare("SELECT COUNT(*) count FROM notebooklm_connectors WHERE state != 'revoked'").get() as { count: number }).count,
    1,
  );
  assert.deepEqual(
    authenticateNotebookLmConnector({
      authorization: `Bearer ${first.connectorToken}`,
      origin: ORIGIN_A,
      protocolVersion: String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION),
      now: now + 4,
    }),
    { ok: false, reason: "revoked" },
  );
});

test("expired and repeatedly replayed codes fail closed", () => {
  const now = 1_700_000_300_000;
  const expired = createConnectorPairingCode({ now });
  assert.deepEqual(
    exchangeConnectorPairingCode({
      code: expired.code,
      origin: ORIGIN_A,
      protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
      now: expired.expiresAt,
    }),
    { ok: false, reason: "expired_code" },
  );

  const active = createConnectorPairingCode({ now: now + 1_000_000 });
  const first = exchangeConnectorPairingCode({
    code: active.code,
    origin: ORIGIN_A,
    protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
    now: now + 1_000_001,
  });
  assert.equal(first.ok, true);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.deepEqual(
      exchangeConnectorPairingCode({
        code: active.code,
        origin: ORIGIN_A,
        protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
        now: now + 1_000_002 + attempt,
      }),
      { ok: false, reason: "used_code" },
    );
  }
  assert.deepEqual(
    exchangeConnectorPairingCode({
      code: active.code,
      origin: ORIGIN_A,
      protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
      now: now + 1_000_010,
    }),
    { ok: false, reason: "rate_limited" },
  );
});

test("exchange accepts only an exact Chrome extension origin and the current protocol", () => {
  const invalidOrigins = [
    null,
    "https://example.com",
    "chrome-extension://short",
    `chrome-extension://${"q".repeat(32)}`,
    `chrome-extension://${"A".repeat(32)}`,
    `${ORIGIN_A}/path`,
  ];
  for (const [index, origin] of invalidOrigins.entries()) {
    const code = createConnectorPairingCode({ now: 1_700_001_000_000 + index });
    assert.deepEqual(
      exchangeConnectorPairingCode({ code: code.code, origin, protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION, now: 1_700_001_000_100 + index }),
      { ok: false, reason: "invalid_origin" },
    );
  }

  const protocolCode = createConnectorPairingCode({ now: 1_700_001_100_000 });
  assert.deepEqual(
    exchangeConnectorPairingCode({
      code: protocolCode.code,
      origin: ORIGIN_A,
      protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION + 1,
      now: 1_700_001_100_001,
    }),
    { ok: false, reason: "invalid_code" },
  );
});

test("connector auth requires bearer shape, exact origin, exact protocol, and updates liveness", () => {
  const now = 1_700_002_000_000;
  const { exchanged } = pair(now);
  const valid = authenticateNotebookLmConnector({
    authorization: `Bearer ${exchanged.connectorToken}`,
    origin: ORIGIN_A,
    protocolVersion: String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION),
    now: now + 10,
  });
  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  assert.equal(valid.connector.last_seen_at, now + 10);
  assert.equal(valid.connector.updated_at, now + 10);

  const failures = [
    [{ authorization: null, origin: ORIGIN_A, protocolVersion: String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION) }, "missing_authorization"],
    [{ authorization: exchanged.connectorToken, origin: ORIGIN_A, protocolVersion: String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION) }, "malformed_authorization"],
    [{ authorization: "Bearer bad", origin: ORIGIN_A, protocolVersion: String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION) }, "invalid_token"],
    [{ authorization: `Bearer ${"f".repeat(64)}`, origin: ORIGIN_A, protocolVersion: String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION) }, "invalid_token"],
    [{ authorization: `Bearer ${exchanged.connectorToken}`, origin: null, protocolVersion: String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION) }, "origin_required"],
    [{ authorization: `Bearer ${exchanged.connectorToken}`, origin: ORIGIN_B, protocolVersion: String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION) }, "origin_mismatch"],
    [{ authorization: `Bearer ${exchanged.connectorToken}`, origin: ORIGIN_A, protocolVersion: String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION + 1) }, "protocol_mismatch"],
  ] as const;
  for (const [input, reason] of failures) {
    const result = authenticateNotebookLmConnector(input);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, reason);
  }

  getDb()
    .prepare("UPDATE notebooklm_connectors SET state='revoked', revoked_at=?, updated_at=? WHERE id=?")
    .run(now + 20, now + 20, exchanged.connectorId);
  const revoked = authenticateNotebookLmConnector({
    authorization: `Bearer ${exchanged.connectorToken}`,
    origin: ORIGIN_A,
    protocolVersion: String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION),
  });
  assert.deepEqual(revoked, { ok: false, reason: "revoked" });
});

test("protocol-2 authentication upgrades an existing protocol-1 connector in place", () => {
  const now = 1_700_002_500_000;
  const { exchanged } = pair(now);
  getDb()
    .prepare("UPDATE notebooklm_connectors SET protocol_version=1 WHERE id=?")
    .run(exchanged.connectorId);

  const result = authenticateNotebookLmConnector({
    authorization: `Bearer ${exchanged.connectorToken}`,
    origin: ORIGIN_A,
    protocolVersion: String(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION),
    now: now + 10,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.connector.protocol_version, NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION);
  assert.equal(
    (
      getDb()
        .prepare("SELECT protocol_version FROM notebooklm_connectors WHERE id=?")
        .get(exchanged.connectorId) as { protocol_version: number }
    ).protocol_version,
    NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
  );
});

test("pairing fails closed when the server secret is unavailable", () => {
  delete process.env.BRAIN_API_TOKEN;
  try {
    assert.throws(() => createConnectorPairingCode(), /connector_pairing_unavailable/);
    assert.deepEqual(
      exchangeConnectorPairingCode({ code: "ABCD-EFGH", origin: ORIGIN_A, protocolVersion: NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION }),
      { ok: false, reason: "unavailable" },
    );
  } finally {
    process.env.BRAIN_API_TOKEN = TEST_API_TOKEN;
  }
});
