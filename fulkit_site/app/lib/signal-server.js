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

/**
 * withSignal() — wrap an API route handler to catch unhandled errors
 * and emit an api_error signal before returning 500.
 * Usage: export const GET = withSignal(async (request) => { ... });
 */
export function withSignal(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      // Try to extract userId from Bearer token
      let userId = "anonymous";
      try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (token) {
          const { data } = await getSupabaseAdmin().auth.getUser(token);
          if (data?.user?.id) userId = data.user.id;
        }
      } catch {}

      emitServerSignal(userId, "api_error", "error", {
        route: new URL(request.url).pathname,
        method: request.method,
        error: err?.message || "Unknown error",
        stack: err?.stack?.split("\n").slice(0, 3).join(" | ") || null,
      });

      return Response.json({ error: "Internal error" }, { status: 500 });
    }
  };
}
