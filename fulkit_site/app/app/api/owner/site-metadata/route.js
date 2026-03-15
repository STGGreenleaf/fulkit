import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// GET /api/owner/site-metadata — return current site metadata
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner") return Response.json({ error: "Owner only" }, { status: 403 });

    const { data, error } = await admin.from("site_metadata").select("*").limit(1).single();
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/owner/site-metadata — update site metadata
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner") return Response.json({ error: "Owner only" }, { status: 403 });

    const body = await request.json();
    const updates = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.og_title !== undefined) updates.og_title = body.og_title;
    if (body.og_description !== undefined) updates.og_description = body.og_description;
    if (body.og_image_url !== undefined) updates.og_image_url = body.og_image_url;
    if (body.og_image_slot !== undefined) updates.og_image_slot = body.og_image_slot;
    if (body.twitter_image_url !== undefined) updates.twitter_image_url = body.twitter_image_url;
    updates.updated_at = new Date().toISOString();

    // Get the single row ID first
    const { data: existing } = await admin.from("site_metadata").select("id").limit(1).single();
    if (!existing) return Response.json({ error: "No metadata row" }, { status: 404 });

    const { data, error } = await admin
      .from("site_metadata")
      .update(updates)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
