import { getSupabaseAdmin } from "./supabase-server";

/**
 * emitServerSignal() — fire-and-forget server-side signal emission.
 * Writes to user_events with `signal:` prefix. Never blocks request.
 */
export function emitServerSignal(userId, signal, severity = "info", detail = {}) {
  if (!userId) return;
  getSupabaseAdmin()
    .from("user_events")
    .insert({
      user_id: userId,
      event: `signal:${signal}`,
      page: "server",
      meta: { severity, ...detail },
    })
    .then(() => {})
    .catch(() => {});
}
