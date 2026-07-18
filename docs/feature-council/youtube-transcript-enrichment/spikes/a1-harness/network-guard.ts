import { createHash } from "node:crypto";
import { createRequire } from "node:module";

import { A1HarnessError } from "./errors";

const require = createRequire(import.meta.url);

export interface NetworkAttemptRecord {
  sequence: number;
  surface: string;
  target_sha256: string;
}

export interface InstalledNetworkGuard {
  readonly attempts: readonly NetworkAttemptRecord[];
  restore(): void;
}

export class NetworkAttemptBlockedError extends A1HarnessError {
  constructor(readonly attempt: NetworkAttemptRecord) {
    super(
      "NETWORK_ATTEMPT_BLOCKED",
      "The A1 harness blocked an in-process network operation.",
      attempt.surface,
    );
    this.name = "NetworkAttemptBlockedError";
  }
}

/**
 * Denies common Node/browser networking surfaces. This is a tripwire and
 * evidence recorder, not a kernel boundary; README.md also requires the
 * external macOS sandbox for a future sealed run.
 */
export function installFailFastNetworkGuard(): InstalledNetworkGuard {
  const attempts: NetworkAttemptRecord[] = [];
  const restorers: Array<() => void> = [];
  let restored = false;

  const deny = (surface: string, args: readonly unknown[]): never => {
    const attempt = Object.freeze({
      sequence: attempts.length + 1,
      surface,
      target_sha256: hashTarget(args),
    });
    attempts.push(attempt);
    throw new NetworkAttemptBlockedError(attempt);
  };

  const replace = (target: Record<PropertyKey, unknown>, key: PropertyKey, surface: string): void => {
    const original = target[key];
    if (typeof original !== "function") return;
    target[key] = (...args: unknown[]) => deny(surface, args);
    restorers.push(() => {
      target[key] = original;
    });
  };

  const http = require("node:http") as Record<PropertyKey, unknown>;
  const https = require("node:https") as Record<PropertyKey, unknown>;
  const http2 = require("node:http2") as Record<PropertyKey, unknown>;
  const net = require("node:net") as Record<PropertyKey, unknown>;
  const tls = require("node:tls") as Record<PropertyKey, unknown>;
  const dns = require("node:dns") as Record<PropertyKey, unknown>;
  const dnsPromises = require("node:dns/promises") as Record<PropertyKey, unknown>;
  const dgram = require("node:dgram") as Record<PropertyKey, unknown>;

  replace(http, "request", "http.request");
  replace(http, "get", "http.get");
  replace(https, "request", "https.request");
  replace(https, "get", "https.get");
  replace(http2, "connect", "http2.connect");
  replace(net, "connect", "net.connect");
  replace(net, "createConnection", "net.createConnection");
  const socket = net.Socket as { prototype?: Record<PropertyKey, unknown> } | undefined;
  if (socket?.prototype) replace(socket.prototype, "connect", "net.Socket.connect");
  replace(tls, "connect", "tls.connect");
  replace(dgram, "createSocket", "dgram.createSocket");

  for (const method of [
    "lookup",
    "resolve",
    "resolve4",
    "resolve6",
    "resolveAny",
    "resolveCaa",
    "resolveCname",
    "resolveMx",
    "resolveNaptr",
    "resolveNs",
    "resolvePtr",
    "resolveSoa",
    "resolveSrv",
    "resolveTxt",
    "reverse",
  ]) {
    replace(dns, method, `dns.${method}`);
    replace(dnsPromises, method, `dns.promises.${method}`);
  }

  const resolver = dns.Resolver as { prototype?: Record<PropertyKey, unknown> } | undefined;
  if (resolver?.prototype) {
    for (const method of [
      "resolve",
      "resolve4",
      "resolve6",
      "resolveAny",
      "resolveCaa",
      "resolveCname",
      "resolveMx",
      "resolveNaptr",
      "resolveNs",
      "resolvePtr",
      "resolveSoa",
      "resolveSrv",
      "resolveTxt",
      "reverse",
    ]) {
      replace(resolver.prototype, method, `dns.Resolver.${method}`);
    }
  }

  replaceGlobalConstructor("fetch", "global.fetch", deny, restorers);
  replaceGlobalConstructor("WebSocket", "global.WebSocket", deny, restorers);
  replaceGlobalConstructor("EventSource", "global.EventSource", deny, restorers);

  return {
    get attempts(): readonly NetworkAttemptRecord[] {
      return Object.freeze(attempts.map((attempt) => ({ ...attempt })));
    },
    restore(): void {
      if (restored) return;
      restored = true;
      for (const restore of restorers.reverse()) restore();
    },
  };
}

function replaceGlobalConstructor(
  key: "fetch" | "WebSocket" | "EventSource",
  surface: string,
  deny: (surface: string, args: readonly unknown[]) => never,
  restorers: Array<() => void>,
): void {
  const target = globalThis as unknown as Record<PropertyKey, unknown>;
  if (typeof target[key] !== "function") return;
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: descriptor?.enumerable ?? true,
    writable: true,
    value: (...args: unknown[]) => deny(surface, args),
  });
  restorers.push(() => {
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else delete target[key];
  });
}

function hashTarget(args: readonly unknown[]): string {
  const hash = createHash("sha256");
  for (const value of args.slice(0, 3)) hash.update(fingerprintValue(value, 0));
  return hash.digest("hex");
}

function fingerprintValue(value: unknown, depth: number): string {
  if (depth > 2) return "[depth]";
  if (value === null) return "null";
  if (value instanceof URL) return `url:${value.toString()}`;
  if (value instanceof Uint8Array) return `bytes:${value.byteLength}`;
  switch (typeof value) {
    case "string":
      return `string:${value}`;
    case "number":
    case "bigint":
    case "boolean":
    case "undefined":
      return `${typeof value}:${String(value)}`;
    case "function":
      return "function";
    case "symbol":
      return "symbol";
    case "object": {
      const record = value as Record<string, unknown>;
      const selected = ["href", "hostname", "host", "port", "path", "pathname", "method"];
      return selected
        .filter((key) => Object.prototype.hasOwnProperty.call(record, key))
        .map((key) => `${key}=${fingerprintValue(record[key], depth + 1)}`)
        .join("|") || Object.prototype.toString.call(value);
    }
  }
  return "unknown";
}
