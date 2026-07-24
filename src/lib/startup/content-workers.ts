import type { SchemaCapabilityState } from "@/db/schema-capabilities";
import type { DeploymentClassification } from "@/lib/runtime/deployment";

export const CONTENT_WORKER_MODES = [
  "disabled",
  "standard",
  "manual-transcript-lab",
] as const;

export type ContentWorkerMode = (typeof CONTENT_WORKER_MODES)[number];

export type ContentWorkerPlanCode =
  | "explicit_disabled"
  | "standard"
  | "legacy_default_standard"
  | "deployment_invalid"
  | "deployment_conflict"
  | "worker_mode_invalid"
  | "worker_mode_missing_with_restricted_request"
  | "schema_incompatible"
  | "ready_schema_claimants_not_contained"
  | "manual_lab_environment_denied"
  | "manual_lab_runner_unavailable";

export type EffectiveContentWorkerMode =
  | ContentWorkerMode
  | "legacy_default_standard"
  | "invalid";

export interface ContentWorkerStarts {
  readonly scheduledEnrichment: boolean;
  readonly transcriptRecovery: boolean;
  readonly noteIndex: boolean;
  readonly batchSubmit: boolean;
  readonly batchPoll: boolean;
}

export interface ContentWorkerPlan {
  readonly effectiveMode: EffectiveContentWorkerMode;
  readonly code: ContentWorkerPlanCode;
  readonly starts: ContentWorkerStarts;
}

type WorkerEnvironment = Readonly<Record<string, string | undefined>>;

export interface ResolveContentWorkerPlanInput {
  readonly deployment: Pick<
    DeploymentClassification,
    "configurationState" | "effectiveDeployment"
  >;
  readonly schemaCapability: SchemaCapabilityState;
  readonly environment?: WorkerEnvironment;
}

const NO_WORKERS: ContentWorkerStarts = Object.freeze({
  scheduledEnrichment: false,
  transcriptRecovery: false,
  noteIndex: false,
  batchSubmit: false,
  batchPoll: false,
});

const STANDARD_WORKERS: ContentWorkerStarts = Object.freeze({
  scheduledEnrichment: true,
  transcriptRecovery: true,
  noteIndex: true,
  batchSubmit: true,
  batchPoll: true,
});

/**
 * This is a reviewed code latch, not configuration. Migration 028 cannot be
 * packaged until every existing claimant and direct maintenance script honors
 * the ready-schema hold/revision contract. A later reviewed change may flip it
 * only together with that evidence.
 */
const READY_SCHEMA_CLAIMANTS_CONTAINED = false;

export function resolveContentWorkerPlan(
  input: ResolveContentWorkerPlanInput,
): ContentWorkerPlan {
  const environment = input.environment ?? process.env;

  if (input.deployment.configurationState === "conflict") {
    return stopped("invalid", "deployment_conflict");
  }
  if (input.deployment.configurationState === "invalid") {
    return stopped("invalid", "deployment_invalid");
  }

  const configuredMode = parseWorkerMode(
    environment.BRAIN_BACKGROUND_WORKERS_MODE,
  );
  if (configuredMode === "invalid") {
    return stopped("invalid", "worker_mode_invalid");
  }
  if (configuredMode === "disabled") {
    return stopped("disabled", "explicit_disabled");
  }

  if (input.schemaCapability.kind === "incompatible") {
    return stopped(
      configuredMode ?? "invalid",
      "schema_incompatible",
    );
  }

  if (configuredMode === "manual-transcript-lab") {
    if (
      input.deployment.configurationState !== "valid" ||
      input.deployment.effectiveDeployment !== "lab"
    ) {
      return stopped(
        "manual-transcript-lab",
        "manual_lab_environment_denied",
      );
    }
    // Stage 1 has no authorization-scoped interactive digest/index runners.
    return stopped(
      "manual-transcript-lab",
      "manual_lab_runner_unavailable",
    );
  }

  if (input.schemaCapability.kind === "ready") {
    if (!READY_SCHEMA_CLAIMANTS_CONTAINED) {
      return stopped(
        configuredMode ?? "invalid",
        "ready_schema_claimants_not_contained",
      );
    }
  }

  if (configuredMode === "standard") {
    return running("standard", "standard");
  }

  if (restrictedCapabilityRequested(environment)) {
    return stopped(
      "invalid",
      "worker_mode_missing_with_restricted_request",
    );
  }

  if (input.schemaCapability.kind !== "absent") {
    return stopped(
      "invalid",
      "ready_schema_claimants_not_contained",
    );
  }

  // Narrow pre-feature-schema compatibility bridge: preserve today's ordinary
  // worker set only while no new restricted capability is requested.
  return running("legacy_default_standard", "legacy_default_standard");
}

