import {
  isSupportedSourceLimit,
  type ConnectorCredential,
  type DeliveryJournalEntry,
  type LocalBinding,
  type LocalSourceReference,
  type WorkerStatus,
} from "./types";

export const CONNECTOR_CREDENTIAL_KEY = "notebooklm_connector_credential_v1";
export const BINDING_KEY = "notebooklm_binding_v1";
export const JOURNAL_KEY = "notebooklm_delivery_journal_v1";
export const SOURCE_REFERENCES_KEY = "notebooklm_source_references_v1";
export const WORKER_STATUS_KEY = "notebooklm_worker_status_v1";

export type StorageArea = {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
};

export class ConnectorStore {
  constructor(private readonly area: StorageArea) {}

  async getCredential(): Promise<ConnectorCredential | null> {
    const value = (await this.area.get(CONNECTOR_CREDENTIAL_KEY))[CONNECTOR_CREDENTIAL_KEY];
    return isCredential(value) ? value : null;
  }

  async setCredential(value: ConnectorCredential): Promise<void> {
    await this.area.set({ [CONNECTOR_CREDENTIAL_KEY]: value });
  }

  async getBinding(): Promise<LocalBinding | null> {
    const value = (await this.area.get(BINDING_KEY))[BINDING_KEY];
    return isBinding(value) ? { ...value, authUser: value.authUser ?? null } : null;
  }

  async setBinding(value: LocalBinding): Promise<void> {
    await this.area.set({ [BINDING_KEY]: value });
  }

  async getJournal(requestId: string): Promise<DeliveryJournalEntry | null> {
    const entries = await this.readMap<DeliveryJournalEntry>(JOURNAL_KEY);
    const value = entries[requestId];
    return value && isJournalEntry(value) ? value : null;
  }

  async markPossiblyDelivered(input: {
    requestId: string;
    targetFingerprint: string;
    marker: string;
    now?: number;
  }): Promise<DeliveryJournalEntry> {
    const entries = await this.readMap<DeliveryJournalEntry>(JOURNAL_KEY);
    const existing = entries[input.requestId];
    if (existing && isJournalEntry(existing)) return existing;
    const now = input.now ?? Date.now();
    const entry: DeliveryJournalEntry = {
      requestId: input.requestId,
      targetFingerprint: input.targetFingerprint,
      marker: input.marker,
      phase: "possibly_delivered",
      createdAt: now,
      updatedAt: now,
    };
    entries[input.requestId] = entry;
    // Unresolved possibly-delivered entries are never age- or count-pruned.
    // Dropping one could allow a future stale create claim to be dispatched
    // again. Positive/terminal reconciliation clears entries explicitly.
    await this.area.set({ [JOURNAL_KEY]: entries });
    return entry;
  }

  async markAccepted(input: {
    requestId: string;
    sourceId: string;
    sourceAlias: string;
    providerStatus: "processing" | "ready";
    now?: number;
  }): Promise<DeliveryJournalEntry> {
    const entries = await this.readMap<DeliveryJournalEntry>(JOURNAL_KEY);
    const existing = entries[input.requestId];
    if (!existing || !isJournalEntry(existing)) throw new Error("delivery_journal_missing");
    const entry: DeliveryJournalEntry = {
      ...existing,
      phase: "accepted",
      sourceId: input.sourceId,
      sourceAlias: input.sourceAlias,
      providerStatus: input.providerStatus,
      updatedAt: input.now ?? Date.now(),
    };
    entries[input.requestId] = entry;
    await this.area.set({ [JOURNAL_KEY]: entries });
    return entry;
  }

  async clearJournal(requestId: string): Promise<void> {
    const entries = await this.readMap<DeliveryJournalEntry>(JOURNAL_KEY);
    if (!(requestId in entries)) return;
    delete entries[requestId];
    await this.area.set({ [JOURNAL_KEY]: entries });
  }

