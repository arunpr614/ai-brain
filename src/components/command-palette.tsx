"use client";

import { Command } from "cmdk";
import { Library, Plus, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface CommandPaletteCtx {
  open: () => void;
  close: () => void;
}

const Ctx = createContext<CommandPaletteCtx | null>(null);

export function useCommandPalette(): CommandPaletteCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return v;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const router = useRouter();

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const ctx = useMemo(() => ({ open, close }), [open, close]);

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[10vh]"
          onClick={close}
        >
          <Command
            label="Command palette"
            className="w-full max-w-[640px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <Command.Input
              autoFocus
              placeholder="Type a command or search..."
              className="w-full border-0 border-b border-[var(--border)] bg-transparent px-5 py-3 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            <Command.List className="max-h-[60vh] overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
                No matches
              </Command.Empty>

              <Command.Group heading="Navigate">
                <PaletteItem icon={Library} onSelect={() => go("/")}>
                  Go to Library
                </PaletteItem>
                <PaletteItem icon={Settings} onSelect={() => go("/settings")}>
                  Go to Settings
                </PaletteItem>
              </Command.Group>

              <Command.Group heading="Capture">
                <PaletteItem icon={Plus} onSelect={() => go("/items/new")}>
                  New note
                </PaletteItem>
              </Command.Group>
            </Command.List>
          </Command>
        </div>
      )}
    </Ctx.Provider>
  );
}

function PaletteItem({
  icon: Icon,
  children,
  onSelect,
}: {
  icon: typeof Library;
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--text-primary)] aria-selected:bg-[var(--accent-3)] aria-selected:text-[var(--accent-11)]"
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      {children}
    </Command.Item>
  );
}
