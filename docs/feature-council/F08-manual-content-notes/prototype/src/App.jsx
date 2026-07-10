import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  Bold,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CirclePlus,
  CloudOff,
  Code2,
  FileText,
  Heading2,
  Italic,
  Library,
  Link as LinkIcon,
  List,
  ListOrdered,
  LoaderCircle,
  LockKeyhole,
  MessageSquare,
  MoreHorizontal,
  Quote,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";

const INITIAL_HTML = `
  <h2>Why this matters</h2>
  <p>A trustworthy knowledge system should make the boundary between <strong>source material</strong>, AI interpretation, and my own thinking unmistakable.</p>
  <h2>Ideas to try</h2>
  <ul>
    <li>Keep manual notes private by default.</li>
    <li>Index them for search without mixing them into the source text.</li>
    <li>Show exactly when the latest edit was saved.</li>
  </ul>
  <blockquote>Trust grows when the system explains what it saved and where it came from.</blockquote>
`;

const CLOUD_HTML = `
  <h2>Earlier version</h2>
  <p>Keep personal interpretation separate from the AI-generated digest.</p>
  <ul><li>Make save state visible.</li><li>Support Markdown export.</li></ul>
`;

const NOTE_KEY = "ai-brain-f08-prototype-note-v2";

function htmlToMarkdown(html) {
  return html
    .replace(/<h2>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i>(.*?)<\/i>/gi, "*$1*")
    .replace(/<blockquote>(.*?)<\/blockquote>/gi, "> $1\n\n")
    .replace(/<li>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<\/(ul|ol)>/gi, "\n")
    .replace(/<(ul|ol)>/gi, "")
    .replace(/<p>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trimStart())
    .join("\n")
    .trim();
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  let inList = false;
  let html = "";
  const inline = (text) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  lines.forEach((line) => {
    if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${inline(line.slice(2))}</li>`;
      return;
    }
    if (inList) {
      html += "</ul>";
      inList = false;
    }
    if (line.startsWith("### ")) html += `<h3>${inline(line.slice(4))}</h3>`;
    else if (line.startsWith("## ")) html += `<h2>${inline(line.slice(3))}</h2>`;
    else if (line.startsWith("> ")) html += `<blockquote>${inline(line.slice(2))}</blockquote>`;
    else if (line.trim()) html += `<p>${inline(line)}</p>`;
  });
  if (inList) html += "</ul>";
  return html || "<p></p>";
}

function Sidebar() {
  const items = [
    { label: "Library", icon: Library, active: true },
    { label: "Needs Upgrade", icon: AlertTriangle },
    { label: "Ask", icon: MessageSquare },
    { label: "Settings", icon: Settings },
  ];
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="brand">
        <img src="/ai-memory-logo.png" alt="" width="32" height="32" />
        <div>
          <strong>AI Memory</strong>
          <span>v0.6.2 · private memory</span>
        </div>
      </div>
      <button className="collapse-button" type="button"><span>Navigation</span><ChevronDown size={15} /></button>
      <button className="search-button" type="button">
        <Search size={16} />
        <span>Search</span>
        <kbd>⌘K</kbd>
      </button>
      <button className="capture-button" type="button"><CirclePlus size={16} /> Capture</button>
      <nav>
        {items.map(({ label, icon: Icon, active, soon }) => (
          <button className={`nav-item ${active ? "active" : ""}`} key={label} type="button" disabled={soon}>
            <Icon size={16} strokeWidth={2} />
            <span>{label}</span>
            {soon && <small>soon</small>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function Topbar({ menuOpen, setMenuOpen, setStatus, setOnline, status, clearNote }) {
  return (
    <header className="topbar">
      <button type="button" className="icon-button mobile-back" aria-label="Back to item">
        <ArrowLeft size={18} />
      </button>
      <div className="breadcrumbs">
        <span>Library</span>
        <span>/</span>
        <strong>Building a second brain that earns your trust</strong>
      </div>
      <strong className="mobile-title">Back to Library</strong>
      <div className="topbar-actions">
        <button
          type="button"
          className="icon-button"
          aria-label="More note actions"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal size={18} />
        </button>
        {menuOpen && (
          <div className="menu" role="menu">
            <button type="button" role="menuitem"><FileText size={15} /> Export note as Markdown</button>
            <button type="button" role="menuitem" onClick={clearNote}><RotateCcw size={15} /> Clear note</button>
            <div className="menu-divider" />
            <p>Prototype state preview</p>
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={status === "offline"}
              onClick={() => {
                setOnline(status === "offline");
                setStatus(status === "offline" ? "saved" : "offline");
                setMenuOpen(false);
              }}
            >
              <CloudOff size={15} /> {status === "offline" ? "Go back online" : "Preview offline"}
            </button>
            <button type="button" role="menuitem" onClick={() => { setStatus("error"); setMenuOpen(false); }}>
              <CircleAlert size={15} /> Preview save error
            </button>
            <button type="button" role="menuitem" onClick={() => { setStatus("conflict"); setMenuOpen(false); }}>
              <TriangleAlert size={15} /> Preview sync conflict
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function ArticlePane({ mobileActive }) {
  return (
    <article className={`article-pane ${mobileActive ? "mobile-active" : ""}`}>
      <button type="button" className="back-link"><ArrowLeft size={14} /> Back to Library</button>
      <header className="article-header">
        <div className="source-chip"><StickyNote size={14} /> Article</div>
        <h1>Building a second brain that earns your trust</h1>
        <p>Web article · Full text · captured today · 8 min read</p>
      </header>
      <div className="article-copy">
        <p>A personal knowledge system becomes valuable when it helps you return to ideas, connect them, and add your own point of view without obscuring where each thought came from.</p>
        <h2>Separate the layers of knowledge</h2>
        <p>Source material, machine-generated interpretation, and personal reflection serve different purposes. Keeping them visibly distinct makes the system easier to trust while still allowing all three layers to participate in search and retrieval.</p>
        <p>Manual notes are the most deliberate layer. They record questions, disagreements, decisions, and connections that an automatic summary cannot know.</p>
        <h2>Saving should feel boring</h2>
        <p>People should be able to think without monitoring a save button. The interface can make autosave dependable and quiet, then become explicit only when something needs attention.</p>
      </div>
    </article>
  );
}

function DigestPane() {
  return (
    <div className="digest-pane">
      <div className="eyebrow"><Sparkles size={15} /> AI-generated</div>
      <h2>Digest</h2>
      <p className="digest-summary">A reliable personal knowledge system keeps original material, AI interpretation, and the user’s own notes clearly separated while making every layer searchable.</p>
      <section>
        <h3>Key ideas</h3>
        <ul>
          <li>Provenance is part of the product experience.</li>
          <li>Manual notes capture decisions and personal context.</li>
          <li>Autosave should be quiet until attention is required.</li>
        </ul>
      </section>
      <p className="ai-disclaimer">This summary was generated by AI and may contain mistakes.</p>
    </div>
  );
}

function UtilityPane({ type }) {
  if (type === "ask") {
    return (
      <div className="utility-pane">
        <div className="utility-icon"><MessageSquare size={20} /></div>
        <h2>Ask this item</h2>
        <p>Ask questions using this saved source as the active scope.</p>
        <button type="button" className="utility-primary">Open scoped Ask</button>
      </div>
    );
  }
  if (type === "related") {
    return (
      <div className="utility-pane">
        <h2>Related sources</h2>
        <p>Three nearby ideas were found using semantic similarity.</p>
        <div className="related-card"><strong>Provenance in personal AI</strong><span>Article · 88% related</span></div>
        <div className="related-card"><strong>Designing calm autosave</strong><span>Note · 81% related</span></div>
        <div className="related-card"><strong>Local-first writing tools</strong><span>PDF · 76% related</span></div>
      </div>
    );
  }
  return (
    <div className="utility-pane">
      <h2>Details</h2>
      <dl className="details-list">
        <div><dt>Platform</dt><dd>Web</dd></div>
        <div><dt>Quality</dt><dd>Full text</dd></div>
        <div><dt>Captured</dt><dd>Today</dd></div>
        <div><dt>Visibility</dt><dd>Private</dd></div>
      </dl>
      <section><h3>Tags</h3><div className="tag-row"><span>knowledge systems</span><span>product trust</span></div></section>
    </div>
  );
}

function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Primary mobile">
      <button type="button" className="active"><Library size={20} /><span>Library</span></button>
      <button type="button" className="capture-nav"><CirclePlus size={25} /><span>Capture</span></button>
      <button type="button"><MessageSquare size={20} /><span>Ask</span></button>
      <button type="button"><MoreHorizontal size={20} /><span>More</span></button>
    </nav>
  );
}

function SaveStatus({ status }) {
  const state = {
    saved: { icon: CheckCircle2, label: "Saved just now" },
    saving: { icon: LoaderCircle, label: "Saving…" },
    offline: { icon: CloudOff, label: "Offline · saved on this device" },
    error: { icon: CircleAlert, label: "Couldn’t save" },
    conflict: { icon: TriangleAlert, label: "Sync conflict" },
  }[status];
  const Icon = state.icon;
  return (
    <span className={`save-status ${status}`} role="status" aria-live="polite">
      <Icon size={14} className={status === "saving" ? "spin" : ""} />
      {state.label}
    </span>
  );
}

function ToolButton({ label, icon: Icon, onClick, active = false, secondary = false }) {
  return (
    <button
      type="button"
      className={`tool-button ${active ? "active" : ""} ${secondary ? "secondary-tool" : ""}`}
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <Icon size={17} strokeWidth={2} />
    </button>
  );
}

function EditorPane({
  editorHtml,
  setEditorHtml,
  markdown,
  setMarkdown,
  mode,
  setMode,
  status,
  markDirty,
  manualSave,
  openConflict,
}) {
  const editorRef = useRef(null);
  const savedRange = useRef(null);
  const [linkOpen, setLinkOpen] = useState(false);

  const run = (command, value) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setEditorHtml(editorRef.current?.innerHTML || "<p></p>");
    markDirty();
  };

  const openLink = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount) savedRange.current = selection.getRangeAt(0).cloneRange();
    setLinkOpen(true);
  };

  const addLink = (url) => {
    const selection = window.getSelection();
    if (savedRange.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    if (selection?.toString()) document.execCommand("createLink", false, url);
    else document.execCommand("insertHTML", false, `<a href="${url}">${url}</a>`);
    setEditorHtml(editorRef.current?.innerHTML || editorHtml);
    markDirty();
    setLinkOpen(false);
  };

  const switchMode = (nextMode) => {
    if (nextMode === mode) return;
    if (nextMode === "markdown") setMarkdown(htmlToMarkdown(editorRef.current?.innerHTML || editorHtml));
    else setEditorHtml(markdownToHtml(markdown));
    setMode(nextMode);
  };

  return (
    <div className="editor-pane">
      {status === "offline" && (
        <div className="state-banner warning" role="status">
          <CloudOff size={17} />
          <div><strong>You’re offline</strong><span>Keep writing. Changes are stored on this device and will sync when you reconnect.</span></div>
        </div>
      )}
      {status === "error" && (
        <div className="state-banner danger" role="alert">
          <CircleAlert size={17} />
          <div><strong>Your latest changes aren’t synced</strong><span>Nothing was lost. Check your connection, then retry.</span></div>
          <button type="button" onClick={manualSave}>Retry</button>
        </div>
      )}
      {status === "conflict" && (
        <div className="state-banner danger" role="alert">
          <TriangleAlert size={17} />
          <div><strong>This note changed on another device</strong><span>Review both versions before choosing what to keep.</span></div>
          <button type="button" onClick={openConflict}>Review</button>
        </div>
      )}

      <div className="editor-head">
        <div>
          <div className="privacy-line"><LockKeyhole size={14} /> Private manual note</div>
          <h2>My notes</h2>
        </div>
        <div className="editor-actions">
          <SaveStatus status={status} />
          <button type="button" className="save-button" onClick={manualSave} disabled={status === "saving"}>
            <Save size={15} /> Save
          </button>
        </div>
      </div>

      <div className="format-area">
        <div className="mode-switch" aria-label="Editor mode">
          <button type="button" className={mode === "visual" ? "active" : ""} onClick={() => switchMode("visual")}>Write</button>
          <button type="button" className={mode === "markdown" ? "active" : ""} onClick={() => switchMode("markdown")}><Code2 size={14} /> Markdown</button>
        </div>
        <div className="toolbar" role="toolbar" aria-label="Format manual note">
          <ToolButton label="Heading 2" icon={Heading2} onClick={() => run("formatBlock", "H2")} />
          <ToolButton label="Bold (Command B)" icon={Bold} onClick={() => run("bold")} />
          <ToolButton label="Italic (Command I)" icon={Italic} onClick={() => run("italic")} />
          <span className="tool-divider" />
          <ToolButton label="Bulleted list" icon={List} onClick={() => run("insertUnorderedList")} />
          <ToolButton label="Numbered list" icon={ListOrdered} onClick={() => run("insertOrderedList")} />
          <ToolButton label="Quote" icon={Quote} secondary onClick={() => run("formatBlock", "BLOCKQUOTE")} />
          <ToolButton label="Add link" icon={LinkIcon} secondary onClick={openLink} />
          <span className="tool-divider secondary-tool" />
          <ToolButton label="Undo" icon={Undo2} secondary onClick={() => run("undo")} />
          <ToolButton label="Redo" icon={Redo2} secondary onClick={() => run("redo")} />
        </div>
      </div>

      <div className="editor-canvas">
        {mode === "visual" ? (
          <div
            ref={editorRef}
            className="rich-editor"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Manual note"
            aria-multiline="true"
            data-placeholder="Write what you want to remember…"
            dangerouslySetInnerHTML={{ __html: editorHtml }}
            onInput={(event) => {
              setEditorHtml(event.currentTarget.innerHTML);
              markDirty();
            }}
          />
        ) : (
          <textarea
            className="markdown-editor"
            aria-label="Manual note Markdown source"
            value={markdown}
            onChange={(event) => {
              setMarkdown(event.target.value);
              markDirty();
            }}
            spellCheck="true"
          />
        )}
      </div>

      <footer className="editor-footer">
        <span>Markdown shortcuts supported</span>
        <span>Manual notes are searchable and kept separate from AI content.</span>
      </footer>

      {linkOpen && <LinkDialog onClose={() => setLinkOpen(false)} onAdd={addLink} />}
    </div>
  );
}

function LinkDialog({ onClose, onAdd }) {
  const [url, setUrl] = useState("https://");
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="link-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-header">
          <h2 id="link-title">Add link</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close link dialog"><X size={18} /></button>
        </div>
        <label htmlFor="link-url">URL</label>
        <input id="link-url" value={url} onChange={(event) => setUrl(event.target.value)} autoFocus />
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-button" onClick={() => onAdd(url)} disabled={!/^https?:\/\//.test(url)}>Add link</button>
        </div>
      </div>
    </div>
  );
}

function ConflictDialog({ onClose, onResolve }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
        <div className="dialog-header">
          <div>
            <p className="dialog-eyebrow"><TriangleAlert size={14} /> Sync conflict</p>
            <h2 id="conflict-title">Choose which version to keep</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close conflict dialog"><X size={18} /></button>
        </div>
        <p className="dialog-copy">We paused syncing so neither version is overwritten. You can keep this device’s latest note or restore the cloud version.</p>
        <div className="version-list">
          <button type="button" onClick={() => onResolve("mine")}>
            <span><strong>This device</strong><small>Edited just now · latest</small></span>
            <span className="version-action">Keep mine</span>
          </button>
          <button type="button" onClick={() => onResolve("cloud")}>
            <span><strong>Cloud version</strong><small>Edited 12 minutes ago</small></span>
            <span className="version-action">Use cloud</span>
          </button>
        </div>
        <p className="conflict-footnote">The version you don’t choose stays in revision history for 30 days.</p>
      </div>
    </div>
  );
}

export function App() {
  const [editorHtml, setEditorHtml] = useState(() => localStorage.getItem(NOTE_KEY) || INITIAL_HTML);
  const [markdown, setMarkdown] = useState(() => htmlToMarkdown(localStorage.getItem(NOTE_KEY) || INITIAL_HTML));
  const [mode, setMode] = useState("visual");
  const [activeTab, setActiveTab] = useState("notes");
  const [mobileView, setMobileView] = useState("notes");
  const [status, setStatus] = useState("saved");
  const [dirty, setDirty] = useState(false);
  const [online, setOnline] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [toast, setToast] = useState("");

  const currentDocument = useMemo(
    () => (mode === "visual" ? editorHtml : markdownToHtml(markdown)),
    [editorHtml, markdown, mode],
  );

  useEffect(() => {
    if (!dirty || status === "conflict" || status === "error") return undefined;
    if (!online || status === "offline") {
      localStorage.setItem(NOTE_KEY, currentDocument);
      setStatus("offline");
      return undefined;
    }
    let finishTimer;
    const startTimer = window.setTimeout(() => {
      setStatus("saving");
      finishTimer = window.setTimeout(() => {
        localStorage.setItem(NOTE_KEY, currentDocument);
        setStatus("saved");
        setDirty(false);
      }, 550);
    }, 700);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(finishTimer);
    };
  }, [currentDocument, dirty, online, status]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        manualSave();
      }
      if (event.key === "Escape") {
        setMenuOpen(false);
        setConflictOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const markDirty = () => {
    setDirty(true);
    if (status === "saved" || status === "saving") setStatus(online ? "saving" : "offline");
  };

  const manualSave = () => {
    if (status === "conflict") {
      setConflictOpen(true);
      return;
    }
    if (!online || status === "offline") {
      localStorage.setItem(NOTE_KEY, currentDocument);
      setStatus("offline");
      setToast("Saved on this device. It will sync when you’re online.");
      return;
    }
    setStatus("saving");
    window.setTimeout(() => {
      localStorage.setItem(NOTE_KEY, currentDocument);
      setDirty(false);
      setStatus("saved");
      setToast("Manual note saved");
    }, 500);
  };

  const clearNote = () => {
    setEditorHtml("<p></p>");
    setMarkdown("");
    setDirty(true);
    setMenuOpen(false);
  };

  const resolveConflict = (choice) => {
    const resolvedHtml = choice === "cloud" ? CLOUD_HTML : currentDocument;
    setEditorHtml(resolvedHtml);
    setMarkdown(htmlToMarkdown(resolvedHtml));
    localStorage.setItem(NOTE_KEY, resolvedHtml);
    setConflictOpen(false);
    setDirty(false);
    setStatus("saved");
    setToast(choice === "cloud" ? "Cloud version restored" : "Your version is now current");
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-shell">
        <Topbar
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          setStatus={setStatus}
          setOnline={setOnline}
          status={status}
          clearNote={clearNote}
        />
        <div className="mobile-switcher" role="tablist" aria-label="Item sections">
          {[
            ["article", "Original"],
            ["digest", "Digest"],
            ["ask", "Ask"],
            ["related", "Related"],
            ["details", "Details"],
            ["notes", "Notes"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mobileView === id}
              className={mobileView === id ? "active" : ""}
              onClick={() => {
                setMobileView(id);
                if (id !== "article") setActiveTab(id);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="workspace">
          <ArticlePane mobileActive={mobileView === "article"} />
          <section className={`notes-panel ${mobileView !== "article" ? "mobile-active" : ""}`} aria-label="Item companion panel">
            <div className="panel-tabs" role="tablist" aria-label="Item companion">
              <button type="button" role="tab" aria-selected={activeTab === "digest"} className={activeTab === "digest" ? "active" : ""} onClick={() => setActiveTab("digest")}><Sparkles size={15} /> AI digest</button>
              <button type="button" role="tab" aria-selected={activeTab === "notes"} className={activeTab === "notes" ? "active" : ""} onClick={() => setActiveTab("notes")}><StickyNote size={15} /> My notes</button>
            </div>
            {activeTab === "digest" ? <DigestPane /> : activeTab === "ask" || activeTab === "related" || activeTab === "details" ? (
              <UtilityPane type={activeTab} />
            ) : (
              <EditorPane
                editorHtml={editorHtml}
                setEditorHtml={setEditorHtml}
                markdown={markdown}
                setMarkdown={setMarkdown}
                mode={mode}
                setMode={setMode}
                status={status}
                markDirty={markDirty}
                manualSave={manualSave}
                openConflict={() => setConflictOpen(true)}
              />
            )}
          </section>
        </div>
        <MobileBottomNav />
      </main>
      {conflictOpen && <ConflictDialog onClose={() => setConflictOpen(false)} onResolve={resolveConflict} />}
      {toast && <div className="toast" role="status"><Check size={16} /> {toast}</div>}
    </div>
  );
}
