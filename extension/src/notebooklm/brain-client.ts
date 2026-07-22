import { BRAIN_BASE_URL } from "../capture";
import { payloadFitsV1 } from "./policy";
import { assertFingerprint, assertMarker, titleHasMarker } from "./target";
import {
  CONNECTOR_PROTOCOL_VERSION,
  DEFAULT_SOURCE_LIMIT,
  DEFAULT_SOURCE_RESERVE,
  type ConnectorCredential,
  type ConnectorEvent,
  type NotebookLmClaim,
} from "./types";

const PROTOCOL_HEADER = "x-notebooklm-connector-protocol";
const REQUEST_ID_PATTERN = /^[a-f0-9]{24}$/;
const SOURCE_ALIAS_PATTERN = /^[a-f0-9]{64}$/;
const MAX_PROVIDER_TITLE_CHARS = 180;

export type BrainFailureKind =
  | "network"
  | "unauthorized"
  | "rate_limited"
  | "server"
  | "protocol"
  | "active_work"
  | "stale_binding"
  | "target_not_private"
  | "target_capacity";

export class BrainConnectorError extends Error {
  override readonly name = "BrainConnectorError";

  constructor(
    readonly kind: BrainFailureKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export type BindInput = {
  bindingVersion: number;
  safeLabel: string;
  localBindingFingerprint: string;
  subjectFingerprint: string;
  sharingPosture: "private";
  sourceCount: number;
  sourceLimit: number;
  reserveCount: number;
};

export class BrainConnectorClient {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl = BRAIN_BASE_URL,
  ) {}

  async exchangePairingCode(code: string, label = "Brain Chrome connector"): Promise<ConnectorCredential> {
    const normalized = code.toUpperCase().replace(/[\s-]/g, "");
    if (!/^[A-Z2-9]{8}$/.test(normalized)) {
      throw new BrainConnectorError("protocol", "Pairing codes contain eight letters or digits.");
    }
    const response = await this.request("/api/notebooklm/connectors/exchange", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ code: normalized, label, protocolVersion: CONNECTOR_PROTOCOL_VERSION }),
    });
    const body = await readJsonObject(response);
    const connectorId = body.connectorId;
    const token = body.connectorToken;
    const protocolVersion = body.protocolVersion;
    if (
      body.ok !== true ||
      typeof connectorId !== "string" ||
      !/^[a-f0-9]{24}$/.test(connectorId) ||
      !/^[a-f0-9]{64}$/.test(String(token)) ||
      protocolVersion !== CONNECTOR_PROTOCOL_VERSION
    ) {
      throw new BrainConnectorError("protocol", "Brain returned an incompatible connector credential.");
    }
    return {
      connectorId,
      token: String(token),
      protocolVersion: CONNECTOR_PROTOCOL_VERSION,
      pairedAt: Date.now(),
    };
  }

  async bind(credential: ConnectorCredential, input: BindInput): Promise<{ bindingVersion: number }> {
    validateBindInput(input);
    const response = await this.request("/api/notebooklm/connector/bind", {
      method: "POST",
      headers: this.headers(credential),
      body: JSON.stringify(input),
    }, [409]);
    const body = await readJsonObject(response);
    if (response.status === 409) {
      const kind = bindConflictKind(body.error);
      throw new BrainConnectorError(kind, bindConflictMessage(kind), 409);
    }
    const target = body.target;
    if (
      body.bound !== true ||
      !isRecord(target) ||
      !Number.isInteger(target.bindingVersion) ||
      Number(target.bindingVersion) < Math.max(1, input.bindingVersion)
    ) {
      throw new BrainConnectorError("protocol", "Brain did not confirm the requested binding version.");
    }
    return { bindingVersion: Number(target.bindingVersion) };
  }

  async claim(credential: ConnectorCredential): Promise<NotebookLmClaim | null> {
    const response = await this.request(
      "/api/notebooklm/connector/claim",
      {
        method: "POST",
        headers: this.headers(credential),
        body: "{}",
      },
      [204],
    );
    if (response.status === 204) return null;
    const body = await readJsonObject(response);
    if (!isRecord(body.claim)) {
      throw new BrainConnectorError("protocol", "Brain returned a malformed connector claim envelope.");
    }
    return parseClaim(body.claim);
  }

  async sendEvent(
    credential: ConnectorCredential,
    claim: Pick<NotebookLmClaim, "requestId" | "leaseToken" | "leaseEpoch">,
    event: ConnectorEvent,
  ): Promise<void> {
    if (!REQUEST_ID_PATTERN.test(claim.requestId)) {
      throw new BrainConnectorError("protocol", "Brain supplied an invalid request ID.");
    }
    if (!validLeaseToken(claim.leaseToken) || !Number.isInteger(claim.leaseEpoch) || claim.leaseEpoch < 1) {
      throw new BrainConnectorError("protocol", "Brain supplied an invalid lease.");
    }
    const response = await this.request(`/api/notebooklm/connector/requests/${encodeURIComponent(claim.requestId)}/events`, {
      method: "POST",
      headers: this.headers(credential),
      body: JSON.stringify({ leaseToken: claim.leaseToken, leaseEpoch: claim.leaseEpoch, event }),
    });
    const body = await readJsonObject(response);
    if (
      body.accepted !== true ||
      body.dispatchAuthorized !== (event.type === "dispatch_started")
    ) {
      throw new BrainConnectorError("protocol", "Brain did not durably acknowledge the connector event.");
    }
  }

  private headers(credential?: ConnectorCredential): HeadersInit {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      [PROTOCOL_HEADER]: String(CONNECTOR_PROTOCOL_VERSION),
    };
    if (credential) headers.authorization = `Bearer ${credential.token}`;
    return headers;
  }

  private async request(path: string, init: RequestInit, additionalOkStatuses: number[] = []): Promise<Response> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
      });
    } catch (error) {
      throw new BrainConnectorError(
        "network",
        error instanceof Error ? error.message : "Brain could not be reached.",
      );
    }
    const responseProtocol = response.headers.get(PROTOCOL_HEADER);
    if (responseProtocol !== null && responseProtocol !== String(CONNECTOR_PROTOCOL_VERSION)) {
      throw new BrainConnectorError("protocol", "Brain requires a different connector protocol.", response.status);
    }
    if (response.ok || additionalOkStatuses.includes(response.status)) return response;
    if (response.status === 401 || response.status === 403) {
      throw new BrainConnectorError("unauthorized", "The connector pairing is no longer authorized.", response.status);
    }
    if (response.status === 409 || response.status === 426) {
      throw new BrainConnectorError("protocol", "The connector protocol or lease is no longer valid.", response.status);
    }
    if (response.status === 429) {
      throw new BrainConnectorError("rate_limited", "Brain is temporarily rate limiting this connector.", 429);
    }
    if (response.status >= 500) {
      throw new BrainConnectorError("server", "Brain returned a server error.", response.status);
    }
    throw new BrainConnectorError("protocol", "Brain rejected the connector request.", response.status);
  }
}

