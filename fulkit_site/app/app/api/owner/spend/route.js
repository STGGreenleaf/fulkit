import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// Aggregate an array of spend_log rows into a summary object
function aggregateLogs(logs) {
  let totalCost = 0, totalInput = 0, totalOutput = 0;
  let totalCacheCreation = 0, totalCacheRead = 0, totalElapsed = 0, maxCost = 0;
  let totalSystemTokens = 0, totalToolSchemaTokens = 0, totalRounds = 0;
  let compressedCount = 0, totalMessagesSaved = 0, totalTokensSaved = 0;
  let byokMessages = 0, fulkitPaidMessages = 0;
  const costByModel = {}, costBySeat = {};
  const integrationLoadCount = {}, integrationUseCount = {};
  let totalToolsLoaded = 0;

  for (const log of logs) {
    const m = log.meta || {};
    totalCost += m.cost || 0;
    totalInput += m.inputTokens || 0;
    totalOutput += m.outputTokens || 0;
    totalCacheCreation += m.cacheCreation || 0;
    totalCacheRead += m.cacheRead || 0;
    totalElapsed += m.elapsed || 0;
    totalSystemTokens += m.systemTokensUsed || m.systemTokens || 0;
    totalToolSchemaTokens += m.toolSchemaTokens || 0;
    totalRounds += m.rounds || 0;
    totalToolsLoaded += m.toolsLoaded || 0;
    if ((m.cost || 0) > maxCost) maxCost = m.cost;

    if (m.wasCompressed && m.compressionStats) {
      compressedCount++;
      totalMessagesSaved += m.compressionStats.messagesSaved || 0;
      totalTokensSaved += (m.compressionStats.estTokensBefore || 0) - (m.compressionStats.estTokensAfter || 0);
    }

    if (m.isByok) { byokMessages++; } else { fulkitPaidMessages++; }

    const model = m.model || "unknown";
    const modelKey = model.includes("opus") ? "opus" : model.includes("sonnet") ? "sonnet" : model;
    if (!costByModel[modelKey]) costByModel[modelKey] = { messages: 0, cost: 0 };
    costByModel[modelKey].messages++;
    costByModel[modelKey].cost += m.cost || 0;

    const seat = m.seat || "unknown";
    if (!costBySeat[seat]) costBySeat[seat] = { messages: 0, cost: 0 };
    costBySeat[seat].messages++;
    costBySeat[seat].cost += m.cost || 0;

    if (m.integrations && typeof m.integrations === "object") {
      for (const [name, connected] of Object.entries(m.integrations)) {
        if (connected) integrationLoadCount[name] = (integrationLoadCount[name] || 0) + 1;
      }
    }
    if (m.tools && Array.isArray(m.tools)) {
      for (const tool of m.tools) {
        const prefix = tool.split("_")[0];
        if (prefix) integrationUseCount[prefix] = (integrationUseCount[prefix] || 0) + 1;
      }
    }
  }

  for (const k of Object.keys(costByModel)) costByModel[k].cost = Math.round(costByModel[k].cost * 10000) / 10000;
  for (const k of Object.keys(costBySeat)) costBySeat[k].cost = Math.round(costBySeat[k].cost * 10000) / 10000;

  const messages = logs.length;
  const cacheTotal = totalCacheRead + totalCacheCreation;

  return {
    totalCost: Math.round(totalCost * 10000) / 10000,
    messages,
    avgCost: messages > 0 ? Math.round((totalCost / messages) * 10000) / 10000 : 0,
    maxCost: Math.round(maxCost * 10000) / 10000,
    totalInput, totalOutput, totalCacheCreation, totalCacheRead,
    avgElapsed: messages > 0 ? Math.round(totalElapsed / messages) : 0,
    cacheEfficiency: cacheTotal > 0 ? Math.round(totalCacheRead / cacheTotal * 100) : null,
    totalSystemTokens,
    avgSystemTokens: messages > 0 ? Math.round(totalSystemTokens / messages) : 0,
    totalToolSchemaTokens,
    avgToolSchemaTokens: messages > 0 ? Math.round(totalToolSchemaTokens / messages) : 0,
    avgToolsLoaded: messages > 0 ? Math.round((totalToolsLoaded / messages) * 10) / 10 : 0,
    avgRounds: messages > 0 ? Math.round((totalRounds / messages) * 10) / 10 : 0,
    compression: compressedCount > 0 ? {
      timesCompressed: compressedCount,
      totalMessagesSaved, totalTokensSaved,
      avgSavingsPerCompression: Math.round(totalTokensSaved / compressedCount),
    } : null,
    costByModel, costBySeat, byokMessages, fulkitPaidMessages,
    integrationUsage: { loads: integrationLoadCount, uses: integrationUseCount },
  };
}

