/**
 * GET /api/cron/closeout — Daily closeout reminder.
 * Runs twice: 4pm CT (10pm UTC) + 8am CT (2pm UTC next day).
 *
 * Checks if Square daily sales have been logged to TrueGauge.
 * If not, generates a closeout whisper for the dashboard.
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { squareFetch } from "../../../../lib/square-server";
import { getTrueGaugeToken, truegaugeFetch } from "../../../../lib/truegauge";

function todayMST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" });
}

function yesterdayMST() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Denver" });
}

async function getSquareDailySales(userId, date) {
  try {
    const startAt = `${date}T00:00:00Z`;
    const endAt = `${date}T23:59:59Z`;
    const res = await squareFetch(userId, "/payments", {
      params: { begin_time: startAt, end_time: endAt },
    });
    if (!res?.payments) return null;
    let revenue = 0, refunds = 0, count = 0;
    for (const p of res.payments) {
      if (p.status !== "COMPLETED") continue;
      count++;
      revenue += (p.amount_money?.amount || 0);
      refunds += (p.refunded_money?.amount || 0);
    }
    const net = (revenue - refunds) / 100;
    return { net, orders: count, date };
  } catch { return null; }
}

async function isTrueGaugeLogged(userId, date) {
  try {
    const tgKey = await getTrueGaugeToken(userId);
    if (!tgKey) return false;
    const res = await truegaugeFetch(tgKey, "list_day_entries", { start_date: date, end_date: date });
    return res?.entries?.length > 0;
  } catch { return false; }
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();

    // Get owner (closeout is owner-only for now)
    const { data: owner } = await admin
      .from("profiles")
      .select("id, name")
      .eq("role", "owner")
      .single();

    if (!owner) return Response.json({ processed: 0 });

    const today = todayMST();
    const yesterday = yesterdayMST();
    const hourMST = new Date().toLocaleString("en-US", { timeZone: "America/Denver", hour: "numeric", hour12: false });
    const isMorning = parseInt(hourMST) < 12;

    // Check the relevant date
    const checkDate = isMorning ? yesterday : today;
    const label = isMorning ? "Yesterday" : "Today";

    // Already logged?
    const logged = await isTrueGaugeLogged(owner.id, checkDate);
    if (logged) {
      // Clear any stale closeout whisper
      await admin.from("preferences")
        .delete()
        .eq("user_id", owner.id)
        .eq("key", "closeout_whisper");
      return Response.json({ status: "already_logged", date: checkDate });
    }

    // Pull Square sales
    const sales = await getSquareDailySales(owner.id, checkDate);
    if (!sales) {
      return Response.json({ status: "no_square_data", date: checkDate });
    }

    // Generate closeout whisper
    const whisper = isMorning
      ? `Yesterday's closeout wasn't logged. Net was $${sales.net.toFixed(2)} across ${sales.orders} orders. Say "close out yesterday" to handle it.`
      : `Time to close out. Net today: $${sales.net.toFixed(2)} across ${sales.orders} orders. Say "close out" to log it.`;

    await admin.from("preferences").upsert({
      user_id: owner.id,
      key: "closeout_whisper",
      value: JSON.stringify({ text: whisper, date: checkDate, net: sales.net, orders: sales.orders }),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,key" });

    return Response.json({ status: "whisper_created", date: checkDate, net: sales.net });
  } catch (err) {
    console.error("[cron/closeout] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
