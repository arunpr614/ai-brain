import { cookies } from "next/headers";
import { ThemeToggle } from "@/components/theme-toggle";
import { getJsonSetting } from "@/db/settings";
import { isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

interface BackupConfig {
  enabled: boolean;
  interval_hours: number;
  retention_count: number;
}

const BACKUP_DEFAULTS: BackupConfig = {
  enabled: true,
  interval_hours: 6,
  retention_count: 28,
};

export default async function SettingsPage() {
  const c = await cookies();
  const raw = c.get(THEME_COOKIE)?.value;
  const themePref: Theme = isTheme(raw) ? raw : "system";
  const backup = getJsonSetting<BackupConfig>("backup", BACKUP_DEFAULTS);

  return (
    <div className="mx-auto max-w-[680px] px-8 py-10">
      <h1 className="mb-8 text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
        Settings
      </h1>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Appearance
        </h2>
        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Theme</p>
            <p className="text-xs text-[var(--text-secondary)]">
              System follows your OS preference.
            </p>
          </div>
          <ThemeToggle initial={themePref} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Backups
        </h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-[var(--text-secondary)]">Status</dt>
            <dd className="text-[var(--text-primary)]">
              {backup.enabled ? "Enabled" : "Disabled"}
            </dd>
            <dt className="text-[var(--text-secondary)]">Interval</dt>
            <dd className="text-[var(--text-primary)]">
              Every {backup.interval_hours} hours
            </dd>
            <dt className="text-[var(--text-secondary)]">Retention</dt>
            <dd className="text-[var(--text-primary)]">
              Last {backup.retention_count} snapshots
            </dd>
            <dt className="text-[var(--text-secondary)]">Location</dt>
            <dd className="font-mono text-xs text-[var(--text-primary)]">
              data/backups/
            </dd>
          </dl>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Editing backup settings ships in a later phase. Defaults apply today.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          About
        </h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="text-[var(--text-secondary)]">App version</dt>
            <dd className="font-mono text-[var(--text-primary)]">0.1.0</dd>
            <dt className="text-[var(--text-secondary)]">Mode</dt>
            <dd className="text-[var(--text-primary)]">Local-only (pre-v1.0.0)</dd>
            <dt className="text-[var(--text-secondary)]">Storage</dt>
            <dd className="font-mono text-xs text-[var(--text-primary)]">
              data/brain.sqlite
            </dd>
          </dl>
        </div>
      </section>
    </div>
  );
}
