/**
 * GET /api/cron/hot-seat — Monthly founder seat activity check.
 * Runs on 1st of each month via Vercel Cron.
 *
 * Logic:
 * 1. Find all users with seat_type = 'founder'
 * 2. Check messages_this_month against HOT_SEATS.minMonthly (4)
 * 3. If under threshold AND last_message_date > graceDays (30) → revoke to 'free'
 * 4. If under threshold but within grace → emit warning signal
 * 5. Emit summary signal to Radio for owner visibility
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { HOT_SEATS } from "../../../../lib/ful-config";
import { emitServerSignal } from "../../../../lib/signal-server";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();

    // Find all founder seat holders
    const { data: founders, error } = await admin
      .from("profiles")
      .select("id, email, name, messages_this_month, last_message_date")
      .eq("seat_type", "founder");

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!founders || founders.length === 0) {
      return Response.json({ message: "No founder seats assigned", checked: 0 });
    }

    const now = Date.now();
    const gracePeriodMs = HOT_SEATS.graceDays * 24 * 60 * 60 * 1000;
    const revoked = [];
    const warned = [];
    const active = [];

    for (const user of founders) {
      const msgs = user.messages_this_month || 0;
      const lastMsg = user.last_message_date ? new Date(user.last_message_date).getTime() : 0;
      const daysSinceLastMsg = lastMsg > 0 ? Math.floor((now - lastMsg) / 86400000) : Infinity;

      if (msgs >= HOT_SEATS.minMonthly) {
        // Active — meets threshold
        active.push({ id: user.id, name: user.name, msgs });
        continue;
      }

      // Under threshold — check grace period
      if (daysSinceLastMsg > HOT_SEATS.graceDays) {
        // Grace period expired — revoke to free
        await admin
          .from("profiles")
          .update({ seat_type: "free" })
          .eq("id", user.id);

        revoked.push({ id: user.id, name: user.name, email: user.email, msgs, daysSince: daysSinceLastMsg });

        emitServerSignal(user.id, "hot_seat_revoked", "warning", {
          name: user.name,
          msgs,
          daysSinceLastMsg,
          reason: `Under ${HOT_SEATS.minMonthly} msgs/month, inactive ${daysSinceLastMsg} days (grace: ${HOT_SEATS.graceDays})`,
        });
      } else {
        // Within grace — warn
        warned.push({ id: user.id, name: user.name, msgs, daysSince: daysSinceLastMsg });

        emitServerSignal(user.id, "hot_seat_warning", "info", {
          name: user.name,
          msgs,
          daysSinceLastMsg,
          graceDaysRemaining: HOT_SEATS.graceDays - daysSinceLastMsg,
          message: `Low activity — ${msgs} msgs this month (need ${HOT_SEATS.minMonthly}). ${HOT_SEATS.graceDays - daysSinceLastMsg} grace days remaining.`,
        });
      }
    }

    // Summary signal for owner Radio
    if (founders.length > 0) {
      // Find the owner to attribute the signal
      const { data: owner } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "owner")
        .limit(1)
        .single();

      if (owner) {
        emitServerSignal(owner.id, "hot_seat_audit", "info", {
          total: founders.length,
          active: active.length,
          warned: warned.length,
          revoked: revoked.length,
          details: {
            active: active.map(u => `${u.name} (${u.msgs} msgs)`),
            warned: warned.map(u => `${u.name} (${u.msgs} msgs, ${u.daysSince}d inactive)`),
            revoked: revoked.map(u => `${u.name} (${u.email}, ${u.daysSince}d inactive)`),
          },
        });
      }
    }

    return Response.json({
      checked: founders.length,
      active: active.length,
      warned: warned.length,
      revoked: revoked.length,
    });
  } catch (err) {
    return Response.json({ error: "Hot seat check failed" }, { status: 500 });
  }
}
