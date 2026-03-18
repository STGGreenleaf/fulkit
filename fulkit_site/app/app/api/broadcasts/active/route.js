import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// Public endpoint — intentionally no auth. Only returns announcement channel.
// Never expose context, owner-context, or fabric-context here.
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
