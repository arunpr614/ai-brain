/**
 * Service worker — registers the "Save to Brain" context menu on install,
 * dispatches capture on click, and surfaces results via chrome.notifications.
 *
 * Chrome MV3 service workers are allowed to go idle between events; state
 * that must survive comes from chrome.storage.* (never module-global).
 */
import { captureUrl, type CaptureResult } from "./capture";

const MENU_LINK = "brain-save-link";
const MENU_PAGE = "brain-save-page";

chrome.runtime.onInstalled.addListener(() => {
  // Two separate menu entries so the label always matches what will
  // be captured. Chrome shows only the one whose `contexts` matches
  // where the user right-clicked — right-click a hyperlink and only
  // "Save link" appears; right-click page body and only "Save this
  // page" appears. Previously one entry silently switched behavior
  // based on cursor position.
  chrome.contextMenus.create({
    id: MENU_LINK,
    title: "Save link to Brain",
    contexts: ["link"],
  });
  chrome.contextMenus.create({
    id: MENU_PAGE,
    title: "Save this page to Brain",
    contexts: ["page", "image", "selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let url: string;
  let title: string | undefined;

  if (info.menuItemId === MENU_LINK) {
    url = (info.linkUrl ?? "").trim();
    title = undefined;
  } else if (info.menuItemId === MENU_PAGE) {
    url = (info.pageUrl ?? tab?.url ?? "").trim();
    title = tab?.title ?? undefined;
  } else {
    return;
  }

  if (!url) {
    await notify("Save to Brain", "No URL to save here.");
    return;
  }

  const result = await captureUrl({ url, title });
  await notify("Save to Brain", describe(result));
});

function describe(result: CaptureResult): string {
  if (result.ok) {
    return result.duplicate ? "Already in your library." : "Saved to Brain.";
  }
  switch (result.reason) {
    case "no-token":
      return "Open the extension Options to finish setup.";
    case "unauthorized":
      return "Your token no longer works. Paste a fresh one in Options.";
    case "rate-limited":
      return "Too many saves just now. Try again in a minute.";
    case "server-error":
      return "Brain had trouble saving this. Try again.";
    case "network":
      return "Can't reach Brain. Is your Mac awake and the tunnel running?";
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
