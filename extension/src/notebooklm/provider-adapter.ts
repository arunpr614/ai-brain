import {
  safeNotebookLabel,
  subjectFingerprint,
  validOpaqueIdentifier,
} from "./target";
import { payloadFitsV1 } from "./policy";
import type { ProviderSource, SourceStatus, TargetInspection } from "./types";

export const NOTEBOOKLM_PY_WIRE_REVISION = "45fd4258e608fbb9685496f26cfcea48810c44ee";
export const NOTEBOOKLM_APP_ORIGIN = "https://notebooklm.google.com";

const BATCHEXECUTE_URL = `${NOTEBOOKLM_APP_ORIGIN}/_/LabsTailwindUi/data/batchexecute`;
const RPC = {
  addSource: "izAoDd",
  getNotebook: "rLM1Ne",
  getShareStatus: "JFMDGd",
} as const;
const MAX_RESPONSE_CHARS = 5_000_000;
const DEFAULT_TIMEOUT_MS = 30_000;

export type ProviderFailureKind =
  | "authentication"
  | "network"
  | "timeout"
  | "rate_limited"
  | "server"
  | "protocol"
  | "wrong_target"
  | "shared"
  | "public"
  | "unavailable";

export class NotebookLmProviderError extends Error {
  override readonly name = "NotebookLmProviderError";

