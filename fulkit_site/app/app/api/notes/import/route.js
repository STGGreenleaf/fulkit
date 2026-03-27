import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// POST /api/notes/import — bulk import notes (owner only)
// Body: { notes: [{ title, content, source?, folder? }, ...] }
export async function POST(request) {
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

    const { notes } = await request.json();
    if (!Array.isArray(notes) || notes.length === 0) {
      return Response.json({ error: "notes array required" }, { status: 400 });
    }

    const rows = notes.map((n) => ({
      user_id: user.id,
      title: n.title,
      content: n.content,
      source: n.source || "import",
      folder: n.folder || "00-INBOX",
      encrypted: false,
      context_mode: "available",
    }));

    const { data, error } = await admin.from("notes").insert(rows).select("id, title");
    if (error) {
      return Response.json({ error: "Import failed" }, { status: 500 });
    }

    return Response.json({ imported: data.length, notes: data });
  } catch (err) {
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
