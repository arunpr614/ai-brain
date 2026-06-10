import crypto from "node:crypto";
import type Database from "better-sqlite3";
import { getDb, newId } from "@/db/client";
import { loadApiToken } from "@/lib/auth/bearer";

export const PAIRING_CODE_TTL_MS = 5 * 60 * 1000;
export const PAIRING_CODE_MAX_ATTEMPTS = 5;

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVALID_WINDOW_MS = 5 * 60 * 1000;
const INVALID_MAX_ATTEMPTS = 10;
const GLOBAL_INVALID_MAX_ATTEMPTS = 30;

type PairingCodeRow = {
  id: string;
  code_hash: string;
  expires_at: number;
  used_at: number | null;
  attempts: number;
};

const invalidAttempts = new Map<string, number[]>();
const globalInvalidAttempts: number[] = [];

export type CreatePairingCodeResult =
  | { ok: true; code: string; expiresAt: number }
  | { ok: false; reason: "token_not_configured" };

export type ExchangePairingCodeResult =
  | { ok: true; token: string }
  | {
      ok: false;
      reason:
        | "token_not_configured"
        | "invalid_code"
        | "expired_code"
        | "used_code"
        | "rate_limited";
    };

export function normalizePairingCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, "");
}

export function formatPairingCode(normalized: string): string {
  return normalized.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

export function generatePairingCode(): string {
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    const idx = crypto.randomInt(0, CODE_ALPHABET.length);
    code += CODE_ALPHABET[idx];
  }
  return formatPairingCode(code);
}

export function hashPairingCode(code: string, token: string): string {
  return crypto
    .createHmac("sha256", token)
    .update(normalizePairingCode(code), "utf8")
    .digest("hex");
}

export function createPairingCode(options?: {
  db?: Database.Database;
  now?: number;
  label?: string | null;
}): CreatePairingCodeResult {
  const token = loadApiToken();
  if (!token) return { ok: false, reason: "token_not_configured" };

  const db = options?.db ?? getDb();
  const now = options?.now ?? Date.now();
  const expiresAt = now + PAIRING_CODE_TTL_MS;

  db.prepare(
    `
      UPDATE device_pairing_codes
      SET used_at = ?
      WHERE used_at IS NULL
        AND expires_at > ?
    `,
  ).run(now, now);

  for (let i = 0; i < 3; i += 1) {
    const code = generatePairingCode();
    const hash = hashPairingCode(code, token);
    try {
      db.prepare(
        `
          INSERT INTO device_pairing_codes (
            id, code_hash, label, created_at, expires_at
          )
          VALUES (?, ?, ?, ?, ?)
        `,
      ).run(newId(), hash, options?.label ?? null, now, expiresAt);
      return { ok: true, code, expiresAt };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("UNIQUE")) throw err;
    }
  }

  throw new Error("Could not generate a unique pairing code");
}

export function exchangePairingCode(
  rawCode: string,
  options?: { db?: Database.Database; now?: number },
): ExchangePairingCodeResult {
  const token = loadApiToken();
  if (!token) return { ok: false, reason: "token_not_configured" };

  const code = normalizePairingCode(rawCode);
  if (!/^[A-Z2-9]{6,8}$/.test(code)) {
    return recordInvalidAttempt(code || "empty", options?.now ?? Date.now());
  }

  const db = options?.db ?? getDb();
  const now = options?.now ?? Date.now();
  const codeHash = hashPairingCode(code, token);
  const row = db
    .prepare(
      `
        SELECT id, code_hash, expires_at, used_at, attempts
        FROM device_pairing_codes
        WHERE code_hash = ?
      `,
    )
    .get(codeHash) as PairingCodeRow | undefined;

  if (!row) return recordInvalidAttempt(codeHash, now);
  if (row.attempts >= PAIRING_CODE_MAX_ATTEMPTS) {
    return { ok: false, reason: "rate_limited" };
  }
  if (row.used_at !== null) {
    incrementAttempts(db, row.id, now);
    return { ok: false, reason: "used_code" };
  }
  if (row.expires_at <= now) {
    incrementAttempts(db, row.id, now);
    return { ok: false, reason: "expired_code" };
  }

  const result = db
    .prepare(
      `
        UPDATE device_pairing_codes
        SET used_at = ?, attempts = attempts + 1, last_attempt_at = ?
        WHERE id = ?
          AND used_at IS NULL
          AND expires_at > ?
      `,
    )
    .run(now, now, row.id, now);

  if (result.changes !== 1) {
    return { ok: false, reason: "used_code" };
  }

  return { ok: true, token };
}

function incrementAttempts(db: Database.Database, id: string, now: number): void {
  db.prepare(
    `
      UPDATE device_pairing_codes
      SET attempts = attempts + 1, last_attempt_at = ?
      WHERE id = ?
    `,
  ).run(now, id);
}

function recordInvalidAttempt(
  key: string,
  now: number,
): Extract<ExchangePairingCodeResult, { ok: false }> {
  const globalRecent = pruneAttempts(globalInvalidAttempts, now);
  globalRecent.push(now);
  globalInvalidAttempts.splice(0, globalInvalidAttempts.length, ...globalRecent);

  const prior = invalidAttempts.get(key) ?? [];
  const recent = pruneAttempts(prior, now);
  recent.push(now);
  invalidAttempts.set(key, recent);

  if (globalRecent.length > GLOBAL_INVALID_MAX_ATTEMPTS) {
    return { ok: false, reason: "rate_limited" };
  }

  return {
    ok: false,
    reason: recent.length > INVALID_MAX_ATTEMPTS ? "rate_limited" : "invalid_code",
  };
}

function pruneAttempts(attempts: number[], now: number): number[] {
  return attempts.filter((ts) => now - ts < INVALID_WINDOW_MS);
}

export function __resetPairingCodeRateLimitForTests(): void {
  invalidAttempts.clear();
  globalInvalidAttempts.length = 0;
}
