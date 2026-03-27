import { authenticateUser } from "../../../../lib/readwise-server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function DELETE(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await getSupabaseAdmin().from("integrations").delete().eq("user_id", userId).eq("provider", "readwise");
  if (error) return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  return Response.json({ ok: true });
}
