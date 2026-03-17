import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ greeting: null }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return Response.json({ greeting: null }, { status: 401 });

    // Check for cached greeting (1-hour TTL — shorter than whispers for time-of-day freshness)
    const { data: cached } = await admin
      .from("preferences")
      .select("value, updated_at")
      .eq("user_id", user.id)
      .eq("key", "cached_greeting")
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < 60 * 60 * 1000) {
        return Response.json({ greeting: cached.value, cached: true });
      }
    }

    // Gather context (parallel, all with timeouts)
    let profileRes, actionsRes, memoriesRes, convosRes, integrationsRes, voiceRes;
    try {
      [profileRes, actionsRes, memoriesRes, convosRes, integrationsRes, voiceRes] = await Promise.all([
        admin.from("profiles").select("name, seat_type, onboarded").eq("id", user.id).single().abortSignal(AbortSignal.timeout(5000)),
        admin.from("actions").select("title, status, priority").eq("user_id", user.id).eq("status", "active").or("scheduled_for.is.null,scheduled_for.lte." + new Date().toISOString()).order("priority").limit(10).abortSignal(AbortSignal.timeout(5000)),
        admin.from("preferences").select("key, value").eq("user_id", user.id).like("key", "memory:%").abortSignal(AbortSignal.timeout(5000)),
        admin.from("conversations").select("title, created_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(5).abortSignal(AbortSignal.timeout(5000)),
        admin.from("integrations").select("provider").eq("user_id", user.id).abortSignal(AbortSignal.timeout(5000)),
        admin.from("vault_broadcasts").select("content").eq("channel", "owner-context").eq("active", true).eq("title", "Fulkit_VoiceGreeting").single().abortSignal(AbortSignal.timeout(5000)),
      ]);
    } catch (err) {
      console.error("[greeting] context fetch failed:", err.message);
      return Response.json({ greeting: null });
    }

    const name = profileRes?.data?.name || "friend";
    const actions = (actionsRes?.data || []).map(a => a.title);
    const memories = (memoriesRes?.data || []).map(m => `${m.key.replace("memory:", "")}: ${m.value}`);
    const recentTopics = (convosRes?.data || []).map(c => c.title);
    const providers = (integrationsRes?.data || []).map(i => i.provider);
    const voiceDoc = voiceRes?.data?.content || "";

    const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const hour = new Date().getHours();
    const timeOfDay = hour < 5 ? "late night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

    const contextBlock = [
      `Name: ${name}`,
      `Time: ${day} ${timeOfDay}`,
      actions.length > 0 ? `Active tasks: ${actions.join(", ")}` : "Active tasks: none",
      memories.length > 0 ? `Known facts: ${memories.join("; ")}` : "Known facts: none yet",
      recentTopics.length > 0 ? `Recent topics: ${recentTopics.join(", ")}` : "Recent topics: first visit",
      providers.length > 0 ? `Connected tools: ${providers.join(", ")}` : "Connected tools: none",
    ].join("\n");

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `You are Fülkit. The user just opened the app. Say something — 1 to 3 sentences.

Rules:
- Sound like a text from a friend who noticed something. Not a butler. Not a notification.
- Use their name sometimes, not every time.
- If they have active tasks, reference one naturally. Don't list them.
- If you know things about them, weave one in. Don't recite facts back.
- If nothing specific to say, be warm and present. Ask what's on their mind.
- Match time of day naturally (morning/afternoon/evening/late night).
- No emojis. No exclamation marks. No "Hey there!" energy.
- End with something they'd want to respond to — a question, a nudge, a callback.
- Never mention you're an AI or that you have access to their data.
${voiceDoc ? `\nVoice & examples from the owner. Match this tone — use one directly or create something new in the same style:\n${voiceDoc}\n` : ""}
Context:
${contextBlock}

Reply with ONLY the greeting text. Nothing else.`,
      }],
    });

    const greeting = response.content[0]?.text?.trim() || null;
    if (!greeting) return Response.json({ greeting: null });

    // Cache the result (fire-and-forget)
    admin.from("preferences").upsert(
      { user_id: user.id, key: "cached_greeting", value: greeting, updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" }
    ).then(() => {}).catch(() => {});

    return Response.json({ greeting, cached: false });
  } catch (err) {
    console.error("[greeting] error:", err.message);
    return Response.json({ greeting: null });
  }
}
