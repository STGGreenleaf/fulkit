import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("id");
    if (!jobId) return Response.json({ error: "Job ID required" }, { status: 400 });

    const { data: job } = await admin.from("jobs")
      .select("id, type, status, progress, total, result, error, created_at, completed_at")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();

    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

    return Response.json(job);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