  constructor(
    readonly kind: ProviderFailureKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export type ProviderSession = Readonly<{
  csrfToken: string;
  sessionId: string;
  authUser: number | null;
}>;

export type InspectionWithSession = {
  inspection: TargetInspection;
  session: ProviderSession;
};

export class NotebookLmProviderAdapter {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  async inspectTarget(notebookId: string, authUser: number | null = null): Promise<InspectionWithSession> {
    if (!validOpaqueIdentifier(notebookId)) {
      throw new NotebookLmProviderError("protocol", "The NotebookLM target identifier is invalid.");
    }
    assertAuthUser(authUser);
    const session = await this.bootstrap(authUser);
    const sourcePath = `/notebook/${encodeURIComponent(notebookId)}`;
    const [notebookResult, sharingResult] = await Promise.all([
      this.callRpc(
        session,
        RPC.getNotebook,
        [notebookId, null, templateBlock(), null, 0],
        sourcePath,
      ),
      this.callRpc(session, RPC.getShareStatus, [notebookId, [2]], sourcePath),
    ]);
    const notebook = parseNotebook(notebookResult, notebookId);
    const ownerIdentity = parsePrivateSharing(sharingResult);
    return {
      session,
      inspection: {
        notebookId,
        safeLabel: safeNotebookLabel(notebook.title),
        subjectFingerprint: await subjectFingerprint(ownerIdentity, notebookId),
        sharingPosture: "private",
        sourceCount: notebook.sourceCount,
        sources: notebook.sources,
      },
    };
  }

  /**
   * Performs exactly one non-idempotent ADD_SOURCE request. The caller must
   * durably mark the request possibly-delivered before invoking this method.
   */
  async addCopiedText(
    session: ProviderSession,
    input: { notebookId: string; title: string; text: string },
  ): Promise<ProviderSource> {
    if (
      !validOpaqueIdentifier(input.notebookId) ||
      !input.title.trim() ||
      input.title.length > 180 ||
      !payloadFitsV1(input.text)
    ) {
      throw new NotebookLmProviderError("protocol", "The copied-text payload is outside the connector limits.");
    }
    const params = [
      [[null, [input.title, input.text], null, 2, null, null, null, null, null, null, 1]],
      input.notebookId,
      templateBlock(),
    ];
    const result = await this.callRpc(
      session,
      RPC.addSource,
      params,
      `/notebook/${encodeURIComponent(input.notebookId)}`,
    );
    return parseAddedSource(result);
  }

  private async bootstrap(authUser: number | null): Promise<ProviderSession> {
    const url = new URL(`${NOTEBOOKLM_APP_ORIGIN}/`);
    applyAuthUser(url, authUser);
    const response = await this.fetchOnce(url.toString(), {
      method: "GET",
      headers: { accept: "text/html,application/xhtml+xml" },
    });
    assertNotebookLmResponseOrigin(response);
    if (!response.ok) throw mapHttpFailure(response.status);
    const html = await boundedText(response);
    const csrfToken = extractWizField(html, "SNlM0e");
    const sessionId = extractWizField(html, "FdrFJe");
    if (!csrfToken || !sessionId || csrfToken.length > 2_048 || sessionId.length > 2_048) {
      throw new NotebookLmProviderError(
        "authentication",
        "NotebookLM is not signed in for this browser profile.",
      );
    }
    return { csrfToken, sessionId, authUser };
  }

  private async callRpc(
    session: ProviderSession,
    rpcId: string,
    params: unknown[],
    sourcePath: string,
  ): Promise<unknown> {
    const url = new URL(BATCHEXECUTE_URL);
    url.searchParams.set("rpcids", rpcId);
    url.searchParams.set("source-path", sourcePath);
    url.searchParams.set("f.sid", session.sessionId);
    url.searchParams.set("hl", "en");
    url.searchParams.set("rt", "c");
    applyAuthUser(url, session.authUser);
    const request = encodeRpcRequest(rpcId, params);
    const response = await this.fetchOnce(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: `f.req=${percentEncode(JSON.stringify(request))}&at=${percentEncode(session.csrfToken)}&`,
    });
    assertNotebookLmResponseOrigin(response);
    if (!response.ok) throw mapHttpFailure(response.status);
    return decodeRpcResponse(await boundedText(response), rpcId);
  }

  private async fetchOnce(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(url, {
        ...init,
        cache: "no-store",
        credentials: "include",
        // Never let fetch replay the non-idempotent ADD_SOURCE POST across a
        // 307/308. A redirect is protocol drift and must fail this one call.
        redirect: "error",
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        throw new NotebookLmProviderError("timeout", "NotebookLM did not respond before the request deadline.");
      }
      throw new NotebookLmProviderError(
        "network",
        error instanceof Error ? error.message : "NotebookLM could not be reached.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function templateBlock(): unknown[] {
  return [2, null, null, [1, null, null, null, null, null, null, null, null, null, [1]]];
}

function assertAuthUser(authUser: number | null): void {
  if (authUser !== null && (!Number.isInteger(authUser) || authUser < 0 || authUser > 10)) {
    throw new NotebookLmProviderError("protocol", "The Google account route is invalid.");
  }
}

function applyAuthUser(url: URL, authUser: number | null): void {
  assertAuthUser(authUser);
  if (authUser !== null) url.searchParams.set("authuser", String(authUser));
}

function encodeRpcRequest(rpcId: string, params: unknown[]): unknown[] {
  return [[[rpcId, JSON.stringify(params), null, "generic"]]];
}

function extractWizField(html: string, key: "SNlM0e" | "FdrFJe"): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const canonical = new RegExp(`"${escaped}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"`).exec(html);
  if (canonical) {
    try {
      return JSON.parse(`"${canonical[1] ?? ""}"`) as string;
    } catch {
      throw new NotebookLmProviderError("protocol", "NotebookLM bootstrap tokens changed format.");
    }
  }
  const single = new RegExp(`'${escaped}'\\s*:\\s*'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'`).exec(html);
  if (single) return (single[1] ?? "").replace(/\\'/g, "'").replace(/\\\\/g, "\\");
  const encoded = new RegExp(`&quot;${escaped}&quot;\\s*:\\s*&quot;((?:(?!&quot;).)*)&quot;`).exec(html);
  if (encoded) return decodeHtmlEntities(encoded[1] ?? "");
  return null;
}

function decodeRpcResponse(raw: string, rpcId: string): unknown {
  const chunks = parseChunkedResponse(stripAntiXssi(raw));
  const frames: unknown[][] = [];
  for (const chunk of chunks) collectFrames(chunk, frames);
  const foundIds = new Set<string>();
  let resultSeen = false;
  let lastResult: unknown = null;
  for (const frame of frames) {
    const tag = frame[0];
    const foundId = frame[1];
    if (typeof foundId === "string") foundIds.add(foundId);
    if (foundId !== rpcId) continue;
    if (tag === "er") throw mapRpcFailure(frame[2]);
    if (tag !== "wrb.fr") continue;
    resultSeen = true;
    const rawResult = frame[2];
    if (rawResult === null) {
      if (lastResult === null) lastResult = null;
      continue;
    }
    if (typeof rawResult === "string") {
      try {
        lastResult = JSON.parse(rawResult) as unknown;
      } catch {
        throw new NotebookLmProviderError("protocol", "NotebookLM returned an invalid RPC payload.");
      }
    } else {
      lastResult = rawResult;
    }
  }
  if (!resultSeen || foundIds.size !== 1 || !foundIds.has(rpcId)) {
    throw new NotebookLmProviderError("protocol", "NotebookLM RPC identifiers changed.");
  }
  if (lastResult === null) {
    throw new NotebookLmProviderError("protocol", "NotebookLM returned an empty RPC result.");
  }
  return lastResult;
}

function parseChunkedResponse(raw: string): unknown[] {
  const trimmed = raw.trim();
  if (!trimmed) throw new NotebookLmProviderError("protocol", "NotebookLM returned an empty response.");
  const lines = trimmed.split(/\r?\n/);
  const chunks: unknown[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (!line) continue;
    let payload = line;
    if (/^\d+$/.test(line)) {
      index += 1;
      payload = lines[index] ?? "";
      if (!payload) throw new NotebookLmProviderError("protocol", "NotebookLM response framing changed.");
    }
    try {
      chunks.push(JSON.parse(payload) as unknown);
    } catch {
      throw new NotebookLmProviderError("protocol", "NotebookLM response framing changed.");
    }
  }
  return chunks;
}

function collectFrames(value: unknown, frames: unknown[][]): void {
  if (!Array.isArray(value)) return;
  if ((value[0] === "wrb.fr" || value[0] === "er") && typeof value[1] === "string") {
    frames.push(value);
    return;
  }
  for (const child of value) collectFrames(child, frames);
}

function parseNotebook(
  result: unknown,
  expectedNotebookId: string,
): { title: string; sourceCount: number; sources: ProviderSource[] } {
  if (!Array.isArray(result) || !Array.isArray(result[0])) {
    throw new NotebookLmProviderError("protocol", "NotebookLM notebook metadata changed shape.");
  }
  const notebook = result[0];
  if (typeof notebook[0] !== "string" || typeof notebook[2] !== "string") {
    throw new NotebookLmProviderError("protocol", "NotebookLM notebook identity is missing.");
  }
  if (notebook[2].toLowerCase() !== expectedNotebookId.toLowerCase()) {
    throw new NotebookLmProviderError("wrong_target", "NotebookLM returned a different notebook.");
  }
  if (!Array.isArray(notebook[5]) || notebook[5][1] !== false) {
    throw new NotebookLmProviderError("wrong_target", "NotebookLM did not confirm notebook ownership.");
  }
  if (notebook[1] !== null && !Array.isArray(notebook[1])) {
    throw new NotebookLmProviderError("protocol", "NotebookLM source metadata changed shape.");
  }
  const rows = notebook[1] === null ? [] : notebook[1];
  const sources = new Map<string, ProviderSource>();
  for (const row of rows) {
    const source = parseSourceEntry(row);
    if (!sources.has(source.id)) sources.set(source.id, source);
  }
  return { title: notebook[0], sourceCount: rows.length, sources: [...sources.values()] };
}

function parsePrivateSharing(result: unknown): string {
  if (!Array.isArray(result) || result.length < 2 || !Array.isArray(result[0])) {
    throw new NotebookLmProviderError("protocol", "NotebookLM sharing metadata changed shape.");
  }
  const publicSlot = result[1];
  if (Array.isArray(publicSlot) && publicSlot.length > 0 && Boolean(publicSlot[0])) {
    throw new NotebookLmProviderError("public", "The target notebook is publicly shared.");
  }
  if (publicSlot !== null && (!Array.isArray(publicSlot) || publicSlot.some((value) => Boolean(value)))) {
    throw new NotebookLmProviderError("protocol", "NotebookLM sharing visibility is unknown.");
  }
  const users: Array<{ identity: string; permission: number }> = [];
  for (const entry of result[0]) {
    if (
      !Array.isArray(entry) ||
      typeof entry[0] !== "string" ||
      ![1, 2, 3].includes(Number(entry[1]))
    ) {
      throw new NotebookLmProviderError("protocol", "NotebookLM sharing principals changed shape.");
    }
    users.push({ identity: entry[0], permission: Number(entry[1]) });
  }
  const owners = users.filter((user) => user.permission === 1);
  if (owners.length !== 1) {
    throw new NotebookLmProviderError("protocol", "Notebook ownership could not be verified.");
  }
  if (users.length !== 1) {
    throw new NotebookLmProviderError("shared", "The target notebook is shared with other people.");
  }
  return owners[0]!.identity;
}

function parseAddedSource(result: unknown): ProviderSource {
  if (!Array.isArray(result) || result.length === 0) {
    throw new NotebookLmProviderError("protocol", "NotebookLM did not return the added source.");
  }
  let entry: unknown = result;
  const outer = result[0];
  if (Array.isArray(outer)) {
    const inner = outer[0];
    if (Array.isArray(inner) && Array.isArray(inner[0])) entry = inner;
    else if (Array.isArray(inner)) entry = outer;
  }
  return parseSourceEntry(entry);
}

function parseSourceEntry(value: unknown): ProviderSource {
  if (!Array.isArray(value) || value.length === 0) {
    throw new NotebookLmProviderError("protocol", "NotebookLM returned an invalid source row.");
  }
  const rawId = value[0];
  let id: unknown = rawId;
  if (Array.isArray(rawId)) {
    if (typeof rawId[0] === "string") id = rawId[0];
    else if (Array.isArray(rawId[2]) && typeof rawId[2][0] === "string") id = rawId[2][0];
  }
  if (!validOpaqueIdentifier(id)) {
    throw new NotebookLmProviderError("protocol", "NotebookLM source identity changed shape.");
  }
  const title = value[1] === undefined || value[1] === null ? null : value[1];
  if (title !== null && typeof title !== "string") {
    throw new NotebookLmProviderError("protocol", "NotebookLM source title changed shape.");
  }
  return { id: id.toLowerCase(), title, status: parseSourceStatus(value[3]) };
}

function parseSourceStatus(block: unknown): SourceStatus {
  if (block === undefined || block === null) {
    throw new NotebookLmProviderError("protocol", "NotebookLM source status is missing.");
  }
  if (!Array.isArray(block) || !Number.isInteger(block[1])) {
    throw new NotebookLmProviderError("protocol", "NotebookLM source status changed shape.");
  }
  switch (Number(block[1])) {
    case 1:
    case 5:
      return "processing";
    case 2:
      return "ready";
    case 3:
      return "failed";
    default:
      throw new NotebookLmProviderError("protocol", "NotebookLM returned an unknown source status.");
  }
}

function assertNotebookLmResponseOrigin(response: Response): void {
  if (!response.url) return;
  let origin: string;
  try {
    origin = new URL(response.url).origin;
  } catch {
    throw new NotebookLmProviderError("protocol", "NotebookLM returned an invalid response URL.");
  }
  if (origin !== NOTEBOOKLM_APP_ORIGIN) {
    throw new NotebookLmProviderError("authentication", "NotebookLM redirected to a sign-in or access page.");
  }
}

function mapHttpFailure(status: number): NotebookLmProviderError {
  if (status === 400 || status === 401 || status === 403) {
    return new NotebookLmProviderError("authentication", "NotebookLM authentication is required.", status);
  }
  if (status === 404) return new NotebookLmProviderError("unavailable", "The notebook is unavailable.", 404);
  if (status === 429) return new NotebookLmProviderError("rate_limited", "NotebookLM is rate limiting requests.", 429);
  if (status >= 500) return new NotebookLmProviderError("server", "NotebookLM returned a server error.", status);
  return new NotebookLmProviderError("protocol", "NotebookLM rejected the RPC request.", status);
}

function mapRpcFailure(code: unknown): NotebookLmProviderError {
  if (code === 400 || code === 401 || code === 403 || code === 16) {
    return new NotebookLmProviderError("authentication", "NotebookLM authentication is required.");
  }
  if (code === 429 || code === 8) {
    return new NotebookLmProviderError("rate_limited", "NotebookLM is rate limiting requests.");
  }
  if (code === 500 || code === 13 || code === 14) {
    return new NotebookLmProviderError("server", "NotebookLM returned an RPC server error.");
  }
  return new NotebookLmProviderError("protocol", "NotebookLM returned an RPC error.");
}

async function boundedText(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_CHARS) {
    throw new NotebookLmProviderError("protocol", "NotebookLM response exceeded the connector limit.");
  }
  const body = await response.text();
  if (body.length > MAX_RESPONSE_CHARS) {
    throw new NotebookLmProviderError("protocol", "NotebookLM response exceeded the connector limit.");
  }
  return body;
}

function stripAntiXssi(value: string): string {
  return value.replace(/^\)\]\}'\r?\n/, "");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export const providerAdapterTestHooks = {
  RPC,
  templateBlock,
  encodeRpcRequest,
  percentEncode,
  extractWizField,
  decodeRpcResponse,
  parseNotebook,
  parsePrivateSharing,
  parseAddedSource,
  parseSourceEntry,
};
