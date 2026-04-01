import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// GET /api/owner/metrics — user counts by tier (owner only)
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Owner check
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "owner") {
      return Response.json({ error: "Owner only" }, { status: 403 });
    }

    // Fetch all profiles
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("seat_type, onboarded, messages_this_month");
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const total = profiles.length;
    const free = profiles.filter(p => !p.seat_type || p.seat_type === "free" || p.seat_type === "trial").length;
    const standard = profiles.filter(p => p.seat_type === "standard").length;
    const pro = profiles.filter(p => p.seat_type === "pro").length;
    const onboarded = profiles.filter(p => p.onboarded).length;
    const messagesThisMonth = profiles.reduce((sum, p) => sum + (p.messages_this_month || 0), 0);

    return Response.json({ total, free, standard, pro, onboarded, messagesThisMonth });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
