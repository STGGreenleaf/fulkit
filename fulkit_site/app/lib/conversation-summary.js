// Conversation summary persistence — opt-in
// Saves AI-generated summaries (NOT raw transcripts) for session continuity

import { supabase } from "./supabase";

// Save a conversation summary to conversation_sessions table
export async function saveConversationSummary(userId, conversationId, messages) {
  if (!userId || !conversationId || !messages || messages.length < 4) return null;

  // Extract key info from messages
  const actionItems = [];
  const keyDecisions = [];

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const lines = (msg.content || "").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^-\s*\[\s*\]/)) {
        actionItems.push(trimmed.replace(/^-\s*\[\s*\]\s*/, ""));
      }
    }
  }

  // Build a brief summary from first and last messages
  const first = messages[0]?.content?.slice(0, 200) || "";
  const last = messages[messages.length - 1]?.content?.slice(0, 200) || "";
  const msgCount = messages.length;
  const summary = `${msgCount} messages. Started with: "${first}..." Last response: "${last}..."`;

  const { data, error } = await supabase
    .from("conversation_sessions")
    .upsert({
      id: conversationId,
      user_id: userId,
      summary,
      key_decisions: keyDecisions.length > 0 ? keyDecisions : null,
      action_items: actionItems.length > 0 ? actionItems : null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[conversation-summary] Save error:", error.message);
    return null;
  }
  return data;
}

// Load conversation summaries for context injection (cross-session memory)
export async function loadRecentSummaries(limit = 5) {
  const { data, error } = await supabase
    .from("conversation_sessions")
    .select("summary, action_items, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}

// Save full transcript (opt-in, explicit)
export async function saveTranscript(sessionId, userId, messages) {
  if (!sessionId || !userId || !messages) return;

  const { error } = await supabase
    .from("conversation_transcripts")
    .upsert({
      session_id: sessionId,
      user_id: userId,
      messages: messages,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error("[conversation-summary] Transcript save error:", error.message);
  }
}
