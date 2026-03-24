"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createContext, useContext, useState, useRef, useEffect, memo, Component } from "react";
import { sanitizeEmoji } from "../lib/sanitize-emoji";

// Error boundary — if markdown rendering crashes, fall back to raw text
class MarkdownErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error) {
    console.error("[MessageRenderer] Render error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
          {this.props.fallback || ""}
        </div>
      );
    }
    return this.props.children;
  }
}

const ListContext = createContext("ul");
const FormContext = createContext(null);

// Shared form store — collects data across multiple tables in one message
const FormStoreContext = createContext(null);

function useFormStore() {
  return useContext(FormStoreContext);
}

// Detect if a cell value is blank/dash (fillable)
function isBlankCell(text) {
  if (!text || typeof text !== "string") return true;
  const t = text.trim();
  return !t || /^[—–\-_]+$/.test(t);
}

// Interactive table — detects fillable columns and renders input fields (no submit button)
function InteractiveTable({ children, onFormSubmit }) {
  const formStore = useFormStore();
  const [formData, setFormData] = useState({});
  const tableRef = useRef(null);
  const tableId = useRef(Math.random().toString(36).slice(2, 8));

  const [fillableCol, setFillableCol] = useState(-1);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!tableRef.current || !onFormSubmit) return;
    const table = tableRef.current;
    const ths = table.querySelectorAll("th");
    const trs = table.querySelectorAll("tbody tr");
    if (ths.length < 2 || trs.length === 0) return;

    const hdrs = Array.from(ths).map(th => th.textContent.trim());

    for (let col = 1; col < hdrs.length; col++) {
      let allBlank = true;
      trs.forEach(tr => {
        const td = tr.querySelectorAll("td")[col];
        if (td && !isBlankCell(td.textContent)) allBlank = false;
      });
      if (allBlank) {
        const rowLabels = [];
        trs.forEach(tr => {
          const firstTd = tr.querySelector("td:nth-child(2)") || tr.querySelector("td");
          rowLabels.push(firstTd?.textContent?.trim() || "");
        });
        setFillableCol(col);
        setHeaders(hdrs);
        setRows(rowLabels);
        if (formStore) formStore.register(tableId.current);
        return;
      }
    }
  }, [onFormSubmit, formStore]);

  // Sync form data to shared store
  useEffect(() => {
    if (!formStore || fillableCol === -1) return;
    const entries = rows
      .map((label, i) => ({ label, value: formData[i] }))
      .filter(e => e.value !== undefined && e.value !== "");
    formStore.update(tableId.current, entries);
  }, [formData, rows, fillableCol, formStore]);

  const submitted = formStore?.submitted;

  // Auto-focus first input (hooks must be before any early return)
  const formRef = useRef(null);
  useEffect(() => {
    if (formRef.current) {
      const first = formRef.current.querySelector("input");
      if (first) setTimeout(() => first.focus(), 100);
    }
  }, [fillableCol]);

  if (fillableCol === -1 || !onFormSubmit || submitted) {
    return (
      <div style={{ overflowX: "auto", marginTop: "var(--space-2)", marginBottom: "var(--space-2)" }}>
        <table ref={tableRef} style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
          {children}
        </table>
        {submitted && (
          <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginTop: "var(--space-1)" }}>
            Submitted
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={formRef} style={{ overflowX: "auto", marginTop: "var(--space-2)", marginBottom: "var(--space-2)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                fontWeight: "var(--font-weight-semibold)", background: "var(--color-bg-elevated)",
                padding: "var(--space-1) var(--space-2)", borderBottom: "1px solid var(--color-border)",
                textAlign: i === fillableCol ? "right" : "left", fontSize: "var(--font-size-sm)",
                whiteSpace: "nowrap", color: "var(--color-text)",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((label, i) => (
            <tr key={i}>
              {headers.map((_, col) => {
                if (col === 0) {
                  return <td key={col} style={{ padding: "var(--space-1) var(--space-2)", borderBottom: "1px solid var(--color-border-light)", fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)" }}>{label}</td>;
                }
                if (col === fillableCol) {
                  const isPriceCol = headers[col]?.toLowerCase().match(/price|cost|amount|rate|total/);
                  return (
                    <td key={col} style={{ padding: "2px var(--space-2)", borderBottom: "1px solid var(--color-border-light)" }}>
                      <input
                        type="text"
                        inputMode={isPriceCol ? "decimal" : "numeric"}
                        pattern={isPriceCol ? "[0-9.]*" : "[0-9]*"}
                        value={formData[i] ?? ""}
                        onChange={e => setFormData(prev => ({ ...prev, [i]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            // Focus next input or submit
                            const inputs = e.target.closest("table")?.querySelectorAll("input");
                            const arr = inputs ? Array.from(inputs) : [];
                            const idx = arr.indexOf(e.target);
                            if (idx < arr.length - 1) arr[idx + 1].focus();
                            else if (formStore?.submit) formStore.submit();
                          }
                        }}
                        placeholder={isPriceCol ? "0.00" : "—"}
                        style={{
                          width: 72, textAlign: "right", border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-sm)", padding: "var(--space-1-5) var(--space-2)",
                          fontSize: "var(--font-size-sm)", fontFamily: "var(--font-mono)",
                          background: "var(--color-bg)", color: "var(--color-text)", outline: "none",
                          minHeight: 32,
                        }}
                      />
                    </td>
                  );
                }
                return <td key={col} style={{ padding: "var(--space-1) var(--space-2)", borderBottom: "1px solid var(--color-border-light)", fontSize: "var(--font-size-sm)", color: "var(--color-text)" }}>{label}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Shared form store provider — wraps a message, collects data from all tables
function FormStoreProvider({ children, onFormSubmit }) {
  const [tables, setTables] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [registered, setRegistered] = useState(0);

  const store = useRef({
    register: (id) => setRegistered(prev => prev + 1),
    update: (id, entries) => setTables(prev => ({ ...prev, [id]: entries })),
    submitted: false,
    submit: () => {},
  });

  store.current.submitted = submitted;
  store.current.submit = () => {
    if (submitted || !onFormSubmit) return;
    const allEntries = Object.values(tables).flat().filter(e => e.value !== undefined && e.value !== "");
    if (allEntries.length === 0) return;
    const text = allEntries.map(e => `${e.label}: ${e.value}`).join(", ");
    onFormSubmit(text);
    setSubmitted(true);
  };

  return (
    <FormStoreContext.Provider value={store.current}>
      {children}
      {registered > 0 && !submitted && (() => {
        const filledCount = Object.values(tables).flat().filter(e => e.value !== undefined && e.value !== "").length;
        return (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
            {filledCount > 0 && (
              <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                {filledCount} item{filledCount !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={() => store.current.submit()}
              disabled={filledCount === 0}
              style={{
                padding: "var(--space-2-5) var(--space-5)",
                background: filledCount > 0 ? "var(--color-text)" : "var(--color-border)",
                color: "var(--color-bg)", border: "none",
                borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)",
                cursor: filledCount > 0 ? "pointer" : "default",
                minHeight: 40,
              }}
            >
              Submit
            </button>
          </div>
        );
      })()}
      {submitted && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>Submitted</span>
        </div>
      )}
    </FormStoreContext.Provider>
  );
}

// Detect if a cell value should right-align (numbers, currency, placeholders)
function looksNumeric(text) {
  if (typeof text !== "string") return false;
  const t = text.trim();
  if (!t) return false;
  // Placeholder dashes (—, –, -)
  if (/^[—–\-]+$/.test(t)) return true;
  // Number/currency: optional parens (accounting), optional +/- prefix,
  // optional currency symbol, digits, optional trailing % or unit + status symbol
  // Matches: "$1,234.56", "($15.00)", "+$4.35", "58 payments ▲", "$0 ✓", "59", "+2"
  return /^\(?[\s$€£¥+]?-?[\d,.]+\)?(%|\s*[a-zA-Z]*\s*[✓✗▲▼△▽↑↓✔✕]?)?$/.test(t);
}

// Extract text content from React children (for numeric detection in table cells)
function extractText(children) {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children?.props?.children) return extractText(children.props.children);
  return "";
}

const components = {
  // Headers — h1 rendered as h2 (too large for chat), h2 is the top level
  h1: ({ children }) => (
    <div style={{
      fontSize: "var(--font-size-lg)",
      fontWeight: "var(--font-weight-semibold)",
      letterSpacing: "var(--letter-spacing-wide)",
      borderBottom: "1px solid var(--color-border-light)",
      paddingBottom: "var(--space-2)",
      marginTop: "var(--space-3)",
      marginBottom: "var(--space-2)",
      lineHeight: "var(--line-height-tight)",
    }}>
      {children}
    </div>
  ),
  h2: ({ children }) => (
    <div style={{
      fontSize: "var(--font-size-lg)",
      fontWeight: "var(--font-weight-semibold)",
      letterSpacing: "var(--letter-spacing-wide)",
      borderBottom: "1px solid var(--color-border-light)",
      paddingBottom: "var(--space-2)",
      marginTop: "var(--space-3)",
      marginBottom: "var(--space-2)",
      lineHeight: "var(--line-height-tight)",
    }}>
      {children}
    </div>
  ),
  h3: ({ children }) => (
    <div style={{
      fontSize: "var(--font-size-md)",
      fontWeight: "var(--font-weight-semibold)",
      marginTop: "var(--space-2)",
      marginBottom: "var(--space-1)",
      lineHeight: "var(--line-height-snug)",
    }}>
      {children}
    </div>
  ),
  h4: ({ children }) => (
    <div style={{
      fontSize: "var(--font-size-base)",
      fontWeight: "var(--font-weight-semibold)",
      marginTop: "var(--space-2)",
      marginBottom: "var(--space-1)",
    }}>
      {children}
    </div>
  ),
  h5: ({ children }) => (
    <div style={{
      fontSize: "var(--font-size-base)",
      fontWeight: "var(--font-weight-semibold)",
      marginTop: "var(--space-1)",
      marginBottom: "var(--space-1)",
    }}>
      {children}
    </div>
  ),
  h6: ({ children }) => (
    <div style={{
      fontSize: "var(--font-size-base)",
      fontWeight: "var(--font-weight-medium)",
      marginTop: "var(--space-1)",
      marginBottom: "var(--space-1)",
      color: "var(--color-text-secondary)",
    }}>
      {children}
    </div>
  ),

  // Paragraphs
  p: ({ children }) => (
    <div style={{
      marginTop: 0,
      marginBottom: "var(--space-2)",
      lineHeight: "var(--line-height-relaxed)",
    }}>
      {children}
    </div>
  ),

  // Inline — bold text that acts as a section title (near end of paragraph,
  // followed only by ":" or nothing) renders as block to sit above tables/lists.
  strong: ({ children, node }) => {
    let isTitle = false;
    try {
      const siblings = node?.parent?.children;
      if (siblings) {
        const idx = siblings.indexOf(node);
        const after = siblings.slice(idx + 1);
        const trailingText = after
          .map((s) => (s.type === "text" ? s.value : ""))
          .join("")
          .trim();
        // Title if bold is near end and only ":" or nothing follows
        if (trailingText === "" || trailingText === ":") {
          // But not if bold is the ONLY thing in the paragraph (already on its own line)
          const before = siblings.slice(0, idx);
          const hasLeadingContent = before.some(
            (s) => (s.type === "text" && s.value.trim()) || s.type === "element"
          );
          isTitle = hasLeadingContent;
        }
      }
    } catch {}
    if (isTitle) {
      return (
        <strong style={{
          display: "block",
          fontWeight: "var(--font-weight-semibold)",
          marginTop: "var(--space-2)",
        }}>
          {children}
        </strong>
      );
    }
    return <strong style={{ fontWeight: "var(--font-weight-semibold)" }}>{children}</strong>;
  },
  em: ({ children }) => <em>{children}</em>,

  // Links — monochrome with subtle underline
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "var(--color-text)",
        textDecoration: "underline",
        textDecorationColor: "var(--color-border)",
        textUnderlineOffset: "2px",
      }}
    >
      {children}
    </a>
  ),

  // Lists
  ul: ({ children }) => (
    <ListContext.Provider value="ul">
      <ul style={{
        listStyle: "none",
        paddingLeft: "var(--space-4)",
        marginTop: 0,
        marginBottom: "var(--space-2)",
      }}>
        {children}
      </ul>
    </ListContext.Provider>
  ),
  ol: ({ children }) => (
    <ListContext.Provider value="ol">
      <ol style={{
        listStyle: "none",
        paddingLeft: "var(--space-4)",
        marginTop: 0,
        marginBottom: "var(--space-2)",
      }}>
        {children}
      </ol>
    </ListContext.Provider>
  ),
  li: function ListItem({ children, node }) {
    const listType = useContext(ListContext);
    // For ordered lists, derive index from position among siblings
    let index = null;
    if (listType === "ol" && node) {
      const siblings = node.parent?.children?.filter(c => c.tagName === "li") || [];
      index = siblings.indexOf(node) + 1;
      if (index < 1) index = 1;
    }
    return (
      <li style={{
        position: "relative",
        paddingLeft: "var(--space-3)",
        marginBottom: "var(--space-1)",
        lineHeight: "var(--line-height-relaxed)",
      }}>
        <span style={{
          position: "absolute",
          left: 0,
          color: "var(--color-text-muted)",
          ...(listType === "ol"
            ? { fontFamily: "var(--font-mono)", fontSize: "var(--font-size-2xs)", top: "2px" }
            : {}),
        }}>
          {listType === "ol" ? `${index}.` : "·"}
        </span>
        {children}
      </li>
    );
  },

  // Tables — interactive when FormContext has a callback
  table: ({ children }) => {
    const onFormSubmit = useContext(FormContext);
    return (
      <InteractiveTable onFormSubmit={onFormSubmit}>
        {children}
      </InteractiveTable>
    );
  },
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => {
    const text = extractText(children);
    const isNum = looksNumeric(text);
    return (
      <th style={{
        fontWeight: "var(--font-weight-semibold)",
        background: "var(--color-bg-elevated)",
        padding: "var(--space-1) var(--space-2)",
        borderBottom: "1px solid var(--color-border)",
        textAlign: isNum ? "right" : "left",
        fontSize: "var(--font-size-sm)",
        whiteSpace: "nowrap",
        color: "var(--color-text)",
      }}>
        {children}
      </th>
    );
  },
  td: ({ children }) => {
    const text = extractText(children);
    const isNum = looksNumeric(text);
    return (
      <td style={{
        padding: "var(--space-1) var(--space-2)",
        borderBottom: "1px solid var(--color-border-light)",
        fontSize: "var(--font-size-sm)",
        textAlign: isNum ? "right" : "left",
        color: "var(--color-text)",
      }}>
        {children}
      </td>
    );
  },

  // Code
  code: ({ children, className, node, ...props }) => {
    // If inside a <pre>, this is a code block — just render the code
    const isBlock = node?.parent?.tagName === "pre" || className?.startsWith("language-");
    if (isBlock) {
      return (
        <code style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--font-size-sm)",
          lineHeight: "var(--line-height-normal)",
        }}>
          {children}
        </code>
      );
    }
    // Inline code
    return (
      <code style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.9em",
        background: "var(--color-bg-alt)",
        padding: "1px 5px",
        borderRadius: "var(--radius-xs)",
        color: "var(--color-text)",
      }}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre style={{
      background: "var(--color-bg-alt)",
      border: "1px solid var(--color-border-light)",
      borderRadius: "var(--radius-sm)",
      padding: "var(--space-3)",
      overflowX: "auto",
      fontSize: "var(--font-size-sm)",
      lineHeight: "var(--line-height-normal)",
      marginTop: "var(--space-2)",
      marginBottom: "var(--space-2)",
    }}>
      {children}
    </pre>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: "2px solid var(--color-border)",
      paddingLeft: "var(--space-3)",
      margin: "var(--space-2) 0",
      color: "var(--color-text-secondary)",
    }}>
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => (
    <hr style={{
      border: "none",
      borderTop: "1px solid var(--color-border-light)",
      margin: "var(--space-3) 0",
    }} />
  ),

  // Images — suppressed in chat
  img: () => null,
};

function MessageRendererInner({ content, isStreaming = false, onFormSubmit = null }) {
  const [displayContent, setDisplayContent] = useState(content);
  const contentRef = useRef(content);
  const rafRef = useRef(null);

  useEffect(() => {
    contentRef.current = content;
    if (!isStreaming) {
      setDisplayContent(content);
      return;
    }
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        setDisplayContent(contentRef.current);
        rafRef.current = null;
      });
    }
  }, [content, isStreaming]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const sanitized = sanitizeEmoji(displayContent);

  const inner = (
    <FormContext.Provider value={onFormSubmit}>
      <div style={{ overflowWrap: "break-word" }}>
        <MarkdownErrorBoundary fallback={sanitized}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {sanitized || ""}
          </ReactMarkdown>
        </MarkdownErrorBoundary>
      </div>
    </FormContext.Provider>
  );

  if (onFormSubmit) {
    return <FormStoreProvider onFormSubmit={onFormSubmit}>{inner}</FormStoreProvider>;
  }
  return inner;
}

export default memo(MessageRendererInner);
