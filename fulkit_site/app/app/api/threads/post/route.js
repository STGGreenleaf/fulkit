/**
 * POST /api/threads/post — Publish to Threads via Meta Threads API.
 * Owner-only. Uses stored access token from OAuth flow.
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";

async function getOwner(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner") return null;
  return user;
}

export async function POST(request) {
  const user = await getOwner(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { text, imageUrl } = await request.json();

    if (!text || typeof text !== "string" || text.length === 0) {
      return Response.json({ error: "Text is required" }, { status: 400 });
    }
    if (text.length > 500) {
      return Response.json({ error: "Text exceeds 500 character limit" }, { status: 400 });
    }

    // Get stored Threads token + auto-refresh if older than 50 days
    const admin = getSupabaseAdmin();
    const [tokenResult, userIdResult] = await Promise.all([
      admin.from("preferences").select("value, updated_at").eq("user_id", user.id).eq("key", "threads_access_token").maybeSingle(),
      admin.from("preferences").select("value").eq("user_id", user.id).eq("key", "threads_user_id").maybeSingle(),
    ]);

    let accessToken = tokenResult?.data?.value;
    const threadsUserId = userIdResult?.data?.value;

    // Auto-refresh: if token is older than 50 days, refresh it (expires at 60)
    if (accessToken && tokenResult?.data?.updated_at) {
      const age = Date.now() - new Date(tokenResult.data.updated_at).getTime();
      if (age > 50 * 24 * 60 * 60 * 1000) {
        try {
          const refreshRes = await fetch(
            `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${accessToken}`
          );
          const refreshData = await refreshRes.json();
          if (refreshData.access_token) {
            accessToken = refreshData.access_token;
            await admin.from("preferences").upsert({
              user_id: user.id, key: "threads_access_token",
              value: accessToken, updated_at: new Date().toISOString(),
            });
          }
        } catch {}
      }
    }

    if (!accessToken || !threadsUserId) {
      return Response.json({ error: "Threads not connected. Visit /api/meta/token to authorize." }, { status: 400 });
    }

    // Step 1: Create media container
    const containerParams = new URLSearchParams({
      media_type: imageUrl ? "IMAGE" : "TEXT",
      text,
      access_token: accessToken,
    });
    if (imageUrl) containerParams.set("image_url", imageUrl);

    const containerRes = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads?${containerParams.toString()}`,
      { method: "POST" }
    );
    const containerData = await containerRes.json();
    if (containerData.error) throw new Error(containerData.error.message);
    const containerId = containerData.id;

    // Step 2: Wait briefly for media processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Publish the container
    const publishRes = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish?creation_id=${containerId}&access_token=${accessToken}`,
      { method: "POST" }
    );
    const publishData = await publishRes.json();
    if (publishData.error) throw new Error(publishData.error.message);

    return Response.json({ success: true, id: publishData.id });
  } catch (err) {
    console.error("[threads/post] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
