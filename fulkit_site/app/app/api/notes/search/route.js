import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { getEmbedding } from "../../embed/route";

// GET /api/notes/search?q=query — semantic search across user's notes
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);
    const threshold = parseFloat(searchParams.get("threshold") || "0.6");

    if (!query) return Response.json({ error: "q parameter required" }, { status: 400 });

    // Get embedding for query
    const queryEmbedding = await getEmbedding(query);

    // Call the match_notes function
    const { data, error } = await admin.rpc("match_notes", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_user_id: user.id,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) throw new Error(error.message);

    return Response.json({
      results: (data || []).map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content?.slice(0, 500),
        source: n.source,
        folder: n.folder,
        similarity: Math.round(n.similarity * 100) / 100,
      })),
    });
  } catch (err) {
    console.error("[notes/search] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
