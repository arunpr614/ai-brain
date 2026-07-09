import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.BRAIN_DB_PATH;
const scenario = process.env.A5_SCENARIO ?? "paired";
const manifestPath = process.env.A5_MANIFEST_PATH;

if (!dbPath) {
  throw new Error("Set BRAIN_DB_PATH to a temporary A5 SQLite database path.");
}

if (!["empty", "paired"].includes(scenario)) {
  throw new Error("A5_SCENARIO must be empty or paired.");
}

if (process.env.A5_RESET_DB === "1") {
  if (!dbPath.startsWith("/tmp/")) {
    throw new Error("A5_RESET_DB=1 is only allowed for /tmp databases.");
  }
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    } catch {}
  }
}

async function main() {
  const { getDb } = await import("@/db/client");
  const db = getDb();
  const now = Date.now();

  if (scenario === "empty") {
    emit({
      scenario,
      dbPath,
      reset: process.env.A5_RESET_DB === "1",
      createdAt: now,
      routes: {
        setup: "/setup?next=/library",
        unlockRedirect: "/unlock?next=/library",
      },
    });
    return;
  }

  const apiToken = process.env.BRAIN_API_TOKEN;
  if (!apiToken || apiToken.length < 32) {
    throw new Error("Set BRAIN_API_TOKEN to a temporary token of at least 32 characters.");
  }

  const { SESSION_COOKIE, issueSessionToken, setPin } = await import("@/lib/auth");
  const {
    PAIRING_CODE_TTL_MS,
    createPairingCode,
    exchangePairingCode,
  } = await import("@/lib/device-pairing/codes");

  setPin("2468");
  const sessionToken = issueSessionToken();

  const expired = createPairingCode({
    db,
    now: now - PAIRING_CODE_TTL_MS - 1_000,
    label: "A5 expired Android code",
  });
  if (!expired.ok) throw new Error(`Could not create expired code: ${expired.reason}`);

  const used = createPairingCode({
    db,
    now,
    label: "A5 used Android code",
  });
  if (!used.ok) throw new Error(`Could not create used code: ${used.reason}`);
  const usedExchange = exchangePairingCode(used.code, { db, now: now + 500 });
  if (!usedExchange.ok) {
    throw new Error(`Could not mark used code: ${usedExchange.reason}`);
  }

  const valid = createPairingCode({
    db,
    now: now + 1_000,
    label: "A5 valid Android code",
  });
  if (!valid.ok) throw new Error(`Could not create valid code: ${valid.reason}`);

  emit({
    scenario,
    dbPath,
    reset: process.env.A5_RESET_DB === "1",
    createdAt: now,
    auth: {
      pin: "2468",
      sessionCookieName: SESSION_COOKIE,
      sessionToken,
    },
    pairingCodes: {
      expired: {
        code: expired.code,
        expiresAt: expired.expiresAt,
      },
      used: {
        code: used.code,
        exchanged: true,
      },
      valid: {
        code: valid.code,
        expiresAt: valid.expiresAt,
      },
    },
    routes: {
      setupApk: "/setup-apk",
      unlock: "/unlock?next=/library",
      sessionExpired: "/unlock?next=/library&reason=session-expired",
      devicePairing: "/settings/device-pairing",
      unauthenticatedDevicePairing: "/settings/device-pairing",
    },
  });
}

function emit(manifest: Record<string, unknown>) {
  const body = JSON.stringify(manifest, null, 2);
  const redacted = JSON.stringify(redactManifest(manifest), null, 2);
  if (manifestPath) {
    const resolved = path.resolve(manifestPath);
    if (!resolved.startsWith("/tmp/")) {
      throw new Error("A5_MANIFEST_PATH contains auth material and must be under /tmp.");
    }
    fs.writeFileSync(resolved, `${body}\n`, { mode: 0o600 });
    fs.chmodSync(resolved, 0o600);
  }
  console.log(redacted);
}

function redactManifest(manifest: Record<string, unknown>): Record<string, unknown> {
  const redacted = JSON.parse(JSON.stringify(manifest)) as Record<string, unknown>;
  const auth = redacted.auth as Record<string, unknown> | undefined;
  if (auth) {
    if ("pin" in auth) auth.pin = "[redacted]";
    if ("sessionToken" in auth) auth.sessionToken = "[redacted]";
  }

  const pairingCodes = redacted.pairingCodes as Record<
    string,
    Record<string, unknown>
  > | undefined;
  if (pairingCodes) {
    for (const value of Object.values(pairingCodes)) {
      if (value && "code" in value) value.code = "[redacted]";
    }
  }

  if (manifestPath) {
    redacted.secretManifestPath = path.resolve(manifestPath);
    redacted.secretManifestWritten = true;
  }

  return redacted;
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