  async rememberSource(alias: string, value: LocalSourceReference): Promise<void> {
    const entries = await this.readMap<LocalSourceReference>(SOURCE_REFERENCES_KEY);
    entries[alias] = value;
    await this.area.set({ [SOURCE_REFERENCES_KEY]: pruneByUpdatedAt(entries, 500) });
  }

  async getSource(alias: string): Promise<LocalSourceReference | null> {
    const entries = await this.readMap<LocalSourceReference>(SOURCE_REFERENCES_KEY);
    const value = entries[alias];
    return value && isSourceReference(value) ? value : null;
  }

  async setWorkerStatus(value: WorkerStatus): Promise<void> {
    await this.area.set({ [WORKER_STATUS_KEY]: value });
  }

  async getWorkerStatus(): Promise<WorkerStatus | null> {
    const value = (await this.area.get(WORKER_STATUS_KEY))[WORKER_STATUS_KEY];
    return isRecord(value) &&
      ["idle", "working", "attention", "error"].includes(String(value.state)) &&
      typeof value.detail === "string" &&
      typeof value.updatedAt === "number"
      ? (value as WorkerStatus)
      : null;
  }

  async clearConnectorData(): Promise<void> {
    await this.area.remove([
      CONNECTOR_CREDENTIAL_KEY,
      BINDING_KEY,
      JOURNAL_KEY,
      SOURCE_REFERENCES_KEY,
      WORKER_STATUS_KEY,
    ]);
  }

  private async readMap<T>(key: string): Promise<Record<string, T>> {
    const value = (await this.area.get(key))[key];
    return isRecord(value) ? (value as Record<string, T>) : {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCredential(value: unknown): value is ConnectorCredential {
  return (
    isRecord(value) &&
    typeof value.connectorId === "string" &&
    /^[a-f0-9]{24}$/.test(value.connectorId) &&
    /^[a-f0-9]{64}$/.test(String(value.token)) &&
    value.protocolVersion === 1 &&
    typeof value.pairedAt === "number"
  );
}

function isBinding(value: unknown): value is LocalBinding {
  return (
    isRecord(value) &&
    typeof value.connectorId === "string" &&
    /^[a-f0-9]{24}$/.test(value.connectorId) &&
    Number.isInteger(value.bindingVersion) &&
    typeof value.notebookId === "string" &&
    (value.authUser === undefined ||
      value.authUser === null ||
      (Number.isInteger(value.authUser) && Number(value.authUser) >= 0 && Number(value.authUser) <= 10)) &&
    typeof value.targetUrl === "string" &&
    /^[a-f0-9]{64}$/.test(String(value.localBindingFingerprint)) &&
    /^[a-f0-9]{64}$/.test(String(value.subjectFingerprint)) &&
    typeof value.safeLabel === "string" &&
    isSupportedSourceLimit(value.sourceLimit) &&
    value.reserveCount === 5 &&
    typeof value.verifiedAt === "number"
  );
}

function isJournalEntry(value: unknown): value is DeliveryJournalEntry {
  return (
    isRecord(value) &&
    typeof value.requestId === "string" &&
    typeof value.targetFingerprint === "string" &&
    typeof value.marker === "string" &&
    (value.phase === "possibly_delivered" || value.phase === "accepted") &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number"
  );
}

function isSourceReference(value: unknown): value is LocalSourceReference {
  return (
    isRecord(value) &&
    typeof value.sourceId === "string" &&
    typeof value.targetFingerprint === "string" &&
    typeof value.marker === "string" &&
    typeof value.updatedAt === "number"
  );
}

function pruneByUpdatedAt<T extends { updatedAt: number }>(
  entries: Record<string, T>,
  maxEntries: number,
): Record<string, T> {
  const ordered = Object.entries(entries).sort(([, a], [, b]) => b.updatedAt - a.updatedAt);
  return Object.fromEntries(ordered.slice(0, maxEntries));
}
