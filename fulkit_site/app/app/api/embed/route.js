import { getSupabaseAdmin } from "../../../lib/supabase-server";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const EMBEDDING_MODEL = "voyage-3.5-lite";
const EMBEDDING_DIMENSIONS = 1024;

async function getEmbedding(text) {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY not set");

  // Truncate to ~32000 chars — voyage-3.5-lite supports 32K tokens
  const truncated = text.slice(0, 32000);

  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: truncated,
      input_type: "document",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Voyage API error: ${res.status}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

// For semantic search queries — uses "query" input_type for better retrieval
async function getQueryEmbedding(text) {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY not set");

  const truncated = text.slice(0, 32000);

  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: truncated,
      input_type: "query",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Voyage API error: ${res.status}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

// POST /api/embed — embed a single note by ID
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { noteId } = await request.json();
    if (!noteId) return Response.json({ error: "noteId required" }, { status: 400 });

    // Fetch the note (must belong to this user)
    const { data: note, error: noteErr } = await admin
      .from("notes")
      .select("id, title, content")
      .eq("id", noteId)
      .eq("user_id", user.id)
      .single();

    if (noteErr || !note) return Response.json({ error: "Note not found" }, { status: 404 });

    // Build embedding input from title + content
    const embeddingText = `${note.title || ""}\n\n${note.content || ""}`.trim();
    if (!embeddingText) return Response.json({ error: "Note has no content" }, { status: 400 });

    const embedding = await getEmbedding(embeddingText);

    // Store embedding
    const { error: updateErr } = await admin
      .from("notes")
      .update({ embedding: JSON.stringify(embedding) })
      .eq("id", noteId)
      .eq("user_id", user.id);

    if (updateErr) throw new Error(updateErr.message);

    return Response.json({ embedded: true, noteId, dimensions: embedding.length });
  } catch (err) {
    console.error("[embed] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/embed — batch embed all un-embedded notes for the user
export async function PUT(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch notes without embeddings
    const { data: notes, error: fetchErr } = await admin
      .from("notes")
      .select("id, title, content")
      .eq("user_id", user.id)
      .is("embedding", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!notes?.length) return Response.json({ embedded: 0, message: "All notes already embedded" });

    let embedded = 0;
    let failed = 0;
    for (const note of notes) {
      try {
        const text = `${note.title || ""}\n\n${note.content || ""}`.trim();
        if (!text) continue;

        const embedding = await getEmbedding(text);
        await admin
          .from("notes")
          .update({ embedding: JSON.stringify(embedding) })
          .eq("id", note.id);
        embedded++;
      } catch {
        failed++;
      }
    }

    return Response.json({ embedded, failed, total: notes.length });
  } catch (err) {
    console.error("[embed] Batch error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export { getEmbedding, getQueryEmbedding, EMBEDDING_DIMENSIONS };
