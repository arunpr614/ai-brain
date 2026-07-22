import { clearToken, getToken, setToken, testConnection } from "./capture";
import {
  BrainConnectorClient,
  BrainConnectorError,
  brainConnectorSetupMessage,
} from "./notebooklm/brain-client";
import { NotebookLmProviderAdapter, NotebookLmProviderError } from "./notebooklm/provider-adapter";
import { ConnectorStore } from "./notebooklm/storage";
import { parseNotebookTarget, targetFingerprint } from "./notebooklm/target";
import {
  BRAIN_SAFE_TARGET_LABEL,
  DEFAULT_SOURCE_LIMIT,
  DEFAULT_SOURCE_RESERVE,
  NOTEBOOKLM_PERMISSION,
  type LocalBinding,
} from "./notebooklm/types";

const tokenEl = element<HTMLInputElement>("token");
const saveBtn = element<HTMLButtonElement>("save");
const testBtn = element<HTMLButtonElement>("test");
const clearBtn = element<HTMLButtonElement>("clear");
const captureStatusEl = element<HTMLDivElement>("capture-status");

const pairingCodeEl = element<HTMLInputElement>("pairing-code");
const pairBtn = element<HTMLButtonElement>("pair-connector");
const grantBtn = element<HTMLButtonElement>("grant-notebooklm");
const targetUrlEl = element<HTMLInputElement>("target-url");
const bindBtn = element<HTMLButtonElement>("bind-target");
const runBtn = element<HTMLButtonElement>("run-connector");
const forgetBtn = element<HTMLButtonElement>("forget-connector");
const connectorStatusEl = element<HTMLDivElement>("connector-status");
const connectorSummaryEl = element<HTMLDivElement>("connector-summary");

const store = new ConnectorStore(chrome.storage.local);
const brain = new BrainConnectorClient();
const provider = new NotebookLmProviderAdapter();

void initialize();

async function initialize(): Promise<void> {
  const [captureToken, binding] = await Promise.all([getToken(), store.getBinding()]);
  if (captureToken) tokenEl.value = captureToken;
  if (binding) {
    targetUrlEl.value = binding.targetUrl;
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
  const granted = await chrome.permissions.request({ origins: [NOTEBOOKLM_PERMISSION] });
  showConnectorStatus(
    granted ? "success" : "attention",
    granted ? "NotebookLM site access granted." : "NotebookLM site access was not granted.",
  );
  await refreshConnectorSummary();
});

pairBtn.addEventListener("click", async () => {
  const code = pairingCodeEl.value.trim();
  if (!code) return showConnectorStatus("error", "Enter the one-time pairing code from Brain.");
  if (await store.getCredential()) {
    return showConnectorStatus(
      "attention",
      "This browser is already paired. Disconnect it in Brain first, then clear the old local data explicitly.",
    );
  }
  await withDisabled(pairBtn, async () => {
    showConnectorStatus("success", "Pairing with Brain…");
    try {
      const credential = await brain.exchangePairingCode(code);
      await store.setCredential(credential);
      pairingCodeEl.value = "";
      showConnectorStatus("success", "Connector paired. The one-time code has been discarded.");
      await refreshConnectorSummary();
    } catch (error) {
      showConnectorStatus("error", connectorErrorMessage(error));
    }
  });
});

