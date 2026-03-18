import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// GET /api/owner/dashboard?period=30 — combined metrics + analytics + events (one round-trip)
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
    const days = Math.min(parseInt(url.searchParams.get("period") || "30", 10), 90);
    const since = new Date(Date.now() - days * 86400000).toISOString();

    // ── All data fetched in parallel (each query fault-tolerant) ──
    const safe = (promise, fallback) => promise.then(res => res.error ? fallback : res).catch(() => fallback);
    const [
      profilesRes,
      pageViewsRes,
      chatEventsRes,
      integrationEventsRes,
      onboardedRes,
      activeRes,
      paidRes,
      analyticsResult,
    ] = await Promise.all([
      safe(admin.from("profiles").select("seat_type, onboarded, messages_this_month"), { data: [] }),
      safe(admin.from("user_events").select("user_id, meta").eq("event", "page_view").gte("created_at", since), { data: [] }),
      safe(admin.from("user_events").select("user_id, meta").eq("event", "chat_sent").gte("created_at", since), { data: [] }),
      safe(admin.from("user_events").select("meta").eq("event", "integration_connected").gte("created_at", since), { data: [] }),
      safe(admin.from("profiles").select("id", { count: "exact", head: true }).eq("onboarded", true), { count: 0 }),
      safe(admin.from("profiles").select("id", { count: "exact", head: true }).gt("messages_this_month", 0), { count: 0 }),
      safe(admin.from("profiles").select("id", { count: "exact", head: true }).in("seat_type", ["standard", "pro"]), { count: 0 }),
      fetchGA4(days).catch(() => ({ configured: false })),
    ]);

    // ── Metrics ──
    const profiles = profilesRes.data || [];
    const metrics = {
      total: profiles.length,
      free: profiles.filter(p => !p.seat_type || p.seat_type === "free").length,
      standard: profiles.filter(p => p.seat_type === "standard").length,
      pro: profiles.filter(p => p.seat_type === "pro").length,
      onboarded: profiles.filter(p => p.onboarded).length,
      messagesThisMonth: profiles.reduce((sum, p) => sum + (p.messages_this_month || 0), 0),
    };

    // ── Events ──
    const featureMap = {};
    for (const row of pageViewsRes.data || []) {
      const feature = row.meta?.feature || "unknown";
      if (!featureMap[feature]) featureMap[feature] = { feature, visits: 0, users: new Set() };
      featureMap[feature].visits++;
      featureMap[feature].users.add(row.user_id);
    }
    const featureUsage = Object.values(featureMap)
      .map(f => ({ feature: f.feature, visits: f.visits, uniqueUsers: f.users.size }))
      .sort((a, b) => b.visits - a.visits);

    const chatEvents = chatEventsRes.data || [];
    const chatUserIds = new Set(chatEvents.map(e => e.user_id));

    const intMap = {};
    for (const row of integrationEventsRes.data || []) {
      const provider = row.meta?.provider || "unknown";
      intMap[provider] = (intMap[provider] || 0) + 1;
    }

    const events = {
      featureUsage,
      funnel: {
        signedUp: profilesRes.data?.length || 0,
        onboarded: onboardedRes.count || 0,
        firstChat: chatUserIds.size,
        activeThisMonth: activeRes.count || 0,
        paid: paidRes.count || 0,
      },
      integrations: Object.entries(intMap)
        .map(([provider, connected]) => ({ provider, connected }))
        .sort((a, b) => b.connected - a.connected),
      chatDepth: {
        totalMessages: chatEvents.length,
        withTools: chatEvents.filter(e => {
          const tools = e.meta?.tools_used;
          return Array.isArray(tools) ? tools.length > 0 : !!tools;
        }).length,
        withContext: chatEvents.filter(e => e.meta?.has_context).length,
      },
    };

    return Response.json({ metrics, analytics: analyticsResult, events });
  } catch (err) {
    console.error("[owner/dashboard] Error:", err.message, err.stack?.split("\n").slice(0, 3).join(" | "));
    return Response.json({ error: "Failed to load dashboard", detail: err.message }, { status: 500 });
  }
}

