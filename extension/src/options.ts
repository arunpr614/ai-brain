/**
 * Options page — paste the bearer token; verify reachability; save.
 *
 * The Brain URL is intentionally hard-coded to https://brain.arunp.in
 * (the named Cloudflare tunnel is stable) and rendered read-only for
 * transparency. The token lives in chrome.storage.local so it persists
 * across browser restarts and survives service-worker recycles.
 */
import { getToken, setToken, testConnection } from "./capture";

const tokenEl = document.getElementById("token") as HTMLInputElement;
const saveBtn = document.getElementById("save") as HTMLButtonElement;
const testBtn = document.getElementById("test") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

function showStatus(kind: "success" | "error", message: string) {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.className = `status status--${kind}`;
}

(async () => {
  const existing = await getToken();
  if (existing) tokenEl.value = existing;
})();

testBtn.addEventListener("click", async () => {
  const token = tokenEl.value.trim();
  if (!token) {
    showStatus("error", "Paste a token first, then test.");
    return;
  }
  testBtn.disabled = true;
  showStatus("success", "Checking…");
  const result = await testConnection(token);
  testBtn.disabled = false;
  if (result.ok) {
    showStatus("success", "Connected. This token works.");
    return;
  }
  switch (result.reason) {
    case "unauthorized":
      showStatus("error", "This token doesn't work. Open Brain settings on your Mac, generate a fresh one, and paste it here.");
      break;
    case "network":
      showStatus("error", "Can't reach Brain. Is your Mac awake and the tunnel running?");
      break;
    case "server-error":
      showStatus("error", "Brain is reachable but not responding properly. Try again in a minute.");
      break;
  }
});

saveBtn.addEventListener("click", async () => {
  const token = tokenEl.value.trim();
  if (!token) {
    showStatus("error", "Paste a token first, then save.");
    return;
  }
  await setToken(token);
  showStatus("success", "Saved. You can now save pages from the toolbar icon or right-click menu.");
});
