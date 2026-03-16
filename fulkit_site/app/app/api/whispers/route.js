import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Check for cached whispers (generated in last 12 hours)
    const { data: cached } = await admin
      .from("preferences")
      .select("value, updated_at")
      .eq("user_id", user.id)
      .eq("key", "cached_whispers")
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < 12 * 60 * 60 * 1000) {
        try {
          return Response.json({ whispers: JSON.parse(cached.value), cached: true });
        } catch { /* regenerate if parse fails */ }
      }
    }

    // Gather context for generation
    const [actionsRes, memoriesRes, convosRes] = await Promise.all([
      admin.from("actions").select("title, status, priority").eq("user_id", user.id).eq("status", "active").or("scheduled_for.is.null,scheduled_for.lte." + new Date().toISOString()).order("priority").limit(10),
      admin.from("preferences").select("key, value").eq("user_id", user.id).like("key", "memory:%"),
      admin.from("conversations").select("title, created_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(5),
    ]);

    const actions = (actionsRes.data || []).map(a => a.title);
    const memories = (memoriesRes.data || []).map(m => `${m.key.replace("memory:", "")}: ${m.value}`);
    const recentTopics = (convosRes.data || []).map(c => c.title);

    // If no context at all, return empty
    if (actions.length === 0 && memories.length === 0 && recentTopics.length === 0) {
      return Response.json({ whispers: [], cached: false });
    }

    // Generate whispers with a fast, cheap call
    const contextBlock = [
      actions.length > 0 ? `Active tasks: ${actions.join(", ")}` : "",
      memories.length > 0 ? `Known facts: ${memories.join("; ")}` : "",
      recentTopics.length > 0 ? `Recent conversations: ${recentTopics.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `It's ${day} ${timeOfDay}. Based on this user context, generate exactly 2 short, useful whispers (proactive suggestions). Each should be 1-2 sentences, warm but not cheesy. They should feel like a thoughtful friend noticing something useful. No emojis. No greetings. Just the insight.

${contextBlock}

Return ONLY a JSON array of 2 strings. Nothing else.`,
      }],
    });

    let whispers = [];
    try {
      const text = response.content[0]?.text || "[]";
      whispers = JSON.parse(text);
      if (!Array.isArray(whispers)) whispers = [];
      whispers = whispers.slice(0, 3);
    } catch {
      whispers = [];
    }

    // Cache the result
    if (whispers.length > 0) {
      await admin.from("preferences").upsert(
        { user_id: user.id, key: "cached_whispers", value: JSON.stringify(whispers), updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" }
      );
    }

    return Response.json({ whispers, cached: false });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
