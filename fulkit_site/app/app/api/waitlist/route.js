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

// POST — join waitlist (authenticated users)
export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { email, category } = await request.json();
    const finalEmail = (email || user.email || "").trim();
    if (!finalEmail) return Response.json({ error: "Email required" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("waitlist").upsert({
      user_id: user.id,
      email: finalEmail,
      category: category || "spotify",
    }, { onConflict: "email,category", ignoreDuplicates: true }).select().single();

    if (error) return Response.json({ error: "Failed to join waitlist" }, { status: 500 });

    // Fire-and-forget: send "added" confirmation email
    const origin = request.headers.get("origin") || request.headers.get("x-forwarded-host") || "https://fulkit.app";
    const authHeader = request.headers.get("authorization");
    fetch(`${origin.startsWith("http") ? origin : `https://${origin}`}/api/email/waitlist`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ email: finalEmail, template: "added" }),
    }).catch(() => {});

    return Response.json(data);
  } catch {
    return Response.json({ error: "Failed to join waitlist" }, { status: 500 });
  }
}

// GET — owner-only, list all waitlist entries
export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isOwner(user.id))) return Response.json({ error: "Owner only" }, { status: 403 });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return Response.json({ error: "Failed to fetch waitlist" }, { status: 500 });
    return Response.json(data);
  } catch {
    return Response.json({ error: "Failed to fetch waitlist" }, { status: 500 });
  }
}

// DELETE — owner-only, remove entry
export async function DELETE(request) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isOwner(user.id))) return Response.json({ error: "Owner only" }, { status: 403 });

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return Response.json({ error: "id required" }, { status: 400 });

    const admin = getSupabaseAdmin();
    await admin.from("waitlist").delete().eq("id", id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
