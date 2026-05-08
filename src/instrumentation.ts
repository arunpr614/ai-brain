/**
 * Next.js instrumentation hook. Runs once per server process on boot.
 * Use only for genuinely server-side bootstrap (DB warm-up, schedulers).
 *
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 *
 * Network-exposure policy (F-042, pre-v0.5.0):
 * Server actions and API routes have no CSRF protection yet — a malicious
 * origin in the user's browser could POST to our endpoints and mutate state
 * if the server were reachable beyond loopback. Until v0.5.0 lands F-035
 * (mDNS), F-036 (CSRF), and F-037 (token rotation), the `dev` and `start`
 * scripts in package.json bind to 127.0.0.1 explicitly. Do NOT remove the
 * `-H 127.0.0.1` flag or add `0.0.0.0` bindings here.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getDb } = await import("@/db/client");
  const { startBackupScheduler } = await import("@/lib/backup");
  const { startEnrichmentWorker } = await import("@/lib/queue/enrichment-worker");

  // Touching getDb() warms the connection + runs migrations.
  getDb();

  startBackupScheduler();
  startEnrichmentWorker();
}
