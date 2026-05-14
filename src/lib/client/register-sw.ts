/*
 * Service worker registration for the Brain app shell (v0.5.6).
 *
 * Plan: docs/plans/v0.5.6-app-shell-sw.md SHELL-2.
 *
 * Why a hand-rolled registration: schema ownership over caching
 * strategy, no build-time coupling (we don't want next.config.ts to
 * import @serwist/next or similar), and we already have public/sw.js
 * shipped via Capacitor's webDir="public".
 *
 * Skips registration when:
 *   - SSR (no `window` / `navigator`)
 *   - browser doesn't support service workers
 *   - URL has ?nosw=1 (dev escape hatch — also unregisters existing SW)
 */

export function registerAppShellSW(): void {
  if (typeof window === "undefined") return;
  if (typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  if (url.searchParams.get("nosw") === "1") {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => void r.unregister());
    });
    return;
  }

  void navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .catch((err) => {
      // SW registration is best-effort; failures don't block the app.
      // The app continues to work online; offline cold-start falls
      // back to Capacitor's bundled offline.html.
      // eslint-disable-next-line no-console
      console.warn("[brain-sw] registration failed", err);
    });
}
