import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { authenticateUser } from "../../../../lib/linear-server";

export async function GET(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return NextResponse.json({ connected: false });

    const { data } = await getSupabaseAdmin()
      .from("integrations")
      .select("updated_at")
      .eq("user_id", userId)
      .eq("provider", "linear")
      .single();

    return NextResponse.json({
      connected: !!data,
      lastSynced: data?.updated_at || null,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
