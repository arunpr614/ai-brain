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
    showStatus("error", "Enter a token first.");
    return;
  }
  testBtn.disabled = true;
  showStatus("success", "Testing…");
  const result = await testConnection(token);
  testBtn.disabled = false;
  if (result.ok) {
    showStatus("success", "Connected. Token is valid.");
    return;
  }
  switch (result.reason) {
    case "unauthorized":
      showStatus("error", "Token rejected. Rotate in Brain settings and paste the new one.");
      break;
    case "network":
      showStatus("error", `Couldn't reach Brain. ${result.message}`);
      break;
    case "server-error":
      showStatus("error", `Brain returned ${result.status}.`);
      break;
  }
});

saveBtn.addEventListener("click", async () => {
  const token = tokenEl.value.trim();
  if (!token) {
    showStatus("error", "Enter a token first.");
    return;
  }
  await setToken(token);
  showStatus("success", "Saved. The popup and context menu can now capture pages.");
});
