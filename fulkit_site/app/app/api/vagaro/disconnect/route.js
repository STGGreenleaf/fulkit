import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    await getSupabaseAdmin()
      .from("integrations")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "vagaro");

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
