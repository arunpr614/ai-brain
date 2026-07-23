import { BrainConnectorClient, BrainConnectorError } from "./brain-client";
import { NotebookLmProviderAdapter, NotebookLmProviderError } from "./provider-adapter";
import { ConnectorStore } from "./storage";
import {
  assertMarker,
  providerTitle,
  sourceAlias,
  sourceUrlHash,
  titleHasMarker,
} from "./target";
import type {
  ConnectorCredential,
  ConnectorEvent,
  LocalBinding,
  NotebookLmClaim,
  ProviderSource,
  TargetInspection,
  WorkerStatus,
} from "./types";

export type ConnectorRunResult =
  | "busy"
  | "not_configured"
  | "permission_required"
  | "idle"
  | "handled"
  | "attention"
  | "error";

export class NotebookLmConnectorWorker {
  private running = false;

  constructor(
    private readonly store: ConnectorStore,
    private readonly brain: BrainConnectorClient,
    private readonly provider: NotebookLmProviderAdapter,
    private readonly hasProviderPermission: () => Promise<boolean>,
    private readonly now: () => number = Date.now,
  ) {}

  async runOnce(): Promise<ConnectorRunResult> {
    if (this.running) return "busy";
    this.running = true;
    try {
      const credential = await this.store.getCredential();
      const binding = await this.store.getBinding();
      if (!credential || !binding) {
        await this.status("idle", "NotebookLM connector setup is incomplete.");
        return "not_configured";
      }
      if (binding.connectorId !== credential.connectorId) {
        await this.status("attention", "The new Brain pairing needs a fresh notebook binding.");
        return "not_configured";
      }
      if (!(await this.hasProviderPermission())) {
        await this.status("attention", "NotebookLM site access must be granted in extension Options.");
        return "permission_required";
      }
      await this.status("working", "Checking Brain for an approved export request.");
      const claim = await this.brain.claim(credential);
      if (!claim) {
        await this.status("idle", "Connector is ready; no export is waiting.");
        return "idle";
      }
      // claim.expiresAt is the request/snapshot retention timestamp, not the
      // connector lease deadline. Brain fences every event with the opaque
      // lease token and epoch; rejecting long-running reconcile/poll work on
      // the retention timestamp would strand it after seven days.
      if (!claimMatchesBinding(claim, binding)) {
        await this.brain.sendEvent(credential, claim, { type: "target_attention", reason: "wrong_target" });
        await this.status("attention", "The local NotebookLM binding no longer matches Brain.", claim.requestId);
        return "attention";
      }
      assertMarker(claim.source.marker);
      switch (claim.action) {
        case "create":
          await this.handleCreate(credential, binding, claim);
          break;
        case "reconcile":
          await this.handleReconcile(credential, binding, claim);
          break;
        case "poll":
          await this.handlePoll(credential, binding, claim);
          break;
      }
      return "handled";
    } catch (error) {
      await this.recordTopLevelFailure(error);
      return error instanceof BrainConnectorError && error.kind === "unauthorized" ? "attention" : "error";
    } finally {
      this.running = false;
    }
  }

