/**
 * Next.js instrumentation hook. Runs once per server process on boot.
 * Use only for genuinely server-side bootstrap (DB warm-up, schedulers).
 *
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 *
 * Network-exposure policy (F-042):
 * Server actions and API routes have no CSRF protection beyond the bearer
 * token + origin allowlist. The `dev` and `start` scripts in package.json
 * bind to 127.0.0.1 explicitly; all remote access arrives via the
 * Cloudflare named tunnel (`brain.arunp.in` → `localhost:3000`). Do NOT
 * remove the `-H 127.0.0.1` flag or add `0.0.0.0` bindings here.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    // F-047 (self-critique A-11): make the skip visible in the boot log so
    // an accidental Edge-runtime move on a route doesn't silently mean
    // "worker + backup didn't start."
    console.log(
      `[boot] instrumentation skipped — NEXT_RUNTIME=${process.env.NEXT_RUNTIME ?? "(unset)"} (expected "nodejs")`,
    );
    return;
  }

  const { getDb } = await import("@/db/client");
  const { startBackupScheduler } = await import("@/lib/backup");
  const { startEnrichmentWorker } = await import("@/lib/queue/enrichment-worker");
  const { startEnrichmentBatchCron } = await import(
    "@/lib/queue/enrichment-batch-cron"
  );
  const { ensureLanToken } = await import("@/lib/auth/bearer");
  const { logError } = await import("@/lib/errors/sink");

  // Touching getDb() warms the connection + runs migrations.
  getDb();

  // v0.5.0 T-4: auto-generate BRAIN_LAN_TOKEN on first boot if absent.
  // Writes the value back to .env at the repo root so it survives restarts.
  // The log line is the operator's signal that they should open Settings →
  // Device Pairing and scan the QR onto their APK/extension.
  const generated = ensureLanToken({
    onGenerate: () => {
      console.log(
        "[boot] Generated BRAIN_LAN_TOKEN and wrote to .env — open /settings/device-pairing to pair APK / extension.",
      );
      logError({ type: "lan.bearer.token-generated", ts: Date.now() });
    },
  });
  if (!generated) {
    // No log spam when the token is already configured; intentional silence.
  }

  // v0.6.1 T-11a: deprecation warning when only the legacy env name is set.
  // The bearer module dual-reads BRAIN_API_TOKEN ?? BRAIN_LAN_TOKEN; when
  // only the old name is present, surface a single-line nudge to operators
  // so the rename can finish in v0.6.2 T-11b. Silent once BRAIN_API_TOKEN
  // is also defined.
  if (!process.env.BRAIN_API_TOKEN && process.env.BRAIN_LAN_TOKEN) {
    console.warn(
      "[boot] BRAIN_LAN_TOKEN is deprecated; rename to BRAIN_API_TOKEN in /etc/brain/.env (legacy name still works during the v0.6.1 dual-read window).",
    );
  }

  startBackupScheduler();
  startEnrichmentWorker();
  // v0.6.0 Phase C-4: daily Anthropic Message Batch scheduler. Provider-
  // gated — no-op when LLM_ENRICH_PROVIDER lacks submitBatch (Ollama,
  // OpenRouter). The cron still registers so a runtime env flip + restart
  // activates the path without a code change.
  startEnrichmentBatchCron();
}