export function brainConnectorSetupMessage(error: BrainConnectorError): string {
  switch (error.kind) {
    case "unauthorized":
      return "This connector pairing no longer works. Pair it again from Brain.";
    case "active_work":
      return "Finish or explicitly stop every unresolved export in Brain before changing notebooks.";
    case "stale_binding":
      return "This saved notebook binding is stale. Retire it in Brain, then bind the notebook again.";
    case "target_not_private":
      return "The target must be an owner-only private notebook.";
    case "target_capacity":
      return "This notebook is too close to its source limit to bind safely.";
    case "protocol":
      return "Brain and this extension use incompatible connector protocols.";
    default:
      return "Brain could not complete connector setup. Try again shortly.";
  }
}

function bindConflictKind(value: unknown): BrainFailureKind {
  switch (value) {
    case "target_has_active_work":
      return "active_work";
    case "invalid_binding":
      return "stale_binding";
    case "target_not_private":
      return "target_not_private";
    case "target_capacity_exhausted":
      return "target_capacity";
    default:
      return "protocol";
  }
}

function bindConflictMessage(kind: BrainFailureKind): string {
  switch (kind) {
    case "active_work":
      return "The current target still has unresolved export work.";
    case "stale_binding":
      return "The observed binding version is stale or invalid.";
    case "target_not_private":
      return "The target is not owner-only and private.";
    case "target_capacity":
      return "The target has insufficient reserved source capacity.";
    default:
      return "Brain rejected the binding conflict response.";
  }
}

