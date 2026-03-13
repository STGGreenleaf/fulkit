"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { saveChapter, loadChapters, clearSandbox as clearSandboxIDB } from "./vault-idb";
import { extractArtifacts } from "./vault-writeback";

const SandboxContext = createContext(null);

const CHAPTER_TURN_LIMIT = 20;
const LS_KEY = "fulkit-sandbox-state";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Summarize a chapter's messages into a compact representation (<2K tokens target)
function summarizeChapter(chapter) {
  const summary = {
    id: chapter.id,
    turnCount: chapter.turnCount,
    closedAt: new Date().toISOString(),
    userIntents: [],
    assistantDecisions: [],
    extractedNotes: chapter.extractedNotes || [],
    pinnedIds: chapter.pinnedIds || [],
  };

  for (const msg of chapter.messages) {
    if (msg.role === "user") {
      // First 100 chars of each user message
      summary.userIntents.push(msg.content.slice(0, 100));
    } else if (msg.role === "assistant" && typeof msg.content === "string") {
      // Extract key decisions and bullet points from assistant
      const lines = msg.content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.match(/^\d+\./)) {
          if (summary.assistantDecisions.length < 10) {
            summary.assistantDecisions.push(trimmed.slice(0, 150));
          }
        }
      }
    }
  }

  return summary;
}

function createChapter() {
  return {
    id: generateId(),
    messages: [],
    turnCount: 0,
    extractedNotes: [],
    pinnedIds: [],
    startedAt: new Date().toISOString(),
  };
}

