import { authenticateUser, getDropboxToken } from "../../../../lib/dropbox-server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function DELETE(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Revoke at Dropbox
  const integration = await getDropboxToken(userId);
  if (integration?.access_token) {
    try {
      await fetch("https://api.dropboxapi.com/2/auth/token/revoke", {
        method: "POST",
        headers: { Authorization: `Bearer ${integration.access_token}` },
      });
    } catch {}
  }

  const { error } = await getSupabaseAdmin().from("integrations").delete().eq("user_id", userId).eq("provider", "dropbox");
  if (error) return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  return Response.json({ ok: true });
}