  private async handleCreate(
    credential: ConnectorCredential,
    binding: LocalBinding,
    claim: NotebookLmClaim,
  ): Promise<void> {
    const existingJournal = await this.store.getJournal(claim.requestId);
    if (existingJournal) {
      // Once a dispatch could have reached Google, this request is never
      // written again. The server must move it through read-only reconciliation.
      await this.brain.sendEvent(credential, claim, { type: "create_uncertain", reason: "protocol" });
      await this.status(
        "attention",
        "A prior delivery may have reached NotebookLM; reconciliation is required.",
        claim.requestId,
      );
      return;
    }

    let preflight;
    try {
      preflight = await this.provider.inspectTarget(binding.notebookId, binding.authUser);
      assertInspectionMatchesBinding(preflight.inspection, binding);
    } catch (error) {
      await this.sendReadFailure(credential, claim, "pre_create", error);
      return;
    }
    const { inspection, session } = preflight;
    const sourceLimit = claim.target.sourceLimit;
    if (inspection.sourceCount >= sourceLimit - claim.target.reserveCount) {
      await this.brain.sendEvent(credential, claim, {
        type: "capacity_blocked",
        sourceCount: inspection.sourceCount,
        sourceLimit,
      });
      await this.status("attention", "The target notebook has reached its reserved source capacity.", claim.requestId);
      return;
    }
    await this.brain.sendEvent(credential, claim, {
      type: "preflight_ok",
      sourceCount: inspection.sourceCount,
      sourceLimit,
      sharingPosture: "private",
    });
    // Brain must durably acknowledge sending before any provider mutation.
    await this.brain.sendEvent(credential, claim, { type: "dispatch_started" });
    // The journal write is the final operation before the one and only provider
    // fetch. It contains no source content or Google session material.
    await this.store.markPossiblyDelivered({
      requestId: claim.requestId,
      targetFingerprint: binding.localBindingFingerprint,
      marker: claim.source.marker,
      now: this.now(),
    });

    let accepted: { alias: string; providerStatus: "processing" | "ready" } | null = null;
    try {
      const added =
        claim.source.kind === "url"
          ? await this.provider.addUrl(session, {
              notebookId: binding.notebookId,
              url: claim.source.url ?? "",
            })
          : await this.provider.addCopiedText(session, {
              notebookId: binding.notebookId,
              title: providerTitle(claim.source.title, claim.source.marker),
              text: claim.source.text ?? "",
            });
      if (added.status === "failed" || !(await sourceMatchesClaim(added, claim))) {
        throw new NotebookLmProviderError("protocol", "NotebookLM rejected the source after accepting it.");
      }
      const alias = await sourceAlias(added.id);
      await this.store.rememberSource(alias, {
        sourceId: added.id,
        targetFingerprint: binding.localBindingFingerprint,
        marker: claim.source.marker,
        updatedAt: this.now(),
      });
      await this.store.markAccepted({
        requestId: claim.requestId,
        sourceId: added.id,
        sourceAlias: alias,
        providerStatus: added.status,
        now: this.now(),
      });
      accepted = { alias, providerStatus: added.status };
    } catch (error) {
      const reason = uncertainReason(error);
      // No second provider create is permitted from this path.
      await this.brain.sendEvent(credential, claim, { type: "create_uncertain", reason });
      await this.status(
        "attention",
        error instanceof NotebookLmProviderError && error.kind === "authentication"
          ? "NotebookLM sign-in needs attention; the delivery will only be reconciled."
          : "Delivery may have reached NotebookLM; the connector will reconcile without re-sending.",
        claim.requestId,
      );
      return;
    }
    // Keep the accepted journal until Brain acknowledges this event. If the
    // acknowledgement is lost, the next claim is reconciliation-only.
    await this.brain.sendEvent(credential, claim, {
      type: "create_accepted",
      sourceAlias: accepted.alias,
      providerStatus: accepted.providerStatus,
    });
    await this.store.clearJournal(claim.requestId);
    await this.status("idle", "NotebookLM accepted the approved source.", claim.requestId);
  }

  private async handleReconcile(
    credential: ConnectorCredential,
    binding: LocalBinding,
    claim: NotebookLmClaim,
  ): Promise<void> {
    let inspection: TargetInspection;
    try {
      inspection = (await this.provider.inspectTarget(binding.notebookId, binding.authUser)).inspection;
      assertInspectionMatchesBinding(inspection, binding);
    } catch (error) {
      await this.sendReadFailure(credential, claim, "reconcile", error);
      return;
    }
    const matches = await matchingSources(inspection.sources, claim);
    if (matches.length === 0) {
      await this.brain.sendEvent(credential, claim, { type: "reconcile_result", matches: 0 });
      // A zero-match read is not proof that the write did not land: NotebookLM
      // may be eventually consistent. Keep the no-retry journal while Brain
      // continues issuing read-only reconciliation claims.
      await this.status("attention", "Reconciliation found no matching NotebookLM source.", claim.requestId);
      return;
    }
    if (matches.length > 1) {
      await this.brain.sendEvent(credential, claim, { type: "reconcile_result", matches: 2 });
      await this.store.clearJournal(claim.requestId);
      await this.status("attention", "Reconciliation found multiple matching NotebookLM sources.", claim.requestId);
      return;
    }
    const match = matches[0]!;
    const alias = await sourceAlias(match.id);
    await this.store.rememberSource(alias, {
      sourceId: match.id,
      targetFingerprint: binding.localBindingFingerprint,
      marker: claim.source.marker,
      updatedAt: this.now(),
    });
    const event: ConnectorEvent = {
      type: "reconcile_result",
      matches: 1,
      sourceAlias: alias,
      providerStatus: match.status,
    };
    await this.brain.sendEvent(credential, claim, event);
    await this.store.clearJournal(claim.requestId);
    await this.status(
      match.status === "failed" ? "attention" : "idle",
      match.status === "failed"
        ? "The matching NotebookLM source failed to process."
        : "Reconciliation found one matching NotebookLM source.",
      claim.requestId,
    );
  }