export function SandboxProvider({ children }) {
  const [sandboxActive, setSandboxActive] = useState(false);
  const [sandboxId, setSandboxId] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [sandboxNotes, setSandboxNotes] = useState([]);
  const [chapterToast, setChapterToast] = useState(null);
  const toastTimerRef = useRef(null);
  const initializedRef = useRef(false);

  // ─── Restore from localStorage on mount ────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (!stored) return;
      const state = JSON.parse(stored);
      if (state.sandboxActive && state.sandboxId) {
        setSandboxActive(true);
        setSandboxId(state.sandboxId);
        setCurrentChapter(state.currentChapter || createChapter());
        setSandboxNotes(state.sandboxNotes || []);
        // Load chapter summaries from IDB
        loadChapters(state.sandboxId).then((saved) => {
          if (saved?.length) setChapters(saved);
        }).catch(() => {});
      }
    } catch {}
  }, []);

  // ─── Persist to localStorage on state change ───────────────
  useEffect(() => {
    if (!initializedRef.current) return;
    try {
      if (sandboxActive && sandboxId) {
        localStorage.setItem(LS_KEY, JSON.stringify({
          sandboxActive,
          sandboxId,
          currentChapter,
          sandboxNotes,
        }));
      } else {
        localStorage.removeItem(LS_KEY);
      }
    } catch {}
  }, [sandboxActive, sandboxId, currentChapter, sandboxNotes]);

  // ─── Start sandbox ─────────────────────────────────────────
  const startSandbox = useCallback(() => {
    const id = generateId();
    const chapter = createChapter();
    setSandboxId(id);
    setSandboxActive(true);
    setChapters([]);
    setCurrentChapter(chapter);
    setSandboxNotes([]);
  }, []);

  // ─── Close current chapter ─────────────────────────────────
  const closeChapter = useCallback(async () => {
    if (!currentChapter || !sandboxId) return;

    const summary = summarizeChapter(currentChapter);

    // Persist to IDB
    try {
      await saveChapter(sandboxId, summary);
    } catch (err) {
      console.error("[sandbox] Failed to save chapter:", err.message);
    }

    setChapters((prev) => [...prev, summary]);

    // Start new chapter — carry forward pinned messages
    const newChapter = createChapter();
    const pinnedMsgs = currentChapter.messages.filter(
      (m) => currentChapter.pinnedIds.includes(m.id || m._ts)
    );
    if (pinnedMsgs.length > 0) {
      newChapter.messages = pinnedMsgs.map((m) => ({ ...m }));
    }
    setCurrentChapter(newChapter);

    // Toast
    setChapterToast(`Chapter ${chapters.length + 1} complete. Key points extracted.`);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setChapterToast(null), 3000);
  }, [currentChapter, sandboxId, chapters.length]);

  // ─── Add turn to chapter ───────────────────────────────────
  const addTurnToChapter = useCallback((userMsg, assistantMsg) => {
    if (!sandboxActive || !currentChapter) return;

    setCurrentChapter((prev) => {
      const updated = {
        ...prev,
        messages: [...prev.messages, userMsg, assistantMsg],
        turnCount: prev.turnCount + 1,
      };

      // Extract artifacts from assistant response
      if (typeof assistantMsg.content === "string") {
        const artifacts = extractArtifacts(assistantMsg.content);
        const newNotes = [];

        if (artifacts.actionItems?.length) {
          newNotes.push(...artifacts.actionItems.map((a) => ({ type: "action", text: a })));
        }
        if (artifacts.decisions?.length) {
          newNotes.push(...artifacts.decisions.map((d) => ({ type: "decision", text: d })));
        }
        if (artifacts.plans?.length) {
          newNotes.push(...artifacts.plans.map((p) => ({ type: "plan", text: p })));
        }
        if (artifacts.keyFacts?.length) {
          newNotes.push(...artifacts.keyFacts.map((f) => ({ type: "fact", text: f })));
        }

        if (newNotes.length > 0) {
          updated.extractedNotes = [...(prev.extractedNotes || []), ...newNotes];
          // Also add to global sandbox notes (deduped)
          setSandboxNotes((sn) => {
            const existing = new Set(sn.map((n) => n.text));
            const fresh = newNotes.filter((n) => !existing.has(n.text));
            return [...sn, ...fresh];
          });
        }
      }

      // Count very long responses as 2 turns
      const responseLen = typeof assistantMsg.content === "string" ? assistantMsg.content.length : 0;
      if (responseLen > 40000) {
        updated.turnCount += 1;
      }

      return updated;
    });
  }, [sandboxActive, currentChapter]);

  // ─── Auto-close chapter when limit reached ─────────────────
  useEffect(() => {
    if (sandboxActive && currentChapter && currentChapter.turnCount >= CHAPTER_TURN_LIMIT) {
      closeChapter();
    }
  }, [sandboxActive, currentChapter?.turnCount, closeChapter]);

  // ─── Pin/unpin in current chapter ──────────────────────────
  const toggleSandboxPin = useCallback((msgId) => {
    setCurrentChapter((prev) => {
      if (!prev) return prev;
      const pinned = prev.pinnedIds.includes(msgId)
        ? prev.pinnedIds.filter((id) => id !== msgId)
        : [...prev.pinnedIds, msgId];
      return { ...prev, pinnedIds: pinned };
    });
  }, []);

  // ─── Get sandbox context for assembleContext ───────────────
  const getSandboxContext = useCallback(() => {
    if (!sandboxActive) return [];
    const context = [];

    // Chapter summaries
    if (chapters.length > 0) {
      const summaryText = chapters.map((ch, i) => {
        const parts = [`Chapter ${i + 1} (${ch.turnCount} turns):`];
        if (ch.userIntents?.length) {
          parts.push("  Topics: " + ch.userIntents.join(" → "));
        }
        if (ch.assistantDecisions?.length) {
          parts.push("  Key points:\n    " + ch.assistantDecisions.join("\n    "));
        }
        return parts.join("\n");
      }).join("\n\n");

      context.push({
        title: "[Sandbox] Chapter History",
        content: summaryText,
      });
    }

    // Extracted notes across all chapters
    if (sandboxNotes.length > 0) {
      const grouped = {};
      for (const note of sandboxNotes) {
        if (!grouped[note.type]) grouped[note.type] = [];
        grouped[note.type].push(note.text);
      }
      const notesText = Object.entries(grouped)
        .map(([type, items]) => `${type.toUpperCase()}S:\n${items.map((i) => `- ${i}`).join("\n")}`)
        .join("\n\n");

      context.push({
        title: "[Sandbox] Extracted Notes",
        content: notesText,
      });
    }

    return context;
  }, [sandboxActive, chapters, sandboxNotes]);

  // ─── Dump sandbox — compile notes and clear ────────────────
  const dumpSandbox = useCallback(async (saveNote) => {
    if (!sandboxActive) return null;

    // Compile all notes into markdown
    const date = new Date().toISOString().slice(0, 10);
    const grouped = {};
    for (const note of sandboxNotes) {
      if (!grouped[note.type]) grouped[note.type] = [];
      grouped[note.type].push(note.text);
    }

    // Include final chapter if it has content
    if (currentChapter?.messages?.length > 0) {
      const summary = summarizeChapter(currentChapter);
      if (summary.extractedNotes?.length) {
        for (const n of summary.extractedNotes) {
          if (!grouped[n.type]) grouped[n.type] = [];
          grouped[n.type].push(n.text);
        }
      }
    }

    const sections = [];
    if (grouped.decision?.length) {
      sections.push(`## Decisions\n${grouped.decision.map((d) => `- ${d}`).join("\n")}`);
    }
    if (grouped.plan?.length) {
      sections.push(`## Plans\n${grouped.plan.map((p) => `- ${p}`).join("\n")}`);
    }
    if (grouped.action?.length) {
      sections.push(`## Action Items\n${grouped.action.map((a) => `- [ ] ${a}`).join("\n")}`);
    }
    if (grouped.fact?.length) {
      sections.push(`## Key Facts\n${grouped.fact.map((f) => `- ${f}`).join("\n")}`);
    }

    const topicHint = chapters[0]?.userIntents?.[0]?.slice(0, 40) || "Planning Session";
    const markdown = `# Sandbox: ${topicHint} — ${date}\n\n${sections.join("\n\n") || "No extracted notes."}\n\n---\n*${chapters.length + 1} chapters, ${sandboxNotes.length} extracted items*`;

    // Save to vault if callback provided
    let saved = null;
    if (saveNote) {
      try {
        saved = await saveNote({
          title: `Sandbox: ${topicHint} — ${date}`,
          content: markdown,
          folder: "05-IDEAS",
        });
      } catch (err) {
        console.error("[sandbox] Failed to save dump note:", err.message);
      }
    }

    // Clear IDB
    if (sandboxId) {
      try { await clearSandboxIDB(sandboxId); } catch {}
    }

    // Reset state
    setSandboxActive(false);
    setSandboxId(null);
    setChapters([]);
    setCurrentChapter(null);
    setSandboxNotes([]);

    return { markdown, saved };
  }, [sandboxActive, sandboxId, sandboxNotes, chapters, currentChapter]);

  const value = {
    sandboxActive,
    sandboxId,
    chapters,
    currentChapter,
    sandboxNotes,
    chapterToast,
    startSandbox,
    closeChapter,
    addTurnToChapter,
    toggleSandboxPin,
    getSandboxContext,
    dumpSandbox,
  };

  return (
    <SandboxContext.Provider value={value}>
      {children}
    </SandboxContext.Provider>
  );
}

export function useSandbox() {
  const ctx = useContext(SandboxContext);
  if (!ctx) throw new Error("useSandbox must be used within SandboxProvider");
  return ctx;
}
