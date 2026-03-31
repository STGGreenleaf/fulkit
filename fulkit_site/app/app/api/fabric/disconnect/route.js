import { authenticateUser } from "../../../../lib/fabric-server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function DELETE(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Support both body and query param (some environments strip DELETE bodies)
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const provider = body.provider || url.searchParams.get("provider");
  if (!provider) return Response.json({ error: "provider required" }, { status: 400 });

  const { error } = await getSupabaseAdmin()
    .from("integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
