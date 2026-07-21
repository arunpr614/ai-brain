/**
 * Credential-free provider fakes for the NotebookLM synchronization research
 * harness. These classes perform no network I/O and deliberately do not model
 * undocumented Google behavior as fact.
 */

export class FakeProviderError extends Error {
  constructor(category, acceptance = "definitely_not_accepted") {
    super(category);
    this.name = "FakeProviderError";
    this.category = category;
    this.acceptance = acceptance;
  }
}

export function createAsyncBarrier() {
  let markArrived;
  let release;
  const arrived = new Promise((resolve) => {
    markArrived = resolve;
  });
  const released = new Promise((resolve) => {
    release = resolve;
  });
  let didArrive = false;
  let didRelease = false;
  return {
    arrived,
    async wait() {
      if (!didArrive) {
        didArrive = true;
        markArrived();
      }
      await released;
    },
    release() {
      if (!didRelease) {
        didRelease = true;
        release();
      }
    },
  };
}

function clone(value) {
  return structuredClone(value);
}

function nextPlannedOutcome(plans, operationKey) {
  const queue = plans.get(operationKey) ?? [];
  return queue.length > 0 ? queue.shift() : { kind: "complete" };
}

/**
 * The Enterprise fake intentionally does not deduplicate writes. This mirrors
 * the researched risk: no documented provider create-idempotency key exists.
 */
export class FakeEnterpriseProvider {
  constructor({ conclusiveZeroAfterMs = null } = {}) {
    this.path = "enterprise";
    this.conclusiveZeroAfterMs = conclusiveZeroAfterMs;
    this.sources = [];
    this.calls = [];
    this.plans = new Map();
    this.nextSourceNumber = 1;
  }

  setWritePlan(operationKey, outcomes) {
    this.plans.set(
      operationKey,
      outcomes.map((outcome) => (typeof outcome === "string" ? { kind: outcome } : { ...outcome })),
    );
  }

  #accept(intent, { status = "COMPLETE", visibleAt = intent.now } = {}) {
    const source = {
      kind: "enterprise_source",
      sourceId: `fake-source-${this.nextSourceNumber++}`,
      targetAlias: intent.targetAlias,
      marker: intent.marker,
      desiredHash: intent.desiredHash,
      status,
      visibleAt,
      deleted: false,
    };
    this.sources.push(source);
    return clone(source);
  }

  async write(intent) {
    this.calls.push({ method: "write", operationKey: intent.operationKey });
    const outcome = nextPlannedOutcome(this.plans, intent.operationKey);
    switch (outcome.kind) {
      case "definite_transient":
        throw new FakeProviderError(outcome.category ?? "provider_unavailable");
      case "auth_required":
        throw new FakeProviderError("reauth_required");
      case "permanent_failure":
        throw new FakeProviderError(outcome.category ?? "invalid_source");
      case "ambiguous_without_accept":
        throw new FakeProviderError("ambiguous_write", "unknown");
      case "accept_then_timeout": {
        this.#accept(intent, {
          status: outcome.status ?? "COMPLETE",
          visibleAt: intent.now + (outcome.visibleAfterMs ?? 0),
        });
        throw new FakeProviderError("ambiguous_write", "unknown");
      }
      case "accept_then_wait": {
        const source = this.#accept(intent, {
          status: outcome.status ?? "COMPLETE",
          visibleAt: intent.now + (outcome.visibleAfterMs ?? 0),
        });
        await outcome.barrier.wait();
        return source;
      }
      case "pending":
        return this.#accept(intent, { status: "PENDING" });
      case "complete":
      default:
        return this.#accept(intent, { status: outcome.status ?? "COMPLETE" });
    }
  }

  async reconcile({ targetAlias, marker, desiredHash, now }) {
    this.calls.push({ method: "reconcile" });
    return this.sources
      .filter(
        (source) =>
          !source.deleted &&
          source.visibleAt <= now &&
          source.targetAlias === targetAlias &&
          source.marker === marker &&
          source.desiredHash === desiredHash,
      )
      .map(clone);
  }

  async observe({ targetAlias, sourceId }) {
    this.calls.push({ method: "observe" });
    const source = this.sources.find(
      (candidate) =>
        !candidate.deleted &&
        candidate.targetAlias === targetAlias &&
        candidate.sourceId === sourceId,
    );
    return source ? clone(source) : null;
  }

  setStatus(sourceId, status) {
    const source = this.sources.find((candidate) => candidate.sourceId === sourceId && !candidate.deleted);
    if (!source) throw new Error("source_not_found");
    source.status = status;
  }

  seedSource({ targetAlias, marker, desiredHash, status = "COMPLETE", visibleAt = 0 }) {
    return this.#accept(
      { targetAlias, marker, desiredHash, now: visibleAt },
      { status, visibleAt },
    );
  }

  countCalls(method, operationKey = null) {
    return this.calls.filter(
      (call) => call.method === method && (operationKey === null || call.operationKey === operationKey),
    ).length;
  }
}

