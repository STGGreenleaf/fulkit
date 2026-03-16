import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("vault_broadcasts")
    .select("id, title, content, created_at")
    .eq("channel", "announcement")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) return Response.json([], { status: 200 });
  return Response.json(data || []);
}
