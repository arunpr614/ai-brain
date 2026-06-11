import { backfillYoutubeTranscriptRecoveryJobs } from "../src/lib/capture/youtube-transcript/backfill";

const args = new Set(process.argv.slice(2));
const limitArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith("--limit="))
  ?.slice("--limit=".length);

const result = backfillYoutubeTranscriptRecoveryJobs({
  dryRun: !args.has("--run"),
  ignoreCooldown: args.has("--ignore-cooldown"),
  limit: limitArg ? Number(limitArg) : undefined,
});

console.log(JSON.stringify(result, null, 2));
