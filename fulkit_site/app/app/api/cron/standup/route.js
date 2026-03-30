/**
 * GET /api/cron/standup — Morning standup whisper for all active users.
 * Runs every day at 8am UTC (adjusts per user timezone via automations).
 *
 * For each active user: counts open actions, overdue items, and today's
 * calendar events. Generates a brief standup whisper for the dashboard.
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Get active users (messaged in last 14 days)
    const { data: users } = await admin
      .from("profiles")
      .select("id, name")
      .gt("messages_this_month", 0);

    if (!users?.length) return Response.json({ processed: 0 });

    let created = 0;

    for (const user of users) {
      try {
        // Count open actions + overdue
        const [openRes, overdueRes] = await Promise.all([
          admin.from("actions").select("id", { count: "exact", head: true })
            .eq("user_id", user.id).in("status", ["open", "in_progress"]),
          admin.from("actions").select("id", { count: "exact", head: true })
            .eq("user_id", user.id).eq("status", "open").lt("due_date", today),
        ]);

        const openCount = openRes.count || 0;
        const overdueCount = overdueRes.count || 0;

        if (openCount === 0 && overdueCount === 0) continue; // Nothing to report

        let text = `You have ${openCount} open item${openCount !== 1 ? "s" : ""} today.`;
        if (overdueCount > 0) {
          text += ` ${overdueCount} ${overdueCount === 1 ? "is" : "are"} overdue.`;
        }
        text += ` Say "standup" for the full picture.`;

        await admin.from("preferences").upsert({
          user_id: user.id,
          key: "standup_whisper",
          value: JSON.stringify({ text, open: openCount, overdue: overdueCount }),
          updated_at: now.toISOString(),
        }, { onConflict: "user_id,key" });

        created++;
      } catch {}
    }

    return Response.json({ processed: users.length, created });
  } catch (err) {
    console.error("[cron/standup] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
