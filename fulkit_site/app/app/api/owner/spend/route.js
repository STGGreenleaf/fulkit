import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// GET /api/owner/spend — Spend Moderator aggregation (owner only)
// Returns: { summary: { totalCost, messages, avgCost, totalInput, totalOutput }, flags: [{ rule, msg, fix, count, latest }] }
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
    const hours = Math.min(parseInt(url.searchParams.get("period") || "24", 10), 720);
    const since = new Date(Date.now() - hours * 3600000).toISOString();

    // Fetch spend_log and spend_flag signals in parallel
    const [logsRes, flagsRes] = await Promise.all([
      admin
        .from("user_events")
        .select("meta, created_at")
        .eq("event", "signal:spend_log")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
      admin
        .from("user_events")
        .select("meta, created_at")
        .eq("event", "signal:spend_flag")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    // Aggregate spend_log into summary
    const logs = logsRes.data || [];
    let totalCost = 0;
    let totalInput = 0;
    let totalOutput = 0;
    let totalCacheCreation = 0;
    let totalCacheRead = 0;
    let totalElapsed = 0;
    let maxCost = 0;

    for (const log of logs) {
      const m = log.meta || {};
      totalCost += m.cost || 0;
      totalInput += m.inputTokens || 0;
      totalOutput += m.outputTokens || 0;
      totalCacheCreation += m.cacheCreation || 0;
      totalCacheRead += m.cacheRead || 0;
      totalElapsed += m.elapsed || 0;
      if ((m.cost || 0) > maxCost) maxCost = m.cost;
    }

    const messages = logs.length;
    const summary = {
      totalCost: Math.round(totalCost * 10000) / 10000,
      messages,
      avgCost: messages > 0 ? Math.round((totalCost / messages) * 10000) / 10000 : 0,
      maxCost: Math.round(maxCost * 10000) / 10000,
      totalInput,
      totalOutput,
      totalCacheCreation,
      totalCacheRead,
      avgElapsed: messages > 0 ? Math.round(totalElapsed / messages) : 0,
    };

    // Aggregate spend_flags by rule
    const flagMap = new Map();
    for (const f of flagsRes.data || []) {
      const m = f.meta || {};
      const rule = m.rule || "unknown";
      if (!flagMap.has(rule)) {
        flagMap.set(rule, {
          rule,
          msg: m.msg || "",
          fix: m.fix || "",
          count: 0,
          latest: f.created_at,
        });
      }
      const entry = flagMap.get(rule);
      entry.count++;
      if (f.created_at > entry.latest) {
        entry.latest = f.created_at;
        entry.msg = m.msg || entry.msg;
      }
    }

    const flags = Array.from(flagMap.values()).sort((a, b) => b.count - a.count);

    return Response.json({ summary, flags });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