bindBtn.addEventListener("click", async () => {
  const granted = await chrome.permissions.contains({ origins: [NOTEBOOKLM_PERMISSION] });
  if (!granted) return showConnectorStatus("attention", "Grant NotebookLM site access before binding.");

  let target;
  try {
    target = parseNotebookTarget(targetUrlEl.value);
  } catch (error) {
    return showConnectorStatus("error", error instanceof Error ? error.message : "The notebook URL is invalid.");
  }
  // V1 deliberately uses the lowest documented consumer capacity. A higher
  // paid-plan tier cannot be inferred safely from account branding or input.
  const sourceLimit = DEFAULT_SOURCE_LIMIT;
  const credential = await store.getCredential();
  if (!credential) return showConnectorStatus("attention", "Pair the connector with Brain first.");
  const storedBinding = await store.getBinding();
  const previous = storedBinding?.connectorId === credential.connectorId ? storedBinding : null;
  if (
    previous &&
    (previous.sourceLimit !== DEFAULT_SOURCE_LIMIT || previous.reserveCount !== DEFAULT_SOURCE_RESERVE)
  ) {
    return showConnectorStatus(
      "attention",
      "This older binding uses an unsupported capacity policy. Retire it in Brain before binding again.",
    );
  }
  const fingerprint = await targetFingerprint(target.notebookId, target.authUser);
  if (
    previous &&
    previous.localBindingFingerprint !== fingerprint &&
    !window.confirm("Change the connector to this different notebook? Existing approved requests remain bound to the old version.")
  ) {
    return;
  }
  await withDisabled(bindBtn, async () => {
    showConnectorStatus("success", "Checking notebook ownership, sharing, and source capacity…");
    try {
      const { inspection } = await provider.inspectTarget(target.notebookId, target.authUser);
      const reserveCount = DEFAULT_SOURCE_RESERVE;
      if (inspection.sourceCount >= sourceLimit - reserveCount) {
        showConnectorStatus("attention", "This notebook is too close to its source limit to bind safely.");
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
      showConnectorStatus(
        "success",
        `Bound to “${inspection.safeLabel}”. It is owner-only, private, and currently has ${inspection.sourceCount} sources.`,
      );
      await refreshConnectorSummary();
    } catch (error) {
      showConnectorStatus("error", connectorErrorMessage(error));
    }
  });
});

runBtn.addEventListener("click", async () => {
  await withDisabled(runBtn, async () => {
    showConnectorStatus("success", "Checking for approved exports…");
    try {
      const result = (await chrome.runtime.sendMessage({ type: "notebooklm-run-once" })) as unknown;
      if (!isRunResult(result) || !result.ok) throw new Error("worker_unavailable");
      showConnectorStatus(
        result.result === "handled" ? "success" : result.result === "idle" ? "success" : "attention",
        result.result === "handled"
          ? "The connector handled one approved export step."
          : result.result === "idle"
            ? "Connector is ready; no export is waiting."
            : "The connector needs attention. Review the status below.",
      );
      await refreshConnectorSummary();
    } catch {
      showConnectorStatus("error", "The background connector could not be started. Reload the extension and try again.");
    }
  });
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
  showConnectorStatus(
    "success",
    "Local connector data and NotebookLM site access were removed. This did not change server state in Brain.",
  );
  await refreshConnectorSummary();
});

async function refreshConnectorSummary(): Promise<void> {
  const [credential, binding, workerStatus, permission] = await Promise.all([
    store.getCredential(),
    store.getBinding(),
    store.getWorkerStatus(),
    chrome.permissions.contains({ origins: [NOTEBOOKLM_PERMISSION] }),
  ]);
  const parts = [
    credential ? "Brain paired" : "Brain pairing needed",
    permission ? "NotebookLM access granted" : "NotebookLM access needed",
    binding && credential?.connectorId === binding.connectorId
      ? `Bound to “${binding.safeLabel}” (version ${binding.bindingVersion})`
      : "Target notebook not bound for this pairing",
  ];
  if (workerStatus) parts.push(workerStatus.detail);
  connectorSummaryEl.textContent = parts.join(" · ");
}

function connectorErrorMessage(error: unknown): string {
  if (error instanceof NotebookLmProviderError) {
    switch (error.kind) {
      case "authentication":
        return "Sign in to NotebookLM in this browser profile, then try again.";
      case "public":
      case "shared":
        return "The target must be an owner-only private notebook.";
      case "wrong_target":
      case "unavailable":
        return "That notebook is unavailable to the currently signed-in NotebookLM account.";
      case "protocol":
        return "NotebookLM changed its protocol. Provider writes are blocked until the connector is updated.";
      default:
        return "NotebookLM could not be checked. No source was added.";
    }
  }
  if (error instanceof BrainConnectorError) {
    return brainConnectorSetupMessage(error);
  }
  return error instanceof Error ? error.message : "Connector setup failed safely.";
}

function showCaptureStatus(kind: "success" | "error", message: string): void {
  showStatus(captureStatusEl, kind, message);
}

function showConnectorStatus(kind: "success" | "error" | "attention", message: string): void {
  showStatus(connectorStatusEl, kind, message);
}

function showStatus(
  elementValue: HTMLDivElement,
  kind: "success" | "error" | "attention",
  message: string,
): void {
  elementValue.hidden = false;
  elementValue.textContent = message;
  elementValue.className = `status status--${kind}`;
}

async function withDisabled(button: HTMLButtonElement, action: () => Promise<void>): Promise<void> {
  button.disabled = true;
  try {
    await action();
  } finally {
    button.disabled = false;
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
