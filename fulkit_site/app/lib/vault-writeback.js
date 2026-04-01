// Write-back loop — Fulkit as a Context Machine
// After each response, extract artifacts and file them back to the user's vault/storage
// One call, two outputs: user sees the response, Chappie sees the filing instructions

import { supabase } from "./supabase";

// Vault folder structure — shared by write-back pipeline and triage API
export const VAULT_FOLDERS = [
  { id: "00-INBOX", label: "Inbox", description: "Unsorted — landing zone" },
  { id: "01-PERSONAL", label: "Personal", description: "Personal notes, goals, health, family" },
  { id: "02-BUSINESS", label: "Business", description: "Revenue, strategy, customers, marketing" },
  { id: "03-PROJECTS", label: "Projects", description: "Active project tracking, milestones" },
  { id: "04-DEV", label: "Dev", description: "Code, architecture, deployment, technical" },
  { id: "05-IDEAS", label: "Ideas", description: "Brainstorms, raw concepts, explorations" },
  { id: "06-LEARNING", label: "Learning", description: "Books, courses, research, articles" },
  { id: "07-ARCHIVE", label: "Archive", description: "Completed / reference material" },
];

// Check if text looks like a file path or code dump — never thread these
function isFilePath(text) {
  return /^(fulkit\/|app\/|lib\/|components\/|src\/|\.\/|\/)[^\s]*\.(js|ts|jsx|tsx|md|css|json|html|py|sql)$/i.test(text.trim());
}

// Extract a due date from text if present (YYYY-MM-DD or natural language)
function extractDueDate(text) {
  // Explicit date: 2026-03-25
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];
  // Relative dates
  const lower = text.toLowerCase();
  const now = new Date();
  if (lower.match(/\btomorrow\b/)) { now.setDate(now.getDate() + 1); return now.toISOString().slice(0, 10); }
  if (lower.match(/\bnext week\b/)) { now.setDate(now.getDate() + 7); return now.toISOString().slice(0, 10); }
  if (lower.match(/\bnext month\b/)) { now.setMonth(now.getMonth() + 1); return now.toISOString().slice(0, 10); }
  const inDays = lower.match(/\bin (\d+) days?\b/);
  if (inDays) { now.setDate(now.getDate() + parseInt(inDays[1])); return now.toISOString().slice(0, 10); }
  // Day names: "by Friday", "next Tuesday"
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayMatch = lower.match(/\b(?:by|next|this)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (dayMatch) {
    const target = days.indexOf(dayMatch[1]);
    const current = now.getDay();
    let diff = target - current;
    if (diff <= 0) diff += 7;
    now.setDate(now.getDate() + diff);
    return now.toISOString().slice(0, 10);
  }
  return null;
}

// Detect ecosystem from text content (matches Habit Engine vocabulary)
export function detectEcosystem(text) {
  const lower = (text || "").toLowerCase();
  if (lower.match(/\b(inventory|order|catalog|payment|square|pos|register|gift.?card)\b/)) return "square";
  if (lower.match(/\b(board|card|trello|sprint|backlog|kanban)\b/)) return "trello";
  if (lower.match(/\b(margin|cost|vendor|component|composite|numbrly)\b/)) return "numbrly";
  if (lower.match(/\b(pace|cash|expense|revenue|truegauge|profit)\b/)) return "truegauge";
  if (lower.match(/\b(playlist|track|song|album|spotify|music|fabric|sonos)\b/)) return "fabric";
  if (lower.match(/\b(charge|subscription|invoice|payout|stripe)\b/)) return "stripe";
  if (lower.match(/\b(repo|commit|pull.?request|branch|github)\b/)) return "github";
  return null;
}