function parseClaim(body: Record<string, unknown>): NotebookLmClaim {
  const target = body.target;
  const source = body.source;
  if (
    typeof body.requestId !== "string" ||
    !REQUEST_ID_PATTERN.test(body.requestId) ||
    typeof body.leaseToken !== "string" ||
    !validLeaseToken(body.leaseToken) ||
    !Number.isInteger(body.leaseEpoch) ||
    Number(body.leaseEpoch) < 1 ||
    (body.action !== "create" && body.action !== "reconcile" && body.action !== "poll") ||
    !isRecord(target) ||
    !isRecord(source) ||
    !Number.isInteger(target.bindingVersion) ||
    typeof target.localBindingFingerprint !== "string" ||
    target.sharingPolicy !== "private_only" ||
    !Number.isInteger(target.sourceLimit) ||
    !Number.isInteger(target.reserveCount) ||
    typeof source.marker !== "string" ||
    (source.title !== null && typeof source.title !== "string") ||
    (source.text !== null && typeof source.text !== "string") ||
    (source.sourceAlias !== null && typeof source.sourceAlias !== "string") ||
    typeof body.leaseExpiresAt !== "string" ||
    !Number.isFinite(Date.parse(body.leaseExpiresAt)) ||
    typeof body.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(body.expiresAt))
  ) {
    throw new BrainConnectorError("protocol", "Brain returned a malformed connector claim.");
  }
  try {
    assertFingerprint(target.localBindingFingerprint);
    assertMarker(source.marker);
  } catch {
    throw new BrainConnectorError("protocol", "Brain returned malformed connector proof material.");
  }
  if (
    Number(target.bindingVersion) < 1 ||
    Number(target.sourceLimit) !== DEFAULT_SOURCE_LIMIT ||
    Number(target.reserveCount) !== DEFAULT_SOURCE_RESERVE
  ) {
    throw new BrainConnectorError("protocol", "Brain returned invalid target capacity settings.");
  }
  if (body.action === "create") {
    if (
      source.title === null ||
      !source.title.trim() ||
      source.title.length > MAX_PROVIDER_TITLE_CHARS ||
      !titleHasMarker(source.title, source.marker) ||
      source.text === null ||
      !payloadFitsV1(source.text) ||
      source.sourceAlias !== null
    ) {
      throw new BrainConnectorError("protocol", "Brain returned an invalid create claim.");
    }
  } else if (source.title !== null || source.text !== null) {
    throw new BrainConnectorError("protocol", "Brain exposed source content outside a create claim.");
  }
  if (body.action === "poll") {
    if (source.sourceAlias === null || !SOURCE_ALIAS_PATTERN.test(source.sourceAlias)) {
      throw new BrainConnectorError("protocol", "Brain returned an incomplete poll claim.");
    }
  } else if (source.sourceAlias !== null) {
    throw new BrainConnectorError("protocol", "Brain returned a source alias in the wrong phase.");
  }
  return body as unknown as NotebookLmClaim;
}

function validateBindInput(input: BindInput): void {
  assertFingerprint(input.localBindingFingerprint);
  assertFingerprint(input.subjectFingerprint);
  if (
    !Number.isInteger(input.bindingVersion) ||
    input.bindingVersion < 0 ||
    !input.safeLabel.trim() ||
    input.safeLabel.length > 48 ||
    !Number.isInteger(input.sourceCount) ||
    input.sourceCount < 0 ||
    input.sourceCount > 1_000 ||
    !Number.isInteger(input.sourceLimit) ||
    input.sourceLimit !== DEFAULT_SOURCE_LIMIT ||
    !Number.isInteger(input.reserveCount) ||
    input.reserveCount !== DEFAULT_SOURCE_RESERVE
  ) {
    throw new BrainConnectorError("protocol", "The local binding is invalid.");
  }
}

function validLeaseToken(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonObject(response: Response): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new BrainConnectorError("protocol", "Brain returned invalid JSON.", response.status);
  }
  if (!isRecord(value)) throw new BrainConnectorError("protocol", "Brain returned an invalid response.", response.status);
  return value;
}

export const brainContractTestHooks = { parseClaim };
