import { clearToken, getToken, setToken, testConnection } from "./capture";
import { BrainConnectorClient } from "./notebooklm/brain-client";
import { connectorControlState } from "./notebooklm/options-state";
import { executePairingAttempt, PairingAttemptGate } from "./notebooklm/pairing-attempt";
import { NotebookLmProviderAdapter } from "./notebooklm/provider-adapter";
import {
  connectorSetupErrorMessage,
  pairingErrorMessage,
  shouldClearPairingCode,
} from "./notebooklm/setup-errors";
import { ConnectorStore } from "./notebooklm/storage";
import { parseNotebookTarget, targetFingerprint } from "./notebooklm/target";
import {
  BRAIN_PERMISSION,
  BRAIN_SAFE_TARGET_LABEL,
  DEFAULT_SAFE_SOURCE_LIMIT,
  DEFAULT_SOURCE_RESERVE,
  isSupportedSafeSourceLimit,
  isSupportedSourceLimit,
  MAX_SAFE_SOURCE_LIMIT,
  MIN_SAFE_SOURCE_LIMIT,
  NOTEBOOKLM_PERMISSION,
  type LocalBinding,
} from "./notebooklm/types";

const tokenEl = element<HTMLInputElement>("token");
const saveBtn = element<HTMLButtonElement>("save");
const testBtn = element<HTMLButtonElement>("test");
const clearBtn = element<HTMLButtonElement>("clear");
const captureStatusEl = element<HTMLDivElement>("capture-status");

const pairingCodeEl = element<HTMLInputElement>("pairing-code");
const togglePairingCodeBtn = element<HTMLButtonElement>("toggle-pairing-code");
const pairBtn = element<HTMLButtonElement>("pair-connector");
const grantBtn = element<HTMLButtonElement>("grant-notebooklm");
const targetUrlEl = element<HTMLInputElement>("target-url");
const safeSourceLimitEl = element<HTMLInputElement>("safe-source-limit");
const bindBtn = element<HTMLButtonElement>("bind-target");
const runBtn = element<HTMLButtonElement>("run-connector");
const forgetBtn = element<HTMLButtonElement>("forget-connector");
const notebookLmAccessStatusEl = element<HTMLDivElement>("notebooklm-access-status");
const pairingStatusEl = element<HTMLDivElement>("pairing-status");
const targetStatusEl = element<HTMLDivElement>("target-status");
const connectorSummaryEl = element<HTMLDivElement>("connector-summary");
const extensionVersionEl = element<HTMLSpanElement>("extension-version");

const store = new ConnectorStore(chrome.storage.local);
const brain = new BrainConnectorClient();
const provider = new NotebookLmProviderAdapter();
const pairingAttempt = new PairingAttemptGate();

extensionVersionEl.textContent = `Extension v${chrome.runtime.getManifest().version}`;
void initialize();

async function initialize(): Promise<void> {
  const [captureToken, binding] = await Promise.all([getToken(), store.getBinding()]);
  if (captureToken) tokenEl.value = captureToken;
  if (binding) {
    targetUrlEl.value = binding.targetUrl;
    safeSourceLimitEl.value = String(binding.sourceLimit - binding.reserveCount);
  }
  await refreshConnectorSummary();
}

testBtn.addEventListener("click", async () => {
  const token = tokenEl.value.trim();
  if (!token) return showCaptureStatus("error", "Paste a capture token first, then test.");
  await withDisabled(testBtn, async () => {
    showCaptureStatus("success", "Checking…");
    const result = await testConnection(token);
    if (result.ok) return showCaptureStatus("success", "Connected. This capture token works.");
    showCaptureStatus(
      "error",
      result.reason === "unauthorized"
        ? "This capture token no longer works. Generate a fresh one in Brain settings."
        : result.reason === "network"
          ? "Check your internet connection; Brain could not be reached."
          : "Brain is reachable but not responding properly. Try again shortly.",
    );
  });
});

