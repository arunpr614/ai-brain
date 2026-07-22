import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  CircleDot,
  Cloud,
  Code2,
  Database,
  KeyRound,
  Laptop,
  LockKeyhole,
  Monitor,
  RefreshCw,
  Server,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

const repositories = [
  { name: "teng-lin/notebooklm-py", score: 93, note: "Winner · complete lifecycle + operation-aware no-retry" },
  { name: "jacob-bd/notebooklm-mcp-cli", score: 74, note: "Broad surface; mutation retry needs a maintained patch" },
  { name: "agmmnn/notebooklm-sdk", score: 68, note: "Best TypeScript fit; weaker auth-replay and session controls" },
  { name: "vankcdhv/notebook-mcp", score: 60, note: "Good packaging; generic mutation retry and weaker readiness" },
];

export function SystemDesign() {
  return (
    <section className="system-section">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Technical design</span>
          <h1>A remote queue with a deliberately local trust boundary</h1>
          <p>
            AI Memory owns the user contract, frozen snapshot, deduplication, and truthful states. A local connector
            owns the Google session and exposes only four provider operations.
          </p>
        </div>
        <div className="decision-pill"><Check aria-hidden="true" /> Repository recommendation · 93/100</div>
      </div>

      <div className="architecture-card">
        <div className="architecture-header">
          <div><span className="section-kicker">End-to-end path</span><h2>One click, one durable request, one local create</h2></div>
          <span className="diagram-legend"><span /> Google authority stays local</span>
        </div>
        <div className="architecture-flow">
          <ArchitectureNode
            icon={Monitor}
            index="01"
            title="Item page"
            body="Sends item ID, idempotency key, and limited-capture confirmation only."
            footer="Same-origin session"
          />
          <ArchitectureArrow label="POST request" />
          <ArchitectureNode
            icon={Server}
            index="02"
            title="AI Memory server"
            body="Freezes the allowlisted text, binds the target, deduplicates, and owns status."
            footer="No Google credential"
          />
          <ArchitectureArrow label="Scoped claim" />
          <div className="local-boundary">
            <span className="boundary-label"><LockKeyhole aria-hidden="true" /> User’s device</span>
            <ArchitectureNode
              icon={Laptop}
              index="03"
              title="Local connector"
              body="Preferred product lane: narrow Chrome extension. Synthetic spike lane: controlled notebooklm-py worker. Both revalidate and send once."
              footer="Google authority contained on device"
              local
            />
            <ArchitectureArrow label="Private protocol" />
            <ArchitectureNode
              icon={BookOpen}
              index="04"
              title="Consumer NotebookLM"
              body="Creates a static source and reports processing status through an unofficial interface."
              footer="Undocumented surface"
              local
            />
          </div>
        </div>
        <div className="architecture-return">
          <RefreshCw aria-hidden="true" />
          <span><strong>Status returns by request ID.</strong> The item-page DTO never receives notebook IDs, source IDs, markers, Google errors, or connector credentials.</span>
        </div>
      </div>

      <div className="design-grid two-up">
        <article className="design-card">
          <div className="design-card__heading"><Code2 aria-hidden="true" /><div><span className="section-kicker">Owned adapter</span><h2>Four provider operations</h2></div></div>
          <div className="code-contract" aria-label="Provider adapter contract">
            <code><b>getTargetHealth</b>(binding)</code>
            <span>exact target · expected subject · sharing · headroom</span>
            <code><b>addCopiedText</b>(notebook, title, frozenText)</code>
            <span>one non-retried create → source identity</span>
            <code><b>listSourceTitles</b>(notebook)</code>
            <span>read-only marker reconciliation</span>
            <code><b>getSourceStatus</b>(notebook, source)</code>
            <span>processing · ready · failed</span>
          </div>
          <p className="card-footnote">Chat, sharing, notebook creation, research, audio, generic commands, and broad deletion remain unreachable.</p>
        </article>

        <article className="design-card write-policy-card">
          <div className="design-card__heading"><ShieldCheck aria-hidden="true" /><div><span className="section-kicker">Ambiguous-write policy</span><h2>Never make uncertainty worse</h2></div></div>
          <ol className="numbered-policy">
            <li><span>1</span><p>Perform one copied-text create with an opaque title marker.</p></li>
            <li><span>2</span><p>If the response may have been lost, issue no second create.</p></li>
            <li><span>3</span><p>List source titles and adopt exactly one marker match.</p></li>
            <li><span>4</span><p>Zero matches stays unresolved; multiple matches becomes conflict.</p></li>
          </ol>
          <div className="policy-callout"><TriangleAlert aria-hidden="true" /><span><strong>Exactly once is not provable.</strong> The honest guarantee is at most one automated create unless non-delivery is conclusive.</span></div>
        </article>
      </div>

      <div className="state-machine-card">
        <div className="design-card__heading"><CircleDot aria-hidden="true" /><div><span className="section-kicker">Persisted state model</span><h2>Truthful transitions by phase</h2></div></div>
        <div className="state-machine">
          <StateNode label="queued" tone="neutral" />
          <FlowArrow />
          <StateNode label="running" tone="info" />
          <FlowArrow />
          <StateNode label="processing" tone="info" />
          <FlowArrow />
          <StateNode label="succeeded" tone="success" />
          <div className="state-branch branch-one"><ArrowDown aria-hidden="true" /><span>possible write</span></div>
          <StateNode label="reconciling" tone="warning" className="state-reconciling" />
          <div className="branch-paths">
            <span><ArrowRight aria-hidden="true" /> one match → processing</span>
            <span><ArrowRight aria-hidden="true" /> zero → remain unresolved</span>
            <span><ArrowRight aria-hidden="true" /> multiple → conflict</span>
          </div>
        </div>
        <div className="auth-resume-row">
          <strong>Authentication resumes by interrupted phase</strong>
          <span><KeyRound aria-hidden="true" /> before send → queued</span>
          <span><KeyRound aria-hidden="true" /> possible write → reconciling</span>
          <span><KeyRound aria-hidden="true" /> readiness poll → processing</span>
        </div>
      </div>

      <div className="design-grid three-up">
        <article className="design-card compact-card">
          <div className="design-card__heading"><Database aria-hidden="true" /><div><span className="section-kicker">Durable ledger</span><h3>Server-owned records</h3></div></div>
          <ul className="check-list">
            <li><Check aria-hidden="true" /> Immutable target binding + version</li>
            <li><Check aria-hidden="true" /> Frozen minimized snapshot</li>
            <li><Check aria-hidden="true" /> Content hash + mapper version</li>
            <li><Check aria-hidden="true" /> Lease, attempts, safe diagnostics</li>
            <li><Check aria-hidden="true" /> Sealed provider references</li>
          </ul>
        </article>
        <article className="design-card compact-card">
          <div className="design-card__heading"><Cloud aria-hidden="true" /><div><span className="section-kicker">Browser endpoints</span><h3>Narrow and same-origin</h3></div></div>
          <div className="endpoint-list">
            <code>POST /items/:id/notebooklm-export</code>
            <code>GET /items/:id/notebooklm-export/:requestId</code>
            <code>GET /settings/notebooklm-export</code>
          </div>
          <p className="card-footnote">Bounded JSON · session auth · rate limited · no-store · unexpected fields rejected.</p>
        </article>
        <article className="design-card compact-card">
          <div className="design-card__heading"><LockKeyhole aria-hidden="true" /><div><span className="section-kicker">Connector authority</span><h3>Scoped device token</h3></div></div>
          <ul className="check-list">
            <li><Check aria-hidden="true" /> Claim eligible requests</li>
            <li><Check aria-hidden="true" /> Read frozen request payload</li>
            <li><Check aria-hidden="true" /> Append normalized events</li>
            <li><Check aria-hidden="true" /> Lease and fencing checks</li>
            <li><Check aria-hidden="true" /> No arbitrary item access</li>
          </ul>
        </article>
      </div>

      <div className="repository-card">
        <div className="repository-copy">
          <span className="section-kicker">Repository decision</span>
          <h2>Pin notebooklm-py v0.7.3 for one local feasibility spike—not the product connector</h2>
          <p>
            It is the only reviewed candidate combining the complete source lifecycle with an explicit
            non-idempotent/no-retry policy for copied-text creation. The integration remains unofficial and
            inherently breakable until Google publishes a supported consumer source-management API.
          </p>
          <div className="implementation-split">
            <span><strong>Product concept</strong>Narrow existing Chrome extension; browser-managed session; protocol port required.</span>
            <span><strong>Synthetic spike</strong>Pinned Python desktop worker; owner-only session vault; explicit revoke and purge.</span>
          </div>
          <div className="version-row"><code>notebooklm-py==0.7.3</code><span>commit a6c54417058b…</span></div>
        </div>
        <div className="score-table">
          {repositories.map((repository) => (
            <div key={repository.name} className={repository.score === 93 ? "is-winner" : ""}>
              <span><strong>{repository.name}</strong><small>{repository.note}</small></span>
              <div className="score-bar"><span style={{ width: `${repository.score}%` }} /></div>
              <b>{repository.score}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="evidence-boundary">
        <TriangleAlert aria-hidden="true" />
        <div><strong>Evidence boundary</strong><p>This design is based on source review and a 13-case credential-free state-model spike. It does not prove live consumer NotebookLM compatibility, session longevity, sharing inspection, capacity behavior, cancellation, cleanup, or production concurrency.</p></div>
      </div>
    </section>
  );
}

function ArchitectureNode({
  icon: Icon,
  index,
  title,
  body,
  footer,
  local = false,
}: {
  icon: typeof Monitor;
  index: string;
  title: string;
  body: string;
  footer: string;
  local?: boolean;
}) {
  return (
    <article className={`architecture-node${local ? " is-local" : ""}`}>
      <header><span>{index}</span><Icon aria-hidden="true" /></header>
      <h3>{title}</h3><p>{body}</p><small>{footer}</small>
    </article>
  );
}

function ArchitectureArrow({ label }: { label: string }) {
  return <div className="architecture-arrow"><span>{label}</span><ArrowRight aria-hidden="true" /></div>;
}

function StateNode({ label, tone, className = "" }: { label: string; tone: string; className?: string }) {
  return <div className={`state-node tone-${tone} ${className}`}>{label}</div>;
}

function FlowArrow() {
  return <ArrowRight className="flow-arrow" aria-hidden="true" />;
}
