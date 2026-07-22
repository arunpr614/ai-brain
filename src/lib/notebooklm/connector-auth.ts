import crypto from "node:crypto";
import type Database from "better-sqlite3";
import { getDb, newId } from "@/db/client";
import { loadApiToken } from "@/lib/auth/bearer";
import {
  NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
  NOTEBOOKLM_PAIRING_CODE_TTL_MS,
} from "./contracts";
import { recordNotebookLmOperationalEvent } from "./operations";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MAX_CODE_ATTEMPTS = 5;

export interface NotebookLmConnectorRow {
  id: string;
  token_hash: string;
  token_hint: string;
  label: string;
  extension_origin: string;
  protocol_version: number;
  state: "registered" | "bound" | "revoked";
  created_at: number;
  updated_at: number;
  last_seen_at: number | null;
  revoked_at: number | null;
}

interface PairingCodeRow {
  id: string;
  code_hash: string;
  expires_at: number;
  used_at: number | null;
  attempts: number;
}

export type ConnectorAuthResult =
  | { ok: true; connector: NotebookLmConnectorRow }
  | {
      ok: false;
      reason:
        | "missing_authorization"
        | "malformed_authorization"
        | "invalid_token"
        | "origin_required"
        | "origin_mismatch"
        | "revoked"
        | "protocol_mismatch";
    };

export function normalizeConnectorPairingCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, "");
}

export function createConnectorPairingCode(options: {
  label?: string;
  now?: number;
  db?: Database.Database;
} = {}): { code: string; expiresAt: number } {
  const secret = loadApiToken();
  if (!secret) throw new Error("connector_pairing_unavailable");
  const db = options.db ?? getDb();
  const now = options.now ?? Date.now();
  const expiresAt = now + NOTEBOOKLM_PAIRING_CODE_TTL_MS;
  db.prepare(
    `UPDATE notebooklm_connector_pairing_codes SET used_at = ?
     WHERE used_at IS NULL AND expires_at > ?`,
  ).run(now, now);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const normalized = Array.from({ length: 8 }, () =>
      CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)],
    ).join("");
    const code = `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
    try {
      db.prepare(
        `INSERT INTO notebooklm_connector_pairing_codes
         (id, code_hash, label, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(
        newId(),
        pairingCodeHash(normalized, secret),
        safeConnectorLabel(options.label),
        now,
        expiresAt,
      );
      recordNotebookLmOperationalEvent({
        eventType: "notebooklm.setup_started",
        now,
        db,
      });
      return { code, expiresAt };
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("UNIQUE")) throw error;
    }
  }
  throw new Error("connector_pairing_collision");
}

