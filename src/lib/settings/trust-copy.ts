export const PROVIDER_TRUST_COPY = {
  llmTitle: "Claude generation",
  embedTitle: "Gemini semantic indexing",
  llmOk: "Claude generation is available.",
  embedOk: "Gemini semantic indexing is available.",
  storage:
    "Claude receives prompts for Ask and summaries. Gemini receives text chunks for semantic indexing. Saved content remains in AI Memory storage.",
} as const;

export const PRIVACY_TRUST_COPY = {
  title: "Privacy controls",
  short:
    "End-to-end encryption is not active yet. Privacy controls are coming soon.",
  detail:
    "End-to-end encryption is not active yet. Privacy controls are coming soon. Saved content remains in AI Memory storage.",
  badge: "Coming soon",
} as const;

export const OFFLINE_TRUST_COPY = {
  title: "Offline access",
  short:
    "Ask, capture, export, and sync require the AI Memory server. There is no offline queue in UX v2.",
  detail:
    "This device can show a cached fallback page when the server is unreachable, but Ask, capture, export, and sync require server access. There is no offline queue in UX v2.",
  badge: "Server required",
} as const;

export const BACKUP_TRUST_COPY = {
  detail:
    "Internal server snapshots are created by the configured AI Memory job. Restore is not managed from Settings and must be verified before relying on recovery.",
} as const;
