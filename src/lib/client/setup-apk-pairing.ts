import type { ResolveVerdict } from "./reachability-decision";

export type SetupApkCompletionResult =
  | { kind: "paired"; base: string }
  | { kind: "paired-unreachable"; message: string; token: string };

export type SetupApkCompletionOptions = {
  token: string;
  writeToken: (token: string) => Promise<void>;
  resolveBaseUrl: (opts: { token: string }) => Promise<ResolveVerdict>;
};

export function readExchangeToken(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const token = (body as { token?: unknown }).token;
  return typeof token === "string" && token.trim().length > 0 ? token : null;
}

export async function completeSetupApkPairing({
  token,
  writeToken,
  resolveBaseUrl,
}: SetupApkCompletionOptions): Promise<SetupApkCompletionResult> {
  await writeToken(token);

  const resolution = await resolveBaseUrl({ token });
  if (resolution.ok) return { kind: "paired", base: resolution.base };

  return {
    kind: "paired-unreachable",
    message: resolution.reason,
    token,
  };
}
