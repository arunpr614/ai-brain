import { BrainConnectorError, brainConnectorSetupMessage } from "./brain-client";
import { NotebookLmProviderError } from "./provider-adapter";

export function pairingErrorMessage(error: unknown): string {
  if (error instanceof BrainConnectorError) return brainConnectorSetupMessage(error);
  return "Pairing failed safely. Reload the Brain extension, create a new code, and try again.";
}

export function shouldClearPairingCode(error: unknown): boolean {
  return !(error instanceof BrainConnectorError && error.kind === "invalid_format");
}

export function connectorSetupErrorMessage(error: unknown): string {
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
    switch (error.kind) {
      case "network":
        return "Brain could not be reached. No notebook was bound. Check your connection and try again.";
      case "timeout":
        return "Brain did not respond within 15 seconds. No notebook was bound. Try again.";
      case "rate_limited":
        return "Brain is temporarily rate limiting the connector. Wait 60 seconds, then try again.";
      case "server":
        return "Brain is temporarily unavailable. No notebook was bound. Try again shortly.";
      default:
        return brainConnectorSetupMessage(error);
    }
  }
  return "Connector setup failed safely. Reload the extension and try again.";
}
