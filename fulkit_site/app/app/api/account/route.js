import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { deleteAllUserData } from "./data/route";

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
