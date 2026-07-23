import type { ConnectorCredential } from "./types";

export class PairingAttemptGate {
  private active = false;

  async run(action: () => Promise<void>): Promise<boolean> {
    if (this.active) return false;
    this.active = true;
    try {
      await action();
      return true;
    } finally {
      this.active = false;
    }
  }
}

export type PairingAttemptResult =
  | { status: "empty" }
  | { status: "brain_access_needed" }
  | { status: "already_paired" }
  | { status: "paired" }
  | { status: "failed"; error: unknown };

export async function executePairingAttempt(input: {
  code: string;
  hasBrainAccess: () => Promise<boolean>;
  getCredential: () => Promise<ConnectorCredential | null>;
  exchange: (code: string) => Promise<ConnectorCredential>;
  storeCredential: (credential: ConnectorCredential) => Promise<void>;
}): Promise<PairingAttemptResult> {
  if (!input.code.trim()) return { status: "empty" };
  try {
    if (!(await input.hasBrainAccess())) return { status: "brain_access_needed" };
    if (await input.getCredential()) return { status: "already_paired" };
    const credential = await input.exchange(input.code);
    await input.storeCredential(credential);
    return { status: "paired" };
  } catch (error) {
    return { status: "failed", error };
  }
}
