import { authenticateUser, getSquareToken } from "../../../../lib/square-server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function DELETE(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Revoke token at Square
  const integration = await getSquareToken(userId);
  if (integration?.access_token) {
    try {
      const squareBase = (process.env.SQUARE_APP_ID || "").startsWith("sandbox-")
            ? "https://connect.squareupsandbox.com"
            : "https://connect.squareup.com";
      await fetch(`${squareBase}/oauth2/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.SQUARE_APP_ID,
          access_token: integration.access_token,
        }),
      });
    } catch (err) {
      console.error("[square/disconnect] Revoke failed:", err.message);
    }
  }

  const { error } = await getSupabaseAdmin()
    .from("integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "square");

  if (error) {
    return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