  private async handlePoll(
    credential: ConnectorCredential,
    binding: LocalBinding,
    claim: NotebookLmClaim,
  ): Promise<void> {
    let inspection: TargetInspection;
    try {
      inspection = (await this.provider.inspectTarget(binding.notebookId, binding.authUser)).inspection;
      assertInspectionMatchesBinding(inspection, binding);
    } catch (error) {
      await this.sendReadFailure(credential, claim, "poll", error);
      return;
    }
    const expectedAlias = claim.source.sourceAlias;
    if (!expectedAlias || !/^[a-f0-9]{64}$/.test(expectedAlias)) {
      await this.brain.sendEvent(credential, claim, {
        type: "connector_update_required",
        reason: "protocol_drift",
      });
      return;
    }
    const remembered = await this.store.getSource(expectedAlias);
    let source: ProviderSource | undefined;
    if (remembered?.targetFingerprint === binding.localBindingFingerprint) {
      source = inspection.sources.find((candidate) => candidate.id === remembered.sourceId);
    }
    if (!source) {
      const claimMatches = await matchingSources(inspection.sources, claim);
      if (claimMatches.length === 1 && (await sourceAlias(claimMatches[0]!.id)) === expectedAlias) {
        source = claimMatches[0];
      }
    }
    if (!source) {
      await this.brain.sendEvent(credential, claim, { type: "target_attention", reason: "unavailable" });
      await this.status("attention", "The accepted NotebookLM source is no longer visible.", claim.requestId);
      return;
    }
    await this.brain.sendEvent(credential, claim, {
      type: "source_status",
      providerStatus: source.status,
    });
    await this.status(
      source.status === "failed" ? "attention" : "idle",
      source.status === "ready"
        ? "NotebookLM finished processing the source."
        : source.status === "failed"
          ? "NotebookLM could not process the accepted source."
          : "NotebookLM is still processing the source.",
      claim.requestId,
    );
  }

  private async sendReadFailure(
    credential: ConnectorCredential,
    claim: NotebookLmClaim,
    phase: "pre_create" | "reconcile" | "poll",
    error: unknown,
  ): Promise<void> {
    const event = readFailureEvent(error, phase);
    await this.brain.sendEvent(credential, claim, event);
    await this.status(
      event.type === "retryable_failure" ? "error" : "attention",
      safeReadFailureDetail(error),
      claim.requestId,
    );
  }

  private async recordTopLevelFailure(error: unknown): Promise<void> {
    if (error instanceof BrainConnectorError) {
      const state = error.kind === "unauthorized" || error.kind === "protocol" ? "attention" : "error";
      const detail =
        error.kind === "unauthorized"
          ? "Brain connector authorization needs to be renewed."
          : error.kind === "protocol"
            ? "Brain and the extension disagree on the connector protocol."
            : "Brain could not be reached; no provider action was retried.";
      await this.status(state, detail);
      return;
    }
    await this.status(
      "error",
      error instanceof NotebookLmProviderError && error.kind === "protocol"
        ? "NotebookLM protocol drift was detected; provider writes are blocked."
        : "The connector stopped safely before attempting another provider write.",
    );
  }