saveBtn.addEventListener("click", async () => {
  const token = tokenEl.value.trim();
  if (!token) return showCaptureStatus("error", "Paste a capture token first, then save.");
  await setToken(token);
  showCaptureStatus("success", "Capture token saved.");
});

clearBtn.addEventListener("click", async () => {
  await clearToken();
  tokenEl.value = "";
  showCaptureStatus("success", "Capture token cleared.");
});

grantBtn.addEventListener("click", async () => {
  let permissionUpdateFailed = false;
  await withDisabled(grantBtn, async () => {
    try {
      const granted = await chrome.permissions.request({ origins: [NOTEBOOKLM_PERMISSION] });
      showNotebookLmAccessStatus(
        granted ? "success" : "attention",
        granted ? "NotebookLM site access granted." : "NotebookLM site access was not granted.",
      );
    } catch {
      permissionUpdateFailed = true;
    }
  });
  await refreshConnectorSummary();
  if (permissionUpdateFailed) {
    showNotebookLmAccessStatus(
      "error",
      "Chrome could not update NotebookLM site access. Reload the extension and try again.",
    );
  }
});

togglePairingCodeBtn.addEventListener("click", () => {
  const reveal = pairingCodeEl.type === "password";
  pairingCodeEl.type = reveal ? "text" : "password";
  togglePairingCodeBtn.textContent = reveal ? "Hide code" : "Show code";
  togglePairingCodeBtn.setAttribute("aria-pressed", String(reveal));
});

pairBtn.addEventListener("click", () => {
  void pairingAttempt.run(async () => {
    let paired = false;
    const code = pairingCodeEl.value.trim();
    showPairingStatus("success", "Pairing with Brain…");
    const result = await withDisabled(pairBtn, () => executePairingAttempt({
      code,
      hasBrainAccess: () => chrome.permissions.contains({ origins: [BRAIN_PERMISSION] }),
      getCredential: () => store.getCredential(),
      exchange: (pairingCode) => brain.exchangePairingCode(pairingCode),
      storeCredential: (credential) => store.setCredential(credential),
    }));
    switch (result.status) {
      case "empty":
        showPairingStatus("error", "Enter the 8-character code from Brain. Hyphens are optional.");
        break;
      case "brain_access_needed":
        showPairingStatus(
          "attention",
          "Chrome site access for brain.arunp.in is off. Allow it in the Brain extension Details, reload the extension, then try again.",
        );
        break;
      case "already_paired":
        clearPairingCodeInput();
        showPairingStatus(
          "attention",
          "This browser is already paired. Disconnect it in Brain first, then clear the old local data explicitly.",
        );
        break;
      case "paired":
        paired = true;
        clearPairingCodeInput();
        applyDurablePairedControls();
        targetUrlEl.disabled = false;
        showPairingStatus(
          "success",
          "Brain paired. The one-time code has been discarded. Next, paste your private NotebookLM URL.",
        );
        break;
      case "failed":
        if (shouldClearPairingCode(result.error)) clearPairingCodeInput();
        showPairingStatus("error", pairingErrorMessage(result.error));
        break;
    }
    const refreshed = await refreshConnectorSummary();
    if (!refreshed && paired) {
      // The credential write is the durable local truth. A best-effort summary
      // read must never make a completed pairing look available to repeat.
      applyDurablePairedControls();
    }
  }).catch(() => {
    clearPairingCodeInput();
    pairBtn.disabled = true;
    pairBtn.textContent = "Reload extension";
    pairingCodeEl.disabled = true;
    togglePairingCodeBtn.disabled = true;
    showPairingStatus(
      "error",
      "Pairing failed safely. Reload the Brain extension, create a new code, and try again.",
    );
  });
});

