/**
 * GET /api/cron/weekly-digest — Weekly activity digest for all active users.
 * Runs every Monday 9am UTC via Vercel Cron.
 *
 * For each active user: aggregates past 7 days of conversations, actions,
 * and patterns. Caches as a preference so the greeting route can include it.
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get all active users (messaged in the last 30 days)
    const { data: users } = await admin
      .from("profiles")
      .select("id, name")
      .gt("messages_this_month", 0);

    if (!users || users.length === 0) {
      return Response.json({ processed: 0 });
    }

    let processed = 0;

    for (const user of users) {
      try {
        // Parallel fetch: conversations, completed actions, patterns
        const [convos, completedActions, topPatterns] = await Promise.all([
          admin.from("conversations").select("title, topics")
            .eq("user_id", user.id).gte("updated_at", weekAgo)
            .order("updated_at", { ascending: false }).limit(20)
            .then(({ data }) => data || []),
          admin.from("actions").select("title")
            .eq("user_id", user.id).eq("status", "done")
            .gte("updated_at", weekAgo)
            .then(({ data }) => data || []),
          admin.from("user_patterns").select("ecosystem, frequency")
            .eq("user_id", user.id)
            .order("frequency", { ascending: false }).limit(5)
            .then(({ data }) => data || []),
        ]);

        // Build digest summary
        const topics = [...new Set(convos.flatMap(c => c.topics || []))].slice(0, 8);
        const topEcosystems = [...new Set(topPatterns.map(p => p.ecosystem).filter(Boolean))].slice(0, 3);

        const digest = [
          `Week of ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}:`,
          `${convos.length} conversation${convos.length !== 1 ? "s" : ""}`,
          completedActions.length > 0 ? `${completedActions.length} action${completedActions.length !== 1 ? "s" : ""} completed` : null,
          topics.length > 0 ? `Topics: ${topics.join(", ")}` : null,
          topEcosystems.length > 0 ? `Most used: ${topEcosystems.join(", ")}` : null,
        ].filter(Boolean).join(". ");

        // Cache as preference for greeting route to pick up
        await admin.from("preferences").upsert({
          user_id: user.id,
          key: "weekly_digest",
          value: digest,
          updated_at: new Date().toISOString(),
        });

        processed++;
      } catch (err) {
        console.error(`[weekly-digest] Failed for user ${user.id}:`, err.message);
      }
    }

    return Response.json({ processed, total: users.length });
  } catch (err) {
    console.error("[weekly-digest] Cron error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