  private async status(
    state: WorkerStatus["state"],
    detail: string,
    lastRequestId?: string,
  ): Promise<void> {
    await this.store.setWorkerStatus({
      state,
      detail,
      updatedAt: this.now(),
      ...(lastRequestId ? { lastRequestId } : {}),
    });
  }
}

function claimMatchesBinding(claim: NotebookLmClaim, binding: LocalBinding): boolean {
  return (
    claim.target.bindingVersion === binding.bindingVersion &&
    claim.target.localBindingFingerprint === binding.localBindingFingerprint &&
    claim.target.sourceLimit === binding.sourceLimit &&
    claim.target.reserveCount === binding.reserveCount &&
    claim.target.sharingPolicy === "private_only"
  );
}

function assertInspectionMatchesBinding(inspection: TargetInspection, binding: LocalBinding): void {
  if (
    inspection.notebookId !== binding.notebookId ||
    inspection.subjectFingerprint !== binding.subjectFingerprint ||
    inspection.sharingPosture !== "private"
  ) {
    throw new NotebookLmProviderError("wrong_target", "The NotebookLM target or owner changed.");
  }
}

async function sourceMatchesClaim(
  source: ProviderSource,
  claim: NotebookLmClaim,
): Promise<boolean> {
  if (claim.source.kind === "copied_text") {
    return titleHasMarker(source.title, claim.source.marker);
  }
  if (source.url === null || claim.source.urlHash === null) return false;
  if (claim.source.url !== null && source.url === claim.source.url) return true;
  return (await sourceUrlHash(source.url)) === claim.source.urlHash;
}

async function matchingSources(
  sources: ProviderSource[],
  claim: NotebookLmClaim,
): Promise<ProviderSource[]> {
  const matches = await Promise.all(
    sources.map(async (source) => ({
      source,
      matches: await sourceMatchesClaim(source, claim),
    })),
  );
  return matches.filter((candidate) => candidate.matches).map((candidate) => candidate.source);
}

function readFailureEvent(
  error: unknown,
  phase: "pre_create" | "reconcile" | "poll",
): ConnectorEvent {
  if (!(error instanceof NotebookLmProviderError)) {
    return { type: "retryable_failure", reason: "network" };
  }
  switch (error.kind) {
    case "authentication":
      return { type: "authentication_required", phase };
    case "wrong_target":
      return { type: "target_attention", reason: "wrong_target" };
    case "shared":
      return { type: "target_attention", reason: "shared" };
    case "public":
      return { type: "target_attention", reason: "public" };
    case "unavailable":
      return { type: "target_attention", reason: "unavailable" };
    case "protocol":
      return { type: "connector_update_required", reason: "protocol_drift" };
    case "server":
    case "rate_limited":
      return { type: "retryable_failure", reason: "server" };
    case "network":
    case "timeout":
      return { type: "retryable_failure", reason: "network" };
  }
}

function uncertainReason(error: unknown): "network" | "timeout" | "rate_limited" | "server" | "protocol" {
  if (!(error instanceof NotebookLmProviderError)) return "protocol";
  switch (error.kind) {
    case "network":
      return "network";
    case "timeout":
      return "timeout";
    case "rate_limited":
      return "rate_limited";
    case "server":
      return "server";
    default:
      return "protocol";
  }
}

function safeReadFailureDetail(error: unknown): string {
  if (!(error instanceof NotebookLmProviderError)) return "NotebookLM could not be checked safely.";
  switch (error.kind) {
    case "authentication":
      return "Sign in to NotebookLM in this browser profile, then check again.";
    case "shared":
    case "public":
      return "The connector only delivers to an owner-only private notebook.";
    case "wrong_target":
      return "The configured notebook or owning account changed.";
    case "protocol":
      return "NotebookLM protocol drift was detected; provider writes are blocked.";
    case "unavailable":
      return "The configured notebook is unavailable to this browser profile.";
    default:
      return "NotebookLM could not be checked; no provider write was attempted.";
  }
}

export const workerTestHooks = {
  claimMatchesBinding,
  assertInspectionMatchesBinding,
  readFailureEvent,
  uncertainReason,
  sourceMatchesClaim,
};
