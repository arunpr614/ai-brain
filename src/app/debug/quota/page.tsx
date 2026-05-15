import QuotaProbeClient from "./quota-probe";

/**
 * /debug/quota — OFFLINE-PRE measurement gate (offline-mode plan v3 §8.1).
 *
 * One-time probe page the user navigates to from inside the Brain APK
 * WebView. Measures four things that determine whether and how the
 * IndexedDB outbox can be built:
 *
 *   1. navigator.storage.estimate() → { usage, quota } — sets the outbox
 *      cap. Plan branches: ≥500 MB generous, 100–500 MB moderate, <100 MB
 *      drop PDF from MVP and defer to v0.7.x WorkManager.
 *
 *   2. navigator.storage.persist() — observes whether the WebView will
 *      grant durable storage. If false, surface a one-time warning toast
 *      at outbox-init (plan §5.1).
 *
 *   3. 'serviceWorker' in navigator — resolves Q5/NIT-2 from critique-v2.
 *      If absent, Workbox bg-sync drops out of the OFFLINE-1A spike
 *      candidates and the question is dropped from the user-questions list.
 *
 *   4. typeof Worker !== 'undefined' — confirms the Web Worker SHA256
 *      strategy from §5.2 (B-2 fix) is viable. If absent, fall back to
 *      (file_name, file_size) outbox dedup.
 *
 * Result is shown on-screen for the user to copy into
 * docs/research/webview-quota-pixel-2026-05-13.md AND POSTed to
 * /api/errors/client (namespace: share.quota-probe) so the laptop log
 * captures it for later reference.
 *
 * No bearer token is required for the route itself — the proxy treats
 * it as a regular HTML route guarded by the session cookie. The optional
 * POST to /api/errors/client uses the bearer token from
 * @capacitor/preferences (same path share-handler uses).
 *
 * Lives under src/app/debug/ rather than src/app/api/ because the probe
 * is a client-side measurement — the actual APIs (storage, serviceWorker,
 * Worker) only exist in the browser/WebView, not the Node.js server.
 */
export default function QuotaProbePage() {
  return <QuotaProbeClient />;
}
