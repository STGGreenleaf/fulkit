import { getSupabaseAdmin } from "../../../../lib/supabase-server";

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

    // ─── Aggregate spend_log into summary ───
    const logs = logsRes.data || [];
    let totalCost = 0;
    let totalInput = 0;
    let totalOutput = 0;
    let totalCacheCreation = 0;
    let totalCacheRead = 0;
    let totalElapsed = 0;
    let maxCost = 0;
    let totalSystemTokens = 0;
    let totalToolSchemaTokens = 0;
    let totalRounds = 0;
    let compressedCount = 0;
    let totalMessagesSaved = 0;
    let totalTokensSaved = 0;
    let byokMessages = 0;
    let fulkitPaidMessages = 0;
    const costByModel = {};
    const costBySeat = {};
    const integrationLoadCount = {};
    const integrationUseCount = {};

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
      if ((m.cost || 0) > maxCost) maxCost = m.cost;

      // Compression
      if (m.wasCompressed && m.compressionStats) {
        compressedCount++;
        totalMessagesSaved += m.compressionStats.messagesSaved || 0;
        const before = m.compressionStats.estTokensBefore || 0;
        const after = m.compressionStats.estTokensAfter || 0;
        totalTokensSaved += before - after;
      }

      // BYOK vs Fulkit-paid
      if (m.isByok) { byokMessages++; } else { fulkitPaidMessages++; }

      // Cost by model
      const model = m.model || "unknown";
      const modelKey = model.includes("opus") ? "opus" : model.includes("sonnet") ? "sonnet" : model;
      if (!costByModel[modelKey]) costByModel[modelKey] = { messages: 0, cost: 0 };
      costByModel[modelKey].messages++;
      costByModel[modelKey].cost += m.cost || 0;

      // Cost by seat
      const seat = m.seat || "unknown";
      if (!costBySeat[seat]) costBySeat[seat] = { messages: 0, cost: 0 };
      costBySeat[seat].messages++;
      costBySeat[seat].cost += m.cost || 0;

      // Integration loads (how often each is connected)
      if (m.integrations && typeof m.integrations === "object") {
        for (const [name, connected] of Object.entries(m.integrations)) {
          if (connected) integrationLoadCount[name] = (integrationLoadCount[name] || 0) + 1;
        }
      }

      // Integration uses (match tool prefixes to integrations)
      if (m.tools && Array.isArray(m.tools)) {
        for (const tool of m.tools) {
          const prefix = tool.split("_")[0];
          if (prefix) integrationUseCount[prefix] = (integrationUseCount[prefix] || 0) + 1;
        }
      }
    }

    // Round model costs
    for (const k of Object.keys(costByModel)) {
      costByModel[k].cost = Math.round(costByModel[k].cost * 10000) / 10000;
    }
    for (const k of Object.keys(costBySeat)) {
      costBySeat[k].cost = Math.round(costBySeat[k].cost * 10000) / 10000;
    }

    const messages = logs.length;
    const cacheTotal = totalCacheRead + totalCacheCreation;

    const summary = {
      // Core stats (backward-compatible)
      totalCost: Math.round(totalCost * 10000) / 10000,
      messages,
      avgCost: messages > 0 ? Math.round((totalCost / messages) * 10000) / 10000 : 0,
      maxCost: Math.round(maxCost * 10000) / 10000,
      totalInput,
      totalOutput,
      totalCacheCreation,
      totalCacheRead,
      avgElapsed: messages > 0 ? Math.round(totalElapsed / messages) : 0,
      // Token breakdown
      cacheEfficiency: cacheTotal > 0 ? Math.round(totalCacheRead / cacheTotal * 100) : null,
      totalSystemTokens,
      avgSystemTokens: messages > 0 ? Math.round(totalSystemTokens / messages) : 0,
      totalToolSchemaTokens,
      avgToolSchemaTokens: messages > 0 ? Math.round(totalToolSchemaTokens / messages) : 0,
      // Rounds
      avgRounds: messages > 0 ? Math.round((totalRounds / messages) * 10) / 10 : 0,
      // Compression
      compression: compressedCount > 0 ? {
        timesCompressed: compressedCount,
        totalMessagesSaved,
        totalTokensSaved,
        avgSavingsPerCompression: Math.round(totalTokensSaved / compressedCount),
      } : null,
      // Cost attribution
      costByModel,
      costBySeat,
      byokMessages,
      fulkitPaidMessages,
      // Integration usage
      integrationUsage: {
        loads: integrationLoadCount,
        uses: integrationUseCount,
      },
    };

    // ─── Aggregate spend_flags by rule ───
    const flagMap = new Map();
    for (const f of flagsRes.data || []) {
      const m = f.meta || {};
      const rule = m.rule || "unknown";
      if (!flagMap.has(rule)) {
        flagMap.set(rule, {
          rule,
          msg: m.msg || "",
          fix: m.fix || "",
          impact: m.impact || null,
          count: 0,
          latest: f.created_at,
        });
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

    return Response.json({ summary, flags });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