/**
 * The Drive fake owns one stable file per target. Each accepted write updates
 * that file with a required revision and adds an opaque entry marker. It never
 * creates a NotebookLM source and never claims notebook refresh visibility.
 */
export class FakeDriveProvider {
  constructor() {
    this.path = "drive";
    this.conclusiveZeroAfterMs = 0;
    this.files = new Map();
    this.calls = [];
    this.plans = new Map();
  }

  createStableFile({ targetAlias, fileAlias, revision = 0 }) {
    if (this.files.has(targetAlias)) throw new Error("stable_file_already_exists");
    this.files.set(targetAlias, {
      targetAlias,
      fileAlias,
      revision,
      entries: new Map(),
    });
  }

  setWritePlan(operationKey, outcomes) {
    this.plans.set(
      operationKey,
      outcomes.map((outcome) => (typeof outcome === "string" ? { kind: outcome } : { ...outcome })),
    );
  }

  #update(intent) {
    const file = this.files.get(intent.targetAlias);
    if (!file || file.fileAlias !== intent.fileAlias) {
      throw new FakeProviderError("stable_file_missing");
    }
    if (file.revision !== intent.requiredRevision) {
      throw new FakeProviderError("revision_conflict");
    }
    file.revision += 1;
    file.entries.set(intent.marker, intent.desiredHash);
    return {
      kind: "drive_revision",
      targetAlias: intent.targetAlias,
      fileAlias: file.fileAlias,
      revision: file.revision,
      marker: intent.marker,
      desiredHash: intent.desiredHash,
      status: "DRIVE_UPDATED",
    };
  }

  async write(intent) {
    this.calls.push({ method: "write", operationKey: intent.operationKey });
    const outcome = nextPlannedOutcome(this.plans, intent.operationKey);
    switch (outcome.kind) {
      case "definite_transient":
        throw new FakeProviderError(outcome.category ?? "provider_unavailable");
      case "auth_required":
        throw new FakeProviderError("reauth_required");
      case "permanent_failure":
        throw new FakeProviderError(outcome.category ?? "invalid_document");
      case "ambiguous_without_accept":
        throw new FakeProviderError("ambiguous_write", "unknown");
      case "accept_then_timeout":
        this.#update(intent);
        throw new FakeProviderError("ambiguous_write", "unknown");
      case "accept_then_wait": {
        const receipt = this.#update(intent);
        await outcome.barrier.wait();
        return receipt;
      }
      case "complete":
      default:
        return this.#update(intent);
    }
  }

  async reconcile({ targetAlias, marker, desiredHash }) {
    this.calls.push({ method: "reconcile" });
    const file = this.files.get(targetAlias);
    if (!file || file.entries.get(marker) !== desiredHash) return [];
    return [
      {
        kind: "drive_revision",
        targetAlias,
        fileAlias: file.fileAlias,
        revision: file.revision,
        marker,
        desiredHash,
        status: "DRIVE_UPDATED",
      },
    ];
  }

  async observe({ targetAlias, fileAlias }) {
    this.calls.push({ method: "observe" });
    const file = this.files.get(targetAlias);
    if (!file || file.fileAlias !== fileAlias) return null;
    return {
      kind: "drive_revision",
      targetAlias,
      fileAlias,
      revision: file.revision,
      status: "DRIVE_UPDATED",
    };
  }

  snapshot(targetAlias) {
    const file = this.files.get(targetAlias);
    if (!file) return null;
    return {
      targetAlias,
      fileAlias: file.fileAlias,
      revision: file.revision,
      entries: Object.fromEntries(file.entries),
    };
  }

  countCalls(method, operationKey = null) {
    return this.calls.filter(
      (call) => call.method === method && (operationKey === null || call.operationKey === operationKey),
    ).length;
  }
}
