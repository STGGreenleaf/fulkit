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
      const isDev = typeof window !== "undefined" && window.location.search.includes("auth=dev");
      return (
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
          {isDev && this.state.error && (
            <div style={{
              border: "1px solid #c44",
              background: "#2a2826",
              color: "#c44",
              padding: "8px",
              marginBottom: "8px",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
            }}>
              [MD Error] {this.state.error.message || String(this.state.error)}
            </div>
          )}
          {this.props.fallback || ""}
        </div>
      );
    }
    return this.props.children;
  }
}

const ListContext = createContext("ul");

// Detect if a string looks numeric (numbers, currency, percentages)
function looksNumeric(text) {
  if (typeof text !== "string") return false;
  return /^[\s$€£¥]?-?[\d,.]+%?\s*$/.test(text.trim());
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

  // Inline
  strong: ({ children }) => (
    <strong style={{ fontWeight: "var(--font-weight-semibold)" }}>{children}</strong>
  ),
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

  // Tables
  table: ({ children }) => (
    <div style={{ overflowX: "auto", marginTop: "var(--space-2)", marginBottom: "var(--space-2)" }}>
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "var(--font-size-sm)",
      }}>
        {children}
      </table>
    </div>
  ),
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

function MessageRendererInner({ content, isStreaming = false }) {
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

  return (
    <div style={{ overflowWrap: "break-word" }}>
      <MarkdownErrorBoundary fallback={sanitized}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {sanitized || ""}
        </ReactMarkdown>
      </MarkdownErrorBoundary>
    </div>
  );
}

export default memo(MessageRendererInner);
