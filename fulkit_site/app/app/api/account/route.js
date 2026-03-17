import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { deleteAllUserData } from "./data/route";

// PATCH /api/account — update profile fields (name)
export async function PATCH(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const updates = {};
    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim().slice(0, 100);
    }
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { error } = await admin.from("profiles").update(updates).eq("id", user.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ updated: true, ...updates });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/account — delete all data + delete the account entirely
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

    // Wipe all user data first
    await deleteAllUserData(admin, user.id);

    // Delete the profile row
    await admin.from("profiles").delete().eq("id", user.id);

    // Delete the auth user
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("[account] Auth delete error:", deleteError.message);
      return Response.json({ error: "Failed to delete auth account" }, { status: 500 });
    }

    return Response.json({ deleted: true });
  } catch (err) {
    console.error("[account] Delete error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
