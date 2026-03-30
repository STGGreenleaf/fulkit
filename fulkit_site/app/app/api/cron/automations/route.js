/**
 * GET /api/cron/automations — Execute due user automations.
 * Runs every hour via Vercel Cron.
 *
 * Checks all active automations, determines which are due based on
 * schedule + timezone + last_run_at, and creates whispers for each.
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";

const DAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function isDue(schedule, timezone, lastRunAt) {
  const now = new Date();
  const parts = schedule.split(":");

  // Get current time in user's timezone
  const userTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const userHour = userTime.getHours();
  const userDay = userTime.getDay();
  const userDate = userTime.getDate();

  // Already ran today? (check within last 20 hours to account for timezone edge cases)
  if (lastRunAt) {
    const hoursSinceRun = (now - new Date(lastRunAt)) / 3600000;
    if (hoursSinceRun < 20) return false;
  }

  const type = parts[0];

  if (type === "daily") {
    // daily:HH:MM — run if current hour matches (±1 for cron drift)
    const targetHour = parseInt(parts[1]);
    return Math.abs(userHour - targetHour) <= 1;
  }

  if (type === "weekly") {
    // weekly:day:HH:MM
    const targetDay = DAYS[parts[1]?.toLowerCase()];
    const targetHour = parseInt(parts[2]);
    if (targetDay === undefined) return false;
    return userDay === targetDay && Math.abs(userHour - targetHour) <= 1;
  }

  if (type === "monthly") {
    // monthly:DD:HH:MM
    const targetDate = parseInt(parts[1]);
    const targetHour = parseInt(parts[2]);
    return userDate === targetDate && Math.abs(userHour - targetHour) <= 1;
  }

  return false;
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();

    // Get all active automations
    const { data: automations, error } = await admin
      .from("user_automations")
      .select("id, user_id, name, prompt, schedule, timezone, last_run_at")
      .eq("active", true);

    if (error || !automations?.length) {
      return Response.json({ processed: 0 });
    }

    let executed = 0;

    for (const auto of automations) {
      if (!isDue(auto.schedule, auto.timezone || "UTC", auto.last_run_at)) continue;

      // Create a whisper for this automation
      const whisperText = `⏰ ${auto.name}: ${auto.prompt}`;

      // Store as a whisper in preferences (keyed by automation ID so multiple don't stack)
      await admin.from("preferences").upsert({
        user_id: auto.user_id,
        key: `automation_whisper:${auto.id}`,
        value: JSON.stringify({ text: whisperText, automationId: auto.id, name: auto.name, prompt: auto.prompt }),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,key" });

      // Update last_run_at
      await admin.from("user_automations")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", auto.id);

      executed++;
    }

    return Response.json({ processed: automations.length, executed });
  } catch (err) {
    console.error("[cron/automations] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
