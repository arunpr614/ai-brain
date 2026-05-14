/**
 * Unit tests for src/lib/client/register-sw.ts (v0.5.6 SHELL-2).
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { registerAppShellSW } from "./register-sw";

type RegFake = { unregister: () => Promise<boolean> };

interface SWFake {
  register: (url: string, opts?: { scope?: string }) => Promise<unknown>;
  getRegistrations: () => Promise<RegFake[]>;
  registerCalls: Array<{ url: string; opts?: { scope?: string } }>;
}

function makeSWFake(opts?: {
  registerRejects?: boolean;
  registrations?: RegFake[];
}): SWFake {
  const registerCalls: SWFake["registerCalls"] = [];
  return {
    registerCalls,
    register: (url, o) => {
      registerCalls.push({ url, opts: o });
      return opts?.registerRejects
        ? Promise.reject(new Error("boom"))
        : Promise.resolve({});
    },
    getRegistrations: () => Promise.resolve(opts?.registrations ?? []),
  };
}

const realWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
const realNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

function setWindow(href: string | undefined): void {
  Object.defineProperty(globalThis, "window", {
    value: href === undefined ? undefined : { location: { href } },
    configurable: true,
    writable: true,
  });
}

function setNavigator(sw?: SWFake | null): void {
  Object.defineProperty(globalThis, "navigator", {
    value: sw === null ? undefined : sw === undefined ? {} : { serviceWorker: sw },
    configurable: true,
    writable: true,
  });
}

function restore(): void {
  if (realWindowDesc) Object.defineProperty(globalThis, "window", realWindowDesc);
  else delete (globalThis as { window?: unknown }).window;
  if (realNavigatorDesc)
    Object.defineProperty(globalThis, "navigator", realNavigatorDesc);
  else delete (globalThis as { navigator?: unknown }).navigator;
}

describe("registerAppShellSW", () => {
  beforeEach(() => {
    setWindow("https://brain.arunp.in/");
  });
  afterEach(() => {
    restore();
  });

  it("no-ops when window is undefined (SSR)", () => {
    setWindow(undefined);
    assert.doesNotThrow(() => registerAppShellSW());
  });

  it("no-ops when navigator is undefined", () => {
    setNavigator(null);
    assert.doesNotThrow(() => registerAppShellSW());
  });

  it("no-ops when navigator.serviceWorker is missing", () => {
    setNavigator(undefined);
    assert.doesNotThrow(() => registerAppShellSW());
  });

  it("registers /sw.js with root scope on a normal load", () => {
    const sw = makeSWFake();
    setNavigator(sw);
    registerAppShellSW();
    assert.equal(sw.registerCalls.length, 1);
    assert.equal(sw.registerCalls[0].url, "/sw.js");
    assert.deepEqual(sw.registerCalls[0].opts, { scope: "/" });
  });

  it("does not throw when registration rejects", () => {
    const sw = makeSWFake({ registerRejects: true });
    setNavigator(sw);
    assert.doesNotThrow(() => registerAppShellSW());
  });

  it("skips registration and unregisters existing SWs when ?nosw=1 is set", async () => {
    setWindow("https://brain.arunp.in/?nosw=1");
    let unregistered = 0;
    const reg: RegFake = {
      unregister: () => {
        unregistered += 1;
        return Promise.resolve(true);
      },
    };
    const sw = makeSWFake({ registrations: [reg] });
    setNavigator(sw);
    registerAppShellSW();
    // microtask queue drain — getRegistrations + unregister are async.
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(sw.registerCalls.length, 0, "register must not be called");
    assert.equal(unregistered, 1, "existing SW must be unregistered");
  });
});
