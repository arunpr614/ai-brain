export type SectionId = "experience" | "connector" | "system" | "spec";

export type DeviceMode = "desktop" | "mobile";

export type ScenarioId =
  | "happy"
  | "offline"
  | "limited"
  | "auth-create"
  | "auth-reconcile"
  | "auth-poll"
  | "uncertain"
  | "conflict"
  | "processing-failed"
  | "already"
  | "changed"
  | "capacity";

export type ExportStage =
  | "idle"
  | "queued"
  | "waiting"
  | "running"
  | "processing"
  | "succeeded"
  | "auth-create"
  | "auth-reconcile"
  | "auth-poll"
  | "reconciling"
  | "conflict"
  | "processing-failed"
  | "already"
  | "changed"
  | "blocked"
  | "cancelled";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export interface ScenarioDefinition {
  id: ScenarioId;
  label: string;
  eyebrow: string;
  description: string;
  connector: "online" | "offline" | "attention";
}

export const scenarios: ScenarioDefinition[] = [
  {
    id: "happy",
    label: "Happy path",
    eyebrow: "One click",
    description: "Queue, send once, process, and report ready.",
    connector: "online",
  },
  {
    id: "offline",
    label: "Desktop offline",
    eyebrow: "Durable queue",
    description: "The request waits safely for the local connector.",
    connector: "offline",
  },
  {
    id: "limited",
    label: "Limited capture",
    eyebrow: "Confirmation",
    description: "Confirm that only the saved preview will be copied.",
    connector: "online",
  },
  {
    id: "auth-create",
    label: "Session expired",
    eyebrow: "Before send",
    description: "Reconnect, knowing that nothing was sent.",
    connector: "attention",
  },
  {
    id: "auth-reconcile",
    label: "Reconnect to check",
    eyebrow: "After possible send",
    description: "Resume with read-only reconciliation, not another write.",
    connector: "attention",
  },
  {
    id: "auth-poll",
    label: "Reconnect to finish",
    eyebrow: "During processing",
    description: "Resume status checks for the known source without creating another copy.",
    connector: "attention",
  },
  {
    id: "uncertain",
    label: "Interrupted write",
    eyebrow: "No blind retry",
    description: "Search for the opaque marker before doing anything else.",
    connector: "online",
  },
  {
    id: "conflict",
    label: "Duplicate conflict",
    eyebrow: "Fail closed",
    description: "Multiple marker matches stop all automated writes.",
    connector: "online",
  },
  {
    id: "processing-failed",
    label: "Processing failed",
    eyebrow: "Provider terminal",
    description: "The known source failed processing; no replacement is created automatically.",
    connector: "attention",
  },
  {
    id: "already",
    label: "Already exported",
    eyebrow: "Deduplicated",
    description: "The exact saved version creates no second source.",
    connector: "online",
  },
  {
    id: "changed",
    label: "Item changed",
    eyebrow: "New version",
    description: "Confirm a new source while preserving the old one.",
    connector: "online",
  },
  {
    id: "capacity",
    label: "Capacity reserve",
    eyebrow: "Safety block",
    description: "The destination reserve is protected; nothing is sent.",
    connector: "attention",
  },
];

export interface StateCatalogGroup {
  title: string;
  description: string;
  states: Array<{
    state: string;
    headline: string;
    body: string;
    action: string;
  }>;
}

