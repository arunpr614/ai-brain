/**
 * Service worker — registers the "Save to Brain" context menu on install,
 * dispatches capture on click, and surfaces results via chrome.notifications.
 *
 * Chrome MV3 service workers are allowed to go idle between events; state
 * that must survive comes from chrome.storage.* (never module-global).
 */
import { captureUrl, type CaptureResult } from "./capture";

const MENU_ID = "brain-save";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Save to Brain",
    contexts: ["page", "link"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const url = (info.linkUrl ?? info.pageUrl ?? tab?.url ?? "").trim();
  if (!url) {
    await notify("Save to Brain", "No URL found on this page.");
    return;
  }
  const result = await captureUrl({
    url,
    title: tab?.title ?? undefined,
  });
  await notify("Save to Brain", describe(result));
});

function describe(result: CaptureResult): string {
  if (result.ok) {
    return result.duplicate ? "Already in your library." : "Saved.";
  }
  switch (result.reason) {
    case "no-token":
      return "Setup required — open the extension options.";
    case "unauthorized":
      return "Authentication failed — rotate token in Brain settings.";
    case "rate-limited":
      return "Rate limited — try again in a minute.";
    case "server-error":
      return `Brain returned ${result.status}.`;
    case "network":
      return `Couldn't reach Brain. ${result.message}`;
    case "inflight":
      return "Already saving this page.";
  }
}

async function notify(title: string, message: string) {
  // Service workers don't have a default icon; chrome.notifications requires
  // one, so we fall back to a transparent data URL. Real icons land later.
  await chrome.notifications.create({
    type: "basic",
    iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
    title,
    message,
  });
}
