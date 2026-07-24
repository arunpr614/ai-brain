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
    console.log("[boot] instrumentation skipped code=runtime_not_nodejs");
    return;
  }

  const { classifyDeployment } = await import("@/lib/runtime/deployment");
  const { parseConfiguredPublicOrigin } = await import(
    "@/lib/http/configured-origin"
  );
  const { createContainmentDiagnostic } = await import(
    "@/lib/runtime/containment-diagnostics"
  );
  const {
    resolveContentWorkerPlan,
    startContentWorkers,
  } = await import("@/lib/startup/content-workers");
  const { getDb } = await import("@/db/client");
  const { getYouTubeBrowserSchemaCapability } = await import(
    "@/db/schema-capabilities"
  );
  const { resumeProcessingEnrollmentJobs } = await import(
    "@/db/processing-enrollment"
  );
  const { startBackupScheduler } = await import("@/lib/backup");
  const { startNotebookLmRetentionWorker } = await import(
    "@/db/notebooklm-export"
  );
  const { ensureApiToken } = await import("@/lib/auth/bearer");
  const { logError } = await import("@/lib/errors/sink");

  // Resolve every containment authority before importing a content claimant.
  // Touching getDb() warms the connection + runs migrations first, after
  // which the feature capability can be attested safely.
  const deployment = classifyDeployment();
  const configuredOrigin = parseConfiguredPublicOrigin();
  const db = getDb();
  const schemaCapability = getYouTubeBrowserSchemaCapability(db);
  const contentWorkerPlan = resolveContentWorkerPlan({
    deployment,
    schemaCapability,
  });

  console.log(
    "[containment]",
    JSON.stringify(
      createContainmentDiagnostic({
        event: "deployment_classified",
        outcome:
          deployment.restrictedCapability === "eligible"
            ? "allowed"
            : "denied",
        deployment: deployment.effectiveDeployment,
        configurationState: deployment.configurationState,
        contractVersion: "deployment-classifier-v1",
      }),
    ),
  );
  console.log(
    "[containment]",
    JSON.stringify(
      createContainmentDiagnostic({
        event: "configured_origin_checked",
        outcome: configuredOrigin.ok ? "valid" : "invalid",
        guardrailTriggered: !configuredOrigin.ok,
        contractVersion: "configured-origin-v1",
      }),
    ),
  );
  console.log(
    "[containment]",
    JSON.stringify(
      createContainmentDiagnostic({
        event: "worker_plan_resolved",
        outcome: Object.values(contentWorkerPlan.starts).some(Boolean)
          ? "allowed"
          : "disabled",
        workerMode: contentWorkerPlan.effectiveMode,
        schemaState: schemaCapability.kind,
        guardrailTriggered: !Object.values(contentWorkerPlan.starts).some(
          Boolean,
        ),
        contractVersion: "content-worker-mode-v1",
      }),
    ),
  );

  // Retention is the first post-migration worker. Backup preparation has a
  // bounded watchdog, but it must never consume even part of the five-minute
  // physical-purge margin before the startup sweep is armed.
  startNotebookLmRetentionWorker();

  // Processing enrollment previews/runs are persisted jobs. Resume any
  // interrupted work after migrations have completed; the scheduler is
  // idempotent and guarded against duplicate in-process runners.
  resumeProcessingEnrollmentJobs();

  // v0.5.0 T-4: auto-generate BRAIN_API_TOKEN on first boot if absent.
  // Writes the value back to .env at the repo root so it survives restarts.
  // The log line is the operator's signal that they should open Settings →
  // Device Pairing and scan the QR onto their APK/extension.
  const generated = ensureApiToken({
    onGenerate: () => {
      console.log(
        "[boot] Generated BRAIN_API_TOKEN and wrote to .env — open /settings/device-pairing to pair APK / extension.",
      );
      logError("lan.bearer.token-generated");
    },
  });
  if (!generated) {
    // No log spam when the token is already configured; intentional silence.
  }

  startBackupScheduler();
  // Content-worker modules are dynamically imported only after the complete
  // deployment/schema/mode plan above is resolved. On an audited pre-feature
  // schema (026 or NotebookLM 027) with no explicit mode or restricted request
  // this preserves the existing ordinary worker set. Disabled, malformed,
  // incompatible, and Stage-1 manual-lab plans import none of them.
  await startContentWorkers(contentWorkerPlan);
}
