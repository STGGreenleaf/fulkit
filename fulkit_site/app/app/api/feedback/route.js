import { getSupabaseAdmin } from "../../../lib/supabase-server";

async function getUser(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function isOwner(userId) {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "owner";
}

// POST — submit a bug report (authenticated users)
export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { message, category, page_url } = await request.json();
    if (!message?.trim()) return Response.json({ error: "Message required" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("feedback_tickets").insert({
      user_id: user.id,
      email: user.email || "",
      category: category || "bug",
      message: message.trim(),
      page_url: page_url || "",
      status: "open",
    }).select().single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// GET — owner-only, list all tickets
export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isOwner(user.id))) return Response.json({ error: "Owner only" }, { status: 403 });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("feedback_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — owner-only, update ticket status
export async function PATCH(request) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isOwner(user.id))) return Response.json({ error: "Owner only" }, { status: 403 });

    const { id, status } = await request.json();
    if (!id || !status) return Response.json({ error: "id and status required" }, { status: 400 });

    const validStatuses = ["open", "seen", "fixed", "wontfix"];
    if (!validStatuses.includes(status)) return Response.json({ error: "Invalid status" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("feedback_tickets")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
