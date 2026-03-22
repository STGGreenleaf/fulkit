import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// GET /api/owner/heartbeat — system health pulse (owner only)
// Composite query: Spend Moderator + Signal Radio + KB freshness
// Returns a single JSON object answering "how's Fulkit doing?"
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

    const now = Date.now();
    const since24h = new Date(now - 24 * 3600000).toISOString();
    const since7d = new Date(now - 7 * 24 * 3600000).toISOString();

    // Parallel queries: errors, warnings, spend logs (24h), spend logs (previous 24h), KB freshness
    const [errorsRes, warningsRes, spendRes, prevSpendRes, kbRes] = await Promise.all([
      admin.from("user_events").select("created_at", { count: "exact" })
        .like("event", "signal:%").filter("meta->>severity", "eq", "error")
        .gte("created_at", since24h),
      admin.from("user_events").select("created_at", { count: "exact" })
        .like("event", "signal:%").filter("meta->>severity", "eq", "warning")
        .gte("created_at", since24h),
      admin.from("user_events").select("meta")
        .eq("event", "signal:spend_log").gte("created_at", since24h)
        .order("created_at", { ascending: false }).limit(200),
      admin.from("user_events").select("meta")
        .eq("event", "signal:spend_log")
        .gte("created_at", new Date(now - 48 * 3600000).toISOString())
        .lt("created_at", since24h)
        .order("created_at", { ascending: false }).limit(200),
      admin.from("vault_broadcasts").select("title, updated_at")
        .eq("channel", "owner-context").eq("active", true),
    ]);

    // ─── Cost health ───
    const logs = spendRes.data || [];
    const prevLogs = prevSpendRes.data || [];
    let totalCost = 0, totalInput = 0, totalOutput = 0;
    let totalCacheRead = 0, totalCacheCreation = 0;
    for (const log of logs) {
      const m = log.meta || {};
      totalCost += m.cost || 0;
      totalInput += m.inputTokens || 0;
      totalOutput += m.outputTokens || 0;
      totalCacheRead += m.cacheRead || 0;
      totalCacheCreation += m.cacheCreation || 0;
    }
    let prevTotalCost = 0;
    for (const log of prevLogs) { prevTotalCost += (log.meta?.cost || 0); }

    const messages = logs.length;
    const avgCost = messages > 0 ? Math.round((totalCost / messages) * 10000) / 10000 : 0;
    const prevAvgCost = prevLogs.length > 0 ? Math.round((prevTotalCost / prevLogs.length) * 10000) / 10000 : null;
    const costTrend = prevAvgCost !== null && prevAvgCost > 0
      ? Math.round(((avgCost - prevAvgCost) / prevAvgCost) * 100)
      : null;

    // ─── Cache health ───
    const cacheTotal = totalCacheRead + totalCacheCreation;
    const cacheEfficiency = cacheTotal > 0 ? Math.round(totalCacheRead / cacheTotal * 100) : null;

    // ─── Error health ───
    const errorCount = errorsRes.count || 0;
    const warningCount = warningsRes.count || 0;

    // ─── Integration health (from recent spend logs) ───
    const integrationLoads = {};
    const integrationUses = {};
    for (const log of logs) {
      const m = log.meta || {};
      if (m.integrations && typeof m.integrations === "object") {
        for (const [name, connected] of Object.entries(m.integrations)) {
          if (connected) integrationLoads[name] = (integrationLoads[name] || 0) + 1;
        }
      }
      if (m.tools && Array.isArray(m.tools)) {
        for (const tool of m.tools) {
          const prefix = tool.split("_")[0];
          if (prefix) integrationUses[prefix] = (integrationUses[prefix] || 0) + 1;
        }
      }
    }
    const ghostIntegrations = Object.keys(integrationLoads).filter(
      name => !integrationUses[name] && integrationLoads[name] > 0
    );

    // ─── Doc health ───
    const kbArticles = kbRes.data || [];
    const staleThreshold = now - 30 * 24 * 3600000; // 30 days
    const staleDocs = kbArticles.filter(a =>
      new Date(a.updated_at).getTime() < staleThreshold
    ).map(a => a.title);

    // ─── Compose pulse ───
    const errorHealth = errorCount === 0 ? "clear" : errorCount <= 3 ? "warning" : "critical";
    const cacheHealth = cacheEfficiency === null ? "no_data" : cacheEfficiency >= 60 ? "healthy" : cacheEfficiency >= 30 ? "warning" : "poor";
    const costHealth = costTrend === null ? "no_data" : costTrend <= 0 ? "improving" : costTrend <= 20 ? "stable" : "rising";
    const docHealth = staleDocs.length === 0 ? "current" : "stale";

    const overall = (errorHealth === "critical" || cacheHealth === "poor")
      ? "needs_attention"
      : (errorHealth === "warning" || costHealth === "rising" || docHealth === "stale")
        ? "fair"
        : "healthy";

    return Response.json({
      overall,
      timestamp: new Date().toISOString(),
      cost: {
        status: costHealth,
        messages24h: messages,
        totalCost24h: Math.round(totalCost * 10000) / 10000,
        avgCostPerMsg: avgCost,
        trend: costTrend !== null ? `${costTrend > 0 ? "+" : ""}${costTrend}%` : null,
        totalInput24h: totalInput,
        totalOutput24h: totalOutput,
      },
      errors: {
        status: errorHealth,
        errors24h: errorCount,
        warnings24h: warningCount,
      },
      cache: {
        status: cacheHealth,
        efficiency: cacheEfficiency !== null ? `${cacheEfficiency}%` : null,
        reads: totalCacheRead,
        writes: totalCacheCreation,
      },
      integrations: {
        loaded: Object.keys(integrationLoads),
        ghosts: ghostIntegrations,
      },
      docs: {
        status: docHealth,
        stale: staleDocs,
        total: kbArticles.length,
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
