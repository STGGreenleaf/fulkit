import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// GET /api/owner/signals — signal feed for Radio tab (owner only)
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
    const severity = url.searchParams.get("severity") || null;
    const cursor = url.searchParams.get("cursor") || null;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);

    const since = new Date(Date.now() - hours * 3600000).toISOString();

    // Build feed query
    let feedQuery = admin
      .from("user_events")
      .select("event, page, meta, created_at, user_id")
      .like("event", "signal:%")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (severity && ["error", "warning", "info"].includes(severity)) {
      feedQuery = feedQuery.filter("meta->>severity", "eq", severity);
    }
    if (cursor) {
      feedQuery = feedQuery.lt("created_at", cursor);
    }

    // Count query — all signals in period grouped by severity
    const countQuery = admin
      .from("user_events")
      .select("meta", { count: "exact" })
      .like("event", "signal:%")
      .gte("created_at", since);

    const [feedRes, allSignalsRes] = await Promise.all([feedQuery, countQuery]);

    const signals = feedRes.data || [];
    const hasMore = signals.length > limit;
    if (hasMore) signals.pop();

    // Aggregate counts by severity from all signals
    const counts = { error: 0, warning: 0, info: 0 };
    for (const row of allSignalsRes.data || []) {
      const sev = row.meta?.severity;
      if (sev && counts[sev] !== undefined) counts[sev]++;
    }

    // Fetch user emails for display (batch lookup)
    const userIds = [...new Set(signals.map((s) => s.user_id))];
    let userMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      if (profiles) {
        for (const p of profiles) {
          userMap[p.id] = p.display_name || `anon-${p.id.slice(0, 4)}`;
        }
      }
    }

    // Attach display name to each signal
    const enriched = signals.map((s) => ({
      ...s,
      user_label: userMap[s.user_id] || `anon-${s.user_id.slice(0, 4)}`,
    }));

    return Response.json({ signals: enriched, counts, hasMore });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
