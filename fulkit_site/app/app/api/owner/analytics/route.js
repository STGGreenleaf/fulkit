import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// GET /api/owner/analytics — GA4 analytics data (owner only)
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

    // Check if GA4 is configured
    if (!process.env.GA_PROPERTY_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return Response.json({ configured: false });
    }

    const { BetaAnalyticsDataClient } = await import("@google-analytics/data");

    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, "base64").toString()
    );
    const client = new BetaAnalyticsDataClient({ credentials });
    const property = `properties/${process.env.GA_PROPERTY_ID}`;

    const dateRange = { startDate: "30daysAgo", endDate: "today" };

    // Run all queries in parallel
    const [overview, pages, countries, cities, referrers, devices, browsers] = await Promise.all([
      // Overview totals
      client.runReport({
        property,
        dateRanges: [dateRange],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
        ],
      }),
      // Top pages
      client.runReport({
        property,
        dateRanges: [dateRange],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
      // Countries
      client.runReport({
        property,
        dateRanges: [dateRange],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 15,
      }),
      // US cities
      client.runReport({
        property,
        dateRanges: [dateRange],
        dimensions: [{ name: "city" }],
        metrics: [{ name: "activeUsers" }],
        dimensionFilter: {
          filter: {
            fieldName: "country",
            stringFilter: { value: "United States", matchType: "EXACT" },
          },
        },
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 10,
      }),
      // Referrers
      client.runReport({
        property,
        dateRanges: [dateRange],
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
      // Devices
      client.runReport({
        property,
        dateRanges: [dateRange],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      }),
      // Browsers
      client.runReport({
        property,
        dateRanges: [dateRange],
        dimensions: [{ name: "browser" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 6,
      }),
    ]);

    // Parse overview
    const ov = overview[0]?.rows?.[0]?.metricValues || [];
    const avgSec = parseFloat(ov[3]?.value || "0");
    const mins = Math.floor(avgSec / 60);
    const secs = Math.round(avgSec % 60);

    // Helper to parse dimension reports
    const parseRows = (report, dimKey, metricKeys) =>
      (report[0]?.rows || []).map(r => {
        const obj = { [dimKey]: r.dimensionValues[0]?.value || "" };
        metricKeys.forEach((k, i) => { obj[k] = parseInt(r.metricValues[i]?.value || "0", 10); });
        return obj;
      });

    return Response.json({
      configured: true,
      overview: {
        visitors: parseInt(ov[0]?.value || "0", 10),
        sessions: parseInt(ov[1]?.value || "0", 10),
        pageviews: parseInt(ov[2]?.value || "0", 10),
        avgDuration: avgSec > 0 ? `${mins}m ${secs}s` : "—",
      },
      topPages: parseRows(pages, "path", ["views", "users"]),
      countries: parseRows(countries, "name", ["users"]),
      cities: parseRows(cities, "name", ["users"]),
      referrers: parseRows(referrers, "source", ["sessions"]),
      devices: parseRows(devices, "type", ["users"]),
      browsers: parseRows(browsers, "name", ["users"]),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
