import {
  Accessibility,
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  Code2,
  Eye,
  FileText,
  KeyRound,
  LayoutPanelLeft,
  ListChecks,
  LockKeyhole,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { securityInvariants, stateCatalog } from "./model";

const v1Resolutions = [
  "Payload: at most 200,000 UTF-8 bytes and 50,000 normalized words; no truncation or chunking",
  "Capacity: limit 50, reserve 5, warn at 10 or fewer safe slots, and block at 0 or fewer",
  "Retention: seven days before send, no more than 24 hours after dispatch, and 30 days for redacted events",
  "Destination: exactly one pasted local URL; only positively verified owner-private posture is allowed",
  "Boundary: exact URL and local notebook title stay in Chrome; AI Memory shows Private NotebookLM target",
  "Cleanup: stop recovery and purge the temporary AI Memory snapshot; retain unresolved Chrome journal evidence and never claim remote deletion",
];

export function Specification() {
  return (
    <section className="spec-section">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Implemented-candidate specification</span>
          <h1>Placement, payload, states, accessibility, and release gates</h1>
          <p>
            This view mirrors the PM contract, migration 026, and current API/UI contracts. It is not live-provider
            or production-deployment evidence.
          </p>
        </div>
        <div className="concept-badge"><FileText aria-hidden="true" /> Detailed handoff</div>
      </div>

      <div className="anatomy-card">
        <div className="anatomy-preview">
          <div className="mini-item-header"><span>ARTICLE · FULL TEXT</span><h2>Why durable memory changes how teams use AI</h2></div>
          <div className="mini-copy-lines"><span /><span /><span /><span /></div>
          <div className="mini-target"><span className="anatomy-pin">1</span><BookOpen aria-hidden="true" /><div><small>NOTEBOOKLM DESTINATION</small><strong>Private NotebookLM target · Private</strong><p>Static copy · Desktop online</p></div></div>
          <div className="mini-status"><span className="anatomy-pin">2</span><Clock3 aria-hidden="true" /><div><strong>Queued for NotebookLM</strong><p>Safe to close this page</p></div></div>
          <div className="mini-actions"><button>Focus mode</button><button className="notebook-mini"><span className="anatomy-pin">3</span><BookOpen aria-hidden="true" /> Export to NotebookLM</button><button>Export as .md</button></div>
        </div>
        <div className="anatomy-notes">
          <span className="section-kicker">Item-page anatomy</span>
          <h2>A small insertion with durable state</h2>
          <ol>
            <li><span>1</span><div><strong>Safe destination context</strong><p>Show only the generic fixed-target label, private posture, connector availability, and static-copy behavior.</p></div></li>
            <li><span>2</span><div><strong>Persistent request status</strong><p>Inline status survives navigation and reload. A brief toast cannot carry an asynchronous export contract.</p></div></li>
            <li><span>3</span><div><strong>Secondary footer action</strong><p>Place immediately before Export as .md. Keep Delete isolated and do not add the first version to Library cards.</p></div></li>
          </ol>
          <div className="responsive-placement">
            <span><LayoutPanelLeft aria-hidden="true" /><strong>Desktop</strong> 32px outlined action in the existing footer cluster</span>
            <span><Smartphone aria-hidden="true" /><strong>Mobile</strong> Full-width 44px action on the Original tab</span>
          </div>
        </div>
      </div>

      <div className="payload-section">
        <div className="section-heading compact"><div><span className="section-kicker">Allowlist mapper</span><h2>Send the saved source—not the private memory around it</h2><p>The first version always exports deterministic copied text, including PDFs whose retained artifact is extracted text.</p></div></div>
        <div className="payload-spec-grid">
          <article className="payload-spec is-included">
            <header><CheckCircle2 aria-hidden="true" /><div><span className="section-kicker">Included</span><h3>Canonical copied-text source</h3></div></header>
            <ul>
              <li><Check aria-hidden="true" /><span><strong>Title</strong><small>Full title in copied text; only the provider display title may shorten to 180 characters while preserving the marker</small></span></li>
              <li><Check aria-hidden="true" /><span><strong>Saved content body</strong><small>The exact click-time text the user reviewed</small></span></li>
              <li><Check aria-hidden="true" /><span><strong>Author</strong><small>Only when present in the saved source</small></span></li>
              <li><Check aria-hidden="true" /><span><strong>Publication date</strong><small>Only when present in the saved source</small></span></li>
            </ul>
          </article>
          <article className="payload-spec is-excluded">
            <header><LockKeyhole aria-hidden="true" /><div><span className="section-kicker">Excluded by default</span><h3>Private and provider-specific context</h3></div></header>
            <ul>
              <li><X aria-hidden="true" /><span><strong>AI summaries, quotes, chats, and private notes</strong><small>Useful in AI Memory; outside the source snapshot</small></span></li>
              <li><X aria-hidden="true" /><span><strong>Internal IDs, raw hashes, and database timestamps</strong><small>Never provider content</small></span></li>
              <li><X aria-hidden="true" /><span><strong>Every source URL, thumbnail, and temporary media path</strong><small>Mapper V1 sends no URL, even when it appears public</small></span></li>
              <li><X aria-hidden="true" /><span><strong>Raw notebook and source identifiers</strong><small>Exact target data stays local; only sealed aliases enter the ledger</small></span></li>
              <li><X aria-hidden="true" /><span><strong>Google session material</strong><small>Never reaches AI Memory’s hosted server</small></span></li>
            </ul>
          </article>
        </div>
        <div className="payload-rules">
          <span><AlertTriangle aria-hidden="true" /><strong>Limited capture:</strong> block or require explicit confirmation.</span>
          <span><CircleDashed aria-hidden="true" /><strong>Envelope:</strong> 200,000 bytes and 50,000 words; never truncate.</span>
          <span><Trash2 aria-hidden="true" /><strong>Retention:</strong> 7 days pre-send; no more than 24 hours post-dispatch.</span>
        </div>
      </div>

      <div className="state-catalog-section">
        <div className="section-heading compact"><div><span className="section-kicker">User-facing contract</span><h2>State and recovery catalog</h2><p>Persisted migration-026 states are named directly; UI-only and DTO-derived variants are explicitly marked.</p></div></div>
        <div className="state-catalog">
          {stateCatalog.map((group, index) => (
            <details key={group.title} open={index === 0}>
              <summary><span><small>{String(index + 1).padStart(2, "0")}</small><strong>{group.title}</strong><p>{group.description}</p></span><ChevronDown aria-hidden="true" /></summary>
              <div className="state-table" role="table" aria-label={group.title}>
                <div className="state-table__head" role="row"><span>State</span><span>User-facing message</span><span>Available action</span></div>
                {group.states.map((state) => (
                  <div className="state-table__row" role="row" key={state.state}>
                    <code>{state.state}</code>
                    <span><strong>{state.headline}</strong><small>{state.body}</small></span>
                    <b>{state.action}</b>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="design-grid two-up spec-two-up">
        <article className="design-card">
          <div className="design-card__heading"><ShieldCheck aria-hidden="true" /><div><span className="section-kicker">Non-negotiable</span><h2>Security and correctness invariants</h2></div></div>
          <ol className="invariant-list">
            {securityInvariants.map((invariant, index) => (
              <li key={invariant}><span>{String(index + 1).padStart(2, "0")}</span><p>{invariant}</p></li>
            ))}
          </ol>
        </article>

        <article className="design-card">
          <div className="design-card__heading"><Accessibility aria-hidden="true" /><div><span className="section-kicker">Interaction quality</span><h2>Accessibility requirements</h2></div></div>
          <ul className="accessibility-list">
            <li><Eye aria-hidden="true" /><span><strong>Text plus color</strong><small>Every spinner, icon, and tone includes an explicit status label.</small></span></li>
            <li><MonitorSmartphone aria-hidden="true" /><span><strong>Responsive reach</strong><small>At least 44px mobile targets; destination and disclosure stay visible.</small></span></li>
            <li><ListChecks aria-hidden="true" /><span><strong>Live status</strong><small>Polite announcements for progress; assertive only for auth, safety blocks, and conflict.</small></span></li>
            <li><KeyRound aria-hidden="true" /><span><strong>Dialog focus</strong><small>Trap focus during confirmation and return it to the initiating action.</small></span></li>
            <li><Clock3 aria-hidden="true" /><span><strong>Freshness</strong><small>Show “last checked” timestamps so stalled polling is distinguishable from a frozen UI.</small></span></li>
            <li><Code2 aria-hidden="true" /><span><strong>Semantic absence</strong><small>Retry is absent—not merely disabled—after a possibly delivered write.</small></span></li>
          </ul>
          <div className="a11y-note"><Accessibility aria-hidden="true" /><p>Motion respects the user’s reduced-motion preference; no state depends on animation.</p></div>
        </article>
      </div>

      <div className="open-decisions-card">
        <div className="open-decisions-copy">
          <span className="section-kicker">Resolved V1 contract</span>
          <h2>Fixed safety boundaries</h2>
          <p>These values are implemented-candidate constraints. Raising or loosening them requires a new reviewed contract.</p>
        </div>
        <ol>
          {v1Resolutions.map((decision, index) => <li key={decision}><span>{index + 1}</span><p>{decision}</p></li>)}
        </ol>
      </div>

      <div className="release-gates">
        <div className="section-heading compact"><div><span className="section-kicker">Delivery sequence</span><h2>Four controlled launch stages</h2></div></div>
        <div className="gate-grid">
          <Gate number="0" title="Production-compatible, writes off" status="Implemented candidate" body="Deploy migration, APIs, UI, retention, and connector behind UI, queue, and provider-write gates, all false when unset." />
          <Gate number="1" title="Read-only shadow" status="Production evidence" body="Verify subject, exact target, owner-private posture, occupancy, source listing, and status parsing with zero creates." />
          <Gate number="2" title="Private synthetic canary" status="Required before writes" body="Use one dedicated private notebook and synthetic content to prove create, readiness, dedupe, recovery, kill switch, stop-checking, and temporary-content purge." />
          <Gate number="3" title="Owner-only opt-in" status="After every gate" body="Enable writes only for the owner after the canary; every item remains a deliberate click and no content is selected automatically." />
        </div>
      </div>
    </section>
  );
}

function Gate({ number, title, status, body }: { number: string; title: string; status: string; body: string }) {
  return (
    <article className="gate-card">
      <header><span>{number}</span><small>{status}</small></header>
      <h3>{title}</h3><p>{body}</p>
    </article>
  );
}
