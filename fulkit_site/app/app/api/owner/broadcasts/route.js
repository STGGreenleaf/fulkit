import { getSupabaseAdmin } from "../../../../lib/supabase-server";

async function getOwner(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner") return null;
  return user;
}

export async function GET(request) {
  const owner = await getOwner(request);
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("vault_broadcasts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const owner = await getOwner(request);
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { title, content, channel } = await request.json();
  if (!title || !content || !["context", "announcement"].includes(channel)) {
    return Response.json({ error: "Missing title, content, or valid channel" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("vault_broadcasts")
    .insert({ title, content, channel })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function PATCH(request) {
  const owner = await getOwner(request);
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await request.json();
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const allowed = {};
  if (updates.title !== undefined) allowed.title = updates.title;
  if (updates.content !== undefined) allowed.content = updates.content;
  if (updates.channel !== undefined) allowed.channel = updates.channel;
  if (updates.active !== undefined) allowed.active = updates.active;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await getSupabaseAdmin()
    .from("vault_broadcasts")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(request) {
  const owner = await getOwner(request);
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const { error } = await getSupabaseAdmin()
    .from("vault_broadcasts")
    .delete()
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