// GET /api/owner/spend — Spend Moderator aggregation (owner only)
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
    const prevSince = new Date(Date.now() - hours * 2 * 3600000).toISOString();

    // Fetch current + previous period logs, spend flags, audit flags, and rollup history — all in parallel
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const [logsRes, prevLogsRes, flagsRes, auditRes, rollupRes] = await Promise.all([
      admin.from("user_events").select("meta, created_at")
        .eq("event", "signal:spend_log").gte("created_at", since)
        .order("created_at", { ascending: false }).limit(500),
      admin.from("user_events").select("meta, created_at")
        .eq("event", "signal:spend_log").gte("created_at", prevSince).lt("created_at", since)
        .order("created_at", { ascending: false }).limit(500),
      admin.from("user_events").select("meta, created_at")
        .eq("event", "signal:spend_flag").gte("created_at", since)
        .order("created_at", { ascending: false }).limit(500),
      admin.from("user_events").select("meta, created_at")
        .eq("event", "signal:audit_flag").gte("created_at", since)
        .order("created_at", { ascending: false }).limit(100),
      admin.from("spend_rollups").select("*")
        .gte("date", thirtyDaysAgo)
        .order("date", { ascending: true }),
    ]);

    const summary = aggregateLogs(logsRes.data || []);
    const prevLogs = prevLogsRes.data || [];
    const previous = prevLogs.length > 0 ? aggregateLogs(prevLogs) : null;

    // Aggregate spend_flags + audit_flags by rule
    const flagMap = new Map();
    const allFlags = [...(flagsRes.data || []), ...(auditRes.data || [])];
    for (const f of allFlags) {
      const m = f.meta || {};
      const rule = m.rule || "unknown";
      if (!flagMap.has(rule)) {
        flagMap.set(rule, { rule, msg: m.msg || "", fix: m.fix || "", impact: m.impact || null, count: 0, latest: f.created_at });
      }
      const entry = flagMap.get(rule);
      entry.count++;
      if (f.created_at > entry.latest) {
        entry.latest = f.created_at;
        entry.msg = m.msg || entry.msg;
        if (m.impact) entry.impact = m.impact;
      }
    }

    const flags = Array.from(flagMap.values()).sort((a, b) => b.count - a.count);

    // Build history with derived fields
    const history = (rollupRes.data || []).map(r => {
      const cacheTotal = (r.cache_read || 0) + (r.cache_creation || 0);
      return {
        date: r.date,
        totalCost: parseFloat(r.total_cost) || 0,
        messages: r.messages || 0,
        avgCost: r.messages > 0 ? Math.round(parseFloat(r.total_cost) / r.messages * 10000) / 10000 : 0,
        maxCost: parseFloat(r.max_cost) || 0,
        cacheEfficiency: cacheTotal > 0 ? Math.round((r.cache_read || 0) / cacheTotal * 100) : null,
        flagCount: r.flag_count || 0,
        compressions: r.compressions || 0,
      };
    });

    return Response.json({ summary, previous, flags, history });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
