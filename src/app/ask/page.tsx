import { AskClient } from "./ask-client";

/**
 * /ask — RAG chat page (v0.4.0 T-11).
 *
 * Single-exchange UX: ask a question, see the streamed answer + retrieved
 * chunks. Thread history + per-item scope ship in T-13. Auth gate is the
 * same session cookie check that all app routes rely on; the middleware
 * handles redirect for unauth'd users (see src/proxy.ts).
 */
export default function AskPage() {
  // The mobile bottom-nav (Sidebar mobile branch) is fixed at z-40 and ~60px
  // tall including safe-area. The Ask input sits at the bottom of this flex
  // column; without pb-20 on mobile its send button would be visually covered
  // and tap-blocked by the nav.
  return (
    <div className="mx-auto flex h-[calc(100vh-48px)] max-w-[760px] flex-col px-6 py-8 pb-20 md:pb-8">
      <h1 className="mb-6 text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
        Ask
      </h1>
      <AskClient />
    </div>
  );
}
