import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// GET /api/owner/events?period=30 — custom event analytics (owner only)
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner") return Response.json({ error: "Owner only" }, { status: 403 });

    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("period") || "30", 10);
    const since = new Date(Date.now() - days * 86400000).toISOString();

    // Run all queries in parallel
    const [
      pageViewsRes,
      chatEventsRes,
      integrationEventsRes,
      profilesRes,
      onboardedRes,
      activeRes,
      paidRes,
    ] = await Promise.all([
      // Feature usage: all page_view events in period
      admin
        .from("user_events")
        .select("user_id, meta")
        .eq("event", "page_view")
        .gte("created_at", since),

      // Chat events
      admin
        .from("user_events")
        .select("user_id, meta")
        .eq("event", "chat_sent")
        .gte("created_at", since),

      // Integration events
      admin
        .from("user_events")
        .select("meta")
        .eq("event", "integration_connected")
        .gte("created_at", since),

      // Funnel: total signups
      admin.from("profiles").select("id", { count: "exact", head: true }),

      // Funnel: onboarded
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("onboarded", true),

      // Funnel: active this month (messages > 0)
      admin.from("profiles").select("id", { count: "exact", head: true }).gt("messages_this_month", 0),

      // Funnel: paid users
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("seat_type", ["standard", "pro"]),
    ]);

    // Aggregate feature usage in JS
    const featureMap = {};
    for (const row of pageViewsRes.data || []) {
      const feature = row.meta?.feature || "unknown";
      if (!featureMap[feature]) featureMap[feature] = { feature, visits: 0, users: new Set() };
      featureMap[feature].visits++;
      featureMap[feature].users.add(row.user_id);
    }
    const featureUsage = Object.values(featureMap)
      .map((f) => ({ feature: f.feature, visits: f.visits, uniqueUsers: f.users.size }))
      .sort((a, b) => b.visits - a.visits);

    // Chat depth
    const chatEvents = chatEventsRes.data || [];
    const chatUserIds = new Set(chatEvents.map((e) => e.user_id));
    const chatDepth = {
      totalMessages: chatEvents.length,
      withTools: chatEvents.filter((e) => {
        const tools = e.meta?.tools_used;
        return Array.isArray(tools) ? tools.length > 0 : !!tools;
      }).length,
      withContext: chatEvents.filter((e) => e.meta?.has_context).length,
    };

    // Integration adoption
    const intMap = {};
    for (const row of integrationEventsRes.data || []) {
      const provider = row.meta?.provider || "unknown";
      intMap[provider] = (intMap[provider] || 0) + 1;
    }
    const integrations = Object.entries(intMap)
      .map(([provider, connected]) => ({ provider, connected }))
      .sort((a, b) => b.connected - a.connected);

    // Funnel
    const funnel = {
      signedUp: profilesRes.count || 0,
      onboarded: onboardedRes.count || 0,
      firstChat: chatUserIds.size,
      activeThisMonth: activeRes.count || 0,
      paid: paidRes.count || 0,
    };

    return Response.json({
      featureUsage,
      funnel,
      integrations,
      chatDepth,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
