import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await getSupabaseAdmin()
      .from("integrations")
      .select("access_token, updated_at")
      .eq("user_id", user.id)
      .eq("provider", "vagaro")
      .maybeSingle();

    return Response.json({ connected: !!data?.access_token, lastSynced: data?.updated_at || null });
  } catch {
    return Response.json({ connected: false });
  }
}