export function exchangeConnectorPairingCode(input: {
  code: string;
  origin: string | null;
  label?: string;
  protocolVersion?: number;
  now?: number;
  db?: Database.Database;
}):
  | { ok: true; connectorId: string; connectorToken: string; protocolVersion: number }
  | { ok: false; reason: "invalid_origin" | "invalid_code" | "expired_code" | "used_code" | "rate_limited" | "unavailable" } {
  const origin = normalizedExtensionOrigin(input.origin);
  if (!origin) return { ok: false, reason: "invalid_origin" };
  const secret = loadApiToken();
  if (!secret) return { ok: false, reason: "unavailable" };
  const normalized = normalizeConnectorPairingCode(input.code);
  if (!/^[A-Z2-9]{8}$/.test(normalized)) return { ok: false, reason: "invalid_code" };
  const protocolVersion = input.protocolVersion ?? NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION;
  if (protocolVersion !== NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION) {
    return { ok: false, reason: "invalid_code" };
  }
  const db = input.db ?? getDb();
  const now = input.now ?? Date.now();
  const codeHash = pairingCodeHash(normalized, secret);
  const row = db
    .prepare(
      `SELECT id, code_hash, expires_at, used_at, attempts
       FROM notebooklm_connector_pairing_codes WHERE code_hash = ?`,
    )
    .get(codeHash) as PairingCodeRow | undefined;
  if (!row) return { ok: false, reason: "invalid_code" };
  if (row.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, reason: "rate_limited" };
  if (row.used_at !== null) {
    recordPairingAttempt(db, row.id, now);
    return { ok: false, reason: "used_code" };
  }
  if (row.expires_at <= now) {
    recordPairingAttempt(db, row.id, now);
    return { ok: false, reason: "expired_code" };
  }
  const boundConnector = db
    .prepare("SELECT 1 value FROM notebooklm_connectors WHERE state = 'bound' LIMIT 1")
    .get() as { value: number } | undefined;
  if (boundConnector) return { ok: false, reason: "unavailable" };

  const connectorId = newId();
  const connectorToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashConnectorToken(connectorToken);
  const tx = db.transaction(() => {
    const used = db.prepare(
      `UPDATE notebooklm_connector_pairing_codes
       SET used_at = ?, attempts = attempts + 1, last_attempt_at = ?
       WHERE id = ? AND used_at IS NULL AND expires_at > ?`,
    ).run(now, now, row.id, now);
    if (used.changes !== 1) throw new Error("connector_pairing_race");
    db.prepare(
      `UPDATE notebooklm_connectors
       SET state = 'revoked', revoked_at = ?, updated_at = ?
       WHERE state = 'registered'`,
    ).run(now, now);
    db.prepare(
      `INSERT INTO notebooklm_connectors
       (id, token_hash, token_hint, label, extension_origin, protocol_version, state,
        created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'registered', ?, ?)`,
    ).run(
      connectorId,
      tokenHash,
      connectorToken.slice(-8),
      safeConnectorLabel(input.label),
      origin,
      protocolVersion,
      now,
      now,
    );
    recordNotebookLmOperationalEvent({
      eventType: "notebooklm.permission_granted",
      connectorId,
      now,
      db,
    });
  });
  try {
    tx.immediate();
  } catch (error) {
    if (error instanceof Error && error.message === "connector_pairing_race") {
      return { ok: false, reason: "used_code" };
    }
    if (error instanceof Error && error.message.includes("idx_notebooklm_connectors_one_live")) {
      return { ok: false, reason: "unavailable" };
    }
    throw error;
  }
  return { ok: true, connectorId, connectorToken, protocolVersion };
}

export function authenticateNotebookLmConnector(input: {
  authorization: string | null;
  origin: string | null;
  protocolVersion?: string | null;
  now?: number;
  db?: Database.Database;
}): ConnectorAuthResult {
  if (!input.authorization) return { ok: false, reason: "missing_authorization" };
  if (!input.authorization.startsWith("Bearer ")) {
    return { ok: false, reason: "malformed_authorization" };
  }
  const token = input.authorization.slice("Bearer ".length);
  if (!/^[a-f0-9]{64}$/.test(token)) return { ok: false, reason: "invalid_token" };
  const origin = normalizedExtensionOrigin(input.origin);
  if (!origin) return { ok: false, reason: "origin_required" };
  const protocolVersion = Number(input.protocolVersion);
  if (protocolVersion !== NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION) {
    return { ok: false, reason: "protocol_mismatch" };
  }
  const db = input.db ?? getDb();
  const connector = db
    .prepare("SELECT * FROM notebooklm_connectors WHERE token_hash = ?")
    .get(hashConnectorToken(token)) as NotebookLmConnectorRow | undefined;
  if (!connector) return { ok: false, reason: "invalid_token" };
  if (connector.state === "revoked") return { ok: false, reason: "revoked" };
  if (connector.extension_origin !== origin) return { ok: false, reason: "origin_mismatch" };
  const now = input.now ?? Date.now();
  db.prepare(
    "UPDATE notebooklm_connectors SET last_seen_at = ?, updated_at = ? WHERE id = ?",
  ).run(now, now, connector.id);
  return { ok: true, connector: { ...connector, last_seen_at: now, updated_at: now } };
}

export function hashConnectorToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function pairingCodeHash(code: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(normalizeConnectorPairingCode(code), "utf8")
    .digest("hex");
}

function normalizedExtensionOrigin(origin: string | null): string | null {
  if (!origin || !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) return null;
  return origin;
}

function safeConnectorLabel(value: string | null | undefined): string {
  const normalized = value?.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || "Chrome connector").slice(0, 64);
}

function recordPairingAttempt(db: Database.Database, id: string, now: number): void {
  db.prepare(
    `UPDATE notebooklm_connector_pairing_codes
     SET attempts = attempts + 1, last_attempt_at = ? WHERE id = ?`,
  ).run(now, id);
}
