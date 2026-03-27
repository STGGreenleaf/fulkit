import { authenticateUser, getSlackToken } from "../../../../lib/slack-server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function DELETE(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const integration = await getSlackToken(userId);
  if (integration?.access_token) {
    try {
      await fetch("https://slack.com/api/auth.revoke", {
        method: "POST",
        headers: { Authorization: `Bearer ${integration.access_token}` },
      });
    } catch {}
  }

  const { error } = await getSupabaseAdmin().from("integrations").delete().eq("user_id", userId).eq("provider", "slack");
  if (error) return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  return Response.json({ ok: true });
}
