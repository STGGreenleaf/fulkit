import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// Cascade-delete all user data, keep the account active
async function deleteAllUserData(admin, userId) {
  // 1. Fetch conversation IDs to cascade into messages
  const { data: convs } = await admin.from("conversations").select("id").eq("user_id", userId);
  const convIds = (convs || []).map((c) => c.id);

  // 2. Delete messages belonging to user's conversations
  if (convIds.length) {
    await admin.from("messages").delete().in("conversation_id", convIds);
  }

  // 3-7. Delete user-scoped tables in dependency order
  await admin.from("conversations").delete().eq("user_id", userId);
  await admin.from("actions").delete().eq("user_id", userId);
  await admin.from("notes").delete().eq("user_id", userId);
  await admin.from("preferences").delete().eq("user_id", userId);
  await admin.from("integrations").delete().eq("user_id", userId);

  // 8. Crates — fetch IDs, delete tracks first, then crates
  const { data: crates } = await admin.from("crates").select("id").eq("user_id", userId);
  const crateIds = (crates || []).map((c) => c.id);
  if (crateIds.length) {
    await admin.from("crate_tracks").delete().in("crate_id", crateIds);
  }
  await admin.from("crates").delete().eq("user_id", userId);

  // 9. Reset profile (keep the row — it's tied to auth)
  await admin.from("profiles").update({
    onboarded: false,
    messages_this_month: 0,
    name: "",
  }).eq("id", userId);
}

// DELETE /api/account/data — wipe all data, keep account
export async function DELETE(request) {
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

    await deleteAllUserData(admin, user.id);

    return Response.json({ deleted: true });
  } catch (err) {
    console.error("[account/data] Delete error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export { deleteAllUserData };