// ── GA4 fetch (extracted to share auth once) ──
async function fetchGA4(days) {
  if (!process.env.GA_PROPERTY_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return { configured: false };
  }

  const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, "base64").toString()
  );
  const client = new BetaAnalyticsDataClient({ credentials });
  const property = `properties/${process.env.GA_PROPERTY_ID}`;
  const dateRange = { startDate: `${days}daysAgo`, endDate: "today" };

  const [overview, daily, pages, countries, cities, referrers, devices, browsers] = await Promise.all([
    client.runReport({ property, dateRanges: [dateRange], metrics: [
      { name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" },
      { name: "averageSessionDuration" }, { name: "newUsers" },
    ]}),
    client.runReport({ property, dateRanges: [dateRange], dimensions: [{ name: "date" }], metrics: [
      { name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" },
    ], orderBys: [{ dimension: { dimensionName: "date" }, desc: false }]}),
    client.runReport({ property, dateRanges: [dateRange], dimensions: [{ name: "pagePath" }], metrics: [
      { name: "screenPageViews" }, { name: "activeUsers" },
    ], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 10 }),
    client.runReport({ property, dateRanges: [dateRange], dimensions: [{ name: "country" }], metrics: [
      { name: "activeUsers" },
    ], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 15 }),
    client.runReport({ property, dateRanges: [dateRange], dimensions: [{ name: "city" }], metrics: [
      { name: "activeUsers" },
    ], dimensionFilter: { filter: { fieldName: "country", stringFilter: { value: "United States", matchType: "EXACT" } } },
    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 10 }),
    client.runReport({ property, dateRanges: [dateRange], dimensions: [{ name: "sessionSource" }], metrics: [
      { name: "sessions" },
    ], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 }),
    client.runReport({ property, dateRanges: [dateRange], dimensions: [{ name: "deviceCategory" }], metrics: [
      { name: "activeUsers" },
    ], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }] }),
    client.runReport({ property, dateRanges: [dateRange], dimensions: [{ name: "browser" }], metrics: [
      { name: "activeUsers" },
    ], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 6 }),
  ]);

  const ov = overview[0]?.rows?.[0]?.metricValues || [];
  const avgSec = parseFloat(ov[3]?.value || "0");
  const mins = Math.floor(avgSec / 60);
  const secs = Math.round(avgSec % 60);

  const parseRows = (report, dimKey, metricKeys) =>
    (report[0]?.rows || []).map(r => {
      const obj = { [dimKey]: r.dimensionValues[0]?.value || "" };
      metricKeys.forEach((k, i) => { obj[k] = parseInt(r.metricValues[i]?.value || "0", 10); });
      return obj;
    });

  const dailyRaw = parseRows(daily, "date", ["visitors", "sessions", "pageviews"]);
  const dailyMap = {};
  for (const d of dailyRaw) dailyMap[d.date] = d;
  const dailySeries = [];
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10).replace(/-/g, "");
    dailySeries.push(dailyMap[key] || { date: key, visitors: 0, sessions: 0, pageviews: 0 });
  }

  return {
    configured: true,
    period: days,
    overview: {
      visitors: parseInt(ov[0]?.value || "0", 10),
      sessions: parseInt(ov[1]?.value || "0", 10),
      pageviews: parseInt(ov[2]?.value || "0", 10),
      avgDuration: avgSec > 0 ? `${mins}m ${secs}s` : "\u2014",
      newUsers: parseInt(ov[4]?.value || "0", 10),
    },
    daily: dailySeries,
    topPages: parseRows(pages, "path", ["views", "users"]),
    countries: parseRows(countries, "name", ["users"]),
    cities: parseRows(cities, "name", ["users"]),
    referrers: parseRows(referrers, "source", ["sessions"]),
    devices: parseRows(devices, "type", ["users"]),
    browsers: parseRows(browsers, "name", ["users"]),
  };
}
