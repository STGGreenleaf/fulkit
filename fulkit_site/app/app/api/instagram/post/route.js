/**
 * POST /api/instagram/post — Publish to Instagram via Graph API.
 * Owner-only. Uses Facebook Page token to post via linked Instagram Business account.
 * Instagram requires an image — text-only posts are not supported.
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

    if (!imageUrl) {
      return Response.json({ error: "Instagram requires an image. Text-only posts are not supported." }, { status: 400 });
    }

    if (!PAGE_TOKEN) {
      return Response.json({ error: "Facebook Page token not configured." }, { status: 400 });
    }

    // Step 1: Get the Instagram Business Account ID linked to the Facebook Page
    const pagesRes = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?access_token=${PAGE_TOKEN}`
    );
    const pagesData = await pagesRes.json();
    if (pagesData.error) throw new Error(pagesData.error.message);

    const page = pagesData.data?.[0];
    if (!page) throw new Error("No Facebook Page found");

    const pageToken = page.access_token;
    const pageId = page.id;

    // Get Instagram Business Account ID from the Page
    const igRes = await fetch(
      `https://graph.facebook.com/v25.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
    );
    const igData = await igRes.json();
    if (igData.error) throw new Error(igData.error.message);

    const igAccountId = igData.instagram_business_account?.id;
    if (!igAccountId) throw new Error("No Instagram Business account linked to this Facebook Page. Link your @getfulkit Instagram as a Business account to the Fülkit Facebook Page.");

    // Step 2: Create media container
    const containerParams = new URLSearchParams({
      image_url: imageUrl,
      caption: text || "",
      access_token: pageToken,
    });

    const containerRes = await fetch(
      `https://graph.facebook.com/v25.0/${igAccountId}/media?${containerParams.toString()}`,
      { method: "POST" }
    );
    const containerData = await containerRes.json();
    if (containerData.error) throw new Error(containerData.error.message);
    const containerId = containerData.id;

    // Step 3: Wait for media processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Publish
    const publishRes = await fetch(
      `https://graph.facebook.com/v25.0/${igAccountId}/media_publish?creation_id=${containerId}&access_token=${pageToken}`,
      { method: "POST" }
    );
    const publishData = await publishRes.json();
    if (publishData.error) throw new Error(publishData.error.message);

    return Response.json({ success: true, id: publishData.id });
  } catch (err) {
    console.error("[instagram/post] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