function parseWorkerMode(
  raw: string | undefined,
): ContentWorkerMode | "invalid" | null {
  if (raw === undefined || raw === "") return null;
  if ((CONTENT_WORKER_MODES as readonly string[]).includes(raw)) {
    return raw as ContentWorkerMode;
  }
  return "invalid";
}

function restrictedCapabilityRequested(environment: WorkerEnvironment): boolean {
  if (
    configuredAsOn(
      environment.BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE,
      ["disabled"],
    )
  ) {
    return true;
  }

  return [
    environment.BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_UI_ENABLED,
    environment.BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_WRITE_ENABLED,
    environment.BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_EXECUTION_ENABLED,
  ].some((value) => configuredAsOn(value, []));
}

function configuredAsOn(
  raw: string | undefined,
  additionalOffValues: readonly string[],
): boolean {
  if (raw === undefined || raw === "") return false;
  return !["0", "false", ...additionalOffValues].includes(raw);
}

function stopped(
  effectiveMode: EffectiveContentWorkerMode,
  code: ContentWorkerPlanCode,
): ContentWorkerPlan {
  return Object.freeze({ effectiveMode, code, starts: NO_WORKERS });
}

function running(
  effectiveMode: EffectiveContentWorkerMode,
  code: ContentWorkerPlanCode,
): ContentWorkerPlan {
  return Object.freeze({ effectiveMode, code, starts: STANDARD_WORKERS });
}

export type StartedContentWorkerModule =
  | "scheduled_enrichment"
  | "transcript_recovery"
  | "note_index"
  | "batch_submit_poll";

export interface ContentWorkerLoaders {
  readonly scheduledEnrichment: () => Promise<() => void>;
  readonly transcriptRecovery: () => Promise<() => void>;
  readonly noteIndex: () => Promise<() => void>;
  readonly batchSubmitPoll: () => Promise<() => void>;
}

const DEFAULT_LOADERS: ContentWorkerLoaders = {
  scheduledEnrichment: async () => {
    const workerModule = await import("@/lib/queue/enrichment-worker");
    return workerModule.startEnrichmentWorker;
  },
  transcriptRecovery: async () => {
    const workerModule = await import("@/lib/queue/transcript-worker");
    return workerModule.startTranscriptRecoveryWorker;
  },
  noteIndex: async () => {
    const workerModule = await import("@/lib/queue/note-index-worker");
    return workerModule.startNoteIndexWorker;
  },
  batchSubmitPoll: async () => {
    const workerModule = await import("@/lib/queue/enrichment-batch-cron");
    return workerModule.startEnrichmentBatchCron;
  },
};

/** Dynamically import and start only modules permitted by the frozen plan. */
export async function startContentWorkers(
  plan: ContentWorkerPlan,
  loaders: ContentWorkerLoaders = DEFAULT_LOADERS,
): Promise<readonly StartedContentWorkerModule[]> {
  const requested: Array<{
    name: StartedContentWorkerModule;
    load: () => Promise<() => void>;
  }> = [];

  if (plan.starts.scheduledEnrichment) {
    requested.push({
      name: "scheduled_enrichment",
      load: loaders.scheduledEnrichment,
    });
  }
  if (plan.starts.transcriptRecovery) {
    requested.push({
      name: "transcript_recovery",
      load: loaders.transcriptRecovery,
    });
  }
  if (plan.starts.noteIndex) {
    requested.push({ name: "note_index", load: loaders.noteIndex });
  }
  if (plan.starts.batchSubmit || plan.starts.batchPoll) {
    if (plan.starts.batchSubmit !== plan.starts.batchPoll) {
      throw new Error("invalid_content_worker_plan");
    }
    requested.push({
      name: "batch_submit_poll",
      load: loaders.batchSubmitPoll,
    });
  }

  const starters = await Promise.all(requested.map((entry) => entry.load()));
  for (const start of starters) start();
  return Object.freeze(requested.map((entry) => entry.name));
}
