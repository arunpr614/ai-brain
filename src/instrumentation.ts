/**
 * Next.js instrumentation hook. Runs once per server process on boot.
 * Use only for genuinely server-side bootstrap (DB warm-up, schedulers).
 *
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getDb } = await import("@/db/client");
  const { startBackupScheduler } = await import("@/lib/backup");

  // Touching getDb() warms the connection + runs migrations.
  getDb();

  startBackupScheduler();
}
