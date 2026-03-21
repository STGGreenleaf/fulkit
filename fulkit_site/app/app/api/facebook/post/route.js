/**
 * POST /api/facebook/post — Publish to Facebook Page via Graph API.
 * Owner-only. Supports text-only or text + image.
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// Page token stored in preferences (permanent, from OAuth flow)

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

    if (!text && !imageUrl) {
      return Response.json({ error: "Text or image required" }, { status: 400 });
    }

    // Get stored page token from preferences
    const admin = getSupabaseAdmin();
    const [tokenResult, pageIdResult] = await Promise.all([
      admin.from("preferences").select("value").eq("user_id", user.id).eq("key", "meta_page_token").maybeSingle(),
      admin.from("preferences").select("value").eq("user_id", user.id).eq("key", "meta_page_id").maybeSingle(),
    ]);

    const pageToken = tokenResult?.data?.value;
    const pageId = pageIdResult?.data?.value;

    if (!pageToken || !pageId) {
      return Response.json({ error: "Facebook not connected. Visit /api/facebook/connect to authorize." }, { status: 400 });
    }

    let result;

    if (imageUrl) {
      // Photo post
      const params = new URLSearchParams({
        url: imageUrl,
        caption: text || "",
        access_token: pageToken,
      });
      const res = await fetch(
        `https://graph.facebook.com/v25.0/${pageId}/photos?${params.toString()}`,
        { method: "POST" }
      );
      result = await res.json();
    } else {
      // Text-only post
      const params = new URLSearchParams({
        message: text,
        access_token: pageToken,
      });
      const res = await fetch(
        `https://graph.facebook.com/v25.0/${pageId}/feed?${params.toString()}`,
        { method: "POST" }
      );
      result = await res.json();
    }

    if (result.error) throw new Error(result.error.message);

    return Response.json({ success: true, id: result.id || result.post_id });
  } catch (err) {
    console.error("[facebook/post] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