// Extract structured artifacts from Claude's response
// Looks for action items, decisions, key facts, plans, and insights
export function extractArtifacts(response) {
  const artifacts = {
    actionItems: [],
    decisions: [],
    keyFacts: [],
    plans: [],
    insights: [],
    summary: null,
  };

  if (!response) return artifacts;

  // Skip if response is primarily code/tool output (>60% code blocks)
  const codeBlockChars = (response.match(/```[\s\S]*?```/g) || []).join("").length;
  if (codeBlockChars > response.length * 0.6) return artifacts;

  const lines = response.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Action items: lines starting with "- [ ]", "TODO:", "Action:", or bullet points with action verbs
    if (
      trimmed.match(/^-\s*\[\s*\]/) ||
      trimmed.match(/^(TODO|Action|Follow.up|Reminder):/i)
    ) {
      const actionText = trimmed.replace(/^-\s*\[\s*\]\s*/, "").replace(/^(TODO|Action|Follow.up|Reminder):\s*/i, "");
      artifacts.actionItems.push({ text: actionText, dueDate: extractDueDate(actionText) });
    }
    // Decisions: lines with decision-indicating language
    else if (
      trimmed.match(/\b(decided|conclusion|we'll go with|the plan is|going with|settled on|agreed|chosen|final answer)\b/i) &&
      trimmed.length > 15 && trimmed.length < 300
    ) {
      artifacts.decisions.push(trimmed.replace(/^[-*]\s*/, ""));
    }
    // Plans: lines with planning language
    else if (
      trimmed.match(/\b(next step|plan:|approach:|strategy:|phase \d|step \d|roadmap|timeline)\b/i) &&
      trimmed.length > 10 && trimmed.length < 300
    ) {
      artifacts.plans.push(trimmed.replace(/^[-*]\s*/, ""));
    }
    // Key facts: lines with specific data (numbers, dates, names in context)
    else if (
      trimmed.match(/\b(\d{4}-\d{2}-\d{2}|\$[\d,.]+|\d+%|[A-Z][a-z]+ [A-Z][a-z]+)\b/) &&
      trimmed.match(/^[-*•]\s/) &&
      trimmed.length > 10 && trimmed.length < 200
    ) {
      artifacts.keyFacts.push(trimmed.replace(/^[-*•]\s*/, ""));
    }
  }

  // Filter out garbage: file paths, questions, too-short items
  const clean = (arr) => arr.filter(item =>
    item.length >= 10 && !item.endsWith("?") && !isFilePath(item)
  );
  artifacts.actionItems = artifacts.actionItems.filter(a =>
    a.text.length >= 10 && !a.text.endsWith("?") && !isFilePath(a.text)
  );
  artifacts.decisions = clean(artifacts.decisions);
  artifacts.plans = clean(artifacts.plans);
  artifacts.keyFacts = clean(artifacts.keyFacts);

  return artifacts;
}

// Determine which folder an artifact belongs in based on content
function triageFolder(content) {
  const lower = content.toLowerCase();
  if (lower.match(/\b(code|api|deploy|bug|feature|component|function|server)\b/)) return "04-DEV";
  if (lower.match(/\b(revenue|pricing|customer|marketing|brand|strategy|business)\b/)) return "02-BUSINESS";
  if (lower.match(/\b(idea|concept|what if|brainstorm|explore)\b/)) return "05-IDEAS";
  if (lower.match(/\b(learn|book|course|framework|research)\b/)) return "06-LEARNING";
  if (lower.match(/\b(health|family|personal|goal|habit)\b/)) return "01-PERSONAL";
  return "00-INBOX";
}

// Write artifacts back to local vault via File System Access API (Model A)
// Helper: write a single file to a vault subfolder
async function writeFile(directoryHandle, folder, filename, content) {
  const dir = await directoryHandle.getDirectoryHandle(folder, { create: true });
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

// Helper: append to an existing file or create it
async function appendOrCreate(directoryHandle, folder, filename, header, newContent) {
  const dir = await directoryHandle.getDirectoryHandle(folder, { create: true });
  let existing = "";
  try {
    const fh = await dir.getFileHandle(filename);
    const file = await fh.getFile();
    existing = await file.text();
  } catch {}
  const content = existing ? `${existing}\n\n${newContent}` : `${header}\n\n${newContent}`;
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function writeBackLocal(directoryHandle, artifacts, conversationTitle) {
  if (!directoryHandle) return [];
  const written = [];
  const date = new Date().toISOString().slice(0, 10);
  const from = conversationTitle || "Chat";

  // Write action items → 00-INBOX/actions-YYYY-MM-DD.md
  if (artifacts.actionItems?.length > 0) {
    try {
      await appendOrCreate(directoryHandle, "00-INBOX", `actions-${date}.md`,
        `# Action Items — ${date}`,
        `## From: ${from}\n${artifacts.actionItems.map(a => `- [ ] ${a.text}`).join("\n")}`
      );
      written.push({ type: "actions", folder: "00-INBOX" });
    } catch (err) { console.error("[writeback] Actions write:", err.message); }
  }

  // Write notes/facts → appropriate folder
  if (artifacts.notes?.length > 0) {
    for (const note of artifacts.notes) {
      try {
        const folder = note.folder || "00-INBOX";
        const safeName = (note.title || `note-${date}`).replace(/[/\\?%*:|"<>]/g, "-").trim() + ".md";
        await writeFile(directoryHandle, folder, safeName, note.content || note.text || "");
        written.push({ type: "note", folder, filename: safeName });
      } catch (err) { console.error("[writeback] Note write:", err.message); }
    }
  }

  // Write decisions → _FULKIT/decisions.md (append)
  if (artifacts.decisions?.length > 0) {
    try {
      await appendOrCreate(directoryHandle, "_FULKIT", "decisions.md",
        "# Decisions",
        `## ${date} — ${from}\n${artifacts.decisions.map(d => `- ${d.text || d}`).join("\n")}`
      );
      written.push({ type: "decisions", folder: "_FULKIT" });
    } catch (err) { console.error("[writeback] Decisions write:", err.message); }
  }

  // Write conversation summary → _FULKIT/conversations/YYYY-MM-DD-title.md
  if (artifacts.summary) {
    try {
      const convFolder = await directoryHandle.getDirectoryHandle("_FULKIT", { create: true });
      await convFolder.getDirectoryHandle("conversations", { create: true });
      const safeName = `${date}-${(from).replace(/[/\\?%*:|"<>]/g, "-").trim().slice(0, 50)}.md`;
      const content = `# ${from}\n\n*${date}*\n\n${artifacts.summary}`;
      const dir = await convFolder.getDirectoryHandle("conversations");
      const fh = await dir.getFileHandle(safeName, { create: true });
      const w = await fh.createWritable();
      await w.write(content);
      await w.close();
      written.push({ type: "summary", folder: "_FULKIT/conversations" });
    } catch (err) { console.error("[writeback] Summary write:", err.message); }
  }

  return written;
}

// Write artifacts back to Supabase storage (Model B/C)
export async function writeBackSupabase(userId, artifacts, conversationTitle, encryptFn, conversationId, ecosystem) {
  if (!userId) return [];
  const written = [];

  // Write action items to the actions table
  if (artifacts.actionItems.length > 0) {
    for (const item of artifacts.actionItems) {
      try {
        await supabase.from("actions").insert({
          user_id: userId,
          title: item.text,
          source: "chat",
          status: "active",
          priority: 2,
          ...(conversationId ? { conversation_id: conversationId } : {}),
          ...(item.dueDate ? { due_date: item.dueDate } : {}),
        });
        written.push({ type: "action", title: item.text });
      } catch {
        // Skip if insert fails
      }
    }
  }

  // Write decisions, plans, and key facts as notes (vault knowledge)
  const knowledgeItems = [
    ...artifacts.decisions.map((d) => ({ type: "decision", content: d })),
    ...artifacts.plans.map((p) => ({ type: "plan", content: p })),
    ...artifacts.keyFacts.map((f) => ({ type: "fact", content: f })),
  ];

  if (knowledgeItems.length > 0) {
    const date = new Date().toISOString().slice(0, 10);
    const title = `${conversationTitle || "Chat"} — ${date}`;
    const body = knowledgeItems
      .map((k) => `**${k.type}:** ${k.content}`)
      .join("\n\n");

    try {
      await supabase.from("notes").insert({
        user_id: userId,
        title,
        content: body,
        source: "chat",
        folder: triageFolder(body),
        context_mode: "available",
        ...(ecosystem ? { labels: [ecosystem] } : {}),
      });
      written.push({ type: "knowledge", count: knowledgeItems.length });
    } catch {
      // Skip if insert fails
    }
  }

  return written;
}

// Generate a conversation summary for opt-in persistence
export function generateSummaryPrompt(messages) {
  if (!messages || messages.length < 4) return null;

  // Build a summary request from the conversation
  const convo = messages
    .slice(-20) // Last 20 messages max
    .map((m) => `${m.role}: ${m.content.slice(0, 300)}`)
    .join("\n");

  return `Summarize this conversation in 2-3 sentences. Focus on key decisions, action items, and topics discussed. Be concise.\n\n${convo}`;
}
