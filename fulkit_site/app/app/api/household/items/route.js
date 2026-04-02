import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// GET: fetch unchecked household items for user's active pair
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Find active pair
    const { data: pair } = await admin.from("pairs")
      .select("id")
      .or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`)
      .eq("status", "active")
      .maybeSingle();

    if (!pair) return Response.json({ items: [] });

    const { data: items } = await admin.from("household_items")
      .select("id, type, list_name, title, body, created_by, metadata, created_at")
      .eq("pair_id", pair.id)
      .eq("checked", false)
      .order("created_at", { ascending: false })
      .limit(100);

    return Response.json({ items: items || [], pairId: pair.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: check off an item (it vanishes)
export async function PATCH(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { item_id } = await request.json();
    if (!item_id) return Response.json({ error: "item_id required" }, { status: 400 });

    // Verify the item belongs to user's active pair
    const { data: item } = await admin.from("household_items")
      .select("id, pair_id")
      .eq("id", item_id)
      .single();

    if (!item) return Response.json({ error: "Item not found" }, { status: 404 });

    const { data: pair } = await admin.from("pairs")
      .select("id")
      .eq("id", item.pair_id)
      .or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`)
      .eq("status", "active")
      .maybeSingle();

    if (!pair) return Response.json({ error: "Not authorized" }, { status: 403 });

    await admin.from("household_items")
      .update({
        checked: true,
        checked_by: user.id,
        checked_at: new Date().toISOString(),
      })
      .eq("id", item_id);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
