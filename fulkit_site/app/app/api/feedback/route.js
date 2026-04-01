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

// POST — submit feedback (authenticated users)
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

    if (error) return Response.json({ error: "Failed to submit feedback" }, { status: 500 });

    // Email owner (fire-and-forget)
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "F\u00FClkit <hello@fulkit.app>",
            to: "collingreenleaf@gmail.com",
            subject: `New ${category || "bug"} feedback from ${user.email || "a user"}`,
            html: `<p><strong>${user.email || "Unknown"}</strong> submitted ${category || "bug"} feedback:</p><blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555">${message.trim()}</blockquote><p><a href="https://fulkit.app/owner">View in Owner Dashboard \u2192</a></p>`,
          }),
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
      }
    } catch {}

    return Response.json(data);
  } catch {
    return Response.json({ error: "Failed to submit feedback" }, { status: 500 });
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

    if (error) return Response.json({ error: "Failed to fetch tickets" }, { status: 500 });
    return Response.json(data);
  } catch {
    return Response.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

// PATCH — owner-only, update ticket status + optional reply
export async function PATCH(request) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isOwner(user.id))) return Response.json({ error: "Owner only" }, { status: 403 });

    const { id, status, reply } = await request.json();
    if (!id) return Response.json({ error: "id required" }, { status: 400 });

    const updates = {};
    if (status) {
      const validStatuses = ["open", "seen", "fixed", "wontfix"];
      if (!validStatuses.includes(status)) return Response.json({ error: "Invalid status" }, { status: 400 });
      updates.status = status;
    }
    if (reply !== undefined) updates.reply = reply;

    if (Object.keys(updates).length === 0) return Response.json({ error: "Nothing to update" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("feedback_tickets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return Response.json({ error: "Failed to update ticket" }, { status: 500 });

    // If reply was added, create a notification for the user
    if (reply?.trim() && data.user_id) {
      admin.from("user_notifications").insert({
        user_id: data.user_id,
        type: "feedback_reply",
        title: "We heard you",
        message: reply.trim(),
      }).then(() => {}).catch(() => {});
    }

    return Response.json(data);
  } catch {
    return Response.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
