import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { authenticateUser } from "../../../../lib/linear-server";

export async function DELETE(request) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await getSupabaseAdmin()
      .from("integrations")
      .delete()
      .eq("user_id", userId)
      .eq("provider", "linear");

    return NextResponse.json({ disconnected: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
