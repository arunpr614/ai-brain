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

export function SystemDesign() {
  return (
    <section className="system-section">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Technical design</span>
          <h1>A remote queue with a deliberately local trust boundary</h1>
          <p>
            AI Memory owns the user contract, frozen snapshot, deduplication, and truthful states. A local connector
            owns the Google session and exposes only the implemented inspect/create adapter boundary.
          </p>
        </div>
        <div className="decision-pill"><Check aria-hidden="true" /> Implemented candidate · Chrome MV3</div>
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
              body="Narrow Chrome MV3 extension: exact target data stays local, every claim is revalidated, and create is dispatched at most once."
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
          <span><strong>Status returns by request ID.</strong> The item-page DTO never receives notebook IDs, source IDs, markers, raw Google/provider errors, or connector credentials.</span>
        </div>
      </div>

      <div className="design-grid two-up">
        <article className="design-card">
          <div className="design-card__heading"><Code2 aria-hidden="true" /><div><span className="section-kicker">Owned adapter</span><h2>Two provider methods, three claim actions</h2></div></div>
          <div className="code-contract" aria-label="Provider adapter contract">
            <code><b>inspectTarget</b>(notebookId, authUser)</code>
            <span>subject · owner-private sharing · occupancy · sources/status</span>
            <code><b>addCopiedText</b>(session, notebookId, title, text)</code>
            <span>one non-retried create → source identity</span>
            <code><b>claim.action</b> = create | reconcile | poll</code>
            <span>reconcile and poll invoke inspection only; no create fallback</span>
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
          <StateNode label="leased:create → sending" tone="info" />
          <FlowArrow />
          <StateNode label="processing" tone="info" />
          <FlowArrow />
          <StateNode label="succeeded → ready DTO" tone="success" />
          <div className="state-branch branch-one"><ArrowDown aria-hidden="true" /><span>possible write</span></div>
          <StateNode label="reconciling" tone="warning" className="state-reconciling" />
          <div className="branch-paths">
            <span><ArrowRight aria-hidden="true" /> one match → processing</span>
            <span><ArrowRight aria-hidden="true" /> zero → reconciliation_required</span>
            <span><ArrowRight aria-hidden="true" /> multiple → duplicate_conflict</span>
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
          <div className="design-card__heading"><Cloud aria-hidden="true" /><div><span className="section-kicker">Item + settings API</span><h3>Actual same-origin routes</h3></div></div>
          <div className="endpoint-list">
            <code>GET · POST · PATCH · DELETE</code>
            <code>/api/items/:id/notebooklm-export</code>
            <code>GET · POST · PATCH · DELETE</code>
            <code>/api/settings/notebooklm-export</code>
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
          <span className="section-kicker">Connector API</span>
          <h2>The implemented Chrome connector has four narrow server routes</h2>
          <p>
            A scoped device token can exchange a short pairing code, bind one verified target fingerprint, claim
            eligible work, and append normalized fenced events. It cannot fetch arbitrary AI Memory items.
          </p>
          <div className="implementation-split">
            <span><strong>Exchange + bind</strong><code>/api/notebooklm/connectors/exchange</code><br /><code>/api/notebooklm/connector/bind</code></span>
            <span><strong>Claim + events</strong><code>/api/notebooklm/connector/claim</code><br /><code>/api/notebooklm/connector/requests/:id/events</code></span>
          </div>
          <div className="version-row"><code>x-notebooklm-connector-protocol: 1</code><span>bounded JSON · leases · epoch fencing</span></div>
        </div>
        <div className="score-table">
          <div className="is-winner"><span><strong>Local-only target</strong><small>Exact URL, authuser route, notebook title, and raw provider IDs stay in Chrome.</small></span><b>01</b></div>
          <div><span><strong>Generic server view</strong><small>Private NotebookLM target, fingerprints, safe capacity, and sealed aliases.</small></span><b>02</b></div>
          <div><span><strong>Content-free journal</strong><small>Crash recovery records markers and aliases, never the title or body.</small></span><b>03</b></div>
          <div><span><strong>No remote-delete lane</strong><small>Stop checking purges temporary content and makes no deletion claim.</small></span><b>04</b></div>
        </div>
      </div>

      <div className="evidence-boundary">
        <TriangleAlert aria-hidden="true" />
        <div><strong>Evidence boundary</strong><p>This handoff is aligned to the implemented candidate, migration 026, and current API contracts. It does not prove production deployment, a signed-in private canary, or future compatibility with NotebookLM’s undocumented consumer RPC surface.</p></div>
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