bindBtn.addEventListener("click", async () => {
  const permissions = await currentConnectorPermissions();
  if (!permissions) {
    showTargetStatus("error", "Chrome could not verify site access. Reload the extension and try again.");
    await refreshConnectorSummary();
    return;
  }
  const { notebookLmAccess, brainAccess } = permissions;
  if (!brainAccess) return showTargetStatus("attention", "Restore Brain site access and reload the extension before binding.");
  if (!notebookLmAccess) return showTargetStatus("attention", "Grant NotebookLM site access before binding.");

  let target;
  try {
    target = parseNotebookTarget(targetUrlEl.value);
  } catch {
    return showTargetStatus(
      "error",
      "Enter a NotebookLM URL in the form https://notebooklm.google.com/notebook/<id>.",
    );
  }
  const safeSourceLimit = safeSourceLimitEl.valueAsNumber;
  if (!isSupportedSafeSourceLimit(safeSourceLimit)) {
    return showTargetStatus(
      "error",
      `Enter a whole-number Brain safe source limit from ${MIN_SAFE_SOURCE_LIMIT} to ${MAX_SAFE_SOURCE_LIMIT}.`,
    );
  }
  const sourceLimit = safeSourceLimit + DEFAULT_SOURCE_RESERVE;
  const credential = await store.getCredential();
  if (!credential) return showTargetStatus("attention", "Pair the connector with Brain first.");
  const storedBinding = await store.getBinding();
  const previous = storedBinding?.connectorId === credential.connectorId ? storedBinding : null;
  if (
    previous &&
    (!isSupportedSourceLimit(previous.sourceLimit) ||
      previous.reserveCount !== DEFAULT_SOURCE_RESERVE)
  ) {
    return showTargetStatus(
      "attention",
      "This older binding uses an unsupported capacity policy. Retire it in Brain before binding again.",
    );
  }
  const fingerprint = await targetFingerprint(target.notebookId, target.authUser);
  if (
    previous &&
    previous.sourceLimit !== sourceLimit &&
    !window.confirm(
      `Change the Brain safe source limit from ${previous.sourceLimit - previous.reserveCount} to ${safeSourceLimit}? The notebook must be rebound, and unresolved exports must be finished first.`,
    )
  ) {
    return;
  }
  if (
    previous &&
    previous.localBindingFingerprint !== fingerprint &&
    !window.confirm("Change the connector to this different notebook? Existing approved requests remain bound to the old version.")
  ) {
    return;
  }
  await withDisabled(bindBtn, async () => {
    showTargetStatus("success", "Checking notebook ownership, sharing, and source capacity…");
    try {
      const { inspection } = await provider.inspectTarget(target.notebookId, target.authUser);
      const reserveCount = DEFAULT_SOURCE_RESERVE;
      if (inspection.sourceCount >= sourceLimit - reserveCount) {
        showTargetStatus("attention", "This notebook is too close to its source limit to bind safely.");
        return;
      }
      const confirmation = await brain.bind(credential, {
        bindingVersion: previous?.bindingVersion ?? 0,
        safeLabel: BRAIN_SAFE_TARGET_LABEL,
        localBindingFingerprint: fingerprint,
        subjectFingerprint: inspection.subjectFingerprint,
        sharingPosture: "private",
        sourceCount: inspection.sourceCount,
        sourceLimit,
        reserveCount,
      });
      const binding: LocalBinding = {
        connectorId: credential.connectorId,
        bindingVersion: confirmation.bindingVersion,
        notebookId: target.notebookId,
        authUser: target.authUser,
        targetUrl: target.canonicalUrl,
        localBindingFingerprint: fingerprint,
        subjectFingerprint: inspection.subjectFingerprint,
        safeLabel: inspection.safeLabel,
        sourceLimit,
        reserveCount,
        verifiedAt: Date.now(),
      };
      await store.setBinding(binding);
      targetUrlEl.value = target.canonicalUrl;
      showTargetStatus(
        "success",
        `Bound to “${inspection.safeLabel}”. It is owner-only, private, and currently has ${inspection.sourceCount} sources.`,
      );
    } catch (error) {
      showTargetStatus("error", connectorSetupErrorMessage(error));
    }
  });
  await refreshConnectorSummary();
});

