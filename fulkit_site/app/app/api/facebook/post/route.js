/**
 * POST /api/facebook/post — Publish to Facebook Page via Graph API.
 * Owner-only. Supports text-only or text + image.
 */

import { getSupabaseAdmin } from "../../../../lib/supabase-server";

const PAGE_TOKEN = process.env.META_PAGE_TOKEN;

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

    if (!PAGE_TOKEN) {
      return Response.json({ error: "Facebook Page token not configured." }, { status: 400 });
    }

    // Get Page ID
    const pagesRes = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?access_token=${PAGE_TOKEN}`
    );
    const pagesData = await pagesRes.json();
    if (pagesData.error) throw new Error(pagesData.error.message);

    const page = pagesData.data?.[0];
    if (!page) throw new Error("No Facebook Page found");

    const pageToken = page.access_token;
    const pageId = page.id;

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
