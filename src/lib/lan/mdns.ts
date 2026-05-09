/**
 * mDNS service-record advertisement (v0.5.0 T-6 / F-035 Node layer).
 *
 * Publishes `_http._tcp` on port 3000 with the service name "Brain" so
 * mDNS-aware discovery tools can surface the server. This layer does NOT
 * own `brain.local` hostname resolution — that's handled by macOS's
 * `mDNSResponder` after the user runs `sudo scutil --set LocalHostName
 * brain` (D-v0.5.0-1, T-7). The service record here is supplementary:
 * a signal that the server is live and a starting point for future
 * mDNS-aware clients.
 *
 * Lifecycle (REVIEW H-4):
 *   - publishMdns() starts advertising, registers SIGTERM/SIGINT handlers
 *     that call unpublishAll() + destroy() to send mDNS "goodbye" packets
 *     on graceful shutdown. Without this, neighbours cache a stale
 *     advertisement for up to 2 h (default mDNS TTL) after the server
 *     restarts on a new IP.
 *   - `kill -9`, macOS force-quit, or a crash will skip the handler; the
 *     advertisement self-expires via TTL. Document as known limitation.
 *   - Module is a no-op on non-macOS/Linux environments where multicast
 *     UDP is restricted (Windows-under-WSL, sandboxed CI). Callers log
 *     `lan.mdns.publish-failed` via the existing F-050 sink but server
 *     boot continues.
 */
const SERVICE_NAME = "Brain";
const SERVICE_TYPE = "http";
const SERVICE_PORT = 3000;

/**
 * Minimal interface we actually use from bonjour-service. Declaring it
 * locally (instead of importing `Bonjour` as a type) lets tests inject a
 * fake without pulling the real module — which opens multicast sockets at
 * constructor time and keeps the test runner's event loop alive.
 */
interface MdnsPublisher {
  publish(options: { name: string; type: string; port: number }): unknown;
  unpublishAll(cb?: () => void): void;
  destroy(): void;
}

type MdnsFactory = () => Promise<MdnsPublisher> | MdnsPublisher;

let activeInstance: {
  publisher: MdnsPublisher;
  cleanup: () => void;
} | null = null;

/** Default factory — loads the real bonjour-service. Swap in tests. */
const defaultFactory: MdnsFactory = async () => {
  const { Bonjour } = await import("bonjour-service");
  return new Bonjour() as unknown as MdnsPublisher;
};

/**
 * Publish the `Brain._http._tcp` service record. Idempotent — calling twice
 * in the same process is a no-op (the second call returns the first
 * instance). Returns a disposer that stops advertising; tests use this to
 * clean up between runs.
 */
export async function publishMdns(options?: {
  port?: number;
  onPublished?: () => void;
  onError?: (err: Error) => void;
  factory?: MdnsFactory;
}): Promise<() => void> {
  if (activeInstance) {
    return activeInstance.cleanup;
  }

  try {
    const factory = options?.factory ?? defaultFactory;
    const publisher = await factory();
    publisher.publish({
      name: SERVICE_NAME,
      type: SERVICE_TYPE,
      port: options?.port ?? SERVICE_PORT,
    });

    const cleanup = () => {
      if (!activeInstance) return;
      try {
        activeInstance.publisher.unpublishAll(() => {
          activeInstance?.publisher.destroy();
        });
      } catch {
        // Swallow during shutdown — nothing productive to do if multicast
        // teardown fails at process exit.
      } finally {
        activeInstance = null;
      }
    };

    activeInstance = { publisher, cleanup };
    options?.onPublished?.();
    return cleanup;
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    options?.onError?.(e);
    // Return a no-op disposer so callers don't need to branch on failure.
    return () => undefined;
  }
}

/**
 * Register SIGTERM/SIGINT handlers to tear down the mDNS advertisement on
 * graceful shutdown. Idempotent; safe to call multiple times.
 */
export function registerMdnsShutdownHandlers(
  cleanup: () => void,
  onTeardown?: () => void,
): void {
  const handler = () => {
    try {
      cleanup();
    } finally {
      onTeardown?.();
      // Let other SIGTERM/SIGINT handlers run; do NOT process.exit() here
      // because that would race with the backup scheduler and enrichment
      // worker's own shutdown hooks.
    }
  };
  process.once("SIGTERM", handler);
  process.once("SIGINT", handler);
}

/** Test-only: tear down any active instance without going through signals. */
export function __resetMdnsForTests(): void {
  activeInstance?.cleanup();
  activeInstance = null;
}
