import { getDb } from "../src/db/client";
import { getYouTubeBrowserSchemaCapability } from "../src/db/schema-capabilities";
import { backfillYoutubeTranscriptRecoveryJobs } from "../src/lib/capture/youtube-transcript/backfill";
import { classifyDeployment } from "../src/lib/runtime/deployment";
import { resolveContentWorkerPlan } from "../src/lib/startup/content-workers";

const args = new Set(process.argv.slice(2));
const limitArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith("--limit="))
  ?.slice("--limit=".length);

try {
  const db = getDb();
  const schemaCapability = getYouTubeBrowserSchemaCapability(db);
  const workerPlan = resolveContentWorkerPlan({
    deployment: classifyDeployment(),
    schemaCapability,
  });

  if (!workerPlan.starts.transcriptRecovery) {
    console.error(`[youtube-backfill] blocked code=${workerPlan.code}`);
    process.exitCode = 6;
  } else {
    const result = backfillYoutubeTranscriptRecoveryJobs({
      dryRun: !args.has("--run"),
      ignoreCooldown: args.has("--ignore-cooldown"),
      limit: limitArg ? Number(limitArg) : undefined,
    });

    console.log(JSON.stringify(result, null, 2));
    if (result.status === "blocked") process.exitCode = 6;
  }
} catch (error) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "processing_schema_incompatible"
  ) {
    console.error("[youtube-backfill] blocked code=schema_incompatible");
    process.exitCode = 6;
  } else {
    console.error("[youtube-backfill] failed code=backfill_failed");
    process.exitCode = 1;
  }
}
