/**
 * Device-token helpers (v0.5.0 T-8; v0.7.1 pairing-code pivot).
 */
import { generateApiToken } from "@/lib/auth/bearer";
import * as nodeFs from "node:fs";
import * as nodePath from "node:path";

/**
 * Rotate BRAIN_API_TOKEN — generate a fresh token, upsert into .env, mutate
 * process.env so the new value is live for the current server process.
 * Mirrors ensureApiToken()'s file-handling semantics (chmod 600, preserve
 * other lines). Called from POST /api/settings/rotate-token.
 *
 * Returns the new token so the caller can log a truncated fingerprint
 * without re-reading process.env.
 */
export function rotateApiToken(options?: { envPath?: string }): string {
  const envPath = options?.envPath ?? nodePath.resolve(process.cwd(), ".env");
  const token = generateApiToken();
  const line = `BRAIN_API_TOKEN=${token}`;

  let body = "";
  if (nodeFs.existsSync(envPath)) {
    body = nodeFs.readFileSync(envPath, "utf8");
  }
  if (/^BRAIN_API_TOKEN=.*$/m.test(body)) {
    body = body.replace(/^BRAIN_API_TOKEN=.*$/m, line);
  } else {
    if (body.length > 0 && !body.endsWith("\n")) body += "\n";
    body += `${line}\n`;
  }
  nodeFs.writeFileSync(envPath, body, { mode: 0o600 });
  process.env.BRAIN_API_TOKEN = token;
  return token;
}