runBtn.addEventListener("click", async () => {
  const permissions = await currentConnectorPermissions();
  if (!permissions) {
    showTargetStatus("error", "Chrome could not verify site access. Reload the extension and try again.");
    await refreshConnectorSummary();
    return;
  }
  const { notebookLmAccess, brainAccess } = permissions;
  if (!brainAccess || !notebookLmAccess) {
    showTargetStatus("attention", "Restore both Brain and NotebookLM site access before checking for exports.");
    await refreshConnectorSummary();
    return;
  }
  await withDisabled(runBtn, async () => {
    showTargetStatus("success", "Checking for approved exports…");
    try {
      const result = (await chrome.runtime.sendMessage({ type: "notebooklm-run-once" })) as unknown;
      if (!isRunResult(result) || !result.ok) throw new Error("worker_unavailable");
      showTargetStatus(
        result.result === "handled" ? "success" : result.result === "idle" ? "success" : "attention",
        result.result === "handled"
          ? "The connector handled one approved export step."
          : result.result === "idle"
            ? "Connector is ready; no export is waiting."
            : "The connector needs attention. Review the status below.",
      );
    } catch {
      showTargetStatus("error", "The background connector could not be started. Reload the extension and try again.");
    }
  });
  await refreshConnectorSummary();
});

forgetBtn.addEventListener("click", async () => {
  if (
    !window.confirm(
      "Emergency local clear does not disconnect Brain. Continue only after Brain shows this connector disconnected and all unresolved exports are cancelled or stopped. Clearing early can strand work and cannot undo delivered sources.",
    )
  ) return;
  await store.clearConnectorData();
  await chrome.permissions.remove({ origins: [NOTEBOOKLM_PERMISSION] });
  targetUrlEl.value = "";
  safeSourceLimitEl.value = String(DEFAULT_SAFE_SOURCE_LIMIT);
  showTargetStatus(
    "success",
    "Local connector data and NotebookLM site access were removed. This did not change server state in Brain.",
  );
  await refreshConnectorSummary();
});

async function refreshConnectorSummary(): Promise<boolean> {
  try {
    const [credential, binding, workerStatus, notebookLmAccess, brainAccess] = await Promise.all([
      store.getCredential(),
      store.getBinding(),
      store.getWorkerStatus(),
      chrome.permissions.contains({ origins: [NOTEBOOKLM_PERMISSION] }),
      chrome.permissions.contains({ origins: [BRAIN_PERMISSION] }),
    ]);
    const bound = Boolean(binding && credential?.connectorId === binding.connectorId);
    const controls = connectorControlState({
      paired: Boolean(credential),
      bound,
      hasBinding: Boolean(binding),
      brainAccess,
      notebookLmAccess,
    });
    grantBtn.disabled = controls.grantDisabled;
    grantBtn.textContent = notebookLmAccess ? "NotebookLM access granted" : "Grant NotebookLM access";
    pairBtn.disabled = controls.pairDisabled;
    pairBtn.textContent = credential ? "Brain paired" : brainAccess ? "Pair connector" : "Brain access needed";
    pairingCodeEl.disabled = controls.pairingInputDisabled;
    togglePairingCodeBtn.disabled = controls.pairingRevealDisabled;
    targetUrlEl.disabled = controls.targetDisabled;
    safeSourceLimitEl.disabled = controls.targetDisabled;
    bindBtn.disabled = controls.bindDisabled;
    runBtn.disabled = controls.runDisabled;
    forgetBtn.hidden = controls.emergencyHidden;
    if (credential) clearPairingCodeInput();
    showNotebookLmAccessStatus(
      notebookLmAccess ? "success" : "attention",
      notebookLmAccess ? "NotebookLM site access granted." : "NotebookLM site access is not granted.",
    );
    const brainAccessMessage =
      "Chrome site access for brain.arunp.in is off. Allow it in the Brain extension Details, then reload the extension.";
    if (!brainAccess) {
      showPairingStatus(
        "attention",
        brainAccessMessage,
      );
    } else if (pairingStatusEl.textContent === brainAccessMessage) {
      if (credential) showPairingStatus("success", "Brain paired.");
      else hideStatus(pairingStatusEl);
    } else if (credential && pairingStatusEl.hidden) {
      showPairingStatus("success", "Brain paired.");
    }
    const parts = [
      brainAccess ? "Brain access granted" : "Brain access needed",
      credential ? "Brain paired" : "Brain pairing needed",
      notebookLmAccess ? "NotebookLM access granted" : "NotebookLM access needed",
      bound
        ? `Bound to “${binding?.safeLabel}” (version ${binding?.bindingVersion}; ${(binding?.sourceLimit ?? 0) - (binding?.reserveCount ?? 0)} safe source limit)`
        : "Target notebook not bound for this pairing",
    ];
    if (workerStatus) parts.push(workerStatus.detail);
    connectorSummaryEl.textContent = parts.join(" · ");
    return true;
  } catch {
    grantBtn.disabled = true;
    pairBtn.disabled = true;
    pairingCodeEl.disabled = true;
    togglePairingCodeBtn.disabled = true;
    targetUrlEl.disabled = true;
    safeSourceLimitEl.disabled = true;
    bindBtn.disabled = true;
    runBtn.disabled = true;
    connectorSummaryEl.textContent = "Connector status is unavailable. Reload the extension and try again.";
    return false;
  }
}

