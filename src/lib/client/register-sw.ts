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
    .then((reg) => {
      // After first install, controlchange fires when the new SW takes
      // control of this page. Without this reload, the registering page
      // remains uncontrolled until next navigation — which means the
      // first offline cold-launch finds no controller and falls through
      // to the network (which is dead). Reloading once after first
      // controlchange ensures the next cold-launch hits a controlled
      // page that the SW can intercept.
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
      return reg;
    })
    .catch((err) => {
      // SW registration is best-effort; failures don't block the app.
      // The app continues to work online; offline cold-start falls
      // back to Capacitor's bundled offline.html.
      // eslint-disable-next-line no-console
      console.warn("[brain-sw] registration failed", err);
    });
}
