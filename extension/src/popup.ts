/**
 * Popup UI — opened when the user clicks the Brain toolbar icon.
 *
 * Pre-fills title + URL from the active tab, lets the user add an
 * optional note, and POSTs to /api/capture/url on click. All server
 * communication goes through capture.ts.
 */
import { captureUrl, getToken, type CaptureResult } from "./capture";

type El<T extends HTMLElement> = T;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as El<T>;

const titleEl = $<HTMLInputElement>("title");
const urlEl = $<HTMLInputElement>("url");
const noteEl = $<HTMLTextAreaElement>("note");
const saveBtn = $<HTMLButtonElement>("save");
const statusEl = $<HTMLDivElement>("status");
const openOptionsLink = $<HTMLAnchorElement>("open-options");

function showStatus(kind: "pending" | "success" | "error", message: string) {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.className = `status status--${kind}`;
}

async function prefillFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  titleEl.value = tab.title ?? "";
  urlEl.value = tab.url ?? "";
}

async function handleSave() {
  const url = urlEl.value.trim();
  if (!url) {
    showStatus("error", "URL is required");
    return;
  }

  saveBtn.disabled = true;
  showStatus("pending", "Saving…");

  const result = await captureUrl({
    url,
    title: titleEl.value.trim() || undefined,
    note: noteEl.value.trim() || undefined,
  });

  saveBtn.disabled = false;
  renderResult(result);
}

function renderResult(result: CaptureResult) {
  if (result.ok) {
    if (result.duplicate) {
      showStatus("success", "Already in your library — link opened existing item.");
    } else {
      showStatus("success", "Saved to Brain.");
    }
    return;
  }

  switch (result.reason) {
    case "no-token":
      showStatus("error", "Setup required — paste your Brain token in Options.");
      break;
    case "unauthorized":
      showStatus("error", "Authentication failed — rotate the token in Brain settings.");
      break;
    case "rate-limited":
      showStatus("error", "Rate limited — wait a minute and try again.");
      break;
    case "server-error":
      showStatus("error", `Brain returned ${result.status}. ${result.body}`.trim());
      break;
    case "network":
      showStatus("error", `Couldn't reach Brain. ${result.message}`);
      break;
    case "inflight":
      showStatus("error", "Already saving — hang on a sec.");
      break;
  }
}

openOptionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

saveBtn.addEventListener("click", handleSave);

(async () => {
  await prefillFromActiveTab();
  if (!(await getToken())) {
    showStatus("error", "Setup required — paste your Brain token in Options.");
  }
})();