function showCaptureStatus(kind: "success" | "error", message: string): void {
  showStatus(captureStatusEl, kind, message);
}

function showNotebookLmAccessStatus(kind: "success" | "error" | "attention", message: string): void {
  showStatus(notebookLmAccessStatusEl, kind, message);
}

function showPairingStatus(kind: "success" | "error" | "attention", message: string): void {
  showStatus(pairingStatusEl, kind, message);
}

function showTargetStatus(kind: "success" | "error" | "attention", message: string): void {
  showStatus(targetStatusEl, kind, message);
}

function showStatus(
  elementValue: HTMLDivElement,
  kind: "success" | "error" | "attention",
  message: string,
): void {
  elementValue.className = `status status--${kind}`;
  elementValue.setAttribute("role", kind === "error" ? "alert" : "status");
  if (kind === "error") elementValue.removeAttribute("aria-live");
  else elementValue.setAttribute("aria-live", "polite");
  elementValue.textContent = message;
  elementValue.hidden = false;
}

function clearPairingCodeInput(): void {
  pairingCodeEl.value = "";
  pairingCodeEl.type = "password";
  togglePairingCodeBtn.textContent = "Show code";
  togglePairingCodeBtn.setAttribute("aria-pressed", "false");
}

function applyDurablePairedControls(): void {
  pairBtn.disabled = true;
  pairBtn.textContent = "Brain paired";
  pairingCodeEl.disabled = true;
  togglePairingCodeBtn.disabled = true;
}

function hideStatus(elementValue: HTMLDivElement): void {
  elementValue.hidden = true;
  elementValue.textContent = "";
  elementValue.className = "status";
  elementValue.removeAttribute("role");
  elementValue.setAttribute("aria-live", "polite");
}

async function currentConnectorPermissions(): Promise<{
  notebookLmAccess: boolean;
  brainAccess: boolean;
} | null> {
  try {
    const [notebookLmAccess, brainAccess] = await Promise.all([
      chrome.permissions.contains({ origins: [NOTEBOOKLM_PERMISSION] }),
      chrome.permissions.contains({ origins: [BRAIN_PERMISSION] }),
    ]);
    return { notebookLmAccess, brainAccess };
  } catch {
    return null;
  }
}

async function withDisabled<T>(button: HTMLButtonElement, action: () => Promise<T>): Promise<T> {
  const wasDisabled = button.disabled;
  button.disabled = true;
  try {
    return await action();
  } finally {
    button.disabled = wasDisabled;
  }
}

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`missing_options_element:${id}`);
  return value as T;
}

function isRunResult(value: unknown): value is { ok: true; result: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    value.ok === true &&
    "result" in value &&
    typeof value.result === "string"
  );
}
