"use client";

import { useState } from "react";

interface ProviderConsent {
  fingerprint: string;
  label: string;
  purpose: "semantic_index" | "ask";
}

interface NoteAiDefaultSettingProps {
  initialEnabled: boolean;
  initialEligible: boolean;
}

export function NoteAiDefaultSetting({
  initialEnabled,
  initialEligible,
}: NoteAiDefaultSettingProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [eligible, setEligible] = useState(initialEligible);
  const [saving, setSaving] = useState(false);
  const [consentRequired, setConsentRequired] = useState<ProviderConsent[]>([]);
  const [notice, setNotice] = useState("");

  const saveDefault = async (includeInAiByDefault: boolean, afterConsent = false) => {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/settings/note-ai-default", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ includeInAiByDefault }),
      });
      const payload = await response.json();
      if (response.status === 409 && payload.error === "NOTE_AI_CONSENT_REQUIRED") {
        setConsentRequired(payload.providers ?? []);
        setNotice("Provider permission is required before this default can be enabled.");
        return false;
      }
      if (!response.ok) throw new Error(payload.error ?? "Default setting failed");
      setEnabled(payload.includeInAiByDefault);
      setEligible(payload.eligible);
      setConsentRequired([]);
      setNotice(
        includeInAiByDefault
          ? afterConsent
            ? "Provider permission saved. New My notes will be included by default."
            : "New My notes will be included in AI & connections by default."
          : "New My notes will be excluded from AI & connections by default.",
      );
      return true;
    } catch {
      setNotice("The default could not be saved. Your current setting is unchanged.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const approveProvidersAndEnable = async () => {
    setSaving(true);
    try {
      for (const provider of consentRequired) {
        const response = await fetch("/api/settings/note-ai-consent", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fingerprint: provider.fingerprint, approved: true }),
        });
        if (!response.ok) throw new Error("Consent failed");
      }
      await saveDefault(true, true);
    } catch {
      setNotice("Provider permission was not saved. New notes remain excluded by default.");
    } finally {
      setSaving(false);
    }
  };

  const effectiveEnabled = enabled && eligible;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <label className="flex min-h-11 cursor-pointer items-start justify-between gap-4">
        <span>
          <span className="block text-sm font-medium text-[var(--text-primary)]">
            Include in AI &amp; connections by default
          </span>
          <span id="note-ai-default-description" className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
            Applies when a My note is first saved or deliberately recreated. Existing notes keep their current choice. Exact search always works.
          </span>
        </span>
        <input
          type="checkbox"
          checked={effectiveEnabled}
          disabled={saving}
          aria-describedby="note-ai-default-description"
          onChange={(event) => void saveDefault(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--action-primary-bg)] disabled:opacity-50"
        />
      </label>

      {enabled && !eligible && consentRequired.length === 0 && (
        <p className="mt-2 text-xs text-[var(--warning)]">
          This default is paused because the active AI providers need renewed permission. Select it to review and allow them.
        </p>
      )}

      {notice && (
        <p role="status" aria-live="polite" className="mt-2 text-xs text-[var(--text-secondary)]">
          {notice}
        </p>
      )}

      {consentRequired.length > 0 && (
        <div
          role="dialog"
          aria-label="Allow note AI providers for the default"
          className="mt-4 rounded-md border border-[var(--warning)] bg-[var(--surface-raised)] p-4"
        >
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Allow future private note text to leave your server?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            Exact note search works without this. Enabling the default may send newly created note text to:
          </p>
          <ul className="mt-2 list-disc pl-5 text-xs text-[var(--text-secondary)]">
            {consentRequired.map((provider) => (
              <li key={provider.fingerprint}>
                {provider.label} · {provider.purpose.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void approveProvidersAndEnable()}
              className="h-10 rounded-md bg-[var(--action-primary-bg)] px-3 text-xs font-medium text-[var(--action-primary-fg)] disabled:opacity-50"
            >
              Allow and enable default
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveDefault(false)}
              className="h-10 rounded-md border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)] disabled:opacity-50"
            >
              Keep default off
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
