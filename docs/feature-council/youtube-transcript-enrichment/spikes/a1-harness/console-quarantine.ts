import { createHash } from "node:crypto";

export interface ConsoleQuarantineEvidence {
  suppressed_console_count: number;
  suppressed_console_sha256: string;
}

export interface InstalledConsoleQuarantine {
  snapshot(): ConsoleQuarantineEvidence;
  restore(): void;
}

/** Prevents application/migration logging from mixing with the safe JSON line. */
export function installConsoleQuarantine(): InstalledConsoleQuarantine {
  const methods = ["debug", "error", "info", "log", "warn"] as const;
  const originals = new Map<(typeof methods)[number], (...args: unknown[]) => void>();
  const digest = createHash("sha256");
  let count = 0;
  let restored = false;

  for (const method of methods) {
    originals.set(method, console[method] as (...args: unknown[]) => void);
    console[method] = ((...args: unknown[]) => {
      count += 1;
      digest.update(method);
      for (const arg of args) digest.update(logFingerprint(arg));
    }) as typeof console[typeof method];
  }

  return {
    snapshot(): ConsoleQuarantineEvidence {
      return {
        suppressed_console_count: count,
        suppressed_console_sha256: digest.copy().digest("hex"),
      };
    },
    restore(): void {
      if (restored) return;
      restored = true;
      for (const method of methods) console[method] = originals.get(method) as typeof console[typeof method];
    },
  };
}

function logFingerprint(value: unknown): string {
  if (value instanceof Error) return `error:${value.name}:${value.message}`;
  if (value === null) return "null";
  if (value instanceof Uint8Array) return `bytes:${value.byteLength}`;
  const type = typeof value;
  if (type === "object") return Object.prototype.toString.call(value);
  if (type === "function") return "function";
  if (type === "symbol") return "symbol";
  return `${type}:${String(value)}`;
}