export const stateCatalog: StateCatalogGroup[] = [
  {
    title: "Ready and submission",
    description: "What the user sees before a connector has begun a provider write.",
    states: [
      {
        state: "UI · ready_private",
        headline: "Destination: Private NotebookLM target · Private",
        body: "Sends a static copy of the saved text. Changes do not sync automatically.",
        action: "Export to NotebookLM",
      },
      {
        state: "UI · limited_capture",
        headline: "Export the limited text AI Memory saved?",
        body: "NotebookLM receives only the visible preview—not the presumed full source.",
        action: "Export limited text / Cancel",
      },
      {
        state: "UI · browser_unknown",
        headline: "We couldn’t confirm the request",
        body: "Resume the same request with the retained idempotency key.",
        action: "Try again safely",
      },
      {
        state: "queued",
        headline: "Queued for NotebookLM",
        body: "The frozen minimized snapshot is durable. Cancellation is still safe.",
        action: "Cancel export",
      },
      {
        state: "queued (UI: connector offline)",
        headline: "Queued — waiting for desktop connector",
        body: "The page may be closed; delivery continues when the connected computer is online.",
        action: "Cancel export",
      },
    ],
  },
  {
    title: "Provider lifecycle",
    description: "Success is reserved for a source that NotebookLM reports ready.",
    states: [
      {
        state: "sending",
        headline: "Sending the saved copy to NotebookLM…",
        body: "The connector is performing the one allowed copied-text create.",
        action: "No ordinary Retry",
      },
      {
        state: "processing",
        headline: "Added to NotebookLM. Processing…",
        body: "A source identity is stored, but the item is not called exported yet.",
        action: "Automatic status check",
      },
      {
        state: "provider_failed → processing_failed DTO",
        headline: "NotebookLM could not process this source",
        body: "The recorded source failed after creation. AI Memory will not create a replacement automatically.",
        action: "Review the recorded source; no automatic re-create",
      },
      {
        state: "succeeded → ready DTO",
        headline: "Ready in Private NotebookLM target",
        body: "NotebookLM finished processing this exact saved version.",
        action: "Done",
      },
      {
        state: "UI · already_exported",
        headline: "Already exported",
        body: "This exact target, binding version, mapper, and content hash already succeeded.",
        action: "No new write",
      },
      {
        state: "UI · changed_content",
        headline: "This item changed since its last export",
        body: "A deliberate new export creates a new source; the old source remains.",
        action: "Export updated version",
      },
    ],
  },
  {
    title: "Authentication and uncertainty",
    description: "Reconnect behavior depends on what may already have happened.",
    states: [
      {
        state: "authentication_attention · pre_create",
        headline: "Reconnect NotebookLM",
        body: "Nothing was sent. Reconnect before export can start.",
        action: "Reconnect → queued",
      },
      {
        state: "authentication_attention · reconcile",
        headline: "Reconnect to check the result",
        body: "NotebookLM may already have received the item. It will not be sent again.",
        action: "Reconnect → reconciling",
      },
      {
        state: "authentication_attention · poll",
        headline: "Reconnect to finish checking",
        body: "The source was added; reconnect only to inspect processing status.",
        action: "Reconnect → processing",
      },
      {
        state: "reconciling",
        headline: "Checking whether NotebookLM received it…",
        body: "All recovery is read-only while delivery remains uncertain.",
        action: "Check later; Retry is absent",
      },
      {
        state: "duplicate_conflict → conflict DTO",
        headline: "Export paused to prevent another copy",
        body: "More than one source has the exact marker. Nothing else will be sent or deleted.",
        action: "Review in NotebookLM",
      },
    ],
  },
  {
    title: "Blocking, cancellation, and cleanup",
    description: "The interface stays truthful when it cannot safely complete the request.",
    states: [
      {
        state: "capacity_blocked",
        headline: "Destination safety reserve reached",
        body: "Restore headroom or deliberately configure another private destination.",
        action: "Open connector settings",
      },
      {
        state: "UI · payload_too_large",
        headline: "This item is too large for a safe one-source export",
        body: "Nothing is silently truncated or sent.",
        action: "No export; no truncation",
      },
      {
        state: "cancelled",
        headline: "Export cancelled",
        body: "Cancellation completed before the connector began sending; nothing left AI Memory.",
        action: "Start a fresh deliberate export",
      },
      {
        state: "target_attention",
        headline: "Export paused — destination needs review",
        body: "Wrong account, target, sharing, public access, or unreadable health blocks every new create.",
        action: "Review connector",
      },
      {
        state: "reconciliation_required · terminal",
        headline: "Stop checking and purge AI Memory’s temporary copy?",
        body: "Recovery stops; a source may still exist remotely. The UI never implies remote deletion.",
        action: "Stop and purge",
      },
    ],
  },
];

export const securityInvariants = [
  "The item page never supplies a notebook ID, URL, alias, connector, or target override.",
  "One exact notebook URL is pasted only in the local connector; notebook enumeration is not available.",
  "The click freezes a minimized payload; later item edits cannot change an in-flight request.",
  "Only title, saved body, and optional saved author/date may leave AI Memory; mapper V1 sends no URL.",
  "Google session material stays on the connected device and never reaches the hosted server.",
  "After a possibly delivered write, every automated recovery operation is read-only.",
  "Accepted and processing are never presented as success; success means source ready.",
  "Wrong account, changed binding, shared/public/unknown posture, or exhausted headroom blocks real content with no acknowledgement bypass.",
  "Multiple marker matches stop writes and never trigger automatic deletion.",
  "Changed content requires an explicit new-version action; old sources remain.",
  "Item-page DTOs and public logs contain no payload content, provider identifiers, tokens, or raw errors; the private connector claim carries frozen title/text only for the create attempt.",
  "The connector cannot chat, share, create notebooks, bulk-delete, or fetch arbitrary items.",
];
