/**
 * Minimal DOM toast — v0.6.x offline mode (OFFLINE-10).
 *
 * The share-handler enqueue path needs a non-blocking "Saved offline"
 * confirmation when the immediate sync attempt fails to flip the row
 * to `synced` (plan §3.1). `alert()` is modal — wrong for a feedback
 * surface. A full toast library is overkill for one call site.
 *
 * Behavior: appends a position:fixed div to <body>, fades in, fades out
 * after 3.5s, removes itself. Multiple toasts stack vertically (newer at
 * top). Safe to call from any component; SSR-safe via window guard.
 *
 * Styled to match the existing surface tokens used by sidebar/inbox.
 */

const TOAST_LIFE_MS = 3500;
const TOAST_FADE_MS = 250;
const STACK_GAP_PX = 8;

type ToastTone = "info" | "success" | "warn";

const toastBgByTone: Record<ToastTone, string> = {
  info: "var(--surface-raised, #1f2937)",
  success: "var(--accent-3, #064e3b)",
  warn: "var(--accent-9, #b91c1c)",
};

const toastFgByTone: Record<ToastTone, string> = {
  info: "var(--text-primary, #f1f5f9)",
  success: "var(--text-primary, #ecfdf5)",
  warn: "#ffffff",
};

function nextStackOffset(): number {
  if (typeof document === "undefined") return 16;
  const existing = document.querySelectorAll("[data-brain-toast]");
  let bottom = 16;
  for (const el of Array.from(existing)) {
    if (!(el instanceof HTMLElement)) continue;
    bottom += el.offsetHeight + STACK_GAP_PX;
  }
  return bottom;
}

export function showToast(message: string, tone: ToastTone = "info"): void {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.setAttribute("data-brain-toast", "true");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.textContent = message;

  const bottom = nextStackOffset();
  el.style.cssText = `
    position: fixed;
    left: 50%;
    bottom: ${bottom}px;
    transform: translateX(-50%) translateY(8px);
    padding: 10px 16px;
    border-radius: 10px;
    background: ${toastBgByTone[tone]};
    color: ${toastFgByTone[tone]};
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
    opacity: 0;
    transition: opacity ${TOAST_FADE_MS}ms ease, transform ${TOAST_FADE_MS}ms ease;
    z-index: 9999;
    max-width: 90%;
    text-align: center;
    pointer-events: none;
  `;

  document.body.appendChild(el);

  // Force a layout, then animate in.
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateX(-50%) translateY(0)";
  });

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(-50%) translateY(8px)";
    setTimeout(() => {
      el.remove();
    }, TOAST_FADE_MS);
  }, TOAST_LIFE_MS);
}
