// Write-back loop — Fulkit as a Context Machine
// After each response, extract artifacts and file them back to the user's vault/storage
// One call, two outputs: user sees the response, Chappie sees the filing instructions

import { supabase } from "./supabase";

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

  const lines = response.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Action items: lines starting with "- [ ]", "TODO:", "Action:", or bullet points with action verbs
    if (
      trimmed.match(/^-\s*\[\s*\]/) ||
      trimmed.match(/^(TODO|Action|Follow.up|Reminder):/i)
    ) {
      artifacts.actionItems.push(trimmed.replace(/^-\s*\[\s*\]\s*/, "").replace(/^(TODO|Action|Follow.up|Reminder):\s*/i, ""));
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
export async function writeBackLocal(directoryHandle, artifacts, conversationTitle) {
  if (!directoryHandle) return [];
  const written = [];

  // Write action items
  if (artifacts.actionItems.length > 0) {
    try {
      const inbox = await directoryHandle.getDirectoryHandle("00-INBOX", { create: true });
      const date = new Date().toISOString().slice(0, 10);
      const filename = `actions-${date}.md`;

      let existing = "";
      try {
        const existingHandle = await inbox.getFileHandle(filename);
        const file = await existingHandle.getFile();
        existing = await file.text();
      } catch {
        // File doesn't exist yet
      }

      const content = existing
        ? `${existing}\n\n## From: ${conversationTitle || "Chat"}\n${artifacts.actionItems.map((a) => `- [ ] ${a}`).join("\n")}`
        : `# Action Items — ${date}\n\n## From: ${conversationTitle || "Chat"}\n${artifacts.actionItems.map((a) => `- [ ] ${a}`).join("\n")}`;

      const fileHandle = await inbox.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      written.push({ type: "actions", folder: "00-INBOX", filename });
    } catch (err) {
      console.error("[writeback] Local write error:", err.message);
    }
  }

  return written;
}

// Write artifacts back to Supabase storage (Model B/C)
export async function writeBackSupabase(userId, artifacts, conversationTitle, encryptFn, conversationId) {
  if (!userId) return [];
  const written = [];

  // Write action items to the actions table (already exists in the app)
  if (artifacts.actionItems.length > 0) {
    for (const item of artifacts.actionItems) {
      try {
        await supabase.from("actions").insert({
          user_id: userId,
          title: item,
          source: "chat",
          status: "active",
          priority: 2,
          ...(conversationId ? { conversation_id: conversationId } : {}),
        });
        written.push({ type: "action", title: item });
      } catch {
        // Skip if insert fails
      }
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
